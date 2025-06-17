document.addEventListener('DOMContentLoaded', function () {
    // Utility function for rendering tables with DataTables
    function renderTable(data, containerId, columns, tableId = containerId + "Table") {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Không có dữ liệu để hiển thị.</p></div>';
            return;
        }

        const table = document.createElement("table");
        table.className = "table table-bordered table-hover";
        table.id = tableId;

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        columns.forEach(column => {
            const th = document.createElement("th");
            th.textContent = column;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // ➕ Thêm cột "Hành động"
        const actionTh = document.createElement("th");
        actionTh.textContent = "Hành động";
        headerRow.appendChild(actionTh);

        const tbody = document.createElement("tbody");
        data.forEach((item, index) => {
            const row = document.createElement("tr");
            columns.forEach((column, colIndex) => {
                const td = document.createElement("td");

                if (colIndex === 0) {
                    const input = document.createElement("input");
                    input.setAttribute("list", "nhanSuSuggestions");
                    input.className = "form-control form-control-sm";
                    input.value = item[column] ?? "";

                    // Auto-fill mã phòng ban khi chọn tên
                    input.addEventListener("change", (e) => {
                    const selected = nhanSuList.find(n => n.TenNhanVien === e.target.value);
                    if (selected) {
                        const maPhongBanTd = row.children[1]; // Cột thứ 2
                        if (maPhongBanTd) maPhongBanTd.textContent = selected.MaPhongBan;
                    }
                    });

                    td.appendChild(input);
                } else if (colIndex === 1) {
                    td.textContent = item[column] ?? ""; // Không editable
                } else {
                    td.contentEditable = true;
                    td.textContent = item[column] ?? "";
                }

                row.appendChild(td);
            });


            // ➕ Cột "Hành động"
            const actionTd = document.createElement("td");
            actionTd.innerHTML = `
                <button class="btn-delete btn btn-sm btn-danger" data-index="${index}" data-type="${item.Type}"><i class="bi bi-trash"></i></button>
            `;
            row.appendChild(actionTd);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        container.appendChild(table);

        

        $(`#${table.id}`).DataTable({
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/vi.json' },
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            order: [],
            responsive: true
        });
    }

    let nhanSuList = [] // Dùng để map mã sau này

    async function loadNhanSuSuggestions() {
    try {
        const response = await fetch("/importkthp/getSuggestions");
        if (!response.ok) throw new Error("Lỗi khi tải danh sách");

        nhanSuList = await response.json();

        const datalist = document.createElement("datalist");
        datalist.id = "nhanSuSuggestions";

        nhanSuList.forEach(({ TenNhanVien, MaPhongBan }) => {
        const option = document.createElement("option");
        option.value = TenNhanVien;
        option.label = `${TenNhanVien} - ${MaPhongBan}`; // Gợi ý hiển thị
        datalist.appendChild(option);
        });

        document.body.appendChild(datalist);
    } catch (error) {
        console.error("Không thể tải danh sách:", error);
    }
    }

    loadNhanSuSuggestions();


    // Consolidated column definitions
    const columnDefs = {
        raDe: ['hoVaTen', 'khoa', 'tenHocPhan', 'lopHocPhan', 'doiTuong', 'soDe', 'soTietQC'],
        coiThi: ['hoVaTen', 'khoa', 'tenHocPhan', 'lopHocPhan', 'doiTuong', 'soCa', 'soTietQC'],
        chamThi: ['hoVaTen', 'khoa', 'tenHocPhan', 'lopHocPhan', 'doiTuong', 'soBaiCham1', 'soBaiCham2', 'tongSoBai', 'soTietQC']
    };

    let dataTam = [];

    // File upload handler
    document.getElementById('chooseFile').addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx';
        fileInput.addEventListener('change', async function() {
            const selectedFile = fileInput.files[0];
            if (!selectedFile) {
                return showAlert('warning', 'Bạn chưa chọn tệp nào.');
            }

            const formData = new FormData();
            formData.append('file', selectedFile);
            showLoading();

            try {
                const response = await fetch('/importkthp/upload', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error('Import thất bại');
                const data = await response.json();

                if (!data || (!data.raDe.length && !data.coiThi.length && !data.chamThi.length)) {
                    throw new Error('Dữ liệu trả về trống');
                }

                dataTam = [
                    ...data.raDe.map(item => ({ ...item, Type: 'Ra Đề' })),
                    ...data.coiThi.map(item => ({ ...item, Type: 'Coi Thi' })),
                    ...data.chamThi.map(item => ({ ...item, Type: 'Chấm Thi' }))
                ];

                renderTable(dataTam.filter(item => item.Type === 'Ra Đề'), 'raDeTableContainer', columnDefs.raDe);
                renderTable(dataTam.filter(item => item.Type === 'Coi Thi'), 'coiThiTableContainer', columnDefs.coiThi);
                renderTable(dataTam.filter(item => item.Type === 'Chấm Thi'), 'chamThiTableContainer', columnDefs.chamThi);

                showAlert('success', 'Tệp đã được tải lên và xử lý thành công!');
            } catch (error) {
                showAlert('error', error.message || 'Đã xảy ra lỗi khi xử lý tệp.');
                console.error('Error:', error);
            } finally {
                Swal.close();
            }
        });
        fileInput.click();
    });

    // Form submission for adding single entry
    document.getElementById('addEntryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const entry = {
            section: document.getElementById('section').value,
            hoVaTen: document.getElementById('hoVaTen').value,
            khoa: document.getElementById('khoa').value,
            tenHocPhan: document.getElementById('tenHocPhan').value,
            lopHocPhan: document.getElementById('lopHocPhan').value,
            doiTuong: document.getElementById('doiTuong').value,
            soDe: document.getElementById('soDe').value || null,
            soCa: document.getElementById('soCa').value || null,
            soBaiCham1: document.getElementById('soBaiCham1').value || null,
            soBaiCham2: document.getElementById('soBaiCham2').value || null,
            tongSoBai: document.getElementById('tongSoBai').value || null,
            soTietQC: document.getElementById('soTietQC').value
        };

        if (!entry.hoVaTen || !entry.khoa || !entry.tenHocPhan || !entry.lopHocPhan || !entry.doiTuong || !entry.soTietQC) {
            return showAlert('warning', 'Vui lòng điền đầy đủ các trường bắt buộc!');
        }

        try {
            const response = await fetch('/importkthp/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
            if (!response.ok) throw new Error('Thêm dữ liệu thất bại');
            const data = await response.json();

            dataTam.push({ ...data, Type: entry.section === 'raDe' ? 'Ra Đề' : entry.section === 'coiThi' ? 'Coi Thi' : 'Chấm Thi' });

            renderTable(dataTam.filter(item => item.Type === 'Ra Đề'), 'raDeTableContainer', columnDefs.raDe);
            renderTable(dataTam.filter(item => item.Type === 'Coi Thi'), 'coiThiTableContainer', columnDefs.coiThi);
            renderTable(dataTam.filter(item => item.Type === 'Chấm Thi'), 'chamThiTableContainer', columnDefs.chamThi);

            showAlert('success', 'Dữ liệu đã được thêm thành công!');
            document.getElementById('addEntryForm').reset();
        } catch (error) {
            showAlert('error', error.message || 'Đã xảy ra lỗi khi thêm dữ liệu.');
            console.error('Error:', error);
        }
    });

    // Utility function for showing alerts
    function showAlert(icon, message) {
        Swal.fire({
            title: icon === 'success' ? 'Thành công' : 'Lỗi',
            html: message,
            icon: icon,
            confirmButtonText: 'OK',
            width: 'auto',
            padding: '20px'
        });
    }

    // Utility function for showing loading state
    function showLoading() {
        Swal.fire({
            title: 'Đang xử lý...',
            html: 'Vui lòng chờ trong khi tệp được tải lên.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }

    // Check data existence on server
    async function checkDataExistence(kiValue, namValue) {
        // Lấy dữ liệu đã chỉnh sửa từ các bảng
        const raDeData = extractEditedData('raDeTableContainer', columnDefs.raDe, 'Ra Đề');
        const coiThiData = extractEditedData('coiThiTableContainer', columnDefs.coiThi, 'Coi Thi');
        const chamThiData = extractEditedData('chamThiTableContainer', columnDefs.chamThi, 'Chấm Thi');

        // Cập nhật lại dataTam
        dataTam = [...raDeData, ...coiThiData, ...chamThiData];
        console.log('Data to be sent:', dataTam);
        try {
            const response = await fetch('/importkthp/checkfile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Ki: kiValue, Nam: namValue })
            });
            if (!response.ok) throw new Error('Kiểm tra dữ liệu thất bại');
            const data = await response.json();
            if (data.exists) {
                showModal(kiValue, namValue);
            } else {
                saveData(kiValue, namValue);
            }
        } catch (error) {
            showAlert('error', 'Kiểm tra dữ liệu file quy chuẩn thất bại!');
            console.error('Error:', error);
        }
    }

    // Show modal for data conflict resolution
    function showModal(kiValue, namValue) {
        const modal = document.getElementById('action-modal');
        document.getElementById('modal-message').innerHTML = 
            `Đã tồn tại dữ liệu của Kì ${kiValue}, Năm ${namValue}. Thực hiện XÓA file cũ hay CHÈN thêm file mới?<br>Lưu ý: XÓA sẽ loại bỏ file cũ và chèn thêm, CHÈN sẽ không loại bỏ file cũ và chèn thêm`;
        modal.style.display = 'block';

        document.getElementById('btn-delete').onclick = () => {
            modal.style.display = 'none';
            deleteFile(kiValue, namValue);
        };
        document.getElementById('btn-append').onclick = () => {
            modal.style.display = 'none';
            appendData(kiValue, namValue);
        };
        document.getElementById('btn-cancel').onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Save data to server with custom messages
    async function saveDataToServer(kiValue, namValue, dataTam, messages) {
        try {
            const response = await fetch('/importkthp/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Ki: kiValue,
                    Nam: namValue,
                    data: dataTam // Truyền thêm dataTam
                })
            });

            if (!response.ok) throw new Error(messages.error);

            const data = await response.json();

            showAlert(data.success ? 'success' : 'error', data.success ? messages.success : messages.failure);

            if (data.success) location.reload();
        } catch (error) {
            showAlert('error', error.message || messages.error);
            console.error('Error:', error);
        }
    }

    // Delete existing data and save new
    async function deleteFile(kiValue, namValue) {
        try {
            const response = await fetch('/importkthp/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Ki: kiValue, Nam: namValue })
            });
            if (!response.ok) throw new Error('Xóa dữ liệu thất bại');
            const messages = {
                success: 'Dữ liệu cũ đã được xóa và dữ liệu mới được thêm thành công.',
                failure: 'Xóa dữ liệu cũ thành công, nhưng thêm dữ liệu mới thất bại.',
                error: 'Có lỗi xảy ra trong quá trình thêm dữ liệu mới.'
            };
            await saveDataToServer(kiValue, namValue, dataTam, messages);
        } catch (error) {
            showAlert('error', 'Xóa dữ liệu thất bại');
            console.error('Error:', error);
        }
    }

    // Append new data
    async function appendData(kiValue, namValue) {
        const messages = {
            success: 'Chèn thành công',
            failure: 'Chèn thêm thất bại',
            error: 'Gửi dữ liệu thất bại'
        };
        await saveDataToServer(kiValue, namValue, dataTam, messages);
    }

    // Save data when no conflict
    async function saveData(kiValue, namValue) {
        const messages = {
            success: 'Thêm file thành công',
            failure: 'Thêm file thất bại',
            error: 'Gửi dữ liệu thất bại'
        };
        await saveDataToServer(kiValue, namValue, dataTam,messages);
    }

    // Handle import button click
    document.getElementById('import').addEventListener('click', function() {
        const kiValue = document.getElementById('comboboxki').value;
        const namValue = document.getElementById('NamHoc').value;
        if (!kiValue || !namValue) {
            return showAlert('warning', 'Vui lòng chọn Đợt, Kỳ và Năm học trước khi thêm!');
        }
        checkDataExistence(kiValue, namValue);
    });

    document.getElementById('viewtam').addEventListener('click', function() {
        window.location.href = '/vuotGioDanhGiaCuoiKi';
    });

    function extractEditedData(containerId, columns, typeLabel) {
        const table = document.querySelector(`#${containerId}Table`);
        if (!table) return [];

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll("td"));
            const obj = {};
            columns.forEach((col, index) => {
                let value = "";

                // ✅ Nếu có input thì lấy value từ input
                const input = cells[index]?.querySelector("input");
                if (input) {
                    value = input.value.trim();
                } else {
                    value = cells[index]?.textContent.trim() || "";
                }
                obj[col] = value;
            });
            obj.Type = typeLabel;
            return obj;
        });
    }

    document.addEventListener('click', function (e) {
        const deleteBtn = e.target.closest('.btn-delete');
        if (!deleteBtn) return;

        const index = parseInt(deleteBtn.getAttribute('data-index'));
        const type = deleteBtn.getAttribute('data-type');

        // Hiển thị hộp thoại xác nhận
        Swal.fire({
            title: 'Xác nhận xóa?',
            text: "Bạn có chắc chắn muốn xóa dòng dữ liệu này?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
            // Xóa phần tử theo index và type

            let filteredData = dataTam.filter(item => item.Type === type);
            filteredData.splice(index, 1);

            // Cập nhật lại dataTam
            dataTam = dataTam.filter(item => item.Type !== type).concat(filteredData);

            // Vẽ lại bảng
            renderTable(dataTam.filter(item => item.Type === 'Ra Đề'), 'raDeTableContainer', columnDefs.raDe);
            renderTable(dataTam.filter(item => item.Type === 'Coi Thi'), 'coiThiTableContainer', columnDefs.coiThi);
            renderTable(dataTam.filter(item => item.Type === 'Chấm Thi'), 'chamThiTableContainer', columnDefs.chamThi);
            }
        });
    });



});