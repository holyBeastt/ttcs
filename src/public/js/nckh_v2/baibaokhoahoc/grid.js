/**
 * NCKH V2 - Bài Báo Khoa Học - Grid Module
 * Xử lý AG-Grid table rendering và các thao tác trên grid
 */

(function () {
    'use strict';

    // =====================================================
    // MODULE VARIABLES
    // =====================================================
    let gridApiBB = null;
    let gridOptionsBB = null;
    let localDataBB = [];
    let currentYearBB = "";

    // =====================================================
    // GRID SETUP
    // =====================================================

    function setupGrid() {
        const renderBtn = document.getElementById("renderBB");
        if (renderBtn) {
            renderBtn.addEventListener("click", loadTableData);
        }
    }

    // =====================================================
    // LOAD TABLE DATA
    // =====================================================

    async function loadTableData() {
        const namHoc = document.getElementById("namHocXemBB").value;
        currentYearBB = namHoc;

        // Xác định khoa dựa trên quyền
        const MaPhongBan = localStorage.getItem("MaPhongBan");
        let khoa = "ALL";

        const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
        const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
        const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";

        if (MaPhongBan !== daoTaoCode && MaPhongBan !== ncHtptCode) {
            khoa = MaPhongBan;
        }

        const encodedNamHoc = encodeURIComponent(namHoc);
        const encodedKhoa = encodeURIComponent(khoa);

        console.log("Loading BaiBaoKhoaHoc table data...");
        console.log("API URL:", `/v2/bai-bao-khoa-hoc/${encodedNamHoc}/${encodedKhoa}`);

        try {
            if (gridApiBB) gridApiBB.showLoadingOverlay();

            const response = await fetch(`/v2/bai-bao-khoa-hoc/${encodedNamHoc}/${encodedKhoa}`);
            const data = await response.json();
            console.log("BaiBaoKhoaHoc data received:", data.length, "records");

            localDataBB = data;

            if (gridApiBB) {
                gridApiBB.setRowData(localDataBB);
                if (localDataBB.length === 0) {
                    gridApiBB.showNoRowsOverlay();
                } else {
                    gridApiBB.hideOverlay();
                }
            } else {
                renderTable();
            }
        } catch (error) {
            console.error("Error loading BaiBaoKhoaHoc table data:", error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi tải dữ liệu");
        }
    }

    // =====================================================
    // AG-GRID TABLE RENDERING
    // =====================================================

    function renderTable() {
        const role = localStorage.getItem("userRole");
        const MaPhongBan = localStorage.getItem("MaPhongBan");

        const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
        const APP_ROLES = window.APP_ROLES || {};

        const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";
        const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
        const troLyPhongRole = APP_ROLES.troLy_phong || "tro_ly_phong";
        const lanhDaoPhongRole = APP_ROLES.lanhDao_phong || "lanh_dao_phong";
        const gvCnbmKhoaRole = APP_ROLES.gv_cnbm_khoa || "gv_cnbm_khoa";
        const lanhDaoKhoaRole = APP_ROLES.lanhDao_khoa || "lanh_dao_khoa";

        // Quyền duyệt: troLy_phong hoặc lanhDao_phong thuộc phòng NC&HTPT hoặc Đào Tạo
        const canApprove = (role === troLyPhongRole || role === lanhDaoPhongRole) &&
            (MaPhongBan === ncHtptCode || MaPhongBan === daoTaoCode);

        // Quyền sửa: canApprove HOẶC gv_cnbm_khoa HOẶC lanhDao_khoa (không cần check phòng ban)
        const canEdit = canApprove ||
            role === gvCnbmKhoaRole ||
            role === lanhDaoKhoaRole;

        // Quyền xóa: giống canEdit
        const canDelete = canEdit;

        const columnDefs = [
            {
                headerName: "STT",
                valueGetter: (params) => params.node.rowIndex + 1,
                width: 70,
                editable: false,
                cellStyle: { textAlign: "center", fontWeight: "bold" }
            },
            {
                field: "LoaiTapChi",
                headerName: "Loại Tạp Chí",
                flex: 1,
                minWidth: 150,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
            },
            {
                field: "TenBaiBao",
                headerName: "Tên Bài Báo",
                flex: 2,
                minWidth: 250,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
            },
            {
                field: "TacGia",
                headerName: "Tác Giả",
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
                    icon.onclick = () => BaiBao_Modal.showDetailModal(params.data);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            }
        ];

        // Cột Xóa
        if (canDelete) {
            columnDefs.push({
                headerName: "Xóa",
                width: 60,
                editable: false,
                cellRenderer: (params) => {
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

        // Cột Duyệt
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

        gridOptionsBB = {
            columnDefs: columnDefs,
            rowData: localDataBB,
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

        const gridDiv = document.getElementById("table-container-bb");
        if (!gridDiv) {
            console.error("table-container-bb not found!");
            return;
        }

        gridDiv.innerHTML = "";
        gridDiv.className = "ag-theme-alpine";
        gridDiv.style.height = "550px";

        if (typeof agGrid.createGrid === 'function') {
            gridApiBB = agGrid.createGrid(gridDiv, gridOptionsBB);
        } else {
            new agGrid.Grid(gridDiv, gridOptionsBB);
            gridApiBB = gridOptionsBB.api;
        }

        if (localDataBB.length === 0 && gridApiBB?.showNoRowsOverlay) {
            gridApiBB.showNoRowsOverlay();
        }
    }

    // =====================================================
    // GRID EVENT HANDLERS
    // =====================================================

    async function onCellValueChanged(event) {
        const { data, colDef, newValue, oldValue } = event;

        if (newValue === oldValue) return;

        try {
            const response = await fetch(`/v2/bai-bao-khoa-hoc/edit/${data.ID}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    namHoc: currentYearBB
                })
            });

            const result = await response.json();

            if (result.success) {
                NCKH_V2_Utils.showSuccessToast(result.message);
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
            const response = await fetch(`/v2/bai-bao-khoa-hoc/${id}`, {
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    DaoTaoDuyet: newStatus ? 1 : 0
                })
            });

            const data = await response.json();

            if (data.success) {
                NCKH_V2_Utils.showSuccessToast(newStatus ? "Đã duyệt" : "Đã bỏ duyệt");
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

    window.BaiBao_Grid = {
        setupGrid,
        loadTableData,
        renderTable,
        deleteRow,
        toggleApproval,
        getCurrentYear: () => currentYearBB
    };

})(); // End of IIFE
