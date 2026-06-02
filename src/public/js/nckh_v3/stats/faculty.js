(function () {
  const state = { faculties: [], records: [], selectedKhoaId: null };
  const el = { namHocFilter: null, khoaFilter: null, loadDataBtn: null, exportExcelBtn: null, facultyTableBody: null, recordDetailTableBody: null, recordDetailModalLabel: null };
  let recordDetailModal = null, barChartInstance = null, pieChartInstance = null;

  const COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef','#22c55e','#e11d48'];

  const api = {
    async getSummary(namHoc, khoaId = "ALL") {
      const r = await fetch(`/v3/nckh/stats/khoa?${new URLSearchParams({ namHoc, khoaId })}`);
      return r.json();
    },
    async getRecords(namHoc, khoaId) {
      const r = await fetch(`/v3/nckh/stats/khoa/${encodeURIComponent(khoaId)}/cong-trinh?${new URLSearchParams({ namHoc })}`);
      return r.json();
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
    const m = document.getElementById("recordDetailModal");
    if (m) recordDetailModal = bootstrap.Modal.getOrCreateInstance(m);
  }

  function renderCharts() {
    const sec = document.getElementById("chartSection");
    if (!state.faculties.length || !sec) { if (sec) sec.style.display = "none"; return; }
    sec.style.display = "";

    const labels = state.faculties.map(r => r.maPhongBan || r.tenPhongBan || "N/A");
    const dCount = state.faculties.map(r => r.soCongTrinh || 0);
    const dHours = state.faculties.map(r => Number(r.tongSoTiet) || 0);
    const ttOpts = { backgroundColor: "#1e293b", titleFont: { family: "Inter", weight: "bold" }, bodyFont: { family: "Inter" }, cornerRadius: 8, padding: 12 };

    const barCtx = document.getElementById("facultyBarChart");
    if (barCtx) {
      if (barChartInstance) barChartInstance.destroy();
      barChartInstance = new Chart(barCtx, {
        type: "bar",
        data: { labels, datasets: [
          { label: "Số công trình", data: dCount, backgroundColor: "rgba(79,70,229,0.75)", borderColor: "#4f46e5", borderWidth: 1, borderRadius: 4, yAxisID: "y" },
          { label: "Tổng số tiết", data: dHours, backgroundColor: "rgba(6,182,212,0.75)", borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4, yAxisID: "y1" },
        ]},
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 16, font: { family: "Inter", size: 12 } } }, tooltip: ttOpts },
          scales: {
            x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
            y: { position: "left", beginAtZero: true, title: { display: true, text: "Số công trình", font: { family: "Inter", size: 12 } }, grid: { color: "rgba(0,0,0,0.04)" } },
            y1: { position: "right", beginAtZero: true, title: { display: true, text: "Số tiết", font: { family: "Inter", size: 12 } }, grid: { drawOnChartArea: false } },
          },
        },
      });
    }

    const pieCtx = document.getElementById("facultyPieChart");
    if (pieCtx) {
      if (pieChartInstance) pieChartInstance.destroy();
      pieChartInstance = new Chart(pieCtx, {
        type: "doughnut",
        data: { labels: state.faculties.map(r => r.tenPhongBan || r.maPhongBan || "N/A"), datasets: [{ data: dCount, backgroundColor: COLORS.slice(0, state.faculties.length), borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }] },
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

  function renderFacultySummary() {
    if (!el.facultyTableBody) return;
    if (!state.faculties.length) { el.facultyTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.facultyTableBody.innerHTML = state.faculties.map((row, i) => {
      const k = row.khoaId === null ? "UNASSIGNED" : String(row.khoaId);
      return `<tr class="${state.selectedKhoaId === k ? "table-warning" : ""}"><td>${i + 1}</td><td>${esc(row.maPhongBan || "-")}</td><td class="text-start">${esc(row.tenPhongBan || "Chưa gán khoa")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTiet)}</td><td><button class="btn btn-sm btn-outline-info" data-action="detail" data-khoa-id="${k}"><i class="bi bi-eye"></i></button></td></tr>`;
    }).join("");
  }

  function renderRecords() {
    if (!el.recordDetailTableBody) return;
    if (!state.records.length) { el.recordDetailTableBody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Không có dữ liệu chi tiết</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.recordDetailTableBody.innerHTML = state.records.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.loaiNckhLabel)}</td><td class="text-start">${esc(row.tenCongTrinh)}</td><td class="text-start">${esc(row.tacGiaChinh)}</td><td class="text-start">${esc(row.thanhVien)}</td><td>${esc(row.tenPhongBan || row.maPhongBan || "")}</td><td>${fmt(row.tongSoTietCongTrinh)}</td></tr>`).join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    if (!namHoc) { await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning"); return; }
    const khoaId = el.khoaFilter?.value || "ALL";
    const result = await api.getSummary(namHoc, khoaId);
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê theo khoa");
    state.faculties = Array.isArray(result.data) ? result.data : [];
    state.records = []; state.selectedKhoaId = null;
    renderFacultySummary();
    renderCharts();
  }

  async function loadRecordsByFaculty(khoaId) {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const result = await api.getRecords(namHoc, khoaId);
    if (!result.success) throw new Error(result.message || "Không thể lấy danh sách công trình theo khoa");
    state.selectedKhoaId = String(khoaId);
    state.records = Array.isArray(result.data) ? result.data : [];
    renderFacultySummary(); renderRecords();
    const sel = state.faculties.find(item => { const k = item.khoaId === null ? "UNASSIGNED" : String(item.khoaId); return k === String(khoaId); });
    if (el.recordDetailModalLabel) el.recordDetailModalLabel.textContent = `Chi tiết công trình - ${sel?.tenPhongBan || "Khoa"}`;
    if (recordDetailModal) recordDetailModal.show();
  }

  async function initFilters() {
    const [yearRes, filterRes] = await Promise.all([window.NCKH_V3_STATS.api.getNamHoc(), window.NCKH_V3_STATS.api.getFilters()]);
    if (yearRes?.success) window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yearRes.NamHoc || []);
    if (filterRes?.success) window.NCKH_V3_STATS.helpers.fillKhoaOptions(el.khoaFilter, filterRes.data?.khoaList || [], true);
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => { try { await loadSummary(); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải dữ liệu"); } });
    el.exportExcelBtn?.addEventListener("click", () => {
      const namHoc = el.namHocFilter?.value, khoaId = el.khoaFilter?.value || "ALL";
      if (!namHoc) return Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      window.location.href = `/v3/nckh/export/stats/khoa?namHoc=${encodeURIComponent(namHoc)}&khoaId=${encodeURIComponent(khoaId)}`;
    });
    el.facultyTableBody?.addEventListener("click", async (event) => {
      const btn = event.target.closest("button[data-action='detail']"); if (!btn) return;
      const khoaId = btn.getAttribute("data-khoa-id"); if (!khoaId) return;
      try { await loadRecordsByFaculty(khoaId); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải công trình theo khoa"); }
    });
  }

  async function init() { cacheElements(); await initFilters(); bindEvents(); await loadSummary(); }
  window.addEventListener("DOMContentLoaded", () => { init().catch(async (e) => { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể khởi tạo thống kê khoa"); }); });
})();
