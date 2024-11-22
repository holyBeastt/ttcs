const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const parentDir = path.join(__dirname, "..");
const p = path.join(parentDir, "..");

// Tạo biến chung để lưu dữ liệu
let tableData;
async function extractFileData(req, res) {
  // Kiểm tra xem file đã được tải lên chưa
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "No file uploaded", status: "error" });
  }

  const filePath = path.join(p, "uploads", req.file.filename);

  try {
    // Kiểm tra định dạng file
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let content;

    if (fileExtension === ".pdf") {
      // Xử lý file PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      content = pdfData.text; // Nội dung PDF dạng text
    } else if (fileExtension === ".docx") {
      // Xử lý file Word (DOCX)
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value; // Nội dung Word dạng text
    } else {
      return res
        .status(400)
        .json({ message: "Unsupported file type", status: "error" });
    }

    // Xử lý văn bản để tách bảng dữ liệu
    tableData = processTextData(content);

    res.json({
      message: "File uploaded and processed successfully",
      content: tableData,
    });
  } catch (err) {
    console.error("Lỗi khi xử lý file:", err);
    res.status(500).json({ message: "Lỗi khi xử lý file!", error: err });
  } finally {
    // Xóa file tạm
    fs.unlinkSync(filePath);
  }
}

// Hàm xử lý dữ liệu từ văn bản
function processTextData(content) {
  console.log("content = ", content);
  const lines = content.split("\n");
  const tableData = [];
  let currentRow = {}; // Dòng hiện tại trong bảng
  let isTable = false;
  let isGV = false;
  let isSV = true;

  lines.forEach((line) => {
    line = line.trim(); // Xóa khoảng trắng thừa
    if (!line) return; // Bỏ qua dòng trống

    // Phát hiện tiêu đề bảng
    if (line.includes("TT") && line.includes("Mã SV")) {
      isTable = true;
      return; // Bỏ qua tiêu đề
    }

    if (isTable) {
      // Nếu dòng bắt đầu bằng số TT, đây là dòng mới
      const matchTT = line.match(/^\d+\s+/);
      if (matchTT) {
        // Lưu dòng trước đó (nếu có)
        if (Object.keys(currentRow).length > 0) {
          tableData.push(currentRow);
        }

        isGV = false; // Gán lại giá trị cho isGV
        isSV = false; // Gán lại giá trị cho sinh viên

        // Tách các phần của dòng hiện tại
        const parts = line.split(/\s+/);
        currentRow = {
          TT: parts[0],
          SinhVien: "",
          MaSV: "",
          TenDeTai: "",
          GiangVien: [],
        };

        // Gán tất cả vào SinhVien cho đến khi tìm thấy MaSV
        let maSVIndex = -1;
        for (let i = 1; i < parts.length; i++) {
          if (/^[A-Z]{2}\d+$/.test(parts[i])) {
            // Kiểm tra nếu có chữ và số (MaSV)
            currentRow.MaSV = parts[i];
            maSVIndex = i;
            break;
          } else {
            // Nếu không phải MaSV, gán cho SinhVien
            currentRow.SinhVien += (currentRow.SinhVien ? " " : "") + parts[i];
          }
        }

        // Gán TenDeTai nếu có phần sau MaSV
        if (maSVIndex > -1 && maSVIndex < parts.length - 1) {
          currentRow.TenDeTai = parts.slice(maSVIndex + 1).join(" "); // Phần sau MaSV là TenDeTai
        }

        // Cắt TenDeTai theo dấu chấm và lấy phần trước dấu chấm
        if (currentRow.TenDeTai.includes(".")) {
          currentRow.TenDeTai = currentRow.TenDeTai.split(".")[0].trim();
        }
      } else if (currentRow && !currentRow.MaSV) {
        // Nếu chưa có Mã SV, dòng này thuộc cột MaSV và Tên đề tài
        const parts = line.split(/\s+/);

        // Kiểm tra xem MaSV có đúng định dạng không, chỉ gán nếu hợp lệ
        if (/^[A-Z]{2}\d+$/.test(parts[0])) {
          currentRow.MaSV = parts[0];
          currentRow.TenDeTai = parts.slice(1).join(" ");

          // Cắt TenDeTai theo dấu chấm và lấy phần trước dấu chấm
          if (currentRow.TenDeTai.includes(".")) {
            currentRow.TenDeTai = currentRow.TenDeTai.split(".")[0].trim();
          }
        }
      } else if (
        line.startsWith("1.") ||
        line.startsWith("2.") ||
        line.startsWith("TS.")
      ) {
        // Nếu dòng bắt đầu bằng "1.", "2.", hoặc "TS.", đây là thông tin Giảng viên
        // Bỏ phần "1. TS", "2. TS", "TS"
        line = line.replace(
          /^\d+\.\s*(KS|ThS|TS|PGS\.\s*TS)\.\s*|^(KS|ThS|TS|PGS\.\s*TS)\.\s*/i,
          ""
        );
        currentRow.GiangVien.push(line);

        isGV = true;
      } else if (!isGV) {
        // Nếu không phải giảng viên, dòng này tiếp tục phần Tên đề tài
        currentRow.TenDeTai += " " + line;
      }
    }

    // Nếu dòng sau có tên sinh viên bị chia tách (và không phải dòng giảng viên)
    if (
      line &&
      !line.startsWith("1.") &&
      !line.startsWith("2.") &&
      !line.startsWith("TS.") &&
      currentRow.SinhVien &&
      !currentRow.MaSV &&
      isSV == true
    ) {
      currentRow.SinhVien += " " + line; // Nối thêm tên sinh viên nếu cần
    }
    isSV = true;
  });

  // Lưu dòng cuối cùng (nếu có)
  if (Object.keys(currentRow).length > 0) {
    tableData.push(currentRow);
  }
  console.log("table = ", tableData);

  return tableData;
}

const saveToDB = async (req, res) => {
  const namHoc = req.query.namHoc;
  console.log("nam hoc = ", namHoc);

  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB

    // Tạo mảng 2 chiều chứa tất cả các bản ghi
    const values = tableData.map((row) => {
      // Chuyển mảng GiangVien thành chuỗi
      const giangVien = row.GiangVien.join(", ");
      const giangVienMang = giangVien.split(","); // Tách thành mảng
      const giangVien1 = giangVienMang[0].trim(); // Lấy phần tử đầu tiên và loại bỏ khoảng trắng
      const giangVien2 = giangVienMang[1] ? giangVienMang[1].trim() : null; // Kiểm tra và gán null nếu không có phần tử thứ hai

      // Tạo Khóa
      const Khoa = row.MaSV.slice(0, 4);
      return [
        row.SinhVien,
        row.MaSV,
        Khoa,
        row.TenDeTai,
        giangVien1,
        giangVien2,
        namHoc,
      ]; // Thêm NamHoc vào mảng
    });

    // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
    const sql = `INSERT INTO doantotnghiep (SinhVien, MaSV, Khoa, TenDeTai, GiangVien1, GiangVien2, NamHoc)
                   VALUES ?`;

    // Thực thi câu lệnh SQL với mảng values
    const [result] = await connection.query(sql, [values]);

    // Gửi phản hồi thành công
    res.status(200).json({
      message: "Dữ liệu đã được lưu thành công vào cơ sở dữ liệu.",
      insertedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào database:", error);
    if (!res.headersSent) {
      res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
    }
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const getImportDoAn = (req, res) => {
  res.render("vuotGioImportDoAn.ejs", { tableData: [] });
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getImportDoAn,
  extractFileData,
  saveToDB,
};
