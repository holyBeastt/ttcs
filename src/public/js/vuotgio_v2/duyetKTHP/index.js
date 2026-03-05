/**
 * Duyệt Kết Thúc Học Phần - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[DuyetKTHP] Init - HTML Table Version');
    
    // Load dropdowns
    loadNamHocOptions();
    loadKhoaOptions();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('updateApprovalBtn').addEventListener('click', submitApprovals);

    // Filter event listeners
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
    document.getElementById('filterHocPhan').addEventListener('input', filterTable);

    // Always show update button (no permission check for now)
    document.getElementById('updateApprovalBtn').style.display = 'flex';
});

// ==================== PERMISSION HELPERS ====================

// Check if row can be edited/deleted (all approvals = 0)
function canEditDelete(data) {
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
        qcTd.textContent = row.sotietqc || '';
        tableRow.appendChild(qcTd);

        // Checkbox Khoa
        const khoaCheckTd = document.createElement('td');
        const khoaCheckbox = document.createElement('input');
        khoaCheckbox.type = 'checkbox';
        khoaCheckbox.name = 'khoa';
        khoaCheckbox.checked = row.khoaduyet === 1;
        khoaCheckbox.onchange = () => updateCheckAll('khoa');
        khoaCheckTd.appendChild(khoaCheckbox);
        tableRow.appendChild(khoaCheckTd);

        // Checkbox Khảo thí
        const ktCheckTd = document.createElement('td');
        const ktCheckbox = document.createElement('input');
        ktCheckbox.type = 'checkbox';
        ktCheckbox.name = 'khaoThi';
        ktCheckbox.checked = row.khaothiduyet === 1;
        ktCheckbox.onchange = () => updateCheckAll('khaoThi');
        
        // Workflow: Khảo thí chỉ enable khi Khoa đã duyệt
        ktCheckbox.disabled = row.khoaduyet !== 1;
        
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
        } else {
            actionTd.innerHTML = '<span class="text-muted small">Đã duyệt</span>';
        }
        tableRow.appendChild(actionTd);

        tableBody.appendChild(tableRow);
    });

    // Update Check All states
    updateCheckAll('khoa');
    updateCheckAll('khaoThi');
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

    checkboxes.forEach(checkbox => {
        if (checkbox.disabled) return;
        checkbox.checked = checkAllCheckbox.checked;
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
        
        if (khoaCheckbox && ktCheckbox) {
            // Khảo thí chỉ enable khi Khoa được check
            ktCheckbox.disabled = !khoaCheckbox.checked;
            
            // Nếu Khoa uncheck, tự động uncheck Khảo thí
            if (!khoaCheckbox.checked) {
                ktCheckbox.checked = false;
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
    document.getElementById('editLoaiKTHP').value = record.hinhthuc || 'Ra đề';
    document.getElementById('editSoTietQC').value = record.sotietqc || 0;
    document.getElementById('editGhiChu').value = record.ghichu || '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Handle edit submit
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;
    
    const formData = {
        namhoc: document.getElementById('editNamHoc').value,
        ki: document.getElementById('editHocKy').value,
        khoa: document.getElementById('editKhoa').value,
        tenhocphan: document.getElementById('editTenHP').value,
        mahocphan: document.getElementById('editMaHP').value,
        sotc: document.getElementById('editSoTC').value,
        giangvien: document.getElementById('editGiangVien').value,
        lophocphan: document.getElementById('editLopHP').value,
        tongso: document.getElementById('editSiSo').value,
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
        const response = await fetch(`/v2/vuotgio/duyet-kthp/${id}`, {
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
            updates.push({
                id: id,
                khoaduyet: khoaCheckbox?.checked ? 1 : 0,
                khaothiduyet: ktCheckbox?.checked ? 1 : 0
            });
        }
    });

    if (updates.length === 0) {
        Swal.fire('Thông báo', 'Không có dữ liệu để cập nhật', 'info');
        return;
    }

    try {
        const response = await fetch('/v2/vuotgio/duyet-kthp/batch-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
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
