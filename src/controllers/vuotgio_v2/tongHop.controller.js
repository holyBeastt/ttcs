/**
 * VUOT GIO V2 - Tổng Hợp Controller
 * Date: 2026-04-28
 */

const tongHopService = require("../../services/vuotgio_v2/tongHop.service");
const thongKeService = require("../../services/vuotgio_v2/thongKe.service");
const snapshotDataService = require("../../services/vuotgio_v2/snapshotData.service");

/**
 * API Tổng hợp vượt giờ theo Giảng viên
 */
const tongHopTheoGV = async (req, res) => {
    const { namHoc, khoa, detail, isDuKien } = req.query;
    if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });

    try {
        const isDetail = String(detail) === "1";
        
        // Parse isDuKien: 'true' hoặc '1' → true, 'false' hoặc '0' → false, default → true
        let isDuKienBool = true; // Default
        if (isDuKien !== undefined) {
            isDuKienBool = isDuKien === 'true' || isDuKien === '1' || isDuKien === true;
        }
        
        console.info("[tongHopTheoGV] request", { namHoc, khoa, detail: isDetail, isDuKien: isDuKienBool });
        
        const data = isDetail
            ? await tongHopService.getCollectionSDODetail(namHoc, khoa, isDuKienBool)
            : await tongHopService.getCollectionSDO(namHoc, khoa, isDuKienBool);
        
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
    const { namHoc, khoa } = req.query;
    if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });

    try {
        const result = await thongKeService.getThongKeKhoa(namHoc, khoa);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("Lỗi khi tổng hợp vượt giờ theo Khoa:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/**
 * API Tổng hợp vượt giờ theo GV từ dữ liệu đã chốt (snapshot)
 */
const tongHopTheoGVSnapshot = async (req, res) => {
    const { namHoc, khoa } = req.query;
    if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });

    try {
        console.info("[tongHopTheoGVSnapshot] request", { namHoc, khoa });
        const data = await snapshotDataService.getSnapshotSDOList(namHoc, khoa);
        console.info("[tongHopTheoGVSnapshot] response", { count: Array.isArray(data) ? data.length : 0 });
        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu snapshot theo GV:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    }
};

/**
 * Lấy dữ liệu SDO cho 1 giảng viên (Dùng cho Preview/Thống kê lẻ)
 */
const getStandardSummaryData = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc, isDuKien } = req.query;

    if (!namHoc || !MaGV) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Giảng viên" });
    }

    try {
        // Parse isDuKien: 'true' hoặc '1' → true, 'false' hoặc '0' → false, default → true
        let isDuKienBool = true; // Default
        if (isDuKien !== undefined) {
            isDuKienBool = isDuKien === 'true' || isDuKien === '1' || isDuKien === true;
        }
        
        console.info('[getStandardSummaryData]', { MaGV, namHoc, isDuKien: isDuKienBool });
        
        const data = await tongHopService.getAtomicSDO(namHoc, decodeURIComponent(MaGV), null, isDuKienBool);
        if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu giảng viên" });
        res.json({ success: true, data });
    } catch (error) {
        console.error("[getStandardSummaryData] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lấy dữ liệu SDO snapshot cho 1 giảng viên đã khóa.
 */
const getSnapshotSummaryData = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !MaGV) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Giảng viên" });
    }

    try {
        console.info('[getSnapshotSummaryData]', { MaGV, namHoc });

        const data = await snapshotDataService.getSnapshotSDOByUser(namHoc, decodeURIComponent(MaGV));
        if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu giảng viên trong snapshot" });
        res.json({ success: true, data });
    } catch (error) {
        console.error("[getSnapshotSummaryData] Error:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    }
};

/**
 * API Lấy chi tiết vượt giờ của một giảng viên (Dùng cho trang Chi tiết)
 */
const chiTietGV = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc, isDuKien } = req.query;

    try {
        // Parse isDuKien: 'true' hoặc '1' → true, 'false' hoặc '0' → false, default → true
        let isDuKienBool = true; // Default
        if (isDuKien !== undefined) {
            isDuKienBool = isDuKien === 'true' || isDuKien === '1' || isDuKien === true;
        }
        
        console.info('[chiTietGV]', { MaGV, namHoc, isDuKien: isDuKienBool });
        
        const sdo = await tongHopService.getAtomicSDO(namHoc, decodeURIComponent(MaGV), null, isDuKienBool);
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
    tongHopTheoGVSnapshot,
    tongHopTheoKhoa,
    getStandardSummaryData,
    getSnapshotSummaryData,
    chiTietGV,
};
