/**
 * VUOT GIO V2 - Đồ án / Luận án tính vượt giờ Controller
 * Date: 2026-11-09
 */

"use strict";

const statsService = require("../../services/vuotgio_v2/datnStats.service");
const exportService = require("../../services/vuotgio_v2/datnExport.service");

const resolveFacultyScope = (req, targetKhoa) => {
    const isKhoa = req.session?.isKhoa;
    const maPhongBan = req.session?.MaPhongBan;
    const role = req.session?.role || req.session?.Quyen || "";
    const isAdmin = role === "Trợ lý" || role === "Lãnh đạo phòng" || role === "admin" || role === "ADMIN";
    if ((isKhoa === 1 || isKhoa === "1") && !isAdmin && maPhongBan) {
        return maPhongBan;
    }
    return targetKhoa || "ALL";
};

class DatnStatsController {
    renderPreviewPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKe.doAn.ejs", {
            statsScope: "PREVIEW",
            pageTitle: "Thống kê đồ án/luận án dự kiến"
        });
    }

    renderOfficialPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKe.doAn.ejs", {
            statsScope: "OFFICIAL",
            pageTitle: "Thống kê đồ án/luận án chính thức"
        });
    }

    async getFilters(_req, res) {
        try {
            const data = await statsService.getFilters();
            res.json({ success: true, data });
        } catch (error) {
            console.error("[DATN Stats] getFilters error:", error);
            res.status(500).json({ success: false, message: error.message || "Không thể lấy bộ lọc" });
        }
    }

    async getLecturerSummary(req, res) {
        try {
            const { namHoc, dot = "ALL", ki = "ALL", khoa = "ALL", heDaoTao = "ALL", keyword = "", scope = "OFFICIAL" } = req.query;
            const targetKhoa = resolveFacultyScope(req, khoa);
            const data = await statsService.getLecturerSummary({
                namHoc,
                dot,
                ki,
                khoa: targetKhoa,
                heDaoTao,
                keyword,
                scope
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[DATN Stats] getLecturerSummary error:", error);
            res.status(500).json({ success: false, message: error.message || "Không thể lấy dữ liệu giảng viên" });
        }
    }

    async getLecturerDetail(req, res) {
        try {
            const { namHoc, dot = "ALL", ki = "ALL", khoa = "ALL", heDaoTao = "ALL", scope = "OFFICIAL" } = req.query;
            const lecturerId = req.params.id;
            const lecturerName = req.query.name || lecturerId;
            const targetKhoa = resolveFacultyScope(req, khoa);

            const data = await statsService.getLecturerRecords({
                lecturerId,
                lecturerName,
                namHoc,
                dot,
                ki,
                khoa: targetKhoa,
                heDaoTao,
                scope
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[DATN Stats] getLecturerDetail error:", error);
            res.status(500).json({ success: false, message: error.message || "Không thể lấy chi tiết giảng viên" });
        }
    }

    async getDepartmentSummary(req, res) {
        try {
            const { namHoc, dot = "ALL", ki = "ALL", khoa = "ALL", heDaoTao = "ALL", keyword = "", scope = "OFFICIAL" } = req.query;
            const targetKhoa = resolveFacultyScope(req, khoa);
            const data = await statsService.getDepartmentSummary({
                namHoc,
                dot,
                ki,
                khoa: targetKhoa,
                heDaoTao,
                keyword,
                scope
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[DATN Stats] getDepartmentSummary error:", error);
            res.status(500).json({ success: false, message: error.message || "Không thể lấy dữ liệu theo khoa" });
        }
    }

    async getHocVienSummary(req, res) {
        try {
            const { namHoc, dot = "ALL", ki = "ALL", khoa = "ALL", heDaoTao = "ALL", keyword = "", scope = "OFFICIAL" } = req.query;
            const targetKhoa = resolveFacultyScope(req, khoa);
            const data = await statsService.getHocVienSummary({
                namHoc,
                dot,
                ki,
                khoa: targetKhoa,
                heDaoTao,
                keyword,
                scope
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[DATN Stats] getHocVienSummary error:", error);
            res.status(500).json({ success: false, message: error.message || "Không thể lấy dữ liệu học viện" });
        }
    }

    async exportExcel(req, res) {
        try {
            const {
                tab = "giang-vien",
                scope = "OFFICIAL",
                namHoc,
                dot = "ALL",
                ki = "ALL",
                khoa = "ALL",
                heDaoTao = "ALL",
                keyword = "",
                name = "",
                lecturerName = "",
                lecturerId = ""
            } = req.query;

            const targetKhoa = resolveFacultyScope(req, khoa);
            const targetLecturer = (lecturerName || name || "").trim();
            const targetLecturerId = (lecturerId || "").trim();

            const buffer = await exportService.exportStatsExcel({
                tab,
                filters: {
                    scope,
                    namHoc,
                    dot,
                    ki,
                    khoa: targetKhoa,
                    heDaoTao,
                    keyword,
                    name: targetLecturer,
                    lecturerName: targetLecturer,
                    lecturerId: targetLecturerId
                }
            });

            const scopeTag = scope === "PREVIEW" ? "du_kien" : "chinh_thuc";
            const yearTag = (namHoc || "tat_ca").replace(/\s+/g, "");
            let filename = `Thong_ke_do_an_${tab}_${yearTag}_${scopeTag}.xlsx`;

            if (tab === "giang-vien-detail" && targetLecturer) {
                const safeName = targetLecturer
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/đ/g, "d")
                    .replace(/Đ/g, "D")
                    .replace(/[^a-zA-Z0-9_-]/g, "_");
                filename = `Chi_tiet_do_an_${safeName}_${yearTag}_${scopeTag}.xlsx`;
            } else if (tab === "khoa-detail" && khoa && khoa !== "ALL") {
                filename = `Chi_tiet_do_an_khoa_${khoa}_${yearTag}_${scopeTag}.xlsx`;
            }

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.setHeader("Content-Length", buffer.length);
            res.send(buffer);
        } catch (error) {
            console.error("[DATN Stats] exportExcel error:", error);
            res.status(500).send("Có lỗi xảy ra khi xuất file Excel!");
        }
    }
}

module.exports = new DatnStatsController();
