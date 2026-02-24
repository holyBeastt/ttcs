/**
 * NCKH V2 - Sách Giáo Trình - Modal Module
 * Xử lý hiển thị modal chi tiết và xác nhận
 */

(function () {
    'use strict';

    // =====================================================
    // DETAIL MODAL
    // =====================================================

    function showDetailModal(data) {
        const modal = document.getElementById('detailModalSGT');
        const modalBody = document.getElementById('detailModalBodySGT');

        const detailHtml = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">Phân Loại:</label>
                <p class="form-control-plaintext">${data.PhanLoai || ''}</p>
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
                <label class="form-label fw-bold">Tên Sách/Giáo Trình:</label>
                <p class="form-control-plaintext">${data.TenSachVaGiaoTrinh || ''}</p>
            </div>
            <div class="col-md-4 mb-3">
                <label class="form-label fw-bold">Số Xuất Bản:</label>
                <p class="form-control-plaintext">${data.SoXuatBan || ''}</p>
            </div>
            <div class="col-md-4 mb-3">
                <label class="form-label fw-bold">Số Trang:</label>
                <p class="form-control-plaintext">${data.SoTrang || ''}</p>
            </div>
            <div class="col-md-4 mb-3">
                <label class="form-label fw-bold">Kết Quả:</label>
                <p class="form-control-plaintext">${data.KetQua || ''}</p>
            </div>
            <div class="col-12 mb-3">
                <label class="form-label fw-bold">Chủ Biên/Tác Giả:</label>
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
                    <td style="padding: 10px 0; font-weight: 600; width: 180px; color: #495057; font-size: 15px;">Phân loại:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.phanLoai}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Năm học:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.namHoc}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Tên sách/giáo trình:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;"><strong>${formData.tenSachGiaoTrinh}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Số xuất bản:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.soXuatBan || '<em style="color:#999;">Chưa có</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Số trang:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.soTrang || '<em style="color:#999;">Chưa có</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Kết quả:</td>
                    <td style="padding: 10px 0; color: #212529; font-size: 15px;">${formData.ketQua}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #495057; font-size: 15px;">Chủ biên:</td>
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
            title: '<strong>Xác nhận thông tin sách/giáo trình</strong>',
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

    window.SachGiaoTrinh_Modal = {
        showDetailModal,
        showConfirmationModal
    };

})(); // End of IIFE
