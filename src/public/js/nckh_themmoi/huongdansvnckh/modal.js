/**
 * NCKH V2 - Hướng dẫn SV NCKH - Modal Module
 * Xử lý hiển thị modal chi tiết
 */

(function () {
    'use strict';

    // =====================================================
    // DETAIL MODAL
    // =====================================================

    function showDetailModal(data) {
        const modal = document.getElementById('detailModalHD');
        const modalBody = document.getElementById('detailModalBodyHD');

        const detailHtml = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Loại Hướng Dẫn:</label>
                <p class="form-control-plaintext">${data.LoaiHuongDan || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Năm Học:</label>
                <p class="form-control-plaintext">${data.NamHoc || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Khoa:</label>
                <p class="form-control-plaintext">${data.Khoa || ''}</p>
            </div>
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">Tên Đề Tài:</label>
                <p class="form-control-plaintext">${data.TenDeTai || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Ngày Nghiệm Thu:</label>
                <p class="form-control-plaintext">${data.NgayNghiemThu ? NCKH_V2_Utils.formatDate(data.NgayNghiemThu) : '<em style="color: #999;">Chưa có</em>'}</p>
            </div>
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">Thành Viên Tham Gia Hướng Dẫn:</label>
                <p class="form-control-plaintext">${data.DanhSachThanhVien || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Kết Quả:</label>
                <p class="form-control-plaintext">${data.KetQua || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Trạng Thái Duyệt:</label>
                <p class="form-control-plaintext">${(data.DaoTaoDuyet === 1 || data.DaoTaoDuyet === true) ? 'Đã duyệt' : 'Chưa duyệt'}</p>
            </div>
        </div>
    `;

        modalBody.innerHTML = detailHtml;
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    // =====================================================
    // CONFIRMATION MODAL
    // =====================================================

    async function showConfirmationModal(formData, memberList) {
        const thanhVienText = memberList.length > 0
            ? memberList.join(", ")
            : "<em style='color: #999;'>Không có</em>";

        const ngayNghiemThuText = formData.ngayNghiemThu || "<em style='color: #999;'>Chưa có</em>";

        const htmlContent = `
        <div style="text-align: left; padding: 10px 20px; font-size: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; width: 200px; color: #495057; font-size: 15px;">Loại hướng dẫn:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.loaiHuongDan}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Năm học:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.namHoc}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Tên đề tài:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;"><strong>${formData.tenDeTai}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Thành viên tham gia:</td>
                    <td style="padding: 10px 0; color: #0d6efd; font-size: 15px;"><strong>${thanhVienText}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Kết quả:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.ketQua || '<em style="color: #999;">Chưa có</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Ngày nghiệm thu:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${ngayNghiemThuText}</td>
                </tr>
            </table>
            <div style="margin-top: 10px; padding: 10px; background-color: #e3f2fd; border-radius: 4px;">
                <i class="fas fa-info-circle" style="color: #0d6efd;"></i>
                <span style="font-size: 14px; color: #0d6efd;">Số tiết sẽ được chia đều cho tất cả thành viên tham gia hướng dẫn.</span>
            </div>
        </div>
    `;

        return await Swal.fire({
            title: '<strong>Xác nhận thông tin hướng dẫn SV NCKH</strong>',
            html: htmlContent,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-check"></i> Xác nhận',
            cancelButtonText: '<i class="fas fa-times"></i> Hủy',
            width: '700px',
            customClass: {
                popup: 'swal-wide'
            }
        });
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.HuongDanSvNckh_Modal = {
        showDetailModal,
        showConfirmationModal
    };

})(); // End of IIFE
