/**
 * Danh Sách Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server

// Get user role from localStorage
const userRole = localStorage.getItem('userRole') || '';
const userKhoa = localStorage.getItem('MaPhongBan') || '';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[DanhSachLopNgoaiQC] Init - HTML Table Version');
    
    // Load dropdowns
    loadNamHocOptions();
    loadKhoaOptions();
    loadHeDaoTaoOptions();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('updateApprovalBtn').addEventListener('click', submitApprovals);

    // Filter event listeners
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
    document.getElementById('filterHocPhan').addEventListener('input', filterTable);

    // Show/hide update button based on role
    setupUpdateButtonVisibility();
});

// Setup visibility of update button based on role
function setupUpdateButtonVisibility() {
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');
    const updateBtn = document.getElementById('updateApprovalBtn');

    // APP_ROLES and APP_DEPARTMENTS from constantsMiddleware
    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DT';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGD';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'troLy_phong';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'lanhDao_phong';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'lanhDao_khoa';

    // Show button for appropriate roles
    if ((MaPhongBan === daoTao || MaPhongBan === vanPhong || MaPhongBan === banGiamDoc) &&
        (role === troLyPhong || role === lanhDaoPhong)) {
        updateBtn.style.display = 'flex';
    } else if (role === lanhDaoKhoa) {
        updateBtn.style.display = 'flex';
    }
}

// ==================== PERMISSION HELPERS ====================

// Check if row can be edited/deleted (all approvals = 0)
function canEditDelete(data) {
    return data.KhoaDuyet === 0 && data.DaoTaoDuyet === 0 && data.TaiChinhDuyet === 0;
}

// Check approval permission based on role
function canApprove(type) {
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');

    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DT';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGD';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'troLy_phong';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'lanhDao_phong';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'lanhDao_khoa';

    // Ban Giám đốc can do everything
    if (MaPhongBan === banGiamDoc) return true;

    if (type === 'khoa') {
        return role === lanhDaoKhoa;
    } else if (type === 'daoTao') {
        return MaPhongBan === daoTao && (role === troLyPhong || role === lanhDaoPhong);
    } else if (type === 'taiChinh') {
        return MaPhongBan === vanPhong && (role === troLyPhong || role === lanhDaoPhong);
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
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load hệ đào tạo từ API
async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-dao-tao');
        const result = await response.json();
        
        const editHeDaoTao = document.getElementById('editHeDaoTao');
        if (editHeDaoTao) {
            editHeDaoTao.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            
            if (result.success && result.data) {
                result.data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.he_dao_tao;
                    option.textContent = item.he_dao_tao;
                    editHeDaoTao.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
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
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/${namHoc}/${khoa}`);
        const data = await response.json();
        
        globalData = data;
        renderTable(globalData);
        calculateTotals();
        
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

    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');
    
    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DT';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGD';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'troLy_phong';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'lanhDao_phong';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'lanhDao_khoa';

    let STT = 1;

    data.forEach((row, index) => {
        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-id', row.ID);
        tableRow.setAttribute('data-index', index);

        // STT
        const sttTd = document.createElement('td');
        sttTd.textContent = STT++;
        tableRow.appendChild(sttTd);

        // Giảng viên
        const gvTd = document.createElement('td');
        gvTd.textContent = row.GiangVien || '';
        tableRow.appendChild(gvTd);

        // Khoa
        const khoaTd = document.createElement('td');
        khoaTd.textContent = row.Khoa || '';
        tableRow.appendChild(khoaTd);

        // Học kỳ
        const hocKyTd = document.createElement('td');
        hocKyTd.textContent = row.HocKy || '';
        tableRow.appendChild(hocKyTd);

        // Tên học phần
        const tenHPTd = document.createElement('td');
        tenHPTd.textContent = row.TenHocPhan || '';
        tableRow.appendChild(tenHPTd);

        // Mã HP
        const maHPTd = document.createElement('td');
        maHPTd.textContent = row.MaHocPhan || '';
        tableRow.appendChild(maHPTd);

        // Số TC
        const soTCTd = document.createElement('td');
        soTCTd.textContent = row.SoTC || '';
        tableRow.appendChild(soTCTd);

        // Tên lớp
        const lopTd = document.createElement('td');
        lopTd.textContent = row.Lop || '';
        tableRow.appendChild(lopTd);

        // Số tiết LL
        const llTd = document.createElement('td');
        llTd.textContent = row.LenLop || '';
        tableRow.appendChild(llTd);

        // Số SV
        const svTd = document.createElement('td');
        svTd.textContent = row.SoSV || '';
        tableRow.appendChild(svTd);

        // Quy chuẩn
        const qcTd = document.createElement('td');
        qcTd.textContent = row.QuyChuan || '';
        tableRow.appendChild(qcTd);

        // Checkbox Khoa
        const khoaCheckTd = document.createElement('td');
        const khoaCheckbox = document.createElement('input');
        khoaCheckbox.type = 'checkbox';
        khoaCheckbox.name = 'khoa';
        khoaCheckbox.checked = row.KhoaDuyet === 1;
        khoaCheckbox.onchange = () => updateCheckAll('khoa');
        
        // Permission logic for Khoa checkbox
        if (MaPhongBan === banGiamDoc) {
            khoaCheckbox.disabled = false;
        } else if (role === lanhDaoKhoa) {
            khoaCheckbox.disabled = false;
        } else {
            khoaCheckbox.disabled = true;
        }
        
        khoaCheckTd.appendChild(khoaCheckbox);
        tableRow.appendChild(khoaCheckTd);

        // Checkbox Đào tạo
        const dtCheckTd = document.createElement('td');
        const dtCheckbox = document.createElement('input');
        dtCheckbox.type = 'checkbox';
        dtCheckbox.name = 'daoTao';
        dtCheckbox.checked = row.DaoTaoDuyet === 1;
        dtCheckbox.onchange = () => updateCheckAll('daoTao');
        
        // Permission logic for ĐT checkbox
        if (MaPhongBan === banGiamDoc) {
            dtCheckbox.disabled = false;
        } else if (MaPhongBan === daoTao && (role === troLyPhong || role === lanhDaoPhong)) {
            // Chỉ enable nếu Khoa đã duyệt
            dtCheckbox.disabled = row.KhoaDuyet !== 1;
        } else {
            dtCheckbox.disabled = true;
        }
        
        dtCheckTd.appendChild(dtCheckbox);
        tableRow.appendChild(dtCheckTd);

        // Checkbox Tài chính
        const tcCheckTd = document.createElement('td');
        const tcCheckbox = document.createElement('input');
        tcCheckbox.type = 'checkbox';
        tcCheckbox.name = 'taiChinh';
        tcCheckbox.checked = row.TaiChinhDuyet === 1;
        tcCheckbox.onchange = () => updateCheckAll('taiChinh');
        
        // Permission logic for TC checkbox
        if (MaPhongBan === banGiamDoc) {
            tcCheckbox.disabled = false;
        } else if (MaPhongBan === vanPhong && (role === troLyPhong || role === lanhDaoPhong)) {
            // Chỉ enable nếu ĐT đã duyệt
            tcCheckbox.disabled = row.DaoTaoDuyet !== 1;
        } else {
            tcCheckbox.disabled = true;
        }
        
        tcCheckTd.appendChild(tcCheckbox);
        tableRow.appendChild(tcCheckTd);

        // Thao tác (Sửa/Xóa)
        const actionTd = document.createElement('td');
        if (canEditDelete(row)) {
            actionTd.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="editRecord(${row.ID})" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteRecord(${row.ID})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        } else {
            actionTd.innerHTML = '<span class="text-muted small">Đã duyệt</span>';
        }
        tableRow.appendChild(actionTd);

        tableBody.appendChild(tableRow);
    });

    // Update Check All states
    updateCheckAll('khoa');
    updateCheckAll('daoTao');
    updateCheckAll('taiChinh');
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    const hpFilter = document.getElementById('filterHocPhan').value.toLowerCase();

    const tableRows = document.querySelectorAll('#tableBody tr');

    tableRows.forEach(row => {
        const gvCell = row.querySelector('td:nth-child(2)'); // Giảng viên
        const hpCell = row.querySelector('td:nth-child(5)'); // Tên học phần

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

    calculateTotals();
}

// ==================== TOTALS ====================

function calculateTotals() {
    let totalLL = 0;
    let totalQC = 0;

    const rows = document.querySelectorAll('#tableBody tr');

    rows.forEach(row => {
        if (row.style.display === 'none') return;

        const llCell = row.querySelector('td:nth-child(9)'); // Số tiết LL
        const qcCell = row.querySelector('td:nth-child(11)'); // QC

        const ll = parseFloat(llCell?.textContent) || 0;
        const qc = parseFloat(qcCell?.textContent) || 0;

        totalLL += ll;
        totalQC += qc;
    });

    document.getElementById('totalLL').textContent = totalLL.toFixed(2);
    document.getElementById('totalQC').textContent = totalQC.toFixed(2);
}

// ==================== CHECK ALL ====================

function checkAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    
    const checkAllIdMap = {
        'khoa': 'checkAllKhoa',
        'daoTao': 'checkAllDaoTao',
        'taiChinh': 'checkAllTC'
    };

    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    checkboxes.forEach(checkbox => {
        if (checkbox.disabled) return;
        checkbox.checked = checkAllCheckbox.checked;
    });
}

function updateCheckAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    
    const checkAllIdMap = {
        'khoa': 'checkAllKhoa',
        'daoTao': 'checkAllDaoTao',
        'taiChinh': 'checkAllTC'
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
}

// ==================== CRUD OPERATIONS ====================

// Edit record - Open modal
function editRecord(id) {
    const record = globalData.find(r => r.ID === id);
    if (!record) return;
    
    if (!canEditDelete(record)) {
        Swal.fire('Không thể sửa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    // Fill modal
    document.getElementById('editID').value = record.ID;
    document.getElementById('editNamHoc').value = record.NamHoc;
    document.getElementById('editHocKy').value = record.HocKy;
    document.getElementById('editKhoa').value = record.Khoa;
    document.getElementById('editTenHP').value = record.TenHocPhan || '';
    document.getElementById('editMaHP').value = record.MaHocPhan || '';
    document.getElementById('editSoTC').value = record.SoTC || 0;
    document.getElementById('editGiangVien').value = record.GiangVien || '';
    document.getElementById('editLop').value = record.Lop || '';
    document.getElementById('editSoTietLL').value = record.LenLop || 0;
    document.getElementById('editSoSV').value = record.SoSV || 0;
    document.getElementById('editSoTietCTDT').value = record.SoTietCTDT || 0;
    document.getElementById('editSoTietKT').value = record.SoTietKT || 0;
    document.getElementById('editHeSoT7CN').value = record.HeSoT7CN || 1;
    document.getElementById('editHeSoLopDong').value = record.HeSoLopDong || 1;
    document.getElementById('editQuyChuan').value = record.QuyChuan || 0;
    document.getElementById('editHeDaoTao').value = record.he_dao_tao || '';
    document.getElementById('editGhiChu').value = record.GhiChu || '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Handle edit submit
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;
    
    const formData = {
        NamHoc: document.getElementById('editNamHoc').value,
        HocKy: document.getElementById('editHocKy').value,
        Khoa: document.getElementById('editKhoa').value,
        TenHocPhan: document.getElementById('editTenHP').value,
        MaHocPhan: document.getElementById('editMaHP').value,
        SoTC: document.getElementById('editSoTC').value,
        GiangVien: document.getElementById('editGiangVien').value,
        Lop: document.getElementById('editLop').value,
        LenLop: document.getElementById('editSoTietLL').value,
        SoSV: document.getElementById('editSoSV').value,
        SoTietCTDT: document.getElementById('editSoTietCTDT').value,
        SoTietKT: document.getElementById('editSoTietKT').value,
        HeSoT7CN: document.getElementById('editHeSoT7CN').value,
        HeSoLopDong: document.getElementById('editHeSoLopDong').value,
        QuyChuan: document.getElementById('editQuyChuan').value,
        he_dao_tao: document.getElementById('editHeDaoTao').value,
        GhiChu: document.getElementById('editGhiChu').value
    };

    try {
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/edit/${id}`, {
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
    const record = globalData.find(r => r.ID === id);
    
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
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/${id}`, {
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
    
    // Update globalData with current checkbox states
    rows.forEach((row, index) => {
        if (row.style.display === 'none') return;
        
        const dataIndex = parseInt(row.getAttribute('data-index'));
        
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const dtCheckbox = row.querySelector('input[name="daoTao"]');
        const tcCheckbox = row.querySelector('input[name="taiChinh"]');
        
        if (globalData[dataIndex]) {
            globalData[dataIndex].KhoaDuyet = khoaCheckbox?.checked ? 1 : 0;
            globalData[dataIndex].DaoTaoDuyet = dtCheckbox?.checked ? 1 : 0;
            globalData[dataIndex].TaiChinhDuyet = tcCheckbox?.checked ? 1 : 0;
        }
    });

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/batch-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(globalData)
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
