document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const BASE_URL = '/v2/vuotgio';
    const columnDefs = {
        raDe: ['hoVaTen', 'khoa', 'displayType', 'maHocPhan', 'tenHocPhan', 'hinhThucThi', 'soDe', 'heSo', 'soTietQC'],
        coiThi: ['hoVaTen', 'khoa', 'displayType', 'ngayThi', 'caThi', 'thoiGian', 'phongThi', 'soTietQC'],
        chamThi: ['hoVaTen', 'khoa', 'displayType', 'maHocPhan', 'tenHocPhan', 'vaiTro', 'soBaiPhach', 'heSo', 'soTietQC']
    };
    const labels = {
        hoVaTen: 'Họ và tên',
        khoa: 'Đơn vị',
        displayType: 'Loại KTHP',
        maHocPhan: 'Mã môn thi',
        tenHocPhan: 'Tên môn thi',
        hinhThucThi: 'Hình thức',
        soDe: 'Số đề',
        heSo: 'Hệ số',
        soTietQC: 'Số giờ chuẩn',
        ngayThi: 'Ngày thi',
        caThi: 'Ca thi',
        thoiGian: 'Thời gian',
        phongThi: 'Phòng thi',
        vaiTro: 'Vai trò',
        soBaiPhach: 'Số bài/phách'
    };

    let employees = [];
    let dataTam = [];

    const showAlert = (icon, message) => Swal.fire({
        title: icon === 'success' ? 'Thành công' : icon === 'warning' ? 'Chú ý' : 'Lỗi',
        html: message,
        icon,
        confirmButtonText: 'OK'
    });

    const showLoading = (message = 'Vui lòng chờ trong khi dữ liệu được kiểm tra.') => {
        Swal.fire({
            title: 'Đang xử lý...',
            html: message,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    };

    const getContext = () => {
        const educationSelect = document.getElementById('heDaoTaoSelect');
        return {
            academicYear: document.getElementById('NamHoc').value,
            semester: document.getElementById('comboboxki').value,
            round: document.getElementById('dotSelect').value,
            educationSystemId: educationSelect.value,
            educationSystemName: educationSelect.selectedOptions[0]?.dataset.name || ''
        };
    };

    const validateContext = () => {
        const context = getContext();
        if (!context.academicYear || !context.semester || !context.round || !context.educationSystemId) {
            showAlert('warning', 'Vui lòng chọn Hệ đào tạo, Đợt, Kỳ và Năm học trước khi xử lý file.');
            return null;
        }
        return context;
    };

    const dtoToViewModel = (dto, status, issues) => {
        const base = {
            activityType: dto.activityType,
            displayType: dto.activityName,
            employeeId: dto.employee.id,
            hoVaTen: dto.employee.name,
            khoa: dto.employee.department,
            maHocPhan: dto.course.code,
            tenHocPhan: dto.course.name,
            hinhThucThi: dto.exam.examForm,
            heSo: dto.exam.coefficient,
            soTietQC: dto.standardHours,
            ngayThi: dto.exam.date || '',
            caThi: dto.exam.shift,
            thoiGian: dto.exam.duration,
            phongThi: dto.exam.room,
            vaiTro: dto.exam.role,
            educationSystemId: dto.educationSystemId,
            sourceRef: dto.sourceRef,
            _status: status,
            _issues: issues
        };
        if (dto.activityType === 'RA_DE'
            || dto.activityType === 'NGAN_HANG_CAU_HOI') {
            return { ...base, soDe: dto.exam.quantity };
        }
        if (dto.activityType === 'COI_THI') {
            return base;
        }
        return {
            ...base,
            soBaiPhach: dto.exam.markedCount
        };
    };

    const applyPreview = (preview) => {
        dataTam = preview.rows.map((row) =>
            dtoToViewModel(row.dto, row.status, [...row.errors, ...row.warnings]));
        renderAll();
        const summary = preview.summary;
        const issueText = preview.errors.slice(0, 8)
            .map((issue) => `• ${issue.sourceRef?.sheetName || ''} dòng ${issue.sourceRef?.rowNumber || '?'}${issue.sourceHeader ? `, cột ${issue.sourceHeader}` : ''}: ${issue.message}`)
            .join('<br>');
        return `Tổng: <b>${summary.total}</b> — hợp lệ: <b>${summary.valid}</b>`
            + ` — lỗi: <b>${summary.invalid}</b> — trùng: <b>${summary.duplicate}</b>`
            + (issueText ? `<hr>${issueText}` : '');
    };

    const renderTable = (items, containerId, columns) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!items.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Không có dữ liệu để hiển thị.</p></div>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'table table-bordered table-hover';
        table.id = `${containerId}Table`;
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        [...columns.map((column) => labels[column] || column), 'Kiểm tra', 'Hành động']
            .forEach((label) => {
                const th = document.createElement('th');
                th.textContent = label;
                headRow.appendChild(th);
            });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        items.forEach((item) => {
            const row = document.createElement('tr');
            row.dataset.key = item._key;
            if (item._status === 'invalid') row.classList.add('table-danger');
            if (item._status === 'duplicate') row.classList.add('table-warning');

            columns.forEach((column, columnIndex) => {
                const td = document.createElement('td');
                if (columnIndex === 0) {
                    const input = document.createElement('input');
                    input.setAttribute('list', 'nhanSuSuggestions');
                    input.className = 'form-control form-control-sm';
                    input.value = item[column] ?? '';
                    input.addEventListener('change', () => {
                        const selected = employees.find((employee) => employee.TenNhanVien === input.value.trim());
                        item.employeeId = selected?.id_User || null;
                        item.hoVaTen = input.value.trim();
                        if (selected) {
                            item.khoa = selected.MaPhongBan;
                            row.children[1].textContent = selected.MaPhongBan || '';
                        }
                    });
                    td.appendChild(input);
                } else if (column === 'khoa' || column === 'displayType') {
                    td.textContent = item[column] ?? '';
                } else {
                    td.contentEditable = 'true';
                    td.textContent = item[column] ?? '';
                }
                row.appendChild(td);
            });

            const issueCell = document.createElement('td');
            issueCell.textContent = (item._issues || []).map((issue) => issue.message).join('; ') || 'Hợp lệ';
            row.appendChild(issueCell);

            const actionCell = document.createElement('td');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-sm btn-danger btn-delete';
            button.dataset.key = item._key;
            button.innerHTML = '<i class="bi bi-trash"></i>';
            actionCell.appendChild(button);
            row.appendChild(actionCell);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    };

    const renderAll = () => {
        dataTam.forEach((item, index) => {
            item._key = item._key || `${item.activityType}-${Date.now()}-${index}`;
        });
        renderTable(
            dataTam.filter((item) =>
                item.activityType === 'RA_DE' || item.activityType === 'NGAN_HANG_CAU_HOI'),
            'raDeTableContainer',
            columnDefs.raDe
        );
        renderTable(
            dataTam.filter((item) => item.activityType === 'COI_THI'),
            'coiThiTableContainer',
            columnDefs.coiThi
        );
        renderTable(
            dataTam.filter((item) => item.activityType === 'CHAM_THI'),
            'chamThiTableContainer',
            columnDefs.chamThi
        );
    };

    const collectEditedRows = () => {
        for (const [containerId, columns] of [
            ['raDeTableContainer', columnDefs.raDe],
            ['coiThiTableContainer', columnDefs.coiThi],
            ['chamThiTableContainer', columnDefs.chamThi]
        ]) {
            const table = document.getElementById(`${containerId}Table`);
            if (!table) continue;
            for (const row of table.querySelectorAll('tbody tr')) {
                const item = dataTam.find((candidate) => candidate._key === row.dataset.key);
                if (!item) continue;
                const cells = row.querySelectorAll('td');
                columns.forEach((column, index) => {
                    const input = cells[index].querySelector('input');
                    item[column] = input ? input.value.trim() : cells[index].textContent.trim();
                });
                const selected = employees.find((employee) => employee.TenNhanVien === item.hoVaTen);
                item.employeeId = selected?.id_User || null;
                item.khoa = selected?.MaPhongBan || item.khoa;
            }
        }
        return dataTam;
    };

    const loadEmployees = async () => {
        try {
            const response = await fetch(`${BASE_URL}/kthp-import/suggestions`);
            if (!response.ok) throw new Error('Không tải được danh sách nhân viên');
            employees = await response.json();
            const datalist = document.createElement('datalist');
            datalist.id = 'nhanSuSuggestions';
            employees.forEach((employee) => {
                const option = document.createElement('option');
                option.value = employee.TenNhanVien;
                option.label = `${employee.TenNhanVien} - ${employee.MaPhongBan || ''}`;
                datalist.appendChild(option);
            });
            document.body.appendChild(datalist);
        } catch (error) {
            console.error(error);
        }
    };

    const loadEducationSystems = async () => {
        const select = document.getElementById('heDaoTaoSelect');
        try {
            const response = await fetch('/api/gvm/v1/he-dao-tao');
            if (!response.ok) throw new Error('Không tải được hệ đào tạo');
            const payload = await response.json();
            const systems = Array.isArray(payload) ? payload : (payload.data || []);
            systems.forEach((system) => {
                const name = system.he_dao_tao || system.HeDaoTao || system.value;
                if (!system.id || !name) return;
                const option = document.createElement('option');
                option.value = system.id;
                option.dataset.name = name;
                option.textContent = name;
                select.appendChild(option);
            });
        } catch (error) {
            select.innerHTML = '<option value="">Không tải được hệ đào tạo</option>';
            console.error(error);
        }
    };

    document.getElementById('chooseFile').addEventListener('click', function () {
        const context = validateContext();
        if (!context) return;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx,.xls';
        fileInput.addEventListener('change', async function () {
            if (!fileInput.files[0]) return;
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            Object.entries(context).forEach(([key, value]) => formData.append(key, value));
            showLoading('Đang đọc file và kiểm tra từng dòng.');
            try {
                const response = await fetch(`${BASE_URL}/kthp-import/preview`, {
                    method: 'POST',
                    body: formData
                });
                const preview = await response.json();
                if (!response.ok || !preview.success) throw new Error(preview.message || 'Preview thất bại');
                const message = applyPreview(preview);
                await showAlert(preview.summary.invalid ? 'warning' : 'success', message);
            } catch (error) {
                await showAlert('error', error.message || 'Không thể xử lý file.');
            }
        });
        fileInput.click();
    });

    document.getElementById('import').addEventListener('click', async function () {
        const context = validateContext();
        if (!context) return;
        const editedRows = collectEditedRows();
        if (!editedRows.length) return showAlert('warning', 'Chưa có dữ liệu để lưu.');

        showLoading('Đang kiểm tra lại dữ liệu đã chỉnh sửa.');
        try {
            const response = await fetch(`${BASE_URL}/kthp-import/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'EXCEL',
                    input: { rows: editedRows },
                    context
                })
            });
            const preview = await response.json();
            if (!response.ok || !preview.success) throw new Error(preview.message || 'Preview thất bại');
            const message = applyPreview(preview);
            if (!preview.previewToken) {
                return showAlert('error', `${message}<br><br>Hãy sửa lỗi rồi kiểm tra lại.`);
            }

            const confirmation = await Swal.fire({
                title: 'Xác nhận import',
                html: `${message}<br><br>Không có bản ghi cũ nào bị ghi đè.`,
                icon: preview.summary.warning ? 'warning' : 'question',
                showCancelButton: true,
                confirmButtonText: 'Lưu dữ liệu',
                cancelButtonText: 'Quay lại'
            });
            if (!confirmation.isConfirmed) return;

            showLoading('Đang lưu toàn bộ batch trong một transaction.');
            const commitResponse = await fetch(`${BASE_URL}/kthp-import/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ previewToken: preview.previewToken })
            });
            const result = await commitResponse.json();
            if (!commitResponse.ok || !result.success) {
                throw new Error(result.message || 'Không thể lưu dữ liệu');
            }
            await showAlert('success', result.message);
            location.reload();
        } catch (error) {
            await showAlert('error', error.message || 'Không thể lưu dữ liệu.');
        }
    });

    document.addEventListener('click', async function (event) {
        const button = event.target.closest('.btn-delete');
        if (!button) return;
        const confirmation = await Swal.fire({
            title: 'Xóa dòng khỏi preview?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });
        if (!confirmation.isConfirmed) return;
        dataTam = dataTam.filter((item) => item._key !== button.dataset.key);
        renderAll();
    });

    loadEmployees();
    loadEducationSystems();
});
