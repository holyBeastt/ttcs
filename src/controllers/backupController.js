const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

async function createConnectionWithMultipleStatements() {
  const connection = await createPoolConnection(); // ✅ Gọi đúng hàm để lấy kết nối
  connection.config.multipleStatements = true; // ✅ Bật multipleStatements
  return connection;
}

const BACKUP_DIR = path.join(process.cwd(), "backups");
// Cấu hình multer để lưu file SQL
const upload = multer({ dest: BACKUP_DIR });

// Kiểm tra thư mục backup
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backupAndDownload = async (req, res) => {
    let connection;
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

    connection = await createPoolConnection();
    const [tables] = await connection.query("SHOW TABLES");

    let sqlDump = "";
    for (let tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      sqlDump += `-- Backup table: ${tableName}\n`;
      sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;

      // Lấy cấu trúc bảng
      const [createTable] = await connection.query(
        `SHOW CREATE TABLE ${tableName}`
      );
      sqlDump += createTable[0]["Create Table"] + ";\n\n";

      // Lấy dữ liệu
      const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
      for (let row of rows) {
        const values = Object.values(row)
          .map((val) => `'${val}'`)
          .join(",");
        sqlDump += `INSERT INTO ${tableName} VALUES (${values});\n`;
      }
      sqlDump += "\n";
    }

    fs.writeFileSync(backupFile, sqlDump, "utf-8");
    connection.release();

    console.log("Backup thành công:", backupFile);

    // Thực hiện tải file backup ngay sau khi tạo
    res.download(backupFile, path.basename(backupFile), (err) => {
      console.log("tải file", path.basename(backupFile));
      if (err) {
        console.log("lỗi", err);
        console.error("⚠️ Lỗi tải file:", err);
        res
          .status(500)
          .json({
            success: false,
            message: "Tải file thất bại!",
            error: err.message,
          });
      }
    });
  } catch (error) {
    console.error("Lỗi backup:", error.message || error);
    res
      .status(500)
      .json({
        success: false,
        message: "Backup thất bại!",
        error: error.message,
      });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
}
};

/**
 * @deprecated Chức năng này đã bị deprecated và không còn được sử dụng.
 * Route đã bị vô hiệu hóa trong backupRoute.js
 */
