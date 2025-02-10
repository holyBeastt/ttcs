const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth"); // Sử dụng mammoth để đọc file Word

const parentDir = path.join(__dirname, "..");
const p = path.join(parentDir, "..");

// Tạo biến chung để lưu dữ liệu
let tableData;
let uniqueGV; // Danh sách giảng viên không bị trùng tên
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

    const duplicateName = await duplicateGiangVien(req, res);

    // Lấy mảng giảng viên bị trùng
    const duplicateGV = duplicateName.duplicateGV;

    // Lấy mảng giảng viên không trùng
    uniqueGV = duplicateName.uniqueGV;

    // Lấy mảng all giảng viên
    allGV = duplicateName.allGV;

    let content;

    if (fileExtension === ".pdf") {
      // Xử lý file PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      content = pdfData.text; // Nội dung PDF dạng text

      tableData = processPdfFile(content);
    } else if (fileExtension === ".docx") {
      // Xử lý file Word (DOCX)
      content = await processWordFile(filePath);
      tableData = processWordData(content);
    } else {
      return res
        .status(400)
        .json({ message: "Unsupported file type", status: "error" });
    }

    res.json({
      message: "File uploaded and processed successfully",
      content: tableData,
      duplicateGV: duplicateGV, // Danh sách các giảng viên bị trùng
      allGV: allGV, // Danh sách tất cả giảng viên
    });
  } catch (err) {
    console.error("Lỗi khi xử lý file:", err);
    res.status(500).json({ message: "Lỗi khi xử lý file!", error: err });
  } finally {
    // Xóa file tạm
    fs.unlinkSync(filePath);
  }
}

