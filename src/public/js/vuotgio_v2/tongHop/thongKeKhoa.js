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
let statisticsTab = 'academy';
let lecturerOptions = [];
let statisticsRequestVersion = 0;
const isForecastStats = document.body.dataset.statisticsMode === 'du-kien';

/* ════════════════════════════════════════════
   Khởi tạo
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  setupStatisticsTabs();
  loadNamHocOptions();

  const loadBtn = document.getElementById('loadDataBtn');
  if (loadBtn) loadBtn.addEventListener('click', loadData);

  const lecturerSearch = document.getElementById('lecturerStatisticsSearch');
  const lecturerSuggestions = document.getElementById('lecturerStatisticsSuggestions');
  if (lecturerSearch) {
    lecturerSearch.addEventListener('input', () => {
      lecturerSearch.dataset.selectedId = '';
      renderLecturerDeclaration('');
      renderLecturerSuggestions();
    });

    lecturerSearch.addEventListener('focus', renderLecturerSuggestions);

    document.addEventListener('click', (event) => {
      if (
        lecturerSuggestions &&
        !lecturerSearch.contains(event.target) &&
        !lecturerSuggestions.contains(event.target)
      ) {
        clearLecturerSuggestions();
      }
    });
  }
  const namHocSelect = document.getElementById('namHocXem');
  if (namHocSelect) namHocSelect.addEventListener('change', loadData);
});

function setupStatisticsTabs() {
  document.querySelectorAll('[data-statistics-tab]').forEach((button) => {
    button.addEventListener('click', () => setStatisticsTab(button.dataset.statisticsTab));
  });
}

function setStatisticsTab(tab) {
  statisticsTab = tab || 'academy';

  document.querySelectorAll('[data-statistics-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.statisticsTab === statisticsTab);
  });

  const academyVisible = statisticsTab === 'academy';
  ['academyKpi', 'academyCharts', 'academyTable'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.hidden = !academyVisible;
  });

  const facultyPanel = document.getElementById('facultyStatisticsPanel');
  const lecturerPanel = document.getElementById('lecturerStatisticsPanel');
  const lecturerSearchToolbar = document.getElementById('lecturerSearchToolbar');
  if (facultyPanel) facultyPanel.hidden = statisticsTab !== 'faculty';
  if (lecturerPanel) lecturerPanel.hidden = statisticsTab !== 'lecturer';
  if (lecturerSearchToolbar) lecturerSearchToolbar.hidden = statisticsTab !== 'lecturer';

  const compactToggle = document.querySelector('#academyToolbar .tab-toggle');
  if (compactToggle) compactToggle.style.display = academyVisible ? '' : 'none';

  const toolbarInfo = document.getElementById('toolbarInfo');
  if (toolbarInfo && !academyVisible) {
    toolbarInfo.textContent = statisticsTab === 'faculty'
      ? 'Danh sách giảng viên được nhóm theo Khoa/Phòng'
      : 'Tìm một giảng viên để xem bảng kê chi tiết';
  }

  if (statisticsTab !== 'academy') {
    loadData();
  }
}

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
  const requestVersion = ++statisticsRequestVersion;
  if (statisticsTab === 'faculty') return loadFacultyStatistics(requestVersion);
  if (statisticsTab === 'lecturer') return loadLecturerStatistics(requestVersion);
  return loadAcademyStatistics(requestVersion);
}

async function loadAcademyStatistics(requestVersion) {
  const namHoc = document.getElementById('namHocXem')?.value;

  if (!namHoc) {
    Swal.fire('Thông báo', 'Vui lòng chọn năm học', 'warning');
    return;
  }

  showSkeletonRows();

  try {
    Swal.showLoading();

    const forecastParam = isForecastStats ? '&isDuKien=true' : '';
    const response = await fetch(
      `/v2/vuotgio/tong-hop/khoa?namHoc=${encodeURIComponent(namHoc)}${forecastParam}`
    );
    const result = await response.json();
    Swal.close();

    if (!result.success) {
      throw new Error(result.message || 'Không thể tải dữ liệu');
    }

    if (requestVersion !== statisticsRequestVersion) return;

    cachedData = result.data || [];

    renderTable(currentTab, cachedData);
    const summary = result.summary || {};
    renderFooter(cachedData, summary);
    renderCharts(cachedData);
    updateKpiCards(cachedData, summary);

    const info = document.getElementById('toolbarInfo');
    if (info) {
      info.textContent = `${cachedData.length} đơn vị · Năm học ${namHoc}`;
    }

    const snapshotInfo = document.getElementById('snapshotInfo');
    const snapshotDetails = document.getElementById('snapshotDetails');
    if (snapshotInfo && snapshotDetails) {
      if (isForecastStats) {
        snapshotDetails.textContent = 'Tính trực tiếp từ dữ liệu dự kiến hiện tại; chưa chốt.';
        snapshotInfo.style.display = 'block';
      } else if (summary.ngayChot) {
        const d = new Date(summary.ngayChot);
        const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        snapshotDetails.textContent = `Lúc ${timeStr} ngày ${dateStr} bởi ${summary.nguoiChotName || summary.nguoiChotId || 'Hệ thống'}`;
        snapshotInfo.style.display = 'block';
      } else {
        snapshotInfo.style.display = 'none';
      }
    }
  } catch (error) {
    if (requestVersion !== statisticsRequestVersion) return;
    Swal.close();
    console.error('Error loading data:', error);
    Swal.fire('Lỗi', error.message || 'Không thể tải dữ liệu', 'error');
    clearSkeletonRows();
  }
}

function getLecturerDataUrl(namHoc, detail) {
  const query = new URLSearchParams({
    namHoc,
    khoa: 'ALL',
  });

  if (isForecastStats) {
    query.set('detail', detail ? '1' : '0');
    query.set('isDuKien', 'true');
    return `/v2/vuotgio/tong-hop/giang-vien?${query.toString()}`;
  }

  query.set('detail', detail ? '1' : '0');
  return `/v2/vuotgio/tong-hop/giang-vien-snapshot?${query.toString()}`;
}

async function fetchLecturerData(namHoc, detail = false) {
  const response = await fetch(getLecturerDataUrl(namHoc, detail));
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể tải dữ liệu giảng viên');
  }
  return Array.isArray(result.data) ? result.data : [];
}

async function loadFacultyStatistics(requestVersion) {
  const namHoc = document.getElementById('namHocXem')?.value;
  const content = document.getElementById('facultyStatisticsContent');
  if (!namHoc || !content) return;

  content.innerHTML = '<div class="lecturer-empty">Đang tải dữ liệu theo khoa/phòng...</div>';

  try {
    const rows = await fetchLecturerData(namHoc, false);
    if (requestVersion !== statisticsRequestVersion) return;
    renderFacultyStatistics(rows, namHoc);
  } catch (error) {
    if (requestVersion !== statisticsRequestVersion) return;
    console.error('Error loading faculty statistics:', error);
    content.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(error.message || 'Không thể tải dữ liệu')}</div>`;
  }
}

function renderFacultyStatistics(rows, namHoc) {
  const content = document.getElementById('facultyStatisticsContent');
  const meta = document.getElementById('facultyPanelMeta');
  if (!content) return;

  const groups = new Map();
  rows.forEach((row) => {
    const code = row.maKhoa || row.MaPhongBan || 'KHAC';
    const name = row.khoa || code || 'Khác/Chưa xác định';
    if (!groups.has(code)) groups.set(code, { code, name, rows: [] });
    groups.get(code).rows.push(row);
  });

  const orderedGroups = Array.from(groups.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name), 'vi')
  );

  if (meta) meta.textContent = `${orderedGroups.length} khoa/phòng · ${rows.length} giảng viên · Năm học ${namHoc}`;

  if (!orderedGroups.length) {
    content.innerHTML = '<div class="lecturer-empty">Không có dữ liệu giảng viên cho năm học này.</div>';
    return;
  }

  const renderRow = (row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.giangVien || '')}</td>
      <td class="num">${fmt(row.dinhMucSauMienGiam ?? row.dinhMucChuan)}</td>
      <td class="num">${fmt(row.soTietGiangDay)}</td>
      <td class="num">${fmt(row.soTietNgoaiQC)}</td>
      <td class="num">${fmt(row.soTietKTHP)}</td>
      <td class="num">${fmt(row.soTietDoAn)}</td>
      <td class="num">${fmt(row.soTietHDTQ)}</td>
      <td class="num">${fmt(row.soTietNCKH)}</td>
      <td class="num total">${fmt(row.tongThucHien)}</td>
      <td class="num">${fmt(row.thieuNCKH)}</td>
      <td class="num vuot">${fmt(row.tongVuot)}</td>
      <td class="num paid">${fmt(row.thanhToan)}</td>
    </tr>`;

  const sumGroupField = (group, field) => group.rows.reduce((sum, row) => {
    const value = field === 'dinhMuc'
      ? row.dinhMucSauMienGiam ?? row.dinhMucChuan
      : row[field];
    return sum + (Number(value) || 0);
  }, 0);

  const renderTotalRow = (group) => `
    <tr class="faculty-total-row">
      <td colspan="2">Tổng cộng ${escapeHtml(group.code)} (${group.rows.length} giảng viên)</td>
      <td class="num">${fmt(sumGroupField(group, 'dinhMuc'))}</td>
      <td class="num">${fmt(sumGroupField(group, 'soTietGiangDay'))}</td>
      <td class="num">${fmt(sumGroupField(group, 'soTietNgoaiQC'))}</td>
      <td class="num">${fmt(sumGroupField(group, 'soTietKTHP'))}</td>
      <td class="num">${fmt(sumGroupField(group, 'soTietDoAn'))}</td>
      <td class="num">${fmt(sumGroupField(group, 'soTietHDTQ'))}</td>
      <td class="num">${fmt(sumGroupField(group, 'soTietNCKH'))}</td>
      <td class="num total">${fmt(sumGroupField(group, 'tongThucHien'))}</td>
      <td class="num">${fmt(sumGroupField(group, 'thieuNCKH'))}</td>
      <td class="num vuot">${fmt(sumGroupField(group, 'tongVuot'))}</td>
      <td class="num paid">${fmt(sumGroupField(group, 'thanhToan'))}</td>
    </tr>`;

  content.innerHTML = orderedGroups.map((group) => `
    <div class="faculty-group">
      <div class="faculty-group-title">
        <strong>${escapeHtml(group.code)} - ${escapeHtml(group.name)}</strong>
        <span>${group.rows.length} giảng viên</span>
      </div>
      <table class="faculty-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Giảng viên</th>
            <th>Định mức</th>
            <th>Giảng dạy</th>
            <th>Ngoài QC</th>
            <th>KTHP</th>
            <th>Đồ án</th>
            <th>TQTT</th>
            <th>NCKH</th>
            <th>Tổng thực hiện</th>
            <th>Thiếu NCKH</th>
            <th>Vượt giờ</th>
            <th>Thanh toán</th>
          </tr>
        </thead>
        <tbody>${group.rows.map(renderRow).join('')}${renderTotalRow(group)}</tbody>
      </table>
    </div>
  `).join('');
}

async function loadLecturerStatistics(requestVersion) {
  const namHoc = document.getElementById('namHocXem')?.value;
  const search = document.getElementById('lecturerStatisticsSearch');
  const suggestions = document.getElementById('lecturerStatisticsSuggestions');
  const meta = document.getElementById('lecturerPanelMeta');
  if (!namHoc || !search || !suggestions) return;

  search.disabled = true;
  search.value = '';
  search.dataset.selectedId = '';
  clearLecturerSuggestions();

  try {
    lecturerOptions = await fetchLecturerData(namHoc, false);
    if (requestVersion !== statisticsRequestVersion) return;
    lecturerOptions.sort((a, b) => String(a.giangVien || '').localeCompare(String(b.giangVien || ''), 'vi'));

    if (!lecturerOptions.length) {
      search.placeholder = 'Không có dữ liệu giảng viên';
      renderLecturerDeclaration('');
      if (meta) meta.textContent = `Năm học ${namHoc}`;
      return;
    }

    const currentUserId = String(localStorage.getItem('id_User') || '');
    const defaultRow = lecturerOptions.find((row) => String(row.id_User) === currentUserId) || lecturerOptions[0];
    search.placeholder = 'Nhập tên để tìm từng giảng viên...';
    search.value = getLecturerLabel(defaultRow);
    search.dataset.selectedId = String(defaultRow.id_User);
    if (meta) meta.textContent = `${lecturerOptions.length} giảng viên · Năm học ${namHoc}`;
    renderLecturerDeclaration(defaultRow.id_User);
  } catch (error) {
    if (requestVersion !== statisticsRequestVersion) return;
    console.error('Error loading lecturer statistics:', error);
    search.placeholder = error.message || 'Không thể tải dữ liệu';
    search.value = '';
    renderLecturerDeclaration('');
  } finally {
    if (requestVersion === statisticsRequestVersion) search.disabled = false;
  }
}

function getLecturerLabel(row) {
  const name = row?.giangVien || row?.id_User || '';
  return row?.khoa ? `${name} - ${row.khoa}` : String(name);
}

function normalizeLecturerSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function clearLecturerSuggestions() {
  const suggestions = document.getElementById('lecturerStatisticsSuggestions');
  if (!suggestions) return;
  suggestions.innerHTML = '';
  suggestions.classList.remove('show');
}

function renderLecturerSuggestions() {
  const search = document.getElementById('lecturerStatisticsSearch');
  const suggestions = document.getElementById('lecturerStatisticsSuggestions');
  if (!search || !suggestions || search.disabled) return;

  const query = normalizeLecturerSearch(search.value);
  clearLecturerSuggestions();
  if (query.length < 2) return;

  const matches = lecturerOptions
    .filter((row) => normalizeLecturerSearch(getLecturerLabel(row)).includes(query))
    .slice(0, 10);

  if (!matches.length) return;

  matches.forEach((row) => {
    const item = document.createElement('div');
    item.className = 'lecturer-suggestion-item';
    item.textContent = getLecturerLabel(row);
    item.addEventListener('click', () => {
      search.value = getLecturerLabel(row);
      search.dataset.selectedId = String(row.id_User);
      clearLecturerSuggestions();
      renderLecturerDeclaration(row.id_User);
    });
    suggestions.appendChild(item);
  });

  suggestions.classList.add('show');
}

function renderLecturerDeclaration(idUser) {
  const frame = document.getElementById('lecturerDeclarationFrame');
  const empty = document.getElementById('lecturerDeclarationEmpty');
  const namHoc = document.getElementById('namHocXem')?.value;
  if (!frame || !empty) return;

  if (!idUser || !namHoc) {
    frame.hidden = true;
    frame.removeAttribute('src');
    empty.hidden = false;
    return;
  }

  const route = isForecastStats ? '/v2/vuotgio/ca-nhan-du-kien' : '/v2/vuotgio/ca-nhan-sau-luu';
  frame.src = `${route}?idUser=${encodeURIComponent(idUser)}&namHoc=${encodeURIComponent(namHoc)}&embed=1`;
  frame.hidden = false;
  empty.hidden = true;
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
  const route = isForecastStats
    ? '/v2/vuotgio/thong-ke-du-kien/ca-nhan'
    : '/v2/vuotgio/thong-ke-ca-nhan';
  window.location.href = `${route}?namHoc=${encodeURIComponent(namHoc)}&khoa=${maKhoa}`;
}

function previewDepartment(maKhoa, tenKhoa) {
  const namHoc = document.getElementById('namHocXem')?.value;
  if (!namHoc) {
    Swal.fire('Thông báo', 'Vui lòng chọn năm học', 'warning');
    return;
  }

  const previewLabel = tenKhoa || decodeURIComponent(maKhoa || '');
  Swal.showLoading();

  const forecastParam = isForecastStats ? '&isDuKien=true' : '';
  fetch(`/v2/vuotgio/tong-hop/preview-khoa/${maKhoa}?namHoc=${encodeURIComponent(namHoc)}${forecastParam}`)
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
