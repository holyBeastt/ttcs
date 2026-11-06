"use strict";

const statsService = require("../../services/vuotgio_v2/kthpStats.service");
const exportService = require("../../services/vuotgio_v2/kthpExport.service");

class KthpStatsController {
    renderOfficialPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKe.coiChamRaDe.ejs", { statsScope: "OFFICIAL" });
    }

    renderPreviewPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKe.coiChamRaDe.ejs", { statsScope: "PREVIEW" });
    }

    async getFilters(_req, res) {
        try {
            const data = await statsService.getFilters();
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getFilters error:", error);
            res.status(500).json({ success: false, message: error.message || "Không thể lấy bộ lọc" });
        }
    }

    async getLecturerSummary(req, res) {
        try {
            const { namHoc, khoa = "ALL", khoaId = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = targetKhoa;

            const data = await statsService.getLecturerSummary({
                namHoc,
                khoa: requestedKhoa,
                loaiKthp,
                keyword,
                scope,
                lecturerId,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getLecturerSummary error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê giảng viên" });
        }
    }

    async getLecturerDetail(req, res) {
        try {
            const { namHoc, loaiKthp = "ALL", scope = "OFFICIAL", khoa = "ALL", khoaId = "ALL" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = targetKhoa;

            const data = await statsService.getLecturerRecords({
                lecturerId: req.params.id,
                namHoc,
                loaiKthp,
                scope,
                khoa: requestedKhoa,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getLecturerDetail error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy chi tiết công việc của giảng viên" });
        }
    }

    async getFacultySummary(req, res) {
        try {
            const { namHoc, khoaId = "ALL", khoa = "ALL", loaiKthp = "ALL", scope = "OFFICIAL" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = targetKhoa;

            const data = await statsService.getFacultySummary({
                namHoc,
                khoaId: requestedKhoa,
                loaiKthp,
                scope,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getFacultySummary error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê theo khoa" });
        }
    }

    async getFacultyDetail(req, res) {
        try {
            const { namHoc, loaiKthp = "ALL", scope = "OFFICIAL" } = req.query;
            const khoa = req.params.khoaId;
            const data = await statsService.getFacultyRecords({
                khoa,
                namHoc,
                loaiKthp,
                scope,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getFacultyDetail error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy chi tiết công việc của khoa" });
        }
    }

    async getInstituteSummary(req, res) {
        try {
            const { namHoc, loaiKthp = "ALL", scope = "OFFICIAL" } = req.query;
            const data = await statsService.getInstituteSummary({
                namHoc,
                loaiKthp,
                scope,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getInstituteSummary error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê học viện" });
        }
    }

    async getInstituteDetail(req, res) {
        try {
            const { namHoc, loaiKthp = "ALL", khoa = "ALL", khoaId = "ALL", scope = "OFFICIAL" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const data = await statsService.getInstituteRecords({
                namHoc,
                loaiKthp,
                khoa: targetKhoa,
                scope,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getInstituteDetail error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy chi tiết toàn học viện" });
        }
    }

    async exportLecturerStats(req, res) {
        try {
            const { namHoc, khoa = "ALL", khoaId = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = targetKhoa;

            const workbook = await exportService.exportLecturerStats({
                namHoc,
                khoa: requestedKhoa,
                loaiKthp,
                keyword,
                scope,
                lecturerId,
            });

            const filename = `ThongKe_CoiChamRaDe_GiangVien_${namHoc}_${scope}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error("[KTHP Export] lecturer error:", error);
            res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel giảng viên" });
        }
    }

    async exportFacultyStats(req, res) {
        try {
            const { namHoc, khoaId = "ALL", khoa = "ALL", loaiKthp = "ALL", scope = "OFFICIAL" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = targetKhoa;

            const workbook = await exportService.exportFacultyStats({
                namHoc,
                khoaId: requestedKhoa,
                loaiKthp,
                scope,
            });

            const filename = `ThongKe_CoiChamRaDe_Khoa_${namHoc}_${scope}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error("[KTHP Export] faculty error:", error);
            res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel khoa" });
        }
    }

    async exportInstituteStats(req, res) {
        try {
            const { namHoc, loaiKthp = "ALL", scope = "OFFICIAL" } = req.query;
            const workbook = await exportService.exportInstituteStats({
                namHoc,
                loaiKthp,
                scope,
            });

            const filename = `ThongKe_CoiChamRaDe_HocVien_${namHoc}_${scope}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error("[KTHP Export] institute error:", error);
            res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel học viện" });
        }
    }
}

module.exports = new KthpStatsController();
