/**
 * Tổng hợp theo Giảng viên - Bảng Rút Gọn
 * VuotGio V2 - Hiển thị bảng tóm tắt chỉ với các cột quan trọng nhất
 * 
 * Sử dụng chung globalData từ giangVien.js
 * Cần load SAU giangVien.js
 */

(function () {
    'use strict';

    let isCompactMode = false;

    // ==================== COMPACT TABLE STRUCTURE ====================

    /**
     * Cấu trúc bảng rút gọn:
     * STT | Họ tên GV | Khoa | Định mức phải giảng | Tổng tiết cả năm | Tổng vượt giờ | Mức TT chuẩn | Tổng thành tiền | Thực nhận
     */

    const COMPACT_COLUMNS = [
        { key: 'stt', label: 'STT', width: '40px', cls: 's-base' },
        { key: 'hoTen', label: 'Họ tên Giảng viên', width: '200px', cls: 's-base', align: 'left' },
        { key: 'khoa', label: 'Khoa', width: '120px', cls: 's-base', align: 'left' },
        { key: 'dinhMuc', label: 'Định mức phải giảng', width: '80px', cls: 's-base' },
        { key: 'tongCaNam', label: 'Tổng tiết cả năm', width: '90px', cls: 's-teaching' },
        { key: 'vuotVN', label: 'Vượt VN', width: '70px', cls: 's-over-sub' },
        { key: 'vuotLao', label: 'Vượt Lào', width: '70px', cls: 's-over-sub' },
        { key: 'vuotCuba', label: 'Vượt Cuba', width: '70px', cls: 's-over-sub' },
        { key: 'vuotCPC', label: 'Vượt CPC', width: '70px', cls: 's-over-sub' },
        { key: 'vuotDongHP', label: 'Vượt Đóng HP', width: '70px', cls: 's-over-sub' },
        { key: 'vuotTong', label: 'Tổng vượt giờ', width: '90px', cls: 's-over' },
        { key: 'mucTT', label: 'Mức TT chuẩn', width: '90px', cls: 's-rate' },
        { key: 'tongTien', label: 'Tổng thành tiền', width: '110px', cls: 's-money' },
        { key: 'thucNhan', label: 'Thực nhận', width: '110px', cls: 's-net' },
    ];

    // ==================== UI CREATION ====================

    /**
     * Tạo nút toggle giữa bảng đầy đủ và bảng rút gọn
     */
    function createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'btnToggleCompact';
        btn.className = 'btn btn-outline-secondary';
        btn.style.cssText = 'height: 45px; margin: 0; margin-left: 5px;';
        btn.innerHTML = '<i class="bi bi-table me-1"></i> Bảng rút gọn';
        btn.title = 'Chuyển đổi giữa bảng đầy đủ và bảng rút gọn';
        btn.addEventListener('click', toggleCompactMode);
        return btn;
    }

    /**
     * Tạo container cho bảng rút gọn
     */
    function createCompactContainer() {
        const container = document.createElement('div');
        container.id = 'compactTableContainer';
        container.style.display = 'none';
        container.innerHTML = `
            <div style="overflow-x: auto;">
                <table class="table table-hover table-bordered text-center" id="compactTable">
                    <thead id="compactTableHead"></thead>
                    <tbody id="compactTableBody"></tbody>
                    <tfoot id="compactTableFoot"></tfoot>
                </table>
            </div>
        `;
        return container;
    }

    // ==================== TOGGLE LOGIC ====================

    function toggleCompactMode() {
        isCompactMode = !isCompactMode;

        const fullTable = document.getElementById('renderInfo');
        const compactContainer = document.getElementById('compactTableContainer');
        const btn = document.getElementById('btnToggleCompact');

        if (isCompactMode) {
            fullTable.style.display = 'none';
            compactContainer.style.display = 'block';
            btn.innerHTML = '<i class="bi bi-table me-1"></i> Bảng đầy đủ';
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-outline-primary');
            renderCompactTable(globalData);
        } else {
            fullTable.style.display = '';
            compactContainer.style.display = 'none';
            btn.innerHTML = '<i class="bi bi-table me-1"></i> Bảng rút gọn';
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-outline-secondary');
        }
    }

    // ==================== COMPACT TABLE RENDERING ====================

    function renderCompactTable(data) {
        if (!data || data.length === 0) return;

        renderCompactHeader();
        renderCompactBody(data);
        renderCompactFooter(data);
    }

    function renderCompactHeader() {
        const thead = document.getElementById('compactTableHead');
        thead.innerHTML = '';

        const tr = document.createElement('tr');
        COMPACT_COLUMNS.forEach(col => {
            const th = document.createElement('th');
            th.className = col.cls;
            th.style.width = col.width;
            th.textContent = col.label;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
    }

    function renderCompactBody(data) {
        const tbody = document.getElementById('compactTableBody');
        tbody.innerHTML = '';

        let stt = 1;
        let lastKhoa = null;

        data.forEach((row) => {
            // Dòng tiêu đề nhóm khoa
            if (row.khoa !== lastKhoa) {
                const groupRow = document.createElement('tr');
                groupRow.className = 'group-header table-light fw-bold';
                groupRow.innerHTML = `
                    <td colspan="${COMPACT_COLUMNS.length}" class="text-start px-3 py-2">
                        <i class="fas fa-university me-2"></i> ${row.khoa || 'Khác'}
                    </td>
                `;
                tbody.appendChild(groupRow);
                lastKhoa = row.khoa;
            }

            const bd = row.breakdown || emptyBreakdownCompact();
            const mucTT = bd.mucTT || 0;
            const thucNhan = bd.thucNhan || 0;

            // Tổng tiết cả năm = tổng tất cả loại trong year
            const tongCaNam = (bd.year.vn || 0) + (bd.year.lao || 0) + (bd.year.cuba || 0) + (bd.year.cpc || 0) + (bd.year.dongHP || 0);

            const tr = document.createElement('tr');
            tr.setAttribute('data-khoa', row.khoa || '');

            if (row.thieuTietGiangDay > 0) {
                tr.classList.add('row-warning-danger');
            }

            // Highlight nếu có vượt giờ
            const vuotTong = bd.vuot.total || 0;
            if (vuotTong > 0) {
                tr.classList.add('highlight-vuotgio');
            }

            tr.innerHTML = `
                <td>${stt++}</td>
                <td style="text-align: left; padding-left: 8px; white-space: nowrap;">${row.giangVien || ''}</td>
                <td style="text-align: left; padding-left: 8px; font-size: 0.7rem;">${row.khoa || ''}</td>
                <td>${formatNumberCompact(row.dinhMucSauMienGiam)}</td>
                <td>${formatNumberCompact(tongCaNam)}</td>
                <td class="${bd.vuot.vn > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.vn)}</td>
                <td class="${bd.vuot.lao > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.lao)}</td>
                <td class="${bd.vuot.cuba > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.cuba)}</td>
                <td class="${bd.vuot.cpc > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.cpc)}</td>
                <td class="${bd.vuot.dongHP > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.dongHP)}</td>
                <td style="font-weight: 700; color: #059669;">${formatNumberCompact(vuotTong)}</td>
                <td>${formatNumberCompact(mucTT)}</td>
                <td style="font-weight: 600;">${formatNumberCompact(bd.money.total)}</td>
                <td style="font-weight: 700; color: #1a5276;">${formatNumberCompact(thucNhan)}</td>
            `;

            tbody.appendChild(tr);
        });
    }

    function renderCompactFooter(data) {
        const tfoot = document.getElementById('compactTableFoot');
        tfoot.innerHTML = '';

        // Tính tổng
        let totals = {
            dinhMuc: 0, tongCaNam: 0,
            vuotVN: 0, vuotLao: 0, vuotCuba: 0, vuotCPC: 0, vuotDongHP: 0, vuotTong: 0,
            tongTien: 0, thucNhan: 0
        };

        data.forEach(row => {
            const bd = row.breakdown || emptyBreakdownCompact();
            totals.dinhMuc += row.dinhMucSauMienGiam || 0;
            totals.tongCaNam += (bd.year.vn || 0) + (bd.year.lao || 0) + (bd.year.cuba || 0) + (bd.year.cpc || 0) + (bd.year.dongHP || 0);
            totals.vuotVN += bd.vuot.vn || 0;
            totals.vuotLao += bd.vuot.lao || 0;
            totals.vuotCuba += bd.vuot.cuba || 0;
            totals.vuotCPC += bd.vuot.cpc || 0;
            totals.vuotDongHP += bd.vuot.dongHP || 0;
            totals.vuotTong += bd.vuot.total || 0;
            totals.tongTien += bd.money.total || 0;
            totals.thucNhan += bd.thucNhan || 0;
        });

        const tr = document.createElement('tr');
        tr.style.fontWeight = 'bold';
        tr.style.backgroundColor = '#e9ecef';
        tr.innerHTML = `
            <td colspan="3" style="text-align: center;">TỔNG CỘNG</td>
            <td>${formatNumberCompact(totals.dinhMuc)}</td>
            <td>${formatNumberCompact(totals.tongCaNam)}</td>
            <td>${formatNumberCompact(totals.vuotVN)}</td>
            <td>${formatNumberCompact(totals.vuotLao)}</td>
            <td>${formatNumberCompact(totals.vuotCuba)}</td>
            <td>${formatNumberCompact(totals.vuotCPC)}</td>
            <td>${formatNumberCompact(totals.vuotDongHP)}</td>
            <td>${formatNumberCompact(totals.vuotTong)}</td>
            <td></td>
            <td>${formatNumberCompact(totals.tongTien)}</td>
            <td>${formatNumberCompact(totals.thucNhan)}</td>
        `;
        tfoot.appendChild(tr);
    }

    // ==================== HELPERS ====================

    function formatNumberCompact(val) {
        if (val === null || val === undefined || val === 0) return '0';
        return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function emptyBreakdownCompact() {
        return {
            hk1: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            hk2: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            year: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            vuot: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            money: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            thucNhan: 0,
            mucTT: 0,
        };
    }

    // ==================== FILTER SUPPORT ====================

    /**
     * Lọc bảng rút gọn theo tên giảng viên (đồng bộ với filter bảng chính)
     */
    function filterCompactTable() {
        if (!isCompactMode) return;

        const keyword = (document.getElementById('filterGiangVien').value || '').toLowerCase().trim();
        const tbody = document.getElementById('compactTableBody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.classList.contains('group-header')) {
                // Ẩn/hiện group header dựa trên có row con nào visible không
                row.style.display = '';
                return;
            }
            const nameCell = row.cells[1];
            if (!nameCell) return;

            const name = nameCell.textContent.toLowerCase();
            row.style.display = (!keyword || name.includes(keyword)) ? '' : 'none';
        });

        // Ẩn group header nếu không có row con nào visible
        let currentGroup = null;
        let hasVisibleChild = false;
        rows.forEach(row => {
            if (row.classList.contains('group-header')) {
                // Xử lý group trước đó
                if (currentGroup && !hasVisibleChild) {
                    currentGroup.style.display = 'none';
                }
                currentGroup = row;
                hasVisibleChild = false;
            } else {
                if (row.style.display !== 'none') {
                    hasVisibleChild = true;
                }
            }
        });
        // Xử lý group cuối cùng
        if (currentGroup && !hasVisibleChild) {
            currentGroup.style.display = 'none';
        }
    }

    // ==================== INITIALIZATION ====================

    function init() {
        // Chèn nút toggle vào controls-container (sau nút "Thống kê khoa")
        const btnSwitchToKhoa = document.getElementById('btnSwitchToKhoa');
        if (btnSwitchToKhoa) {
            const toggleBtn = createToggleButton();
            btnSwitchToKhoa.parentNode.insertBefore(toggleBtn, btnSwitchToKhoa.nextSibling);
        }

        // Chèn container bảng rút gọn sau #renderInfo
        const renderInfo = document.getElementById('renderInfo');
        if (renderInfo) {
            const compactContainer = createCompactContainer();
            renderInfo.parentNode.insertBefore(compactContainer, renderInfo.nextSibling);
        }

        // Lắng nghe sự kiện filter để đồng bộ với bảng rút gọn
        const filterInput = document.getElementById('filterGiangVien');
        if (filterInput) {
            filterInput.addEventListener('input', filterCompactTable);
        }

        // Hook vào loadData: khi bảng chính render xong, cập nhật bảng rút gọn nếu đang ở compact mode
        const originalRenderTable = window.renderTable;
        if (typeof originalRenderTable === 'function') {
            window.renderTable = function (data) {
                originalRenderTable(data);
                if (isCompactMode) {
                    renderCompactTable(data);
                }
            };
        }

        // Expose để có thể gọi từ bên ngoài nếu cần
        window.toggleCompactMode = toggleCompactMode;
        window.renderCompactTable = renderCompactTable;
    }

    // Khởi tạo khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
