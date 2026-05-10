$(document).ready(function () {
    let allTeachers = []; // Store all teachers for searching

    // Initialization
    initPage();

    // Event Handlers
    $('#loadDataBtn').on('click', loadTable);
    $('#addNewBtn').on('click', openAddModal);
    $('#so_ngay').on('input', updateQuyDoi);
    $('#dataForm').on('submit', handleFormSubmit);

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
            
            // Check if input matches any teacher, otherwise clear it
            const val = $('#teacherSearch').val().trim();
            const teacher = allTeachers.find(t => t.HoTen === val);
            if (!teacher) {
                // If not found exactly, but we have an id_User, check if that ID matches the name
                const currentId = $('#id_User').val();
                const currentTeacher = allTeachers.find(t => t.id_User == currentId);
                if (currentTeacher && currentTeacher.HoTen === val) {
                    // All good
                } else {
                    // Clear both if no match
                    // $('#teacherSearch').val('');
                    // $('#id_User').val('');
                }
            }
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

    /**
     * Initialize Page
     */
    async function initPage() {
        try {
            await loadFilters();
            await loadTable();
        } catch (e) {
            console.error("Error initializing page", e);
        }
    }

    /**
     * Load filters from API
     */
    async function loadFilters() {
        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/filters');
            const result = await res.json();

            if (result.success) {
                const d = result.data;
                allTeachers = d.teachers || [];

                // Years
                setSelectOptions($('#namHocFilter, #nam_hoc'), d.namHoc, "Chọn năm học");
                
                // Departments (Khoa) - Show code (MaPhongBan)
                setSelectOptions($('#khoaFilter'), d.khoa, "Tất cả khoa");
                setSelectOptions($('#khoa'), d.khoa, "Chọn khoa");

                // He Dao Tao
                setSelectOptions($('#he_dao_tao_id'), d.heDaoTao.map(h => h.id), "Chọn hệ đào tạo", d.heDaoTao);

                // Set default year if activeNamHoc exists
                if (d.activeNamHoc) {
                    $('#namHocFilter, #nam_hoc').val(d.activeNamHoc);
                } else if ($('#namHocFilter option').length > 1) {
                    $('#namHocFilter').prop('selectedIndex', 1);
                }
            }
        } catch (e) {
            console.error("Error loading filters", e);
        }
    }

    /**
     * Helper to set select options
     */
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

    /**
     * Load table data
     */
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

    /**
     * Render table rows
     */
    function renderTable(data) {
        const tbody = $('#tableBody');
        tbody.empty();

        if (!data || data.length === 0) {
            tbody.append('<tr><td colspan="9" class="text-center">Không có dữ liệu</td></tr>');
            return;
        }

        data.forEach((row, index) => {
            tbody.append(`
                <tr data-row='${JSON.stringify(row)}'>
                    <td>${index + 1}</td>
                    <td>${row.HoTen || 'N/A'}</td>
                    <td>${row.khoa || ''}</td>
                    <td>${row.HeDaoTaoTen || ''}</td>
                    <td>${row.nganh_hoc || ''}</td>
                    <td>${row.mo_ta_hoat_dong || ''}</td>
                    <td>${row.so_ngay}</td>
                    <td>${row.so_tiet_quy_doi}</td>
                    <td>
                        <button class="btn btn-sm btn-warning edit-btn" title="Sửa">Sửa</button>
                        <button class="btn btn-sm btn-danger delete-btn" title="Xóa">Xóa</button>
                    </td>
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
    }

    /**
     * Open Modal for Adding
     */
    function openAddModal() {
        $('#modalTitle').text('Thêm mới hướng dẫn tham quan');
        $('#recordId').val('');
        $('#dataForm')[0].reset();
        $('#id_User').val('');
        $('#teacherSearch').val('');
        $('#so_tiet_quy_doi').val(0);
        
        // Set default filters to form
        $('#nam_hoc').val($('#namHocFilter').val());
        $('#hoc_ky').val($('#kiFilter').val());
        $('#dot').val($('#dotFilter').val());
        if ($('#khoaFilter').val() !== 'ALL') {
            $('#khoa').val($('#khoaFilter').val());
        }

        $('#formModal').modal('show');
    }

    /**
     * Open Modal for Editing
     */
    function openEditModal(data) {
        $('#modalTitle').text('Chỉnh sửa hướng dẫn tham quan');
        $('#recordId').val(data.id);
        
        // Fill form fields
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

    /**
     * Handle Form Submission
     */
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

    /**
     * Handle Record Deletion
     */
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
                const res = await fetch(`/v2/vuotgio/huong-dan-tham-quan/${id}`, { method: 'DELETE' });
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

    /**
     * Update quy doi value
     */
    function updateQuyDoi() {
        const soNgay = parseInt($(this).val()) || 0;
        $('#so_tiet_quy_doi').val(soNgay * 3);
    }
});
