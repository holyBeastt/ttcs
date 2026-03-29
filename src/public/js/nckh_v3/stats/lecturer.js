(function () {
  const state = {
    selectedLecturerId: null,
    rawLecturers: [],
    lecturers: [],
    records: [],
  };

  const el = {
    namHocFilter: null,
    khoaFilter: null,
    keywordInput: null,
    loadDataBtn: null,
    exportExcelBtn: null,
    lecturerTableBody: null,
    recordDetailTableBody: null,
    recordDetailModalLabel: null,
  };

  let recordDetailModal = null;

  const api = {
    async getLecturers(namHoc, khoaId, keyword) {
      const params = new URLSearchParams({ namHoc, khoaId, keyword }).toString();
      const response = await fetch(`/v3/nckh/stats/giang-vien?${params}`);
      return response.json();
    },
    async getLecturerRecords(lecturerId, namHoc, khoaId) {
      const params = new URLSearchParams({ namHoc, khoaId }).toString();
      const response = await fetch(`/v3/nckh/stats/giang-vien/${lecturerId}/cong-trinh?${params}`);
      return response.json();
    },
  };

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.khoaFilter = document.getElementById("khoaFilter");
    el.keywordInput = document.getElementById("keywordInput");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.exportExcelBtn = document.getElementById("exportExcelBtn");
    el.lecturerTableBody = document.getElementById("lecturerTableBody");
    el.recordDetailTableBody = document.getElementById("recordDetailTableBody");
    el.recordDetailModalLabel = document.getElementById("recordDetailModalLabel");

    const modalElement = document.getElementById("recordDetailModal");
    if (modalElement) {
      recordDetailModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    }
  }

  function renderLecturers() {
    if (!el.lecturerTableBody) return;

    if (!state.lecturers.length) {
      el.lecturerTableBody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Không có dữ liệu</td></tr>';
      return;
    }

    const escapeHtml = window.NCKH_V3_STATS.helpers.escapeHtml;
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;
    const html = state.lecturers
      .map((row, index) => {
        const activeClass = state.selectedLecturerId === row.lecturerId ? "table-warning" : "";
        return `
          <tr class="${activeClass}">
            <td>${index + 1}</td>
            <td class="text-start">${escapeHtml(row.tenNhanVien)}</td>
            <td>${escapeHtml(row.maPhongBan || "")}</td>
            <td class="text-start">${escapeHtml(row.lecturerKhoaName || "")}</td>
            <td>${row.soCongTrinh}</td>
            <td>${formatHours(row.tongSoTietGiangVien)}</td>
            <td>
              <button class="btn btn-sm btn-outline-info" data-action="detail" data-id="${row.lecturerId}">
                <i class="bi bi-eye"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    el.lecturerTableBody.innerHTML = html;
  }

  function applyLecturerFilter() {
    const keyword = String(el.keywordInput?.value || "").trim();
    const normalizedKeyword = normalizeText(keyword);

    state.lecturers = normalizedKeyword
      ? state.rawLecturers.filter((row) => normalizeText(row.tenNhanVien).includes(normalizedKeyword))
      : [...state.rawLecturers];

    renderLecturers();
  }

  function renderRecords() {
    if (!el.recordDetailTableBody) return;

    if (!state.records.length) {
      el.recordDetailTableBody.innerHTML = '<tr><td colspan="9" class="text-muted py-4">Không có dữ liệu chi tiết</td></tr>';
      return;
    }

    const escapeHtml = window.NCKH_V3_STATS.helpers.escapeHtml;
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;
    const html = state.records
      .map(
        (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.loaiNckhLabel)}</td>
          <td class="text-start">${escapeHtml(row.tenCongTrinh)}</td>
          <td class="text-start">${escapeHtml(row.tacGiaChinh)}</td>
          <td class="text-start">${escapeHtml(row.thanhVien)}</td>
          <td>${formatHours(row.tongSoTietCongTrinh)}</td>
          <td>${formatHours(row.soTietGiangVien)}</td>
          <td>${window.NCKH_V3_STATS.helpers.formatRole(row.vaiTroGiangVien)}</td>
        </tr>
      `
      )
      .join("");

    el.recordDetailTableBody.innerHTML = html;
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const khoaId = String(el.khoaFilter?.value || "ALL").trim();

    if (!namHoc) {
      await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      return;
    }

    // Load by year/faculty, keyword is filtered instantly on client while typing.
    const result = await api.getLecturers(namHoc, khoaId, "");
    if (!result.success) {
      throw new Error(result.message || "Không thể lấy thống kê giảng viên");
    }

    state.rawLecturers = Array.isArray(result.data) ? result.data : [];
    state.selectedLecturerId = null;
    state.records = [];
    applyLecturerFilter();
  }

  async function loadLecturerRecords(lecturerId) {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const khoaId = String(el.khoaFilter?.value || "ALL").trim();

    const result = await api.getLecturerRecords(lecturerId, namHoc, khoaId);
    if (!result.success) {
      throw new Error(result.message || "Không thể lấy danh sách công trình");
    }

    state.selectedLecturerId = Number(lecturerId);
    state.records = Array.isArray(result.data) ? result.data : [];
    renderLecturers();
    renderRecords();

    const selectedLecturer = state.lecturers.find((item) => Number(item.lecturerId) === Number(lecturerId));
    const lecturerName = selectedLecturer?.tenNhanVien || "Giảng viên";
    if (el.recordDetailModalLabel) {
      el.recordDetailModalLabel.textContent = `Chi tiết công trình - ${lecturerName}`;
    }

    if (recordDetailModal) {
      recordDetailModal.show();
    }
  }

  async function initFilters() {
    const [yearResult, filterResult] = await Promise.all([
      window.NCKH_V3_STATS.api.getNamHoc(),
      window.NCKH_V3_STATS.api.getFilters(),
    ]);

    if (yearResult?.success) {
      window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yearResult.NamHoc || []);
    }

    if (filterResult?.success) {
      window.NCKH_V3_STATS.helpers.fillKhoaOptions(el.khoaFilter, filterResult.data?.khoaList || [], true);
    }
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => {
      try {
        await loadSummary();
      } catch (error) {
        await window.NCKH_V3_STATS.helpers.showError(error, "Không thể tải dữ liệu");
      }
    });

    el.keywordInput?.addEventListener("input", () => {
      state.selectedLecturerId = null;
      state.records = [];
      applyLecturerFilter();
    });

    el.exportExcelBtn?.addEventListener("click", () => {
      const namHoc = String(el.namHocFilter?.value || "").trim();
      if (!namHoc) {
        Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học trước khi xuất Excel", "warning");
        return;
      }
      const khoaId = String(el.khoaFilter?.value || "ALL").trim();
      const keyword = String(el.keywordInput?.value || "").trim();

      const params = new URLSearchParams({ namHoc, khoaId, keyword }).toString();
      window.location.href = `/v3/nckh/export/stats/giang-vien?${params}`;
    });

    el.lecturerTableBody?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action='detail']");
      if (!button) return;

      const lecturerId = button.getAttribute("data-id");
      if (!lecturerId) return;

      try {
        await loadLecturerRecords(lecturerId);
      } catch (error) {
        await window.NCKH_V3_STATS.helpers.showError(error, "Không thể tải công trình của giảng viên");
      }
    });
  }

  async function init() {
    cacheElements();
    await initFilters();
    bindEvents();
    await loadSummary();
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch(async (error) => {
      await window.NCKH_V3_STATS.helpers.showError(error, "Không thể khởi tạo thống kê giảng viên");
    });
  });
})();
