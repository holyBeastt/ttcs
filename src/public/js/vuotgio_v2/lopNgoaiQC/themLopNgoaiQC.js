/**
 * Thêm Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2 - Refactored (giống module TKB)
 * 
 * Chức năng:
 * - Import file Excel (cùng format TKB)
 * - Xem bảng AG Grid
 * - Sửa inline, xóa dòng, thêm dòng mới
 */

// =====================================================
// GLOBAL VARIABLES
// =====================================================

var renderData = [];
var khoaArray = [];
let gridApi;
let gridOptions;
let pendingImportData = null; // Data đang chờ confirm import

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('[LopNgoaiQC] Init');
    loadNamHocOptions();
    loadKhoaOptions();

    // Search box
    const searchInput = document.getElementById('find-by-name');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            if (gridApi) {
                gridApi.setQuickFilter(this.value);
            }
        });
    }
});

// =====================================================
// LOAD DROPDOWN OPTIONS
// =====================================================

async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        const select = document.getElementById('namHocFilter');
        select.innerHTML = '<option value="">Chọn năm học</option>';

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.NamHoc;
            option.textContent = item.NamHoc;
            if (item.trangthai === 1) option.selected = true;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        const select = document.getElementById('khoaFilter');
        select.innerHTML = '<option value="">Chọn khoa</option>';

        khoaArray = data.map(d => d.MaPhongBan);

        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// =====================================================
// AG GRID - LOAD & RENDER TABLE
// =====================================================

async function getDataTable() {
    const NamHoc = document.getElementById('namHocFilter').value;
    const Khoa = document.getElementById('khoaFilter').value;

    if (!NamHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    try {
        if (gridApi) gridApi.showLoadingOverlay();

        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/${NamHoc}/${Khoa || 'ALL'}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Lỗi khi lấy dữ liệu');
        }

        renderData = Array.isArray(data) ? data : (data.data || []);

        if (gridApi) {
            gridApi.setRowData(renderData);
            if (renderData.length === 0) {
                gridApi.showNoRowsOverlay();
            } else {
                gridApi.hideOverlay();
            }
            console.log('♻️ Data updated via AG Grid API');
        } else {
            renderTable();
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        if (gridApi) gridApi.hideOverlay();
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi gọi API: ' + error.message, 'error');
    }
}

function renderTable() {
    const rowHeight = 50;

    if (gridApi) {
        gridApi.setRowData(renderData);
        if (renderData.length === 0) {
            gridApi.showNoRowsOverlay();
        } else {
            gridApi.hideOverlay();
        }
        return;
    }

    const columnDefs = [
        {
            headerName: 'STT',
            valueGetter: 'node.rowIndex + 1',
            width: 60,
            pinned: 'left',
            editable: false,
            headerClass: 'custom-header'
        },
        {
            headerName: 'Giảng viên',
            field: 'GiangVien',
            width: 170,
            editable: true,
            pinned: 'left',
            headerClass: 'custom-header'
        },
        {
            headerName: 'Tên học phần',
            field: 'TenHocPhan',
            width: 220,
            editable: true,
            headerClass: 'custom-header'
        },
        {
            headerName: 'Mã HP',
            field: 'MaHocPhan',
            width: 90,
            editable: true,
            headerClass: 'custom-header'
        },
        {
            headerName: 'Số TC',
            field: 'SoTC',
            width: 70,
            editable: true,
            headerClass: 'custom-header',
            type: 'numericColumn'
        },
        {
            headerName: 'Lớp',
            field: 'Lop',
            width: 100,
            editable: true,
            headerClass: 'custom-header'
        },
        {
            headerName: 'Lên lớp',
            field: 'LenLop',
            width: 80,
            editable: true,
            headerClass: 'custom-header',
            type: 'numericColumn'
        },
        {
            headerName: 'Số SV',
            field: 'SoSV',
            width: 80,
            editable: true,
            headerClass: 'custom-header',
            type: 'numericColumn'
        },
        {
            headerName: 'Tiết CTĐT',
            field: 'SoTietCTDT',
            width: 90,
            editable: true,
            headerClass: 'custom-header',
            type: 'numericColumn'
        },
        {
            headerName: 'HS T7CN',
            field: 'HeSoT7CN',
            width: 90,
            editable: true,
            headerClass: 'custom-header',
            type: 'numericColumn'
        },
        {
            headerName: 'HS Lớp đông',
            field: 'HeSoLopDong',
            width: 110,
            editable: true,
            headerClass: 'custom-header',
            type: 'numericColumn'
        },
        {
            headerName: 'Quy chuẩn',
            field: 'QuyChuan',
            width: 100,
            editable: true,
            headerClass: 'custom-header',
            type: 'numericColumn',
            valueFormatter: params => {
                const val = parseFloat(params.value);
                return isNaN(val) ? '' : val.toFixed(2);
            }
        },
        {
            headerName: 'Khoa',
            field: 'Khoa',
            width: 100,
            editable: true,
            headerClass: 'custom-header'
        },
        {
            headerName: 'Hệ ĐT',
            field: 'he_dao_tao',
            width: 80,
            editable: true,
            headerClass: 'custom-header'
        },
        {
            headerName: 'Ghi chú',
            field: 'GhiChu',
            width: 150,
            editable: true,
            headerClass: 'custom-header'
        },
        {
            headerName: 'Xóa',
            width: 70,
            editable: false,
            pinned: 'right',
            headerClass: 'custom-header',
            cellRenderer: function (params) {
                if (!params.data || !params.data.ID) return '';
                const btn = document.createElement('button');
                btn.innerHTML = '<i class="bi bi-trash" style="color: red;"></i>';
                btn.style.cssText = 'border: none; background: transparent; cursor: pointer;';
                btn.addEventListener('click', () => deleteRow(params.data.ID));
                return btn;
            }
        }
    ];

    gridOptions = {
        columnDefs: columnDefs,
        rowData: renderData,
        rowHeight: rowHeight,
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true,
            suppressMenu: true,
        },
        animateRows: true,
        singleClickEdit: true,
        stopEditingWhenCellsLoseFocus: true,
        overlayNoRowsTemplate: '<span style="padding: 10px;">Không có dữ liệu. Hãy chọn bộ lọc và nhấn "Hiển thị"</span>',
        onCellValueChanged: onCellValueChanged,
    };

    // Clear the static table and init AG Grid
    const container = document.getElementById('table-container');
    container.innerHTML = '';
    new agGrid.Grid(container, gridOptions);
    gridApi = gridOptions.api;

    if (renderData.length === 0) {
        gridApi.showNoRowsOverlay();
    }

    console.log('✅ AG Grid initialized with', renderData.length, 'rows');
}

