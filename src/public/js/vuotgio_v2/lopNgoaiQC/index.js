/**
 * Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2
 */

let gridApi = null;

// Column Definitions - Phù hợp với cấu trúc bảng lopngoaiquychuan
const columnDefs = [
    { headerName: 'STT', valueGetter: 'node.rowIndex + 1', width: 60, pinned: 'left' },
    { field: 'GiangVien', headerName: 'Giảng viên', width: 180 },
    { field: 'Khoa', headerName: 'Khoa', width: 80 },
    { field: 'HocKy', headerName: 'HK', width: 60 },
    { field: 'TenHocPhan', headerName: 'Tên học phần', width: 200, flex: 1 },
    { field: 'MaHocPhan', headerName: 'Mã HP', width: 90 },
    { field: 'SoTC', headerName: 'Số TC', width: 70, type: 'numericColumn' },
    { field: 'Lop', headerName: 'Lớp', width: 100 },
    { field: 'LenLop', headerName: 'Lên lớp', width: 80 },
    { field: 'SoSV', headerName: 'Sĩ số', width: 70, type: 'numericColumn' },
    { field: 'SoTietCTDT', headerName: 'Số tiết CTĐT', width: 100, type: 'numericColumn' },
    { field: 'SoTietKT', headerName: 'Số tiết KT', width: 90, type: 'numericColumn' },
    { field: 'HeSoT7CN', headerName: 'HS T7CN', width: 80, type: 'numericColumn' },
    { field: 'HeSoLopDong', headerName: 'HS Lớp đông', width: 100, type: 'numericColumn' },
    { field: 'QuyChuan', headerName: 'Quy chuẩn', width: 90, type: 'numericColumn',
        cellStyle: { fontWeight: 'bold', color: '#28a745' }
    },
    { field: 'he_dao_tao', headerName: 'Hệ ĐT', width: 80 },
    { field: 'DoiTuong', headerName: 'Đối tượng', width: 100 },
    { field: 'GhiChu', headerName: 'Ghi chú', width: 150 },
    {
        headerName: 'Thao tác',
        width: 120,
        pinned: 'right',
        cellRenderer: params => {
            return `
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="editRecord(${params.data.ID})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteRecord(${params.data.ID})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
    }
];

// Grid Options
const gridOptions = {
    columnDefs: columnDefs,
    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
    },
    rowData: [],
    pagination: true,
    paginationPageSize: 20,
    animateRows: true,
    onGridReady: params => {
        gridApi = params.api;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[lopNgoaiQC] DOMContentLoaded fired');
    
    // Init AG Grid
    const gridDiv = document.querySelector('#gridContainer');
    console.log('[lopNgoaiQC] gridDiv:', gridDiv);
    new agGrid.Grid(gridDiv, gridOptions);
    gridApi = gridOptions.api;
    console.log('[lopNgoaiQC] AG Grid initialized');

    // Load năm học options
    loadNamHocOptions();
    loadKhoaOptions();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('lopNgoaiQCForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('khoaForm').addEventListener('change', loadTeachers);

    // Initial load - disabled
    // setTimeout(loadData, 500);
});

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[VuotGio V2 FE] loadNamHocOptions called');
    try {
        console.log('[VuotGio V2 FE] Fetching /api/namhoc...');
        const response = await fetch('/api/namhoc');
        console.log('[VuotGio V2 FE] Response status:', response.status);
        const data = await response.json();
        console.log('[VuotGio V2 FE] NamHoc data:', data);
        
        const namHocSelects = document.querySelectorAll('.namHoc');
        console.log('[VuotGio V2 FE] Found namHoc selects:', namHocSelects.length);
        namHocSelects.forEach(select => {
            select.innerHTML = '';
            data.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                // Chọn năm học đầu tiên có trangthai = 1, hoặc năm đầu tiên
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
        // Fallback to current year if API fails
        const currentYear = new Date().getFullYear();
        const namHocSelects = document.querySelectorAll('.namHoc');
        namHocSelects.forEach(select => {
            select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
        });
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    console.log('[VuotGio V2 FE] loadKhoaOptions called');
    try {
        console.log('[VuotGio V2 FE] Fetching /api/khoa...');
        const response = await fetch('/api/khoa');
        console.log('[VuotGio V2 FE] Response status:', response.status);
        const data = await response.json();
        console.log('[VuotGio V2 FE] Khoa data:', data);
        
        const khoaSelects = document.querySelectorAll('.khoa');
        console.log('[VuotGio V2 FE] Found khoa selects:', khoaSelects.length);
        khoaSelects.forEach(select => {
            const hasAll = select.id.includes('Xem');
            if (!hasAll) select.innerHTML = '<option value="">-- Chọn Khoa --</option>';
            
            data.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.MaPhongBan;
                option.textContent = dept.TenPhongBan || dept.MaPhongBan;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load teachers
async function loadTeachers() {
    const khoa = document.getElementById('khoaForm').value;
    if (!khoa) return;
    
    try {
        const response = await fetch(`/v2/vuotgio/api/teachers?Khoa=${khoa}`);
        const teachers = await response.json();
        
        const select = document.getElementById('giangVienForm');
        select.innerHTML = '<option value="">-- Chọn giảng viên --</option>';
        
        teachers.forEach(t => {
            const option = document.createElement('option');
            option.value = t.HoTen;
            option.textContent = t.HoTen;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading teachers:', error);
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
        gridApi.showLoadingOverlay();
        
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/${namHoc}/${khoa}`);
        const data = await response.json();
        
        gridApi.setRowData(data);
        
        if (data.length === 0) {
            gridApi.showNoRowsOverlay();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
    }
}

// Form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        NamHoc: document.getElementById('namHocForm').value,
        HocKy: document.getElementById('hocKyForm').value,
        Khoa: document.getElementById('khoaForm').value,
        TenHocPhan: document.getElementById('tenHPForm').value,
        MaHocPhan: document.getElementById('maHPForm').value,
        SoTC: document.getElementById('soTCForm').value,
        GiangVien: document.getElementById('giangVienForm').value,
        Lop: document.getElementById('lopForm').value,
        LenLop: document.getElementById('lenLopForm')?.value || '',
        SoSV: document.getElementById('soSVForm').value,
        SoTietCTDT: document.getElementById('soTietCTDTForm').value,
        SoTietKT: document.getElementById('soTietKTForm')?.value || 0,
        HeSoT7CN: document.getElementById('heSoT7CNForm')?.value || 1,
        HeSoLopDong: document.getElementById('heSoLopDongForm')?.value || 1,
        QuyChuan: document.getElementById('quyChuanForm').value,
        he_dao_tao: document.getElementById('heDaoTaoForm')?.value || '',
        DoiTuong: document.getElementById('doiTuongForm')?.value || '',
        HinhThucKTGiuaKy: document.getElementById('hinhThucKTForm')?.value || '',
        SoDe: document.getElementById('soDeForm')?.value || 0,
        GhiChu: document.getElementById('ghiChuForm').value,
        HoanThanh: 0
    };

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            document.getElementById('lopNgoaiQCForm').reset();
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu', 'error');
    }
}

