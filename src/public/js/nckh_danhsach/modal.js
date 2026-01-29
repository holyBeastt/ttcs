/**
 * NCKH Danh Sách - Unified Modal Module
 * Xử lý hiển thị modal chi tiết cho tất cả loại NCKH
 */

(function () {
    'use strict';

    /**
     * Hiển thị modal chi tiết
     * @param {Object} data - Dữ liệu bản ghi từ AG-Grid
     */
    function showDetail(data) {
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        const body = document.getElementById('detailModalBody');
        const title = document.getElementById('detailModalLabel');

        const loaiDisplay = NCKH_DanhSach_Grid.LOAI_NCKH_DISPLAY[data.LoaiNCKH] || data.LoaiNCKH;
        title.innerHTML = `Chi Tiết: ${loaiDisplay}`;

        // Helper to generate detail rows
        const createRow = (label, value) => `
            <div class="row border-bottom py-2">
                <div class="col-md-4 fw-bold text-muted text-uppercase small">${label}</div>
                <div class="col-md-8 text-dark">${value || '---'}</div>
            </div>
        `;

        let html = `
            <div class="detail-minimal p-2">
                ${createRow('Loại NCKH', loaiDisplay)}
                ${createRow('Phân loại', data.PhanLoai)}
                ${createRow('Tên công trình', `<span class="fw-bold">${data.TenCongTrinh}</span>`)}
                ${createRow('Mã số', data.MaSo)}
                ${createRow('Kết quả', data.KetQua)}
                ${createRow('Tác giả chính / Chủ nhiệm', formatList(data.TacGiaChinh))}
                ${createRow('Thành viên', formatList(data.DanhSachThanhVien))}
                ${createRow('Kì/Năm học', data.NamHoc)}
                ${createRow('Ngày n.thu', formatDate(data.NgayNghiemThu))}
                ${createRow('Ngày q.định', formatDate(data.NgayQuyetDinh))}
                ${createRow('Khoa/Phòng', data.Khoa)}
                ${createRow('Số năm', data.SoNamThucHien)}
                ${createRow('Số lượng/Tiet', data.SoDongTacGia || 1)}

                <div class="row mt-4 pt-3">
                    <div class="col-md-6 text-center">
                        <div class="small fw-bold text-muted text-uppercase mb-1">Khoa duyệt</div>
                        <div class="py-2 border rounded ${data.KhoaDuyet === 1 ? 'bg-light text-dark' : 'text-muted'}">
                            ${data.KhoaDuyet === 1 ? 'ĐÃ DUYỆT' : 'CHƯA DUYỆT'}
                        </div>
                    </div>
                    <div class="col-md-6 text-center">
                        <div class="small fw-bold text-muted text-uppercase mb-1">Viện NC duyệt</div>
                        <div class="py-2 border rounded ${data.DaoTaoDuyet === 1 ? 'bg-light text-dark' : 'text-muted'}">
                            ${data.DaoTaoDuyet === 1 ? 'ĐÃ DUYỆT' : 'CHƯA DUYỆT'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.innerHTML = html;
        modal.show();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '---';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return dateStr;
        }
    }

    function formatList(value) {
        if (!value) return '---';
        return value.split(/[,;]/).map(item => `<div>• ${item.trim()}</div>`).join('');
    }

    window.NCKH_DanhSach_Modal = {
        showDetail
    };

})();
