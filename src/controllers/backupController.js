const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const DB_CONFIG = {
    host: "42.112.213.93",
    user: "admin",
    password: "Admin@123456",
    database: "ttcs",
};

const BACKUP_DIR = path.join(process.cwd(), "backups");

// Kiểm tra thư mục backup
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Hàm backup database sử dụng mysql2
// const backupDatabase = async (req, res) => {
//     try {
//         const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
//         const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
        
//         const connection = await mysql.createConnection(DB_CONFIG);
//         const [tables] = await connection.query("SHOW TABLES");

//         let sqlDump = "";
//         for (let tableObj of tables) {
//             const tableName = Object.values(tableObj)[0];
//             sqlDump += `-- Backup table: ${tableName}\n`;
//             sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;

//             // Lấy cấu trúc bảng
//             const [createTable] = await connection.query(`SHOW CREATE TABLE ${tableName}`);
//             sqlDump += createTable[0]["Create Table"] + ";\n\n";

//             // Lấy dữ liệu
//             const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
//             for (let row of rows) {
//                 const values = Object.values(row).map(val => `"${val}"`).join(",");
//                 sqlDump += `INSERT INTO ${tableName} VALUES (${values});\n`;
//             }
//             sqlDump += "\n";
//         }

//         fs.writeFileSync(backupFile, sqlDump, "utf-8");
//         await connection.end();

//         console.log("Backup thành công:", backupFile);
//         res.json({
//             success: true,
//             message: "Backup thành công!",
//             file: path.basename(backupFile), // Chỉ trả về tên file, không trả về đường dẫn đầy đủ
//         });
        

//     } catch (error) {
//         console.error("Lỗi backup:", error);
//         res.status(500).json({ success: false, message: "Backup thất bại!" });
//     }
// };
// const getfile = async (req, res) => {
//     const filename = req.params.filename;
//     const filePath = path.join(BACKUP_DIR, filename);

//     console.log("🔍 Đường dẫn file cần tải:", filePath);

//     if (!fs.existsSync(filePath)) {
//         console.error("❌ File không tồn tại:", filePath);
//         return res.status(404).json({ success: false, message: "File không tồn tại!" });
//     }

//     res.download(filePath, (err) => {
//         if (err) {
//             console.error("⚠️ Lỗi tải file:", err);
//             res.status(500).json({ success: false, message: "Tải file thất bại!" });
//         }
//     });
// };
const backupAndDownload = async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

        const connection = await mysql.createConnection(DB_CONFIG);
        const [tables] = await connection.query("SHOW TABLES");

        let sqlDump = "";
        for (let tableObj of tables) {
            const tableName = Object.values(tableObj)[0];
            sqlDump += `-- Backup table: ${tableName}\n`;
            sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;

            // Lấy cấu trúc bảng
            const [createTable] = await connection.query(`SHOW CREATE TABLE ${tableName}`);
            sqlDump += createTable[0]["Create Table"] + ";\n\n";

            // Lấy dữ liệu
            const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
            for (let row of rows) {
                const values = Object.values(row).map(val => `"${val}"`).join(",");
                sqlDump += `INSERT INTO ${tableName} VALUES (${values});\n`;
            }
            sqlDump += "\n";
        }

        fs.writeFileSync(backupFile, sqlDump, "utf-8");
        await connection.end();

        console.log("Backup thành công:", backupFile);

        // Thực hiện tải file backup ngay sau khi tạo
        res.download(backupFile, path.basename(backupFile), (err) => {
            console.log("tải file", path.basename(backupFile))
            if (err) {
                console.log("lỗi", err);
                console.error("⚠️ Lỗi tải file:", err);
                res.status(500).json({ success: false, message: "Tải file thất bại!", error: err.message });
            }
        });


} catch (error) {
    console.error("Lỗi backup:", error.message || error);
    res.status(500).json({ success: false, message: "Backup thất bại!", error: error.message });
}
};


module.exports = { backupAndDownload };
