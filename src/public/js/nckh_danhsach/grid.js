/**
 * NCKH Danh Sách - Unified Grid Module
 * Xử lý AG-Grid table rendering cho tất cả loại NCKH
 */

(function () {
    'use strict';

    let gridApi = null;
    let localData = [];
    let currentYear = "";

    const LOAI_NCKH_DISPLAY = {
        'DETAI_DUAN': 'Đề tài, Dự án',
        'BAIBAO': 'Bài báo KH',
        'SANGKIEN': 'Sáng kiến',
        'GIAITHUONG': 'Giải thưởng',
        'DEXUAT': 'Đề xuất NC',
        'SACHGIAOTRINH': 'Sách, GT',
        'HUONGDAN': 'Hướng dẫn SV',
        'HOIDONG': 'Hội đồng KH'
    };

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
    // LOAD DATA
    // =====================================================

    async function loadTableData() {
        const namHocSelect = document.getElementById("namHocXem");
        if (!namHocSelect) return;

        const namHoc = namHocSelect.value;
        currentYear = namHoc;

        const MaPhongBan = localStorage.getItem("MaPhongBan");
        let khoa = "ALL";

        const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
        const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
        const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";

        if (MaPhongBan !== daoTaoCode && MaPhongBan !== ncHtptCode) {
            khoa = MaPhongBan;
        }

        console.log(`[UnifiedGrid] Loading all NCKH data - Năm: ${namHoc}, Khoa: ${khoa}`);

        try {
            if (gridApi) gridApi.showLoadingOverlay();

            const response = await fetch(`/v2/nckh/all/${encodeURIComponent(namHoc)}/${encodeURIComponent(khoa)}`);
            const data = await response.json();

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
            console.error(`[UnifiedGrid] Error:`, error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi tải dữ liệu");
        }
    }

    // =====================================================
    // RENDER TABLE
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

        // Permissions
        const canApprove = (role === troLyPhongRole || role === lanhDaoPhongRole) &&
            (MaPhongBan === ncHtptCode || MaPhongBan === daoTaoCode);

        // Khoa duyệt: Lãnh đạo khoa HOẶC GV_CNBM của Khoa (không phải Phòng Ban)
        const canApproveKhoa = (role === lanhDaoKhoaRole || role === gvCnbmKhoaRole) &&
            MaPhongBan !== daoTaoCode && MaPhongBan !== ncHtptCode;

        const canEdit = canApprove || canApproveKhoa || role === gvCnbmKhoaRole;
        const canDelete = canEdit;

        const columnDefs = [
            {
                headerName: "STT",
                valueGetter: (params) => params.node.rowIndex + 1,
                width: 50,
                pinned: 'left',
                cellStyle: { textAlign: "center", fontWeight: "bold" }
            },
            {
                field: "LoaiNCKH",
                headerName: "Loại NCKH",
                width: 140,
                valueFormatter: (params) => LOAI_NCKH_DISPLAY[params.value] || params.value,
                filter: 'agSetColumnFilter'
            },
            {
                field: "PhanLoai",
                headerName: "Phân loại",
                width: 180,
                hide: true,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1 && params.data.KhoaDuyet !== 1
            },
            {
                field: "TenCongTrinh",
                headerName: "Tên công trình",
                flex: 2,
                minWidth: 250,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1 && params.data.KhoaDuyet !== 1
            },
            {
                field: "TacGiaChinh",
                headerName: "Tác giả chính / Chủ nhiệm",
                headerValueGetter: (params) => {
                    // Trả về tên chung bao quát các trường hợp
                    return "Tác giả chính / Chủ nhiệm / Thành viên HĐ";
                },
                flex: 1.5,
                minWidth: 220,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1 && params.data.KhoaDuyet !== 1,
                cellRenderer: (params) => formatMemberList(params.value)
            },
            {
                field: "DanhSachThanhVien",
                headerName: "Thành viên",
                flex: 1.5,
                minWidth: 220,
                editable: (params) => canEdit && params.data.DaoTaoDuyet !== 1 && params.data.KhoaDuyet !== 1,
                cellRenderer: (params) => formatMemberList(params.value)
            },
            {
                headerName: "Chi tiết",
                width: 90,
                cellRenderer: (params) => {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-eye";
                    icon.style.cursor = "pointer";
                    icon.style.color = "#0dcaf0";
                    icon.title = "Xem chi tiết";
                    icon.onclick = () => NCKH_DanhSach_Modal.showDetail(params.data);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            }
        ];

        if (canDelete) {
            columnDefs.push({
                headerName: "Xóa",
                width: 80,
                cellRenderer: (params) => {
                    if (params.data.DaoTaoDuyet === 1 || params.data.KhoaDuyet === 1) return "";
                    const icon = document.createElement("i");
                    icon.className = "fas fa-trash-alt text-danger";
                    icon.style.cursor = "pointer";
                    icon.title = "Xóa";
                    icon.onclick = () => deleteRow(params.data.ID, params.api, params.node);
                    return icon;
                },
                cellStyle: { textAlign: "center" }
            });
        }

        // Cột Khoa Duyệt - Luôn hiển thị
        columnDefs.push({
            field: "KhoaDuyet",
            headerName: "Khoa",
            width: 90,
            cellRenderer: (params) => {
                const icon = document.createElement("i");
                const isApproved = params.data.KhoaDuyet === 1;
                const isDaoTaoApproved = params.data.DaoTaoDuyet === 1;

                if (isApproved) {
                    icon.className = "fas fa-check text-success";
                    icon.title = canApproveKhoa && !isDaoTaoApproved ? "Click để bỏ duyệt" : "Đã duyệt";
                } else {
                    icon.className = "fas fa-times text-secondary";
                    icon.title = canApproveKhoa ? "Click để duyệt" : "Chưa duyệt";
                }

                if (canApproveKhoa && !isDaoTaoApproved) {
                    icon.style.cursor = "pointer";
                    icon.onclick = () => toggleKhoaApproval(params.data.ID, !isApproved, params.api, params.node);
                } else if (isDaoTaoApproved && canApproveKhoa) {
                    icon.className = "fas fa-lock text-secondary";
                    icon.title = "Đào tạo đã duyệt - Không thể thay đổi";
                }

                return icon;
            },
            cellStyle: { textAlign: "center" }
        });

        // Cột Viện NC Duyệt - Luôn hiển thị
        columnDefs.push({
            field: "DaoTaoDuyet",
            headerName: "Viện NC",
            width: 100,
            cellRenderer: (params) => {
                const icon = document.createElement("i");
                const isApproved = params.data.DaoTaoDuyet === 1;
                const isKhoaApproved = params.data.KhoaDuyet === 1;

                if (isApproved) {
                    icon.className = "fas fa-check text-success";
                    icon.title = canApprove ? "Click để bỏ duyệt" : "Đã duyệt";
                } else {
                    icon.className = "fas fa-times text-secondary";
                    icon.title = !isKhoaApproved ? "Khoa chưa duyệt" : (canApprove ? "Click để duyệt" : "Chưa duyệt");
                }

                if (canApprove) {
                    if (!isApproved && !isKhoaApproved) {
                        icon.className = "fas fa-ban text-danger";
                        icon.style.cursor = "not-allowed";
                    } else {
                        icon.style.cursor = "pointer";
                        icon.onclick = () => toggleApproval(params.data.ID, !isApproved, params.api, params.node);
                    }
                }

                return icon;
            },
            cellStyle: { textAlign: "center" }
        });

        const gridOptions = {
            columnDefs: columnDefs,
            rowData: localData,
            defaultColDef: {
                resizable: true,
                sortable: true,
                filter: true,
                suppressMenu: true,
                wrapText: true,
                autoHeight: true,
                cellStyle: { fontSize: "14px", whiteSpace: "normal" }
            },
            rowHeight: 50,
            onCellValueChanged: onCellValueChanged,
            getRowStyle: (params) => {
                if (params.data.DaoTaoDuyet === 1) return { backgroundColor: '#d4edda' }; // Green
                if (params.data.KhoaDuyet === 1) return { backgroundColor: '#fff3cd' }; // Yellow
                return null;
            }
        };

        const gridDiv = document.getElementById("table-container");
        if (!gridDiv) return;

        gridDiv.innerHTML = "";
        if (typeof agGrid.createGrid === 'function') {
            gridApi = agGrid.createGrid(gridDiv, gridOptions);
        } else {
            new agGrid.Grid(gridDiv, gridOptions);
            gridApi = gridOptions.api;
        }

        if (localData.length === 0 && gridApi) gridApi.showNoRowsOverlay();
    }

    // =====================================================
    // POST EVENTS
    // =====================================================

    async function onCellValueChanged(event) {
        const { data, newValue, oldValue } = event;
        if (newValue === oldValue) return;

        try {
            // Cần xác định route dựa trên LoaiNCKH để update đúng endpoint (hoặc dùng endpoint chung nếu có)
            // Hiện tại unified controller cho phép update theo ID chung? 
            // Ta sẽ dùng endpoint edit của từng loại hoặc thống nhất endpoint chung.
            // Để an toàn ta mapping ngược lại route type.
            
            const typeToRoute = {
                'DETAI_DUAN': 'de-tai-du-an',
                'BAIBAO': 'bai-bao-khoa-hoc',
                'SANGKIEN': 'sang-kien',
                'GIAITHUONG': 'giai-thuong',
                'DEXUAT': 'de-xuat-nghien-cuu',
                'SACHGIAOTRINH': 'sach-giao-trinh',
                'HUONGDAN': 'huong-dan-sv-nckh',
                'HOIDONG': 'thanh-vien-hoi-dong'
            };

            const route = typeToRoute[data.LoaiNCKH];
            const response = await fetch(`/v2/${route}/edit/${data.ID}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                NCKH_V2_Utils.showSuccessToast(result.message);
                loadTableData();
            } else {
                NCKH_V2_Utils.showErrorToast(result.message);
                event.node.setDataValue(event.colDef.field, oldValue);
            }
        } catch (error) {
            console.error(error);
            NCKH_V2_Utils.showErrorToast("Lỗi khi cập nhật");
        }
    }

    async function deleteRow(id, api, node) {
        const confirm = await Swal.fire({
            title: "Xác nhận xóa?",
            text: "Thao tác này không thể hoàn tác!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy"
        });

        if (!confirm.isConfirmed) return;

        try {
            const response = await fetch(`/v2/nckh/delete/${id}`, { method: "POST" });
            const result = await response.json();
            if (result.success) {
                NCKH_V2_Utils.showSuccessToast(result.message);
                api.applyTransaction({ remove: [node.data] });
            } else {
                NCKH_V2_Utils.showErrorToast(result.message);
            }
        } catch (error) {
            console.error(error);
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

            const result = await response.json();
            if (result.success) {
                NCKH_V2_Utils.showSuccessToast(newStatus ? "Đã duyệt" : "Đã bỏ duyệt");
                node.data.DaoTaoDuyet = newStatus ? 1 : 0;
                if (!newStatus) node.data.KhoaDuyet = 0; // Cascade
                api.refreshCells({ rowNodes: [node], force: true });
            } else {
                NCKH_V2_Utils.showErrorToast(result.message);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function toggleKhoaApproval(id, newStatus, api, node) {
        try {
            const response = await fetch(`/v2/nckh/approve-khoa/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ KhoaDuyet: newStatus ? 1 : 0 })
            });

            const result = await response.json();
            if (result.success) {
                NCKH_V2_Utils.showSuccessToast(newStatus ? "Khoa đã duyệt" : "Khoa đã bỏ duyệt");
                node.data.KhoaDuyet = newStatus ? 1 : 0;
                api.refreshCells({ rowNodes: [node], force: true });
            } else {
                NCKH_V2_Utils.showErrorToast(result.message);
            }
        } catch (error) {
            console.error(error);
        }
    }

    window.NCKH_DanhSach_Grid = {
        loadTableData,
        LOAI_NCKH_DISPLAY
    };

})();
