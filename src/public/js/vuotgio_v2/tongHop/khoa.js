/**
 * Thống kê theo Khoa/Phòng/Ban - Frontend JS
 * VuotGio V2 — Redesign với Charts
 */

/* ════════════════════════════════════════════
   Màu sắc đặc trưng cho từng đơn vị
   (hash theo index hoặc mã khoa)
════════════════════════════════════════════ */
const DEPT_COLORS = [
  '#1A56DB', '#059669', '#D97706', '#7C3AED',
  '#DB2777', '#0891B2', '#65A30D', '#EA580C',
  '#9333EA', '#0F766E', '#B45309', '#1D4ED8',
];

function getDeptColor(index) {
  return DEPT_COLORS[index % DEPT_COLORS.length];
}

/* ════════════════════════════════════════════
   Biến trạng thái
════════════════════════════════════════════ */
let chartBar     = null;
let chartDonut   = null;
let chartStacked = null;
let currentTab   = 'all';
let cachedData   = [];
let previewPdfObjectUrl = null;

/* ════════════════════════════════════════════
   Khởi tạo
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  loadNamHocOptions();

  const loadBtn = document.getElementById('loadDataBtn');
  if (loadBtn) loadBtn.addEventListener('click', loadData);
});

/* ════════════════════════════════════════════
   Load danh sách năm học
════════════════════════════════════════════ */
async function loadNamHocOptions() {
  const urlNamHoc = new URLSearchParams(window.location.search).get('namHoc');

  try {
    const response = await fetch('/api/namhoc');
    const data = await response.json();

    const select = document.getElementById('namHocXem');
    if (!select) return;

    select.innerHTML = '';
    data.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = item.NamHoc;
      option.textContent = item.NamHoc;

      if (urlNamHoc && item.NamHoc === urlNamHoc) {
        option.selected = true;
      } else if (
        !urlNamHoc &&
        (item.trangthai === 1 || (index === 0 && !data.some((i) => i.trangthai === 1)))
      ) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    setTimeout(loadData, 100);
  } catch (error) {
    console.error('Error loading nam hoc:', error);
  }
}

