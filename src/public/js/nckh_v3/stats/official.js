(function () {
  const state = { tab: "lecturer", lecturerGroups: [] };
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
  };

  const helpers = () => window.NCKH_V3_STATS.helpers;
  const escape = (value) => helpers().escapeHtml(value);
  const hours = (value) => helpers().formatHours(value);
  const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "-";
  const normalizeText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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

  function renderFacultyGroups(groups) {
    const colspan = 9;
    const typeMap = new Map();
    let index = 0;
    groups.forEach((faculty) => (faculty.records || []).forEach((row) => {
        const key = row.loaiNckh || row.loaiNckhLabel || "OTHER";
        if (!typeMap.has(key)) {
          typeMap.set(key, { label: row.loaiNckhLabel || row.loaiNckh || "Khác", faculties: new Map() });
        }
        const typeGroup = typeMap.get(key);
        if (!typeGroup.faculties.has(faculty.label)) {
          typeGroup.faculties.set(faculty.label, { label: faculty.label, records: [] });
        }
        typeGroup.faculties.get(faculty.label).records.push(row);
      }));

    const body = typeMap.size ? Array.from(typeMap.values()).map((typeGroup) => {
      const facultyGroups = Array.from(typeGroup.faculties.values());
      const typeRecords = facultyGroups.flatMap((faculty) => faculty.records);
      const typeHours = typeRecords.reduce((total, row) => total + Number(row.tongSoTietCongTrinh || 0), 0);
      const facultyRows = facultyGroups.map((faculty) => {
        const facultyHours = faculty.records.reduce((total, row) => total + Number(row.tongSoTietCongTrinh || 0), 0);
        const records = faculty.records.map((row) => `<tr><td>${++index}</td>${recordCells(row)}</tr>`).join("");
        return `<tr class="table-light nckh-stats-subgroup-header"><td colspan="${colspan}"><strong>${escape(faculty.label)}</strong><span class="nckh-v3-group-count">${faculty.records.length} công trình</span><span class="nckh-v3-group-count">${hours(facultyHours)} tiết</span></td></tr>${records}`;
      }).join("");

      return `<tr class="nckh-stats-group-header"><td colspan="${colspan}"><strong>${escape(typeGroup.label)}</strong><span class="nckh-v3-group-count">${typeRecords.length} công trình</span><span class="nckh-v3-group-count">${hours(typeHours)} tiết</span></td></tr>${facultyRows}`;
    }).join("") : `<tr><td colspan="${colspan}" class="text-muted py-4">Không có dữ liệu</td></tr>`;

    const headers = "STT|Loại NCKH|Phân loại|Tên công trình|Tác giả chính|Thành viên|Mã số|Ngày NT|Tổng số tiết";
    return `<div class="stats-table-card table-responsive"><table class="table table-hover text-center align-middle"><thead><tr>${headers.split("|").map((header, i) => `<th class="${[3, 4, 5].includes(i) ? "text-start" : ""}">${header}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function setKpis(firstLabel, firstValue, totalHours, thirdLabel, thirdValue) {
    el.kpiLabel1.textContent = firstLabel;
    el.kpiValue1.textContent = String(firstValue || 0);
    el.kpiValue2.textContent = hours(totalHours);
    el.kpiLabel3.textContent = thirdLabel;
    el.kpiValue3.textContent = String(thirdValue || 0);
  }

  function renderLecturerGroups() {
    const keyword = normalizeText(el.keyword.value);
    const groups = state.lecturerGroups.filter((group) => normalizeText(group.label).includes(keyword));
    const totalHours = groups.reduce((total, group) => total + Number(group.totalHours || 0), 0);
    const totalRecords = groups.reduce((total, group) => total + (group.records || []).length, 0);
    setKpis("Giảng viên", groups.length, totalHours, "Tổng công trình", totalRecords);
    el.content.innerHTML = renderGroups(groups, { lecturer: true });
  }

  async function loadLecturers(namHoc) {
    const khoaId = el.khoa.value || "ALL";
    const result = await api.lecturers(namHoc, khoaId, "");
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê giảng viên");
    const summary = Array.isArray(result.data) ? result.data : [];
    state.lecturerGroups = await Promise.all(summary.map(async (row) => {
      const recordsResult = await api.lecturerRecords(row.lecturerId, namHoc);
      if (!recordsResult.success) throw new Error(recordsResult.message || "Không thể lấy công trình giảng viên");
      return { label: `${row.tenNhanVien} - ${row.maPhongBan || "Chưa có khoa"}`, records: recordsResult.data || [], totalHours: row.tongSoTietGiangVien };
    }));
    renderLecturerGroups();
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
    el.content.innerHTML = renderFacultyGroups(groups);
  }

  async function loadCurrent() {
    const namHoc = String(el.namHoc.value || "").trim();
    if (!namHoc) throw new Error("Vui lòng chọn năm học");
    el.content.innerHTML = '<div class="stats-empty"><div class="empty-text">Đang tải dữ liệu...</div></div>';
    if (state.tab === "lecturer") return loadLecturers(namHoc);
    return loadFaculties(namHoc);
  }

  function updateControls() {
    const lecturer = state.tab === "lecturer";
    el.khoaGroup.style.display = "";
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
    el.keyword.addEventListener("input", () => {
      if (state.tab === "lecturer" && state.lecturerGroups.length) renderLecturerGroups();
    });
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
