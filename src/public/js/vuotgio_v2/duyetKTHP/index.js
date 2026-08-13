/**
 * Duyệt Kết Thúc Học Phần - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server
let heDaoTaoList = [];
let employeeList = [];
let currentSort = { key: null, direction: 1 };

function toViewRecord(dto) {
    if (!dto || !dto.id || !dto.activityType || !dto.employee
        || !dto.course || !dto.educationSystem || !dto.approval || !dto.detail) {
        throw new Error('API KTHP không đúng canonical contract');
    }
    return {
        id: dto.id,
        activityType: dto.activityType,
        hinhthuc: dto.displayType,
        employeeId: dto.employee.id,
        giangvien: dto.employee.name,
        khoa: dto.employee.department,
        namhoc: dto.academicYear,
        ki: dto.semester,
        dot: dto.round,
        tenhocphan: dto.course.name,
        mahocphan: dto.course.code,
        lophocphan: dto.course.className,
        sotc: dto.course.credits,
        sosv: dto.course.studentCount,
        heDaoTaoId: dto.educationSystem.id,
        doituong: dto.educationSystem.name,
        hinhthucthi: dto.examForm,
        heso: dto.coefficient,
        sotietqc: dto.standardHours,
        ghichu: dto.notes,
        khoaduyet: Number(dto.approval.departmentApproved),
        khaothiduyet: Number(dto.approval.examOfficeApproved),
        tongso: dto.detail.quantity ?? dto.detail.markedCount ?? 0,
        ngaythi: dto.detail.examDate ?? null,
        cathi: dto.detail.shift ?? null,
        thoigian: dto.detail.duration ?? null,
        phongthi: dto.detail.room ?? null,
        sobaiphach: dto.detail.markedCount ?? 0,
        vaitro: dto.detail.role ?? null,
        detail: dto.detail,
    };
}

function toFixedInput(value, decimals) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '';
    return num.toFixed(decimals);
}

function appendDetailParts(cell, parts) {
    parts.forEach(([label, value], index) => {
        if (index > 0) {
            cell.appendChild(document.createTextNode(' | '));
        }

        const labelElement = document.createElement('b');
        labelElement.textContent = `${label}:`;
        cell.appendChild(labelElement);
        cell.appendChild(document.createTextNode(` ${value ?? ''}`));
    });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('[DuyetKTHP] Init - HTML Table Version');
    
    // Load dropdowns và tự động tải dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions(),
        loadHeDaoTaoOptions(),
        loadEmployeeOptions()
    ]);
    
    loadData();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('updateApprovalBtn').addEventListener('click', submitApprovals);

    // Filter event listeners
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
    document.getElementById('filterHocPhan').addEventListener('input', filterTable);
    document.querySelectorAll('th.sortable').forEach((header) => {
        header.addEventListener('click', () => toggleSort(header.dataset.sortKey));
    });

    // Setup permission-based UI
    setupUpdateButtonVisibility();
    setupColumnVisibility();
});

// ==================== PERMISSION HELPERS ====================

function setupUpdateButtonVisibility() {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const updateBtn = document.getElementById('updateApprovalBtn');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const khaoThi = window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    // Khoa: GV_CNBM duyệt, Lãnh đạo khoa bỏ duyệt
    // Phòng (Khảo thí): Trợ lý duyệt; Lãnh đạo phòng duyệt/bỏ duyệt
    if (role === gvCnbm || role === lanhDaoKhoa) {
        updateBtn.style.display = 'flex';
    } else if (MaPhongBan === khaoThi && (role === troLyPhong || role === lanhDaoPhong)) {
        updateBtn.style.display = 'flex';
    } else if (MaPhongBan === banGiamDoc) {
        updateBtn.style.display = 'flex';
    }
}

function setupColumnVisibility() {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const khaoThi = window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    const checkAllKhoa = document.getElementById('checkAllKhoa');
    const checkAllKhaoThi = document.getElementById('checkAllKhaoThi');

    // Mặc định disable tất cả
    if (checkAllKhoa) checkAllKhoa.disabled = true;
    if (checkAllKhaoThi) checkAllKhaoThi.disabled = true;

    // Khoa: GV_CNBM duyệt; Lãnh đạo khoa duyệt/bỏ duyệt
    if (role === gvCnbm || role === lanhDaoKhoa) {
        if (checkAllKhoa) checkAllKhoa.disabled = false;
    }

    // Phòng Khảo thí: Trợ lý duyệt; Lãnh đạo phòng duyệt/bỏ duyệt
    if (MaPhongBan === khaoThi && (role === troLyPhong || role === lanhDaoPhong)) {
        if (checkAllKhaoThi) checkAllKhaoThi.disabled = false;
    }
    if (MaPhongBan === banGiamDoc) {
        if (checkAllKhoa) checkAllKhoa.disabled = false;
        if (checkAllKhaoThi) checkAllKhaoThi.disabled = false;
    }
}

/**
 * Kiểm tra quyền duyệt cho từng cột
 * @param {'khoa'|'khaoThi'} type - Loại duyệt
 * @param {'check'|'uncheck'} action - Hành động (check = duyệt, uncheck = bỏ duyệt)
 */