/* ════════════════════════════════════════════
   Format số
════════════════════════════════════════════ */
function fmt(val) {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ════════════════════════════════════════════
   Load dữ liệu từ API
════════════════════════════════════════════ */
async function loadData() {
  const namHoc = document.getElementById('namHocXem')?.value;

  if (!namHoc) {
    Swal.fire('Thông báo', 'Vui lòng chọn năm học', 'warning');
    return;
  }

  showSkeletonRows();

  try {
    Swal.showLoading();

    const response = await fetch(
      `/v2/vuotgio/tong-hop/khoa?namHoc=${encodeURIComponent(namHoc)}`
    );
    const result = await response.json();
    Swal.close();

    if (!result.success) {
      throw new Error(result.message || 'Không thể tải dữ liệu');
    }

    cachedData = result.data || [];

    renderTable(currentTab, cachedData);
    renderFooter(cachedData, result.summary || {});
    renderCharts(cachedData);
    updateKpiCards(cachedData, result.summary || {});

    const info = document.getElementById('toolbarInfo');
    if (info) {
      info.textContent = `${cachedData.length} đơn vị · Năm học ${namHoc}`;
    }
  } catch (error) {
    Swal.close();
    console.error('Error loading data:', error);
    Swal.fire('Lỗi', error.message || 'Không thể tải dữ liệu', 'error');
    clearSkeletonRows();
  }
}

/* ════════════════════════════════════════════
   Skeleton loading rows
════════════════════════════════════════════ */
function showSkeletonRows() {
  const body = document.getElementById('tableBody');
  if (!body) return;
  body.innerHTML = Array.from({ length: 5 })
    .map(() => `<tr class="skeleton-row"><td colspan="13">&nbsp;</td></tr>`)
    .join('');
}

function clearSkeletonRows() {
  const body = document.getElementById('tableBody');
  if (body) {
    body.innerHTML =
      '<tr><td colspan="13" class="text-center text-muted py-4">Không có dữ liệu</td></tr>';
  }
}

/* ════════════════════════════════════════════
   Cập nhật KPI cards
════════════════════════════════════════════ */
function updateKpiCards(data, summary) {
  const totGV  = summary.tongSoGV    || data.reduce((s, r) => s + (r.tongSoGV    || 0), 0);
  const totTH  = summary.tongThucHien|| data.reduce((s, r) => s + (r.tongThucHien|| 0), 0);
  const totVuot= summary.tongVuot    || data.reduce((s, r) => s + (r.tongVuot    || 0), 0);
  const totTT  = summary.tongThanhToan|| data.reduce((s, r) => s + (r.thanhToan  || 0), 0);

  setEl('sumGV',        totGV);
  setEl('sumKhoa',      data.length);
  setEl('sumTH',        fmt(totTH));
  setEl('sumVuot',      fmt(totVuot));
  setEl('sumThanhToan', fmt(totTT));
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ════════════════════════════════════════════
   Render bảng
════════════════════════════════════════════ */
function renderTable(mode, data) {
  const body       = document.getElementById('tableBody');
  const subRow     = document.getElementById('subHeadRow');
  const detailSpan = document.getElementById('detailHeadSpan');

  if (!body) return;

  const compact = mode === 'compact';

  if (subRow)     subRow.style.display = compact ? 'none' : '';
  if (detailSpan) detailSpan.colSpan   = compact ? 1 : 5;

  if (data.length === 0) {
    body.innerHTML =
      '<tr><td colspan="13" class="text-center text-muted py-4">Không có dữ liệu cho năm học này</td></tr>';
    return;
  }

  const rows = data.map((row, index) => {
    const code          = row.maKhoa || row.MaPhongBan || '';
    const maKhoaEncoded = encodeURIComponent(code);
    const color         = getDeptColor(index);

    const detailCells = compact
      ? `<td class="num">${fmt(row.tongThucHien)}</td>`
      : `
          <td class="num">${fmt(row.soTietGiangDay)}</td>
          <td class="num">${fmt(row.soTietNgoaiQC)}</td>
          <td class="num">${fmt(row.soTietKTHP)}</td>
          <td class="num">${fmt(row.soTietDoAn)}</td>
          <td class="num">${fmt(row.soTietHDTQ)}</td>
        `;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${code}</td>
        <td class="name-col">
          <span class="dept-dot" style="background:${color};"></span>
          ${row.tenKhoa || row.maKhoa || ''}
        </td>
        <td>${row.tongSoGV || 0}</td>
        ${detailCells}
        <td class="total">${fmt(row.tongThucHien)}</td>
        <td class="vuot">${fmt(row.tongVuot)}</td>
        <td class="paid">${fmt(row.thanhToan)}</td>
        <td>
          <button
            class="btn-eye"
            onclick="viewDepartmentDetail('${maKhoaEncoded}')"
            title="Xem chi tiết giảng viên"
          >
            <i class="fas fa-eye"></i>
          </button>
          <button
            class="btn-eye ms-1"
            onclick="previewDepartment('${maKhoaEncoded}', '${escapeHtml(row.tenKhoa || row.maKhoa || code || '')}')"
            title="Xem preview khoa"
          >
            <i class="fas fa-file-pdf"></i>
          </button>
        </td>
      </tr>
    `;
  });

  body.innerHTML = rows.join('');
}

/* ════════════════════════════════════════════
   Render footer (tổng cộng)
════════════════════════════════════════════ */
function renderFooter(data, summary) {
  const foot = document.getElementById('tableFoot');
  if (!foot) return;

  const totals = {
    tongSoGV:      summary.tongSoGV     || data.reduce((s, r) => s + (r.tongSoGV      || 0), 0),
    soTietGiangDay: data.reduce((s, r) => s + (r.soTietGiangDay  || 0), 0),
    soTietNgoaiQC:  data.reduce((s, r) => s + (r.soTietNgoaiQC   || 0), 0),
    soTietKTHP:     data.reduce((s, r) => s + (r.soTietKTHP      || 0), 0),
    soTietDoAn:     data.reduce((s, r) => s + (r.soTietDoAn      || 0), 0),
    soTietHDTQ:     data.reduce((s, r) => s + (r.soTietHDTQ      || 0), 0),
    tongThucHien:  summary.tongThucHien || data.reduce((s, r) => s + (r.tongThucHien  || 0), 0),
    tongVuot:      summary.tongVuot     || data.reduce((s, r) => s + (r.tongVuot      || 0), 0),
    thanhToan:     summary.tongThanhToan|| data.reduce((s, r) => s + (r.thanhToan     || 0), 0),
  };

  const detailCells =
    currentTab === 'compact'
      ? `<td>${fmt(totals.tongThucHien)}</td>`
      : `
          <td>${fmt(totals.soTietGiangDay)}</td>
          <td>${fmt(totals.soTietNgoaiQC)}</td>
          <td>${fmt(totals.soTietKTHP)}</td>
          <td>${fmt(totals.soTietDoAn)}</td>
          <td>${fmt(totals.soTietHDTQ)}</td>
        `;

  foot.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center;font-size:12px;letter-spacing:.04em;">
        TỔNG HỌC VIỆN
      </td>
      <td>${totals.tongSoGV}</td>
      ${detailCells}
      <td class="total">${fmt(totals.tongThucHien)}</td>
      <td class="vuot">${fmt(totals.tongVuot)}</td>
      <td class="paid">${fmt(totals.thanhToan)}</td>
      <td></td>
    </tr>
  `;
}

/* ════════════════════════════════════════════
   Switch tab Đầy đủ / Gọn
════════════════════════════════════════════ */
function switchTab(mode) {
  currentTab = mode;
  document.getElementById('tabAll').classList.toggle('active',     mode === 'all');
  document.getElementById('tabCompact').classList.toggle('active', mode === 'compact');
  renderTable(mode, cachedData);
  renderFooter(cachedData, {});
}

window.switchTab = switchTab;

/* ════════════════════════════════════════════
   Render / Update Charts
════════════════════════════════════════════ */
function renderCharts(data) {
  const labels     = data.map((r) => r.maKhoa || r.MaPhongBan || '');
  const thucHien   = data.map((r) => r.tongThucHien || 0);
  const vuotGio    = data.map((r) => r.tongVuot     || 0);
  const thanhToan  = data.map((r) => r.thanhToan    || 0);
  const gdData     = data.map((r) => r.soTietGiangDay || 0);
  const nqcData    = data.map((r) => r.soTietNgoaiQC  || 0);
  const kthpData   = data.map((r) => r.soTietKTHP     || 0);
  const daData     = data.map((r) => r.soTietDoAn     || 0);
  const tqttData   = data.map((r) => r.soTietHDTQ     || 0);

  const totVuot = vuotGio.reduce((a, b) => a + b, 0);
  const totTT   = thanhToan.reduce((a, b) => a + b, 0);
  const chuaTT  = Math.max(0, totVuot - totTT);

  const ticksCfg = {
    font: { size: 11, family: "'Be Vietnam Pro', sans-serif" },
    color: '#64748B',
  };

  const gridCfg = { color: 'rgba(0,0,0,.05)' };

  const yCallback = (v) =>
    v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v;

  /* ── Bar chart ── */
  if (chartBar) chartBar.destroy();
  chartBar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Thực hiện', data: thucHien,  backgroundColor: '#1A56DB', borderRadius: 3 },
        { label: 'Vượt giờ',  data: vuotGio,   backgroundColor: '#D97706', borderRadius: 3 },
        { label: 'Thanh toán',data: thanhToan,  backgroundColor: '#059669', borderRadius: 3 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { ticks: { ...ticksCfg, autoSkip: false }, grid: { display: false } },
        y: { ticks: { ...ticksCfg, callback: yCallback }, grid: gridCfg },
      },
    },
  });

  /* ── Donut chart ── */
  if (chartDonut) chartDonut.destroy();
  const pct = totVuot > 0 ? Math.round((totTT / totVuot) * 100) : 0;
  chartDonut = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Được thanh toán', 'Chưa thanh toán'],
      datasets: [
        {
          data: [totTT, chuaTT],
          backgroundColor: ['#059669', '#F87171'],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const p = totVuot > 0 ? Math.round((ctx.parsed / totVuot) * 100) : 0;
              return `${ctx.label}: ${fmt(ctx.parsed)} (${p}%)`;
            },
          },
        },
      },
    },
    plugins: [
      {
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea: { width, height, left, top } } = chart;
          ctx.save();
          ctx.font = `600 20px 'Be Vietnam Pro', sans-serif`;
          ctx.fillStyle = '#1E293B';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${pct}%`, left + width / 2, top + height / 2 - 8);
          ctx.font = `400 11px 'Be Vietnam Pro', sans-serif`;
          ctx.fillStyle = '#64748B';
          ctx.fillText('được TT', left + width / 2, top + height / 2 + 14);
          ctx.restore();
        },
      },
    ],
  });

  /* ── Stacked bar ── */
  if (chartStacked) chartStacked.destroy();
  chartStacked = new Chart(document.getElementById('stackedChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Giảng dạy', data: gdData,   backgroundColor: '#1A56DB', borderRadius: 0 },
        { label: 'Ngoài QC',  data: nqcData,  backgroundColor: '#059669', borderRadius: 0 },
        { label: 'KTHP',      data: kthpData, backgroundColor: '#D97706', borderRadius: 0 },
        { label: 'Đồ án',     data: daData,   backgroundColor: '#7C3AED', borderRadius: 0 },
        { label: 'TQTT',      data: tqttData, backgroundColor: '#DB2777', borderRadius: 0 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { stacked: true, ticks: { ...ticksCfg, autoSkip: false }, grid: { display: false } },
        y: { stacked: true, ticks: { ...ticksCfg, callback: yCallback }, grid: gridCfg },
      },
    },
  });
}

/* ════════════════════════════════════════════
   Điều hướng xem chi tiết giảng viên
════════════════════════════════════════════ */
function viewDepartmentDetail(maKhoa) {
  const namHoc = document.getElementById('namHocXem')?.value || '';
  window.location.href = `/v2/vuotgio/tong-hop-giang-vien?namHoc=${encodeURIComponent(namHoc)}&khoa=${maKhoa}`;
}

function previewDepartment(maKhoa, tenKhoa) {
  const namHoc = document.getElementById('namHocXem')?.value;
  if (!namHoc) {
    Swal.fire('Thông báo', 'Vui lòng chọn năm học', 'warning');
    return;
  }

  const previewLabel = tenKhoa || decodeURIComponent(maKhoa || '');
  Swal.showLoading();

  fetch(`/v2/vuotgio/tong-hop/preview-khoa/${maKhoa}?namHoc=${encodeURIComponent(namHoc)}`)
    .then((response) => response.json())
    .then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Không thể tải preview khoa');
      }

      if (!result.data?.pdfBase64) {
        throw new Error('Không tạo được bản PDF preview');
      }

      openPdfPreviewWindow(result.data.pdfBase64, previewLabel, namHoc, maKhoa);
    })
    .catch((error) => {
      console.error('Error loading khoa preview:', error);
      Swal.fire('Lỗi', error.message || 'Không thể tải preview khoa', 'error');
    })
    .finally(() => Swal.close());
}

function openPdfPreviewWindow(pdfBase64, title, namHoc, maKhoa) {
  if (previewPdfObjectUrl) {
    URL.revokeObjectURL(previewPdfObjectUrl);
    previewPdfObjectUrl = null;
  }

  const pdfBytes = atob(pdfBase64);
  const byteNumbers = new Array(pdfBytes.length);
  for (let i = 0; i < pdfBytes.length; i += 1) {
    byteNumbers[i] = pdfBytes.charCodeAt(i);
  }
  const pdfBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
  previewPdfObjectUrl = URL.createObjectURL(pdfBlob);

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    Swal.fire('Lỗi', 'Trình duyệt đã chặn cửa sổ preview mới. Vui lòng cho phép popup.', 'error');
    return;
  }

  const escapeHtml = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapedTitle = escapeHtml(`Xem trước khoa: ${title || ''}`);
  const escapedNamHoc = escapeHtml(namHoc || '');
  const escapedKhoa = escapeHtml(title || decodeURIComponent(maKhoa || ''));

  previewWindow.document.open();
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapedTitle}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
      <style>
        html, body {
          margin: 0;
          width: 100%;
          height: 100%;
          background: #fff;
          overflow: hidden;
          font-family: Arial, sans-serif;
        }
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: #f1f5f9;
          color: #1e293b;
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 20px;
          z-index: 1000;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border-bottom: 1px solid #e2e8f0;
        }
        .header .info-group {
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 14px;
        }
        .header .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          white-space: nowrap;
        }
        .header .info-item strong {
          color: #64748b;
        }
        .header button {
          height: 36px;
          width: 36px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
        }
        .header button:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .header button.close-btn {
          margin-left: auto;
        }
        .header button.close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fecaca;
        }
        .header .title {
          font-weight: 600;
          font-size: 16px;
          color: #0f172a;
        }
        .layout {
          display: flex;
          width: 100%;
          height: 100%;
          padding-top: 56px;
        }
        .sidebar {
          width: 260px;
          min-width: 260px;
          border-right: 1px solid #e5e7eb;
          background: #f8fafc;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar.hidden {
          display: none;
        }
        .sidebar .meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 14px;
          color: #334155;
        }
        .meta-item {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          line-height: 1.4;
        }
        .viewer {
          flex: 1;
          height: 100%;
          border: 0;
        }
      </style>
      <script>
        // Sidebar toggle removed as sidebar is gone
      </script>
    </head>
    <body>
      <div class="header">
        <div class="title">${escapedTitle}</div>
        <div class="info-group">
          <div class="info-item">
            <strong>Năm học:</strong> ${escapedNamHoc}
          </div>
          <div class="info-item">
            <strong>Khoa:</strong> ${escapedKhoa}
          </div>
        </div>
        <button class="close-btn" onclick="window.close()" title="Đóng">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="layout">
        <iframe class="viewer" src="${previewPdfObjectUrl}#toolbar=0&navpanes=0" title="Khoa Preview PDF"></iframe>
      </div>
    </body>
    </html>
  `);
  previewWindow.document.close();
}

window.viewDepartmentDetail = viewDepartmentDetail;
window.previewDepartment = previewDepartment;
