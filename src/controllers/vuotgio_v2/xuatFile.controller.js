/**
 * VUOT GIO V2 - Xuất File Controller
 * Date: 2026-04-28
 */

const xuatFileService = require("../../services/vuotgio_v2/xuatFile.service");

/**
 * Render trang xuất file
 */
const renderPage = (req, res) => {
    res.render("vuotgio_v2/vuotgio.xuatFile.ejs");
};

/**
 * Export Excel vượt giờ
 */
const exportExcel = async (req, res) => {
    const { namHoc, khoa, giangVien } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });
    }

    try {
        const workbook = await xuatFileService.exportExcel(namHoc, khoa, giangVien);
        
        const filename = `VuotGio_${namHoc}_${khoa || 'TatCa'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Lỗi khi export Excel:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi export Excel." });
    }
};

module.exports = {
    renderPage,
    exportExcel
};
