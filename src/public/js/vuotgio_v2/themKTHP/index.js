/**
 * Thêm Kết Thúc Học Phần - Frontend JS
 * VuotGio V2
 */

let gridApi = null;

// Column Definitions - Matching ketthuchocphan table structure
const columnDefs = [
    { headerName: 'STT', valueGetter: 'node.rowIndex + 1', width: 60, pinned: 'left' },
    { field: 'giangvien', headerName: 'Giảng viên', width: 180 },
    { field: 'khoa', headerName: 'Khoa', width: 80 },
    { field: 'ki', headerName: 'Kỳ', width: 60 },
    { field: 'tenhocphan', headerName: 'Tên học phần', width: 200, flex: 1 },
    { field: 'lophocphan', headerName: 'Lớp', width: 100 },
    { field: 'doituong', headerName: 'Đối tượng', width: 100 },
    { field: 'hinhthuc', headerName: 'Hình thức', width: 100,
        cellStyle: params => {
            const colors = {
                'Ra đề': '#17a2b8',
                'Coi thi': '#ffc107',
                'Chấm thi': '#28a745'
            };
            return { color: colors[params.value] || '#333', fontWeight: 'bold' };
        }
    },
    { field: 'tongso', headerName: 'Tổng số', width: 80, type: 'numericColumn' },
    { field: 'sotietqc', headerName: 'Số tiết QC', width: 90, type: 'numericColumn',
        cellStyle: { fontWeight: 'bold', color: '#28a745' }
    },
    { field: 'khoaduyet', headerName: 'Trạng thái', width: 110,
        cellRenderer: params => {
            const isApproved = params.value === 1 || params.value === true;
            const statusText = isApproved ? 'Đã duyệt' : 'Chờ duyệt';
            const statusClass = isApproved ? 'status-approved' : 'status-pending';
            return `<span class="status-badge ${statusClass}">${statusText}</span>`;
        }
    },
    { field: 'ghichu', headerName: 'Ghi chú', width: 150 },
    {
        headerName: 'Thao tác',
        width: 120,
        pinned: 'right',
        cellRenderer: params => {
            const isApproved = params.data.khoaduyet === 1 || params.data.khoaduyet === true;
            if (isApproved) {
                return '<span class="text-muted">Đã duyệt</span>';
            }
            return `
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="editRecord(${params.data.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteRecord(${params.data.id})">
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
    getRowStyle: params => {
        const isApproved = params.data.khoaduyet === 1 || params.data.khoaduyet === true;
        if (isApproved) {
            return { backgroundColor: '#d4edda' };
        }
        return null;
    },
    onGridReady: params => {
        gridApi = params.api;
    }
};

// Danh sách giảng viên cho autocomplete
let giangVienList = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load options
    loadNamHocOptions();
    loadKhoaOptions();
    loadGiangVienList();

    // Event listeners
    document.getElementById('themKTHPForm').addEventListener('submit', handleFormSubmit);
    
    // Setup autocomplete cho form chính
    setupAutocomplete('giangVienForm', 'suggestionContainer');

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            document.querySelectorAll('.suggestion-list').forEach(list => list.classList.remove('show'));
        }
    });
});

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        const namHocSelects = document.querySelectorAll('.namHoc');
        namHocSelects.forEach(select => {
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

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        const khoaSelects = document.querySelectorAll('.khoa');
        khoaSelects.forEach(select => {
            if (!select.id.includes('Xem')) {
                select.innerHTML = '<option value="">-- Chọn Khoa --</option>';
                data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.MaPhongBan;
                    option.textContent = dept.TenPhongBan || dept.MaPhongBan;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load danh sách giảng viên (dùng cho autocomplete)
async function loadGiangVienList() {
    try {
        const response = await fetch('/v2/giang-vien-co-huu');
        giangVienList = await response.json();
    } catch (error) {
        console.error('Error loading giang vien:', error);
        giangVienList = [];
    }
}

// Hàm setup autocomplete dùng chung
function setupAutocomplete(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (query.length < 2) {
            container.classList.remove('show');
            return;
        }
        
        const suggestions = giangVienList.filter(gv => {
            const name = gv.HoTen || gv.TenNhanVien || '';
            return name.toLowerCase().includes(query);
        }).slice(0, 10);
        
        if (suggestions.length === 0) {
            container.classList.remove('show');
            return;
        }
        
        container.innerHTML = suggestions.map(gv => {
            const name = gv.HoTen || gv.TenNhanVien || '';
            const mon = gv.MonGiangDayChinh ? ` (${gv.MonGiangDayChinh})` : '';
            return `<div class="suggestion-item" data-name="${name}">${name}${mon}</div>`;
        }).join('');
        
        container.classList.add('show');
        
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.name;
                container.classList.remove('show');
            });
        });
    });

    // Close on blur (with delay)
    input.addEventListener('blur', () => {
        setTimeout(() => {
            container.classList.remove('show');
        }, 200);
    });
}

// Tiêu chuẩn hóa chuỗi (Xử lý khoảng trắng và dấu Tiếng Việt NFC/NFD)
function normalizeString(str) {
    if (!str) return '';
    return str.toString().normalize('NFC').trim();
}

// Kiểm tra xem tên giảng viên có trong danh sách không
function isValidTeacher(name) {
    const normalizedInput = normalizeString(name);
    if (!normalizedInput) return false;

    return giangVienList.some(gv => {
        const listName = normalizeString(gv.HoTen || gv.TenNhanVien || '');
        return listName === normalizedInput;
    });
}

// Form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const giangVien = document.getElementById('giangVienForm').value.trim();
    if (!isValidTeacher(giangVien)) {
        Swal.fire('Lỗi', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'error');
        return;
    }
    
    const formData = {
        namhoc: document.getElementById('namHocForm').value,
        ki: document.getElementById('hocKyForm').value,
        khoa: document.getElementById('khoaForm').value,
        tenhocphan: document.getElementById('tenHPForm').value,
        lophocphan: document.getElementById('lopForm').value,
        hinhthuc: document.getElementById('loaiKTHPForm').value,
        sotietqc: document.getElementById('soTietForm').value,
        ghichu: document.getElementById('ghiChuForm').value,
        giangvien: giangVien
    };

    try {
        const response = await fetch('/v2/vuotgio/them-kthp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            document.getElementById('themKTHPForm').reset();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu', 'error');
    }
}
