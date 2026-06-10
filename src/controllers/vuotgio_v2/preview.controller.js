/**
 * VUOT GIO V2 - Preview Controller
 * Date: 2026-04-28
 */

const tongHopService = require("../../services/vuotgio_v2/tongHop.service");
const snapshotDataService = require("../../services/vuotgio_v2/snapshotData.service");
const templatePreviewService = require("../../services/vuotgio_v2/templatePreview.service");

/**
 * Lấy dữ liệu Preview (PDF/Excel view)
 */
const getPreviewData = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !MaGV) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Giảng viên" });
    }

    try {
        const { format = 'pdf' } = req.query;

        console.info('[getPreviewData]', { MaGV, namHoc, mode: 'snapshot' });
        
        // Lấy SDO từ snapshotDataService thay vì tongHopService
        const sdo = await snapshotDataService.getSnapshotSDOByUser(namHoc, decodeURIComponent(MaGV));
        if (!sdo) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu giảng viên" });

        // Log chi tiết số lượng bản ghi để debug
        console.info(`[Preview] GV: ${sdo.giangVien || MaGV}, Năm học: ${namHoc}`);
        console.info(` - Giảng dạy: ${sdo.raw?.giangDay?.length || 0}`);
        console.info(` - Lớp ngoài QC: ${sdo.raw?.lopNgoaiQC?.length || 0}`);
        console.info(` - KTHP: ${sdo.raw?.kthp?.length || 0}`);
        console.info(` - Đồ án: ${sdo.raw?.doAn?.length || 0}`);
        console.info(` - Hướng dẫn TQ: ${sdo.raw?.huongDanThamQuan?.length || sdo.raw?.hdtq?.length || 0}`);
        console.info(` - NCKH: ${sdo.raw?.nckhRecords?.length || 0}`);

        // 2. Chuyển đổi SDO thành file preview (PDF)
        const previewResult = await templatePreviewService.buildTemplatePreviewPdf({ 
            summary: sdo, 
            namHoc: sdo.nam_hoc 
        });

        res.json({
            success: true,
            data: {
                ...sdo,
                intermediateJson: previewResult.intermediateJson,
                pdfBase64: previewResult.pdfBase64,
                warnings: previewResult.warnings || []
            }
        });
    } catch (error) {
        console.error("Error in getPreviewData:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/**
 * Lấy preview theo khoa (một sheet tổng hợp cho cả khoa)
 */
const getPreviewKhoaData = async (req, res) => {
    const { khoa } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Khoa" });
    }

    try {
        const khoaDecoded = decodeURIComponent(khoa);
        
        console.info('[getPreviewKhoaData]', { khoa: khoaDecoded, namHoc, mode: 'snapshot' });
        
        const summaries = await snapshotDataService.getSnapshotSDOList(namHoc, khoaDecoded);

        if (!summaries || summaries.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu cho khoa này" });
        }

        const previewResult = await templatePreviewService.buildDepartmentPreviewPdf({
            summaries,
            khoa: khoaDecoded,
            namHoc,
        });

        res.json({
            success: true,
            data: {
                pdfBase64: previewResult.pdfBase64,
                warnings: previewResult.warnings || [],
                meta: previewResult.meta,
            },
        });
    } catch (error) {
        console.error("Error in getPreviewKhoaData:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/**
 * Lấy preview tổng hợp theo khoa (consolidated export với nhiều sheet)
 */
const getConsolidatedPreviewData = async (req, res) => {
    const { namHoc } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });
    }

    try {
        console.info(`[ConsolidatedPreview] Năm học: ${namHoc}`);

        const previewResult = await templatePreviewService.buildConsolidatedPreviewPdf({
            namHoc,
        });

        res.json({
            success: true,
            data: {
                pdfBase64: previewResult.pdfBase64,
                warnings: previewResult.warnings || [],
                meta: previewResult.meta,
            },
        });
    } catch (error) {
        console.error("Error in getConsolidatedPreviewData:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/**
 * Lấy dữ liệu tổng hợp theo khoa (structured data, không phải PDF)
 */
const getConsolidatedData = async (req, res) => {
    const { namHoc } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });
    }

    try {
        const consolidatedService = require("../../services/vuotgio_v2/consolidatedExport.service");
        const data = await consolidatedService.getConsolidatedPreviewData(namHoc);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getConsolidatedData:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPreviewData,
    getPreviewKhoaData,
    getConsolidatedPreviewData,
    getConsolidatedData
};
