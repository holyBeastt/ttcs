/**
 * Hướng Dẫn Tham Quan Thực Tế - Frontend JS
 * VuotGio V2 - With Approval Logic
 */

$(document).ready(function () {
    let allTeachers = []; // Store all teachers for searching

    // Initialization
    initPage();

    // Event Handlers
    $('#loadDataBtn').on('click', loadTable);
    $('#so_ngay').on('input', updateQuyDoi);
    $('#dataForm').on('submit', handleFormSubmit);
    $('#updateApprovalBtn').on('click', submitApprovals);

    // --- Searchable Teacher Select Logic ---
    $('#teacherSearch').on('input', function() {
        const val = $(this).val().trim().toLowerCase();
        const list = $('#teacherList');
        list.empty();
        
        if (val.length > 0) {
            const filtered = allTeachers.filter(t => 
                t.HoTen.toLowerCase().includes(val) || 
                (t.MaNhanVien && t.MaNhanVien.toLowerCase().includes(val))
            );
            
            if (filtered.length > 0) {
                filtered.slice(0, 10).forEach(t => {
                    list.append(`<li><a class="dropdown-item" href="#" data-id="${t.id_User}" data-name="${t.HoTen}" data-khoa="${t.Khoa}">${t.HoTen} - ${t.Khoa}</a></li>`);
                });
                list.addClass('show');
            } else {
                list.removeClass('show');
            }
        } else {
            list.removeClass('show');
            $('#id_User').val('');
        }
    });

    $(document).on('click', '#teacherList .dropdown-item', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        const name = $(this).data('name');
        const khoa = $(this).data('khoa');
        
        $('#id_User').val(id);
        $('#teacherSearch').val(name);
        $('#khoa').val(khoa);
        $('#teacherList').removeClass('show');
    });

    // Close dropdown when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.searchable-select').length) {
            $('#teacherList').removeClass('show');
        }
    });

    // Handle form validation for teacher
    $('#dataForm').on('submit', function(e) {
        if (!$('#id_User').val()) {
            e.preventDefault();
            Swal.fire('Cảnh báo', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'warning');
            return false;
        }
    });

    // ==================== PERMISSION HELPERS ====================

    function setupUpdateButtonVisibility() {
        const role = localStorage.getItem('userRole');
        const MaPhongBan = localStorage.getItem('MaPhongBan');
        const updateBtn = document.getElementById('updateApprovalBtn');

        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
        const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
        const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
        const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
        const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
        const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

        // Khoa: GV_CNBM duyệt, Lãnh đạo khoa bỏ duyệt
        if (role === gvCnbm || role === lanhDaoKhoa) {
            updateBtn.style.display = 'inline-flex';
        }
        // Phòng (ĐT/VP): Trợ lý duyệt, Lãnh đạo phòng bỏ duyệt
        else if ((MaPhongBan === daoTao || MaPhongBan === vanPhong) && (role === troLyPhong || role === lanhDaoPhong)) {
            updateBtn.style.display = 'inline-flex';
        }
        // Ban Giám đốc: toàn quyền
        else if (MaPhongBan === banGiamDoc) {
            updateBtn.style.display = 'inline-flex';
        }
    }

    function setupColumnVisibility() {
        const role = localStorage.getItem('userRole');
        const MaPhongBan = localStorage.getItem('MaPhongBan');

        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
        const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
        const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
        const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
        const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';

        const checkAllKhoa = document.getElementById('checkAllKhoa');
        const checkAllDaoTao = document.getElementById('checkAllDaoTao');

        // Mặc định disable tất cả
        if (checkAllKhoa) checkAllKhoa.disabled = true;
        if (checkAllDaoTao) checkAllDaoTao.disabled = true;

        // Khoa: GV_CNBM duyệt (check), Lãnh đạo khoa bỏ duyệt (uncheck)
        if (role === gvCnbm || role === lanhDaoKhoa) {
            if (checkAllKhoa) checkAllKhoa.disabled = false;
        }

        // Phòng ĐT/VP: Trợ lý duyệt (check), Lãnh đạo phòng bỏ duyệt (uncheck)
        if ((MaPhongBan === daoTao || MaPhongBan === vanPhong) && (role === troLyPhong || role === lanhDaoPhong)) {
            if (checkAllDaoTao) checkAllDaoTao.disabled = false;
        }
    }

    /**
     * Kiểm tra quyền duyệt cho từng cột
     * @param {'khoa'|'daoTao'} type - Loại duyệt
     * @param {'check'|'uncheck'} action - Hành động
     */
    function canApprove(type, action) {
        const role = localStorage.getItem('userRole');
        const MaPhongBan = localStorage.getItem('MaPhongBan');

        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
        const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
        const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
        const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
        const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
        const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

        // Ban Giám đốc có toàn quyền
        if (MaPhongBan === banGiamDoc) return true;

        if (type === 'khoa') {
            if (role === gvCnbm && action === 'check') return true;
            if (role === lanhDaoKhoa && action === 'uncheck') return true;
            return false;
        }

        if (type === 'daoTao') {
            if (MaPhongBan !== daoTao && MaPhongBan !== vanPhong) return false;
            if (role === troLyPhong && action === 'check') return true;
            if (role === lanhDaoPhong && action === 'uncheck') return true;
            return false;
        }

        return false;
    }

    function canInteract(type) {
        return canApprove(type, 'check') || canApprove(type, 'uncheck');
    }

    function canEditDelete(data) {
        const role = localStorage.getItem('userRole');
        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';

        // Chỉ GV_CNBM và Lãnh đạo khoa có quyền sửa/xóa
        if (role !== gvCnbm && role !== lanhDaoKhoa) return false;

        // Chỉ sửa/xóa khi chưa duyệt
        return (data.khoa_duyet || 0) === 0 && (data.dao_tao_duyet || 0) === 0;
    }

    // ==================== INITIALIZATION ====================

    async function initPage() {
        try {
            await loadFilters();
            setupUpdateButtonVisibility();
            setupColumnVisibility();
            await loadTable();
        } catch (e) {
            console.error("Error initializing page", e);
        }
    }

    async function loadFilters() {
        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/filters');
            const result = await res.json();

            if (result.success) {
                const d = result.data;
                allTeachers = d.teachers || [];

                setSelectOptions($('#namHocFilter, #nam_hoc'), d.namHoc, "Chọn năm học");
                setSelectOptions($('#khoaFilter'), d.khoa, "Tất cả khoa");
                setSelectOptions($('#khoa'), d.khoa, "Chọn khoa");
                setSelectOptions($('#he_dao_tao_id'), d.heDaoTao.map(h => h.id), "Chọn hệ đào tạo", d.heDaoTao);

                if (d.activeNamHoc) {
                    $('#namHocFilter, #nam_hoc').val(d.activeNamHoc);
                } else if ($('#namHocFilter option').length > 1) {
                    $('#namHocFilter').prop('selectedIndex', 1);
                }

                // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
                if (typeof KhoaFilterUtils !== 'undefined') {
                    KhoaFilterUtils.applyKhoaFilter('khoaFilter');
                    KhoaFilterUtils.applyKhoaFilter('khoa');
                }
            }
        } catch (e) {
            console.error("Error loading filters", e);
        }
    }

    function setSelectOptions(selectElement, values, defaultLabel, originalData = null) {
        selectElement.empty();
        if (defaultLabel) {
            const isAll = defaultLabel.includes('Tất cả');
            selectElement.append(`<option value="${isAll ? 'ALL' : ''}">${defaultLabel}</option>`);
        }

        values.forEach((val, idx) => {
            let label = val;
            if (originalData && originalData[idx]) {
                const item = originalData.find(i => i.id == val);
                label = item ? (item.he_dao_tao || item.ten_khoa || val) : val;
            }
            selectElement.append(`<option value="${val}">${label}</option>`);
        });
    }

    // ==================== DATA LOADING ====================

    async function loadTable() {
        const filters = {
            NamHoc: $('#namHocFilter').val(),
            Dot: $('#dotFilter').val(),
            KiHoc: $('#kiFilter').val(),
            Khoa: $('#khoaFilter').val()
        };

        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/table?' + $.param(filters));
            const result = await res.json();

            if (result.success) {
                renderTable(result.data);
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (e) {
            console.error("Error loading table", e);
            Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
        }
    }

    // ==================== TABLE RENDERING ====================

    function renderTable(data) {
        const tbody = $('#tableBody');
        tbody.empty();

        if (!data || data.length === 0) {
            tbody.append('<tr><td colspan="11" class="text-center">Không có dữ liệu</td></tr>');
            return;
        }

        data.forEach((row, index) => {
            const khoaDuyet = row.khoa_duyet || 0;
            const daoTaoDuyet = row.dao_tao_duyet || 0;

            // Checkbox Khoa logic
            let khoaAttrs = '';
            if (daoTaoDuyet === 1) {
                khoaAttrs = 'disabled checked';
            } else if (khoaDuyet === 1) {
                khoaAttrs = canApprove('khoa', 'uncheck') ? 'checked' : 'disabled checked';
            } else {
                khoaAttrs = canApprove('khoa', 'check') ? '' : 'disabled';
            }

            // Checkbox Đào tạo logic
            let daoTaoAttrs = '';
            if (daoTaoDuyet === 1) {
                daoTaoAttrs = canApprove('daoTao', 'uncheck') ? 'checked' : 'disabled checked';
            } else if (khoaDuyet !== 1) {
                daoTaoAttrs = 'disabled';
            } else {
                daoTaoAttrs = canApprove('daoTao', 'check') ? '' : 'disabled';
            }

            // Action buttons
            let actionHtml = '';
            if (canEditDelete(row)) {
                actionHtml = `
                    <button class="btn btn-sm btn-outline-primary btn-action me-1 edit-btn" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action delete-btn" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            tbody.append(`
                <tr data-row='${JSON.stringify(row)}' data-id="${row.id}" data-index="${index}">
                    <td>${index + 1}</td>
                    <td>${row.HoTen || 'N/A'}</td>
                    <td>${row.khoa || ''}</td>
                    <td>${row.HeDaoTaoTen || ''}</td>
                    <td>${row.nganh_hoc || ''}</td>
                    <td>${row.mo_ta_hoat_dong || ''}</td>
                    <td>${row.so_ngay}</td>
                    <td>${row.so_tiet_quy_doi}</td>
                    <td><input type="checkbox" name="khoa" ${khoaAttrs} onchange="updateCheckAll('khoa'); updateDaoTaoCheckboxes();"></td>
                    <td><input type="checkbox" name="daoTao" ${daoTaoAttrs} onchange="updateCheckAll('daoTao')"></td>
                    <td>${actionHtml}</td>
                </tr>
            `);
        });

        // Bind buttons
        $('.edit-btn').on('click', function() {
            const rowData = $(this).closest('tr').data('row');
            openEditModal(rowData);
        });

        $('.delete-btn').on('click', function() {
            const rowData = $(this).closest('tr').data('row');
            handleDelete(rowData.id);
        });

        updateCheckAll('khoa');
        updateCheckAll('daoTao');
    }

    // ==================== MODAL ====================

    function openEditModal(data) {
        $('#modalTitle').text('Chỉnh sửa hướng dẫn tham quan');
        $('#recordId').val(data.id);
        
        for (const key in data) {
            const input = $(`#dataForm [name="${key}"]`);
            if (input.length) {
                input.val(data[key]);
            }
        }
        
        $('#id_User').val(data.id_User);
        $('#teacherSearch').val(data.HoTen);
        $('#khoa').val(data.khoa);
        $('#nam_hoc').val(data.nam_hoc);
        $('#hoc_ky').val(data.hoc_ky);
        $('#dot').val(data.dot);
        $('#he_dao_tao_id').val(data.he_dao_tao_id);
        $('#so_tiet_quy_doi').val(data.so_tiet_quy_doi);

        $('#formModal').modal('show');
    }

    // ==================== FORM SUBMIT ====================

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        if (!$('#id_User').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'warning');
            return false;
        }

        const id = $('#recordId').val();
        const url = id ? `/v2/vuotgio/huong-dan-tham-quan/edit/${id}` : '/v2/vuotgio/huong-dan-tham-quan/save';
        
        const formData = {};
        $(this).serializeArray().forEach(item => {
            formData[item.name] = item.value;
        });
        // Ensure NamHoc is always present for data lock middleware
        formData.NamHoc = document.getElementById('namHocFilter').value;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await res.json();

            if (result.success) {
                Swal.fire('Thành công', result.message, 'success');
                $('#formModal').modal('hide');
                loadTable();
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (e) {
            Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
        }
    }

    // ==================== DELETE ====================

    async function handleDelete(id) {
        const confirm = await Swal.fire({
            title: 'Bạn có chắc chắn?',
            text: "Dữ liệu sẽ bị xóa vĩnh viễn!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Có, xóa nó!',
            cancelButtonText: 'Hủy'
        });

        if (confirm.isConfirmed) {
            try {
                const namHoc = document.getElementById('namHocFilter').value;
                const res = await fetch(`/v2/vuotgio/huong-dan-tham-quan/${id}?NamHoc=${encodeURIComponent(namHoc)}`, { method: 'DELETE' });
                const result = await res.json();
                if (result.success) {
                    Swal.fire('Đã xóa!', result.message, 'success');
                    loadTable();
                } else {
                    Swal.fire('Lỗi', result.message, 'error');
                }
            } catch (e) {
                Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
            }
        }
    }

    // ==================== BATCH APPROVAL ====================

    async function submitApprovals() {
        const rows = document.querySelectorAll('#tableBody tr[data-id]');
        const updates = [];

        rows.forEach(row => {
            const id = parseInt(row.getAttribute('data-id'));
            const khoaCheckbox = row.querySelector('input[name="khoa"]');
            const daoTaoCheckbox = row.querySelector('input[name="daoTao"]');

            const daoTaoValue = daoTaoCheckbox?.checked ? 1 : 0;
            // Nếu đào tạo đã duyệt thì khoa cũng phải duyệt
            const khoaValue = daoTaoValue === 1 ? 1 : (khoaCheckbox?.checked ? 1 : 0);

            updates.push({
                id: id,
                khoa_duyet: khoaValue,
                dao_tao_duyet: daoTaoValue
            });
        });

        if (updates.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu để cập nhật', 'info');
            return;
        }

        try {
            const namHoc = document.getElementById('namHocFilter').value;
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/batch-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ NamHoc: namHoc, updates: updates })
            });
            const result = await res.json();

            if (result.success) {
                Swal.fire('Thành công', result.message || 'Cập nhật thành công', 'success');
                loadTable();
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (e) {
            console.error('Error submitting approvals:', e);
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
        }
    }

    /**
     * Update quy doi value
     */
    function updateQuyDoi() {
        const soNgay = parseInt($(this).val()) || 0;
        $('#so_tiet_quy_doi').val(soNgay * 3);
    }
});

