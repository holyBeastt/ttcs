$(document).ready(function () {
    let allTeachers = []; // Store all teachers for searching

    // Initialization
    initPage();

    // Tab switching
    $('.tab-btn').on('click', function() {
        const targetTab = $(this).data('tab');
        
        // Update active tab button
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        
        // Update active tab content
        $('.tab-content').removeClass('active');
        $(`#${targetTab}`).addClass('active');
    });

    // Form events
    $('#so_ngay').on('input', updateQuyDoi);
    $('#addForm').on('submit', handleFormSubmit);

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

    // File upload functionality (disabled for now)
    $('#uploadArea').on('click', function() {
        if (!$('#fileInput').prop('disabled')) {
            $('#fileInput').click();
        }
    });

    $('#fileInput').on('change', function() {
        const file = this.files[0];
        if (file) {
            displayFileInfo(file);
        }
    });

    $('#removeFile').on('click', function() {
        $('#fileInput').val('');
        $('#fileInfo').hide();
    });

    // Drag and drop (disabled for now)
    $('#uploadArea').on('dragover', function(e) {
        e.preventDefault();
        if (!$('#fileInput').prop('disabled')) {
            $(this).addClass('dragover');
        }
    });

    $('#uploadArea').on('dragleave', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });

    $('#uploadArea').on('drop', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        
        if (!$('#fileInput').prop('disabled')) {
            const files = e.originalEvent.dataTransfer.files;
            if (files.length > 0) {
                $('#fileInput')[0].files = files;
                displayFileInfo(files[0]);
            }
        }
    });

    /**
     * Initialize Page
     */
    async function initPage() {
        try {
            await loadFilters();
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
                setSelectOptions($('#nam_hoc'), d.namHoc, "-- Chọn năm học --");

                // Departments (Khoa)
                setSelectOptions($('#khoa'), d.khoa, "-- Chọn khoa --");

                // He Dao Tao
                setSelectOptions($('#he_dao_tao_id'), d.heDaoTao.map(h => h.id), "-- Chọn hệ đào tạo --", d.heDaoTao);

                // Set default year if activeNamHoc exists
                if (d.activeNamHoc) {
                    $('#nam_hoc').val(d.activeNamHoc);
                } else if ($('#nam_hoc option').length > 1) {
                    $('#nam_hoc').prop('selectedIndex', 1);
                }
            }
        } catch (e) {
            console.error("Error loading filters", e);
            Swal.fire('Lỗi', 'Không thể tải dữ liệu bộ lọc', 'error');
        }
    }

    /**
     * Helper to set select options
     */
    function setSelectOptions(selectElement, values, defaultLabel, originalData = null) {
        selectElement.empty();
        if (defaultLabel) {
            selectElement.append(`<option value="">${defaultLabel}</option>`);
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
     * Handle Form Submission
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate teacher selection
        if (!$('#id_User').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'warning');
            return false;
        }

        // Validate required fields
        if (!$('#khoa').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn khoa!', 'warning');
            return false;
        }

        if (!$('#nam_hoc').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn năm học!', 'warning');
            return false;
        }

        if (!$('#he_dao_tao_id').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn hệ đào tạo!', 'warning');
            return false;
        }

        if (!$('#so_ngay').val() || parseFloat($('#so_ngay').val()) <= 0) {
            Swal.fire('Cảnh báo', 'Vui lòng nhập số ngày hợp lệ!', 'warning');
            return false;
        }

        // Prepare form data
        const formData = {};
        $(this).serializeArray().forEach(item => {
            formData[item.name] = item.value;
        });

        // Show loading
        Swal.fire({
            title: 'Đang xử lý...',
            text: 'Vui lòng đợi',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await res.json();

            if (result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: result.message || 'Đã thêm dữ liệu thành công',
                    confirmButtonText: 'OK'
                });
                
                // Redirect to list page
                window.location.href = '/v2/vuotgio/huong-dan-tham-quan';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: result.message || 'Có lỗi xảy ra khi lưu dữ liệu'
                });
            }
        } catch (e) {
            console.error('Error submitting form:', e);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: 'Không thể kết nối đến máy chủ'
            });
        }
    }

    /**
     * Update quy doi value (1 day = 3 periods)
     */
    function updateQuyDoi() {
        const soNgay = parseFloat($(this).val()) || 0;
        const soTietQuyDoi = soNgay * 3;
        $('#so_tiet_quy_doi').val(soTietQuyDoi);
    }

    /**
     * Display file information
     */
    function displayFileInfo(file) {
        const fileName = file.name;
        const fileSize = (file.size / 1024).toFixed(2) + ' KB';
        
        $('#fileName').text(fileName);
        $('#fileSize').text(`(${fileSize})`);
        $('#fileInfo').show();
    }

    /**
     * Handle file upload form submission (to be implemented)
     */
    $('#uploadForm').on('submit', function(e) {
        e.preventDefault();
        
        Swal.fire({
            icon: 'info',
            title: 'Chức năng đang phát triển',
            text: 'Tính năng tải lên file sẽ được triển khai trong phiên bản tiếp theo.'
        });
    });
});
