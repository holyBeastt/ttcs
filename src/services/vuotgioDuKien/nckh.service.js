const nckhStatsService = require("../../services/nckh_v3/stats.service");

// Sử dụng chung service nckh_v3 nhưng chỉ lấy dữ liệu, không quan tâm duyệt/chưa duyệt
const getNCKHDuKien = async (namHoc, khoaId, keyword = "") => {
    // Trả về danh sách giảng viên và số giờ NCKH của họ
    return await nckhStatsService.getLecturerSummary(namHoc, khoaId, keyword);
};

const getNCKHChiTiet = async (lecturerId, namHoc) => {
    return await nckhStatsService.getLecturerRecords(lecturerId, namHoc);
};

module.exports = {
    getNCKHDuKien,
    getNCKHChiTiet
};
