(function () {
  const state = {
    rawLecturers: [],
    lecturers: [],
    selectedLecturerId: null,
    selectedLecturerName: "",
  };

  const el = {
    namHoc: null,
    scope: null,
    khoa: null,
    keyword: null,
    loadBtn: null,
    tableBody: null,
    exportAllBtn: null,
    modal: null,
    modalLabel: null,
    modalTableBody: null,
    modalExportBtn: null,
  };

  let detailModalInstance = null;
  const helpers = () => window.NCKH_V3_STATS.helpers;

  function normalizeText(v) {
    return String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function cacheElements() {
    el.namHoc = document.getElementById("reportNamHoc");
    el.scope = document.getElementById("reportScope");
    el.khoa = document.getElementById("reportKhoa");
    el.keyword = document.getElementById("reportKeyword");
    el.loadBtn = document.getElementById("reportLoadBtn");
    el.tableBody = document.getElementById("reportTableBody");
    el.exportAllBtn = document.getElementById("reportExportAllBtn");
    el.modal = document.getElementById("recordDetailModal");
    el.modalLabel = document.getElementById("recordDetailModalLabel");
    el.modalTableBody = document.getElementById("recordDetailTableBody");
    el.modalExportBtn = document.getElementById("modalExportBtn");

    if (el.modal && window.bootstrap) {
      detailModalInstance = bootstrap.Modal.getOrCreateInstance(el.modal);
    }
  }

  function renderTable() {
    if (!el.tableBody) return;

    if (!state.lecturers.length) {
      el.tableBody.innerHTML =
        '<tr><td colspan="7" class="text-muted py-4">Không có dữ liệu giảng viên trong năm học và điều kiện lọc đã chọn</td></tr>';
      if (el.exportAllBtn) el.exportAllBtn.style.display = "none";
      return;
    }

    const esc = helpers().escapeHtml;
    const fmt = helpers().formatHours;

    el.tableBody.innerHTML = state.lecturers
      .map((row, i) => {
        let projectListHtml = "";
        if (row.danhSachCongTrinh && row.danhSachCongTrinh.length > 0) {
          const firstTwo = row.danhSachCongTrinh.slice(0, 2);
          const items = firstTwo
            .map(
              (title) =>
                `<div class="project-preview-item" title="${esc(title)}">
                  <i class="bi bi-file-earmark-text"></i>
                  <span class="fw-medium">${esc(title)}</span>
                </div>`
            )
            .join("");

          const moreCount = row.danhSachCongTrinh.length - 2;
          const moreText =
            moreCount > 0
              ? `<div class="text-muted fst-italic mt-1" style="font-size: 0.82rem;">+${moreCount} công trình khác...</div>`
              : "";
          projectListHtml = `<div class="mt-1">${items}${moreText}</div>`;
        }

        const projectColHtml = `
          <div class="mb-1">
            <span class="badge bg-primary badge-project-count" data-action="view-detail" data-id="${row.lecturerId}" title="Nhấp để xem bảng chi tiết">
              ${row.soCongTrinh} công trình
            </span>
          </div>
          ${projectListHtml}
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-info py-0 px-2" style="font-size: 0.8rem;" data-action="view-detail" data-id="${row.lecturerId}" title="Xem chi tiết các công trình">
              <i class="bi bi-eye"></i> Chi tiết
            </button>
          </div>
        `;

        return `<tr>
          <td class="col-compact fw-medium">${i + 1}</td>
          <td class="text-start fw-semibold text-primary col-lecturer-name">${esc(row.tenNhanVien)}</td>
          <td class="col-compact">${esc(row.chucVu || "-")}</td>
          <td class="col-compact fw-medium">${esc(row.lecturerKhoaName || row.maPhongBan || "-")}</td>
          <td class="text-start">${projectColHtml}</td>
          <td class="col-compact text-success fs-6 fw-bold">${fmt(row.tongSoTietGiangVien)}</td>
          <td class="col-compact">
            <button class="btn btn-sm btn-outline-primary px-2 py-1" data-action="export-single" data-id="${row.lecturerId}" title="Tải file Word (.docx)">
              <i class="bi bi-file-earmark-word"></i> Xuất Word
            </button>
          </td>
        </tr>`;
      })
      .join("");

    if (el.exportAllBtn) {
      el.exportAllBtn.style.display = state.lecturers.length > 0 ? "inline-block" : "none";
    }
  }

  function applyFilter() {
    const kw = normalizeText(el.keyword?.value || "");
    state.lecturers = kw
      ? state.rawLecturers.filter((r) => normalizeText(r.tenNhanVien).includes(kw))
      : [...state.rawLecturers];
    renderTable();
  }

  async function loadLecturers() {
    const namHoc = String(el.namHoc?.value || "").trim();
    const scope = String(el.scope?.value || "PREVIEW").trim();
    const khoaId = String(el.khoa?.value || "ALL").trim();

    if (!namHoc) {
      await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      return;
    }

    el.tableBody.innerHTML =
      '<tr><td colspan="7" class="text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Đang tải danh sách giảng viên và công trình...</td></tr>';

    try {
      const query = new URLSearchParams({ namHoc, khoaId, keyword: "" });
      const apiEndpoint =
        scope === "OFFICIAL"
          ? `/v3/nckh/stats/giang-vien?${query}`
          : `/v3/nckh/stats/preview/giang-vien?${query}`;

      const res = await fetch(apiEndpoint);
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Không thể tải danh sách giảng viên");
      }

      state.rawLecturers = Array.isArray(result.data) ? result.data : [];
      applyFilter();
    } catch (err) {
      await helpers().showError(err, "Lỗi khi tải dữ liệu");
      el.tableBody.innerHTML =
        '<tr><td colspan="7" class="text-danger py-4">Có lỗi xảy ra khi tải dữ liệu</td></tr>';
    }
  }

  /**
   * Xem chi tiết công trình của giảng viên trong modal
   * Bảng hiển thị chuẩn 11 cột và phân nhóm giống /v3/nckh/thong-ke-du-kien
   */
  async function viewLecturerDetail(lecturerId) {
    const namHoc = String(el.namHoc?.value || "").trim();
    const scope = String(el.scope?.value || "PREVIEW").trim();
    const sel = state.rawLecturers.find((item) => Number(item.lecturerId) === Number(lecturerId));

    state.selectedLecturerId = Number(lecturerId);
    state.selectedLecturerName = sel?.tenNhanVien || "Giảng viên";
    const khoaLabel = sel?.lecturerKhoaName || sel?.maPhongBan || "Chưa có khoa";

    if (el.modalLabel) {
      el.modalLabel.innerHTML = `<i class="bi bi-journal-text me-2"></i>Chi tiết công trình NCKH - <b>${helpers().escapeHtml(state.selectedLecturerName)}</b> (${helpers().escapeHtml(namHoc)})`;
    }

    if (el.modalTableBody) {
      el.modalTableBody.innerHTML =
        '<tr><td colspan="11" class="text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Đang tải chi tiết công trình...</td></tr>';
    }

    if (detailModalInstance) {
      detailModalInstance.show();
    }

    try {
      const query = new URLSearchParams({ namHoc, khoaId: "ALL" });
      const apiEndpoint =
        scope === "OFFICIAL"
          ? `/v3/nckh/stats/giang-vien/${lecturerId}/cong-trinh?${query}`
          : `/v3/nckh/stats/preview/giang-vien/${lecturerId}/cong-trinh?${query}`;

      const res = await fetch(apiEndpoint);
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Không thể tải công trình của giảng viên");
      }

      const records = Array.isArray(result.data) ? result.data : [];
      if (!records.length) {
        el.modalTableBody.innerHTML =
          '<tr><td colspan="11" class="text-muted py-4">Giảng viên không có công trình NCKH nào trong năm học này</td></tr>';
        return;
      }

      const esc = helpers().escapeHtml;
      const fmt = helpers().formatHours;
      const date = (val) => val ? new Date(val).toLocaleDateString("vi-VN") : "-";

      const totalLecturerHours = records.reduce((sum, r) => sum + Number(r.soTietGiangVien || 0), 0);
      const totalProjectHours = records.reduce((sum, r) => sum + Number(r.tongSoTietCongTrinh || 0), 0);

      // 1. Group header row (chuẩn theo trang /v3/nckh/thong-ke-du-kien)
      const groupHeaderRow = `
        <tr class="nckh-stats-group-header">
          <td colspan="11">
            <strong>${esc(state.selectedLecturerName)} - ${esc(khoaLabel)}</strong>
            <span class="nckh-v3-group-count">${records.length} công trình</span>
            <span class="nckh-v3-group-count">${fmt(totalLecturerHours)} tiết</span>
          </td>
        </tr>
      `;

      // Map tên loại NCKH sang tiếng Việt có dấu chuẩn
      const LOAI_NCKH_MAP = {
        DETAI_DUAN: "Đề tài, dự án",
        BAIBAO: "Bài báo KH",
        SANGKIEN: "Sáng kiến",
        GIAITHUONG: "Giải thưởng",
        DEXUAT: "Đề xuất NC",
        SACHGIAOTRINH: "Sách, giáo trình",
        HUONGDAN: "Hướng dẫn SV",
        HOIDONG: "Hội đồng KH",
      };

      // 2. Data rows
      const dataRows = records
        .map((rec, idx) => {
          const loaiText =
            rec.loaiNckhLabel ||
            rec.loaiNckh ||
            rec.loai_nckh_label ||
            rec.loai_nckh ||
            "-";

          const rawRole =
            rec.vaiTroGiangVien ||
            rec.vaiTro ||
            rec.vai_tro_giang_vien ||
            rec.vai_tro ||
            "";
          const roleText =
            (typeof helpers()?.formatRole === "function"
              ? helpers().formatRole(rawRole)
              : rawRole) ||
            rawRole ||
            "-";

          return `<tr>
            <td>${idx + 1}</td>
            <td>${esc(loaiText)}</td>
            <td>${esc(rec.phanLoai || rec.phan_loai || "-")}</td>
            <td class="text-start">${esc(rec.tenCongTrinh || rec.ten_cong_trinh || "-")}</td>
            <td class="text-start">${esc(rec.tacGiaChinh || rec.tac_gia_chinh || "-")}</td>
            <td class="text-start">${esc(rec.thanhVien || rec.thanh_vien || "-")}</td>
            <td>${esc(rec.maSo || rec.ma_so || "-")}</td>
            <td>${esc(date(rec.ngayNghiemThu || rec.ngay_nghiem_thu))}</td>
            <td>${fmt(rec.tongSoTietCongTrinh ?? rec.tongSoTiet ?? rec.tong_so_tiet)}</td>
            <td>${fmt(rec.soTietGiangVien ?? rec.so_tiet_giang_vien ?? rec.soTiet)}</td>
            <td>${esc(roleText)}</td>
          </tr>`;
        })
        .join("");

      // 3. Total summary row (chuẩn stats-row-total)
      const totalSummaryRow = `
        <tr class="stats-row-total">
          <td colspan="8" class="text-end fw-bold">Tổng cộng:</td>
          <td class="fw-bold">${fmt(totalProjectHours)}</td>
          <td class="fw-bold text-success">${fmt(totalLecturerHours)}</td>
          <td></td>
        </tr>
      `;

      el.modalTableBody.innerHTML = groupHeaderRow + dataRows + totalSummaryRow;
    } catch (err) {
      console.error("Lỗi khi tải chi tiết công trình:", err);
      el.modalTableBody.innerHTML =
        '<tr><td colspan="11" class="text-danger py-4">Có lỗi khi tải danh sách công trình</td></tr>';
    }
  }

  function downloadSingle(lecturerId) {
    const namHoc = String(el.namHoc?.value || "").trim();
    const scope = String(el.scope?.value || "PREVIEW").trim();
    if (!namHoc) {
      Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      return;
    }
    const query = new URLSearchParams({ namHoc, scope });
    window.location.href = `/v3/nckh/bao-cao-ca-nhan/export/${lecturerId}?${query}`;
  }

  async function exportAll() {
    const namHoc = String(el.namHoc?.value || "").trim();
    const scope = String(el.scope?.value || "PREVIEW").trim();
    if (!namHoc || !state.lecturers.length) return;

    const total = state.lecturers.length;
    let successCount = 0;
    let failCount = 0;

    Swal.fire({
      title: "Đang xuất báo cáo Word...",
      html: `Đang xử lý: <b>0/${total}</b> giảng viên`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    for (let i = 0; i < total; i++) {
      const gv = state.lecturers[i];
      Swal.update({
        html: `Đang xuất báo cáo: <b>${i + 1}/${total}</b><br><small class="text-muted">${helpers().escapeHtml(gv.tenNhanVien)}</small>`,
      });

      try {
        const query = new URLSearchParams({ namHoc, scope });
        const url = `/v3/nckh/bao-cao-ca-nhan/export/${gv.lecturerId}?${query}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;

        let filename = `ThongKe_NCKH_${gv.tenNhanVien}_${namHoc}.docx`.replace(/\s+/g, "_");
        const disposition = res.headers.get("content-disposition");
        if (disposition && disposition.includes("filename=")) {
          const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
          if (match && match[1]) {
            filename = decodeURIComponent(match[1].replace(/["']/g, ""));
          }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (err) {
        console.error(`Lỗi khi xuất file cho ${gv.tenNhanVien}:`, err);
        failCount++;
      }
    }

    Swal.fire({
      icon: failCount === 0 ? "success" : "warning",
      title: "Hoàn thành xuất file",
      html: `Đã xuất thành công: <b>${successCount}</b> file Word.<br>${failCount > 0 ? `<span class="text-danger">Thất bại: <b>${failCount}</b> file</span>` : ""}`,
    });
  }

  async function initFilters() {
    const [years, filters] = await Promise.all([
      window.NCKH_V3_STATS.api.getNamHoc(),
      window.NCKH_V3_STATS.api.getFilters(),
    ]);

    if (years?.success) {
      helpers().fillNamHocOptions(el.namHoc, years.NamHoc || []);

      // If 2025 - 2026 is an option, select it if current selected year has no data
      const has2025_2026 = Array.from(el.namHoc.options).find(
        (opt) => opt.value.replace(/\s+/g, "") === "2025-2026"
      );
      if (has2025_2026) {
        el.namHoc.value = has2025_2026.value;
      }
    }
    if (filters?.success) {
      helpers().fillKhoaOptions(el.khoa, filters.data?.khoaList || [], true);
    }
  }

  function bindEvents() {
    el.loadBtn?.addEventListener("click", () => {
      loadLecturers();
    });

    el.namHoc?.addEventListener("change", () => {
      loadLecturers();
    });

    el.scope?.addEventListener("change", () => {
      loadLecturers();
    });

    el.khoa?.addEventListener("change", () => {
      loadLecturers();
    });

    el.keyword?.addEventListener("input", () => {
      applyFilter();
    });

    el.exportAllBtn?.addEventListener("click", () => {
      exportAll();
    });

    el.modalExportBtn?.addEventListener("click", () => {
      if (state.selectedLecturerId) {
        downloadSingle(state.selectedLecturerId);
      }
    });

    el.tableBody?.addEventListener("click", (e) => {
      const btnExport = e.target.closest("button[data-action='export-single']");
      if (btnExport) {
        const id = btnExport.getAttribute("data-id");
        if (id) downloadSingle(id);
        return;
      }

      const btnDetail = e.target.closest("[data-action='view-detail']");
      if (btnDetail) {
        const id = btnDetail.getAttribute("data-id");
        if (id) viewLecturerDetail(id);
        return;
      }
    });
  }

  async function init() {
    cacheElements();
    await initFilters();
    bindEvents();
    await loadLecturers();
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      helpers().showError(err, "Không thể khởi tạo trang");
    });
  });
})();