function processWordData(content) {
  const lines = content.split("\n");
  const tableData = []; // Mảng để lưu dữ liệu của tất cả các sinh viên
  let currentRow = {}; // Dòng hiện tại trong bảng
  let headerCount = 0; // Biến đếm số dòng tiêu đề
  let count = 0;
  let TenGiangVien = "";
  let isGV = false;

  const headerKeywords = [
    "TT",
    "Sinh viên",
    "Mã SV",
    "Tên đề tài",
    "Cán bộ Giảng viên hướng dẫn",
  ];
  lines.forEach((line) => {
    line = line.trim(); // Xóa khoảng trắng thừa
    if (!line) return; // Bỏ qua dòng trống

    // Bỏ qua các dòng tiêu đề (5 dòng chứa từ khóa tiêu đề)
    if (
      headerCount < 5 &&
      headerKeywords.some((keyword) => line.includes(keyword))
    ) {
      headerCount++;
      return; // Bỏ qua dòng tiêu đề
    }

    // Nếu đã qua 5 dòng tiêu đề, bắt đầu xử lý bảng
    if (headerCount >= 5) {
      // Nếu dòng bắt đầu bằng số TT, đây là dòng mới
      const matchTT = line.match(/^\d+$/); // Kiểm tra dòng chỉ có số
      if (matchTT) {
        // Lưu dòng trước đó (nếu có)
        if (Object.keys(currentRow).length > 0) {
          tableData.push(currentRow);
        }

        // Tách các phần của dòng hiện tại
        currentRow = {
          TT: line,
          SinhVien: "", // Tên sinh viên
          MaSV: "", // Mã sinh viên
          TenDeTai: "", // Tên đề tài
          GiangVien: [], // Danh sách Giảng viên
          GiangVienDefault: "",
        };
        count = 1;
        isGV = false;
        //
      } else if (count == 1) {
        currentRow.SinhVien = line;
        count++;
        // Kiểm tra xem MaSV có đúng định dạng không, chỉ gán nếu hợp lệ
      } else if (count == 2) {
        currentRow.MaSV = line;
        count++;
      } else if (count == 3) {
        currentRow.TenDeTai = line;
        count++;
      } else if (
        line.startsWith("1.") ||
        line.startsWith("2.") ||
        line.startsWith("TS.") ||
        line.startsWith("ThS")
      ) {
        currentRow.GiangVienDefault += line + "\n";

        line = line.replace(
          /^\d+\.\s*(KS|ThS|TS|PGS\.\s*TS)\.\s*|^(KS|ThS|TS|PGS\.\s*TS)\.\s*/i,
          ""
        );

        if (!currentRow.GiangVien) {
          currentRow.GiangVien = []; // Khởi tạo GiangVien nếu chưa có
        }

        isGV = true;

        TenGiangVien = line; // Nối chuỗi hiện tại vào TenGiangVien

        // Kiểm tra nếu chuỗi có dấu ','
        if (TenGiangVien.includes(",")) {
          const Ten = TenGiangVien.split(",")[0].trim(); // Lấy tên trước dấu ',' và xóa khoảng trắng

          currentRow.GiangVien.push(Ten); // Thêm tên đã xử lý vào danh sách
          TenGiangVien = ""; // Reset TenGiangVien để chuẩn bị xử lý dòng tiếp theo
        } else {
          currentRow.GiangVien.push(line.trim()); // Thêm trực tiếp nếu không có dấu ','
        }
      } else {
        currentRow.GiangVienDefault += line + "\n";
      }
    }
  });

  // Lưu dòng cuối cùng (nếu có)
  if (Object.keys(currentRow).length > 0) {
    tableData.push(currentRow);
  }

  // Lưu dữ liệu theo từng đối tượng riêng biệt (key)
  // const result = tableData.map((row) => {
  //   let [GiangVien1, GiangVien2] = row.GiangVien.join(", ")
  //     .split(",")
  //     .map((gv) => gv.trim());

  //   // So sánh tên giảng viên trong đồ án với tên trong csdl xem đã có chưa
  //   // Kiểm tra GiangVien1 có trong uniqueGV không
  //   const isGiangVien1InUniqueGV = uniqueGV.some(
  //     (giangVien) => giangVien.HoTen === GiangVien1
  //   );

  //   // Kiểm tra GiangVien2 có trong uniqueGV không
  //   let isGiangVien2InUniqueGV;
  //   if (GiangVien2 != undefined) {
  //     isGiangVien2InUniqueGV = uniqueGV.some(
  //       (giangVien) => giangVien.HoTen === GiangVien2
  //     );
  //   }

  //   if (!isGiangVien1InUniqueGV) {
  //     GiangVien1 = null;
  //   }

  //   if (!isGiangVien2InUniqueGV) {
  //     GiangVien2 = null;
  //   }

  //   return {
  //     TT: row.TT,
  //     SinhVien: row.SinhVien,
  //     MaSV: row.MaSV,
  //     TenDeTai: row.TenDeTai,
  //     GiangVien1: GiangVien1 || null, // Gán giá trị null nếu không có
  //     GiangVien2: GiangVien2 || null, // Gán giá trị null nếu không có
  //     GiangVien: row.GiangVien.join(", "), // Giảng viên là một chuỗi
  //   };
  // });

  const result = tableData.map((row) => {
    let [GiangVien1, GiangVien2] = row.GiangVien.join(", ")
      .split(",")
      .map((gv) => gv.trim()); // Loại bỏ khoảng trắng đầu cuối

    // So sánh tên giảng viên trong đồ án với tên trong csdl xem đã có chưa
    // Kiểm tra GiangVien1 có trong uniqueGV không
    const isGiangVien1InUniqueGV = uniqueGV.some(
      (giangVien) => giangVien.HoTen.trim() === GiangVien1
    );

    // Kiểm tra GiangVien2 có trong uniqueGV không
    let isGiangVien2InUniqueGV;
    if (GiangVien2 !== undefined) {
      isGiangVien2InUniqueGV = uniqueGV.some(
        (giangVien) => giangVien.HoTen.trim() === GiangVien2
      );
    }
    // Tạo 2 biến để lưu giá trị so sánh bên client
    let gv1Real = GiangVien1;
    let gv2Real = GiangVien2;
    if (!isGiangVien1InUniqueGV) {
      GiangVien1 = null;
    }

    if (!isGiangVien2InUniqueGV && GiangVien2 != undefined) {
      GiangVien2 = "";
    }

    if (GiangVien2 == undefined) {
      GiangVien2 = "không";
    }

    return {
      TT: row.TT,
      SinhVien: row.SinhVien.trim(),
      MaSV: row.MaSV.trim(),
      TenDeTai: row.TenDeTai.trim(),
      GiangVien1: GiangVien1 || null, // Gán giá trị null nếu không có
      GiangVien2: GiangVien2,
      GiangVien: row.GiangVien.join(", ").trim(), // Loại bỏ khoảng trắng đầu cuối trong chuỗi
      GiangVien1Real: gv1Real,
      GiangVien2Real: gv2Real,
      NgayBatDau: null,
      NgayKetThuc: null,
      GiangVienDefault: row.GiangVienDefault,
    };
  });

  return result;
}

