/**
 * Danh Sách Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2 - Refactored 2026-03-04
 * 
 * Đọc từ bảng lopngoaiquychuan (chính thức, cột mới sau migration):
 *   LopHocPhan, MaHocPhan, SoTinChi, TenLop, LL, MaBoMon, KiHoc, Dot...
 */

let globalData = [];
let heDaoTaoList = [];
let currentEditId = null;

const userRole = localStorage.getItem('userRole') || '';
const userKhoa = localStorage.getItem('MaPhongBan') || '';

function toDateInputValue(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function toDateDisplay(value) {
    const input = toDateInputValue(value);
    if (!input) return '';
    const [year, month, day] = input.split('-');
    return `${day}/${month}/${year}`;
}

function toFixedInput(value, decimals) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '';
    return num.toFixed(decimals);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[DanhSachLopNgoaiQC] Init - chính thức (cột mới)');

    // Load dropdowns và tự động tải dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions(),
        loadHeDaoTaoOptions()
    ]);

    loadData();

    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('updateApprovalBtn').addEventListener('click', submitApprovals);

    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
    document.getElementById('filterHocPhan').addEventListener('input', filterTable);

    const editHeDaoTaoId = document.getElementById('editHeDaoTaoId');
    if (editHeDaoTaoId) {
        editHeDaoTaoId.addEventListener('change', () => {
            const prevValue = editHeDaoTaoId.dataset.prevValue || '';
            const nextValue = editHeDaoTaoId.value;
            console.log('[LNQC][he_dao_tao] modal change', {
                id: currentEditId,
                prev: prevValue,
                next: nextValue
            });
            editHeDaoTaoId.dataset.prevValue = nextValue;
        });
    }

    setupUpdateButtonVisibility();
});

function setupUpdateButtonVisibility() {
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');
    const updateBtn = document.getElementById('updateApprovalBtn');

    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DT';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGD';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'troLy_phong';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'lanhDao_phong';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'lanhDao_khoa';

    if ((MaPhongBan === daoTao || MaPhongBan === vanPhong || MaPhongBan === banGiamDoc) &&
        (role === troLyPhong || role === lanhDaoPhong)) {
        updateBtn.style.display = 'flex';
    } else if (role === lanhDaoKhoa) {
        updateBtn.style.display = 'flex';
    }
}

// ==================== PERMISSION HELPERS ====================

function canEditDelete(data) {
    return data.KhoaDuyet === 0 && data.DaoTaoDuyet === 0;
}

function canApprove(type) {
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');
    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DT';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGD';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'troLy_phong';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'lanhDao_phong';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'lanhDao_khoa';

    if (MaPhongBan === banGiamDoc) return true;
    if (type === 'khoa') return role === lanhDaoKhoa || role === lanhDaoPhong;
    if (type === 'daoTao') return MaPhongBan === daoTao && (role === troLyPhong || role === lanhDaoPhong);
    return false;
}

// ==================== DATA LOADING ====================

async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();

        const selects = [document.getElementById('namHocFilter'), document.getElementById('editNamHoc')];
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

async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();

        const khoaFilter = document.getElementById('khoaFilter');
        const editKhoa = document.getElementById('editKhoa');

        if (editKhoa) {
            editKhoa.innerHTML = '<option value="">-- Chọn Khoa --</option>';
        }

        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            khoaFilter.appendChild(option.cloneNode(true));
            if (editKhoa) editKhoa.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-dao-tao');
        const result = await response.json();

        if (Array.isArray(result)) {
            heDaoTaoList = result;
        } else if (result.success && Array.isArray(result.data)) {
            heDaoTaoList = result.data;
        } else {
            heDaoTaoList = [];
        }

        const editHeDaoTaoId = document.getElementById('editHeDaoTaoId');
        if (editHeDaoTaoId) {
            editHeDaoTaoId.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            heDaoTaoList.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.he_dao_tao || item.ten || '';
                editHeDaoTaoId.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
    }
}