// ==================== GLOBAL FUNCTIONS (called from inline handlers) ====================

function checkAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    const isChecking = checkAllCheckbox.checked;

    checkboxes.forEach(cb => {
        if (cb.disabled) return;
        cb.checked = isChecking;
    });

    if (type === 'khoa') {
        updateDaoTaoCheckboxes();
    }
}

function updateCheckAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;
    const enabled = Array.from(checkboxes).filter(cb => !cb.disabled);
    checkAllCheckbox.checked = enabled.length > 0 && enabled.every(cb => cb.checked);
}

function updateDaoTaoCheckboxes() {
    const rows = document.querySelectorAll('#tableBody tr[data-id]');
    rows.forEach(row => {
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const daoTaoCheckbox = row.querySelector('input[name="daoTao"]');
        if (khoaCheckbox && daoTaoCheckbox) {
            if (!khoaCheckbox.checked) {
                daoTaoCheckbox.disabled = true;
                daoTaoCheckbox.checked = false;
            } else {
                // Re-enable only if not already approved at daoTao level
                const rowData = $(row).data('row');
                if (rowData && rowData.dao_tao_duyet === 1) {
                    // Already approved - keep state
                } else {
                    daoTaoCheckbox.disabled = false;
                }
            }
        }
    });
    updateCheckAll('daoTao');
}
