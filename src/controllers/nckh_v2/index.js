/**
 * NCKH V2 Controllers - Index
 * Entry point cho tất cả NCKH V2 controllers
 * Date: 2026-01-16
 */

const baseController = require('./base.controller');
const deTaiDuAnController = require('./deTaiDuAn.controller');
const sangKienController = require('./sangKien.controller');
const giaiThuongController = require('./giaiThuongBangSangChe.controller');
const deXuatController = require('./deXuatNghienCuu.controller');
const sachGiaoTrinhController = require('./sachGiaoTrinh.controller');
const baiBaoKhoaHocController = require('./baiBaoKhoaHoc.controller');
const huongDanSvNckhController = require('./huongDanSvNckh.controller');
const thanhVienHoiDongController = require('./thanhVienHoiDong.controller');

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Base controller
    ...baseController,

    // Đề tài, Dự án
    ...deTaiDuAnController,

    // Sáng kiến
    ...sangKienController,

    // Giải thưởng KHCN, Bằng sáng chế
    ...giaiThuongController,

    // Đề xuất nghiên cứu
    ...deXuatController,

    // Sách, Giáo trình, Tài liệu
    ...sachGiaoTrinhController,

    // Bài báo, báo cáo khoa học
    ...baiBaoKhoaHocController,

    // Hướng dẫn học viên, sinh viên NCKH
    ...huongDanSvNckhController,

    // Thành viên Hội đồng khoa học
    ...thanhVienHoiDongController
};

