/**
 * luu-du-lieu.js
 * Các hàm lưu và bỏ lưu dữ liệu hợp đồng đồ án
 */

/**
 * Lưu dữ liệu hợp đồng đồ án
 */
function saveContractDataDoAn() {
    const params = getFilterParams();
    if (!validateParams(params)) {
        Swal.fire({
            title: 'Lỗi!',
            text: 'Vui lòng chọn đầy đủ Đợt, Kỳ và Năm học',
            icon: 'error'
        });
        return;
    }

    showLoading(true);
    const requestData = {
        Dot: params.dot,
        ki: params.ki,
        NamHoc: params.namHoc,
        MaPhongBan: params.maPhongBan || "ALL"
    };

    fetch('/saveToExportDoAn', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            if (!response.ok) throw new Error("Lỗi khi gửi dữ liệu");
            return response.json();
        })
        .then(data => {
            Swal.fire({
                title: "Thông báo",
                html: data.message,
                icon: "success",
                confirmButtonText: "OK"
            });
            // Tự động cập nhật cột "Đã lưu" sau khi lưu thành công
            updateContractStatusForTeachers();
        })
        .catch(error => {
            console.error("Có lỗi xảy ra:", error);
            Swal.fire({
                title: "Thông báo",
                html: "Có lỗi xảy ra khi cập nhật dữ liệu.",
                icon: "error"
            });
        })
        .finally(() => showLoading(false));
}

/**
 * Bỏ lưu dữ liệu hợp đồng đồ án
 */
function unsaveContractDataDoAn() {
    const params = getFilterParams();
    if (!validateParams(params)) {
        Swal.fire({
            title: 'Lỗi!',
            text: 'Vui lòng chọn đầy đủ Đợt, Kỳ và Năm học',
            icon: 'error'
        });
        return;
    }

    showLoading(true);
    const requestData = {
        Dot: params.dot,
        Ki: params.ki,
        NamHoc: params.namHoc,
        MaPhongBan: params.maPhongBan || "ALL",
        he_dao_tao: "Đồ án (Đại học)"
    };

    fetch('api/v1/doan/unsave-all', {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            if (!response.ok) throw new Error("Lỗi khi gửi dữ liệu");
            return response.json();
        })
        .then(data => {
            Swal.fire({
                title: "Thông báo",
                html: data.message,
                icon: "success",
                confirmButtonText: "OK"
            });
            // Tự động cập nhật cột "Đã lưu" sau khi bỏ lưu thành công
            updateContractStatusForTeachers();
            updateBrowserStatus();
        })
        .catch(error => {
            console.error("Có lỗi xảy ra:", error);
            Swal.fire({
                title: "Thông báo",
                html: "Có lỗi xảy ra khi bỏ lưu data đồ án.",
                icon: "error"
            });
        })
        .finally(() => showLoading(false));
}