// Edit record
function editRecord(id) {
    const rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    const record = rowData.find(r => r.ID === id);
    
    if (!record) return;

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
    document.getElementById('editLenLop').value = record.LenLop || '';
    document.getElementById('editSoSV').value = record.SoSV || 0;
    document.getElementById('editSoTietCTDT').value = record.SoTietCTDT || 0;
    document.getElementById('editSoTietKT').value = record.SoTietKT || 0;
    document.getElementById('editHeSoT7CN').value = record.HeSoT7CN || 1;
    document.getElementById('editHeSoLopDong').value = record.HeSoLopDong || 1;
    document.getElementById('editQuyChuan').value = record.QuyChuan || 0;
    document.getElementById('editHeDaoTao').value = record.he_dao_tao || '';
    document.getElementById('editDoiTuong').value = record.DoiTuong || '';
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
        LenLop: document.getElementById('editLenLop').value,
        SoSV: document.getElementById('editSoSV').value,
        SoTietCTDT: document.getElementById('editSoTietCTDT').value,
        SoTietKT: document.getElementById('editSoTietKT').value,
        HeSoT7CN: document.getElementById('editHeSoT7CN').value,
        HeSoLopDong: document.getElementById('editHeSoLopDong').value,
        QuyChuan: document.getElementById('editQuyChuan').value,
        he_dao_tao: document.getElementById('editHeDaoTao').value,
        DoiTuong: document.getElementById('editDoiTuong').value,
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
