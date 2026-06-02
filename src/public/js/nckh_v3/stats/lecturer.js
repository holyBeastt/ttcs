(function () {
  const state = { selectedLecturerId: null, rawLecturers: [], lecturers: [], records: [] };
  const el = { namHocFilter: null, khoaFilter: null, keywordInput: null, loadDataBtn: null, exportExcelBtn: null, lecturerTableBody: null, recordDetailTableBody: null, recordDetailModalLabel: null };
  let recordDetailModal = null, barInstance = null, pieInstance = null;

  const COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef','#22c55e','#e11d48'];

  const api = {
    async getLecturers(namHoc, khoaId, keyword) { const r = await fetch(`/v3/nckh/stats/giang-vien?${new URLSearchParams({ namHoc, khoaId, keyword })}`); return r.json(); },
    async getLecturerRecords(lecturerId, namHoc, khoaId) { const r = await fetch(`/v3/nckh/stats/giang-vien/${lecturerId}/cong-trinh?${new URLSearchParams({ namHoc, khoaId })}`); return r.json(); },
  };

  function normalizeText(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.khoaFilter = document.getElementById("khoaFilter");
    el.keywordInput = document.getElementById("keywordInput");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.exportExcelBtn = document.getElementById("exportExcelBtn");
    el.lecturerTableBody = document.getElementById("lecturerTableBody");
    el.recordDetailTableBody = document.getElementById("recordDetailTableBody");
    el.recordDetailModalLabel = document.getElementById("recordDetailModalLabel");
    const m = document.getElementById("recordDetailModal");
    if (m) recordDetailModal = bootstrap.Modal.getOrCreateInstance(m);
  }

  function renderCharts() {
    const sec = document.getElementById("chartSection");
    if (!state.lecturers.length || !sec) { if (sec) sec.style.display = "none"; return; }
    sec.style.display = "";
    const ttOpts = { backgroundColor: "#1e293b", titleFont: { family: "Inter", weight: "bold" }, bodyFont: { family: "Inter" }, cornerRadius: 8, padding: 12 };

    // Bar - Top 15 lecturers by hours
    const sorted = [...state.lecturers].sort((a, b) => (Number(b.tongSoTietGiangVien) || 0) - (Number(a.tongSoTietGiangVien) || 0)).slice(0, 15);
    const barCtx = document.getElementById("lecturerBarChart");
    if (barCtx && sorted.length) {
      if (barInstance) barInstance.destroy();
      const gradient = barCtx.getContext("2d");
      barInstance = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: sorted.map(r => r.tenNhanVien || "N/A"),
          datasets: [{
            label: "Tổng số tiết",
            data: sorted.map(r => Number(r.tongSoTietGiangVien) || 0),
            backgroundColor: sorted.map((_, i) => COLORS[i % COLORS.length]),
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { ...ttOpts, callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(2).replace(".", ",")} tiết` } },
          },
          scales: {
            x: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" }, title: { display: true, text: "Số tiết", font: { family: "Inter", size: 12 } }, ticks: { font: { family: "Inter" } } },
            y: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 }, autoSkip: false } },
          },
        },
      });
    }

    // Pie - by faculty
    const facultyMap = {};
    state.lecturers.forEach(r => {
      const k = r.maPhongBan || "Khác";
      facultyMap[k] = (facultyMap[k] || 0) + (r.soCongTrinh || 0);
    });
    const fLabels = Object.keys(facultyMap);
    const fData = Object.values(facultyMap);

    const pieCtx = document.getElementById("lecturerPieChart");
    if (pieCtx && fLabels.length) {
      if (pieInstance) pieInstance.destroy();
      pieInstance = new Chart(pieCtx, {
        type: "doughnut",
        data: { labels: fLabels, datasets: [{ data: fData, backgroundColor: COLORS.slice(0, fLabels.length), borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "55%",
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 10, font: { family: "Inter", size: 11 }, boxWidth: 10 } },
            tooltip: { ...ttOpts, callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return ` ${ctx.label}: ${ctx.parsed} (${t > 0 ? ((ctx.parsed / t) * 100).toFixed(1) : 0}%)`; } } },
          },
        },
      });
    }
  }

  function renderLecturers() {
    if (!el.lecturerTableBody) return;
    if (!state.lecturers.length) { el.lecturerTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.lecturerTableBody.innerHTML = state.lecturers.map((row, i) => {
      const ac = state.selectedLecturerId === row.lecturerId ? "table-warning" : "";
      return `<tr class="${ac}"><td>${i + 1}</td><td class="text-start">${esc(row.tenNhanVien)}</td><td>${esc(row.maPhongBan || "")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTietGiangVien)}</td><td><button class="btn btn-sm btn-outline-info" data-action="detail" data-id="${row.lecturerId}"><i class="bi bi-eye"></i></button></td></tr>`;
    }).join("");
  }

  function applyLecturerFilter() {
    const kw = normalizeText(el.keywordInput?.value || "");
    state.lecturers = kw ? state.rawLecturers.filter(r => normalizeText(r.tenNhanVien).includes(kw)) : [...state.rawLecturers];
    renderLecturers();
    renderCharts();
  }

  function renderRecords() {
    if (!el.recordDetailTableBody) return;
    if (!state.records.length) { el.recordDetailTableBody.innerHTML = '<tr><td colspan="9" class="text-muted py-4">Không có dữ liệu chi tiết</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.recordDetailTableBody.innerHTML = state.records.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.loaiNckhLabel)}</td><td class="text-start">${esc(row.tenCongTrinh)}</td><td class="text-start">${esc(row.tacGiaChinh)}</td><td class="text-start">${esc(row.thanhVien)}</td><td>${fmt(row.tongSoTietCongTrinh)}</td><td>${fmt(row.soTietGiangVien)}</td><td>${window.NCKH_V3_STATS.helpers.formatRole(row.vaiTroGiangVien)}</td></tr>`).join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const khoaId = String(el.khoaFilter?.value || "ALL").trim();
    if (!namHoc) { await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning"); return; }
    const result = await api.getLecturers(namHoc, khoaId, "");
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê giảng viên");
    state.rawLecturers = Array.isArray(result.data) ? result.data : [];
    state.selectedLecturerId = null; state.records = [];
    applyLecturerFilter();
  }

  async function loadLecturerRecords(lecturerId) {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const khoaId = String(el.khoaFilter?.value || "ALL").trim();
    const result = await api.getLecturerRecords(lecturerId, namHoc, khoaId);
    if (!result.success) throw new Error(result.message || "Không thể lấy danh sách công trình");
    state.selectedLecturerId = Number(lecturerId);
    state.records = Array.isArray(result.data) ? result.data : [];
    renderLecturers(); renderRecords();
    const sel = state.lecturers.find(item => Number(item.lecturerId) === Number(lecturerId));
    if (el.recordDetailModalLabel) el.recordDetailModalLabel.textContent = `Chi tiết công trình - ${sel?.tenNhanVien || "Giảng viên"}`;
    if (recordDetailModal) recordDetailModal.show();
  }

  async function initFilters() {
    const [yr, fl] = await Promise.all([window.NCKH_V3_STATS.api.getNamHoc(), window.NCKH_V3_STATS.api.getFilters()]);
    if (yr?.success) window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yr.NamHoc || []);
    if (fl?.success) window.NCKH_V3_STATS.helpers.fillKhoaOptions(el.khoaFilter, fl.data?.khoaList || [], true);
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => { try { await loadSummary(); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải dữ liệu"); } });
    el.keywordInput?.addEventListener("input", () => { state.selectedLecturerId = null; state.records = []; applyLecturerFilter(); });
    el.exportExcelBtn?.addEventListener("click", () => {
      const namHoc = String(el.namHocFilter?.value || "").trim();
      if (!namHoc) { Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học trước khi xuất Excel", "warning"); return; }
      const khoaId = String(el.khoaFilter?.value || "ALL").trim(), keyword = String(el.keywordInput?.value || "").trim();
      window.location.href = `/v3/nckh/export/stats/giang-vien?${new URLSearchParams({ namHoc, khoaId, keyword })}`;
    });
    el.lecturerTableBody?.addEventListener("click", async (event) => {
      const btn = event.target.closest("button[data-action='detail']"); if (!btn) return;
      const id = btn.getAttribute("data-id"); if (!id) return;
      try { await loadLecturerRecords(id); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải công trình của giảng viên"); }
    });
  }

  async function init() { cacheElements(); await initFilters(); bindEvents(); await loadSummary(); }
  window.addEventListener("DOMContentLoaded", () => { init().catch(async (e) => { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể khởi tạo thống kê giảng viên"); }); });
})();