// Tạo mảng riêng để truyền dữ liệu giảng viên bị trùng
const duplicateGiangVien = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy dữ liệu giảng viên mời
    let query = `SELECT HoTen, CCCD FROM gvmoi`;
    const [gvms] = await connection.query(query);

    // Lấy dữ liệu giảng viên cơ hữu
    query = `SELECT TenNhanVien, CCCD FROM nhanvien`;
    const [nvs] = await connection.query(query);

    // Gộp giảng viên mời và giảng viên cơ hữu vào 1 mảng để so sánh
    let arr = [];

    // Thêm giảng viên mời vào arr
    gvms.forEach((item) => {
      const normalizedName = item.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
      arr.push({
        HoTen: item.HoTen,
        CCCD: item.CCCD,
        BienChe: "Giảng viên mời", // Phân biệt loại
        HoTenReal: normalizedName,
      });
    });

    // Thêm nhân viên vào arr
    nvs.forEach((item) => {
      const normalizedName = item.TenNhanVien.replace(
        /\s*\(.*?\)\s*/g,
        ""
      ).trim();
      arr.push({
        HoTen: item.TenNhanVien,
        CCCD: item.CCCD,
        BienChe: "Cơ hữu", // Phân biệt loại
        HoTenReal: normalizedName,
      });
    });

    // Đếm số lần xuất hiện của mỗi tên chuẩn hóa
    const nameCount = {};

    arr.forEach((item) => {
      // Chuẩn hóa tên bằng cách loại bỏ nội dung trong ngoặc đơn
      const normalizedName = item.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      if (!nameCount[normalizedName]) {
        nameCount[normalizedName] = { count: 0, items: [] };
      }

      nameCount[normalizedName].count += 1;
      nameCount[normalizedName].items.push(item);
    });

    // Phân loại giảng viên thành trùng và không trùng
    const allGV = [];
    const duplicateGV = [];
    const uniqueGV = [];

    Object.values(nameCount).forEach((entry) => {
      allGV.push(...entry.items);
      if (entry.count > 1) {
        duplicateGV.push(...entry.items);
      } else {
        uniqueGV.push(...entry.items);
      }
    });

    // Trả về danh sách giảng viên trùng và không trùng
    return { duplicateGV, uniqueGV, allGV };
  } catch (error) {
    console.error("Error in duplicateGiangVien:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Xử lý file Word bằng Mammoth
async function processWordFile(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Chuyển file Word sang text
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value; // Nội dung văn bản
  } catch (error) {
    console.error("Lỗi khi đọc file Word:", error);
    throw new Error("Không thể xử lý file Word.");
  }
}

// Hàm xử lý dữ liệu từ văn bản
function processPdfFile(content) {
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
          GiangVienDefault: "",
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
        line.toLowerCase().startsWith("1.") ||
        line.toLowerCase().startsWith("2.") ||
        line.toLowerCase().startsWith("ks.") ||
        line.toLowerCase().startsWith("ths.") ||
        line.toLowerCase().startsWith("ts.") ||
        line.toLowerCase().startsWith("pgs.")
      ) {
        // Nếu dòng bắt đầu bằng "1.", "2.", hoặc "TS.", đây là thông tin Giảng viên
        // Bỏ phần "1. TS", "2. TS", "TS"
        currentRow.GiangVienDefault += line + "\n";

        line = line.replace(
          /^\d+\.\s*(KS|ThS|TS|PGS\.\s*TS)\.\s*|^(KS|ThS|TS|PGS\.\s*TS)\.\s*/i,
          ""
        );
        if (!currentRow.GiangVien) {
          currentRow.GiangVien = []; // Khởi tạo GiangVien nếu chưa có
        }

        TenGiangVien = line; // Nối chuỗi hiện tại vào TenGiangVien

        // Kiểm tra nếu chuỗi có dấu ','
        if (TenGiangVien.includes(",")) {
          const Ten = TenGiangVien.split(",")[0].trim(); // Lấy tên trước dấu ',' và xóa khoảng trắng

          currentRow.GiangVien.push(Ten); // Thêm tên đã xử lý vào danh sách
          TenGiangVien = ""; // Reset TenGiangVien để chuẩn bị xử lý dòng tiếp theo
        } else {
          currentRow.GiangVien.push(line.trim()); // Thêm trực tiếp nếu không có dấu ','
        }
        //currentRow.GiangVien.push(line);

        isGV = true;
      } else if (!isGV) {
        // Nếu không phải giảng viên, dòng này tiếp tục phần Tên đề tài
        currentRow.TenDeTai += " " + line;
      } else {
        currentRow.GiangVienDefault += line + "\n";
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

  const result = tableData.map((row) => {
    let [GiangVien1, GiangVien2] = row.GiangVien.join(", ")
      .split(",")
      .map((gv) => gv.trim()); // Loại bỏ khoảng trắng đầu cuối

    // So sánh tên giảng viên trong đồ án với tên trong csdl xem đã có chưa
    // Kiểm tra GiangVien1 có trong uniqueGV không
    const isGiangVien1InUniqueGV = uniqueGV.some(
      (giangVien) => giangVien.HoTen.trim() === GiangVien1
    );

    // Kiểm tra GiangVien2 có trong uniqueGV không
    let isGiangVien2InUniqueGV;
    if (GiangVien2 !== undefined) {
      isGiangVien2InUniqueGV = uniqueGV.some(
        (giangVien) => giangVien.HoTen.trim() === GiangVien2
      );
    }
    // Tạo 2 biến để lưu giá trị so sánh bên client
    let gv1Real = GiangVien1;
    let gv2Real = GiangVien2;
    if (!isGiangVien1InUniqueGV) {
      GiangVien1 = null;
    }

    if (!isGiangVien2InUniqueGV && GiangVien2 != undefined) {
      GiangVien2 = "";
    }

    if (GiangVien2 == undefined) {
      GiangVien2 = "không";
    }

    return {
      TT: row.TT,
      SinhVien: row.SinhVien.trim(),
      MaSV: row.MaSV.trim(),
      TenDeTai: row.TenDeTai.trim(),
      GiangVien1: GiangVien1 || null, // Gán giá trị null nếu không có
      GiangVien2: GiangVien2,
      GiangVien: row.GiangVien.join(", ").trim(), // Loại bỏ khoảng trắng đầu cuối trong chuỗi
      GiangVien1Real: gv1Real,
      GiangVien2Real: gv2Real,
      NgayBatDau: null,
      NgayKetThuc: null,
      GiangVienDefault: row.GiangVienDefault,
    };
  });

  return result;
}
// Lưu vào bảng doantotnghiep
// const saveToDB = async (req, res) => {
//   const namHoc = req.query.namHoc;
//   const MaPhongBan = req.query.MaPhongBan;
//   const data = req.body;

//   let connection;
//   try {
//     connection = await createPoolConnection(); // Kết nối đến DB

//     // Tạo mảng 2 chiều chứa tất cả các bản ghi
//     const values = data.map((row) => {
//       // Tạo Khóa
//       const Khoa = row.MaSV.slice(0, 4);
//       return [
//         row.SinhVien,
//         row.MaSV,
//         Khoa,
//         row.TenDeTai,
//         row.giangVien1,
//         row.giangVien2,
//         namHoc,
//         row.NgayBatDau,
//         row.NgayKetThuc,
//         MaPhongBan,
//       ]; // Thêm NamHoc vào mảng
//     });

//     // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
//     const sql = `INSERT INTO doantotnghiep (SinhVien, MaSV, Khoa, TenDeTai, GiangVien1, GiangVien2, NamHoc, NgayBatDau, NgayKetThuc, MaPhongBan)
//                    VALUES ?`;

//     // Thực thi câu lệnh SQL với mảng values
//     const [result] = await connection.query(sql, [values]);

//     // Gửi phản hồi thành công
//     res.status(200).json({
//       message: "Dữ liệu đã được lưu thành công vào cơ sở dữ liệu.",
//       insertedRows: result.affectedRows,
//     });
//   } catch (error) {
//     console.error("Lỗi khi lưu dữ liệu vào database:", error);
//     if (!res.headersSent) {
//       res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
//     }
//   } finally {
//     if (connection) connection.release(); // Giải phóng kết nối
//   }
// };

// const saveToDB = async (req, res) => {
//   const NamHoc = req.query.namHoc;
//   const MaPhongBan = req.query.MaPhongBan;
//   const data = req.body;

//   let connection;
//   try {
//     connection = await createPoolConnection(); // Kết nối đến DB
//     const errors = []; // Tích lũy lỗi

//     // Tạo mảng 2 chiều chứa tất cả các bản ghi
//     const values = data.map((row) => {
//       // Tạo một mảng tạm cho từng bản ghi
//       const rowValues = [];

//       let SoQD = "không";
//       // Lưu lần 1

//       // Giá trị Khóa đào tạo
//       const KhoaDaoTao = row.MaSV.slice(0, 4);

//       // Giá trị Số người
//       let SoNguoi = 2;
//       if (row.GiangVien1.trim() == "" || row.GiangVien1 == undefined) {
//         errors.push(
//           `Không tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
//         );
//         return;
//       }
//       if (
//         row.GiangVien2 == "null" ||
//         row.GiangVien2 == null ||
//         row.GiangVien2 == "" ||
//         row.GiangVien2 == undefined
//       ) {
//         SoNguoi = 1;
//       }
//       // Giá trị is hướng dẫn chính
//       let isHDChinh = 1;

//       // Giá trị Giảng viên
//       let GiangVien;

//       // Giá trị CCCD và is mời giảng
//       let CCCD, isMoiGiang;
//       if (row.GiangVien1.includes("-")) {
//         GiangVien = row.GiangVien1.split(" - ")[0];
//         CCCD = row.GiangVien1.split(" - ")[2];

//         if (row.GiangVien1.split(" - ")[1].toLowerCase == "cơ hữu") {
//           isMoiGiang = 0;
//         } else {
//           isMoiGiang = 1;
//         }
//       } else {
//         const matchedItem = uniqueGV.find(
//           (item) => item.HoTen.trim() == row.GiangVien1.trim()
//         );

//         if (!matchedItem) {
//           // Trả về phản hồi nếu không tìm thấy giảng viên
//           errors.push(
//             `Không tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
//           );
//           return;
//         }

//         CCCD = matchedItem.CCCD;
//         if (matchedItem.BienChe.toLowerCase == "cơ hữu") isMoiGiang = 0;
//         else isMoiGiang = 1;
//       }

//       // Giá trị Số tiêt
//       let SoTiet = 25;

//       if (SoNguoi == 2) SoTiet = 15;

//       // Push các giá trị vào mảng tạm
//       rowValues.push(
//         row.SinhVien,
//         row.MaSV,
//         KhoaDaoTao,
//         SoQD,
//         row.TenDeTai,
//         SoNguoi,
//         isHDChinh,
//         GiangVien,
//         CCCD,
//         isMoiGiang,
//         SoTiet,
//         row.NgayBatDau,
//         row.NgayKetThuc,
//         MaPhongBan,
//         NamHoc
//       );

//       // Nếu số người là 2, lưu giảng viên 2
//       if (SoNguoi == 1) return rowValues; // Nếu số người là 1 thì trả về luôn

//       // Đặt lại các giá trị thay đổi
//       // Giá trị is hướng dẫn chính
//       isHDChinh = 0;

//       // Giá trị CCCD và is mời giảng
//       if (row.GiangVien2.includes("-")) {
//         GiangVien = row.GiangVien2.split(" - ")[0];
//         CCCD = row.GiangVien2.split(" - ")[2];

//         if (row.GiangVien1.split(" - ")[1].toLowerCase == "cơ hữu") {
//           isMoiGiang = 0;
//         } else {
//           isMoiGiang = 1;
//         }
//       } else {
//         const matchedItem = uniqueGV.find(
//           (item) => item.HoTen.trim() == row.GiangVien2.trim()
//         );

//         if (!matchedItem) {
//           // Trả về phản hồi nếu không tìm thấy giảng viên
//           errors.push(
//             `Không tìm thấy giảng viên 2: ${row.GiangVien2} của sinh viên ${row.SinhVien}`
//           );
//           return;
//         }

//         CCCD = matchedItem.CCCD;
//         if (matchedItem.BienChe.toLowerCase == "cơ hữu") isMoiGiang = 0;
//         else isMoiGiang = 1;
//       }

//       // Giá trị Số tiêt
//       SoTiet = 10;

//       rowValues.push(
//         row.SinhVien,
//         row.MaSV,
//         KhoaDaoTao,
//         SoQD,
//         row.TenDeTai,
//         SoNguoi,
//         isHDChinh,
//         GiangVien,
//         CCCD,
//         isMoiGiang,
//         SoTiet,
//         row.NgayBatDau,
//         row.NgayKetThuc,
//         MaPhongBan,
//         NamHoc
//       );

//       // Trả về mảng tạm này
//       return rowValues;
//     });

//     // Nếu có lỗi, trả về thông báo lỗi
//     if (errors.length > 0) {
//       return res.status(400).json({ message: "Có lỗi xảy ra", errors });
//     }

//     // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
//     const sql = `INSERT INTO exportdoantotnghiep (SinhVien, MaSV, KhoaDaoTao, SoQD, TenDeTai, SoNguoi, isHDChinh, GiangVien, CCCD, isMoiGiang, SoTiet, NgayBatDau, NgayKetThuc, MaPhongBan, NamHoc)
//                    VALUES ?`;

//     // Thực thi câu lệnh SQL với mảng values
//     const [result] = await connection.query(sql, [values]);

//     // Gửi phản hồi thành công
//     res.status(200).json({
//       message: "Dữ liệu đã được lưu thành công vào cơ sở dữ liệu.",
//       insertedRows: result.affectedRows,
//     });
//   } catch (error) {
//     console.error("Lỗi khi lưu dữ liệu vào database:", error);
//     if (!res.headersSent) {
//       res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
//     }
//   } finally {
//     if (connection) connection.release(); // Giải phóng kết nối
//   }
// };
const saveToDB = async (req, res) => {
  const NamHoc = req.query.namHoc;
  const MaPhongBan = req.query.MaPhongBan;
  const data = req.body;

  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB
    const errors = []; // Tích lũy lỗi

    // Tạo mảng 2 chiều chứa tất cả các bản ghi
    const values = [];

    data.forEach((row) => {
      let SoQD = "không";
      const KhoaDaoTao = row.MaSV.slice(0, 4);
      let SoNguoi = 2; // Mặc định là 2 giảng viên

      if (
        row.GiangVien2 == "null" ||
        row.GiangVien2 == undefined ||
        row.GiangVien2 == "không"
      ) {
        SoNguoi = 1;
      }

      if (row.GiangVien1.trim() == "" || row.GiangVien1 == undefined) {
        errors.push(
          `\nKhông tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
        );
        return;
      }

      let isHDChinh = 1;
      let GiangVien, CCCD, isMoiGiang;

      // Xử lý giảng viên 1
      if (row.GiangVien1.includes("-")) {
        GiangVien = row.GiangVien1.split(" - ")[0];
        CCCD = row.GiangVien1.split(" - ")[2];
        isMoiGiang =
          row.GiangVien1.split(" - ")[1].toLowerCase() == "cơ hữu" ? 0 : 1;
      } else {
        const matchedItem = uniqueGV.find(
          (item) => item.HoTen.trim() == row.GiangVien1.trim()
        );
        if (!matchedItem) {
          errors.push(
            `\nKhông tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
          );
          return;
        }
        GiangVien = matchedItem.HoTen.trim();
        CCCD = matchedItem.CCCD;
        isMoiGiang = matchedItem.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
      }

      let SoTiet = 25;

      if (SoNguoi == 2) {
        SoTiet = 15;
      }

      values.push([
        row.SinhVien,
        row.MaSV,
        KhoaDaoTao,
        SoQD,
        row.TenDeTai,
        SoNguoi,
        isHDChinh,
        GiangVien,
        CCCD,
        isMoiGiang,
        SoTiet,
        row.NgayBatDau,
        row.NgayKetThuc,
        MaPhongBan,
        NamHoc,
      ]);

      // Nếu có giảng viên thứ 2, xử lý giảng viên 2 và thêm bản ghi thứ hai
      if (SoNguoi == 2) {
        let isHDChinh = 0; // Hướng dẫn phụ
        let GiangVien, CCCD, isMoiGiang;

        if (row.GiangVien2.includes("-")) {
          GiangVien = row.GiangVien2.split(" - ")[0];
          CCCD = row.GiangVien2.split(" - ")[2];
          isMoiGiang =
            row.GiangVien2.split(" - ")[1].toLowerCase() == "cơ hữu" ? 0 : 1;
        } else {
          const matchedItem = uniqueGV.find(
            (item) => item.HoTen.trim() == row.GiangVien2.trim()
          );
          if (!matchedItem) {
            errors.push(
              `\nKhông tìm thấy giảng viên 2: ${row.GiangVien2} của sinh viên ${row.SinhVien}`
            );
            return;
          }
          GiangVien = matchedItem.HoTen.trim();
          CCCD = matchedItem.CCCD;
          isMoiGiang = matchedItem.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
        }

        SoTiet = 10; // Giảm số tiết cho giảng viên thứ 2
        values.push([
          row.SinhVien,
          row.MaSV,
          KhoaDaoTao,
          SoQD,
          row.TenDeTai,
          SoNguoi,
          isHDChinh,
          GiangVien,
          CCCD,
          isMoiGiang,
          SoTiet,
          row.NgayBatDau,
          row.NgayKetThuc,
          MaPhongBan,
          NamHoc,
        ]);
      }
    });

    // Nếu có lỗi, trả về thông báo lỗi
    if (errors.length > 0) {
      return res.status(400).json({ message: "Có lỗi xảy ra", errors });
    }

    // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
    const sql = `INSERT INTO exportdoantotnghiep (SinhVien, MaSV, KhoaDaoTao, SoQD, TenDeTai, SoNguoi, isHDChinh, GiangVien, CCCD, isMoiGiang, SoTiet, NgayBatDau, NgayKetThuc, MaPhongBan, NamHoc)
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

// Lưu vào bảng doantotnghiep
const saveToTableDoantotnghiep = async (req, res) => {
  const namHoc = req.query.namHoc;
  const MaPhongBan = req.query.MaPhongBan;
  const Dot = req.query.Dot;
  const data = req.body;

  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB

    // Tạo mảng 2 chiều chứa tất cả các bản ghi
    const values = data.map((row) => {
      // Tạo Khóa đào tạo
      const KhoaDaoTao = row.MaSV.slice(0, 4);

      const KhoaDuyet = 0,
        DaoTaoDuyet = 0,
        TaiChinhDuyet = 0,
        DaLuu = 0,
        DaBanHanh = 0;

      return [
        row.TT,
        row.SinhVien,
        row.MaSV,
        KhoaDaoTao,
        row.TenDeTai,
        row.GiangVienDefault,
        row.GiangVien1,
        row.GiangVien2,
        namHoc,
        row.NgayBatDau,
        row.NgayKetThuc,
        MaPhongBan,
        row.SoQD,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        DaLuu,
        row.GiangVien1Real,
        row.GiangVien2Real,
        DaBanHanh,
        Dot,
      ]; // Thêm NamHoc vào mảng
    });

    // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
    const sql = `INSERT INTO doantotnghiep (TT, SinhVien, MaSV, KhoaDaoTao, TenDeTai, GiangVienDefault, 
    GiangVien1, GiangVien2, NamHoc, NgayBatDau, NgayKetThuc, MaPhongBan, SoQD, KhoaDuyet, DaoTaoDuyet, 
    TaiChinhDuyet, Daluu, GiangVien1Real, GiangVien2Real, DaBanHanh, Dot)
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
  res.render("vuotGioImportDoAn.ejs");
};

