/**
 * VUOT GIO V2 - Coi Chấm Ra Đề (KTHP) File Controller
 * Date: 2026-04-28
 */

const service = require("../../services/vuotgio_v2/kthp.service");
const importService = require("../../services/vuotgio_v2/kthpImport.service");

/**
 * Phân loại dữ liệu từ file Excel
 */
const readFileExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên' });
        const data = await importService.parseExcelFile(req.file.buffer);
        res.json(data);
    } catch (error) {
        console.error("[readFileExcel] Error:", error);
        res.status(500).json({ error: 'Lỗi khi xử lý file' });
    }
};

/**
 * Import dữ liệu từ bộ nhớ/client vào DB
 */
const importWorkloadToDB = async (req, res) => {
    try {
        const { ki, nam, workloadData } = req.body;
        const user = {
            id: req.session?.userId || 1,
            userName: req.session?.TenNhanVien || 'ADMIN'
        };

        const count = await importService.importToDB(workloadData, { ki, nam, user });
        res.json({ success: true, message: `Đã import ${count} bản ghi thành công!` });
    } catch (error) {
        console.error("[importWorkloadToDB] Error:", error);
        res.status(500).json({ error: "Lỗi khi import dữ liệu vào database!" });
    }
};

/**
 * Lưu dữ liệu thủ công
 */
const saveWorkloadData = async (req, res) => {
    // Tái sử dụng updateBatch hoặc saveBatch từ service tùy vào cấu trúc dữ liệu gửi lên
    return service.updateBatch(req, res);
};

/**
 * Gợi ý học phần
 */
const getSuggestions = async (req, res) => {
    let connection;
    try {
        const pool = require("../../config/databasePool");
        connection = await pool();
        const [rows] = await connection.execute("SELECT DISTINCT TenHP AS value FROM quychuan ORDER BY TenHP");
        res.json(rows);
    } catch (error) {
        res.status(500).json([]);
    } finally {
        if (connection) connection.release();
    }
};


// --- Export các hàm từ service để giữ tương thích Route ---
module.exports = {
    getWorkload: (req, res) => res.json({ raDe: [], coiThi: [], chamThi: [] }), // Placeholder cho client cũ
    readFileExcel,
    importWorkloadToDB,
    deleteWorkloadData: service.deleteByFilter,
    saveWorkloadData,
    checkDataExistence: service.checkExistence,
    getSuggestions,
};