function canApprove(type, action, row = null) {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const khaoThi = window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    // Ban Giám đốc có toàn quyền
    if (MaPhongBan === banGiamDoc) return true;

    if (type === 'khoa') {
        if (row && (role === gvCnbm || role === lanhDaoKhoa)
            && row.khoa !== MaPhongBan) return false;
        // GV_CNBM: chỉ được duyệt (check)
        if (role === gvCnbm && action === 'check') return true;
        // Lãnh đạo khoa được duyệt và bỏ duyệt.
        if (role === lanhDaoKhoa && (action === 'check' || action === 'uncheck')) return true;
        return false;
    }

    if (type === 'khaoThi') {
        if (MaPhongBan !== khaoThi) return false;
        // Trợ lý: chỉ được duyệt (check)
        if (role === troLyPhong && action === 'check') return true;
        // Lãnh đạo phòng được duyệt và bỏ duyệt.
        if (role === lanhDaoPhong && (action === 'check' || action === 'uncheck')) return true;
        return false;
    }

    return false;
}

/**
 * Kiểm tra xem user có quyền tương tác với checkbox không (bất kể check/uncheck)
 */
function canInteract(type) {
    return canApprove(type, 'check') || canApprove(type, 'uncheck');
}

// Check if row can be edited/deleted
function canEditDelete(data) {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const khaoThi = window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    // Ban Giám đốc có toàn quyền
    if (MaPhongBan === banGiamDoc) return true;

    // Check role của Khoa
    const isKhoaUser = (role === gvCnbm || role === lanhDaoKhoa)
        && data.khoa === MaPhongBan;
    // Check role của Phòng Khảo thí
    const isKhaoThiUser = (MaPhongBan === khaoThi && (role === troLyPhong || role === lanhDaoPhong));

    if (!isKhoaUser && !isKhaoThiUser) return false;

    // Khoa chỉ sửa/xóa được khi chưa duyệt Khoa và chưa duyệt Khảo thí
    if (isKhoaUser) {
        return data.khoaduyet === 0 && data.khaothiduyet === 0;
    }

    // Khảo thí sửa/xóa được khi Khảo thí chưa duyệt
    if (isKhaoThiUser) {
        return data.khaothiduyet === 0;
    }

    return false;
}

// ==================== DATA LOADING ====================

