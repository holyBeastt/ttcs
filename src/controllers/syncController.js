/**
 * Sync Controller
 * Handles data export and import operations for database synchronization
 * Uses natural keys for UPSERT operations (no UUID, no auto-increment IDs)
 */

const createConnection = require("../config/databasePool");
const syncConfig = require("../config/syncConfig");
const { validateAndMigrateSchemaFromData } = require("../helpers/schemaValidator");

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

        // Use custom export query if defined, otherwise use default SELECT *
        if (config.exportQuery) {
            query = config.exportQuery;
            [data] = await connection.query(query);
        } else {
            // Default: SELECT * FROM table
            query = `SELECT * FROM ${table}`;
            [data] = await connection.query(query);

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

        // Export each table
        for (const [tableName, config] of Object.entries(syncConfig)) {
            try {
                let query;
                let data;

                if (config.exportQuery) {
                    query = config.exportQuery;
                    [data] = await connection.query(query);
                } else {
                    query = `SELECT * FROM ${tableName}`;
                    [data] = await connection.query(query);

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
                message: `Invalid table name. Supported tables: ${Object.keys(
                    syncConfig
                ).join(", ")}`,
            });
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
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
 * 1. Find or create taikhoannguoidung by tendangnhap
 * 2. Find or create nhanvien by id_User
 */
async function importNhanVien(connection, records) {
    let inserted = 0;
    let updated = 0;
    const errors = [];

    for (const record of records) {
        try {
            const { tendangnhap, matkhau, ...nhanvienData } = record;

            if (!tendangnhap) {
                errors.push({
                    record: record,
                    error: "Missing tendangnhap (username)",
                });
                continue;
            }

            // Step 1: Find or create taikhoannguoidung
            let userId = nhanvienData.id_User;

            // Check if taikhoannguoidung exists by tendangnhap
            const [existingAccounts] = await connection.query(
                "SELECT id_User FROM taikhoannguoidung WHERE TenDangNhap = ?",
                [tendangnhap]
            );

            if (existingAccounts.length > 0) {
                // Account exists - get the id_User
                userId = existingAccounts[0].id_User;

                // Update password if provided
                if (matkhau) {
                    await connection.query(
                        "UPDATE taikhoannguoidung SET MatKhau = ? WHERE TenDangNhap = ?",
                        [matkhau, tendangnhap]
                    );
                }
            } else {
                // Account doesn't exist - create it
                const [insertResult] = await connection.query(
                    "INSERT INTO taikhoannguoidung (TenDangNhap, MatKhau, id_User) VALUES (?, ?, ?)",
                    [tendangnhap, matkhau || "123456", userId]
                );

                // If id_User was not provided, use the inserted ID
                if (!userId) {
                    userId = insertResult.insertId;
                }
            }

            // Step 2: Find or create nhanvien by id_User
            const [existingNhanVien] = await connection.query(
                "SELECT id_User FROM nhanvien WHERE id_User = ?",
                [userId]
            );

            if (existingNhanVien.length > 0) {
                // Employee exists - UPDATE
                const updateFields = [];
                const updateValues = [];

                for (const [key, value] of Object.entries(nhanvienData)) {
                    if (key !== "id_User") {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                }

                if (updateFields.length > 0) {
                    updateValues.push(userId);
                    await connection.query(
                        `UPDATE nhanvien SET ${updateFields.join(", ")} WHERE id_User = ?`,
                        updateValues
                    );
                    updated++;
                }
            } else {
                // Employee doesn't exist - INSERT
                const fields = ["id_User", ...Object.keys(nhanvienData)];
                const values = [userId, ...Object.values(nhanvienData)];
                const placeholders = fields.map(() => "?").join(", ");

                await connection.query(
                    `INSERT INTO nhanvien (${fields.join(", ")}) VALUES (${placeholders})`,
                    values
                );
                inserted++;
            }
        } catch (error) {
            errors.push({
                record: record,
                error: error.message,
            });
        }
    }

    return {
        inserted,
        updated,
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
    const errors = [];

    for (const record of records) {
        try {
            const { CCCD } = record;

            if (!CCCD) {
                errors.push({
                    record: record,
                    error: "Missing CCCD (unique identifier)",
                });
                continue;
            }

            // Build field list (excluding id if present)
            const { id, ...dataWithoutId } = record;
            const fields = Object.keys(dataWithoutId);
            const values = Object.values(dataWithoutId);

            // Build UPDATE clause for ON DUPLICATE KEY
            const updateClauses = fields
                .filter((f) => f !== "CCCD") // Don't update the key itself
                .map((f) => `${f} = VALUES(${f})`)
                .join(", ");

            const placeholders = fields.map(() => "?").join(", ");

            // Use INSERT ... ON DUPLICATE KEY UPDATE for UPSERT
            const query = `
        INSERT INTO gvmoi (${fields.join(", ")})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClauses}
      `;

            const [result] = await connection.query(query, values);

            // Check if inserted or updated based on affectedRows
            if (result.affectedRows === 1) {
                inserted++;
            } else if (result.affectedRows === 2) {
                // ON DUPLICATE KEY UPDATE returns 2 for updates
                updated++;
            }
        } catch (error) {
            errors.push({
                record: record,
                error: error.message,
            });
        }
    }

    return {
        inserted,
        updated,
        errors,
        total: records.length,
    };
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
async function importGenericTable(connection, tableName, records, config) {
    let inserted = 0;
    let updated = 0;
    const errors = [];

    for (const record of records) {
        try {
            // Validate that all unique key fields are present
            const missingKeys = config.uniqueKey.filter((key) => !record[key]);
            if (missingKeys.length > 0) {
                errors.push({
                    record: record,
                    error: `Missing required key fields: ${missingKeys.join(", ")}`,
                });
                continue;
            }

            // Build field list - keep id if preserveId, otherwise remove it
            let fields, values;
            if (config.preserveId && record.id !== undefined) {
                // Keep id for master tables
                fields = Object.keys(record);
                values = Object.values(record);
                console.log(`[SYNC DEBUG] 🔑 Preserving ID: ${record.id}`);
            } else {
                // Remove id for other tables (handle all case variants)
                const { id, ID, Id, ...dataWithoutId } = record;
                fields = Object.keys(dataWithoutId);
                values = Object.values(dataWithoutId);
            }

            // Build UPDATE clause for ON DUPLICATE KEY
            const updateClauses = fields
                .filter((f) => !config.uniqueKey.includes(f)) // Don't update the key fields
                .map((f) => `${f} = VALUES(${f})`)
                .join(", ");

            const placeholders = fields.map(() => "?").join(", ");

            // Use INSERT ... ON DUPLICATE KEY UPDATE for UPSERT
            let query;
            if (updateClauses) {
                query = `
                INSERT INTO ${tableName} (${fields.join(", ")})
                VALUES (${placeholders})
                ON DUPLICATE KEY UPDATE ${updateClauses}
                `;
            } else {
                // If all fields are part of the unique key, just INSERT IGNORE
                query = `
                INSERT IGNORE INTO ${tableName} (${fields.join(", ")})
                VALUES (${placeholders})
                `;
            }

            const [result] = await connection.query(query, values);

            // Check if inserted or updated based on affectedRows
            if (result.affectedRows === 1) {
                inserted++;
            } else if (result.affectedRows === 2) {
                // ON DUPLICATE KEY UPDATE returns 2 for updates
                updated++;
            }
        } catch (error) {
            errors.push({
                record: record,
                error: error.message,
            });
        }
    }

    return {
        inserted,
        updated,
        errors,
        total: records.length,
    };
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

                // Auto schema validation & migration for this table
                console.log(`\n🔍 [DEBUG] === SCHEMA VALIDATION (IMPORT-ALL) ===`);
                console.log(`🔍 [DEBUG] Table: ${tableName}`);
                console.log(`🔍 [DEBUG] Data records: ${tableData.data.length}`);

                try {
                    console.log(`🔍 [DEBUG] Calling validateAndMigrateSchemaFromData...`);
                    const schemaResult = await validateAndMigrateSchemaFromData(
                        connection,
                        tableName,
                        tableData.data
                    );
                    console.log(`🔍 [DEBUG] Schema validation completed:`, schemaResult);
                } catch (schemaError) {
                    console.error(`❌ [DEBUG] SCHEMA ERROR:`, schemaError);
                    console.warn(`⚠️  [SCHEMA] Schema validation skipped for ${tableName}:`, schemaError.message);
                    // Continue with import even if schema validation fails
                }

                console.log(`🔍 [DEBUG] === SCHEMA VALIDATION END ===\n`);

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