// Gọi API chính thức (lopngoaiquychuan)
async function loadData() {
    const namHoc = document.getElementById('namHocFilter').value;
    const khoa = document.getElementById('khoaFilter').value;

    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        // API chính thức mới
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/chinh-thuc/${namHoc}/${khoa}`);
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
// Dùng tên cột mới: LopHocPhan, SoTinChi, TenLop, LL, KiHoc, Dot...

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
        tableRow.setAttribute('data-giangvien', row.GiangVien || '');
        tableRow.setAttribute('data-ll', row.LL || 0);
        tableRow.setAttribute('data-qc', row.QuyChuan || 0);

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

        // Kì (KiHoc - tên mới)
        const kiTd = document.createElement('td');
        kiTd.textContent = row.KiHoc || '';
        tableRow.appendChild(kiTd);

        // Đợt (Dot - cột mới)
        const dotTd = document.createElement('td');
        dotTd.textContent = row.Dot || '';
        tableRow.appendChild(dotTd);

        // Lớp học phần (LopHocPhan - tên mới, trước là TenHocPhan)
        const tenHPTd = document.createElement('td');
        tenHPTd.textContent = row.LopHocPhan || '';
        tableRow.appendChild(tenHPTd);

        // Mã HP
        const maHPTd = document.createElement('td');
        maHPTd.textContent = row.MaHocPhan || '';
        tableRow.appendChild(maHPTd);

        // Số TC (SoTinChi - tên mới)
        const soTCTd = document.createElement('td');
        soTCTd.textContent = row.SoTinChi || '';
        tableRow.appendChild(soTCTd);

        // Hệ đào tạo (he_dao_tao - select dropdown)
        const heDTTd = document.createElement('td');
        const heDTSelect = document.createElement('select');
        heDTSelect.className = 'hdt-select';
        heDTSelect.name = 'he_dao_tao_id';

        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = '-- Chọn hệ đào tạo --';
        heDTSelect.appendChild(placeholderOpt);

        const currentHeDT = String(
            row.he_dao_tao_id ?? row.HeDaoTaoId ?? row.he_dao_tao ?? row.HeDaoTao ?? ''
        ).trim();

        if (heDaoTaoList.length === 0) {
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = 'Chưa có dữ liệu';
            heDTSelect.appendChild(emptyOpt);
            heDTSelect.disabled = true;
        } else {
            let matched = false;
            heDaoTaoList.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.he_dao_tao || item.ten || '';
                if (String(item.id) === currentHeDT || String(item.he_dao_tao) === currentHeDT) {
                    opt.selected = true;
                    matched = true;
                }
                heDTSelect.appendChild(opt);
            });

            if (!matched && currentHeDT) {
                const opt = document.createElement('option');
                opt.value = currentHeDT;
                opt.textContent = currentHeDT;
                opt.selected = true;
                heDTSelect.appendChild(opt);
            }
        }

        if (currentHeDT) {
            heDTSelect.value = currentHeDT;
        }

        heDTSelect.dataset.prevValue = currentHeDT;
        heDTSelect.addEventListener('change', () => {
            const prevValue = heDTSelect.dataset.prevValue || '';
            const nextValue = heDTSelect.value;
            console.log('[LNQC][he_dao_tao] table change', {
                id: row.ID,
                prev: prevValue,
                next: nextValue
            });
            heDTSelect.dataset.prevValue = nextValue;
            if (globalData[index]) globalData[index].he_dao_tao_id = nextValue;
        });

        heDTTd.appendChild(heDTSelect);
        tableRow.appendChild(heDTTd);

        // Số tiết LL (LL - tên mới, trước là LenLop)
        const llTd = document.createElement('td');
        llTd.textContent = row.LL || '';
        tableRow.appendChild(llTd);

        // Số SV
        const svTd = document.createElement('td');
        svTd.textContent = row.SoSV || '';
        tableRow.appendChild(svTd);

        // Quy chuẩn
        const qcTd = document.createElement('td');
        const qcVal = parseFloat(row.QuyChuan);
        qcTd.textContent = isNaN(qcVal) ? '' : qcVal.toFixed(2);
        tableRow.appendChild(qcTd);

        // Ngày bắt đầu
        const startDateTd = document.createElement('td');
        startDateTd.textContent = toDateDisplay(row.NgayBatDau);
        tableRow.appendChild(startDateTd);

        // Ngày kết thúc
        const endDateTd = document.createElement('td');
        endDateTd.textContent = toDateDisplay(row.NgayKetThuc);
        tableRow.appendChild(endDateTd);

        // Ghi chú
        const ghiChuTd = document.createElement('td');
        ghiChuTd.textContent = row.GhiChu || '';
        tableRow.appendChild(ghiChuTd);

        // Checkbox Khoa
        const khoaCheckTd = document.createElement('td');
        const khoaCheckbox = document.createElement('input');
        khoaCheckbox.type = 'checkbox';
        khoaCheckbox.name = 'khoa';
        khoaCheckbox.checked = row.KhoaDuyet === 1;
        khoaCheckbox.onchange = () => updateCheckAll('khoa');

        if (row.DaoTaoDuyet === 1) {
            khoaCheckbox.checked = true;
            khoaCheckbox.disabled = true;
        } else {
            khoaCheckbox.disabled = !canApprove('khoa');
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

        if (canApprove('daoTao')) {
            dtCheckbox.disabled = row.KhoaDuyet !== 1;
        } else {
            dtCheckbox.disabled = true;
        }
        dtCheckTd.appendChild(dtCheckbox);
        tableRow.appendChild(dtCheckTd);

        // Thao tác
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

    updateCheckAll('khoa');
    updateCheckAll('daoTao');
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    const hpFilter = document.getElementById('filterHocPhan').value.toLowerCase();

    const tableRows = document.querySelectorAll('#tableBody tr');

    tableRows.forEach(row => {
        const gvCell = row.querySelector('td:nth-child(2)');
        const hpCell = row.querySelector('td:nth-child(6)');

        const gvValue = gvCell ? gvCell.textContent.toLowerCase() : '';
        const hpValue = hpCell ? hpCell.textContent.toLowerCase() : '';

        row.style.display = (gvValue.includes(gvFilter) && hpValue.includes(hpFilter)) ? '' : 'none';
    });

    calculateTotals();
}

// ==================== TOTALS ====================

function calculateTotals() {
    let totalLL = 0;
    let totalQC = 0;
    const uniqueGVs = new Set();

    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
        if (row.style.display === 'none') return;
        
        const gv = row.getAttribute('data-giangvien');
        if (gv) uniqueGVs.add(gv);
        
        const llVal = parseFloat(row.getAttribute('data-ll')) || 0;
        const qcVal = parseFloat(row.getAttribute('data-qc')) || 0;
        
        totalLL += llVal;
        totalQC += qcVal;
    });

    // Cập nhật footer cũ (nếu còn)
    const oldTotalLL = document.getElementById('totalLL');
    const oldTotalQC = document.getElementById('totalQC');
    if (oldTotalLL) oldTotalLL.textContent = totalLL.toFixed(2);
    if (oldTotalQC) oldTotalQC.textContent = totalQC.toFixed(2);
    
    // Cập nhật popup mới
    const popTeachers = document.getElementById('totalTeachers');
    const popTotalLL = document.getElementById('popupTotalLL');
    const popTotalQC = document.getElementById('popupTotalQC');
    
    if (popTeachers) popTeachers.textContent = uniqueGVs.size;
    if (popTotalLL) popTotalLL.textContent = totalLL.toFixed(2);
    if (popTotalQC) popTotalQC.textContent = totalQC.toFixed(2);
}

// ==================== CHECK ALL ====================

function checkAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;
    checkboxes.forEach(cb => { if (!cb.disabled) cb.checked = checkAllCheckbox.checked; });
}

function updateCheckAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;
    const enabled = Array.from(checkboxes).filter(cb => !cb.disabled);
    checkAllCheckbox.checked = enabled.length > 0 && enabled.every(cb => cb.checked);
}

// ==================== CRUD (trên lopngoaiquychuan chính thức) ====================

function editRecord(id) {
    const record = globalData.find(r => r.ID === id);
    if (!record) return;

    if (!canEditDelete(record)) {
        Swal.fire('Không thể sửa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    // Fill modal với tên cột mới
    document.getElementById('editID').value = record.ID;
    currentEditId = record.ID;
    document.getElementById('editNamHoc').value = record.NamHoc;
    document.getElementById('editHocKy').value = record.KiHoc || '';
    document.getElementById('editKhoa').value = record.Khoa || '';
    document.getElementById('editDot').value = record.Dot || 1;
    document.getElementById('editTenHP').value = record.LopHocPhan || '';
    document.getElementById('editMaHP').value = record.MaHocPhan || '';
    document.getElementById('editMaBoMon').value = record.MaBoMon || '';
    document.getElementById('editSoTC').value = record.SoTinChi || 0;
    document.getElementById('editGiangVien').value = record.GiangVien || '';
    document.getElementById('editGiaoVienGiangDay').value = record.GiaoVienGiangDay || '';
    document.getElementById('editLop').value = record.TenLop || '';
    document.getElementById('editSoSV').value = record.SoSV || 0;
    document.getElementById('editMoiGiang').checked = record.MoiGiang === 1;
    document.getElementById('editSoTietLL').value = record.LL || 0;
    document.getElementById('editSoTietCTDT').value = record.SoTietCTDT || 0;
    document.getElementById('editHeSoT7CN').value = toFixedInput(record.HeSoT7CN ?? 1, 2);
    document.getElementById('editHeSoLopDong').value = toFixedInput(record.HeSoLopDong ?? 1, 2);
    document.getElementById('editQuyChuan').value = record.QuyChuan || 0;
    const editHeDaoTaoId = document.getElementById('editHeDaoTaoId');
    if (editHeDaoTaoId) {
        editHeDaoTaoId.value = record.he_dao_tao || record.he_dao_tao_id || record.HeDaoTaoId || '';
        editHeDaoTaoId.dataset.prevValue = editHeDaoTaoId.value;
    }
    document.getElementById('editNgayBatDau').value = toDateInputValue(record.NgayBatDau);
    document.getElementById('editNgayKetThuc').value = toDateInputValue(record.NgayKetThuc);
    document.getElementById('editGhiChu').value = record.GhiChu || '';

    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Edit submit - gửi với tên cột mới tương thích lopngoaiquychuan
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;

    const formData = {
        NamHoc: document.getElementById('editNamHoc').value,
        KiHoc: document.getElementById('editHocKy').value,
        Khoa: document.getElementById('editKhoa').value,
        Dot: document.getElementById('editDot').value,
        LopHocPhan: document.getElementById('editTenHP').value,
        MaHocPhan: document.getElementById('editMaHP').value,
        MaBoMon: document.getElementById('editMaBoMon').value,
        SoTinChi: document.getElementById('editSoTC').value,
        GiangVien: document.getElementById('editGiangVien').value,
        GiaoVienGiangDay: document.getElementById('editGiaoVienGiangDay').value,
        TenLop: document.getElementById('editLop').value,
        SoSV: document.getElementById('editSoSV').value,
        MoiGiang: document.getElementById('editMoiGiang').checked ? 1 : 0,
        LL: document.getElementById('editSoTietLL').value,
        SoTietCTDT: document.getElementById('editSoTietCTDT').value,
        HeSoT7CN: document.getElementById('editHeSoT7CN').value,
        HeSoLopDong: document.getElementById('editHeSoLopDong').value,
        QuyChuan: document.getElementById('editQuyChuan').value,
        he_dao_tao_id: document.getElementById('editHeDaoTaoId').value,
        NgayBatDau: document.getElementById('editNgayBatDau').value,
        NgayKetThuc: document.getElementById('editNgayKetThuc').value,
        GhiChu: document.getElementById('editGhiChu').value
    };

    console.log('[LNQC][edit] submit payload:', { id, formData });

    try {
        // API edit chính thức - cần API riêng cho bảng lopngoaiquychuan
        // Tạm thời dùng endpoint cũ tương thích
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/edit-chinh-thuc/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        console.log('[LNQC][edit] response:', { status: response.status, result });

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
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/chinh-thuc/${id}`, {
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

    rows.forEach(row => {
        if (row.style.display === 'none') return;
        const dataIndex = parseInt(row.getAttribute('data-index'));

        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const dtCheckbox = row.querySelector('input[name="daoTao"]');

        if (globalData[dataIndex]) {
            const currentDaoTao = dtCheckbox?.checked ? 1 : 0;
            const lockedByDaoTao = globalData[dataIndex].DaoTaoDuyet === 1 || currentDaoTao === 1;

            if (lockedByDaoTao && khoaCheckbox) {
                khoaCheckbox.checked = true;
            }

            globalData[dataIndex].KhoaDuyet = khoaCheckbox?.checked ? 1 : 0;
            globalData[dataIndex].DaoTaoDuyet = currentDaoTao;
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
            Swal.fire('Thành công', 'Cập nhật thành công', 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', 'Cập nhật thất bại', 'error');
        }
    } catch (error) {
        console.error('Error submitting approvals:', error);
        Swal.fire('Lỗi', 'Cập nhật thất bại', 'error');
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
