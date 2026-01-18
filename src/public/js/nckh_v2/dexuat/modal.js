/**
 * NCKH V2 - Đề Xuất Nghiên Cứu - Modal Module
 * Xử lý hiển thị modal xác nhận và chi tiết
 * Refactored: Bỏ Tác giả chính và Số năm thực hiện
 */

(function () {
    'use strict';

    // =====================================================
    // CONFIRMATION MODAL
    // =====================================================

    async function showConfirmationModal(formData) {
        console.log("=== showConfirmationModal called ===");
        console.log("formData:", formData);

        // Get member list
        let memberList = [];
        if (typeof DeXuat_Autocomplete !== 'undefined' && DeXuat_Autocomplete.getMemberList) {
            memberList = DeXuat_Autocomplete.getMemberList() || [];
        }
        console.log("memberList from Autocomplete:", memberList);

        // For members - also check formData.thanhVien
        if ((!memberList || memberList.length === 0) && formData.thanhVien) {
            if (Array.isArray(formData.thanhVien)) {
                memberList = formData.thanhVien;
            } else if (typeof formData.thanhVien === 'string' && formData.thanhVien.trim() !== '') {
                memberList = formData.thanhVien.split(', ').filter(m => m.trim() !== '');
            }
            console.log("Using formData.thanhVien as fallback");
        }

        console.log("Final memberList:", memberList);

        // Build HTML for thành viên - plain text
        let memberHtml = '<em class="text-muted">Chưa có thành viên</em>';
        if (memberList && memberList.length > 0) {
            memberHtml = memberList.join(', ');
        }

        console.log("memberHtml:", memberHtml);

        const result = await Swal.fire({
            title: 'Xác nhận thông tin',
            html: `
            <div class="confirmation-modal-content" style="text-align: left; font-size: 1.1rem;">
                <div class="mb-2"><strong>Cấp đề xuất:</strong> ${formData.capDeXuat || '-'}</div>
                <div class="mb-2"><strong>Năm học:</strong> ${formData.namHoc || '-'}</div>
                <div class="mb-2"><strong>Tên đề xuất:</strong> ${formData.tenDeXuat || '-'}</div>
                <div class="mb-2"><strong>Mã số:</strong> ${formData.maSoDeXuat || '-'}</div>
                <div class="mb-2"><strong>Kết quả:</strong> ${formData.ketQua || '-'}</div>
                <div class="mb-2"><strong>Ngày nghiệm thu:</strong> ${formData.ngayNghiemThu || '-'}</div>
                <hr>
                <div class="mb-2"><strong>Thành viên tham gia (${memberList.length}):</strong><br>${memberHtml}</div>
            </div>
        `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy',
            width: '650px'
        });

        return result;
    }

    // =====================================================
    // DETAIL MODAL
    // =====================================================

    function showDetailModal(data) {
        const modalBody = document.getElementById('detailModalBodyDX');
        if (!modalBody) return;

        // Helper function để format ngày
        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('vi-VN');
            } catch (e) {
                return dateStr;
            }
        };

        // Helper function để format trạng thái duyệt
        const formatDuyet = (value) => {
            if (value === 1 || value === '1' || value === true) {
                return '<span class="badge bg-success">Đã duyệt</span>';
            }
            return '<span class="badge bg-warning text-dark">Chưa duyệt</span>';
        };

        modalBody.innerHTML = `
        <div class="detail-content">
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Cấp đề xuất:</strong>
                    <p>${data.CapDeXuat || '-'}</p>
                </div>
                <div class="col-md-6">
                    <strong>Năm học:</strong>
                    <p>${data.NamHoc || '-'}</p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-12">
                    <strong>Tên đề xuất:</strong>
                    <p>${data.TenDeXuat || '-'}</p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Mã số:</strong>
                    <p>${data.MaSoDeXuat || '-'}</p>
                </div>
                <div class="col-md-6">
                    <strong>Kết quả:</strong>
                    <p>${data.KetQua || '-'}</p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Ngày nghiệm thu:</strong>
                    <p>${formatDate(data.NgayNghiemThu)}</p>
                </div>
                <div class="col-md-6">
                    <strong>Trạng thái duyệt:</strong>
                    <p>${formatDuyet(data.DaoTaoDuyet)}</p>
                </div>
            </div>

            <hr>

            <div class="row mb-3">
                <div class="col-12">
                    <strong>Danh sách thành viên:</strong>
                    <p>${data.DanhSachThanhVien || '-'}</p>
                </div>
            </div>
        </div>
    `;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('detailModalDX'));
        modal.show();
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.DeXuat_Modal = {
        showConfirmationModal,
        showDetailModal
    };

})(); // End of IIFE
