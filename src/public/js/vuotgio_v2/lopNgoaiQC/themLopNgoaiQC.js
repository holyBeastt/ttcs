/**
 * Thêm Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2 - Refactored 2026-03-04
 * 
 * Luồng 2 giai đoạn:
 *   1. Nháp: CRUD trên course_schedule_details (class_type='ngoai_quy_chuan')
 *   2. Chốt: Chuyển sang lopngoaiquychuan (chính thức)
 * 
 * Field names sử dụng convention của course_schedule_details:
 *   course_name, course_code, credit_hours, ll_total, student_quantity,
 *   student_bonus, bonus_time, qc, lecturer, major, he_dao_tao, note, ll_code
 */

// =====================================================
// GLOBAL VARIABLES
// =====================================================

var renderData = [];
var khoaArray = [];
let gridApi;
let gridOptions;
let pendingImportData = null;
let heDaoTaoList = [];
let heDaoTaoMap = {};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[LopNgoaiQC] Init - 2-phase draft flow');
    loadNamHocOptions();
    loadKhoaOptions();
    await preloadHeDaoTao();

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
// HELPER - Lấy filter values
// =====================================================

function getFilterValues() {
    return {
        dot: document.getElementById('dotFilter').value || '1',
        ki_hoc: document.getElementById('hocKyFilter').value || '1',
        nam_hoc: document.getElementById('namHocFilter').value,
        major: document.getElementById('khoaFilter').value || 'ALL'
    };
}

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
        select.innerHTML = '<option value="ALL" selected>ALL</option>';

        khoaArray = data.map(d => d.MaPhongBan);

        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            select.appendChild(option);
        });

        // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
        if (typeof KhoaFilterUtils !== 'undefined') {
            KhoaFilterUtils.applyKhoaFilter(select);
        }
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

async function preloadHeDaoTao() {
    const CACHE_KEY = 'HE_DAO_TAO_CACHE';
    heDaoTaoList = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    heDaoTaoMap = {};

    try {
        const res = await fetch('/api/gvm/v1/he-dao-tao');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            heDaoTaoList = json.data.map(item => ({
                id: item.id,
                tenHe: item.he_dao_tao
            }));
            localStorage.setItem(CACHE_KEY, JSON.stringify(heDaoTaoList));
        }
    } catch (err) {
        console.warn('API lỗi, fallback cache', err);
    }

    heDaoTaoList.forEach(item => {
        heDaoTaoMap[item.id] = item.tenHe;
    });
}

// =====================================================
// AG GRID - LOAD & RENDER TABLE
// =====================================================

async function getDataTable() {
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    try {
        if (gridApi) gridApi.showLoadingOverlay();

        // Gọi API nháp mới: /nhap/:Dot/:KiHoc/:NamHoc/:Khoa
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/nhap/${dot}/${ki_hoc}/${nam_hoc}/${major}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Lỗi khi lấy dữ liệu');
        }

        renderData = Array.isArray(data) ? data : (data.data || []);

        if (gridApi) {
            gridApi.setRowData(renderData);
            renderData.length === 0 ? gridApi.showNoRowsOverlay() : gridApi.hideOverlay();
            console.log('♻️ Data updated:', renderData.length, 'rows');
        } else {
            renderTable();
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        if (gridApi) gridApi.hideOverlay();
        Swal.fire('Lỗi', 'Có lỗi xảy ra: ' + error.message, 'error');
    }
}