// Load năm học
async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        
        const selects = [document.getElementById('namHocXem'), document.getElementById('editNamHoc')];
        selects.forEach(select => {
            if (!select) return;
            select.innerHTML = '';
            data.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

// Load khoa
async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        
        const khoaXem = document.getElementById('khoaXem');
        const editKhoa = document.getElementById('editKhoa');
        
        if (editKhoa) {
            editKhoa.innerHTML = '<option value="">-- Chọn Khoa --</option>';
        }
        
        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            khoaXem.appendChild(option.cloneNode(true));
            if (editKhoa) editKhoa.appendChild(option);
        });

        // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
        if (typeof KhoaFilterUtils !== 'undefined') {
            KhoaFilterUtils.applyKhoaFilter(khoaXem);
            KhoaFilterUtils.applyKhoaFilter(editKhoa);
        }
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load hệ đào tạo cho modal và bộ lọc
async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-dao-tao');
        if (!response.ok) {
            throw new Error(`Load he dao tao failed with status ${response.status}`);
        }

        const rawData = await response.json();
        const list = Array.isArray(rawData)
            ? rawData
            : (rawData && Array.isArray(rawData.data) ? rawData.data : []);

        heDaoTaoList = list
            .map((item) => ({
                id: item.id,
                value: item.he_dao_tao || item.HeDaoTao || item.value || ''
            }))
            .filter((item) => item.value);

        const editHeDaoTao = document.getElementById('editHeDaoTao');
        const filterHeDaoTao = document.getElementById('heDaoTao');

        if (editHeDaoTao) {
            editHeDaoTao.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            heDaoTaoList.forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.id);
                option.textContent = String(item.value);
                editHeDaoTao.appendChild(option);
            });
        }

        if (filterHeDaoTao) {
            filterHeDaoTao.innerHTML = '<option value="ALL">Tất cả hệ</option>';
            heDaoTaoList.forEach((item) => {
                if (item.value && item.value.toLowerCase().includes('đồ án')) return;
                const option = document.createElement('option');
                option.value = String(item.id);
                option.textContent = String(item.value);
                filterHeDaoTao.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
        heDaoTaoList = [];
    }
}

async function loadEmployeeOptions() {
    const select = document.getElementById('editGiangVien');
    try {
        const response = await fetch('/v2/vuotgio/kthp-import/suggestions');
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload)) {
            throw new Error(payload.message || 'Không tải được danh sách giảng viên');
        }
        employeeList = payload;
        select.innerHTML = '';
        employeeList.forEach((employee) => {
            const option = document.createElement('option');
            option.value = String(employee.id_User);
            option.textContent = `${employee.TenNhanVien} — ${employee.MaPhongBan || ''}`;
            select.appendChild(option);
        });
        select.addEventListener('change', () => {
            const employee = employeeList.find(
                (item) => String(item.id_User) === select.value
            );
            if (employee) {
                document.getElementById('editKhoa').value = employee.MaPhongBan;
            }
        });
    } catch (error) {
        select.innerHTML = '<option value="">Không tải được danh sách giảng viên</option>';
        select.disabled = true;
        console.error(error);
    }
}

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    const heDaoTao = document.getElementById('heDaoTao').value;
    const dot = document.getElementById('dot').value;
    const ki = document.getElementById('ki').value;
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        const payload = {
            NamHoc: namHoc,
            khoa: khoa,
            heDaoTao: heDaoTao,
            dot: dot,
            ki: ki
        };
        const response = await fetch(`/v2/vuotgio/duyet-kthp/data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.success !== true) {
            throw new Error(data.message || 'API KTHP trả lỗi');
        }
        const canonicalRows = data.data;
        if (!Array.isArray(canonicalRows)) {
            throw new Error('API KTHP không trả danh sách');
        }
        globalData = canonicalRows.map(toViewRecord);
        renderTable(globalData);
        
        if (globalData.length === 0) {
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
    tableBody.innerHTML = '';

    let STT = 1;
    const rowsToRender = sortRows(data);

    rowsToRender.forEach((row, index) => {
        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-id', row.id);
        tableRow.setAttribute('data-index', index);
        tableRow.setAttribute('data-giangvien', row.giangvien || '');
        tableRow.setAttribute('data-qc', row.sotietqc || 0);

        // STT
        const sttTd = document.createElement('td');
        sttTd.textContent = STT++;
        tableRow.appendChild(sttTd);

        // Giảng viên
        const gvTd = document.createElement('td');
        gvTd.textContent = row.giangvien || '';
        tableRow.appendChild(gvTd);

        // Khoa
        const khoaTd = document.createElement('td');
        khoaTd.textContent = row.khoa || '';
        tableRow.appendChild(khoaTd);

        // Học kỳ
        const hocKyTd = document.createElement('td');
        hocKyTd.textContent = row.ki || row.hocKy || '';
        tableRow.appendChild(hocKyTd);

        // Đợt
        const dotTd = document.createElement('td');
        dotTd.textContent = row.dot;
        tableRow.appendChild(dotTd);

        // Tên học phần
        const tenHPTd = document.createElement('td');
        tenHPTd.textContent = row.tenhocphan || '';
        tableRow.appendChild(tenHPTd);

        // Loại KTHP (hinhthuc)
        const loaiTd = document.createElement('td');
        loaiTd.textContent = row.hinhthuc || '';
        tableRow.appendChild(loaiTd);

        // Thông tin chi tiết
        const detailTd = document.createElement('td');
        detailTd.style.textAlign = 'left';
        detailTd.style.fontSize = '0.9rem';
        detailTd.style.whiteSpace = 'nowrap';
        if (row.activityType === 'RA_DE' || row.activityType === 'NGAN_HANG_CAU_HOI') {
            appendDetailParts(detailTd, [
                ['Mã HP', row.mahocphan || ''],
                ['Hình thức', row.hinhthucthi || ''],
                ['Số đề', row.tongso || 0],
                ['Hệ số', row.heso || 0],
            ]);
        } else if (row.activityType === 'COI_THI') {
            appendDetailParts(detailTd, [
                ['Ngày', row.ngaythi || ''],
                ['Ca', row.cathi || ''],
                ['Thời gian', `${row.thoigian || 0}m`],
                ['Phòng', row.phongthi || ''],
            ]);
        } else if (row.activityType === 'CHAM_THI') {
            appendDetailParts(detailTd, [
                ['Mã HP', row.mahocphan || ''],
                ['Vai trò', row.vaitro || ''],
                ['Tổng bài', row.tongso || 0],
                ['Hệ số', row.heso || 0],
            ]);
        } else {
            detailTd.textContent = '';
        }
        tableRow.appendChild(detailTd);

        // Số tiết QC
        const qcTd = document.createElement('td');
        const qcVal = parseFloat(row.sotietqc);
        qcTd.textContent = Number.isNaN(qcVal) ? '' : qcVal.toFixed(2);
        tableRow.appendChild(qcTd);

        // Ghi chú
        const ghiChuTd = document.createElement('td');
        ghiChuTd.textContent = row.ghichu || '';
        tableRow.appendChild(ghiChuTd);

        // Checkbox Khoa
        const khoaCheckTd = document.createElement('td');
        const khoaCheckbox = document.createElement('input');
        khoaCheckbox.type = 'checkbox';
        khoaCheckbox.name = 'khoa';
        khoaCheckbox.checked = row.khoaduyet === 1;
        khoaCheckbox.onchange = () => {
            updateCheckAll('khoa');
            updateKhaoThiCheckboxes();
        };

        // Phân quyền checkbox Khoa
        if (row.khaothiduyet === 1) {
            // Đã duyệt Khảo thí → khóa cả hai
            khoaCheckbox.checked = true;
            khoaCheckbox.disabled = true;
        } else if (row.khoaduyet === 1) {
            // Đã duyệt Khoa → lãnh đạo khoa mới được bỏ duyệt
            khoaCheckbox.disabled = !canApprove('khoa', 'uncheck', row);
        } else {
            // Chưa duyệt Khoa → GV_CNBM hoặc lãnh đạo khoa được duyệt
            khoaCheckbox.disabled = !canApprove('khoa', 'check', row);
        }
        khoaCheckTd.appendChild(khoaCheckbox);
        tableRow.appendChild(khoaCheckTd);

        // Checkbox Khảo thí
        const ktCheckTd = document.createElement('td');
        const ktCheckbox = document.createElement('input');
        ktCheckbox.type = 'checkbox';
        ktCheckbox.name = 'khaoThi';
        ktCheckbox.checked = row.khaothiduyet === 1;
        ktCheckbox.onchange = () => updateCheckAll('khaoThi');

        // Phân quyền checkbox Khảo thí
        if (row.khaothiduyet === 1) {
            // Đã duyệt → lãnh đạo phòng mới được bỏ duyệt
            ktCheckbox.disabled = !canApprove('khaoThi', 'uncheck', row);
        } else if (row.khoaduyet !== 1) {
            // Khoa chưa duyệt → không cho duyệt Khảo thí
            ktCheckbox.disabled = true;
        } else {
            // Khoa đã duyệt, Khảo thí chưa duyệt → Trợ lý hoặc lãnh đạo phòng được duyệt
            ktCheckbox.disabled = !canApprove('khaoThi', 'check', row);
        }
        
        ktCheckTd.appendChild(ktCheckbox);
        tableRow.appendChild(ktCheckTd);

        // Thao tác (Sửa/Xóa)
        const actionTd = document.createElement('td');
        if (canEditDelete(row)) {
            actionTd.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="editRecord(${row.id})" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteRecord(${row.id})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        tableRow.appendChild(actionTd);

        tableBody.appendChild(tableRow);
    });

    updateSummary();

    // Update Check All states
    updateCheckAll('khoa');
    updateCheckAll('khaoThi');
}

function getSortValue(row, key) {
    if (key === 'activityType') {
        return row.hinhthuc || row.activityType || '';
    }
    return row[key] || '';
}

function sortRows(data) {
    if (!currentSort.key) return data;

    return data
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
            const aValue = String(getSortValue(a.row, currentSort.key));
            const bValue = String(getSortValue(b.row, currentSort.key));
            const result = aValue.localeCompare(bValue, 'vi', {
                sensitivity: 'base',
                numeric: true,
            });

            return result * currentSort.direction || a.index - b.index;
        })
        .map(({ row }) => row);
}

function toggleSort(key) {
    if (currentSort.key === key) {
        currentSort.direction *= -1;
    } else {
        currentSort = { key, direction: 1 };
    }

    updateSortIndicators();
    renderTable(globalData);
    filterTable();
}

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach((header) => {
        const indicator = header.querySelector('.sort-indicator');
        const isActive = header.dataset.sortKey === currentSort.key;
        header.setAttribute('aria-sort', isActive
            ? currentSort.direction === 1 ? 'ascending' : 'descending'
            : 'none');

        if (indicator) {
            indicator.textContent = isActive
                ? currentSort.direction === 1 ? '▲' : '▼'
                : '';
        }
    });
}

// ==================== UPDATE SUMMARY ====================
function updateSummary() {
    const rows = document.querySelectorAll('#tableBody tr');
    const uniqueGVs = new Set();
    let totalQC = 0;

    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const gv = row.getAttribute('data-giangvien');
            if (gv) uniqueGVs.add(gv);
            
            const qcVal = parseFloat(row.getAttribute('data-qc')) || 0;
            totalQC += qcVal;
        }
    });

    const popTeachers = document.getElementById('totalTeachers');
    const popTotalQC = document.getElementById('totalQC');
    
    if (popTeachers) popTeachers.textContent = uniqueGVs.size;
    if (popTotalQC) popTotalQC.textContent = totalQC.toFixed(2);
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    const hpFilter = document.getElementById('filterHocPhan').value.toLowerCase();

    const tableRows = document.querySelectorAll('#tableBody tr');

    tableRows.forEach(row => {
        const gvCell = row.querySelector('td:nth-child(2)'); // Giảng viên
        const hpCell = row.querySelector('td:nth-child(6)'); // Tên học phần

        const gvValue = gvCell ? gvCell.textContent.toLowerCase() : '';
        const hpValue = hpCell ? hpCell.textContent.toLowerCase() : '';

        const gvMatch = gvValue.includes(gvFilter);
        const hpMatch = hpValue.includes(hpFilter);

        if (gvMatch && hpMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    updateSummary();
}

// ==================== CHECK ALL ====================

function checkAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    
    const checkAllIdMap = {
        'khoa': 'checkAllKhoa',
        'khaoThi': 'checkAllKhaoThi'
    };

    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    const isChecking = checkAllCheckbox.checked;

    checkboxes.forEach(checkbox => {
        if (checkbox.disabled) return;
        
        // Kiểm tra quyền: nếu đang check thì cần quyền 'check', nếu uncheck thì cần quyền 'uncheck'
        const action = isChecking ? 'check' : 'uncheck';
        if (!canApprove(type, action)) return;
        
        checkbox.checked = isChecking;
    });

    // Nếu check Khoa, cần update trạng thái của Khảo thí
    if (type === 'khoa') {
        updateKhaoThiCheckboxes();
    }
}

function updateCheckAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    
    const checkAllIdMap = {
        'khoa': 'checkAllKhoa',
        'khaoThi': 'checkAllKhaoThi'
    };

    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    const enabledCheckboxes = Array.from(checkboxes).filter(cb => !cb.disabled);
    
    if (enabledCheckboxes.length === 0) {
        checkAllCheckbox.checked = false;
        return;
    }
    
    const allChecked = enabledCheckboxes.every(cb => cb.checked);
    checkAllCheckbox.checked = allChecked;

    // Nếu thay đổi Khoa, cần update trạng thái của Khảo thí
    if (type === 'khoa') {
        updateKhaoThiCheckboxes();
    }
}

// Update Khảo thí checkboxes based on Khoa status
function updateKhaoThiCheckboxes() {
    const rows = document.querySelectorAll('#tableBody tr');
    
    rows.forEach(row => {
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const ktCheckbox = row.querySelector('input[name="khaoThi"]');
        const dataIndex = parseInt(row.getAttribute('data-index'));
        const data = Number.isNaN(dataIndex) ? null : globalData[dataIndex];
        
        if (khoaCheckbox && ktCheckbox) {
            if (data && data.khaothiduyet === 1) {
                // Đã duyệt Khảo thí → chỉ Lãnh đạo phòng mới bỏ duyệt
                khoaCheckbox.checked = true;
                khoaCheckbox.disabled = true;
                ktCheckbox.checked = true;
                ktCheckbox.disabled = !canApprove('khaoThi', 'uncheck', data);
                return;
            }
            
            // Khảo thí chỉ enable khi Khoa được check VÀ user có quyền
            if (!khoaCheckbox.checked) {
                ktCheckbox.disabled = true;
                ktCheckbox.checked = false;
            } else {
                // Khoa đã check → cho phép duyệt Khảo thí nếu có quyền
                ktCheckbox.disabled = !canApprove('khaoThi', 'check', data);
            }
        }
    });

    updateCheckAll('khaoThi');
}

// ==================== CRUD OPERATIONS ====================

// Edit record - Open modal
function editRecord(id) {
    const record = globalData.find(r => r.id === id);
    if (!record) return;
    
    if (!canEditDelete(record)) {
        Swal.fire('Không thể sửa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    // Fill modal
    document.getElementById('editID').value = record.id;
    document.getElementById('editNamHoc').value = record.namhoc;
    document.getElementById('editHocKy').value = record.ki;
    document.getElementById('editDot').value = record.dot;
    document.getElementById('editKhoa').value = record.khoa;
    document.getElementById('editTenHP').value = record.tenhocphan || '';
    document.getElementById('editMaHP').value = record.mahocphan || '';
    document.getElementById('editSoTC').value = record.sotc || 0;
    document.getElementById('editGiangVien').value = String(record.employeeId);
    document.getElementById('editLopHP').value = record.lophocphan || '';
    document.getElementById('editSiSo').value = record.sosv ?? '';
    const heDaoTaoSelect = document.getElementById('editHeDaoTao');
    heDaoTaoSelect.value = String(record.heDaoTaoId);
    const loaiSelect = document.getElementById('editLoaiKTHP');
    loaiSelect.value = record.activityType;
    document.getElementById('editSoTietQC').value = toFixedInput(record.sotietqc, 2) || 0;
    document.getElementById('editGhiChu').value = record.ghichu || '';
    document.getElementById('editHinhThucThi').value = record.hinhthucthi || '';
    document.getElementById('editHeSo').value = record.heso ?? '';
    document.getElementById('editSoLuongRaDe').value = record.detail.quantity ?? '';
    document.getElementById('editNgayThi').value = record.detail.examDate || '';
    document.getElementById('editCaThi').value = record.detail.shift || '';
    document.getElementById('editThoiGian').value = record.detail.duration ?? '';
    document.getElementById('editPhongThi').value = record.detail.room || '';
    document.getElementById('editSoBaiPhach').value = record.detail.markedCount ?? 0;
    document.getElementById('editVaiTro').value = record.detail.role || '';
    document.querySelectorAll('[data-kthp-detail-panel]').forEach((panel) => {
        panel.classList.add('d-none');
    });
    const detailKind = record.activityType === 'COI_THI'
        ? 'COI_THI'
        : record.activityType === 'CHAM_THI' ? 'CHAM_THI' : 'RA_DE';
    document.querySelector(`[data-kthp-detail-panel="${detailKind}"]`)?.classList.remove('d-none');

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Handle edit submit
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;
    const currentRecord = globalData.find(record => String(record.id) === String(id)) || {};

    let detail;
    if (currentRecord.activityType === 'COI_THI') {
        detail = {
            examDate: document.getElementById('editNgayThi').value,
            shift: document.getElementById('editCaThi').value,
            duration: document.getElementById('editThoiGian').value,
            room: document.getElementById('editPhongThi').value,
        };
    } else if (currentRecord.activityType === 'CHAM_THI') {
        detail = {
            markedCount: document.getElementById('editSoBaiPhach').value,
            role: document.getElementById('editVaiTro').value,
        };
    } else {
        detail = {
            quantity: document.getElementById('editSoLuongRaDe').value,
        };
    }

    const formData = {
        activityType: currentRecord.activityType,
        employeeId: document.getElementById('editGiangVien').value,
        academicYear: document.getElementById('editNamHoc').value,
        semester: document.getElementById('editHocKy').value,
        round: document.getElementById('editDot').value,
        khoa: document.getElementById('editKhoa').value,
        tenhocphan: document.getElementById('editTenHP').value,
        mahocphan: document.getElementById('editMaHP').value,
        sotc: document.getElementById('editSoTC').value,
        lophocphan: document.getElementById('editLopHP').value,
        sosv: document.getElementById('editSiSo').value,
        educationSystemId: document.getElementById('editHeDaoTao').value,
        doituong: document.getElementById('editHeDaoTao').selectedOptions[0]?.textContent,
        standardHours: document.getElementById('editSoTietQC').value,
        notes: document.getElementById('editGhiChu').value,
        examForm: document.getElementById('editHinhThucThi').value,
        coefficient: document.getElementById('editHeSo').value,
        detail,
    };

    try {
        const response = await fetch(`/v2/vuotgio/duyet-kthp/edit/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
    }
}

