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
        const { ki, nam, hocKy, namHoc, dot, workloadData } = req.body;
        const kiVal = hocKy || ki;
        const namVal = namHoc || nam;
        if (!req.session?.userId) {
            return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để tiếp tục" });
        }
        const user = {
            id: req.session.userId,
            userName: req.session.TenNhanVien || req.session.username || 'Unknown'
        };

        const count = await importService.importToDB(workloadData, { ki: kiVal, nam: namVal, dot, user });
        res.json({ success: true, message: `Đã import ${count} bản ghi thành công!` });
    } catch (error) {
        console.error("[importWorkloadToDB] Error:", error);
        res.status(500).json({ error: "Lỗi khi import dữ liệu vào database!" });
    }
};

/**
 * Lưu dữ liệu từ file Excel (bao gồm thêm mới và chỉnh sửa)
 */
const saveWorkloadData = async (req, res) => {
    try {
        const { Ki, Nam, hocKy, namHoc, dot, data } = req.body;
        const kiVal = hocKy || Ki;
        const namVal = namHoc || Nam;

        const workloadData = {
            raDe: [],
            coiThi: [],
            chamThi: []
        };

        const updates = [];

        if (Array.isArray(data)) {
            data.forEach(item => {
                const type = item.Type || item.type;
                if (item.id || item.ID) {
                    updates.push(item);
                } else {
                    if (type === "Ra Đề" || type === "Ra đề") {
                        workloadData.raDe.push(item);
                    } else if (type === "Coi Thi" || type === "Coi thi") {
                        workloadData.coiThi.push(item);
                    } else if (type === "Chấm Thi" || type === "Chấm thi") {
                        workloadData.chamThi.push(item);
                    }
                }
            });
        }

        const user = {
            id: req.session?.userId || 1,
            userName: req.session?.TenNhanVien || req.session?.username || 'Unknown'
        };

        let insertedCount = 0;
        if (workloadData.raDe.length > 0 || workloadData.coiThi.length > 0 || workloadData.chamThi.length > 0) {
            insertedCount = await importService.importToDB(workloadData, { ki: kiVal, nam: namVal, dot, user });
        }

        if (updates.length > 0) {
            req.body.data = updates;
            return service.updateBatch(req, res);
        }

        return res.json({ success: true, message: `Đã lưu ${insertedCount} bản ghi thành công!` });
    } catch (error) {
        console.error("[saveWorkloadData] Error:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lưu dữ liệu!" });
    }
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
