/**
 * VUOT GIO V2 - Xuất File Controller
 *
 * Routes:
 *   GET /v2/vuotgio/xuat-file              → renderPage
 *   GET /v2/vuotgio/xuat-file/excel        → exportExcel      (Type A: Kê khai cá nhân)
 *   GET /v2/vuotgio/xuat-file/tong-hop     → exportConsolidated (Type B: Tổng hợp Khoa/Phòng)
 */

const xuatFileService          = require('../../services/vuotgio_v2/xuatFile.service');
const consolidatedExportService = require('../../services/vuotgio_v2/consolidatedExport.service');
const dataLockService          = require('../../services/vuotgio_v2/dataLock.service');

/* ════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════ */

/**
 * Chuẩn hóa chuỗi để dùng trong tên file (xóa ký tự đặc biệt, giữ chữ/số/dấu gạch)
 */
const sanitizeFileName = (str) =>
    String(str || '')
        .normalize('NFC')
        .replace(/[^a-zA-Z0-9À-ỹ_\- ]/g, '')
        .trim()
        .replace(/\s*-\s*/g, '-')
        .replace(/\s+/g, '_')
        .slice(0, 40);

/**
 * Gửi workbook ExcelJS về client dưới dạng file tải xuống.
 */
const _sendWorkbook = async (res, workbook, filename) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // RFC 5987: filename cho client cũ, filename* cho client hỗ trợ UTF-8
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition',
        `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    await workbook.xlsx.write(res);
    res.end();
};

/* ════════════════════════════════════════════════════
   Controllers
   ════════════════════════════════════════════════════ */

/**
 * Render trang xuất file
 */
const renderPage = (req, res) => {
    res.render('vuotgio_v2/vuotgio.xuatFile.ejs');
};

/**
 * Type A — Kê khai cá nhân
 * Query params:
 *   - namHoc     (required)
 *   - khoa       (optional) — mã khoa/phòng, hoặc 'ALL'
 *   - giangVien  (optional) — id_User hoặc HoTen
 */
const exportExcel = async (req, res) => {
    const { namHoc, khoa, giangVien } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin Năm học' });
    }

    // Kiểm tra dữ liệu đã được lưu chưa
    try {
        const locked = await dataLockService.isLocked(namHoc);
        if (!locked) {
            return res.status(403).json({
                success: false,
                message: 'Dữ liệu năm học này chưa được lưu. Vui lòng lưu dữ liệu trước khi xuất file.'
            });
        }
    } catch (err) {
        console.error('[xuatFile.controller] lock check error:', err);
        return res.status(500).json({ success: false, message: 'Không thể kiểm tra trạng thái lưu dữ liệu.' });
    }

    try {
        const { workbook, meta } = await xuatFileService.exportExcel(namHoc, khoa, giangVien);

        // Build descriptive filename based on scope
        const namHocPart = sanitizeFileName(namHoc);
        let filename;

        if (giangVien && meta.giangVienName) {
            // Scope: 1 giảng viên → KeKhai_VuotGio_Nguyen_Van_A_2024-2025.xlsx
            filename = `KeKhai_VuotGio_${sanitizeFileName(meta.giangVienName)}_${namHocPart}.xlsx`;
        } else if (khoa && khoa !== 'ALL' && meta.maKhoa) {
            // Scope: 1 khoa → KeKhai_VuotGio_Khoa_CNTT_2024-2025.xlsx
            filename = `KeKhai_VuotGio_Khoa_${sanitizeFileName(meta.maKhoa)}_${namHocPart}.xlsx`;
        } else {
            // Scope: tất cả khoa → KeKhai_VuotGio_TatCaKhoa_2024-2025.xlsx
            filename = `KeKhai_VuotGio_TatCaKhoa_${namHocPart}.xlsx`;
        }

        await _sendWorkbook(res, workbook, filename);
    } catch (err) {
        console.error('[xuatFile.controller] exportExcel error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message || 'Có lỗi khi xuất file kê khai.' });
        }
    }
};

/**
 * Type B — Tổng hợp Khoa/Phòng toàn trường
 * Query params:
 *   - namHoc (required)
 *
 * File xuất ra gồm 3 loại sheet:
 *   1. Các sheet Khoa/Phòng (36 cột)
 *   2. Sheet TỔNG HỢP
 *   3. Sheet TIỀN THANH TOÁN
 */
const exportConsolidated = async (req, res) => {
    const { namHoc } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin Năm học' });
    }

    // Kiểm tra dữ liệu đã được lưu chưa
    try {
        const locked = await dataLockService.isLocked(namHoc);
        if (!locked) {
            return res.status(403).json({
                success: false,
                message: 'Dữ liệu năm học này chưa được lưu. Vui lòng lưu dữ liệu trước khi xuất file.'
            });
        }
    } catch (err) {
        console.error('[xuatFile.controller] lock check error:', err);
        return res.status(500).json({ success: false, message: 'Không thể kiểm tra trạng thái lưu dữ liệu.' });
    }

    try {
        const workbook = await consolidatedExportService.exportConsolidatedByDepartment(namHoc);

        const namHocPart = sanitizeFileName(namHoc);
        const filename   = `TongHop_VuotGio_${namHocPart}.xlsx`;

        await _sendWorkbook(res, workbook, filename);
    } catch (err) {
        console.error('[xuatFile.controller] exportConsolidated error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message || 'Có lỗi khi xuất file tổng hợp.' });
        }
    }
};

module.exports = {
    renderPage,
    exportExcel,
    exportConsolidated,
};