const checkExistDataFile = async (req, res) => {
  console.log("Thực hiện kiểm tra dữ liệu trong bảng Tam");
  const { Khoa, Dot, Nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT EXISTS(SELECT 1 FROM doantotnghiep WHERE MaPhongBan = ? AND Dot = ? AND NamHoc = ?) AS exist;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [Khoa, Dot, Nam]);

    // Kết quả trả về từ cơ sở dữ liệu
    const exist = results[0].exist === 1; // True nếu tồn tại, False nếu không tồn tại

    console.log("trùng ", exist);
    if (exist) {
      return res.status(200).json({
        message: "Dữ liệu đã tồn tại trong cơ sở dữ liệu",
        exists: true,
      });
    } else {
      return res.status(200).json({
        message: "Dữ liệu không tồn tại trong cơ sở dữ liệu",
        exists: false,
      });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const deleteDataDoAnExist = async (req, res) => {
  const tableName = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  const { Khoa, Dot, Nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Query SQL để xóa row
    const sql = `DELETE FROM doantotnghiep WHERE MaPhongBan = ? AND Dot = ? AND NamHoc = ?`;

    // Thực hiện truy vấn
    const [results] = await connection.query(sql, [Khoa, Dot, Nam]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    }

    console.log(
      "Xóa dữ liệu bảng Tam ( trường hợp khi tại dữ liệu cũ ) thành công"
    );
    return res.status(200).json({ message: "Xóa thành công" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi truy vấn", error: err });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getImportDoAn,
  extractFileData,
  saveToDB,
  saveToTableDoantotnghiep,
  checkExistDataFile,
  deleteDataDoAnExist,
};
