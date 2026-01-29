/**
 * NCKH V2 - Sáng Kiến - Modal Module
 * Xử lý hiển thị modal chi tiết
 */

(function () {
    'use strict';

    // =====================================================
    // DETAIL MODAL
    // =====================================================

    function showDetailModal(data) {
        const modal = document.getElementById('detailModalSK');
        const modalBody = document.getElementById('detailModalBodySK');

        const detailHtml = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Loại Sáng Kiến:</label>
                <p class="form-control-plaintext">${data.LoaiSangKien || ''}</p>
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
                <label class="form-label fw-bold">Tên Sáng Kiến:</label>
                <p class="form-control-plaintext">${data.TenSangKien || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Mã Số Sáng Kiến:</label>
                <p class="form-control-plaintext">${data.MaSoSangKien || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Tác Giả Chính:</label>
                <p class="form-control-plaintext">${data.TacGiaChinh || ''}</p>
            </div>
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">Danh Sách Thành Viên:</label>
                <p class="form-control-plaintext">${data.DanhSachThanhVien || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Ngày Nghiệm Thu:</label>
                <p class="form-control-plaintext">${data.NgayNghiemThu ? NCKH_V2_Utils.formatDate(data.NgayNghiemThu) : '<em style="color: #999;">Chưa có</em>'}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Kết Quả:</label>
                <p class="form-control-plaintext">${data.KetQua || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Số Năm Thực Hiện:</label>
                <p class="form-control-plaintext">${data.SoNamThucHien || ''}</p>
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

    async function showConfirmationModal(formData, tacGiaList) {
        const thanhVienText = formData.thanhVien.length > 0
            ? formData.thanhVien.join(", ")
            : "<em style='color: #999;'>Không có</em>";

        const ngayNghiemThuText = formData.ngayNghiemThu || "<em style='color: #999;'>Chưa có</em>";
        const maSoText = formData.maSoSangKien || "<em style='color: #999;'>Chưa có</em>";

        const htmlContent = `
        <div style="text-align: left; padding: 10px 20px; font-size: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; width: 180px; color: #495057; font-size: 15px;">Loại sáng kiến:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.loaiSangKien}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Năm học:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.namHoc}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Tên sáng kiến:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;"><strong>${formData.tenSangKien}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Mã số sáng kiến:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${maSoText}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Tác giả chính:</td>
                    <td style="padding: 10px 0; color: #0d6efd; font-size: 15px;"><strong>${tacGiaList.join(", ")}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Thành viên:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${thanhVienText}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Số năm thực hiện:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.soNamThucHien} năm</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Kết quả:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.ketQua}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Ngày nghiệm thu:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${ngayNghiemThuText}</td>
                </tr>
            </table>
        </div>
    `;

        return await Swal.fire({
            title: '<strong>Xác nhận thông tin sáng kiến</strong>',
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

    window.SangKien_Modal = {
        showDetailModal,
        showConfirmationModal
    };

})(); // End of IIFE
