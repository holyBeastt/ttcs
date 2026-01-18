/**
 * NCKH V2 - Bài Báo Khoa Học - Modal Module
 * Xử lý hiển thị modal chi tiết và xác nhận
 */

(function () {
    'use strict';

    // =====================================================
    // DETAIL MODAL
    // =====================================================

    function showDetailModal(data) {
        const modal = document.getElementById('detailModalBB');
        const modalBody = document.getElementById('detailModalBodyBB');

        const detailHtml = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Loại Tạp Chí:</label>
                <p class="form-control-plaintext">${data.LoaiTapChi || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Chỉ Số Tạp Chí:</label>
                <p class="form-control-plaintext">${data.ChiSoTapChi || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Năm Học:</label>
                <p class="form-control-plaintext">${data.NamHoc || ''}</p>
            </div>
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">Tên Bài Báo:</label>
                <p class="form-control-plaintext">${data.TenBaiBao || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Tác Giả:</label>
                <p class="form-control-plaintext">${data.TacGia || ''}</p>
            </div>
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">Danh Sách Thành Viên:</label>
                <p class="form-control-plaintext">${data.DanhSachThanhVien || ''}</p>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Số Năm Thực Hiện:</label>
                <p class="form-control-plaintext">${data.SoNamThucHien || 1}</p>
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

        const htmlContent = `
        <div style="text-align: left; padding: 10px 20px; font-size: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; width: 180px; color: #495057; font-size: 15px;">Loại tạp chí:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.loaiTapChi}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Chỉ số tạp chí:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.chiSoTapChi || '<em style="color: #999;">Chưa chọn</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Năm học:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.namHoc}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Tên bài báo:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;"><strong>${formData.tenBaiBao}</strong></td>
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
            </table>
        </div>
    `;

        return await Swal.fire({
            title: '<strong>Xác nhận thông tin bài báo khoa học</strong>',
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

    window.BaiBao_Modal = {
        showDetailModal,
        showConfirmationModal
    };

})(); // End of IIFE