const resetDatabase = async (req, res) => {
    let connection;
  try {
    let filePath = "";

    // Trường hợp 1: Người dùng tải file lên
    if (req.file) {
      filePath = req.file.path;
      console.log("📂 File SQL được nhận từ upload:", filePath);
    }
    // Trường hợp 2: Người dùng chọn file từ danh sách backup
    else if (req.body.backupFileName) {
      filePath = path.join(BACKUP_DIR, req.body.backupFileName); // Đường dẫn đầy đủ
      console.log("📂 File SQL được chọn từ backup:", filePath);
    }
    // Nếu không có file nào, báo lỗi
    else {
      return res
        .status(400)
        .json({ success: false, message: "⚠️ Vui lòng chọn file SQL!" });
    }

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "❌ File không tồn tại!" });
    }

    // Đảm bảo DB_CONFIG có multipleStatements: true
    // const connection = await mysql.createConnection({ ...DB_CONFIG, multipleStatements: true });
    connection = await createConnectionWithMultipleStatements();
    // 🗑️ Xóa toàn bộ database: Xóa tất cả bảng
    const [tables] = await connection.query("SHOW TABLES");
    if (tables.length > 0) {
      console.log("🗑️ Xóa tất cả bảng...");
      for (let tableObj of tables) {
        const tableName = Object.values(tableObj)[0];
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        console.log(`✅ Đã xóa bảng: ${tableName}`);
      }
    }

    // 📥 Đọc nội dung file SQL với encoding "utf8"
    let sqlContent = fs.readFileSync(filePath, { encoding: "utf8" });

    // 🔧 Loại bỏ các dòng chỉ chứa "/" (hoặc chỉ khoảng trắng và "/")
    sqlContent = sqlContent.replace(/^\s*\/\s*$/gm, "");

    // 🔍 Loại bỏ các dòng không cần thiết (comment, SET NAMES, SET @OLD_TIME_ZONE, SET SQL_MODE)
    sqlContent = sqlContent
      .split("\n")
      .filter(
        (line) =>
          !line.startsWith("/*!") &&
          !line.startsWith("--") &&
          !line.startsWith("SET NAMES") &&
          !line.startsWith("SET @OLD_TIME_ZONE") &&
          !line.startsWith("SET SQL_MODE")
      )
      .join("\n");

    // 🔧 Loại bỏ hoàn toàn các lệnh DELIMITER
    sqlContent = sqlContent.replace(/^DELIMITER.*$/gm, "");

    // ✅ Tách các block TRIGGER bằng regex cải tiến: Bắt block bắt đầu bằng "CREATE TRIGGER" và kết thúc bằng "END;" (có thể có khoảng trắng sau END;)
    const triggerRegex = /CREATE TRIGGER[\s\S]*?END\s*\/\//gi;
    const triggerMatches = sqlContent.match(triggerRegex) || [];
    let triggerQueries = triggerMatches.map((triggerQuery) =>
      triggerQuery.trim()
    );
    triggerQueries = triggerQueries.map((triggerQuery) => {
      return triggerQuery
        .replace(/END\s*\/\//g, "END;") // Chuyển END// thành END;
        .split("\n")
        .map((line) => {
          if (/^\s*DECLARE\s/i.test(line) && !/;\s*$/.test(line)) {
            return line.trimEnd() + ";";
          }
          return line;
        })
        .join("\n");
    });

    // Xóa các block trigger khỏi nội dung SQL để lấy phần "normal" còn lại
    let normalSqlContent = sqlContent;
    for (const trigger of triggerMatches) {
      normalSqlContent = normalSqlContent.replace(trigger, "");
    }
    let normalQueries = normalSqlContent
      .split(/;\s*\n/)
      .filter((q) => q.trim() !== "");

    // 🔄 Chạy các câu lệnh SQL bình thường
    for (let query of normalQueries) {
      try {
        // 📌 Nếu query là câu INSERT, kiểm tra và sửa dữ liệu kiểu ngày
        if (/INSERT INTO/i.test(query)) {
          query = query.replace(
            /(["'])([A-Za-z]{3} [A-Za-z]{3} \d{1,2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4} \([^)]+\))\1/g,
            (match, quote, dateStr) => {
              try {
                // Chuyển đổi chuỗi ngày thành ISO, sau đó lấy phần YYYY-MM-DD
                const parsedDate = new Date(dateStr)
                  .toISOString()
                  .split("T")[0];
                return `${quote}${parsedDate}${quote}`;
              } catch (err) {
                console.warn("⚠️ Không thể chuyển đổi ngày:", dateStr);
                return match; // Nếu lỗi, giữ nguyên giá trị cũ
              }
            }
          );
          // Escape dấu ngoặc kép bên trong các giá trị chuỗi, chuyển sang dấu nháy đơn (nếu cần)
          // query = query.replace(/(?<=\s)"(?!,)|(?<![,])"(?=[\s:.])/g, "'");
          // Thay thế tất cả các giá trị "null" (với dấu nháy) thành NULL không dấu
          query = query.replace(/(["'])null\1/gi, "NULL");
        }

        await connection.query(query);
      } catch (err) {
        console.error(`❌ Lỗi khi chạy query:\n${query}\n⛔ Lỗi:`, err.message);
        return res.status(500).json({
          success: false,
          message: "Lỗi trong quá trình nhập dữ liệu!",
          error: err.message,
          query: query, // Trả về query lỗi để debug
        });
      }
    }

    // 🔄 Chạy các câu lệnh TRIGGER
    for (let triggerQuery of triggerQueries) {
      // Loại bỏ ký tự "/" thừa nếu có ở đầu trigger (nếu cần)
      triggerQuery = triggerQuery.trim();
      if (triggerQuery.startsWith("/")) {
        triggerQuery = triggerQuery.substring(1).trim();
      }
      console.log("Trigger query:\n", triggerQuery);
      try {
        await connection.query(triggerQuery);
      } catch (err) {
        console.error(
          `❌ Lỗi khi chạy TRIGGER:\n${triggerQuery}\n⛔ Lỗi:`,
          err.message
        );
        return res.status(500).json({
          success: false,
          message: "Lỗi khi tạo TRIGGER!",
          error: err.message,
          query: triggerQuery,
        });
      }
    }

    console.log("🎉 Database đã được reset thành công!");
    res.json({
      success: true,
      message: "✅ Database đã được reset và nhập dữ liệu thành công!",
    });
  } catch (error) {
    console.error("❌ Lỗi reset database:", error.message || error);
    res
      .status(500)
      .json({
        success: false,
        message: "Reset database thất bại!",
        error: error.message,
      });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
}
};
const listBackupFiles = async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res
        .status(404)
        .json({ success: false, message: "Thư mục backup không tồn tại!" });
    }

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((file) => file.endsWith(".sql"));

    res.json({ success: true, files });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi khi lấy danh sách file!",
        error: err.message,
      });
  }
};
const addToDatabase = async (req, res) => {
    let connection;
  try {
    let filePath = "";

    // Trường hợp 1: Người dùng tải file lên
    if (req.file) {
      filePath = req.file.path;
      console.log("📂 File SQL được nhận từ upload:", filePath);
    }
    // Trường hợp 2: Người dùng chọn file từ danh sách backup
    else if (req.body.backupFileName) {
      filePath = path.join(BACKUP_DIR, req.body.backupFileName); // Đường dẫn đầy đủ
      console.log("📂 File SQL được chọn từ backup:", filePath);
    }
    // Nếu không có file nào, báo lỗi
    else {
      return res
        .status(400)
        .json({ success: false, message: "⚠️ Vui lòng chọn file SQL!" });
    }

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "❌ File không tồn tại!" });
    }

    // Đảm bảo DB_CONFIG có multipleStatements: true
    // const connection = await mysql.createConnection({ ...DB_CONFIG, multipleStatements: true });
    connection = await createConnectionWithMultipleStatements();
    // 📥 Đọc nội dung file SQL với encoding "utf8"
    let sqlContent = fs.readFileSync(filePath, { encoding: "utf8" });

    // 🔧 Loại bỏ các dòng chỉ chứa "/" (hoặc chỉ khoảng trắng và "/")
    sqlContent = sqlContent.replace(/^\s*\/\s*$/gm, "");

    // 🔍 Loại bỏ các dòng không cần thiết (comment, SET NAMES, SET @OLD_TIME_ZONE, SET SQL_MODE)
    sqlContent = sqlContent
      .split("\n")
      .filter(
        (line) =>
          !line.startsWith("/*!") &&
          !line.startsWith("--") &&
          !line.startsWith("SET NAMES") &&
          !line.startsWith("SET @OLD_TIME_ZONE") &&
          !line.startsWith("SET SQL_MODE")
      )
      .join("\n");

    // 🔧 Loại bỏ hoàn toàn các lệnh DELIMITER
    sqlContent = sqlContent.replace(/^DELIMITER.*$/gm, "");

    // ✅ Tách các block TRIGGER bằng regex cải tiến: Bắt block bắt đầu bằng "CREATE TRIGGER" và kết thúc bằng "END;" (có thể có khoảng trắng sau END;)
    const triggerRegex = /CREATE TRIGGER[\s\S]*?END\s*\/\//gi;
    const triggerMatches = sqlContent.match(triggerRegex) || [];
    let triggerQueries = triggerMatches.map((triggerQuery) =>
      triggerQuery.trim()
    );
    triggerQueries = triggerQueries.map((triggerQuery) => {
      return triggerQuery
        .replace(/END\s*\/\//g, "END;") // Chuyển END// thành END;
        .split("\n")
        .map((line) => {
          if (/^\s*DECLARE\s/i.test(line) && !/;\s*$/.test(line)) {
            return line.trimEnd() + ";";
          }
          return line;
        })
        .join("\n");
    });

    // Xóa các block trigger khỏi nội dung SQL để lấy phần "normal" còn lại
    let normalSqlContent = sqlContent;
    for (const trigger of triggerMatches) {
      normalSqlContent = normalSqlContent.replace(trigger, "");
    }
    let normalQueries = normalSqlContent
      .split(/;\s*\n/)
      .filter((q) => q.trim() !== "");

    // 🔄 Chạy các câu lệnh SQL bình thường
    for (let query of normalQueries) {
      try {
        // 📌 Nếu query là câu INSERT, kiểm tra và sửa dữ liệu kiểu ngày
        if (/INSERT INTO/i.test(query)) {
          query = query.replace(
            /(["'])([A-Za-z]{3} [A-Za-z]{3} \d{1,2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4} \([^)]+\))\1/g,
            (match, quote, dateStr) => {
              try {
                // Chuyển đổi chuỗi ngày thành ISO, sau đó lấy phần YYYY-MM-DD
                const parsedDate = new Date(dateStr)
                  .toISOString()
                  .split("T")[0];
                return `${quote}${parsedDate}${quote}`;
              } catch (err) {
                console.warn("⚠️ Không thể chuyển đổi ngày:", dateStr);
                return match; // Nếu lỗi, giữ nguyên giá trị cũ
              }
            }
          );
          // Escape dấu ngoặc kép bên trong các giá trị chuỗi, chuyển sang dấu nháy đơn (nếu cần)
          // query = query.replace(/(?<=\s)"(?!,)|(?<![,])"(?=[\s:.])/g, "'");
          // Thay thế tất cả các giá trị "null" (với dấu nháy) thành NULL không dấu
          query = query.replace(/(["'])null\1/gi, "NULL");
        }

        await connection.query(query);
      } catch (err) {
        console.error(`❌ Lỗi khi chạy query:\n${query}\n⛔ Lỗi:`, err.message);
        return res.status(500).json({
          success: false,
          message: "Lỗi trong quá trình nhập dữ liệu!",
          error: err.message,
          query: query, // Trả về query lỗi để debug
        });
      }
    }

    // 🔄 Chạy các câu lệnh TRIGGER
    for (let triggerQuery of triggerQueries) {
      // Loại bỏ ký tự "/" thừa nếu có ở đầu trigger (nếu cần)
      triggerQuery = triggerQuery.trim();
      if (triggerQuery.startsWith("/")) {
        triggerQuery = triggerQuery.substring(1).trim();
      }
      console.log("Trigger query:\n", triggerQuery);
      try {
        await connection.query(triggerQuery);
      } catch (err) {
        console.error(
          `❌ Lỗi khi chạy TRIGGER:\n${triggerQuery}\n⛔ Lỗi:`,
          err.message
        );
        return res.status(500).json({
          success: false,
          message: "Lỗi khi tạo TRIGGER!",
          error: err.message,
          query: triggerQuery,
        });
      }
    }

    console.log("🎉 Database đã được reset thành công!");
    res.json({
      success: true,
      message: "✅ Database đã được reset và nhập dữ liệu thành công!",
    });
  } catch (error) {
    console.error("❌ Lỗi reset database:", error.message || error);
    res
      .status(500)
      .json({
        success: false,
        message: "Reset database thất bại!",
        error: error.message,
      });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};
const executeSQLQuery = async (req, res) => {
    let connection;
  try {
    const { sqlQuery } = req.body;

    // Kiểm tra đầu vào
    if (!sqlQuery || sqlQuery.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "⚠️ Vui lòng nhập câu lệnh SQL!" });
    }

    // Chặn một số lệnh nguy hiểm
    const forbiddenKeywords = ["DROP DATABASE", "SHUTDOWN", "KILL"];
    if (
      forbiddenKeywords.some((keyword) =>
        sqlQuery.toUpperCase().includes(keyword)
      )
    ) {
      return res
        .status(403)
        .json({ success: false, message: "⛔ Lệnh SQL không được phép!" });
    }

    // Kết nối database
    connection = await createConnectionWithMultipleStatements();

    // Thực thi câu lệnh SQL
    const [results] = await connection.query(sqlQuery);


    res.json({ success: true, message: "✅ SQL đã chạy thành công!", results });
  } catch (error) {
    console.error("❌ Lỗi khi chạy SQL:", error.message || error);
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi khi thực thi SQL!",
        error: error.message,
      });
  }  finally {
    if (connection) connection.release(); // Giải phóng kết nối
}
};

module.exports = {
  backupAndDownload,
  resetDatabase,
  upload,
  listBackupFiles,
  addToDatabase,
  executeSQLQuery,
};