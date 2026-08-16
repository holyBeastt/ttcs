(function () {
  const state = { tab: "lecturer", cache: new Map() };
  const el = {};

  const api = {
    async lecturers(namHoc, khoaId, keyword) {
      const query = new URLSearchParams({ namHoc, khoaId, keyword });
      return (await fetch(`/v3/nckh/stats/giang-vien?${query}`)).json();
    },
    async lecturerRecords(id, namHoc) {
      return (await fetch(`/v3/nckh/stats/giang-vien/${id}/cong-trinh?${new URLSearchParams({ namHoc })}`)).json();
    },
    async faculties(namHoc, khoaId) {
      return (await fetch(`/v3/nckh/stats/khoa?${new URLSearchParams({ namHoc, khoaId })}`)).json();
    },
    async facultyRecords(id, namHoc) {
      return (await fetch(`/v3/nckh/stats/khoa/${encodeURIComponent(id)}/cong-trinh?${new URLSearchParams({ namHoc })}`)).json();
    },
    async institute(namHoc) {
      return (await fetch(`/v3/nckh/stats/hoc-vien?${new URLSearchParams({ namHoc })}`)).json();
    },
    async instituteRecords(namHoc, khoaId, type) {
      return (await fetch(`/v3/nckh/stats/hoc-vien/cong-trinh?${new URLSearchParams({ namHoc, khoaId, type })}`)).json();
    },
  };

  const helpers = () => window.NCKH_V3_STATS.helpers;
  const escape = (value) => helpers().escapeHtml(value);
  const hours = (value) => helpers().formatHours(value);
  const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "-";

  function cacheElements() {
    el.namHoc = document.getElementById("officialNamHocFilter");
    el.khoa = document.getElementById("officialKhoaFilter");
    el.khoaGroup = document.getElementById("officialKhoaGroup");
    el.keyword = document.getElementById("officialKeywordInput");
    el.keywordGroup = document.getElementById("officialKeywordGroup");
    el.load = document.getElementById("officialLoadBtn");
    el.export = document.getElementById("officialExportBtn");
    el.content = document.getElementById("officialContent");
    el.kpiLabel1 = document.getElementById("officialKpiLabel1");
    el.kpiValue1 = document.getElementById("officialKpiValue1");
    el.kpiValue2 = document.getElementById("officialKpiValue2");
    el.kpiLabel3 = document.getElementById("officialKpiLabel3");
    el.kpiValue3 = document.getElementById("officialKpiValue3");
  }

  function recordCells(row, lecturer = false) {
    const extra = lecturer ? `<td>${hours(row.soTietGiangVien)}</td><td>${escape(helpers().formatRole(row.vaiTroGiangVien))}</td>` : "";
    return `<td>${escape(row.loaiNckhLabel || row.loaiNckh || "N/A")}</td><td>${escape(row.phanLoai || "-")}</td><td class="text-start">${escape(row.tenCongTrinh)}</td><td class="text-start">${escape(row.tacGiaChinh)}</td><td class="text-start">${escape(row.thanhVien || "-")}</td><td>${escape(row.maSo || "-")}</td><td>${escape(date(row.ngayNghiemThu))}</td><td>${hours(row.tongSoTietCongTrinh)}</td>${extra}`;
  }

  function renderGroups(groups, options = {}) {
    const lecturer = options.lecturer === true;
    const colspan = lecturer ? 11 : 9;
    let index = 0;
    const body = groups.length ? groups.map((group) => {
      const records = group.records || [];
      const recordRows = records.length
        ? records.map((row) => `<tr><td>${++index}</td>${recordCells(row, lecturer)}</tr>`).join("")
        : `<tr><td colspan="${colspan}" class="text-muted">Không có công trình</td></tr>`;
      return `<tr class="nckh-stats-group-header"><td colspan="${colspan}"><strong>${escape(group.label)}</strong><span class="nckh-v3-group-count">${records.length} công trình</span><span class="nckh-v3-group-count">${hours(group.totalHours)} tiết</span></td></tr>${recordRows}`;
    }).join("") : `<tr><td colspan="${colspan}" class="text-muted py-4">Không có dữ liệu</td></tr>`;

    const headers = lecturer
      ? "STT|Loại NCKH|Phân loại|Tên công trình|Tác giả chính|Thành viên|Mã số|Ngày NT|Tổng tiết CT|Tiết giảng viên|Vai trò"
      : "STT|Loại NCKH|Phân loại|Tên công trình|Tác giả chính|Thành viên|Mã số|Ngày NT|Tổng số tiết";
    return `<div class="stats-table-card table-responsive"><table class="table table-hover text-center align-middle"><thead><tr>${headers.split("|").map((header, i) => `<th class="${[3, 4, 5].includes(i) ? "text-start" : ""}">${header}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function setKpis(firstLabel, firstValue, totalHours, thirdLabel, thirdValue) {
    el.kpiLabel1.textContent = firstLabel;
    el.kpiValue1.textContent = String(firstValue || 0);
    el.kpiValue2.textContent = hours(totalHours);
    el.kpiLabel3.textContent = thirdLabel;
    el.kpiValue3.textContent = String(thirdValue || 0);
  }

  async function loadLecturers(namHoc) {
    const khoaId = el.khoa.value || "ALL";
    const keyword = el.keyword.value.trim();
    const result = await api.lecturers(namHoc, khoaId, keyword);
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê giảng viên");
    const summary = Array.isArray(result.data) ? result.data : [];
    const groups = await Promise.all(summary.map(async (row) => {
      const recordsResult = await api.lecturerRecords(row.lecturerId, namHoc);
      if (!recordsResult.success) throw new Error(recordsResult.message || "Không thể lấy công trình giảng viên");
      return { label: `${row.tenNhanVien} - ${row.maPhongBan || "Chưa có khoa"}`, records: recordsResult.data || [], totalHours: row.tongSoTietGiangVien };
    }));
    const totalHours = summary.reduce((total, row) => total + Number(row.tongSoTietGiangVien || 0), 0);
    setKpis("Giảng viên", summary.length, totalHours, "Tổng công trình", summary.reduce((total, row) => total + Number(row.soCongTrinh || 0), 0));
    el.content.innerHTML = renderGroups(groups, { lecturer: true });
  }

  async function loadFaculties(namHoc) {
    const result = await api.faculties(namHoc, el.khoa.value || "ALL");
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê theo khoa");
    const summary = Array.isArray(result.data) ? result.data : [];
    const groups = await Promise.all(summary.map(async (row) => {
      if (row.khoaId === null || row.khoaId === undefined) return { label: row.tenPhongBan, records: [], totalHours: row.tongSoTiet };
      const recordsResult = await api.facultyRecords(row.khoaId, namHoc);
      if (!recordsResult.success) throw new Error(recordsResult.message || "Không thể lấy công trình theo khoa");
      return { label: `${row.maPhongBan || "-"} - ${row.tenPhongBan || "Chưa gán khoa"}`, records: recordsResult.data || [], totalHours: row.tongSoTiet };
    }));
    setKpis("Khoa", summary.length, summary.reduce((total, row) => total + Number(row.tongSoTiet || 0), 0), "Tổng công trình", summary.reduce((total, row) => total + Number(row.soCongTrinh || 0), 0));
    el.content.innerHTML = renderGroups(groups);
  }

  async function loadInstitute(namHoc) {
    const result = await api.institute(namHoc);
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê học viện");
    const summary = result.data || {};
    const byType = await Promise.all((summary.byType || []).map(async (row) => {
      const recordsResult = await api.instituteRecords(namHoc, "ALL", row.typeSlug || row.loaiNckh);
      if (!recordsResult.success) throw new Error(recordsResult.message || "Không thể lấy công trình theo loại NCKH");
      return { label: row.loaiNckhLabel || row.loaiNckh, records: recordsResult.data || [], totalHours: row.tongSoTiet };
    }));
    const byFaculty = await Promise.all((summary.byFaculty || []).map(async (row) => {
      if (row.khoaId === null || row.khoaId === undefined) return { label: row.tenPhongBan, records: [], totalHours: row.tongSoTiet };
      const recordsResult = await api.instituteRecords(namHoc, row.khoaId, "ALL");
      if (!recordsResult.success) throw new Error(recordsResult.message || "Không thể lấy công trình theo khoa");
      return { label: `${row.maPhongBan || "-"} - ${row.tenPhongBan || "Chưa gán khoa"}`, records: recordsResult.data || [], totalHours: row.tongSoTiet };
    }));
    setKpis("Giảng viên", summary.overview?.tongGiangVienNoiBo, summary.overview?.tongSoTiet, "Tổng công trình", summary.overview?.tongCongTrinh);
    el.content.innerHTML = `<h6 class="stats-section-title">Thống kê theo loại NCKH</h6>${renderGroups(byType)}<h6 class="stats-section-title mt-4">Thống kê theo khoa</h6>${renderGroups(byFaculty)}`;
  }

  async function loadCurrent() {
    const namHoc = String(el.namHoc.value || "").trim();
    if (!namHoc) throw new Error("Vui lòng chọn năm học");
    el.content.innerHTML = '<div class="stats-empty"><div class="empty-text">Đang tải dữ liệu...</div></div>';
    if (state.tab === "lecturer") return loadLecturers(namHoc);
    if (state.tab === "faculty") return loadFaculties(namHoc);
    return loadInstitute(namHoc);
  }

  function updateControls() {
    const lecturer = state.tab === "lecturer";
    const institute = state.tab === "institute";
    el.khoaGroup.style.display = institute ? "none" : "";
    el.keywordGroup.style.display = lecturer ? "" : "none";
  }

  function exportCurrent() {
    const namHoc = String(el.namHoc.value || "").trim();
    if (!namHoc) return Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
    if (state.tab === "lecturer") {
      const query = new URLSearchParams({ namHoc, khoaId: el.khoa.value || "ALL", keyword: el.keyword.value.trim() });
      window.location.href = `/v3/nckh/export/stats/giang-vien?${query}`;
    } else if (state.tab === "faculty") {
      window.location.href = `/v3/nckh/export/stats/khoa?${new URLSearchParams({ namHoc, khoaId: el.khoa.value || "ALL" })}`;
    } else {
      window.location.href = `/v3/nckh/export/stats/hoc-vien?${new URLSearchParams({ namHoc })}`;
    }
  }

  async function init() {
    cacheElements();
    const [years, filters] = await Promise.all([window.NCKH_V3_STATS.api.getNamHoc(), window.NCKH_V3_STATS.api.getFilters()]);
    if (years?.success) helpers().fillNamHocOptions(el.namHoc, years.NamHoc || []);
    if (filters?.success) helpers().fillKhoaOptions(el.khoa, filters.data?.khoaList || [], true);
    updateControls();
    el.load.addEventListener("click", () => loadCurrent().catch((error) => helpers().showError(error, "Không thể tải thống kê NCKH")));
    el.export.addEventListener("click", exportCurrent);
    document.querySelectorAll("[data-stat-tab]").forEach((button) => button.addEventListener("click", () => {
      state.tab = button.dataset.statTab;
      document.querySelectorAll("[data-stat-tab]").forEach((item) => item.classList.toggle("active", item === button));
      updateControls();
      loadCurrent().catch((error) => helpers().showError(error, "Không thể tải thống kê NCKH"));
    }));
    await loadCurrent();
  }

  window.addEventListener("DOMContentLoaded", () => init().catch((error) => helpers().showError(error, "Không thể khởi tạo thống kê NCKH")));
})();
