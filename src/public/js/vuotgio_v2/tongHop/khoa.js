/**
 * Tổng hợp theo Khoa - Frontend JS
 * VuotGio V2
 */

let gridApi = null;

// Column Definitions
const columnDefs = [
    { headerName: 'STT', valueGetter: 'node.rowIndex + 1', width: 60 },
    { field: 'MaKhoa', headerName: 'Mã khoa', width: 100 },
    { field: 'TenKhoa', headerName: 'Tên khoa', width: 250, flex: 1 },
    { field: 'SoGiangVien', headerName: 'Số GV', width: 100, type: 'numericColumn' },
    { field: 'TongSoTietThucHien', headerName: 'Thực hiện', width: 120, type: 'numericColumn',
        valueFormatter: params => formatNumber(params.value)
    },
    { field: 'TongSoTietDinhMuc', headerName: 'Định mức', width: 120, type: 'numericColumn',
        valueFormatter: params => formatNumber(params.value)
    },
    { field: 'TongSoTietThieuNCKH', headerName: 'Thiếu NCKH', width: 120, type: 'numericColumn',
        valueFormatter: params => formatNumber(params.value),
        cellStyle: params => params.value > 0 ? { color: 'red', fontWeight: 'bold' } : null
    },
    { field: 'TongSoTietVuotGio', headerName: 'Vượt giờ', width: 120, type: 'numericColumn',
        valueFormatter: params => formatNumber(params.value),
        cellStyle: params => params.value > 0 ? { color: 'green', fontWeight: 'bold' } : null
    },
    {
        headerName: 'Thao tác',
        width: 120,
        cellRenderer: params => {
            return `
                <button class="btn btn-sm btn-info" onclick="viewDepartmentDetail('${params.data.MaKhoa}')" title="Xem chi tiết">
                    <i class="fas fa-eye"></i> Chi tiết
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
    pinnedBottomRowData: [],
    getRowStyle: params => {
        if (params.node.rowPinned) {
            return { fontWeight: 'bold', backgroundColor: '#e9ecef' };
        }
        return null;
    },
    onGridReady: params => {
        gridApi = params.api;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[tongHopKhoa] DOMContentLoaded fired');
    
    // Init AG Grid
    const gridDiv = document.querySelector('#gridContainer');
    console.log('[tongHopKhoa] gridDiv:', gridDiv);
    new agGrid.Grid(gridDiv, gridOptions);
    gridApi = gridOptions.api;
    console.log('[tongHopKhoa] AG Grid initialized');

    // Load options
    loadNamHocOptions();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);

    // Initial load - disabled
    // setTimeout(loadData, 500);
});

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[tongHopKhoa] loadNamHocOptions called');
    try {
        console.log('[tongHopKhoa] Fetching /api/namhoc...');
        const response = await fetch('/api/namhoc');
        console.log('[tongHopKhoa] Response status:', response.status);
        const data = await response.json();
        console.log('[tongHopKhoa] NamHoc data:', data);
        
        const select = document.getElementById('namHoc');
        console.log('[tongHopKhoa] Found namHoc select:', select);
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
    } catch (error) {
        console.error('Error loading nam hoc:', error);
        const currentYear = new Date().getFullYear();
        const select = document.getElementById('namHoc');
        select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
    }
}

// Format number
function formatNumber(val) {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHoc').value;
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        gridApi.showLoadingOverlay();
        
        const response = await fetch(`/v2/vuotgio/tong-hop/khoa?namHoc=${namHoc}`);
        const data = await response.json();
        
        gridApi.setRowData(data);
        
        // Calculate totals
        const totals = {
            MaKhoa: '',
            TenKhoa: 'TỔNG CỘNG',
            SoGiangVien: data.reduce((sum, r) => sum + (r.SoGiangVien || 0), 0),
            TongSoTietThucHien: data.reduce((sum, r) => sum + (r.TongSoTietThucHien || 0), 0),
            TongSoTietDinhMuc: data.reduce((sum, r) => sum + (r.TongSoTietDinhMuc || 0), 0),
            TongSoTietThieuNCKH: data.reduce((sum, r) => sum + (r.TongSoTietThieuNCKH || 0), 0),
            TongSoTietVuotGio: data.reduce((sum, r) => sum + (r.TongSoTietVuotGio || 0), 0)
        };
        
        gridApi.setPinnedBottomRowData([totals]);
        
        // Update summary cards
        document.getElementById('totalDepartments').textContent = data.length;
        document.getElementById('totalTeachers').textContent = totals.SoGiangVien;
        document.getElementById('totalThucHien').textContent = formatNumber(totals.TongSoTietThucHien);
        document.getElementById('totalVuotGio').textContent = formatNumber(totals.TongSoTietVuotGio);
        
        // Render department cards
        renderDepartmentCards(data);
        
        if (data.length === 0) {
            gridApi.showNoRowsOverlay();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
    }
}

// Render department cards
function renderDepartmentCards(data) {
    const container = document.getElementById('departmentCards');
    if (!container) return;
    
    container.innerHTML = data.map(dept => `
        <div class="col-md-4 col-lg-3">
            <div class="card department-card h-100">
                <div class="card-header bg-primary text-white">
                    <h6 class="mb-0">${dept.TenKhoa || dept.MaKhoa}</h6>
                </div>
                <div class="card-body">
                    <ul class="list-unstyled mb-0">
                        <li><i class="fas fa-users text-muted"></i> Giảng viên: <strong>${dept.SoGiangVien}</strong></li>
                        <li><i class="fas fa-clock text-info"></i> Thực hiện: <strong>${formatNumber(dept.TongSoTietThucHien)}</strong></li>
                        <li><i class="fas fa-minus-circle text-warning"></i> Định mức: <strong>${formatNumber(dept.TongSoTietDinhMuc)}</strong></li>
                        <li><i class="fas fa-exclamation-triangle text-danger"></i> Thiếu NCKH: <strong class="text-danger">${formatNumber(dept.TongSoTietThieuNCKH)}</strong></li>
                        <li><i class="fas fa-plus-circle text-success"></i> Vượt giờ: <strong class="text-success">${formatNumber(dept.TongSoTietVuotGio)}</strong></li>
                    </ul>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline-primary w-100" onclick="viewDepartmentDetail('${dept.MaKhoa}')">
                        <i class="fas fa-eye"></i> Xem chi tiết
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// View department detail - redirect to GV page with filter
function viewDepartmentDetail(maKhoa) {
    const namHoc = document.getElementById('namHoc').value;
    window.location.href = `/v2/vuotgio/tong-hop-giang-vien?namHoc=${namHoc}&khoa=${maKhoa}`;
}
