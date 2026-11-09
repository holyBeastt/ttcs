/**
 * VUOT GIO V2 - Thống Kê Giảng Dạy (TKB) Controller
 * Date: 2026-11-09
 */

"use strict";

const service = require("../../services/vuotgio_v2/giangDay.service");
const exportService = require("../../services/vuotgio_v2/giangDayExport.service");

class ThongKeGiangDayController {
    renderPreviewPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKeGiangDay.ejs", {
            statsScope: "PREVIEW",
            pageTitle: "Thống kê giảng dạy quy chuẩn dự kiến"
        });
    }

    renderOfficialPage(_req, res) {
        res.render("vuotgio_v2/vuotgio.thongKeGiangDay.ejs", {
            statsScope: "OFFICIAL",
            pageTitle: "Thống kê giảng dạy quy chuẩn chính thức"
        });
    }

    async getFilters(_req, res) {
        try {
            const filters = await service.getFilters();
            res.json({ success: true, data: filters });
        } catch (error) {
            console.error("[thongKeGiangDay.getFilters] Error:", error);
            res.status(500).json({ success: false, message: "Không thể tải bộ lọc" });
        }
    }

    async getData(req, res) {
        try {
            const { dot, ki, namHoc, khoa, heDaoTao, scope = "OFFICIAL" } = req.body || {};
            const filters = { dot, ki, namHoc, khoa, heDaoTao, scope };

            const result = await service.getStatistics(filters);
            res.json({ success: true, ...result });
        } catch (error) {
            console.error("[thongKeGiangDay.getData] Error:", error);
            res.status(500).json({ success: false, message: "Không thể lấy dữ liệu thống kê" });
        }
    }

    async exportExcel(req, res) {
        try {
            const { dot = "ALL", ki = "ALL", namHoc = "ALL", khoa = "ALL", heDaoTao = "ALL", scope = "OFFICIAL", tab = "giang-vien" } = req.query || {};
            const filters = { dot, ki, namHoc, khoa, heDaoTao, scope };

            const buffer = await exportService.exportGiangDayExcel(filters, tab);

            const scopeTag = scope === "PREVIEW" ? "du_kien" : "chinh_thuc";
            const yearTag = (namHoc || "tatca").replace(/\s+/g, "");
            const filename = `Thong_ke_giang_day_${tab}_${yearTag}_${scopeTag}.xlsx`;

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.setHeader("Content-Length", buffer.length);
            res.send(buffer);
        } catch (error) {
            console.error("[thongKeGiangDay.exportExcel] Error:", error);
            res.status(500).send("Có lỗi xảy ra khi xuất file Excel!");
        }
    }
}

module.exports = new ThongKeGiangDayController();