// =====================================================
// INLINE EDIT → SAVE TO DB
// =====================================================

async function onCellValueChanged(event) {
    const data = event.data;

    // Nếu là dòng mới (chưa có ID) → bỏ qua, chờ user save
    if (!data.ID) return;

    try {
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/edit/${data.ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            Toastify({
                text: "Đã cập nhật",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
            }).showToast();
        } else {
            Swal.fire('Lỗi', result.message || 'Cập nhật thất bại', 'error');
        }
    } catch (error) {
        console.error('Error saving edit:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu', 'error');
    }
}

// =====================================================
// DELETE ROW
// =====================================================

async function deleteRow(id) {
    const confirmResult = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: 'Bạn có chắc muốn xóa dòng này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
            Toastify({
                text: "Đã xóa",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
            }).showToast();
            // Reload data
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message || 'Xóa thất bại', 'error');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// =====================================================
// DELETE ALL
// =====================================================

async function handleDeleteAll() {
    const NamHoc = document.getElementById('namHocFilter').value;
    const HocKy = document.getElementById('hocKyFilter').value;
    const Khoa = document.getElementById('khoaFilter').value;

    if (!NamHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'Xác nhận xóa toàn bộ?',
        html: `Xóa tất cả dữ liệu lớp ngoài QC:<br>
               <b>Năm học:</b> ${NamHoc}<br>
               <b>Kì:</b> ${HocKy || 'Tất cả'}<br>
               <b>Khoa:</b> ${Khoa || 'Tất cả'}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Xóa toàn bộ',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/all', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ NamHoc, HocKy, Khoa })
        });
        const result = await response.json();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message || 'Xóa thất bại', 'error');
        }
    } catch (error) {
        console.error('Error deleting all:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// =====================================================
// ADD NEW ROW
// =====================================================

async function addNewRow() {
    const NamHoc = document.getElementById('namHocFilter').value;
    const HocKy = document.getElementById('hocKyFilter').value;

    if (!NamHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học trước khi thêm dòng', 'error');
        return;
    }

    // Tạo dòng mới với data mặc định
    const newRow = {
        NamHoc: NamHoc,
        HocKy: HocKy || '1',
        TenHocPhan: '',
        MaHocPhan: '',
        SoTC: 0,
        Lop: '',
        LenLop: 0,
        SoSV: 0,
        SoTietCTDT: 0,
        SoTietKT: 0,
        HeSoT7CN: 1,
        HeSoLopDong: 1,
        QuyChuan: 0,
        GhiChu: '',
        GiangVien: '',
        Khoa: document.getElementById('khoaFilter').value || '',
        he_dao_tao: '',
        HoanThanh: 0
    };

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRow)
        });

        const result = await response.json();

        if (result.success) {
            Toastify({
                text: "Đã thêm dòng mới",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
            }).showToast();
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message || 'Thêm dòng thất bại', 'error');
        }
    } catch (error) {
        console.error('Error adding row:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi thêm dòng', 'error');
    }
}

// =====================================================
// FILE IMPORT
// =====================================================

async function handleImportFile() {
    const fileInput = document.getElementById('fileInput');
    const NamHoc = document.getElementById('namHocFilter').value;
    const HocKy = document.getElementById('hocKyFilter').value;

    if (!fileInput.files || fileInput.files.length === 0) {
        Swal.fire('Lỗi', 'Vui lòng chọn file Excel', 'error');
        return;
    }

    if (!NamHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    const file = fileInput.files[0];

    // 1. Parse file trên server
    const formData = new FormData();
    formData.append('file', file);
    formData.append('NamHoc', NamHoc);
    formData.append('HocKy', HocKy || '1');

    try {
        Swal.fire({
            title: 'Đang xử lý...',
            text: 'Đang đọc file Excel',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch('/v2/vuotgio/lop-ngoai-qc/parse-excel', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        Swal.close();

        if (!result.success) {
            Swal.fire('Lỗi', result.message, 'error');
            return;
        }

        pendingImportData = result.data;
        console.log(`[LopNgoaiQC] Parsed ${pendingImportData.length} rows from file`);

        // 2. Hiển thị preview trên AG Grid
        renderData = pendingImportData;
        if (gridApi) {
            gridApi.setRowData(renderData);
            gridApi.hideOverlay();
        } else {
            renderTable();
        }

        // 3. Kiểm tra dữ liệu đã tồn tại chưa
        const checkResponse = await fetch('/v2/vuotgio/lop-ngoai-qc/check-data-exist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ NamHoc, HocKy: HocKy || '1' })
        });
        const checkResult = await checkResponse.json();

        if (checkResult.exists) {
            // Hiện modal xóa/chèn/hủy
            showImportModal(`Đã có ${checkResult.count} dòng dữ liệu cho năm ${NamHoc}${HocKy ? ', kì ' + HocKy : ''}. Bạn muốn:`);
        } else {
            // Không có data cũ → confirm luôn
            const confirmResult = await Swal.fire({
                title: 'Xác nhận import?',
                text: `Import ${pendingImportData.length} dòng vào cơ sở dữ liệu?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Import',
                cancelButtonText: 'Hủy'
            });

            if (confirmResult.isConfirmed) {
                await confirmImport(false);
            }
        }
    } catch (error) {
        Swal.close();
        console.error('Error importing:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi đọc file: ' + error.message, 'error');
    }
}

