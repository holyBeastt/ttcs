(function () {
  const state = {
    faculties: [],
    records: [],
    selectedKhoaId: null,
  };

  const el = {
    namHocFilter: null,
    khoaFilter: null,
    loadDataBtn: null,
    exportExcelBtn: null,
    facultyTableBody: null,
    recordDetailTableBody: null,
    recordDetailModalLabel: null,
  };

  let recordDetailModal = null;

  const api = {
    async getSummary(namHoc, khoaId = "ALL") {
      const query = new URLSearchParams({ namHoc, khoaId }).toString();
      const response = await fetch(`/v3/nckh/stats/khoa?${query}`);
      return response.json();
    },
    async getRecords(namHoc, khoaId) {
      const query = new URLSearchParams({ namHoc }).toString();
      const response = await fetch(`/v3/nckh/stats/khoa/${encodeURIComponent(khoaId)}/cong-trinh?${query}`);
      return response.json();
    },
  };

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.khoaFilter = document.getElementById("khoaFilter");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.exportExcelBtn = document.getElementById("exportExcelBtn");
    el.facultyTableBody = document.getElementById("facultyTableBody");
    el.recordDetailTableBody = document.getElementById("recordDetailTableBody");
    el.recordDetailModalLabel = document.getElementById("recordDetailModalLabel");

    const modalElement = document.getElementById("recordDetailModal");
    if (modalElement) {
      recordDetailModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    }
  }

  function renderFacultySummary() {
    if (!el.facultyTableBody) return;

    if (!state.faculties.length) {
      el.facultyTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>';
      return;
    }

    const escapeHtml = window.NCKH_V3_STATS.helpers.escapeHtml;
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;
    el.facultyTableBody.innerHTML = state.faculties
      .map((row, index) => {
        const khoaKey = row.khoaId === null ? "UNASSIGNED" : String(row.khoaId);
        const activeClass = state.selectedKhoaId === khoaKey ? "table-warning" : "";

        return `
          <tr class="${activeClass}">
            <td>${index + 1}</td>
            <td>${escapeHtml(row.maPhongBan || "-")}</td>
            <td class="text-start">${escapeHtml(row.tenPhongBan || "Chưa gán khoa")}</td>
            <td>${row.soCongTrinh}</td>
            <td>${formatHours(row.tongSoTiet)}</td>
            <td>
              <button class="btn btn-sm btn-outline-info" data-action="detail" data-khoa-id="${khoaKey}">
                <i class="bi bi-eye"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderRecords() {
    if (!el.recordDetailTableBody) return;

    if (!state.records.length) {
      el.recordDetailTableBody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Không có dữ liệu chi tiết</td></tr>';
      return;
    }

    const escapeHtml = window.NCKH_V3_STATS.helpers.escapeHtml;
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;
    el.recordDetailTableBody.innerHTML = state.records
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.loaiNckhLabel)}</td>
            <td class="text-start">${escapeHtml(row.tenCongTrinh)}</td>
            <td class="text-start">${escapeHtml(row.tacGiaChinh)}</td>
            <td class="text-start">${escapeHtml(row.thanhVien)}</td>
            <td>${escapeHtml(row.tenPhongBan || row.maPhongBan || "")}</td>
            <td>${formatHours(row.tongSoTietCongTrinh)}</td>
          </tr>
        `
      )
      .join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    if (!namHoc) {
      await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      return;
    }

    const khoaId = el.khoaFilter?.value || "ALL";

    const result = await api.getSummary(namHoc, khoaId);
    if (!result.success) {
      throw new Error(result.message || "Không thể lấy thống kê theo khoa");
    }

    state.faculties = Array.isArray(result.data) ? result.data : [];
    state.records = [];
    state.selectedKhoaId = null;
    renderFacultySummary();
  }

  async function loadRecordsByFaculty(khoaId) {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const result = await api.getRecords(namHoc, khoaId);

    if (!result.success) {
      throw new Error(result.message || "Không thể lấy danh sách công trình theo khoa");
    }

    state.selectedKhoaId = String(khoaId);
    state.records = Array.isArray(result.data) ? result.data : [];
    renderFacultySummary();
    renderRecords();

    const selectedFaculty = state.faculties.find((item) => {
      const key = item.khoaId === null ? "UNASSIGNED" : String(item.khoaId);
      return key === String(khoaId);
    });

    if (el.recordDetailModalLabel) {
      const facultyName = selectedFaculty?.tenPhongBan || "Khoa";
      el.recordDetailModalLabel.textContent = `Chi tiết công trình - ${facultyName}`;
    }

    if (recordDetailModal) {
      recordDetailModal.show();
    }
  }

  async function initFilters() {
    const [yearRes, filterRes] = await Promise.all([
      window.NCKH_V3_STATS.api.getNamHoc(),
      window.NCKH_V3_STATS.api.getFilters()
    ]);

    if (yearRes?.success) {
      window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yearRes.NamHoc || []);
    }
    if (filterRes?.success) {
      window.NCKH_V3_STATS.helpers.fillKhoaOptions(el.khoaFilter, filterRes.data?.khoaList || [], true);
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

    el.exportExcelBtn?.addEventListener("click", () => {
      const namHoc = el.namHocFilter?.value;
      const khoaId = el.khoaFilter?.value || "ALL";
      if (!namHoc) return Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");

      window.location.href = `/v3/nckh/export/stats/khoa?namHoc=${encodeURIComponent(namHoc)}&khoaId=${encodeURIComponent(khoaId)}`;
    });

    el.facultyTableBody?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action='detail']");
      if (!button) return;

      const khoaId = button.getAttribute("data-khoa-id");
      if (!khoaId) return;

      try {
        await loadRecordsByFaculty(khoaId);
      } catch (error) {
        await window.NCKH_V3_STATS.helpers.showError(error, "Không thể tải công trình theo khoa");
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
      await window.NCKH_V3_STATS.helpers.showError(error, "Không thể khởi tạo thống kê khoa");
    });
  });
})();
