/**
 * Duyệt Kết Thúc Học Phần - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server
let heDaoTaoList = [];

function toFixedInput(value, decimals) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '';
    return num.toFixed(decimals);
}

function setSelectValueWithFallback(select, value) {
    if (!select) return;
    const normalized = String(value ?? '').trim();
    if (!normalized) return;
    const exists = Array.from(select.options).some(option => option.value === normalized);
    if (!exists) {
        const option = document.createElement('option');
        option.value = normalized;
        option.textContent = normalized;
        select.appendChild(option);
    }
    select.value = normalized;
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('[DuyetKTHP] Init - HTML Table Version');
    
    // Load dropdowns và tự động tải dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions(),
        loadHeDaoTaoOptions()
    ]);
    
    loadData();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('updateApprovalBtn').addEventListener('click', submitApprovals);

    // Filter event listeners
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
    document.getElementById('filterHocPhan').addEventListener('input', filterTable);

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
    // Phòng (Khảo thí): Trợ lý duyệt, Lãnh đạo phòng bỏ duyệt
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

    const checkAllKhoa = document.getElementById('checkAllKhoa');
    const checkAllKhaoThi = document.getElementById('checkAllKhaoThi');

    // Mặc định disable tất cả
    if (checkAllKhoa) checkAllKhoa.disabled = true;
    if (checkAllKhaoThi) checkAllKhaoThi.disabled = true;

    // Khoa: GV_CNBM duyệt (check), Lãnh đạo khoa bỏ duyệt (uncheck)
    if (role === gvCnbm || role === lanhDaoKhoa) {
        if (checkAllKhoa) checkAllKhoa.disabled = false;
    }

    // Phòng Khảo thí: Trợ lý duyệt (check), Lãnh đạo phòng bỏ duyệt (uncheck)
    if (MaPhongBan === khaoThi && (role === troLyPhong || role === lanhDaoPhong)) {
        if (checkAllKhaoThi) checkAllKhaoThi.disabled = false;
    }
}

/**
 * Kiểm tra quyền duyệt cho từng cột
 * @param {'khoa'|'khaoThi'} type - Loại duyệt
 * @param {'check'|'uncheck'} action - Hành động (check = duyệt, uncheck = bỏ duyệt)
 */
