/**
 * Tổng hợp theo Giảng viên - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server
let previewPdfObjectUrl = null;

const REQUIRED_FIELDS = [
    "id_User",
    "giangVien",
    "maKhoa",
    "dinhMucChuan",
    "dinhMucSauMienGiam",
    "thieuNCKH",
    "thanhToan",
    "tableF"
];

const logMissingFields = (rows, context) => {
    const missingMap = new Map();
    const maxSamples = 20;
    let sampleCount = 0;

    rows.forEach((row, index) => {
        const missing = REQUIRED_FIELDS.filter((key) => {
            const value = row?.[key];
            if (value === null || value === undefined) return true;
            if (key === "tableF" && !value?.rows) return true;
            if (typeof value === "number" && Number.isNaN(value)) return true;
            return false;
        });

        if (missing.length) {
            missing.forEach((key) => {
                missingMap.set(key, (missingMap.get(key) || 0) + 1);
            });

            if (sampleCount < maxSamples) {
                console.warn("[tongHopGV] Missing fields", {
                    context,
                    index,
                    id_User: row?.id_User,
                    giangVien: row?.giangVien,
                    missing
                });
                sampleCount += 1;
            }
        }
    });

    if (missingMap.size) {
        const summary = Array.from(missingMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => ({ key, count }));
        console.warn("[tongHopGV] Missing fields summary", { context, summary });
    } else {
        console.info("[tongHopGV] Missing fields summary", { context, summary: [] });
    }
};

const logFirstRowDetails = (rows, context) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        console.info("[tongHopGV] First row details", { context, message: "no rows" });
        return;
    }

    const firstRow = rows[0];
    console.info("[tongHopGV] First row raw data", { context, row: firstRow });
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[tongHopGV] DOMContentLoaded - HTML Table Version');

    // Load dropdowns và tự động nạp dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions()
    ]);

    loadData();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportExcel);
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);

    // Chuyển sang thống kê Khoa
    const btnSwitchToKhoa = document.getElementById('btnSwitchToKhoa');
    if (btnSwitchToKhoa) {
        btnSwitchToKhoa.addEventListener('click', () => {
            const namHoc = document.getElementById('namHocXem').value;
            window.location.href = `/v2/vuotgio/thong-ke-khoa?namHoc=${encodeURIComponent(namHoc)}`;
        });
    }

    // Toggle Summary
    const btnToggleSummary = document.getElementById('btnToggleSummary');
    if (btnToggleSummary) {
        btnToggleSummary.addEventListener('click', () => {
            document.getElementById('summaryBox').classList.toggle('collapsed');
            const icon = btnToggleSummary.querySelector('i');
            if (icon.classList.contains('bi-chevron-down')) {
                icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
            } else {
                icon.classList.replace('bi-chevron-up', 'bi-chevron-down');
            }
        });
    }
});

// ==================== DATA LOADING ====================

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[tongHopGV] loadNamHocOptions called');
    const urlNamHoc = new URLSearchParams(window.location.search).get('namHoc');
    
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        console.log('[tongHopGV] NamHoc data:', data);

        const select = document.getElementById('namHocXem');
        select.innerHTML = '';
        data.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = item.NamHoc;
            option.textContent = item.NamHoc;
            
            // Ưu tiên chọn năm học từ URL
            if (urlNamHoc && item.NamHoc === urlNamHoc) {
                option.selected = true;
            } else if (!urlNamHoc && (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1)))) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Sau khi load xong năm học, load dữ liệu
        loadData();
    } catch (error) {
        console.error('Error loading nam hoc:', error);
        const currentYear = new Date().getFullYear();
        const select = document.getElementById('namHocXem');
        select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    console.log('[tongHopGV] loadKhoaOptions called');
    const urlKhoa = new URLSearchParams(window.location.search).get('khoa');

    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        console.log('[tongHopGV] Khoa data:', data);

        const select = document.getElementById('khoaXem');
        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            
            // Ưu tiên chọn khoa từ URL
            if (urlKhoa && dept.MaPhongBan === urlKhoa) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// ==================== FORMAT HELPERS ====================

// Format number
function formatNumber(val) {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ==================== SKELETON LOADING ====================

function showSkeletonRows() {
    const body = document.getElementById('tableBody');
    if (!body) return;
    body.innerHTML = Array.from({ length: 5 })
        .map(() => `<tr class="skeleton-row"><td colspan="37">&nbsp;</td></tr>`)
        .join('');
}

function clearSkeletonRows() {
    const body = document.getElementById('tableBody');
    if (body) {
        body.innerHTML =
            '<tr><td colspan="37" class="text-center text-muted py-4">Không có dữ liệu</td></tr>';
    }
}

// ==================== LOAD DATA ====================

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;

    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    showSkeletonRows();

    try {
        Swal.showLoading();

        // Tài chính duyệt vượt giờ phải xem dữ liệu CHÍNH THỨC (đã lưu)
        const url = `/v2/vuotgio/tong-hop/giang-vien?namHoc=${namHoc}&khoa=${khoa}&detail=1&isDuKien=false`;

        console.info('[tongHopGV] loadData request - CHÍNH THỨC (đã lưu)', { namHoc, khoa, isDuKien: false, url });
        const response = await fetch(url);
        const result = await response.json();
        Swal.close();

        console.info('[tongHopGV] loadData response', {
            status: response.status,
            ok: response.ok,
            success: result?.success,
            message: result?.message,
            dataType: Array.isArray(result?.data) ? 'array' : typeof result?.data,
            dataCount: Array.isArray(result?.data) ? result.data.length : null
        });

        if (!result.success) {
            Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu', 'error');
            clearSkeletonRows();
            return;
        }

        let data = result.data || [];

        globalData = data;
        console.info('[tongHopGV] loadData final', {
            count: data.length,
            sample: data.slice(0, 3)
        });

        logMissingFields(data, { namHoc, khoa });
        logFirstRowDetails(data, { namHoc, khoa });
        renderTable(globalData);
        updateSummary(globalData);


        if (data.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu', 'info');
        }
    } catch (error) {
        Swal.close();
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
        clearSkeletonRows();
    }
}


// ==================== TABLE RENDERING ====================

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    const tableFoot = document.getElementById('tableFoot');
    tableBody.innerHTML = '';
    tableFoot.innerHTML = '';

    let STT = 1;

    // Initialize totals for all columns
    let totals = {
        dinhMucChuan: 0, mienGiam: 0, thieuNCKH: 0, dinhMucSauGiamTru: 0,
        hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
        hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
        year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0,
        vuot_vn: 0, vuot_lao: 0, vuot_cuba: 0, vuot_cpc: 0, vuot_dongHP: 0, vuot_tong: 0,
        mucTT: 0,
        tien_vn: 0, tien_lao: 0, tien_cuba: 0, tien_cpc: 0, tien_dongHP: 0, tien_tong: 0,
        thucNhan: 0,
        luong: 0
    };

    let lastKhoa = null;

    data.forEach((row, index) => {
        if (index < 5) console.log(`[renderTable] Row ${index}:`, row);
        // Thêm dòng tiêu đề nhóm nếu khoa thay đổi
        if (row.khoa !== lastKhoa) {
            const groupRow = document.createElement('tr');
            groupRow.className = 'group-header table-light fw-bold';
            groupRow.setAttribute('data-khoa-code', row.maKhoa || row.khoa || '');
            groupRow.innerHTML = `
                <td colspan="37" class="text-start px-3 py-2">
                    <i class="fas fa-university me-2"></i> ${row.khoa || 'Khác'}
                </td>
            `;
            tableBody.appendChild(groupRow);
            lastKhoa = row.khoa;
        }

        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-index', index);
        tableRow.setAttribute('data-khoa', row.khoa || ''); // Phục vụ filter

        if (row.thieuTietGiangDay > 0) {
            tableRow.classList.add('row-warning-danger');
        }

        // Ưu tiên dùng breakdown đã tính sẵn từ Backend (single source of truth).
        // Fallback: tự tính nếu là snapshot cũ chưa có breakdown.
        const bd = row.breakdown || emptyBreakdown();

        const mucTT  = bd.mucTT || 0;
        const thucNhan = bd.thucNhan || 0;

        tableRow.innerHTML = `
            <td>${STT++}</td>
            <td style="text-align: left; padding-left: 8px;">${row.giangVien || ''}</td>
            <td>${formatNumber(row.luong)}</td>
            <td>${formatNumber(row.dinhMucChuan)}</td>
            <td>${formatNumber(row.mienGiam)}</td>
            <td class="${row.thieuNCKH > 0 ? 'text-danger-bold' : ''}">${formatNumber(row.thieuNCKH)}</td>
            <td>${formatNumber(row.dinhMucSauMienGiam)}</td>

            <!-- HK1 -->
            <td>${formatNumber(bd.hk1.vn)}</td>
            <td>${formatNumber(bd.hk1.lao)}</td>
            <td>${formatNumber(bd.hk1.cuba)}</td>
            <td>${formatNumber(bd.hk1.cpc)}</td>
            <td>${formatNumber(bd.hk1.dongHP)}</td>

            <!-- HK2 -->
            <td>${formatNumber(bd.hk2.vn)}</td>
            <td>${formatNumber(bd.hk2.lao)}</td>
            <td>${formatNumber(bd.hk2.cuba)}</td>
            <td>${formatNumber(bd.hk2.cpc)}</td>
            <td>${formatNumber(bd.hk2.dongHP)}</td>

            <!-- Cả năm -->
            <td>${formatNumber(bd.year.vn)}</td>
            <td>${formatNumber(bd.year.lao)}</td>
            <td>${formatNumber(bd.year.cuba)}</td>
            <td>${formatNumber(bd.year.cpc)}</td>
            <td>${formatNumber(bd.year.dongHP)}</td>

            <!-- Vượt giờ -->
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.vn)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.lao)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.cuba)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.cpc)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.dongHP)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.total)}</td>

            <!-- Mức TT -->
            <td>${formatNumber(mucTT)}</td>

            <!-- Thành tiền -->
            <td>${formatNumber(bd.money.vn)}</td>
            <td>${formatNumber(bd.money.lao)}</td>
            <td>${formatNumber(bd.money.cuba)}</td>
            <td>${formatNumber(bd.money.cpc)}</td>
            <td>${formatNumber(bd.money.dongHP)}</td>
            <td style="font-weight: bold;">${formatNumber(bd.money.total)}</td>

            <!-- Thực nhận -->
            <td style="font-weight: bold; color: #1a5276;">${formatNumber(thucNhan)}</td>

            <!-- Actions -->
            <td>
                <div class="btn-group gap-1" role="group">
                    <button class="btn btn-sm" style="background-color: #ffffff; color: #0ea5e9; border: 1px solid #0ea5e9; font-weight: bold;" onclick="openPersonalView('${row.id_User}', '${row.giangVien}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(tableRow);

        // Accumulate totals
        totals.luong            += row.luong || 0;
        totals.dinhMucChuan     += row.dinhMucChuan || 0;
        totals.mienGiam         += row.mienGiam || 0;
        totals.thieuNCKH        += row.thieuNCKH || 0;
        totals.dinhMucSauGiamTru += row.dinhMucSauMienGiam || 0;
        totals.hk1_vn     += bd.hk1.vn;    totals.hk1_lao    += bd.hk1.lao;
        totals.hk1_cuba   += bd.hk1.cuba;  totals.hk1_cpc    += bd.hk1.cpc;
        totals.hk1_dongHP += bd.hk1.dongHP;
        totals.hk2_vn     += bd.hk2.vn;    totals.hk2_lao    += bd.hk2.lao;
        totals.hk2_cuba   += bd.hk2.cuba;  totals.hk2_cpc    += bd.hk2.cpc;
        totals.hk2_dongHP += bd.hk2.dongHP;
        totals.year_vn    += bd.year.vn;   totals.year_lao   += bd.year.lao;
        totals.year_cuba  += bd.year.cuba; totals.year_cpc   += bd.year.cpc;
        totals.year_dongHP += bd.year.dongHP;
        totals.vuot_vn    += bd.vuot.vn;   totals.vuot_lao   += bd.vuot.lao;
        totals.vuot_cuba  += bd.vuot.cuba; totals.vuot_cpc   += bd.vuot.cpc;
        totals.vuot_dongHP += bd.vuot.dongHP; totals.vuot_tong += bd.vuot.total;
        totals.tien_vn    += bd.money.vn;  totals.tien_lao   += bd.money.lao;
        totals.tien_cuba  += bd.money.cuba; totals.tien_cpc  += bd.money.cpc;
        totals.tien_dongHP += bd.money.dongHP; totals.tien_tong += bd.money.total;
        totals.thucNhan   += thucNhan;
    });

    // Render footer
    renderFooter(totals);
}

/**
 * Fallback: tự tính breakdown cho dữ liệu snapshot cũ không có sẵn breakdown từ server.
 * Cấu trúc trả về giống hệt computeSdoBreakdown() ở backend.
 */
