const XLSX = require("xlsx");
const fs = require("fs");
const connection = require("../controllers/connectDB");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();
const path = require("path");

const convertExcelToJSON = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    fs.unlinkSync(filePath); // Xóa file sau khi xử lý
    const data = worksheet;

    // Lấy tiêu đề từ đối tượng đầu tiên
    const header = data[0];

    // Lấy các khóa từ đối tượng tiêu đề
    const keys = Object.keys(header);

    // Lấy các đối tượng dữ liệu (bỏ qua tiêu đề)
    const dataObjects = data.slice(1);

    // Tạo danh sách các đối tượng JSON với các khóa từ tiêu đề và giá trị từ từng đối tượng dữ liệu
    const jsonObjects = dataObjects.map((values) => {
      return keys.reduce((acc, key) => {
        acc[header[key]] = values[key];
        return acc;
      }, {});
    });

    return jsonObjects;
  } catch (err) {
    throw new Error("Cannot read file!: " + err.message);
  }
};

// Nhập dữ liệu JSON vào cơ sở dữ liệu
// const importJSONToDB = async (jsonData) => {
//   const tableName = process.env.DB_TABLE_NAME;

//   const columnTT = 'TT';
//   const columnSoTinChi = 'SoTinChi';
//   const columnLopHocPhan = 'LopHocPhan';
//   const columnGiaoVien = 'GiaoVien';
//   const columnLL = 'LL';
//   const columnSoTietCTDT = 'SoTietCTDT';
//   const columnHeSoT7CN = 'HeSoT7CN';
//   const columnSoSinhVien = 'SoSinhVien';
//   const columnHeSoLopDong = 'HeSoLopDong';
//   const columnQuyChuan = 'QuyChuan';
//   const columnGhiChu = 'GhiChu';

//   const insertPromises = jsonData.map(item => {
//     const query = `INSERT INTO ${tableName}
//       (${columnTT}, ${columnSoTinChi}, ${columnLopHocPhan}, ${columnGiaoVien}, ${columnLL},
//        ${columnSoTietCTDT}, ${columnHeSoT7CN}, ${columnSoSinhVien}, ${columnHeSoLopDong}, ${columnQuyChuan}, ${columnGhiChu})
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//     return new Promise((resolve, reject) => {
//       const keys = Object.keys(item);
//       connection.query(query, [
//         item[keys[0]],
//         item[keys[1]],
//         item[keys[2]],
//         item[keys[3]],
//         item[keys[4]],
//         item[keys[5]],
//         item[keys[6]],
//         item[keys[7]],
//         item[keys[8]],
//         item[keys[9]],
//         item[keys[10]]
//       ], (err, results) => {
//         if (err) {
//           console.error('Error:', err);
//           reject(err);
//           return;
//         }
//         resolve(results);
//       });
//     });
//   });

//   let results = false;
//   try {
//     await Promise.all(insertPromises);
//     results = true;
//   } catch (error) {
//     console.error('Error:', error);
//   }

//   return results;
// };

// Nhập dữ liệu JSON vào cơ sở dữ liệu
const importJSONToDB = async (jsonData) => {
  const tableName = process.env.DB_TABLE_NAME;

  const columnTT = "TT";
  const columnSoTinChi = "SoTinChi";
  const columnLopHocPhan = "LopHocPhan";
  const columnGiaoVien = "GiaoVien";
  const columnLL = "LL";
  const columnSoTietCTDT = "SoTietCTDT";
  const columnHeSoT7CN = "HeSoT7CN";
  const columnSoSinhVien = "SoSinhVien";
  const columnHeSoLopDong = "HeSoLopDong";
  const columnQuyChuan = "QuyChuan";
  const columnGhiChu = "GhiChu";

  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  const insertPromises = jsonData.map((item) => {
    const query = `INSERT INTO ${tableName} 
      (${columnTT}, ${columnSoTinChi}, ${columnLopHocPhan}, ${columnGiaoVien}, ${columnLL}, 
       ${columnSoTietCTDT}, ${columnHeSoT7CN}, ${columnSoSinhVien}, ${columnHeSoLopDong}, ${columnQuyChuan}, ${columnGhiChu}) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    return new Promise((resolve, reject) => {
      const keys = Object.keys(item);
      connection.query(
        query,
        [
          item[keys[0]],
          item[keys[1]],
          item[keys[2]],
          item[keys[3]],
          item[keys[4]],
          item[keys[5]],
          item[keys[6]],
          item[keys[7]],
          item[keys[8]],
          item[keys[9]],
          item[keys[10]],
        ],
        (err, results) => {
          if (err) {
            console.error("Error:", err);
            reject(err);
            return;
          }
          resolve(results);
        }
      );
    });
  });

  let results = false;
  try {
    await Promise.all(insertPromises);
    results = true; // Chèn dữ liệu thành công
  } catch (error) {
    console.error("Error:", error);
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }

  return results;
};

// Controller xử lý upload file Excel và nhập dữ liệu vào DB
// const handleUpload = async (req, res) => {
//   const filePath = path.join(__dirname, "../uploads", req.file.filename);

//   // Chuyển đổi file Excel sang JSON
//   const jsonResult = convertExcelToJSON(filePath);

//   console.log(jsonResult);

//   // Nhập dữ liệu JSON vào cơ sở dữ liệu
//   const result = await importJSONToDB(jsonResult);

//   if (result) {
//     res.json({ success: true });
//     console.log(result);
//   } else {
//     console.log(result);
//     res.status(500).send("Failed to import data.");
//   }
// };

const handleUpload = async (req, res) => {
  const filePath = path.join(__dirname, "../uploads", req.file.filename);

  try {
    // Chuyển đổi file Excel sang JSON
    const jsonResult = convertExcelToJSON(filePath);
    console.log(jsonResult);

    // Nhập dữ liệu JSON vào cơ sở dữ liệu
    const result = await importJSONToDB(jsonResult);

    if (result) {
      res.json({ success: true });
      console.log("Data imported successfully.");
    } else {
      console.log("Data import failed.");
      res.status(500).send("Failed to import data.");
    }
  } catch (error) {
    console.error("Error in handleUpload:", error.message);
    res.status(500).send("Error processing the file: " + error.message);
  }
};

module.exports = { handleUpload, convertExcelToJSON, importJSONToDB };
