/**
 * NCKH V2 - Thành viên Hội đồng - Modal Module
 * Xử lý hiển thị modal xác nhận và chi tiết
 * Hỗ trợ hiển thị DANH SÁCH thành viên
 * Pattern tham khảo từ: dexuat/modal.js
 */

(function () {
    'use strict';

    // =====================================================
    // CONFIRMATION MODAL
    // =====================================================

    async function showConfirmationModal(formData, memberList) {
        console.log("=== HoiDong showConfirmationModal called ===");
        console.log("formData:", formData);
        console.log("memberList:", memberList);

        // Get member list
        let finalMemberList = [];

        // Priority 1: Parameter passed in
        if (memberList && Array.isArray(memberList) && memberList.length > 0) {
            finalMemberList = memberList;
        }
        // Priority 2: From formData.thanhVien
        else if (formData.thanhVien && Array.isArray(formData.thanhVien)) {
            finalMemberList = formData.thanhVien;
        }
        // Priority 3: From HoiDong_Autocomplete
        else if (typeof HoiDong_Autocomplete !== 'undefined' && HoiDong_Autocomplete.getMemberList) {
            finalMemberList = HoiDong_Autocomplete.getMemberList() || [];
        }

        // Build HTML for thành viên - plain text list
        let memberHtml = '<em class="text-muted">Chưa có</em>';
        if (finalMemberList && finalMemberList.length > 0) {
            memberHtml = finalMemberList.join(', ');
        }

        const result = await Swal.fire({
            title: 'Xác nhận thông tin',
            html: `
            <div class="confirmation-modal-content" style="text-align: left; font-size: 1.1rem;">
                <div class="mb-2"><strong>Loại hội đồng:</strong> ${formData.loaiHoiDong || '-'}</div>
                <div class="mb-2"><strong>Năm học:</strong> ${formData.namHoc || '-'}</div>
                <div class="mb-2"><strong>Tên đề tài/chương trình:</strong> ${formData.tenDeTai || '-'}</div>
                <hr>
                <div class="mb-2"><strong>Thành viên hội đồng (${finalMemberList.length}):</strong><br>${memberHtml}</div>
                <div class="mb-2" style="color: #0d6efd; font-size: 0.95rem;">
                    <i class="fas fa-info-circle"></i> 
                    <strong>Lưu ý:</strong> Mỗi thành viên nhận đủ số tiết theo loại hội đồng (không chia).
                </div>
            </div>
        `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy',
            width: '600px'
        });

        return result;
    }

    // =====================================================
    // DETAIL MODAL
    // =====================================================

    function showDetailModal(data) {
        const modalBody = document.getElementById('detailModalBodyHoiDong');
        if (!modalBody) return;

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
                    <strong>Loại hội đồng:</strong>
                    <p>${data.LoaiHoiDong || '-'}</p>
                </div>
                <div class="col-md-6">
                    <strong>Năm học:</strong>
                    <p>${data.NamHoc || '-'}</p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-12">
                    <strong>Tên đề tài/chương trình:</strong>
                    <p>${data.TenDeTai || '-'}</p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Số tiết quy đổi (mỗi người):</strong>
                    <p style="color: #0d6efd; font-weight: bold;">${data.SoTiet ? parseFloat(data.SoTiet).toFixed(2) + ' tiết' : '-'}</p>
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
                    <p>${data.ThanhVien || '-'}</p>
                </div>
            </div>
        </div>
    `;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('detailModalHoiDong'));
        modal.show();
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.HoiDong_Modal = {
        showConfirmationModal,
        showDetailModal
    };

})(); // End of IIFE
