"use strict";

const statsService = require("../../services/vuotgio_v2/kthpStats.service");
const exportService = require("../../services/vuotgio_v2/kthpExport.service");

const resolveFilenameYearTag = (namHocFrom, namHocTo, namHoc) => {
    const from = String(namHocFrom || namHoc || "").trim().replace(/\s+/g, "");
    const to = String(namHocTo || namHoc || "").trim().replace(/\s+/g, "");
    if (from && to && from !== to) {
        return `${from}_den_${to}`;
    }
    return from || to || "tatca";
};

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

class KthpStatsController {
    // Menu Vượt giờ -> Dự kiến: Không có biểu đồ
    renderPreviewPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKe.coiChamRaDe.ejs", {
            statsScope: "PREVIEW",
            showChart: false,
            filterMode: "kthp_list",
            pageTitle: "Thống kê coi, chấm thi, ra đề dự kiến"
        });
    }

    // Menu Vượt giờ -> Chính thức: Không có biểu đồ
    renderVuotGioOfficialPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKe.coiChamRaDe.ejs", {
            statsScope: "OFFICIAL",
            showChart: false,
            filterMode: "kthp_list",
            pageTitle: "Thống kê coi, chấm thi, ra đề chính thức"
        });
    }

    // Menu Thống Kê -> Coi, chấm, ra đề thi: Chỉ hiển thị biểu đồ cho bản ghi duyệt 2 lần (Chính thức)
    renderThongKeMenuPage(req, res) {
        const showChart = req.query.chart !== "0" && req.query.chart !== "false" && req.query.from !== "vuotgio";
        res.render("vuotgio_v2/vuotgio.thongKe.coiChamRaDe.ejs", {
            statsScope: "OFFICIAL",
            showChart,
            filterMode: showChart ? "range" : "kthp_list",
            pageTitle: "Thống kê coi, chấm thi, ra đề thi"
        });
    }

    renderOfficialPage(req, res) {
        return this.renderThongKeMenuPage(req, res);
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
            const { namHoc, namHocFrom, namHocTo, khoa = "ALL", khoaId = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId, heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = resolveFacultyScope(req, targetKhoa);

            const data = await statsService.getLecturerSummary({
                namHoc,
                namHocFrom,
                namHocTo,
                khoa: requestedKhoa,
                loaiKthp,
                keyword,
                scope,
                lecturerId,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getLecturerSummary error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê giảng viên" });
        }
    }

    async getLecturerDetail(req, res) {
        try {
            const { namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL", khoa = "ALL", khoaId = "ALL", keyword = "", heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = resolveFacultyScope(req, targetKhoa);

            const data = await statsService.getLecturerRecords({
                lecturerId: req.params.id,
                namHoc,
                namHocFrom,
                namHocTo,
                loaiKthp,
                scope,
                khoa: requestedKhoa,
                keyword,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getLecturerDetail error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy chi tiết công việc của giảng viên" });
        }
    }

    async getFacultySummary(req, res) {
        try {
            const { namHoc, namHocFrom, namHocTo, khoaId = "ALL", khoa = "ALL", loaiKthp = "ALL", scope = "OFFICIAL", keyword = "", heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = resolveFacultyScope(req, targetKhoa);

            const data = await statsService.getFacultySummary({
                namHoc,
                namHocFrom,
                namHocTo,
                khoaId: requestedKhoa,
                loaiKthp,
                scope,
                keyword,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getFacultySummary error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê theo khoa" });
        }
    }

    async getFacultyDetail(req, res) {
        try {
            const { namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL", keyword = "", heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const khoa = resolveFacultyScope(req, req.params.khoaId);
            const data = await statsService.getFacultyRecords({
                khoa,
                namHoc,
                namHocFrom,
                namHocTo,
                loaiKthp,
                scope,
                keyword,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getFacultyDetail error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy chi tiết công việc của khoa" });
        }
    }

    async getInstituteSummary(req, res) {
        try {
            const { namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL", khoa = "ALL", khoaId = "ALL", keyword = "", heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = resolveFacultyScope(req, khoa !== "ALL" ? khoa : khoaId);
            const data = await statsService.getInstituteSummary({
                namHoc,
                namHocFrom,
                namHocTo,
                loaiKthp,
                scope,
                khoa: targetKhoa,
                keyword,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getInstituteSummary error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê học viện" });
        }
    }

    async getInstituteDetail(req, res) {
        try {
            const { namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", khoa = "ALL", khoaId = "ALL", scope = "OFFICIAL", keyword = "", heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = resolveFacultyScope(req, khoa !== "ALL" ? khoa : khoaId);
            const data = await statsService.getInstituteRecords({
                namHoc,
                namHocFrom,
                namHocTo,
                loaiKthp,
                khoa: targetKhoa,
                scope,
                keyword,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error("[KTHP Stats] getInstituteDetail error:", error);
            res.status(400).json({ success: false, message: error.message || "Không thể lấy chi tiết toàn học viện" });
        }
    }

    async exportLecturerStats(req, res) {
        try {
            const { namHoc, namHocFrom, namHocTo, khoa = "ALL", khoaId = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId, heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = resolveFacultyScope(req, targetKhoa);

            const workbook = await exportService.exportLecturerStats({
                namHoc,
                namHocFrom,
                namHocTo,
                khoa: requestedKhoa,
                loaiKthp,
                keyword,
                scope,
                lecturerId,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });

            const scopeTag = scope === "PREVIEW" ? "DuKien" : "ChinhThuc";
            const yearTag = resolveFilenameYearTag(namHocFrom, namHocTo, namHoc);
            const filename = `ThongKe_CoiChamRaDe_GiangVien_${yearTag}_${scopeTag}.xlsx`;
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
            const { namHoc, namHocFrom, namHocTo, khoaId = "ALL", khoa = "ALL", loaiKthp = "ALL", scope = "OFFICIAL", keyword = "", heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = khoa !== "ALL" ? khoa : khoaId;
            const requestedKhoa = resolveFacultyScope(req, targetKhoa);

            const workbook = await exportService.exportFacultyStats({
                namHoc,
                namHocFrom,
                namHocTo,
                khoaId: requestedKhoa,
                loaiKthp,
                scope,
                keyword,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });

            const scopeTag = scope === "PREVIEW" ? "DuKien" : "ChinhThuc";
            const yearTag = resolveFilenameYearTag(namHocFrom, namHocTo, namHoc);
            const filename = `ThongKe_CoiChamRaDe_Khoa_${yearTag}_${scopeTag}.xlsx`;
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
            const { namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL", khoa = "ALL", khoaId = "ALL", keyword = "", heDaoTao = "ALL", dot = "ALL", ki = "ALL", hocKy = "ALL", hocPhan = "" } = req.query;
            const targetKhoa = resolveFacultyScope(req, khoa !== "ALL" ? khoa : khoaId);
            const workbook = await exportService.exportInstituteStats({
                namHoc,
                namHocFrom,
                namHocTo,
                loaiKthp,
                scope,
                khoa: targetKhoa,
                keyword,
                heDaoTao,
                dot,
                ki,
                hocKy,
                hocPhan,
            });

            const scopeTag = scope === "PREVIEW" ? "DuKien" : "ChinhThuc";
            const yearTag = resolveFilenameYearTag(namHocFrom, namHocTo, namHoc);
            const filename = `ThongKe_CoiChamRaDe_HocVien_${yearTag}_${scopeTag}.xlsx`;
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
