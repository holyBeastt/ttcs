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

window.viewDepartmentDetail = viewDepartmentDetail;
