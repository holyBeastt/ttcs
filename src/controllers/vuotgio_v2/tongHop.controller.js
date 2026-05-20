/**
 * VUOT GIO V2 - Tổng Hợp Controller
 * Date: 2026-04-28
 */

const tongHopService = require("../../services/vuotgio_v2/tongHop.service");
const thongKeService = require("../../services/vuotgio_v2/thongKe.service");

/**
 * API Tổng hợp vượt giờ theo Giảng viên
 */
const tongHopTheoGV = async (req, res) => {
    const { namHoc, khoa, detail } = req.query;
    if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });

    try {
        const isDetail = String(detail) === "1";
        console.info("[tongHopTheoGV] request", { namHoc, khoa, detail: isDetail });
        const data = isDetail
            ? await tongHopService.getCollectionSDODetail(namHoc, khoa)
            : await tongHopService.getCollectionSDO(namHoc, khoa);
        console.info("[tongHopTheoGV] response", { count: Array.isArray(data) ? data.length : 0, detail: isDetail });
        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi khi tổng hợp vượt giờ theo GV:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    }
};

/**
 * API Tổng hợp vượt giờ theo Khoa (Thống kê)
 */
const tongHopTheoKhoa = async (req, res) => {
    const { namHoc } = req.query;
    if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });

    try {
        const result = await thongKeService.getThongKeKhoa(namHoc);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("Lỗi khi tổng hợp vượt giờ theo Khoa:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lấy dữ liệu SDO cho 1 giảng viên (Dùng cho Preview/Thống kê lẻ)
 */
const getStandardSummaryData = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !MaGV) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Giảng viên" });
    }

    try {
        const data = await tongHopService.getAtomicSDO(namHoc, decodeURIComponent(MaGV));
        if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu giảng viên" });
        res.json({ success: true, data });
    } catch (error) {
        console.error("[getStandardSummaryData] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * API Lấy chi tiết vượt giờ của một giảng viên (Dùng cho trang Chi tiết)
 */
const chiTietGV = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    try {
        const sdo = await tongHopService.getAtomicSDO(namHoc, decodeURIComponent(MaGV));
        if (!sdo) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu" });

        res.json({
            success: true,
            data: {
                giangVien: sdo.giangVien,
                thongTinNhanVien: {
                    id_User: sdo.id_User,
                    giangVien: sdo.giangVien,
                    maKhoa: sdo.maKhoa,
                    khoa: sdo.khoa,
                    chucVu: sdo.chucVu,
                    phanTramMienGiam: sdo.phanTramMienGiam
                },
                giangDay: sdo.raw.giangDay,
                lopNgoaiQC: sdo.raw.lopNgoaiQC,
                kthp: sdo.raw.kthp,
                doAn: sdo.raw.doAn,
                huongDanThamQuan: sdo.raw.hdtq,
                nckh: sdo.raw.nckhRecords
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    tongHopTheoGV,
    tongHopTheoKhoa,
    getStandardSummaryData,
    chiTietGV,
};