function canApprove(type, action) {
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
        // GV_CNBM: chỉ được duyệt (check)
        if (role === gvCnbm && action === 'check') return true;
        // Lãnh đạo khoa: chỉ được bỏ duyệt (uncheck)
        if (role === lanhDaoKhoa && action === 'uncheck') return true;
        return false;
    }

    if (type === 'khaoThi') {
        if (MaPhongBan !== khaoThi) return false;
        // Trợ lý: chỉ được duyệt (check)
        if (role === troLyPhong && action === 'check') return true;
        // Lãnh đạo phòng: chỉ được bỏ duyệt (uncheck)
        if (role === lanhDaoPhong && action === 'uncheck') return true;
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
// Chỉ GV_CNBM và Lãnh đạo khoa mới được sửa/xóa, và chỉ khi chưa duyệt
function canEditDelete(data) {
    const role = localStorage.getItem('userRole');
    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';

    // Chỉ GV_CNBM và Lãnh đạo khoa có quyền sửa/xóa
    if (role !== gvCnbm && role !== lanhDaoKhoa) return false;

    // Chỉ sửa/xóa khi chưa duyệt
    return data.khoaduyet === 0 && data.khaothiduyet === 0;
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
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load hệ đào tạo cho modal
async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-moi-giang');
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
        if (editHeDaoTao) {
            editHeDaoTao.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            heDaoTaoList.forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.value);
                option.textContent = String(item.value);
                editHeDaoTao.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
        heDaoTaoList = [];
    }
}

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        const response = await fetch(`/v2/vuotgio/duyet-kthp/${namHoc}/${khoa}`);
        const data = await response.json();
        
        globalData = data;
        renderTable(globalData);
        
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
    tableBody.innerHTML = '';

    let STT = 1;

    data.forEach((row, index) => {
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

        // Hệ đào tạo
        const heDaoTaoTd = document.createElement('td');
        heDaoTaoTd.textContent = row.doituong || row.doi_tuong || '';
        tableRow.appendChild(heDaoTaoTd);

        // Học kỳ
        const hocKyTd = document.createElement('td');
        hocKyTd.textContent = row.ki || '';
        tableRow.appendChild(hocKyTd);

        // Tên học phần
        const tenHPTd = document.createElement('td');
        tenHPTd.textContent = row.tenhocphan || '';
        tableRow.appendChild(tenHPTd);

        // Lớp HP
        const lopTd = document.createElement('td');
        lopTd.textContent = row.lophocphan || '';
        tableRow.appendChild(lopTd);

        // Loại KTHP (hinhthuc)
        const loaiTd = document.createElement('td');
        loaiTd.textContent = row.hinhthuc || '';
        tableRow.appendChild(loaiTd);

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
            // Đã duyệt Khoa → chỉ Lãnh đạo khoa mới bỏ duyệt được
            khoaCheckbox.disabled = !canApprove('khoa', 'uncheck');
        } else {
            // Chưa duyệt Khoa → chỉ GV_CNBM mới duyệt được
            khoaCheckbox.disabled = !canApprove('khoa', 'check');
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
            // Đã duyệt → chỉ Lãnh đạo phòng mới bỏ duyệt được
            ktCheckbox.disabled = !canApprove('khaoThi', 'uncheck');
        } else if (row.khoaduyet !== 1) {
            // Khoa chưa duyệt → không cho duyệt Khảo thí
            ktCheckbox.disabled = true;
        } else {
            // Khoa đã duyệt, Khảo thí chưa duyệt → chỉ Trợ lý mới duyệt được
            ktCheckbox.disabled = !canApprove('khaoThi', 'check');
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
                ktCheckbox.disabled = !canApprove('khaoThi', 'uncheck');
                return;
            }
            
            // Khảo thí chỉ enable khi Khoa được check VÀ user có quyền
            if (!khoaCheckbox.checked) {
                ktCheckbox.disabled = true;
                ktCheckbox.checked = false;
            } else {
                // Khoa đã check → cho phép duyệt Khảo thí nếu có quyền
                ktCheckbox.disabled = !canApprove('khaoThi', 'check');
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
    document.getElementById('editHocKy').value = record.ki || 1;
    document.getElementById('editKhoa').value = record.khoa;
    document.getElementById('editTenHP').value = record.tenhocphan || '';
    document.getElementById('editMaHP').value = record.mahocphan || '';
    document.getElementById('editSoTC').value = record.sotc || 0;
    document.getElementById('editGiangVien').value = record.giangvien || '';
    document.getElementById('editLopHP').value = record.lophocphan || '';
    document.getElementById('editSiSo').value = record.tongso || 0;
    const heDaoTaoSelect = document.getElementById('editHeDaoTao');
    setSelectValueWithFallback(heDaoTaoSelect, record.doituong || record.doi_tuong || '');
    const loaiSelect = document.getElementById('editLoaiKTHP');
    setSelectValueWithFallback(loaiSelect, record.hinhthuc || 'Ra đề');
    document.getElementById('editSoTietQC').value = toFixedInput(record.sotietqc, 2) || 0;
    document.getElementById('editGhiChu').value = record.ghichu || '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Handle edit submit
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;
    
    const formData = {
        NamHoc: document.getElementById('editNamHoc').value,
        namhoc: document.getElementById('editNamHoc').value,
        ki: document.getElementById('editHocKy').value,
        khoa: document.getElementById('editKhoa').value,
        tenhocphan: document.getElementById('editTenHP').value,
        mahocphan: document.getElementById('editMaHP').value,
        sotc: document.getElementById('editSoTC').value,
        giangvien: document.getElementById('editGiangVien').value,
        lophocphan: document.getElementById('editLopHP').value,
        tongso: document.getElementById('editSiSo').value,
        doituong: document.getElementById('editHeDaoTao').value,
        hinhthuc: document.getElementById('editLoaiKTHP').value,
        sotietqc: document.getElementById('editSoTietQC').value,
        ghichu: document.getElementById('editGhiChu').value
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
                khoaduyet: khoaCheckbox?.checked ? 1 : 0,
                khaothiduyet: khaoThiValue
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
