/**
 * NCKH V2 - Đề Tài Dự Án - Grid Module
 * Xử lý AG-Grid table rendering và các thao tác trên grid
 */

(function () {
    'use strict';

    // =====================================================
    // MODULE VARIABLES
    // =====================================================
    let gridApi = null;
    let gridOptions = null;
    let localData = [];
    let currentYear = "";

    // =====================================================
    // LOAD TABLE DATA
    // =====================================================

    async function loadTableData() {
        const namHoc = document.getElementById("namHocXem").value;
        currentYear = namHoc;

        // Xác định khoa dựa trên quyền
        const MaPhongBan = localStorage.getItem("MaPhongBan");
        let khoa = "ALL";

        // Kiểm tra APP_DEPARTMENTS có tồn tại không
        const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
        const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
        const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";

        if (MaPhongBan !== daoTaoCode && MaPhongBan !== ncHtptCode) {
            khoa = MaPhongBan;
        }

        // Encode URL parameters to handle spaces and special characters
        const encodedNamHoc = encodeURIComponent(namHoc);
        const encodedKhoa = encodeURIComponent(khoa);

        console.log("Loading table data...");
        console.log("Năm học:", namHoc);
        console.log("Khoa:", khoa);
        console.log("API URL:", `/v2/de-tai-du-an/${encodedNamHoc}/${encodedKhoa}`);

        try {
            if (gridApi) gridApi.showLoadingOverlay();

            const response = await fetch(`/v2/de-tai-du-an/${encodedNamHoc}/${encodedKhoa}`);
            console.log("Response status:", response.status);

            const data = await response.json();
            console.log("Data received:", data);
            console.log("Number of records:", data.length);

            localData = data;

            if (gridApi) {
                gridApi.setRowData(localData);
                if (localData.length === 0) {
                    gridApi.showNoRowsOverlay();
                } else {
                    gridApi.hideOverlay();
                }
            } else {
                renderTable();
            }
        } catch (error) {
            console.error("Error loading table data:", error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi tải dữ liệu");
        }
    }

    // =====================================================
    // AG-GRID TABLE RENDERING
    // =====================================================

    function renderTable() {
        const role = localStorage.getItem("userRole");
        const MaPhongBan = localStorage.getItem("MaPhongBan");

        // Kiểm tra APP_DEPARTMENTS và APP_ROLES có tồn tại không
        const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
        const APP_ROLES = window.APP_ROLES || {};

        console.log("=== DEBUG PERMISSIONS ===");
        console.log("User Role:", role);
        console.log("MaPhongBan:", MaPhongBan);
        console.log("APP_DEPARTMENTS:", APP_DEPARTMENTS);
        console.log("APP_ROLES:", APP_ROLES);

        const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";
        const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
        const troLyPhongRole = APP_ROLES.troLy_phong || "tro_ly_phong";
        const lanhDaoPhongRole = APP_ROLES.lanhDao_phong || "lanh_dao_phong";
        const gvCnbmKhoaRole = APP_ROLES.gv_cnbm_khoa || "gv_cnbm_khoa";
        const lanhDaoKhoaRole = APP_ROLES.lanhDao_khoa || "lanh_dao_khoa";
        const gvRole = APP_ROLES.gv || "gv";
        const thuongRole = APP_ROLES.thuong || "thuong";

        console.log("ncHtptCode:", ncHtptCode);
        console.log("daoTaoCode:", daoTaoCode);
        console.log("lanhDaoPhongRole:", lanhDaoPhongRole);
        console.log("role === lanhDaoPhongRole:", role === lanhDaoPhongRole);
        console.log("MaPhongBan === ncHtptCode:", MaPhongBan === ncHtptCode);
        console.log("MaPhongBan === daoTaoCode:", MaPhongBan === daoTaoCode);

        // Quyền duyệt: troLy_phong hoặc lanhDao_phong thuộc phòng NC&HTPT hoặc Đào Tạo
        const canApprove = (role === troLyPhongRole || role === lanhDaoPhongRole) &&
            (MaPhongBan === ncHtptCode || MaPhongBan === daoTaoCode);

        // Quyền sửa: canApprove HOẶC gv_cnbm_khoa HOẶC lanhDao_khoa (không cần check phòng ban)
        const canEdit = canApprove ||
            role === gvCnbmKhoaRole ||
            role === lanhDaoKhoaRole;

        // Quyền xóa: giống canEdit
        const canDelete = canEdit;

        // User chỉ xem
        const isViewOnly = !canEdit;

        console.log("=== PERMISSIONS RESULT ===");
        console.log("canApprove:", canApprove);
        console.log("canEdit:", canEdit);
        console.log("canDelete:", canDelete);
        console.log("isViewOnly:", isViewOnly);
        console.log("========================");

        const columnDefs = [
            {
                headerName: "STT",
                valueGetter: (params) => params.node.rowIndex + 1,
                width: 70,
                editable: false,
                cellStyle: { textAlign: "center", fontWeight: "bold" }
            },
            {
                field: "CapDeTai",
                headerName: "Cấp Đề Tài",
                flex: 1,
                minWidth: 150,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
            },
            {
                field: "TenDeTai",
                headerName: "Tên Đề Tài",
                flex: 2,
                minWidth: 250,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
            },
            {
                field: "ChuNhiem",
                headerName: "Chủ Nhiệm",
                flex: 1.2,
                minWidth: 150,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
            },
            {
                field: "DanhSachThanhVien",
                headerName: "Thành Viên",
                flex: 1.5,
                minWidth: 200,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
            },
            {
                headerName: "Chi Tiết",
                width: 60,
                editable: false,
                cellRenderer: (params) => {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-eye";
                    icon.style.cursor = "pointer";
                    icon.style.color = "#0dcaf0";
                    icon.style.fontSize = "16px";
                    icon.title = "Xem chi tiết";
                    icon.onclick = () => DeTaiDuAn_Modal.showDetailModal(params.data);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            }
        ];

        // Cột Xóa - chỉ hiện nếu có quyền xóa
        if (canDelete) {
            columnDefs.push({
                headerName: "Xóa",
                width: 60,
                editable: false,
                cellRenderer: (params) => {
                    // Không hiện icon xóa nếu đã duyệt
                    if (params.data.DaoTaoDuyet === 1) return "";

                    const icon = document.createElement("i");
                    icon.className = "fas fa-trash-alt";
                    icon.style.cursor = "pointer";
                    icon.style.color = "#dc3545";
                    icon.style.fontSize = "16px";
                    icon.title = "Xóa";
                    icon.onclick = () => deleteRow(params.data.ID, params.api, params.node);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            });
        }

        // Cột Duyệt - chỉ hiện nếu có quyền duyệt
        if (canApprove) {
            columnDefs.push({
                field: "DaoTaoDuyet",
                headerName: "Duyệt",
                width: 60,
                editable: false,
                cellRenderer: (params) => {
                    const icon = document.createElement("i");
                    const isApproved = params.data.DaoTaoDuyet === 1;

                    if (isApproved) {
                        icon.className = "fas fa-check";
                        icon.style.color = "#198754";
                        icon.title = "Đã duyệt - Click để bỏ duyệt";
                    } else {
                        icon.className = "fas fa-times";
                        icon.style.color = "#6c757d";
                        icon.title = "Chưa duyệt - Click để duyệt";
                    }

                    icon.style.cursor = "pointer";
                    icon.style.fontSize = "16px";
                    icon.onclick = () => toggleApproval(params.data.ID, !isApproved, params.api, params.node);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            });
        }

        gridOptions = {
            columnDefs: columnDefs,
            rowData: localData,
            defaultColDef: {
                resizable: true,
                sortable: true,
                filter: true,
                wrapText: true,
                autoHeight: true,
                cellStyle: {
                    fontSize: "14px",
                    whiteSpace: "normal",
                    wordWrap: "break-word"
                }
            },
            rowHeight: 50,
            onCellValueChanged: onCellValueChanged,
            localeText: {
                noRowsToShow: "Không có dữ liệu"
            }
        };

        const gridDiv = document.getElementById("table-container");
        if (!gridDiv) {
            console.error("table-container not found!");
            return;
        }

        gridDiv.innerHTML = "";
        gridDiv.className = "ag-theme-alpine";
        gridDiv.style.height = "550px";

        console.log("Creating AG-Grid with", localData.length, "rows");

        // AG-Grid Community v31+ uses createGrid instead of new agGrid.Grid
        if (typeof agGrid.createGrid === 'function') {
            gridApi = agGrid.createGrid(gridDiv, gridOptions);
            console.log("Grid created using createGrid()");
        } else {
            new agGrid.Grid(gridDiv, gridOptions);
            gridApi = gridOptions.api;
            console.log("Grid created using new agGrid.Grid()");
        }

        if (localData.length === 0) {
            if (gridApi && gridApi.showNoRowsOverlay) {
                gridApi.showNoRowsOverlay();
            }
        }

        console.log("Grid rendering complete. gridApi:", !!gridApi);
    }

    // =====================================================
    // GRID EVENT HANDLERS
    // =====================================================

    async function onCellValueChanged(event) {
        const { data, colDef, newValue, oldValue } = event;

        if (newValue === oldValue) return;

        try {
            const response = await fetch(`/v2/de-tai-du-an/edit/${data.ID}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    namHoc: currentYear
                })
            });

            const result = await response.json();

            if (result.success) {
                NCKH_V2_Utils.showSuccessToast(result.message);
                // Refresh data
                loadTableData();
            } else {
                NCKH_V2_Utils.showErrorToast(result.message);
            }
        } catch (error) {
            console.error("Error updating:", error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi cập nhật");
        }
    }

    async function deleteRow(id, api, node) {
        const result = await Swal.fire({
            title: "Xác nhận xóa?",
            text: "Bạn không thể hoàn tác thao tác này!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy"
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`/v2/de-tai-du-an/${id}`, {
                method: "DELETE"
            });

            const data = await response.json();

            if (data.success) {
                NCKH_V2_Utils.showSuccessToast(data.message);
                api.applyTransaction({ remove: [node.data] });
            } else {
                NCKH_V2_Utils.showErrorToast(data.message);
            }
        } catch (error) {
            console.error("Error deleting:", error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi xóa");
        }
    }

    async function toggleApproval(id, newStatus, api, node) {
        try {
            const response = await fetch(`/v2/nckh/approve/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    DaoTaoDuyet: newStatus ? 1 : 0
                })
            });

            const data = await response.json();

            if (data.success) {
                NCKH_V2_Utils.showSuccessToast(newStatus ? "Đã duyệt" : "Đã bỏ duyệt");
                // Update node data and refresh row
                node.data.DaoTaoDuyet = newStatus ? 1 : 0;
                api.refreshCells({ rowNodes: [node], force: true });
            } else {
                NCKH_V2_Utils.showErrorToast(data.message);
            }
        } catch (error) {
            console.error("Error toggling approval:", error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi cập nhật trạng thái duyệt");
        }
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.DeTaiDuAn_Grid = {
        loadTableData,
        renderTable,
        deleteRow,
        toggleApproval,
        getCurrentYear: () => currentYear
    };

})(); // End of IIFE