function renderTable() {
    const rowHeight = 50;

    // Nếu grid đã tồn tại → chỉ cập nhật data (giống TKB)
    if (gridApi) {
        gridApi.setRowData(renderData);
        renderData.length === 0 ? gridApi.showNoRowsOverlay() : gridApi.hideOverlay();
        return;
    }

    // Không có data → hiển thị thông báo
    if (renderData.length === 0) {
        document.getElementById('table-container').innerHTML = "<p class='text-center mt-3'>Không có dữ liệu</p>";
        return;
    }

    // headersMap giống TKB + thêm các cột riêng của lớp ngoài QC
    const headersMap = {
        id: { name: "ID", width: 70 },
        major: { name: "Khoa", width: 100 },
        ll_total: { name: "LL", width: 50 },
        student_quantity: { name: "Số SV", width: 70 },
        student_bonus: { name: "HS lớp đông", width: 100 },
        bonus_time: { name: "HS ngoài giờ", width: 90 },
        course_id: { name: "Mã học phần", width: 100 },
        lecturer: { name: "Giảng viên theo TKB", width: 150 },
        credit_hours: { name: "Số TC", width: 80 },
        course_name: { name: "Lớp học phần", width: 250 },
        course_code: { name: "Mã học phần", width: 100 },
        start_date: { name: "Ngày bắt đầu", width: 110 },
        end_date: { name: "Ngày kết thúc", width: 110 },
        ll_code: { name: "Tiết CTĐT", width: 90 },
        qc: { name: "QC", width: 70 },
        he_dao_tao: { name: "Hệ đào tạo", width: 150 },
    };

    // Dynamic column generation từ data (giống TKB)
    const columnDefs = [
        {
            headerName: 'STT',
            field: 'stt',
            valueGetter: (params) => params.node.rowIndex + 1,
            width: 80, editable: false,
            cellStyle: { fontWeight: 'bold', textAlign: 'center' }
        },
        ...Object.keys(renderData[0])
            .filter(key => key !== "GhiChu" && key !== "description")
            .map(key => ({
                field: key,
                headerName: headersMap[key]?.name || key,
                width: headersMap[key]?.width || 100,
                editable: key !== "student_bonus" && key !== "id",
                hide: key === "id" || key === "tt" || key === "course_id"
                    || key === 'dot' || key === 'ki_hoc' || key === 'nam_hoc' || key === 'note',
                headerClass: 'custom-header',
                filter: false,

                valueGetter: (params) => {
                    const field = params.colDef.field;
                    if (field === "start_date" || field === "end_date") {
                        const value = params.data[field];
                        if (!value) return "";
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
                        return reFormatDateFromDB(value);
                    }
                    return params.data[field];
                },

                valueSetter: (params) => {
                    const field = params.colDef.field;
                    const oldValue = params.data[field];
                    const rawValue = params.newValue;
                    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

                    // Xử lý riêng cho cột ngày (giống TKB)
                    if (field === "start_date" || field === "end_date") {
                        if (!value) return false;
                        const parts = value.split("/");
                        if (parts.length === 3) {
                            const day = parts[0].padStart(2, "0");
                            const month = parts[1].padStart(2, "0");
                            const year = parts[2];
                            const formattedIsoDate = `${year}-${month}-${day}`;
                            const date = new Date(formattedIsoDate);
                            if (!isNaN(date.getTime())) {
                                params.data[field] = formattedIsoDate;
                                return true;
                            }
                        }
                        Toastify({
                            text: "Ngày không hợp lệ! Vui lòng kiểm tra lại (dd/mm/yyyy)",
                            duration: 3000,
                            gravity: "top",
                            position: "right",
                            stopOnFocus: true,
                            backgroundColor: "#FF5252",
                        }).showToast();
                        params.data[field] = oldValue;
                        return false;
                    }

                    // Xử lý các cột khác
                    if (value !== oldValue) {
                        params.data[field] = value;
                        return true;
                    }
                    return false;
                },

                cellEditor: "agTextCellEditor",
                cellEditorParams: { useFormatter: true },
            })),
    ];

    // Gắn combobox cho cột Khoa
    const khoaCol = columnDefs.find(col => col.field === "major");
    if (khoaCol) {
        khoaCol.cellEditor = "agSelectCellEditor";
        khoaCol.cellEditorParams = { values: khoaArray };
    }

    // Gắn combobox cho cột Hệ đào tạo
    const heDaoTaoCol = columnDefs.find(col => col.field === "he_dao_tao");
    if (heDaoTaoCol) {
        heDaoTaoCol.cellEditor = "agSelectCellEditor";
        heDaoTaoCol.cellEditorParams = {
            values: heDaoTaoList.map(item => item.id),
        };
        heDaoTaoCol.valueFormatter = (params) => heDaoTaoMap[params.value] || "";
    }

    // Format QC 2 chữ số thập phân
    const qcCol = columnDefs.find(col => col.field === "qc");
    if (qcCol) {
        qcCol.valueFormatter = params => {
            const val = parseFloat(params.value);
            return isNaN(val) ? '' : val.toFixed(2);
        };
    }

    // Push cột Ghi chú (giống TKB)
    columnDefs.push({
        headerName: 'Ghi chú',
        field: 'note',
        width: 150, editable: true,
        headerClass: 'custom-header',
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        cellEditorParams: {
            maxLength: 400,
            rows: 6,
            cols: 40,
        }
    });

    // Push cột Xóa
    columnDefs.push({
        headerName: 'Xóa',
        field: 'actions',
        width: 60, editable: false,
        cellRenderer: function (params) {
            if (!params.data || !params.data.id) return '';
            const btn = document.createElement('button');
            btn.textContent = 'Xóa';
            btn.addEventListener('click', () => deleteRow(params.data));
            return btn;
        }
    });

    gridOptions = {
        columnDefs: columnDefs,
        rowData: renderData,
        getRowId: params => params.data.id,
        rowHeight: rowHeight,
        defaultColDef: {
            sortable: true,
            filter: false,
            resizable: true,
            suppressMenu: true,
            editable: false,
            cellStyle: {
                fontSize: "14px",
                whiteSpace: "normal",
                wordWrap: "break-word",
                textAlign: "center",
            },
        },
        animateRows: true,
        singleClickEdit: true,
        enterMovesDownAfterEdit: true,
        suppressClickEdit: false,
        stopEditingWhenCellsLoseFocus: true,
        overlayNoRowsTemplate: '<span style="padding: 10px;">Không có dữ liệu. Hãy chọn bộ lọc và nhấn "Hiển thị"</span>',
        onCellValueChanged: onCellValueChanged,
        onGridReady: (params) => {
            gridApi = params.api;
            params.api.sizeColumnsToFit();
        }
    };

    const container = document.getElementById('table-container');
    container.innerHTML = '';
    new agGrid.Grid(container, gridOptions);
    gridApi = gridOptions.api;

    if (renderData.length === 0) {
        gridApi.showNoRowsOverlay();
    }

    console.log('✅ AG Grid initialized with', renderData.length, 'rows');
}