// =====================================================
// IMPORT MODAL
// =====================================================

function showImportModal(message) {
    const modal = document.getElementById('import-modal');
    document.getElementById('import-modal-message').textContent = message;
    modal.style.display = 'block';

    // Button handlers
    document.getElementById('btn-import-delete').onclick = async () => {
        modal.style.display = 'none';
        await confirmImport(true); // Xóa cũ trước
    };

    document.getElementById('btn-import-append').onclick = async () => {
        modal.style.display = 'none';
        await confirmImport(false); // Chèn thêm
    };

    document.getElementById('btn-import-cancel').onclick = () => {
        modal.style.display = 'none';
        pendingImportData = null;
        // Reload data gốc
        getDataTable();
    };
}

async function confirmImport(deleteOld) {
    if (!pendingImportData || pendingImportData.length === 0) {
        Swal.fire('Lỗi', 'Không có dữ liệu để import', 'error');
        return;
    }

    const NamHoc = document.getElementById('namHocFilter').value;
    const HocKy = document.getElementById('hocKyFilter').value;

    try {
        Swal.fire({
            title: 'Đang import...',
            text: 'Vui lòng chờ',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        // Xóa dữ liệu cũ nếu cần
        if (deleteOld) {
            const deleteResponse = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/all', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ NamHoc, HocKy: HocKy || '1' })
            });
            const deleteResult = await deleteResponse.json();
            console.log('[LopNgoaiQC] Deleted old data:', deleteResult.message);
        }

        // Lấy data hiện tại từ AG Grid (user có thể đã edit inline)
        const currentData = [];
        if (gridApi) {
            gridApi.forEachNode(node => {
                if (node.data) currentData.push(node.data);
            });
        }
        const dataToImport = currentData.length > 0 ? currentData : pendingImportData;

        // Insert data
        const response = await fetch('/v2/vuotgio/lop-ngoai-qc/confirm-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: dataToImport })
        });

        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            pendingImportData = null;
            // Reset file input
            document.getElementById('fileInput').value = '';
            // Reload from DB
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        Swal.close();
        console.error('Error confirming import:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi import: ' + error.message, 'error');
    }
}
