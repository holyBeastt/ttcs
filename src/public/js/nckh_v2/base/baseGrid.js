/**
 * NCKH V2 - Base Grid Component
 * Reusable AG-Grid configuration for all NCKH types
 * Date: 2026-01-20
 */

(function () {
    'use strict';

    /**
     * Creates a base grid configuration for NCKH modules
     * @param {Object} config - Configuration object
     * @param {string} config.tabName - Tab name (detaiduan, baibaokhoahoc, ...)
     * @param {string} config.containerId - ID of grid container element
     * @param {Array} config.columns - Additional column definitions
     * @param {Function} config.onDetailClick - Callback when detail icon clicked
     */
    function createBaseGrid(config) {
        const { tabName, containerId, columns = [], onDetailClick } = config;
        const nckhConfig = NCKH_V2_Utils.getNCKHConfig(tabName);

        if (!nckhConfig) {
            console.error(`Unknown tab: ${tabName}`);
            return null;
        }

        let gridApi = null;
        let localData = [];
        let currentYear = "";

        // =====================================================
        // PERMISSION CHECK
        // =====================================================

        function getPermissions() {
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

            const canEdit = canApprove ||
                role === gvCnbmKhoaRole ||
                role === lanhDaoKhoaRole;

            return {
                canApprove,
                canEdit,
                canDelete: canEdit,
                isViewOnly: !canEdit
            };
        }

        // =====================================================
        // LOAD DATA
        // =====================================================

        async function loadTableData() {
            const namHocSelect = document.getElementById("namHocXem");
            if (!namHocSelect) return;

            const namHoc = namHocSelect.value;
            currentYear = namHoc;

            // Xác định khoa dựa trên quyền
            const MaPhongBan = localStorage.getItem("MaPhongBan");
            let khoa = "ALL";

            const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
            const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
            const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";

            if (MaPhongBan !== daoTaoCode && MaPhongBan !== ncHtptCode) {
                khoa = MaPhongBan;
            }

            console.log(`[BaseGrid] Loading ${tabName} data - Năm: ${namHoc}, Khoa: ${khoa}`);

            try {
                if (gridApi) gridApi.showLoadingOverlay();

                const data = await NCKH_V2_Utils.loadTableDataV2(tabName, namHoc, khoa);
                console.log(`[BaseGrid] Loaded ${data.length} records`);

                localData = data;

                if (gridApi) {
                    gridApi.setRowData(localData);
                    if (localData.length === 0) {
                        gridApi.showNoRowsOverlay();
                    } else {
                        gridApi.hideOverlay();
                    }
                } else {
                    renderGrid();
                }
            } catch (error) {
                console.error(`[BaseGrid] Error loading data:`, error);
                NCKH_V2_Utils.showErrorToast("Lỗi khi tải dữ liệu");
            }
        }

        // =====================================================
        // BUILD COLUMNS
        // =====================================================

        function buildColumnDefs() {
            const permissions = getPermissions();
            const { canApprove, canEdit, canDelete } = permissions;

            // Base columns
            const columnDefs = [
                {
                    headerName: "STT",
                    valueGetter: (params) => params.node.rowIndex + 1,
                    width: 70,
                    editable: false,
                    cellStyle: { textAlign: "center", fontWeight: "bold" }
                },
                {
                    field: nckhConfig.phanLoaiField || "PhanLoai",
                    headerName: "Phân loại",
                    flex: 1,
                    minWidth: 150,
                    editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
                },
                {
                    field: nckhConfig.tenField || "TenCongTrinh",
                    headerName: "Tên công trình",
                    flex: 2,
                    minWidth: 250,
                    editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
                },
                {
                    field: nckhConfig.tacGiaField || "TacGiaChinh",
                    headerName: "Tác giả chính",
                    flex: 1.2,
                    minWidth: 150,
                    editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
                },
                {
                    field: "DanhSachThanhVien",
                    headerName: "Thành viên",
                    flex: 1.5,
                    minWidth: 200,
                    editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1
                }
            ];

            // Add custom columns
            columns.forEach(col => {
                if (typeof col.editable === 'undefined') {
                    col.editable = (params) => canEdit && params.data.DaoTaoDuyet !== 1;
                }
                columnDefs.push(col);
            });

            // Detail icon column
            columnDefs.push({
                headerName: "Chi tiết",
                width: 60,
                editable: false,
                cellRenderer: (params) => {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-eye";
                    icon.style.cursor = "pointer";
                    icon.style.color = "#0dcaf0";
                    icon.style.fontSize = "16px";
                    icon.title = "Xem chi tiết";
                    icon.onclick = () => {
                        if (onDetailClick) {
                            onDetailClick(params.data);
                        }
                    };
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            });

            // Delete column
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

            // Approve column
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

            return columnDefs;
        }

        // =====================================================
        // RENDER GRID
        // =====================================================

        function renderGrid() {
            const gridOptions = {
                columnDefs: buildColumnDefs(),
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

            const gridDiv = document.getElementById(containerId);
            if (!gridDiv) {
                console.error(`Container ${containerId} not found!`);
                return;
            }

            gridDiv.innerHTML = "";
            gridDiv.className = "ag-theme-alpine";
            gridDiv.style.height = "550px";

            console.log(`[BaseGrid] Creating grid with ${localData.length} rows`);

            if (typeof agGrid.createGrid === 'function') {
                gridApi = agGrid.createGrid(gridDiv, gridOptions);
            } else {
                new agGrid.Grid(gridDiv, gridOptions);
                gridApi = gridOptions.api;
            }

            if (localData.length === 0 && gridApi && gridApi.showNoRowsOverlay) {
                gridApi.showNoRowsOverlay();
            }
        }

        // =====================================================
        // EVENT HANDLERS
        // =====================================================

        async function onCellValueChanged(event) {
            const { data, colDef, newValue, oldValue } = event;

            if (newValue === oldValue) return;

            try {
                const result = await NCKH_V2_Utils.updateRecordV2(tabName, data.ID, data);

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
                const response = await NCKH_V2_Utils.deleteRecordV2(id);

                if (response.success) {
                    NCKH_V2_Utils.showSuccessToast(response.message);
                    api.applyTransaction({ remove: [node.data] });
                } else {
                    NCKH_V2_Utils.showErrorToast(response.message);
                }
            } catch (error) {
                console.error("Error deleting:", error);
                NCKH_V2_Utils.showErrorToast("Lỗi khi xóa");
            }
        }

        async function toggleApproval(id, newStatus, api, node) {
            try {
                const response = await NCKH_V2_Utils.updateApprovalV2(id, newStatus ? 1 : 0);

                if (response.success) {
                    NCKH_V2_Utils.showSuccessToast(newStatus ? "Đã duyệt" : "Đã bỏ duyệt");
                    node.data.DaoTaoDuyet = newStatus ? 1 : 0;
                    api.refreshCells({ rowNodes: [node], force: true });
                } else {
                    NCKH_V2_Utils.showErrorToast(response.message);
                }
            } catch (error) {
                console.error("Error toggling approval:", error);
                NCKH_V2_Utils.showErrorToast("Lỗi khi cập nhật trạng thái duyệt");
            }
        }

        // =====================================================
        // PUBLIC API
        // =====================================================

        return {
            loadTableData,
            renderGrid,
            deleteRow,
            toggleApproval,
            getGridApi: () => gridApi,
            getData: () => localData,
            getCurrentYear: () => currentYear,
            getPermissions
        };
    }

    // Export
    window.NCKH_V2_BaseGrid = {
        createBaseGrid
    };

})();
