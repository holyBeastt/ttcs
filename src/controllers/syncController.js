/**
 * Sync Controller
 * Handles data export and import operations for database synchronization
 * Uses natural keys for UPSERT operations (no UUID, no auto-increment IDs)
 */

const createConnection = require("../config/databasePool");
const syncConfig = require("../config/syncConfig");
const { validateAndMigrateSchemaFromData } = require("../helpers/schemaValidator");

// Tables that support year-based filtering (Năm học)
const yearFilteredTables = new Set([
    'doantotnghiep',
    'hopdonggvmoi',
    'exportdoantotnghiep',
    'course_schedule_details',
    'quychuan',
    'giangday',
    'nckh_chung'
]);

const yearColumnByTable = {
    doantotnghiep: 'NamHoc',
    hopdonggvmoi: 'NamHoc',
    exportdoantotnghiep: 'NamHoc',
    course_schedule_details: 'nam_hoc',
    quychuan: 'NamHoc',
    giangday: 'NamHoc',
    nckh_chung: 'nam_hoc'
};

const yearExpressionByTable = {
    lichsunhaplieu: 'YEAR(ThoiGianThayDoi)'
};

function buildTableExportQuery(table, year) {
    const yearColumn = yearColumnByTable[table];
    if (year && yearColumn && yearFilteredTables.has(table)) {
        return {
            query: `SELECT * FROM ${table} WHERE ${yearColumn} = ?`,
            params: [year]
        };
    }

    const yearExpression = yearExpressionByTable[table];
    if (year && yearExpression) {
        return {
            query: `SELECT * FROM ${table} WHERE ${yearExpression} = ?`,
            params: [year]
        };
    }

    return {
        query: `SELECT * FROM ${table}`,
        params: []
    };
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Get information about available sync tables
 * GET /sync/info
 */
exports.getTableInfo = (req, res) => {
    try {
        const tableInfo = Object.entries(syncConfig).map(([tableName, config]) => ({
            table: tableName,
            type: config.type,
            description: config.description,
            uniqueKey: config.uniqueKey,
        }));

        return res.status(200).json({
            success: true,
            message: "Available tables for synchronization",
            tables: tableInfo,
        });
    } catch (error) {
        console.error("Get table info error:", error);
        return res.status(500).json({
            success: false,
            message: "Error getting table information",
            error: error.message,
        });
    }
};

/**
 * Main export handler
 * GET /sync/export?table=TABLE_NAME
 */
exports.exportTable = async (req, res) => {
    let connection;
    try {
        const { table } = req.query;

        // Validate table name
        if (!table || !syncConfig[table]) {
            return res.status(400).json({
                success: false,
                message: `Invalid table name. Supported tables: ${Object.keys(
                    syncConfig
                ).join(", ")}`,
            });
        }

        connection = await createConnection();
        const config = syncConfig[table];

        let query;
        let data;

        // Year filter support for selected tables
        const year = req.query.namhoc || req.query.year || req.query.nam || req.query.nam_hoc;
        // Use custom export query if defined, otherwise use default SELECT *
        if (config.exportQuery) {
            query = config.exportQuery;
            [data] = await connection.query(query);
        } else {
            const exportQuery = buildTableExportQuery(table, year);
            query = exportQuery.query;
            [data] = await connection.query(query, exportQuery.params);

            // Only remove id column if NOT preserveId
            if (!config.preserveId) {
                data = data.map((row) => {
                    const { id, ...rest } = row;
                    return rest;
                });
            }
        }

        return res.status(200).json({
            success: true,
            table: table,
            count: data.length,
            data: data,
            description: config.description || "",
        });
    } catch (error) {
        console.error("Export error:", error);
        return res.status(500).json({
            success: false,
            message: "Error exporting data",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Export all tables at once
 * GET /sync/export-all
 */
exports.exportAll = async (req, res) => {
    let connection;
    try {
        connection = await createConnection();

        const allData = {};
        let totalCount = 0;

        // Year filter support for selected tables
        const year = req.query.namhoc || req.query.year || req.query.nam || req.query.nam_hoc;

        // Export each table
        for (const [tableName, config] of Object.entries(syncConfig)) {
            try {
                let query;
                let data;

                if (config.exportQuery) {
                    query = config.exportQuery;
                    [data] = await connection.query(query);
                } else {
                    const exportQuery = buildTableExportQuery(tableName, year);
                    query = exportQuery.query;
                    [data] = await connection.query(query, exportQuery.params);

                    // Only remove id column if NOT preserveId
                    if (!config.preserveId) {
                        data = data.map((row) => {
                            const { id, ...rest } = row;
                            return rest;
                        });
                    }
                }

                allData[tableName] = {
                    count: data.length,
                    description: config.description,
                    type: config.type,
                    data: data,
                };

                totalCount += data.length;
            } catch (error) {
                console.error(`Error exporting ${tableName}:`, error);
                allData[tableName] = {
                    count: 0,
                    error: error.message,
                    data: [],
                };
            }
        }

        return res.status(200).json({
            success: true,
            message: "Exported all tables",
            totalTables: Object.keys(syncConfig).length,
            totalRecords: totalCount,
            tables: allData,
        });
    } catch (error) {
        console.error("Export all error:", error);
        return res.status(500).json({
            success: false,
            message: "Error exporting all tables",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Export multiple tables
 * GET /sync/export-multiple?tables=table1,table2
 */
exports.exportMultiple = async (req, res) => {
    const tablesQuery = req.query.tables;
    if (!tablesQuery) {
        return res.status(400).json({
            success: false,
            message: 'Parameter "tables" is required (comma-separated list)'
        });
    }

    const requestedTables = Array.isArray(tablesQuery)
        ? tablesQuery
        : String(tablesQuery).split(',').map(t => t.trim()).filter(Boolean);

    if (requestedTables.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No valid table names provided'
        });
    }

    if (requestedTables.length === Object.keys(syncConfig).length) {
        // Same as export-all
        return exports.exportAll(req, res);
    }

    const invalidTables = requestedTables.filter(t => !syncConfig[t]);
    if (invalidTables.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Invalid table(s): ${invalidTables.join(', ')}`
        });
    }

    let connection;
    try {
        connection = await createConnection();
        const allData = {};
        let totalCount = 0;
        const year = req.query.namhoc || req.query.year || req.query.nam || req.query.nam_hoc;

        for (const tableName of requestedTables) {
            const config = syncConfig[tableName];
            try {
                let query;
                let data;

                if (config.exportQuery) {
                    query = config.exportQuery;
                    [data] = await connection.query(query);
                } else {
                    const exportQuery = buildTableExportQuery(tableName, year);
                    query = exportQuery.query;
                    [data] = await connection.query(query, exportQuery.params);

                    if (!config.preserveId) {
                        data = data.map((row) => {
                            const { id, ...rest } = row;
                            return rest;
                        });
                    }
                }

                allData[tableName] = {
                    count: data.length,
                    description: config.description,
                    type: config.type,
                    data: data,
                };
                totalCount += data.length;
            } catch (error) {
                console.error(`Error exporting ${tableName}:`, error);
                allData[tableName] = {
                    count: 0,
                    error: error.message,
                    data: [],
                };
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Exported selected tables',
            totalTables: requestedTables.length,
            totalRecords: totalCount,
            tables: allData,
        });
    } catch (error) {
        console.error('Export multiple error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error exporting selected tables',
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Main import handler
 * POST /sync/import
 * Body: { table: "TABLE_NAME", data: [...] }
 */
exports.importTable = async (req, res) => {
    let connection;
    try {
        const { table, data } = req.body;

        // Validate request
        if (!table || !syncConfig[table]) {
            return res.status(400).json({
                success: false,
                message: table
                    ? `Invalid table name "${table}". Supported tables: ${Object.keys(syncConfig).join(", ")}`
                    : `Table name is required. Supported tables: ${Object.keys(syncConfig).join(", ")}`,
            });
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
            return res.status(400).json({
                success: false,
                message: "Data must be a non-empty array",
            });
        }

        if (!Array.isArray(data)) {
            if (data && typeof data === 'object' && data.tables) {
                return res.status(400).json({
                    success: false,
                    message: "Payload appears to be export-all format. Use /sync/import-all endpoint for full dataset import.",
                });
            }

            return res.status(400).json({
                success: false,
                message: "Data must be a non-empty array",
            });
        }

        connection = await createConnection();
        const config = syncConfig[table];

        // Auto schema validation & migration using import data
        // This detects missing columns by comparing data fields vs table columns
        console.log(`\n🔍 [DEBUG] === SCHEMA VALIDATION START ===`);
        console.log(`🔍 [DEBUG] Table: ${table}`);
        console.log(`🔍 [DEBUG] Data records: ${data.length}`);
        console.log(`🔍 [DEBUG] Sample data fields:`, data[0] ? Object.keys(data[0]) : 'No data');

        try {
            console.log(`🔍 [DEBUG] Calling validateAndMigrateSchemaFromData...`);
            const schemaResult = await validateAndMigrateSchemaFromData(connection, table, data);
            console.log(`🔍 [DEBUG] Schema validation completed:`, schemaResult);
        } catch (schemaError) {
            console.error(`❌ [DEBUG] SCHEMA ERROR CAUGHT:`, schemaError);
            console.warn(`⚠️  [SCHEMA] Schema validation skipped for ${table}:`, schemaError.message);
            // Continue with import even if schema validation fails
        }

        console.log(`🔍 [DEBUG] === SCHEMA VALIDATION END ===\n`);

        // Start transaction
        await connection.beginTransaction();

        let result;

        // Route to appropriate import handler based on table type
        switch (config.type) {
            case "employee":
                result = await importNhanVien(connection, data);
                break;
            case "teacher":
                result = await importGvmoi(connection, data);
                break;
            case "schedule":
                result = await importCourseScheduleDetails(connection, data);
                break;
            case "contract":
            case "business":
            case "master":
            case "research":
            case "salary":
            case "temporary":
                // All these types use the same generic UPSERT logic with composite keys
                result = await importGenericTable(connection, table, data, config);
                break;
            default:
                throw new Error(`Unknown table type: ${config.type}`);
        }

        // Commit transaction
        await connection.commit();

        return res.status(200).json({
            success: true,
            table: table,
            ...result,
        });
    } catch (error) {
        // Rollback on error
        if (connection) {
            await connection.rollback();
        }

        console.error("Import error:", error);
        return res.status(500).json({
            success: false,
            message: "Error importing data",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================
// IMPORT HELPERS - EMPLOYEE TYPE
// ============================================

/**
 * Import nhanvien records
 * Logic:
 * 1. JOIN nhanvien with taikhoannguoidung via id_User
 * 2. Check existence by tendangnhap (username)
 * 3. If tendangnhap exists -> update (if changed) or skip (if identical)
 * 4. If tendangnhap doesn't exist -> insert both account and employee
 */
async function importNhanVien(connection, records) {
    // Thống kê tổng hợp (giữ nguyên cho API cũ)
    let inserted = 0; // = nvInserted
    let updated = 0;  // = nvUpdated
    let skipped = 0;  // = nvSkipped

    // Thống kê chi tiết theo bảng
    let nvInserted = 0;
    let nvUpdated = 0;
    let nvSkipped = 0;
    let accInserted = 0;
    let accUpdated = 0;
    const errors = [];

    // Đếm số lần xuất hiện của id_User trong dữ liệu import
    // để đảm bảo 1 người không bị tạo nhiều tài khoản trùng nhau
    const userIdCounts = {};
    for (const r of records) {
        if (r.id_User !== undefined && r.id_User !== null) {
            userIdCounts[r.id_User] = (userIdCounts[r.id_User] || 0) + 1;
        }
    }

    // Helper function to normalize values for comparison
    function normalizeValue(val) {
        // Handle null/undefined/empty string as null
        if (val === null || val === undefined || val === '') {
            return null;
        }

        // Handle Date objects - extract YYYY-MM-DD only (use LOCAL time, not UTC)
        if (val instanceof Date) {
            const year = val.getFullYear();      // Local year
            const month = String(val.getMonth() + 1).padStart(2, '0');  // Local month
            const day = String(val.getDate()).padStart(2, '0');         // Local day
            return `${year}-${month}-${day}`;
        }

        // Handle date strings - extract YYYY-MM-DD only
        if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
            return val.substring(0, 10);
        }

        // Handle strings - trim whitespace
        if (typeof val === 'string') {
            return val.trim();
        }

        // Return as-is for other types
        return val;
    }

    // Helper: format ISO date string (có dạng ...T...Z) về dạng MySQL DATE `YYYY-MM-DD`
    function formatIsoDateToMySQLDate(value) {
        if (
            typeof value === 'string' &&
            value.includes('T') &&
            value.includes('Z')
        ) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
        return value;
    }

    for (const record of records) {
        try {
            const { tendangnhap, matkhau, id_User, ...rawNhanvienData } = record;

            // Chuẩn hóa một số field ngày (từ ISO string -> DATE MySQL) trong nhanvienData
            const nhanvienData = { ...rawNhanvienData };
            if (nhanvienData.NgaySinh) {
                nhanvienData.NgaySinh = formatIsoDateToMySQLDate(nhanvienData.NgaySinh);
            }
            if (nhanvienData.NgayCapCCCD) {
                nhanvienData.NgayCapCCCD = formatIsoDateToMySQLDate(nhanvienData.NgayCapCCCD);
            }

            if (!tendangnhap) {
                errors.push({
                    record: record,
                    error: "Missing tendangnhap (username)",
                });
                continue;
            }

            // JOIN query to check if employee exists by tendangnhap
            const [existingRecords] = await connection.query(
                `SELECT n.*, t.id_User, t.MatKhau
                 FROM taikhoannguoidung t
                 LEFT JOIN nhanvien n ON t.id_User = n.id_User
                 WHERE t.TenDangNhap = ?`,
                [tendangnhap]
            );

            if (existingRecords.length > 0) {

                // Account exists trên PRIVATE
                const existing = existingRecords[0];
                const userId = existing.id_User;

                // Check nếu đã có bản ghi nhanvien (dựa trên field đặc trưng của bảng nhanvien)
                if (existing.MaNhanVien !== null && existing.MaNhanVien !== undefined) {
                    // Both account and employee exist - check for changes
                    const updateFields = [];
                    const updateValues = [];

                    // Compare nhanvien fields
                    for (const [key, value] of Object.entries(nhanvienData)) {
                        if (key !== "id_User") {
                            const existingValue = normalizeValue(existing[key]);
                            const newValue = normalizeValue(value);

                            if (existingValue !== newValue) {

                                updateFields.push(`${key} = ?`);
                                updateValues.push(value);
                            }
                        }
                    }

                    // Update password if provided and different
                    let passwordChanged = false;
                    if (matkhau && existing.MatKhau !== matkhau) {
                        await connection.query(
                            "UPDATE taikhoannguoidung SET MatKhau = ? WHERE id_User = ?",
                            [matkhau, userId]
                        );
                        passwordChanged = true;
                        accUpdated++;
                    }

                    if (updateFields.length > 0) {
                        // Some nhanvien fields changed - UPDATE
                        updateValues.push(userId);
                        await connection.query(
                            `UPDATE nhanvien SET ${updateFields.join(", ")} WHERE id_User = ?`,
                            updateValues
                        );
                        nvUpdated++;
                        updated++;
                    } else if (passwordChanged) {
                        // Only password changed
                        updated++; // tổng
                    } else {
                        // No changes - data identical
                        nvSkipped++;
                        skipped++;
                    }
                } else {
                    // Account exists nhưng chưa có record nhanvien → INSERT nhanvien mới với userId hiện có
                    const fields = ["id_User", ...Object.keys(nhanvienData)];
                    const values = [userId, ...Object.values(nhanvienData)];
                    const placeholders = fields.map(() => "?").join(", ");

                    await connection.query(
                        `INSERT INTO nhanvien (${fields.join(", ")}) VALUES (${placeholders})`,
                        values
                    );
                    nvInserted++;
                    inserted++;
                }
            } else {
                // Account không tồn tại trên PRIVATE
                // Cơ chế:
                // - So sánh TenDangNhap giữa PUBLIC và PRIVATE
                // - Nếu TenDangNhap chỉ có ở PUBLIC
                //   + Và id_User đó trong dữ liệu PUBLIC chỉ xuất hiện đúng 1 lần
                //   => tạo mới cả tài khoản và nhân viên bên PRIVATE

                if (id_User === undefined || id_User === null) {
                    errors.push({
                        record: record,
                        error: "Missing id_User for new account/employee creation",
                    });
                    nvSkipped++;
                    skipped++;
                    continue;
                }

                // Nếu 1 người có nhiều tài khoản (id_User xuất hiện > 1) thì bỏ qua để tránh tạo nhiều row trùng nhau
                if (userIdCounts[id_User] !== 1) {
                    errors.push({
                        record: record,
                        error: `id_User ${id_User} appears ${userIdCounts[id_User]} times in source data, skip to avoid duplicates`,
                    });
                    nvSkipped++;
                    skipped++;
                    continue;
                }

                // 1. Tạo bản ghi nhanvien mới – KHÔNG reuse id_User của PUBLIC,
                //    để PRIVATE tự auto-increment id_User riêng
                const nvFields = Object.keys(nhanvienData);
                const nvValues = Object.values(nhanvienData);

                if (nvFields.length === 0) {
                    nvSkipped++;
                    skipped++;
                    continue;
                }

                console.log("[SYNC nhanvien] Thêm nhân viên mới với TenDangNhap =", tendangnhap);

                const nvPlaceholders = nvFields.map(() => "?").join(", ");
                const [nvResult] = await connection.query(
                    `INSERT INTO nhanvien (${nvFields.join(", ")}) VALUES (${nvPlaceholders})`,
                    nvValues
                );

                const newUserId = nvResult.insertId;

                console.log("[SYNC nhanvien] Thêm tài khoản người dùng mới với TenDangNhap =", tendangnhap);

                // 2. Tạo tài khoản tương ứng trong taikhoannguoidung
                await connection.query(
                    `INSERT INTO taikhoannguoidung (TenDangNhap, MatKhau, id_User) VALUES (?, ?, ?)`,
                    [tendangnhap, matkhau || "", newUserId]
                );

                nvInserted++;
                accInserted++;
                inserted++;
            }
        } catch (error) {
            console.error("[SYNC nhanvien] Lỗi khi xử lý bản ghi nhanvien với TenDangNhap =", record?.tendangnhap, "=>", error.message);
            errors.push({
                record: record,
                error: error.message,
            });
        }
    }

    return {
        inserted,
        updated,
        skipped,
        // Thống kê chi tiết
        nvInserted,
        nvUpdated,
        nvSkipped,
        accInserted,
        accUpdated,
        errors,
        total: records.length,
    };
}

// ============================================
// IMPORT HELPERS - TEACHER TYPE
// ============================================

/**
 * Import gvmoi records
 * Uses CCCD as unique key
 */
async function importGvmoi(connection, records) {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;  // Records matched but no changes
    const errors = [];

    // Helper: format ISO date string (có dạng ...T...Z) về dạng MySQL DATE `YYYY-MM-DD`
    const formatIsoDateToMySQLDate = (value) => {
        if (
            typeof value === "string" &&
            value.includes("T") &&
            value.includes("Z")
        ) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            }
        }
        return value;
    };

    for (const record of records) {
        try {
            const { CCCD, ...rest } = record;

            // Chuẩn hóa ngày sinh (và có thể các trường ngày khác sau này)
            if (rest.NgaySinh) {
                rest.NgaySinh = formatIsoDateToMySQLDate(rest.NgaySinh);
            }

            if (rest.NgayCapCCCD){
                rest.NgayCapCCCD = formatIsoDateToMySQLDate(rest.NgayCapCCCD);
            }

            if (!CCCD) {
                errors.push({
                    record: record,
                    error: "Missing CCCD (unique identifier)",
                });
                continue;
            }

            // Build field list (excluding id if present)
            const { id, ...dataWithoutId } = rest;

            const dataInsert = { CCCD, ...dataWithoutId };
            const fields = Object.keys(dataInsert);
            const values = Object.values(dataInsert);

            const updateClauses = fields
                .filter((f) => f !== "CCCD")
                .map((f) => `${f} = VALUES(${f})`)
                .join(", ") || "CCCD = CCCD";

            const placeholders = fields.map(() => "?").join(", ");

            // Use INSERT ... ON DUPLICATE KEY UPDATE for UPSERT
            const query = `
        INSERT INTO gvmoi (${fields.join(", ")})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClauses}
      `;

            const [result] = await connection.query(query, values);

            // Count based on affectedRows and insertId
            if (result.affectedRows === 1) {
                if (result.insertId > 0) {
                    // Real INSERT (new auto-increment ID)
                    inserted++;
                } else {
                    // Matched duplicate but no change (insertId=0, changedRows=0)
                    skipped++;
                }
            } else if (result.affectedRows === 2) {
                // UPDATE with changes
                updated++;
            } else if (result.affectedRows === 0) {
                // Matched duplicate, no change
                skipped++;
            }
        } catch (error) {
            console.error("[SYNC gvmoi] Lỗi khi xử lý bản ghi gvmoi với CCCD =", record?.CCCD, "=>", error.message);
            errors.push({
                record: record,
                error: error.message,
            });
        }
    }

    return {
        inserted,
        updated,
        skipped,
        errors,
        total: records.length,
    };
}

// ============================================
// IMPORT HELPERS - COURSE SCHEDULE DETAILS
// ============================================


/**
 * Import course_schedule_details records
 *
 * Mỗi lớp học phần (course_name) có NHIỀU dòng (nhiều buổi học),
 * phân biệt nhau bằng class_id_ascending.
 *
 * Logic:
 * - Lookup theo (dot, ki_hoc, nam_hoc, course_name, class_id_ascending)
 *   → Tìm đúng từng dòng buổi học cụ thể
 * - Nếu đã tồn tại → UPDATE các field còn lại
 * - Nếu chưa tồn tại → INSERT:
 *     tt: lấy từ data nếu có, nếu không → MAX(tt)+1 trong nhóm (dot, ki_hoc, nam_hoc)
 *     class_id_ascending: lấy từ data nếu có, nếu không → 1 (dòng đầu của tt mới)
 */

async function prepareCourseScheduleTT(connection, records) {

    const ttCache = {};          // groupKey -> current max tt
    const courseTTCache = {};    // courseKey -> tt
    const classIdCache = {};     // courseKey -> class_id_ascending

    // normalize data
    for (const r of records) {
        r.dot = String(r.dot).trim();
        r.ki_hoc = String(r.ki_hoc).trim();
        r.nam_hoc = String(r.nam_hoc).trim();
        r.course_name = String(r.course_name).trim();
    }

    // lấy unique group
    const groups = [...new Set(
        records.map(r => `${r.dot}|${r.ki_hoc}|${r.nam_hoc}`)
    )];

    // lấy unique course
    const courses = [...new Set(
        records.map(r => `${r.dot}|${r.ki_hoc}|${r.nam_hoc}|${r.course_name}`)
    )];

    // ===== 1️⃣ Lấy MAX(tt) theo group =====
    for (const g of groups) {

        const [dot, ki_hoc, nam_hoc] = g.split("|");

        const [result] = await connection.query(
            `SELECT COALESCE(MAX(tt),0) as maxTt
             FROM course_schedule_details
             WHERE dot=? AND ki_hoc=? AND nam_hoc=?`,
            [dot, ki_hoc, nam_hoc]
        );

        ttCache[g] = result[0].maxTt;
    }

    // ===== 2️⃣ Lấy tt của course đã tồn tại =====
    for (const c of courses) {

        const [dot, ki_hoc, nam_hoc, course_name] = c.split("|");

        const [existing] = await connection.query(
            `SELECT tt
             FROM course_schedule_details
             WHERE dot=? AND ki_hoc=? AND nam_hoc=? AND course_name=?
             LIMIT 1`,
            [dot, ki_hoc, nam_hoc, course_name]
        );

        if (existing.length > 0) {
            courseTTCache[c] = existing[0].tt;
        }
    }

    // ===== 3️⃣ assign tt =====
    for (const record of records) {

        const { dot, ki_hoc, nam_hoc, course_name } = record;

        const groupKey = `${dot}|${ki_hoc}|${nam_hoc}`;
        const courseKey = `${groupKey}|${course_name}`;

        if (!courseTTCache[courseKey]) {

            ttCache[groupKey] += 1;
            courseTTCache[courseKey] = ttCache[groupKey];
        }

        record.tt = courseTTCache[courseKey];

        // ===== class_id_ascending =====
        if (!classIdCache[courseKey]) {
            classIdCache[courseKey] = 0;
        }

        classIdCache[courseKey] += 1;

        record.class_id_ascending = classIdCache[courseKey];
    }

    return records;
}

async function importCourseScheduleDetails(connection, records) {

    const prepared = await prepareCourseScheduleTT(connection, records);

    return importGenericTable(
        connection,
        "course_schedule_details",
        prepared,
        {
            uniqueKey: [
                "dot",
                "ki_hoc",
                "nam_hoc",
                "course_name",
                "day_of_week",
                "start_date",
                "end_date",
                "period_start",
                "period_end"
            ]
        }
    );
}

// ============================================
// IMPORT HELPERS - GENERIC TABLES
// ============================================

/**
 * Import generic table records (business, master, research, salary, temporary)
 * Uses composite natural keys for UPSERT
 * 
 * This handler works for all tables that use composite natural keys
 * including: business tables, master data, research tables, salary tables, etc.
 */

// async function importGenericTable(connection, tableName, records, config) {
//     let inserted = 0;
//     let updated = 0;
//     let skipped = 0;
//     const errors = [];

//     // Helper: format Date cho MySQL
//     const formatDateForMySQL = (value) => {
//         if (!value) return null;

//         const date = new Date(value);
//         if (isNaN(date.getTime())) return null;

//         return date.toISOString().slice(0, 19).replace("T", " ");
//     };

//     for (const record of records) {
//         try {
//             // 1️⃣ Validate unique keys
//             const missingKeys = config.uniqueKey.filter(
//                 (key) => record[key] === undefined || record[key] === null || record[key] === ""
//             );

//             if (missingKeys.length > 0) {
//                 errors.push({
//                     record,
//                     error: `Missing required key fields: ${missingKeys.join(", ")}`
//                 });
//                 continue;
//             }

//             // 2️⃣ Remove auto increment ID nếu không preserve
//             let data;
//             if (config.preserveId && record.id !== undefined) {
//                 data = { ...record };
//             } else {
//                 const { id, ID, Id, STT, stt, ...rest } = record;
//                 data = { ...rest };
//             }

//             // 3️⃣ Auto format Date fields (nếu value là ISO string)
//             for (const key in data) {
//                 if (
//                     typeof data[key] === "string" &&
//                     data[key].includes("T") &&
//                     data[key].includes("Z")
//                 ) {
//                     data[key] = formatDateForMySQL(data[key]);
//                 }
//             }

//             const fields = Object.keys(data);
//             const values = Object.values(data);

//             if (fields.length === 0) {
//                 skipped++;
//                 continue;
//             }

//             // 4️⃣ Build UPDATE clause
//             const updateClauses = fields
//                 .filter((f) => !config.uniqueKey.includes(f))
//                 .map((f) => `${f} = VALUES(${f})`)
//                 .join(", ");

//             const placeholders = fields.map(() => "?").join(", ");

//             let query;
//             let isInsertIgnore = false;

//             if (updateClauses) {
//                 query = `
//                     INSERT INTO ${tableName} (${fields.join(", ")})
//                     VALUES (${placeholders})
//                     ON DUPLICATE KEY UPDATE ${updateClauses}
//                 `;
//             } else {
//                 isInsertIgnore = true;
//                 query = `
//                     INSERT IGNORE INTO ${tableName} (${fields.join(", ")})
//                     VALUES (${placeholders})
//                 `;
//             }

//             let result;

//             try {
//                 [result] = await connection.query(query, values);
//             } catch (err) {
//                 errors.push({
//                     record,
//                     error: err.message
//                 });
//                 continue;
//             }

//             // 5️⃣ Count logic chính xác
//             // MySQL ON DUPLICATE KEY UPDATE:
//             //   affectedRows=0  → duplicate, values giống hệt → skip
//             //   affectedRows=1  → INSERT mới (insertId>0) hoặc collision không rõ
//             //   affectedRows=2  → ON DUPLICATE KEY đã chạy, dùng changedRows để phân biệt:
//             //                     changedRows=0 → values giống hệt (trùng key trong batch)  → skip
//             //                     changedRows>0 → có field thực sự thay đổi               → updated
//             if (isInsertIgnore) {
//                 if (result.affectedRows === 1) {
//                     inserted++;
//                 } else {
//                     skipped++;
//                 }
//             } else {
//                 if (result.affectedRows === 1) {
//                     if (result.insertId > 0) {
//                         inserted++;
//                     } else if (result.changedRows > 0){
//                         updated ++;
//                     } 
//                     else {
//                         skipped++;
//                     }
//                 } else if (result.affectedRows === 2) {
//                     if (result.changedRows > 0) {
//                         updated++;   // Có field thực sự thay đổi
//                     } else {
//                         skipped++;   // ON DUPLICATE KEY nhưng values giống → không tính là update
//                     }
//                 } else {
//                     skipped++;
//                 }
//             }

//         } catch (err) {
//             console.error(`[SYNC generic] Lỗi khi xử lý bản ghi ở bảng ${tableName}:`, err.message);
//             errors.push({
//                 record,
//                 error: err.message
//             });
//         }
//     }

//     return {
//         inserted,
//         updated,
//         skipped,
//         errors,
//         total: records.length
//     };
// }

// async function importGenericTable(connection, tableName, records, config) {
//     let inserted = 0;
//     let updated = 0;
//     let skipped = 0;
//     const errors = [];

//     const formatDateForMySQL = (value) => {
//         if (!value) return null;
//         const date = new Date(value);
//         if (isNaN(date.getTime())) return null;
//         return date.toISOString().slice(0, 19).replace("T", " ");
//     };

//     for (const record of records) {
//         try {
//             const missingKeys = config.uniqueKey.filter(
//                 (key) => record[key] === undefined || record[key] === null || record[key] === ""
//             );

//             if (missingKeys.length > 0) {
//                 errors.push({ record, error: `Missing required key fields: ${missingKeys.join(", ")}` });
//                 continue;
//             }

//             let data;
//             if (config.preserveId && record.id !== undefined) {
//                 data = { ...record };
//             } else {
//                 const { id, ID, Id, STT, stt, ...rest } = record;
//                 data = { ...rest };
//             }

//             for (const key in data) {
//                 if (
//                     typeof data[key] === "string" &&
//                     data[key].includes("T") &&
//                     data[key].includes("Z")
//                 ) {
//                     data[key] = formatDateForMySQL(data[key]);
//                 }
//             }

//             const fields = Object.keys(data);
//             const values = Object.values(data);

//             if (fields.length === 0) {
//                 skipped++;
//                 continue;
//             }

//             const updateClauses = fields
//                 .filter((f) => !config.uniqueKey.includes(f))
//                 .map((f) => `${f} = VALUES(${f})`)
//                 .join(", ");

//             const placeholders = fields.map(() => "?").join(", ");

//             let query;
//             let isInsertIgnore = false;

//             if (updateClauses) {
//                 query = `
//                     INSERT INTO ${tableName} (${fields.join(", ")})
//                     VALUES (${placeholders})
//                     ON DUPLICATE KEY UPDATE ${updateClauses}
//                 `;
//             } else {
//                 isInsertIgnore = true;
//                 query = `
//                     INSERT IGNORE INTO ${tableName} (${fields.join(", ")})
//                     VALUES (${placeholders})
//                 `;
//             }

//             let result;
//             try {
//                 [result] = await connection.query(query, values);
//             } catch (err) {
//                 errors.push({ record, error: err.message });
//                 continue;
//             }


//             if (isInsertIgnore) {
//                 if (result.affectedRows === 1) inserted++;
//                 else skipped++;
//             } else {
//                 if (result.affectedRows === 1) {
//                     if (result.insertId > 0) inserted++;
//                     else if (result.changedRows > 0) updated++;
//                     else skipped++;
//                 } else if (result.affectedRows === 2) {
//                     if (result.changedRows > 0) updated++;
//                     else skipped++;
//                 } else {
//                     skipped++;
//                 }
//             }

//         } catch (err) {
//             errors.push({ record, error: err.message });
//         }
//     }

//     return { inserted, updated, skipped, errors, total: records.length };
// }

// async function importGenericTable(connection, tableName, records, config) {
//     let inserted = 0;
//     let updated = 0;
//     let skipped = 0;
//     const errors = [];
//     const warnings = [];

//     const formatDateForMySQL = (value) => {
//         if (!value) return null;
//         const date = new Date(value);
//         if (isNaN(date.getTime())) return null;
//         return date.toISOString().slice(0, 19).replace("T", " ");
//     };

//     const formatDateOnlyForMySQL = (value) => {
//         if (!value) return null;
//         const date = new Date(value);
//         if (isNaN(date.getTime())) return null;
//         const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
//         return vnDate.toISOString().slice(0, 10);
//     };

//     for (const record of records) {
//         try {
//             const missingKeys = config.uniqueKey.filter(
//                 (key) => record[key] === undefined || record[key] === null || record[key] === ""
//             );

//             if (missingKeys.length > 0) {
//                 errors.push({ record, error: `Missing required key fields: ${missingKeys.join(", ")}` });
//                 continue;
//             }

//             let data;
//             if (config.preserveId && record.id !== undefined) {
//                 data = { ...record };
//             } else {
//                 const { id, ID, Id, STT, stt, MaGiangDay, ...rest } = record;
//                 data = { ...rest };
//             }

//             for (const key in data) {
//                 if (
//                     typeof data[key] === "string" &&
//                     data[key].includes("T") &&
//                     data[key].includes("Z")
//                 ) {
//                     const isDateOnlyColumn = /ngay|date|deadline/i.test(key);
//                     data[key] = isDateOnlyColumn
//                         ? formatDateOnlyForMySQL(data[key])
//                         : formatDateForMySQL(data[key]);
//                 }
//             }

//             const fields = Object.keys(data);
//             const values = Object.values(data);

//             if (fields.length === 0) {
//                 skipped++;
//                 continue;
//             }

//             const updateClauses = fields
//                 .filter((f) => !config.uniqueKey.includes(f))
//                 .map((f) => `${f} = VALUES(${f})`)
//                 .join(", ");

//             const placeholders = fields.map(() => "?").join(", ");

//             let query;
//             let isInsertIgnore = false;

//             if (updateClauses) {
//                 query = `
//                     INSERT INTO ${tableName} (${fields.join(", ")})
//                     VALUES (${placeholders})
//                     ON DUPLICATE KEY UPDATE ${updateClauses}
//                 `;
//             } else {
//                 isInsertIgnore = true;
//                 query = `
//                     INSERT IGNORE INTO ${tableName} (${fields.join(", ")})
//                     VALUES (${placeholders})
//                 `;
//             }

//             let result;
//             try {
//                 [result] = await connection.query(query, values);

//                 if (tableName == 'course_schedule_details')
//                     console.log(`[${tableName}] affectedRows=${result.affectedRows} insertId=${result.insertId} changedRows=${result.changedRows}`);

//                 if (result.warningStatus > 0) {
//                     const [warningRows] = await connection.query("SHOW WARNINGS");
//                     const realWarnings = warningRows.filter(w => w.Code !== 1062);
//                     if (realWarnings.length > 0) {
//                         warnings.push({
//                             record,
//                             warnings: realWarnings.map(w => ({
//                                 level: w.Level,
//                                 code: w.Code,
//                                 message: w.Message
//                             }))
//                         });
//                     }
//                 }

//             } catch (err) {
//                 errors.push({ record, error: err.message });
//                 continue;
//             }

//             // if (isInsertIgnore) {
//             //     if (result.affectedRows === 1) inserted++;
//             //     else skipped++;
//             // } else {
//             //     if (result.affectedRows === 1) {
//             //         if (result.insertId > 0) inserted++;
//             //         else if (result.changedRows > 0) updated++;
//             //         else skipped++;
//             //     } else if (result.affectedRows === 2) {
//             //         updated++;
//             //         if (result.changedRows > 0) updated++;
//             //         else skipped++;
//             //     } else {
//             //         skipped++;
//             //     }
//             // }

//             if (isInsertIgnore) {
//                 if (result.affectedRows === 1) inserted++;
//                 else skipped++;
//             } else {
//                 if (result.affectedRows === 0) {
//                     // Không khớp điều kiện nào
//                     skipped++;
//                 } else if (result.affectedRows === 1) {
//                     if (result.insertId > 0) inserted++;       // INSERT mới
//                     else skipped++;                             // Khớp nhưng không đổi gì
//                 } else if (result.affectedRows === 2) {
//                     updated++;                                  // DELETE cũ + INSERT mới = có thay đổi thật
//                         console.log(`[${tableName}] UPDATE record:`, JSON.stringify(record));

//                 }
//             }

//         } catch (err) {
//             errors.push({ record, error: err.message });
//         }
//     }

//     return { inserted, updated, skipped, errors, warnings, total: records.length };
// }

async function importGenericTable(connection, tableName, records, config) {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];
    const warnings = [];

    console.log(`[IMPORT ${tableName}]`);

    const formatDateForMySQL = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 19).replace("T", " ");
    };

    const formatDateOnlyForMySQL = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        return vnDate.toISOString().slice(0, 10);
    };

    const normalizeValue = (val) => {
        if (val === null || val === undefined || val === "") return null;
        // Date object từ mysql2 → cộng +7h để ra ngày VN
        if (val instanceof Date) {
            const vnDate = new Date(val.getTime() + 7 * 60 * 60 * 1000);
            return vnDate.toISOString().slice(0, 10);
        }
        const str = String(val).trim();
        const num = Number(str);
        if (!isNaN(num) && str !== "") return num;
        return str;
    }

    if (config.importMode === "insert-only") {
        for (const record of records) {
            try {
                let data;
                if (config.preserveId && record.id !== undefined) {
                    data = { ...record };
                } else {
                    const { id, ID, Id, STT, stt, MaGiangDay, MaHopDong, ...rest } = record;
                    data = { ...rest };
                }

                const isISODate = (val) => {
                    return typeof val === "string" &&
                        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
                };

                for (const key in data) {
                    if (isISODate(data[key])) {
                        const isDateOnlyColumn = /ngay|date|deadline/i.test(key);
                        data[key] = isDateOnlyColumn
                            ? formatDateOnlyForMySQL(data[key])
                            : formatDateForMySQL(data[key]);
                    }
                }

                const fields = Object.keys(data);
                const values = Object.values(data);

                if (fields.length === 0) {
                    skipped++;
                    continue;
                }

                const placeholders = fields.map(() => "?").join(", ");
                await connection.query(
                    `INSERT INTO ${tableName} (${fields.join(", ")}) VALUES (${placeholders})`,
                    values
                );
                inserted++;
            } catch (error) {
                errors.push({ record, error: error.message });
            }
        }

        return { inserted, updated, skipped, errors, warnings, total: records.length };
    }

    for (const record of records) {
        try {
            // const missingKeys = config.uniqueKey.filter(
            //     (key) => record[key] === undefined || record[key] === null || record[key] === ""
            // );

            const missingKeys = config.uniqueKey.filter(
                (key) => {
                    const val = record[key];
                    return val === undefined || val === null || String(val).trim() === "";
                }
            );

            if (missingKeys.length > 0) {
                errors.push({ record, error: `Missing required key fields: ${missingKeys.join(", ")}` });
                continue;
            }

            let data;
            if (config.preserveId && record.id !== undefined) {
                data = { ...record };
            } else {
                const { id, ID, Id, STT, stt, MaGiangDay, MaHopDong, ...rest } = record;
                data = { ...rest };
            }

            const isISODate = (val) => {
                return typeof val === "string" &&
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
            };

            for (const key in data) {
                if (isISODate(data[key])) {
                    const isDateOnlyColumn = /ngay|date|deadline/i.test(key);
                    data[key] = isDateOnlyColumn
                        ? formatDateOnlyForMySQL(data[key])
                        : formatDateForMySQL(data[key]);

                    if (data[key] === null && record[key]) {
                        console.log('⚠️ LOST DATA:', key, record[key]);
                    }
                }
            }

            // for (const key in data) {
            //     if (
            //         typeof data[key] === "string" &&
            //         data[key].includes("T") &&
            //         data[key].includes("Z")
            //     ) {
            //         const isDateOnlyColumn = /ngay|date|deadline/i.test(key);
            //         data[key] = isDateOnlyColumn
            //             ? formatDateOnlyForMySQL(data[key])
            //             : formatDateForMySQL(data[key]);
            //     }
            // }

            const fields = Object.keys(data);
            const values = Object.values(data);

            if (fields.length === 0) {
                skipped++;
                continue;
            }

            const updateClauses = fields
                .filter((f) => !config.uniqueKey.includes(f))
                .map((f) => `${f} = VALUES(${f})`)
                .join(", ");

            const placeholders = fields.map(() => "?").join(", ");

            let query;
            let isInsertIgnore = false;

            if (updateClauses) {
                query = `
                    INSERT INTO ${tableName} (${fields.join(", ")})
                    VALUES (${placeholders})
                    ON DUPLICATE KEY UPDATE ${updateClauses}
                `;
            } else {
                isInsertIgnore = true;
                query = `
                    INSERT IGNORE INTO ${tableName} (${fields.join(", ")})
                    VALUES (${placeholders})
                `;
            }

            let result;
            let existingBefore;
            try {
                // SELECT trước khi INSERT để lấy giá trị cũ
                const whereClause = config.uniqueKey.map(k => `${k} = ?`).join(" AND ");
                const whereValues = config.uniqueKey.map(k => data[k]);
                [[existingBefore]] = await connection.query(
                    `SELECT * FROM ${tableName} WHERE ${whereClause}`,
                    whereValues
                );

                [result] = await connection.query(query, values);

                if (result.warningStatus > 0) {
                    const [warningRows] = await connection.query("SHOW WARNINGS");
                    const realWarnings = warningRows.filter(w => w.Code !== 1062);
                    if (realWarnings.length > 0) {
                        warnings.push({
                            record,
                            warnings: realWarnings.map(w => ({
                                level: w.Level,
                                code: w.Code,
                                message: w.Message
                            }))
                        });
                    }
                }

            } catch (err) {
                console.log('❌ INSERT FAIL:', tableName);
                console.log('👉 RECORD:', JSON.stringify(record));
                console.log('👉 DATA:', JSON.stringify(data));
                console.log('👉 ERROR:', err.message);
                console.log('-----------------------------');

                errors.push({ record, error: err.message });
                continue;
            }

            if (isInsertIgnore) {
                if (result.affectedRows === 1) inserted++;
                else skipped++;
            } else {
                if (result.affectedRows === 0) {
                    skipped++;
                } else if (result.affectedRows === 1) {
                    if (result.insertId > 0) inserted++;
                    else skipped++;
            } else if (result.affectedRows === 2) {
                const reallyChanged = !existingBefore || fields.some(f => {
                    const dbVal = normalizeValue(existingBefore[f]);
                    const newVal = normalizeValue(data[f]);
                    if (dbVal !== newVal) {
                        console.log(`[${tableName}] DIFF field="${f}" db=${JSON.stringify(dbVal)} new=${JSON.stringify(newVal)}`);
                        return true;
                    }
                    return false;
                });
                if (reallyChanged) {
                    // console.log(`[${tableName}] → updated`);
                    updated++;
                } else {
                    console.log(`[${tableName}] → skipped (không có diff)`);
                    skipped++;
                }
            }
        }
        } catch (err) {
            errors.push({ record, error: err.message });
        }
    }

    return { inserted, updated, skipped, errors, warnings, total: records.length };
}

/**
 * Import all tables at once from exported data
 * POST /sync/import-all
 * Body: JSON from /sync/export-all
 */
exports.importAll = async (req, res) => {
    let connection;
    try {
        const { tables } = req.body;

        if (!tables || typeof tables !== 'object') {
            return res.status(400).json({
                success: false,
                message: "Invalid format. Expected { tables: { tableName: { data: [...] } } }",
            });
        }

        connection = await createConnection();

        const results = {};
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        // Import each table
        for (const [tableName, tableData] of Object.entries(tables)) {
            // Skip if not a valid table or no data
            if (!syncConfig[tableName] || !tableData.data || tableData.data.length === 0) {
                results[tableName] = {
                    skipped: true,
                    message: "No data or invalid table",
                };
                continue;
            }

            try {
                const config = syncConfig[tableName];

                try {
                    const schemaResult = await validateAndMigrateSchemaFromData(
                        connection,
                        tableName,
                        tableData.data
                    );
                } catch (schemaError) {
                    console.error(`❌ [DEBUG] SCHEMA ERROR:`, schemaError);
                    console.warn(`⚠️  [SCHEMA] Schema validation skipped for ${tableName}:`, schemaError.message);
                    // Continue with import even if schema validation fails
                }

                // Start transaction for this table
                await connection.beginTransaction();

                let result;

                // Route to appropriate handler
                switch (config.type) {
                    case "employee":
                        result = await importNhanVien(connection, tableData.data);
                        break;
                    case "teacher":
                        result = await importGvmoi(connection, tableData.data);
                        break;
                    case "schedule":
                        result = await importCourseScheduleDetails(connection, tableData.data);
                        break;
                    case "contract":
                    case "business":
                    case "master":
                    case "research":
                    case "salary":
                    case "temporary":
                        result = await importGenericTable(connection, tableName, tableData.data, config);
                        break;
                    default:
                        throw new Error(`Unknown table type: ${config.type}`);
                }

                // Commit transaction
                await connection.commit();

                // ← thêm vào đây
if (result.warnings?.length > 0) {
    console.warn(`⚠️  [${tableName}] ${result.warnings.length} warning(s):`);
    result.warnings.forEach((w) => {
        console.warn(`   Code: ${w.warnings.map(x => x.code).join(", ")} | Message: ${w.warnings.map(x => x.message).join(", ")}`);
        console.warn(`   Record:`, JSON.stringify(w.record));
    });
}

                results[tableName] = {
                    success: true,
                    ...result,
                };

                totalInserted += result.inserted;
                totalUpdated += result.updated;
                totalErrors += result.errors.length;

            } catch (error) {
                // Rollback on error
                await connection.rollback();

                console.error(`Error importing ${tableName}:`, error);
                results[tableName] = {
                    success: false,
                    error: error.message,
                };
                totalErrors++;
            }
        }

        return res.status(200).json({
            success: true,
            message: "Import all completed",
            totalInserted,
            totalUpdated,
            totalErrors,
            results,
        });

    } catch (error) {
        console.error("Import all error:", error);
        return res.status(500).json({
            success: false,
            message: "Error importing all tables",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Clear Master Tables - One-Time Setup
 * POST /sync/clear-master-tables
 */
exports.clearMasterTables = async (req, res) => {
    let connection;
    try {
        connection = await createConnection();

        // Master tables to clear (reverse dependency order)
        // const masterTables = [
        //     'khoa_sinh_vien',
        //     'he_dao_tao',
        //     'chuc_danh_nghe_nghiep',
        //     'bomon',
        //     'phongban',
        //     'namhoc'
        // ];
        const masterTables = [
            'he_dao_tao',
            'chuc_danh_nghe_nghiep'
        ];

        // Disable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Clear each master table
        const clearedTables = [];
        for (const table of masterTables) {
            try {
                await connection.query(`TRUNCATE TABLE ${table}`);
                clearedTables.push(table);
                console.log(`[SYNC] Cleared master table: ${table}`);
            } catch (error) {
                console.error(`[SYNC] Error clearing ${table}:`, error.message);
                // Continue with next table
            }
        }

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        return res.status(200).json({
            success: true,
            message: `Đã xóa ${clearedTables.length} master tables`,
            clearedCount: clearedTables.length,
            tables: clearedTables,
            nextStep: 'Import master tables từ PUBLIC ngay!'
        });

    } catch (error) {
        console.error('[SYNC] Clear master tables error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa master tables',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};
