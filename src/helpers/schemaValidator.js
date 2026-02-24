/**
 * Schema Validator & Auto-Migration Helper
 * Detects and automatically adds missing columns from import data
 */

/**
 * Get all column names for a table
 * @param {Connection} connection - Database connection
 * @param {string} tableName - Table name
 * @returns {Promise<string[]>} Array of column names
 */
async function getTableColumns(connection, tableName) {
    const [columns] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [tableName]
    );

    return columns.map(col => col.COLUMN_NAME);
}

/**
 * Infer data type from JavaScript value
 * @param {*} value - Sample value
 * @returns {string} MySQL data type
 */
function inferDataType(value) {
    if (value === null || value === undefined) {
        return 'TEXT NULL'; // Default to TEXT if we can't determine type
    }

    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'INT' : 'DOUBLE';
    }

    if (typeof value === 'boolean') {
        return 'TINYINT(1)';
    }

    if (typeof value === 'string') {
        if (value.length <= 255) {
            return 'VARCHAR(255)';
        }
        return 'TEXT';
    }

    if (value instanceof Date) {
        return 'DATETIME';
    }

    // Default
    return 'TEXT';
}

/**
 * Detect missing columns from import data
 * @param {Connection} connection - Target database connection
 * @param {string} tableName - Table name
 * @param {Object[]} records - Data records being imported
 * @returns {Promise<string[]>} Array of missing column names
 */
async function detectMissingColumnsFromData(connection, tableName, records) {
    if (!records || records.length === 0) {
        return [];
    }

    try {
        // Get existing columns in target table
        const existingColumns = await getTableColumns(connection, tableName);

        // Get all unique keys from data records
        const dataColumns = new Set();
        records.forEach(record => {
            Object.keys(record).forEach(key => dataColumns.add(key));
        });

        // Find columns in data but not in table
        const missingColumns = Array.from(dataColumns).filter(
            col => !existingColumns.includes(col)
        );

        return missingColumns;

    } catch (error) {
        // If table doesn't exist, all columns are "missing" but handled elsewhere
        if (error.message && error.message.includes('doesn\'t exist')) {
            return [];
        }
        throw error;
    }
}

/**
 * Generate ALTER TABLE ADD COLUMN SQL statement (with inferred type)
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @param {*} sampleValue - Sample value to infer type
 * @returns {string} SQL statement
 */
function generateAlterTableSQL(tableName, columnName, sampleValue) {
    const dataType = inferDataType(sampleValue);
    let sql = `ALTER TABLE ${tableName} ADD COLUMN \`${columnName}\` ${dataType}`;

    // Most inferred columns should be nullable to avoid errors
    sql += ' NULL';

    return sql;
}

/**
 * Auto-migrate schema based on import data
 * This version infers column types from data values
 * @param {Connection} connection - Target database connection
 * @param {string} tableName - Table name
 * @param {Object[]} records - Data records being imported
 * @returns {Promise<Object>} Migration result
 */
async function validateAndMigrateSchemaFromData(connection, tableName, records) {
    const result = {
        tableName,
        missingColumns: [],
        columnsAdded: [],
        errors: [],
        skipped: false
    };

    try {
        // Step 1: Find missing columns from data
        const missingColumns = await detectMissingColumnsFromData(connection, tableName, records);
        result.missingColumns = missingColumns;

        if (missingColumns.length === 0) {
            result.skipped = true;
            return result;
        }

        console.log(`\n🔍 [SCHEMA] Table ${tableName}: Found ${missingColumns.length} missing columns:`, missingColumns);

        // Step 2: Add missing columns with inferred types
        for (const columnName of missingColumns) {
            try {
                // Find a sample value for this column
                let sampleValue = null;
                for (const record of records) {
                    if (record[columnName] !== undefined && record[columnName] !== null) {
                        sampleValue = record[columnName];
                        break;
                    }
                }

                // Generate ALTER TABLE statement
                const alterSQL = generateAlterTableSQL(tableName, columnName, sampleValue);

                console.log(`⚡ [SCHEMA] Executing: ${alterSQL}`);

                // Execute migration
                await connection.query(alterSQL);

                result.columnsAdded.push(columnName);
                console.log(`✅ [SCHEMA] Added column: ${columnName} (inferred type from data)`);

            } catch (error) {
                console.error(`❌ [SCHEMA] Failed to add column ${columnName}:`, error.message);
                result.errors.push({
                    column: columnName,
                    error: error.message
                });
            }
        }

        // Summary
        if (result.columnsAdded.length > 0) {
            console.log(`\n✅ [SCHEMA MIGRATION] ${tableName}: Successfully added ${result.columnsAdded.length} columns`);
        }
        if (result.errors.length > 0) {
            console.log(`\n⚠️  [SCHEMA MIGRATION] ${tableName}: ${result.errors.length} errors occurred`);
        }

    } catch (error) {
        console.error(`❌ [SCHEMA] Schema validation failed for ${tableName}:`, error.message);
        result.errors.push({
            column: 'N/A',
            error: error.message
        });
    }

    return result;
}

module.exports = {
    getTableColumns,
    detectMissingColumnsFromData,
    validateAndMigrateSchemaFromData
};
