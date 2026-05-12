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

    // Snapshot actions
    document.getElementById('chotDuLieuBtn').addEventListener('click', chotDuLieu);
    document.getElementById('versionSelect').addEventListener('change', loadData);
    document.getElementById('namHocXem').addEventListener('change', loadHistory);

    // Chuyển sang thống kê Khoa
    const btnSwitchToKhoa = document.getElementById('btnSwitchToKhoa');
    if (btnSwitchToKhoa) {
        btnSwitchToKhoa.addEventListener('click', () => {
            const namHoc = document.getElementById('namHocXem').value;
            window.location.href = `/v2/vuotgio/tong-hop-khoa?namHoc=${encodeURIComponent(namHoc)}`;
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

        // Sau khi load xong năm học, load lịch sử chốt
        loadHistory();
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

// ==================== LOAD DATA ====================

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    const version = document.getElementById('versionSelect').value;

    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        let url = '';
        if (version === 'LIVE') {
            url = `/v2/vuotgio/tong-hop/giang-vien?namHoc=${namHoc}&khoa=${khoa}&detail=1`;
        } else {
            url = `/v2/vuotgio/tong-hop/snapshot-data?namHoc=${namHoc}&version=${version}`;
        }

        console.info('[tongHopGV] loadData request', { namHoc, khoa, version, url });
        const response = await fetch(url);
        const result = await response.json();

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
            return;
        }

        let data = result.data || [];

        // Nếu là snapshot, chúng ta vẫn cần filter theo khoa ở client nếu API snapshot chưa filter
        if (version !== 'LIVE' && khoa !== 'ALL') {
            data = data.filter(r => r.maKhoa === khoa);
        }

        globalData = data;
        console.info('[tongHopGV] loadData final', {
            count: data.length,
            sample: data.slice(0, 3)
        });

        logMissingFields(data, { namHoc, khoa, version });
        logFirstRowDetails(data, { namHoc, khoa, version });
        renderTable(globalData);
        updateSummary(globalData);


        if (data.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu', 'info');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
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
        const bd = row.breakdown || getBdFallback(row);

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
                <button class="btn btn-sm btn-success" onclick="previewExcel('${row.id_User}', '${row.giangVien}')" title="Xem preview Excel">
                    <i class="fas fa-file-excel"></i>
                </button>
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
function getBdFallback(row) {
    const GROUPS = ['vn', 'lao', 'cuba', 'cpc', 'dongHP'];
    const RATE = 100000;

    const raw = parseTrainingSystemBreakdown(row.tableF);
    const vuot = distributeOvertimeProportionally(raw, row.thanhToan || 0);

    const money = {};
    let moneyTotal = 0;
    GROUPS.forEach(g => {
        money[g] = Number(Number((vuot[`vuot_${g}`] || 0) * RATE).toFixed(2));
        moneyTotal += money[g];
    });

    const sum = (prefix) => GROUPS.reduce((s, g) => s + (raw[`${prefix}_${g}`] || 0), 0);

    return {
        hk1:  { vn: raw.hk1_vn,  lao: raw.hk1_lao,  cuba: raw.hk1_cuba,  cpc: raw.hk1_cpc,  dongHP: raw.hk1_dongHP,  total: sum('hk1') },
        hk2:  { vn: raw.hk2_vn,  lao: raw.hk2_lao,  cuba: raw.hk2_cuba,  cpc: raw.hk2_cpc,  dongHP: raw.hk2_dongHP,  total: sum('hk2') },
        year: { vn: raw.year_vn, lao: raw.year_lao, cuba: raw.year_cuba, cpc: raw.year_cpc, dongHP: raw.year_dongHP, total: sum('year') },
        vuot: { vn: vuot.vuot_vn, lao: vuot.vuot_lao, cuba: vuot.vuot_cuba, cpc: vuot.vuot_cpc, dongHP: vuot.vuot_dongHP, total: Number(Number(row.thanhToan || 0).toFixed(2)) },
        money: { ...money, total: Number(moneyTotal.toFixed(2)) },
        thucNhan: Number(moneyTotal.toFixed(2)),
        mucTT: RATE,
    };
}


/**
 * Parse tableF data to extract training system breakdown
 */
function parseTrainingSystemBreakdown(tableF) {
    const breakdown = {
        hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
        hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
        year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0
    };

    if (!tableF || !tableF.rows) return breakdown;

    tableF.rows.forEach(row => {
        const doiTuong = row.doi_tuong || '';
        
        /**
         * Backend classification logic (from sdo-data.helpers.js):
         * - Check if name contains "mật mã" → isMatMa = true/false
         * - Check region: "lào" → lao, "campuchia" → campuchia, "cuba" → cuba, default → viet_nam
         * - If isMatMa = false → đóng học phí (dongHP)
         * - If isMatMa = true → use region (vn, lao, cuba, cpc for campuchia)
         */
        const classifyHeDaoTao = (tenHeDaoTao) => {
            const name = String(tenHeDaoTao || "").toLowerCase();
            const isMatMa = name.includes("mật mã");
            
            let vungMien = "viet_nam";
            if (name.includes("lào")) vungMien = "lao";
            else if (name.includes("campuchia")) vungMien = "campuchia"; 
            else if (name.includes("cuba")) vungMien = "cuba";
            
            return { isMatMa, vungMien };
        };

        // Map backend regions to frontend categories
        const regionToCategory = {
            "viet_nam": "vn",
            "lao": "lao", 
            "cuba": "cuba",
            "campuchia": "cpc"  // Campuchia maps to CPC column
        };
        
        const classification = classifyHeDaoTao(doiTuong);
        
        let category;
        if (!classification.isMatMa) {
            // Not "mật mã" → đóng học phí
            category = 'dongHP';
        } else {
            // Is "mật mã" → use region mapping
            category = regionToCategory[classification.vungMien] || 'vn';
        }

        // Đồ án & tham quan không có thông tin HK → mặc định tính vào HK1
        breakdown[`hk1_${category}`] += (row.hk1 || 0) + (row.do_an || 0) + (row.tham_quan || 0);
        breakdown[`hk2_${category}`] += row.hk2 || 0;
        breakdown[`year_${category}`] += row.tong || 0;
    });

    return breakdown;
}

/**
 * Distribute overtime hours proportionally across training systems
 */
function distributeOvertimeProportionally(breakdown, totalOvertime) {
    const yearTotal = breakdown.year_vn + breakdown.year_lao + breakdown.year_cuba + 
                     breakdown.year_cpc + breakdown.year_dongHP;
    
    if (yearTotal === 0) {
        return {
            vuot_vn: 0, vuot_lao: 0, vuot_cuba: 0, vuot_cpc: 0, vuot_dongHP: 0
        };
    }

    return {
        vuot_vn: (breakdown.year_vn / yearTotal) * totalOvertime,
        vuot_lao: (breakdown.year_lao / yearTotal) * totalOvertime,
        vuot_cuba: (breakdown.year_cuba / yearTotal) * totalOvertime,
        vuot_cpc: (breakdown.year_cpc / yearTotal) * totalOvertime,
        vuot_dongHP: (breakdown.year_dongHP / yearTotal) * totalOvertime
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

    // 2. Render lại toàn bộ bảng dựa trên dữ liệu đã lọc
    // Việc gọi renderTable sẽ tự động xử lý lại STT và Group Header cho Khoa
    renderTable(filteredData);

    // 3. Cập nhật Summary box
    updateSummary(filteredData);
}

// Remove old updateFooterTotals function as it's replaced by renderFooter

// ==================== EXCEL PREVIEW (PDF) ====================

// Preview Excel as PDF generated from xlsx + LibreOffice
async function previewExcel(maGV, hoTen) {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    const previewMode = 'pdf';

    console.info('[vuotgio_v2.preview] click', {
        giangVien: hoTen,
        maGV,
        namHoc,
        khoa,
        previewMode,
        url: `/v2/vuotgio/tong-hop/preview/${maGV}?namHoc=${namHoc}&format=${previewMode}`
    });

    Swal.showLoading();

    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/preview/${maGV}?namHoc=${namHoc}&format=${previewMode}`);
        const result = await response.json();

        console.info('[vuotgio_v2.preview] result from server:', result);

        if (result.success) {
            console.info('[vuotgio_v2.preview] intermediate data keys:', Object.keys(result.data?.intermediateJson || {}));
            if (result.data?.pdfBase64) {
                console.info('[vuotgio_v2.preview] PDF base64 received, length:', result.data.pdfBase64.length);
            }
        }

        if (!result.success) {
            Swal.close();
            Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu preview', 'error');
            return;
        }

        if (result.data?.pdfBase64) {
            renderExcelPdfPreview(result.data, hoTen, namHoc, khoa);
        } else {
            Swal.close();
            Swal.fire('Lỗi', 'Không tạo được bản PDF preview', 'error');
        }

        if (Array.isArray(result.data?.warnings) && result.data.warnings.length > 0) {
            console.warn('[preview-template] warnings:', result.data.warnings);
            Swal.fire({
                icon: 'warning',
                title: 'Lưu ý preview',
                text: result.data.warnings[0],
                timer: 3500,
                showConfirmButton: false,
            });
        }

    } catch (error) {
        Swal.close();
        console.error('Error loading excel preview:', error);
        Swal.fire('Lỗi', 'Không thể tải chi tiết', 'error');
    }
}

function renderExcelPdfPreview(serverData, hoTen, namHoc, khoa) {
    Swal.close();

    if (previewPdfObjectUrl) {
        URL.revokeObjectURL(previewPdfObjectUrl);
        previewPdfObjectUrl = null;
    }

    const pdfBytes = atob(serverData.pdfBase64);
    const byteNumbers = new Array(pdfBytes.length);
    for (let i = 0; i < pdfBytes.length; i++) {
        byteNumbers[i] = pdfBytes.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
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

    const escapedTitle = escapeHtml(`Xem trước: ${hoTen || ''}`);
    const escapedNamHoc = escapeHtml(namHoc || '');
    const escapedKhoa = escapeHtml(khoa === 'ALL' ? 'Tất cả' : (khoa || ''));
    
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
                <iframe class="viewer" src="${previewPdfObjectUrl}#toolbar=0&navpanes=0" title="Excel PDF Preview"></iframe>
            </div>
        </body>
        </html>
    `);
    previewWindow.document.close();
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
// ==================== SNAPSHOT ACTIONS ====================

// Tải lịch sử chốt
async function loadHistory() {
    const namHoc = document.getElementById('namHocXem').value;
    if (!namHoc) return;

    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/lich-su-chot?namHoc=${namHoc}`);
        const result = await response.json();

        const select = document.getElementById('versionSelect');
        // Giữ lại option LIVE
        select.innerHTML = '<option value="LIVE">Phiên bản (Live)</option>';

        if (result.success && result.data) {
            result.data.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.version;
                const date = new Date(v.ngay_chot).toLocaleString('vi-VN');
                opt.textContent = `V${v.version} - ${date} ${v.is_latest ? '(Mới nhất)' : ''}`;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Chốt dữ liệu
async function chotDuLieu() {
    const namHoc = document.getElementById('namHocXem').value;
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học trước khi chốt', 'warning');
        return;
    }

    const { value: ghiChu } = await Swal.fire({
        title: 'Chốt dữ liệu vượt giờ',
        input: 'text',
        inputLabel: 'Ghi chú cho phiên bản này',
        inputPlaceholder: 'Nhập ghi chú...',
        showCancelButton: true,
        confirmButtonText: 'Chốt ngay',
        cancelButtonText: 'Hủy'
    });

    if (ghiChu === undefined) return; // User cancelled

    try {
        Swal.showLoading();
        const response = await fetch('/v2/vuotgio/tong-hop/chot-du-lieu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ namHoc, ghiChu })
        });
        const result = await response.json();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            loadHistory(); // Tải lại dropdown
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error chotDuLieu:', error);
        Swal.fire('Lỗi', 'Không thể chốt dữ liệu', 'error');
    }
}


