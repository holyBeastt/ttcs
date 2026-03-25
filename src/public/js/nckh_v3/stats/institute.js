(function () {
  const state = {
    summary: null,
  };

  const el = {
    namHocFilter: null,
    loadDataBtn: null,
    kpiCongTrinh: null,
    kpiSoTiet: null,
    kpiGiangVien: null,
    typeTableBody: null,
    facultyTableBody: null,
    recordsModal: null,
    modalTableBody: null,
    modalTitle: null,
  };

  const api = {
    async getSummary(namHoc) {
      const query = new URLSearchParams({ namHoc }).toString();
      const response = await fetch(`/v3/nckh/stats/hoc-vien?${query}`);
      return response.json();
    },
    async getRecords(namHoc, khoaId, type) {
      const query = new URLSearchParams({ namHoc, khoaId, type }).toString();
      const response = await fetch(`/v3/nckh/stats/hoc-vien/cong-trinh?${query}`);
      return response.json();
    },
  };

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.kpiCongTrinh = document.getElementById("kpiCongTrinh");
    el.kpiSoTiet = document.getElementById("kpiSoTiet");
    el.kpiGiangVien = document.getElementById("kpiGiangVien");
    el.typeTableBody = document.getElementById("typeTableBody");
    el.facultyTableBody = document.getElementById("facultyTableBody");
    el.recordsModal = document.getElementById("recordsModal");
    el.modalTableBody = document.getElementById("modalTableBody");
    el.modalTitle = document.getElementById("recordsModalLabel");
  }

  function renderKpi() {
    const overview = state.summary?.overview || {};
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;
    if (el.kpiCongTrinh) el.kpiCongTrinh.textContent = String(overview.tongCongTrinh || 0);
    if (el.kpiSoTiet) el.kpiSoTiet.textContent = formatHours(overview.tongSoTiet || 0);
    if (el.kpiGiangVien) el.kpiGiangVien.textContent = String(overview.tongGiangVienNoiBo || 0);
  }

  function renderByType() {
    if (!el.typeTableBody) return;
    const rows = state.summary?.byType || [];
    const escapeHtml = window.NCKH_V3_STATS.helpers.escapeHtml;
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;

    if (!rows.length) {
      el.typeTableBody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">Không có dữ liệu</td></tr>';
      return;
    }

    el.typeTableBody.innerHTML = rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="text-start">${escapeHtml(row.loaiNckhLabel || row.loaiNckh || "")}</td>
            <td>${row.soCongTrinh}</td>
            <td>${formatHours(row.tongSoTiet)}</td>
            <td>
              <button class="btn btn-sm btn-outline-info btn-view-type" data-type="${escapeHtml(row.typeSlug || row.loaiNckh)}" title="Xem chi tiết">
                <i class="bi bi-eye"></i>
              </button>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function renderByFaculty() {
    if (!el.facultyTableBody) return;
    const rows = state.summary?.byFaculty || [];
    const escapeHtml = window.NCKH_V3_STATS.helpers.escapeHtml;
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;

    if (!rows.length) {
      el.facultyTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>';
      return;
    }

    el.facultyTableBody.innerHTML = rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.maPhongBan || "-")}</td>
            <td class="text-start">${escapeHtml(row.tenPhongBan || "Chưa gán khoa")}</td>
            <td>${row.soCongTrinh}</td>
            <td>${formatHours(row.tongSoTiet)}</td>
            <td>
              <button class="btn btn-sm btn-outline-info btn-view-faculty" data-id="${row.khoaId || "UNASSIGNED"}" title="Xem chi tiết">
                <i class="bi bi-eye"></i>
              </button>
            </td>
          </tr>
        `
      )
      .join("");
  }

  async function showRecords(params) {
    const { namHoc, khoaId, type, title } = params;
    if (el.modalTitle) el.modalTitle.textContent = title || "Chi tiết công trình NCKH";
    if (el.modalTableBody) el.modalTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Đang tải dữ liệu...</td></tr>';

    const modal = new bootstrap.Modal(el.recordsModal);
    modal.show();

    try {
      const result = await api.getRecords(namHoc, khoaId, type);
      console.log("[NCKH V3 Stats] Detailed Records:", result.data);
      if (!result.success) throw new Error(result.message);

      renderModalRows(result.data || []);
    } catch (error) {
      if (el.modalTableBody) el.modalTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Lỗi: ${error.message}</td></tr>`;
    }
  }

  function renderModalRows(rows) {
    console.log("[NCKH V3 Stats] Rendering Modal Rows:", rows);
    if (!el.modalTableBody) return;
    const escapeHtml = window.NCKH_V3_STATS.helpers.escapeHtml;
    const formatHours = window.NCKH_V3_STATS.helpers.formatHours;

    if (!rows.length) {
      el.modalTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Không có dữ liệu chi tiết</td></tr>';
      return;
    }

    el.modalTableBody.innerHTML = rows
      .map(
        (row, index) => {
          const loaiLabel = row.loaiNckhLabel || row.loaiNckh || "N/A";
          console.log(`[Row ${index}] Label:`, loaiLabel);
          return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td class="text-start">${escapeHtml(row.tenCongTrinh)}</td>
          <td class="text-center"><span class="fw-bold">${escapeHtml(loaiLabel)}</span></td>
          <td class="text-start">${escapeHtml(row.phanLoai)}</td>
          <td class="small">${escapeHtml(row.tacGiaChinh)}</td>
          <td class="small">${escapeHtml(row.thanhVien || "-")}</td>
          <td class="text-center fw-bold text-primary">${formatHours(row.tongSoTietCongTrinh)}</td>
          <td class="small text-center">${escapeHtml(row.maSo || "-")}</td>
          <td class="small text-center">${row.ngayNghiemThu ? new Date(row.ngayNghiemThu).toLocaleDateString("vi-VN") : "-"}</td>
        </tr>
      `;
        }
      )
      .join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    if (!namHoc) {
      await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      return;
    }

    const result = await api.getSummary(namHoc);
    if (!result.success) {
      throw new Error(result.message || "Không thể lấy thống kê học viện");
    }

    state.summary = result.data || null;
    renderKpi();
    renderByType();
    renderByFaculty();
  }

  async function initFilters() {
    const yearResult = await window.NCKH_V3_STATS.api.getNamHoc();

    if (yearResult?.success) {
      window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yearResult.NamHoc || []);
    }
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => {
      try {
        await loadSummary();
      } catch (error) {
        await window.NCKH_V3_STATS.helpers.showError(error, "Không thể tải dữ liệu học viện");
      }
    });

    // Event delegation for dynamically rendered buttons
    el.typeTableBody?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-view-type");
      if (!btn) return;

      const type = btn.dataset.type;
      const typeLabel = btn.closest("tr").querySelector("td:nth-child(2)").textContent.trim();
      const namHoc = el.namHocFilter.value;

      showRecords({
        namHoc,
        khoaId: "ALL",
        type,
        title: `Chi tiết: ${typeLabel} (${namHoc})`,
      });
    });

    el.facultyTableBody?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-view-faculty");
      if (!btn) return;

      const khoaId = btn.dataset.id;
      const facultyName = btn.closest("tr").querySelector("td:nth-child(3)").textContent.trim();
      const namHoc = el.namHocFilter.value;

      showRecords({
        namHoc,
        khoaId,
        type: "ALL",
        title: `Chi tiết: ${facultyName} (${namHoc})`,
      });
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
      await window.NCKH_V3_STATS.helpers.showError(error, "Không thể khởi tạo thống kê học viện");
    });
  });
})();