// Helper format ngày từ DB (giống TKB)
function reFormatDateFromDB(input) {
    if (!input) return "";
    const date = new Date(input);
    if (isNaN(date.getTime())) return input;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// =====================================================
// INLINE EDIT → SAVE TO DB
// =====================================================

async function onCellValueChanged(event) {
    const data = event.data;

    // Cần có id để xác định dòng
    if (!data.id) return;

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/edit', {
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
// DELETE ROW (theo tt, giống TKB)
// =====================================================

async function deleteRow(rowData) {
    const confirmResult = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: `Xóa dòng: ${rowData.course_name || ''} - ${rowData.lecturer || ''}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const params = new URLSearchParams({
            id: rowData.id,
            dot: rowData.dot,
            ki_hoc: rowData.ki_hoc,
            nam_hoc: rowData.nam_hoc
        });

        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/row?${params}`, {
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
            gridApi.applyTransaction({ remove: [{ id: rowData.id }] });
            renderData = renderData.filter(r => r.id !== rowData.id);
            // Refresh để cập nhật lại STT sau khi xóa dòng
            gridApi.refreshCells({ force: true });
        } else {
            Swal.fire('Lỗi', result.message || 'Xóa thất bại', 'error');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// =====================================================
// DELETE ALL (nháp)
// =====================================================

async function handleDeleteAll() {
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'Xác nhận xóa toàn bộ?',
        html: `Xóa tất cả dữ liệu lớp ngoài QC:<br>
               <b>Đợt:</b> ${dot}<br>
               <b>Kì:</b> ${ki_hoc}<br>
               <b>Năm học:</b> ${nam_hoc}<br>
               <b>Khoa:</b> ${major || 'Tất cả'}`,
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
            body: JSON.stringify({ nam_hoc, ki_hoc, dot, major })
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
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học trước khi thêm dòng', 'error');
        return;
    }

    const newRow = {
        nam_hoc: nam_hoc,
        ki_hoc: ki_hoc || '1',
        dot: dot || '1',
        course_name: '',
        course_code: '',
        credit_hours: 0,
        ll_total: 0,
        student_quantity: 0,
        ll_code: 0,
        bonus_time: 1,
        student_bonus: 1,
        qc: 0,
        note: '',
        lecturer: '',
        major: major !== 'ALL' ? major : '',
        he_dao_tao: '',
        course_id: ''
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

// Gắn sự kiện chọn file -> tự động import luôn
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleImportFile);
    }
});

async function handleImportFile() {
    const fileInput = document.getElementById('fileInput');
    const { dot, ki_hoc, nam_hoc } = getFilterValues();

    if (!fileInput.files || fileInput.files.length === 0) {
        return;
    }

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        fileInput.value = '';
        return;
    }

    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('NamHoc', nam_hoc);
    formData.append('HocKy', ki_hoc || '1');
    formData.append('Dot', dot || '1');

    try {
        Swal.fire({
            title: 'Đang xử lý...',
            text: 'Đang đọc và import file Excel',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch('/v2/vuotgio/lop-ngoai-qc/parse-excel', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            Swal.close();
            Swal.fire('Lỗi', result.message, 'error');
            fileInput.value = '';
            return;
        }

        pendingImportData = result.data;
        console.log(`[LopNgoaiQC] Parsed ${pendingImportData.length} rows from file`);

        // Import trực tiếp không cần xác nhận
        await confirmImport(false);
        fileInput.value = '';
    } catch (error) {
        Swal.close();
        console.error('Error importing:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi đọc file: ' + error.message, 'error');
        fileInput.value = '';
    }
}

// =====================================================
// IMPORT MODAL
// =====================================================

function showImportModal(message) {
    const modal = document.getElementById('import-modal');
    document.getElementById('import-modal-message').textContent = message;
    modal.style.display = 'block';

    document.getElementById('btn-import-delete').onclick = async () => {
        modal.style.display = 'none';
        await confirmImport(true);
    };

    document.getElementById('btn-import-append').onclick = async () => {
        modal.style.display = 'none';
        await confirmImport(false);
    };

    document.getElementById('btn-import-cancel').onclick = () => {
        modal.style.display = 'none';
        pendingImportData = null;
        getDataTable();
    };
}

async function confirmImport(deleteOld) {
    if (!pendingImportData || pendingImportData.length === 0) {
        Swal.fire('Lỗi', 'Không có dữ liệu để import', 'error');
        return;
    }

    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    try {
        Swal.fire({
            title: 'Đang import...',
            text: 'Vui lòng chờ',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        // Xóa nháp cũ nếu cần
        if (deleteOld) {
            const deleteResponse = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/all', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nam_hoc, ki_hoc: ki_hoc || '1', dot: dot || '1', major })
            });
            const deleteResult = await deleteResponse.json();
            console.log('[LopNgoaiQC] Deleted old draft:', deleteResult.message);
        }

        // Lấy data hiện tại từ Grid (user có thể đã edit inline)
        const currentData = [];
        if (gridApi) {
            gridApi.forEachNode(node => {
                if (node.data) currentData.push(node.data);
            });
        }
        const dataToImport = currentData.length > 0 ? currentData : pendingImportData;

        // Insert vào course_schedule_details (nháp)
        const response = await fetch('/v2/vuotgio/lop-ngoai-qc/confirm-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                records: dataToImport,
                dot: dot || '1',
                ki_hoc: ki_hoc || '1',
                nam_hoc: nam_hoc
            })
        });

        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            pendingImportData = null;
            document.getElementById('fileInput').value = '';
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        Swal.close();
        console.error('Error confirming import:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra: ' + error.message, 'error');
    }
}

// =====================================================
// CONFIRM TO MAIN (Chốt Danh Sách)
// =====================================================

async function handleConfirmToMain() {
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'Ban hành?',
        html: `
               <b>Đợt:</b> ${dot}<br>
               <b>Kì:</b> ${ki_hoc}<br>
               <b>Năm học:</b> ${nam_hoc}<br>
               <b>Khoa:</b> ${major || 'Tất cả'}<br><br>
               <em>Sau khi ban hành, dữ liệu sẽ chuyển sang "Danh sách lớp ngoài QC" để duyệt.</em>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f0ad4e',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        Swal.fire({
            title: 'Đang chốt...',
            text: 'Vui lòng chờ',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dot, ki_hoc, nam_hoc, major })
        });

        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            getDataTable(); // Reload → nháp sẽ trống (da_luu = 1)
        } else {
            Swal.fire('Lỗi', result.message || 'Chốt thất bại', 'error');
        }
    } catch (error) {
        Swal.close();
        console.error('Error confirming to main:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra: ' + error.message, 'error');
    }
}