function emptyBreakdown() {
    return {
        hk1:  { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        hk2:  { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        year: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        vuot: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        money: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        thucNhan: 0,
        mucTT: 0,
    };
}

/**
 * Render footer with totals
 */
function renderFooter(totals) {
    const tableFoot = document.getElementById('tableFoot');
    tableFoot.innerHTML = '';
    
    const footRow = document.createElement('tr');
    footRow.style.fontWeight = 'bold';
    footRow.style.backgroundColor = '#e9ecef';

    footRow.innerHTML = `
        <td colspan="2" style="text-align: center;">TỔNG CỘNG</td>
        <td>${formatNumber(totals.luong)}</td>
        <td>${formatNumber(totals.dinhMucChuan)}</td>
        <td>${formatNumber(totals.mienGiam)}</td>
        <td>${formatNumber(totals.thieuNCKH)}</td>
        <td>${formatNumber(totals.dinhMucSauGiamTru)}</td>
        
        <!-- HK1 -->
        <td>${formatNumber(totals.hk1_vn)}</td>
        <td>${formatNumber(totals.hk1_lao)}</td>
        <td>${formatNumber(totals.hk1_cuba)}</td>
        <td>${formatNumber(totals.hk1_cpc)}</td>
        <td>${formatNumber(totals.hk1_dongHP)}</td>
        
        <!-- HK2 -->
        <td>${formatNumber(totals.hk2_vn)}</td>
        <td>${formatNumber(totals.hk2_lao)}</td>
        <td>${formatNumber(totals.hk2_cuba)}</td>
        <td>${formatNumber(totals.hk2_cpc)}</td>
        <td>${formatNumber(totals.hk2_dongHP)}</td>
        
        <!-- Cả năm -->
        <td>${formatNumber(totals.year_vn)}</td>
        <td>${formatNumber(totals.year_lao)}</td>
        <td>${formatNumber(totals.year_cuba)}</td>
        <td>${formatNumber(totals.year_cpc)}</td>
        <td>${formatNumber(totals.year_dongHP)}</td>
        
        <!-- Vượt giờ -->
        <td>${formatNumber(totals.vuot_vn)}</td>
        <td>${formatNumber(totals.vuot_lao)}</td>
        <td>${formatNumber(totals.vuot_cuba)}</td>
        <td>${formatNumber(totals.vuot_cpc)}</td>
        <td>${formatNumber(totals.vuot_dongHP)}</td>
        <td>${formatNumber(totals.vuot_tong)}</td>
        
        <!-- Mức TT -->
        <td></td>
        
        <!-- Thành tiền -->
        <td>${formatNumber(totals.tien_vn)}</td>
        <td>${formatNumber(totals.tien_lao)}</td>
        <td>${formatNumber(totals.tien_cuba)}</td>
        <td>${formatNumber(totals.tien_cpc)}</td>
        <td>${formatNumber(totals.tien_dongHP)}</td>
        <td>${formatNumber(totals.tien_tong)}</td>
        
        <!-- Thực nhận -->
        <td>${formatNumber(totals.thucNhan)}</td>
        
        <!-- Actions -->
        <td></td>
    `;

    tableFoot.appendChild(footRow);
}



// ==================== UPDATE SUMMARY ====================

function updateSummary(data) {
    const totalGV = data.length;
    const totalVuotGio = data.reduce((sum, r) => sum + (r.thanhToan || 0), 0);
    const gvCoVuotGio = data.filter(r => (r.thanhToan || 0) > 0).length;

    const elTotalGV = document.getElementById('totalGV');
    const elTotalVuotGio = document.getElementById('totalVuotGio');
    const elGvCoVuotGio = document.getElementById('gvCoVuotGio');

    if (elTotalGV) elTotalGV.textContent = totalGV;
    if (elTotalVuotGio) elTotalVuotGio.textContent = formatNumber(totalVuotGio);
    if (elGvCoVuotGio) elGvCoVuotGio.textContent = gvCoVuotGio;

    // Show the summary box once data is loaded
    const summaryBox = document.getElementById('summaryBox');
    if (summaryBox) summaryBox.style.display = '';
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    
    // 1. Lọc dữ liệu từ globalData
    const filteredData = globalData.filter(row => {
        const hoTen = (row.giangVien || '').toLowerCase();
        return hoTen.includes(gvFilter);
    });

    console.log('[filterTable] Thông tin user theo bộ lọc:', filteredData.map(u => ({
        id_User: u.id_User,
        giangVien: u.giangVien,
        khoa: u.khoa,
        maKhoa: u.maKhoa
    })));

    // 2. Render lại toàn bộ bảng dựa trên dữ liệu đã lọc
    // Việc gọi renderTable sẽ tự động xử lý lại STT và Group Header cho Khoa
    renderTable(filteredData);

    // 3. Cập nhật Summary box
    updateSummary(filteredData);
}

// Remove old updateFooterTotals function as it's replaced by renderFooter

// ==================== EXCEL PREVIEW (PDF) & BẢNG KÊ WEB ====================

function openPersonalView(maGV, hoTen) {
    const namHoc = document.getElementById('namHocXem').value;
    // Trang "Tài chính duyệt" xem dữ liệu chính thức để thanh toán
    const url = `/v2/vuotgio/ca-nhan-chinh-thuc?idUser=${encodeURIComponent(maGV)}&namHoc=${encodeURIComponent(namHoc)}`;
    console.info('[vuotgio_v2.taiChinhDuyet] click', { giangVien: hoTen, maGV, namHoc, url });
    window.open(url, '_blank');
}



// ==================== EXPORT EXCEL ====================

// function exportExcel() {
//     if (globalData.length === 0) {
//         Swal.fire('Thông báo', 'Không có dữ liệu để xuất', 'info');
//         return;
//     }

//     const namHoc = document.getElementById('namHocXem').value;
//     const khoa = document.getElementById('khoaXem').value;

//     // Create CSV content
//     let csvContent = '\uFEFF'; // BOM for UTF-8
//     csvContent += 'STT,Mã GV,Họ tên,Khoa,Chức danh,Thực hiện,Định mức,Thiếu NCKH,Vượt giờ\n';

//     globalData.forEach((row, index) => {
//         csvContent += `${index + 1},"${row.MaGV || ''}","${row.HoTen || ''}","${row.MaKhoa || ''}","${row.ChucDanh || ''}",${row.SoTietThucHien || 0},${row.SoTietDinhMuc || 0},${row.SoTietThieuNCKH || 0},${row.SoTietVuotGio || 0}\n`;
//     });

//     // Download
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `TongHopVuotGio_${namHoc}_${khoa}.csv`;
//     link.click();
// }




