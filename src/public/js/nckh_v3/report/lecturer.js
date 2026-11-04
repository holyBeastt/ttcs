(function () {
  const state = {
    rawLecturers: [],
    lecturers: [],
  };

  const el = {
    namHoc: null,
    scope: null,
    khoa: null,
    keyword: null,
    loadBtn: null,
    tableBody: null,
    exportAllBtn: null,
  };

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
  }

  function renderTable() {
    if (!el.tableBody) return;

    if (!state.lecturers.length) {
      el.tableBody.innerHTML =
        '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu giảng viên trong năm học và điều kiện lọc đã chọn</td></tr>';
      if (el.exportAllBtn) el.exportAllBtn.style.display = "none";
      return;
    }

    const esc = helpers().escapeHtml;
    const fmt = helpers().formatHours;

    el.tableBody.innerHTML = state.lecturers
      .map((row, i) => {
        return `<tr>
          <td>${i + 1}</td>
          <td class="text-start fw-semibold">${esc(row.tenNhanVien)}</td>
          <td>${esc(row.maPhongBan || row.lecturerKhoaName || "-")}</td>
          <td><span class="badge bg-secondary">${row.soCongTrinh}</span></td>
          <td class="fw-bold text-primary">${fmt(row.tongSoTietGiangVien)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-action="export-single" data-id="${row.lecturerId}" title="Tải file Word (.docx)">
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
      '<tr><td colspan="6" class="text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Đang tải danh sách...</td></tr>';

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
        '<tr><td colspan="6" class="text-danger py-4">Có lỗi xảy ra khi tải dữ liệu</td></tr>';
    }
  }

  function downloadSingle(lecturerId) {
    const namHoc = String(el.namHoc?.value || "").trim();
    const scope = String(el.scope?.value || "PREVIEW").trim();
    if (!namHoc) {
      Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      return;
    }
    window.location.href = `/v3/nckh/bao-cao-ca-nhan/export/${lecturerId}?namHoc=${encodeURIComponent(namHoc)}&scope=${encodeURIComponent(scope)}`;
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
        const url = `/v3/nckh/bao-cao-ca-nhan/export/${gv.lecturerId}?namHoc=${encodeURIComponent(namHoc)}&scope=${encodeURIComponent(scope)}`;
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

    el.tableBody?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action='export-single']");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (id) downloadSingle(id);
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
