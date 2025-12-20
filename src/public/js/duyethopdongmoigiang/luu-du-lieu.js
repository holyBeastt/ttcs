/**
 * luu-du-lieu.js
 * Xu ly luu va bo luu du lieu hop dong moi giang
 */

/**
 * Luu du lieu hop dong moi giang
 */
function saveContractDataMoiGiang() {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();

    if (!dot || !ki || !namHoc) {
        Swal.fire({ title: 'Lỗi!', text: 'Vui lòng chọn đầy đủ Đợt, Kỳ và Năm học', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    const message = `Bạn có chắc chắn muốn lưu dữ liệu hợp đồng mời giảng cho đợt ${dot}, kỳ ${ki}, năm học ${namHoc}?`;

    Swal.fire({
        title: 'Xác nhận lưu dữ liệu',
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Có, lưu dữ liệu',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            const duLieu = { dot, ki, namHoc };
            showLoading(true, 'Đang lưu dữ liệu hợp đồng...');

            fetch("/submitData2", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(duLieu)
            })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    Swal.fire({ title: 'Thông báo', html: data.message, icon: 'success', confirmButtonText: 'OK', width: 'auto', padding: '20px' })
                        .then(() => { loadContractData(); });
                })
                .catch(error => {
                    console.error("Error sending signal:", error);
                    Swal.fire({ title: 'Lỗi!', text: 'Đã xảy ra lỗi trong quá trình lưu dữ liệu.', icon: 'error', confirmButtonText: 'OK' });
                })
                .finally(() => {
                    showLoading(false);
                });
        }
    });
}

/**
 * Bo luu du lieu hop dong moi giang
 */
function unsaveContractDataMoiGiang() {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();

    if (!dot || !ki || !namHoc) {
        Swal.fire({ title: 'Lỗi!', text: 'Vui lòng chọn đầy đủ Đợt, Kỳ và Năm học', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    const message = `Bạn có chắc chắn muốn BỎ LƯU dữ liệu hợp đồng mời giảng cho đợt ${dot}, kỳ ${ki}, năm học ${namHoc}?`;

    Swal.fire({
        title: 'Xác nhận bỏ lưu dữ liệu',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Có, bỏ lưu dữ liệu',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            const duLieu = { dot, ki, namHoc };
            showLoading(true, 'Đang xử lý bỏ lưu hợp đồng...');

            fetch("/api/v1/moi-giang/unsave-all", {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(duLieu)
            })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    Swal.fire({ title: 'Thông báo', html: data.message, icon: 'success', confirmButtonText: 'OK', width: 'auto', padding: '20px' })
                        .then(() => { loadContractData(); });
                })
                .catch(error => {
                    console.error("Error sending signal:", error);
                    Swal.fire({ title: 'Lỗi!', text: 'Đã xảy ra lỗi trong quá trình bỏ lưu dữ liệu.', icon: 'error', confirmButtonText: 'OK' });
                })
                .finally(() => {
                    showLoading(false);
                });
        }
    });
}