// Delete record
async function deleteRecord(id) {
    const record = globalData.find(r => r.id === id);
    
    if (record && !canEditDelete(record)) {
        Swal.fire('Không thể xóa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    const result = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: 'Bạn có chắc muốn xóa bản ghi này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
        const namHoc = document.getElementById('namHocXem').value;
        const response = await fetch(`/v2/vuotgio/duyet-kthp/${id}?NamHoc=${encodeURIComponent(namHoc)}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            Swal.fire('Đã xóa', data.message, 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// ==================== BATCH APPROVAL ====================

async function submitApprovals() {
    const rows = document.querySelectorAll('#tableBody tr');
    const updates = [];
    
    // Collect current checkbox states
    rows.forEach((row, index) => {
        if (row.style.display === 'none') return;
        
        const dataIndex = parseInt(row.getAttribute('data-index'));
        const id = parseInt(row.getAttribute('data-id'));
        
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const ktCheckbox = row.querySelector('input[name="khaoThi"]');
        
        if (globalData[dataIndex]) {
            const khaoThiValue = ktCheckbox?.checked ? 1 : 0;
            if (khaoThiValue === 1 && khoaCheckbox) {
                khoaCheckbox.checked = true;
            }
            updates.push({
                id: id,
                khoaDuyet: khoaCheckbox?.checked ? 1 : 0,
                khaoThiDuyet: khaoThiValue
            });
        }
    });

    if (updates.length === 0) {
        Swal.fire('Thông báo', 'Không có dữ liệu để cập nhật', 'info');
        return;
    }

    try {
        const namHoc = document.getElementById('namHocXem').value;
        const response = await fetch('/v2/vuotgio/duyet-kthp/batch-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ NamHoc: namHoc, updates: updates })
        });

        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Thành công', result.message || 'Cập nhật thành công', 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting approvals:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
    }
}

// ==================== TOGGLE SUMMARY ====================
document.addEventListener('DOMContentLoaded', function() {
    const btnToggle = document.getElementById('btnToggleSummary');
    if (btnToggle) {
        btnToggle.addEventListener('click', function() {
            const summaryBox = document.getElementById('summaryBox');
            summaryBox.classList.toggle('collapsed');
            const icon = this.querySelector('i');
            if (summaryBox.classList.contains('collapsed')) {
                icon.className = 'bi bi-chevron-up';
            } else {
                icon.className = 'bi bi-chevron-down';
            }
        });
    }
});
