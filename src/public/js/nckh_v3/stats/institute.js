(function () {
  const state = { summary: null };
  const el = { namHocFilter: null, loadDataBtn: null, kpiCongTrinh: null, kpiSoTiet: null, kpiGiangVien: null, typeTableBody: null, facultyTableBody: null, recordsModal: null, modalTableBody: null, modalTitle: null };
  let doughnutInstance = null, barInstance = null;

  const COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef','#22c55e','#e11d48'];

  const api = {
    async getSummary(namHoc) { const r = await fetch(`/v3/nckh/stats/hoc-vien?${new URLSearchParams({ namHoc })}`); return r.json(); },
    async getRecords(namHoc, khoaId, type) { const r = await fetch(`/v3/nckh/stats/hoc-vien/cong-trinh?${new URLSearchParams({ namHoc, khoaId, type })}`); return r.json(); },
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
    const o = state.summary?.overview || {};
    const fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (el.kpiCongTrinh) el.kpiCongTrinh.textContent = String(o.tongCongTrinh || 0);
    if (el.kpiSoTiet) el.kpiSoTiet.textContent = fmt(o.tongSoTiet || 0);
    if (el.kpiGiangVien) el.kpiGiangVien.textContent = String(o.tongGiangVienNoiBo || 0);
  }

  function renderCharts() {
    const sec = document.getElementById("chartSection");
    const byType = state.summary?.byType || [];
    const byFaculty = state.summary?.byFaculty || [];
    if ((!byType.length && !byFaculty.length) || !sec) { if (sec) sec.style.display = "none"; return; }
    sec.style.display = "";
    const ttOpts = { backgroundColor: "#1e293b", titleFont: { family: "Inter", weight: "bold" }, bodyFont: { family: "Inter" }, cornerRadius: 8, padding: 12 };

    // Doughnut - by type
    const dCtx = document.getElementById("typeDoughnutChart");
    if (dCtx && byType.length) {
      if (doughnutInstance) doughnutInstance.destroy();
      doughnutInstance = new Chart(dCtx, {
        type: "doughnut",
        data: { labels: byType.map(r => r.loaiNckhLabel || r.loaiNckh || "N/A"), datasets: [{ data: byType.map(r => r.soCongTrinh || 0), backgroundColor: COLORS.slice(0, byType.length), borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "55%",
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 10, font: { family: "Inter", size: 11 }, boxWidth: 10 } },
            tooltip: { ...ttOpts, callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return ` ${ctx.label}: ${ctx.parsed} (${t > 0 ? ((ctx.parsed / t) * 100).toFixed(1) : 0}%)`; } } },
          },
        },
      });
    }

    // Bar - by faculty
    const bCtx = document.getElementById("facultyBarChart");
    if (bCtx && byFaculty.length) {
      if (barInstance) barInstance.destroy();
      barInstance = new Chart(bCtx, {
        type: "bar",
        data: {
          labels: byFaculty.map(r => r.maPhongBan || r.tenPhongBan || "N/A"),
          datasets: [
            { label: "Số công trình", data: byFaculty.map(r => r.soCongTrinh || 0), backgroundColor: "rgba(79,70,229,0.75)", borderColor: "#4f46e5", borderWidth: 1, borderRadius: 4, yAxisID: "y" },
            { label: "Tổng số tiết", data: byFaculty.map(r => Number(r.tongSoTiet) || 0), backgroundColor: "rgba(6,182,212,0.75)", borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4, yAxisID: "y1" },
          ],
        },
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
  }

  function renderByType() {
    if (!el.typeTableBody) return;
    const rows = state.summary?.byType || [];
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (!rows.length) { el.typeTableBody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    el.typeTableBody.innerHTML = rows.map((row, i) => `<tr><td>${i + 1}</td><td class="text-start">${esc(row.loaiNckhLabel || row.loaiNckh || "")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTiet)}</td><td><button class="btn btn-sm btn-outline-info btn-view-type" data-type="${esc(row.typeSlug || row.loaiNckh)}" title="Xem chi tiết"><i class="bi bi-eye"></i></button></td></tr>`).join("");
  }

  function renderByFaculty() {
    if (!el.facultyTableBody) return;
    const rows = state.summary?.byFaculty || [];
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (!rows.length) { el.facultyTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    el.facultyTableBody.innerHTML = rows.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.maPhongBan || "-")}</td><td class="text-start">${esc(row.tenPhongBan || "Chưa gán khoa")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTiet)}</td><td><button class="btn btn-sm btn-outline-info btn-view-faculty" data-id="${row.khoaId || "UNASSIGNED"}" title="Xem chi tiết"><i class="bi bi-eye"></i></button></td></tr>`).join("");
  }

  async function showRecords(params) {
    const { namHoc, khoaId, type, title } = params;
    if (el.modalTitle) el.modalTitle.textContent = title || "Chi tiết công trình NCKH";
    if (el.modalTableBody) el.modalTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Đang tải dữ liệu...</td></tr>';
    const modal = new bootstrap.Modal(el.recordsModal); modal.show();
    try {
      const result = await api.getRecords(namHoc, khoaId, type);
      if (!result.success) throw new Error(result.message);
      renderModalRows(result.data || []);
    } catch (error) {
      if (el.modalTableBody) el.modalTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Lỗi: ${error.message}</td></tr>`;
    }
  }

  function renderModalRows(rows) {
    if (!el.modalTableBody) return;
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (!rows.length) { el.modalTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Không có dữ liệu chi tiết</td></tr>'; return; }
    el.modalTableBody.innerHTML = rows.map((row, i) => {
      const lbl = row.loaiNckhLabel || row.loaiNckh || "N/A";
      return `<tr><td class="text-center">${i + 1}</td><td class="text-start">${esc(row.tenCongTrinh)}</td><td class="text-center"><span class="fw-bold">${esc(lbl)}</span></td><td class="text-start">${esc(row.phanLoai)}</td><td class="small">${esc(row.tacGiaChinh)}</td><td class="small">${esc(row.thanhVien || "-")}</td><td class="text-center fw-bold text-primary">${fmt(row.tongSoTietCongTrinh)}</td><td class="small text-center">${esc(row.maSo || "-")}</td><td class="small text-center">${row.ngayNghiemThu ? new Date(row.ngayNghiemThu).toLocaleDateString("vi-VN") : "-"}</td></tr>`;
    }).join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    if (!namHoc) { await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning"); return; }
    const result = await api.getSummary(namHoc);
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê học viện");
    state.summary = result.data || null;
    renderKpi(); renderByType(); renderByFaculty(); renderCharts();
  }

  async function initFilters() {
    const yr = await window.NCKH_V3_STATS.api.getNamHoc();
    if (yr?.success) window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yr.NamHoc || []);
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => { try { await loadSummary(); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải dữ liệu học viện"); } });
    el.typeTableBody?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-view-type"); if (!btn) return;
      const type = btn.dataset.type, lbl = btn.closest("tr").querySelector("td:nth-child(2)").textContent.trim(), namHoc = el.namHocFilter.value;
      showRecords({ namHoc, khoaId: "ALL", type, title: `Chi tiết: ${lbl} (${namHoc})` });
    });
    el.facultyTableBody?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-view-faculty"); if (!btn) return;
      const khoaId = btn.dataset.id, name = btn.closest("tr").querySelector("td:nth-child(3)").textContent.trim(), namHoc = el.namHocFilter.value;
      showRecords({ namHoc, khoaId, type: "ALL", title: `Chi tiết: ${name} (${namHoc})` });
    });
    document.getElementById("exportExcelBtn")?.addEventListener("click", () => {
      const namHoc = el.namHocFilter?.value;
      if (!namHoc) return Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      window.location.href = `/v3/nckh/export/stats/hoc-vien?namHoc=${encodeURIComponent(namHoc)}`;
    });
  }

  async function init() { cacheElements(); await initFilters(); bindEvents(); await loadSummary(); }
  window.addEventListener("DOMContentLoaded", () => { init().catch(async (e) => { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể khởi tạo thống kê học viện"); }); });
})();
