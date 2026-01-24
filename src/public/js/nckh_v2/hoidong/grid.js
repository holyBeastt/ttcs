/**
 * NCKH V2 - Thành viên Hội đồng - Grid Module
 * Xử lý AG-Grid table rendering và các thao tác trên grid
 * Pattern tham khảo từ: dexuat/grid.js
 */

(function () {
    'use strict';

    // =====================================================
    // MODULE VARIABLES
    // =====================================================
    let gridApiHoiDong = null;
    let gridOptionsHoiDong = null;
    let localDataHoiDong = [];
    let currentYearHoiDong = "";

    // =====================================================
    // HELPER FUNCTIONS
    // =====================================================

    function formatMemberList(value) {
        if (!value) return '';
        const container = document.createElement('div');
        const names = value.split(/[,;]/).map(name => name.trim()).filter(name => name);
        names.forEach(name => {
            const div = document.createElement('div');
            div.textContent = name;
            div.style.marginBottom = '2px';
            container.appendChild(div);
        });
        return container;
    }

    // =====================================================
    // LOAD TABLE DATA
    // =====================================================

    async function loadTableData() {
        const namHocSelect = document.getElementById("namHocXemHoiDong");
        if (!namHocSelect) {
            console.error("namHocXemHoiDong not found");
            return;
        }

        const namHoc = namHocSelect.value;
        currentYearHoiDong = namHoc;

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

        console.log("Loading HoiDong table data...");
        console.log("API URL:", `/v2/thanh-vien-hoi-dong/${encodedNamHoc}/${encodedKhoa}`);

        try {
            if (gridApiHoiDong) gridApiHoiDong.showLoadingOverlay();

            const response = await fetch(`/v2/thanh-vien-hoi-dong/${encodedNamHoc}/${encodedKhoa}`);
            const data = await response.json();
            console.log("HoiDong data received:", data.length, "records");

            localDataHoiDong = data;

            if (gridApiHoiDong) {
                gridApiHoiDong.setRowData(localDataHoiDong);
                if (localDataHoiDong.length === 0) {
                    gridApiHoiDong.showNoRowsOverlay();
                } else {
                    gridApiHoiDong.hideOverlay();
                }
            } else {
                renderTable();
            }
        } catch (error) {
            console.error("Error loading HoiDong table data:", error);
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

        const canApprove = (role === troLyPhongRole || role === lanhDaoPhongRole) &&
            (MaPhongBan === ncHtptCode || MaPhongBan === daoTaoCode);

        const canApproveKhoa = role === lanhDaoKhoaRole &&
            MaPhongBan !== daoTaoCode && MaPhongBan !== ncHtptCode;

        const canEdit = canApprove || canApproveKhoa || role === gvCnbmKhoaRole;
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
                field: "TenDeTai",
                headerName: "Tên Đề Tài/Chương Trình",
                flex: 2,
                minWidth: 250,
                editable: (params) => canEdit && params.data.KhoaDuyet !== 1 && params.data.DaoTaoDuyet !== 1
            },
            {
                field: "ThanhVien",
                headerName: "Thành Viên",
                flex: 1.5,
                minWidth: 220,
                editable: (params) => canEdit && params.data.KhoaDuyet !== 1 && params.data.DaoTaoDuyet !== 1,
                cellRenderer: (params) => formatMemberList(params.value)
            },
            {
                field: "SoTiet",
                headerName: "Số Tiết",
                width: 100,
                editable: (params) => canEdit && params.data.KhoaDuyet !== 1 && params.data.DaoTaoDuyet !== 1,
                cellStyle: { textAlign: "center", fontWeight: "bold" },
                valueFormatter: (params) => {
                    const value = params.value;
                    return value ? parseFloat(value).toFixed(2) : "0.00";
                }
            },
            {
                headerName: "Chi Tiết",
                width: 100,
                editable: false,
                cellRenderer: (params) => {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-eye";
                    icon.style.cursor = "pointer";
                    icon.style.color = "#0dcaf0";
                    icon.style.fontSize = "16px";
                    icon.title = "Xem chi tiết";
                    icon.onclick = () => HoiDong_Modal.showDetailModal(params.data);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            }
        ];

        if (canDelete) {
            columnDefs.push({
                headerName: "Xóa", width: 90, editable: false,
                cellRenderer: (params) => {
                    if (params.data.KhoaDuyet === 1 || params.data.DaoTaoDuyet === 1) return "";
                    const icon = document.createElement("i");
                    icon.className = "fas fa-trash-alt";
                    icon.style.cssText = "cursor:pointer;color:#dc3545;font-size:16px";
                    icon.title = "Xóa";
                    icon.onclick = () => deleteRow(params.data.ID, params.api, params.node);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            });
        }

        if (canApproveKhoa) {
            columnDefs.push({
                field: "KhoaDuyet", headerName: "Khoa", width: 90, editable: false,
                cellRenderer: (params) => {
                    const icon = document.createElement("i");
                    const isApproved = params.data.KhoaDuyet === 1;
                    const isDaoTaoDuyet = params.data.DaoTaoDuyet === 1;
                    if (isDaoTaoDuyet) {
                        icon.className = "fas fa-lock";
                        icon.style.cssText = "color:#6c757d;cursor:not-allowed;font-size:16px";
                        icon.title = "Không thể thay đổi - Đào tạo đã duyệt";
                    } else if (isApproved) {
                        icon.className = "fas fa-check";
                        icon.style.cssText = "color:#198754;cursor:pointer;font-size:16px";
                        icon.title = "Khoa đã duyệt - Click để bỏ duyệt";
                        icon.onclick = () => toggleKhoaApproval(params.data.ID, false, params.api, params.node);
                    } else {
                        icon.className = "fas fa-times";
                        icon.style.cssText = "color:#6c757d;cursor:pointer;font-size:16px";
                        icon.title = "Khoa chưa duyệt - Click để duyệt";
                        icon.onclick = () => toggleKhoaApproval(params.data.ID, true, params.api, params.node);
                    }
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            });
        }

        // Cột Duyệt
        if (canApprove) {
            columnDefs.push({
                field: "DaoTaoDuyet",
                headerName: "Viện NC&HTPT",
                width: 120,
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

        gridOptionsHoiDong = {
            columnDefs: columnDefs,
            rowData: localDataHoiDong,
            defaultColDef: {
                resizable: true,
                sortable: true,
                filter: true,
                suppressMenu: true,
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

        const gridDiv = document.getElementById("table-container-hoidong");
        if (!gridDiv) {
            console.error("table-container-hoidong not found!");
            return;
        }

        gridDiv.innerHTML = "";
        gridDiv.className = "ag-theme-alpine";
        gridDiv.style.height = "550px";

        if (typeof agGrid.createGrid === 'function') {
            gridApiHoiDong = agGrid.createGrid(gridDiv, gridOptionsHoiDong);
        } else {
            new agGrid.Grid(gridDiv, gridOptionsHoiDong);
            gridApiHoiDong = gridOptionsHoiDong.api;
        }

        if (localDataHoiDong.length === 0 && gridApiHoiDong?.showNoRowsOverlay) {
            gridApiHoiDong.showNoRowsOverlay();
        }
    }

    // =====================================================
    // GRID EVENT HANDLERS
    // =====================================================

    async function onCellValueChanged(event) {
        const { data, colDef, newValue, oldValue } = event;

        if (newValue === oldValue) return;

        try {
            const response = await fetch(`/v2/thanh-vien-hoi-dong/edit/${data.ID}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    namHoc: currentYearHoiDong
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
            const response = await fetch(`/v2/thanh-vien-hoi-dong/${id}`, {
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
                body: JSON.stringify({ DaoTaoDuyet: newStatus ? 1 : 0 })
            });
            const data = await response.json();
            if (data.success) {
                NCKH_V2_Utils.showSuccessToast(newStatus ? "Đã duyệt" : "Đã bỏ duyệt");
                node.data.DaoTaoDuyet = newStatus ? 1 : 0;
                if (!newStatus) node.data.KhoaDuyet = 0;
                api.refreshCells({ rowNodes: [node], force: true });
            } else {
                NCKH_V2_Utils.showErrorToast(data.message);
            }
        } catch (error) {
            console.error("Error toggling approval:", error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi cập nhật trạng thái duyệt");
        }
    }

    async function toggleKhoaApproval(id, newStatus, api, node) {
        try {
            const response = await fetch(`/v2/nckh/approve-khoa/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ KhoaDuyet: newStatus ? 1 : 0 })
            });
            const data = await response.json();
            if (data.success) {
                NCKH_V2_Utils.showSuccessToast(newStatus ? "Khoa đã duyệt" : "Khoa đã bỏ duyệt");
                node.data.KhoaDuyet = newStatus ? 1 : 0;
                api.refreshCells({ rowNodes: [node], force: true });
            } else {
                NCKH_V2_Utils.showErrorToast(data.message);
            }
        } catch (error) {
            console.error("Error toggling Khoa approval:", error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi cập nhật duyệt Khoa");
        }
    }

    window.HoiDong_Grid = {
        loadTableData, renderTable, deleteRow, toggleApproval, toggleKhoaApproval,
        getCurrentYear: () => currentYearHoiDong
    };

})(); // End of IIFE
