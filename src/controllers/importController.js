const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const connection = require("../controllers/connectDB");
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const { json, query } = require("express");
const gvms = require("../services/gvmServices");
const nhanviens = require("../services/nhanvienServices");
const { isNull } = require("util");
const mammoth = require("mammoth");
const JSZip = require("jszip");
const pdf = require("pdf-parse");
const { parseStringPromise, Builder } = require("xml2js");

// convert file quy chuẩn excel
const convertExcelToJSON = async (filePath) => {
  try {
    // console.log("Chuẩn bị convert dữ liệu quy chuẩn");
    // Đọc tệp Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Lấy tên của bảng tính đầu tiên
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); // Chuyển bảng tính thành JSON

    fs.unlinkSync(filePath); // Xóa tệp sau khi xử lý

    const data = worksheet;

    // Lấy tiêu đề từ đối tượng đầu tiên (dòng đầu tiên)
    const header = data[0];
    const keys = Object.keys(header);
    const dataObjects = data.slice(1); // Tách phần dữ liệu (bỏ qua dòng tiêu đề)

    // Tạo danh sách các đối tượng JSON với các khóa từ tiêu đề
    const jsonObjects = dataObjects.map((values) => {
      return keys.reduce((acc, key) => {
        // Nếu không có giá trị cho key, gán giá trị là 0
        acc[header[key]] = values[key] !== undefined ? values[key] : 0;
        return acc;
      }, {});
    });

    // console.log("Chuẩn bị validate dữ liệu quy chuẩn");
    validateFileExcelQC(jsonObjects);
    console.log("Convert file quy chuẩn thành công");
    return jsonObjects;
  } catch (err) {
    // Xử lý lỗi nếu có
    throw new Error("Cannot read file!: " + err.message);
  }
};

// Hàm chuyển dữ liệu thiếu thành 0 khi import bằng file excel
const validateFileExcelQC = (data) => {
  // Kiểm tra nếu dữ liệu trống
  if (!data || data.length === 0) {
    throw new Error("Dữ liệu đầu vào không hợp lệ: Dữ liệu trống");
  }

  // Duyệt qua từng đối tượng trong dữ liệu
  for (let i = 0; i < data.length; i++) {
    const record = data[i];

    // Duyệt qua từng key trong đối tượng
    Object.keys(record).forEach((key) => {
      // Trim giá trị và kiểm tra nếu nó là chuỗi rỗng hoặc undefined, null
      if (
        record[key] === null ||
        record[key] === undefined ||
        String(record[key]).trim() === ""
      ) {
        record[key] = 0; // Gán giá trị là 0 nếu không hợp lệ
      } else {
        // Nếu không rỗng, trim giá trị (nếu cần)
        record[key] = String(record[key]).trim();
      }
    });
  }

  // console.log("Dữ liệu đã được validate và chỉnh sửa");
  return data;
};

// convert file word quy chuẩn bằng thư viện xml2js
// const convertWordToJSON = async (filePath) => {
//   try {
//     // Đọc file Word (.docx)
//     const fileBuffer = await fs.promises.readFile(filePath); // Sử dụng fs.promises để xử lý bất đồng bộ

//     await fs.promises.unlink(filePath); // Xóa tệp sau khi xử lý

//     // Giải nén file .docx
//     const zip = await JSZip.loadAsync(fileBuffer);

//     // Lấy file XML chứa nội dung tài liệu
//     const documentXml = await zip.file("word/document.xml").async("string");

//     // Parse XML để lấy nội dung
//     const parsedXml = await parseStringPromise(documentXml);

//     // Truy cập nội dung bảng trong file Word
//     const tables = parsedXml["w:document"]["w:body"][0]["w:tbl"] || [];

//     // Mảng chứa tất cả các dữ liệu từ các bảng
//     const allTablesData = [];

//     // Biến để lưu tên Khoa hiện tại
//     let currentKhoa = "";

//     // Xử lý từng bảng
//     for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
//       const table = tables[tableIndex];
//       if (tableIndex === 0) {
//         continue; // Bỏ qua bảng đầu tiên
//       }

//       const rows = table["w:tr"] || [];

//       // Lấy dữ liệu từ hàng đầu tiên làm key cho đối tượng
//       const headers =
//         rows[0]["w:tc"]?.map((cell) => {
//           const cellText = (cell["w:p"] || [])
//             .map((p) =>
//               (p["w:r"] || [])
//                 .map((r) => r["w:t"])
//                 .flat()
//                 .join("")
//             )
//             .join(" ");
//           return cellText.trim();
//         }) || [];

//       // Mảng để chứa đối tượng của bảng này
//       const tableData = [];

//       // Xử lý các hàng tiếp theo để chuyển thành các đối tượng
//       for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
//         const row = rows[rowIndex];
//         const cells = row["w:tc"] || [];

//         // Lấy dữ liệu văn bản của từng ô trong hàng này
//         const rowData = cells.map((cell) => {
//           const cellText = (cell["w:p"] || [])
//             .map((p) =>
//               (p["w:r"] || [])
//                 .map((r) => r["w:t"])
//                 .flat()
//                 .join("")
//             )
//             .join(" ");
//           return cellText.trim();
//         });

//         // Nếu chỉ có 1 ô, đây là dòng kiểm tra
//         if (rowData.length === 1) {
//           const rowText = rowData[0]; // Lấy văn bản của ô duy nhất

//           // Kiểm tra từ khóa trong dòng kiểm tra (ví dụ từ "Khoa")
//           if (rowText.includes("học phần khác")) {
//             currentKhoa = "Khác"; // Nếu chứa "học phần khác", gán Khoa là "Khác"
//           } else if (rowText.includes("Trung tâm thực hành")) {
//             currentKhoa = "Trung tâm thực hành"; // Nếu chứa "Trung tâm thực hành", gán Khoa là "Trung tâm thực hành"
//           } else if (rowText.includes("Khoa")) {
//             const khoaMatch = rowText.match(/Khoa\s+(.+)$/);
//             if (khoaMatch) {
//               currentKhoa = khoaMatch[1].trim(); // Lấy tên Khoa từ dòng kiểm tra
//             }
//           }
//           continue; // Bỏ qua dòng này, không tạo đối tượng
//         }

//         // Chuyển hàng thành đối tượng với key là header và value là dữ liệu của hàng đó
//         const rowObject = headers.reduce((acc, header, idx) => {
//           acc[header] = rowData[idx] || "";
//           return acc;
//         }, {});

//         // Thêm key "Khoa" vào đối tượng
//         rowObject["Khoa"] = currentKhoa; // Chỉ áp dụng Khoa hiện tại

//         tableData.push(rowObject);
//       }

//       // Gộp bảng vào mảng chính (phẳng hóa ngay khi thêm)
//       allTablesData.push(...tableData);
//     }

//
//     // In ra mảng dữ liệu của tất cả các bảng
//     validateDataFileQC(data);
//     // fs.unlinkSync(filePath); // Xóa tệp sau khi xử lý

//     return allTablesData;
//   } catch (error) {
//     console.error("Lỗi khi đọc file:", error.message);
//     throw error; // Ném lỗi để có thể xử lý bên ngoài
//   }
// };

// hàm bỏ các lớp bị thiếu dữ liệu trong file word và pdf
function filterInvalidRows(data) {
  const requiredKeys = [
    "TT",
    "Số TC",
    "Lớp học phần",
    "Giáo viên",
    "Số tiết theo CTĐT",
    "Số SV",
    "Số tiết lên lớp theo TKB",
    "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
    "Hệ số lớp đông",
    "QC",
  ];

  return data
    .filter((row) => {
      // Kiểm tra xem đối tượng có đủ các khóa và các khóa này không rỗng
      const hasRequiredKeys = requiredKeys.every(
        (key) => row.hasOwnProperty(key) && row[key] !== ""
      );
      if (!hasRequiredKeys) {
        return false; // Loại bỏ nếu thiếu bất kỳ khóa nào hoặc khóa đó rỗng
      }

      // Kiểm tra giá trị của QC có thể parse sang số thực hay không
      const qcValue = parseFloat(row["QC"]);
      if (isNaN(qcValue)) {
        return false; // Loại bỏ nếu QC không phải số thực
      }

      return true;
    })
    .map((row) => {
      // Loại bỏ key "Ghi chú" nếu tồn tại
      const { "Ghi chú": _, ...rest } = row;
      return rest;
    });
}

// convert file quy chuẩn dạng word bằng thư viện mamoth
const convertWordToJSON = async (filePath) => {
  const data = [];

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Trích xuất văn bản thô từ file docx
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = result.value;
    const lines = text.split("\n"); // Tách từng dòng

    let currentRow = {}; // Dùng để lưu thông tin cho từng dòng
    let currentKhoa = ""; // Biến lưu trữ tên Khoa

    // Biến để theo dõi số trường đã gán
    let count = 0;

    let isFirstLine = true; // Biến để xác định dòng đầu bảng
    let missingParenthesis = false; // Biến cục bộ đánh dấu thiếu ngoặc

    // Danh sách các chuỗi cần kiểm tra để bỏ qua dòng
    const ignoredStrings = [
      "TT",
      "Số TC",
      "Lớp học phần",
      "Giáo Viên",
      "Số tiết theo CTĐT",
      "Số SV",
      "Số tiết lên lớp theo TKB",
      "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
      "Hệ số lớp đông",
      "QC",
      "Ghi chú",
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Bỏ qua các dòng rỗng
      if (line === "") {
        continue;
      }

      // Bỏ qua dòng đầu bảng chứa key hoặc dòng chứa "TT" ở đầu
      if (
        line ===
          "TT\tSố TC\tLớp học phần\tGiáo Viên\tSố tiết theo CTĐT\tSố SV\tSố tiết lên lớp theo TKB\tHệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ\tHệ số lớp đông\tQC\tGhi chú" ||
        line.startsWith("TT")
      ) {
        continue; // Bỏ qua và chuyển sang dòng tiếp theo
      }

      // Kiểm tra xem dòng hiện tại có chứa bất kỳ chuỗi nào trong danh sách ignoredStrings
      if (ignoredStrings.some((str) => line.includes(str))) {
        continue; // Bỏ qua và chuyển sang dòng tiếp theo
      }

      // Kiểm tra nếu dòng bắt đầu với số kèm dấu chấm (ví dụ: "84.")
      if (/^\d+\.$/.test(line)) {
        // Nếu đã có dữ liệu trong currentRow, thêm vào data trước khi bắt đầu dòng mới
        if (Object.keys(currentRow).length > 0) {
          currentRow["Khoa"] = currentKhoa; // Gán giá trị Khoa vào dòng hiện tại
          data.push(currentRow); // Thêm dòng vào mảng
        }

        // Bắt đầu một dòng mới
        currentRow = {
          TT: line.replace(".", ""), // Lấy số trước dấu chấm làm TT
        };
        count = 1; // Bắt đầu đếm các trường tiếp theo
      } else if (count === 1) {
        currentRow["Số TC"] = line || ""; // Gán "Số TC" hoặc để trống nếu không có dữ liệu
        count++;
      } else if (count === 2) {
        currentRow["Lớp học phần"] = line; // Gán dòng hiện tại vào "Lớp học phần"
        count++; // Chuyển sang xử lý tiếp theo
      } else if (count === 3) {
        currentRow["Giáo viên"] = line; // Gán dòng hiện tại vào "Giáo viên"
        count++; // Chuyển sang xử lý tiếp theo
      } else if (count === 4) {
        currentRow["Số tiết theo CTĐT"] = line; // Gán "Số tiết theo CTĐT"
        count++; // Chuyển sang xử lý tiếp theo
      } else if (count === 5) {
        currentRow["Số SV"] = line || ""; // Gán "Số SV" hoặc để trống nếu không có dữ liệu
        count++;
      } else if (count === 6) {
        currentRow["Số tiết lên lớp theo TKB"] = line || ""; // Gán "Số tiết lên lớp theo TKB"
        count++;
      } else if (count === 7) {
        currentRow["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] = line || ""; // Gán "Hệ số lên lớp ngoài giờ" hoặc để trống nếu không có dữ liệu
        count++;
      } else if (count === 8) {
        currentRow["Hệ số lớp đông"] = line || ""; // Gán "Hệ số lớp đông" hoặc để trống nếu không có dữ liệu
        count++;
      } else if (count === 9) {
        currentRow["QC"] = line || ""; // Thêm key "QC"
        count = 0; // Reset đếm sau khi gán đủ 9 trường
        currentRow["Khoa"] = currentKhoa; // Đảm bảo "Khoa" được gán vào dòng cuối
        data.push(currentRow); // Thêm dòng vào mảng dữ liệu
        currentRow = {}; // Reset cho dòng tiếp theo
      }

      // Kiểm tra tên khoa trong các dòng
      if (line.includes("học phần khác")) {
        currentKhoa = "Khác"; // Nếu chứa "học phần khác", gán Khoa là "Khác"
        continue; // Bỏ qua dòng này, không tạo đối tượng
      } else if (line.includes("Trung tâm thực hành")) {
        currentKhoa = "Trung tâm thực hành"; // Nếu chứa "Trung tâm thực hành", gán Khoa là "Trung tâm thực hành"
        continue; // Bỏ qua dòng này, không tạo đối tượng
      } else if (line.includes("Các học phần thuộc")) {
        const khoaMatch = line.match(/Khoa\s+(.+)$/);
        if (khoaMatch) {
          currentKhoa = khoaMatch[1].trim(); // Lấy tên Khoa từ dòng kiểm tra
        }
        continue; // Bỏ qua dòng này, không tạo đối tượng
      }
    }
    // console.log(data)

    // Xóa file sau khi xử lý
    fs.unlinkSync(filePath);

    // Trả về mảng dữ liệu đã xử lý
    const data2 = filterInvalidRows(data);
    console.log(data2);

    return data2;
  } catch (error) {
    console.error("Lỗi khi đọc file:", error);
    throw error; // Ném lỗi để biết có vấn đề trong quá trình xử lý
  }
};

// convert file quy chuẩn dạng pdf bằng thư viện pdf-parse
const convertPDFToJSON = async (filePath) => {
  const result = [];

  try {
    // Đọc tệp PDF vào bộ đệm
    const dataBuffer = fs.readFileSync(filePath);

    // Sử dụng pdf-parse để trích xuất văn bản từ tệp PDF
    const data = await pdf(dataBuffer);

    // Lấy văn bản thô từ tệp PDF
    let extractedText = data.text;

    // Loại bỏ các dấu xuống dòng và các khoảng trắng thừa
    extractedText = extractedText.replace(/\r?\n|\r/g, " ").trim();

    // Tách thành từng dòng dựa trên số TT (số kèm dấu chấm và khoảng trắng sau đó)
    const lines = extractedText.split(/(?=\b\d+\.\s)/);

    // Duyệt qua từng dòng
    lines.forEach((line) => {
      line = line.trim();

      // Kiểm tra nếu dòng bắt đầu bằng số TT (số và dấu chấm, khoảng trắng)
      if (/^\d+\.\s/.test(line)) {
        let currentItem = {};

        // Bắt đầu xử lý dòng để gắn dữ liệu vào từng key
        const ttMatch = line.match(/^\d+\./); // Tìm TT
        if (ttMatch) {
          currentItem["TT"] = ttMatch[0].replace(".", "").trim();
          line = line.replace(/^\d+\.\s/, ""); // Loại bỏ TT khỏi dòng
        }

        // Gắn số TC (phần tử số nguyên đầu tiên)
        const tcMatch = line.match(/^\d+/);
        if (tcMatch) {
          currentItem["Số TC"] = tcMatch[0];
          line = line.replace(/^\d+\s/, ""); // Loại bỏ Số TC khỏi dòng
        }

        // Gắn Lớp học phần (từ Số TC đến đóng ngoặc đơn)
        const classMatch = line.match(/^.*?\([^()]*\)/);
        if (classMatch) {
          currentItem["Lớp học phần"] = classMatch[0];
          line = line.replace(/^.*?\([^()]*\)\s*/, ""); // Loại bỏ Lớp học phần khỏi dòng
        }

        // Gắn Giáo viên (từ sau Lớp học phần đến khi gặp số đầu tiên)
        const teacherMatch = line.match(/^.*?(?=\d)/);
        if (teacherMatch) {
          currentItem["Giáo viên"] = teacherMatch[0].trim();
          line = line.replace(/^.*?(?=\d)/, "").trim(); // Loại bỏ Giáo viên khỏi dòng
        }

        // Gắn các giá trị số tiếp theo
        const numbers = line.split(/\s+/); // Tách thành các giá trị số
        currentItem["Số tiết theo CTĐT"] = numbers[0] || "";
        currentItem["Số SV"] = numbers[1] || "";
        currentItem["Số tiết lên lớp theo TKB"] = numbers[2] || "";
        currentItem["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] =
          numbers[3] || "";
        currentItem["Hệ số lớp đông"] = numbers[4] || "";
        currentItem["QC"] = numbers[5] || "";

        // Đưa đối tượng vào mảng kết quả
        result.push(currentItem);
      }
    });
    console.log(result);

    // Trả về mảng các đối tượng đã trích xuất
    fs.unlinkSync(filePath);
    const data2 = filterInvalidRows(result);
    console.log(data2);

    return data2;
  } catch (error) {
    console.error("Có lỗi xảy ra khi xử lý tệp PDF:", error);
    throw error; // Ném lỗi để biết có vấn đề trong quá trình xử lý
  }
};

// hàm xử lí trả về dữ liệu file quy chuẩn ( render bảng site thêm bảng quy chuẩn )
const handleUploadAndRender = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded" });
    }

    const filePath = path.join(__dirname, "../../uploads", req.file.filename);
    // console.log(filePath)

    // const fileExtension = path.extname(req.file.filename).toLowerCase(); // Lấy đuôi file
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let result;

    // console.log(fileExtension)
    // Xử lý theo loại file
    if (fileExtension === ".xlsx" || fileExtension === ".xls") {
      result = await convertExcelToJSON(filePath);
      console.log("convert file quy chuẩn excel");
    } else if (fileExtension === ".docx") {
      result = await convertWordToJSON(filePath);
      console.log("convert file quy chuẩn word");
    } else if (fileExtension === ".pdf") {
      result = await convertPDFToJSON(filePath);
      console.log("convert file quy chuẩn PDF");
    } else {
      return res.status(400).send({ error: "Không đúng định dạng" });
    }

    // console.log('Convert file quy chuẩn thành công!');
    // Gửi kết quả cho client
    res.send(result);

    // // Xóa file sau khi xử lý nếu cần thiết
    // fs.unlink(filePath, (err) => {
    //   if (err) console.error("Error deleting file:", err);
    // });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).send({ error: "Internal server error" });
  }
};

// kiểm tra tồn tại dữ liệu cũ ( tránh trường hợp import 2 file quy chuẩn bị trùng )
const checkDataQC = async (req, res) => {
  const tableName = process.env.DB_TABLE_QC; // Lấy tên bảng từ biến môi trường
  const { Dot, Ki, Nam } = req.body; // Lấy các giá trị từ body request

  // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
  const queryCheck = `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE Dot = ? AND Ki = ? AND Nam = ?) AS exist;`;

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [results] = await connection.query(queryCheck, [Dot, Ki, Nam]); // Thực hiện truy vấn
    const exist = results[0].exist === 1;

    if (exist) {
      return res
        .status(200)
        .json({ message: "Dữ liệu đã tồn tại trong hệ thống." });
    } else {
      return res
        .status(404)
        .json({ message: "Dữ liệu không tồn tại trong hệ thống." });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// tách dữ liệu từ Lớp Học Phần trong file quy chuẩn
function tachLopHocPhan(chuoi) {
  // Kiểm tra đầu vào
  if (typeof chuoi !== "string" || chuoi.trim() === "") {
    return {
      TenLop: "",
      HocKi: null,
      NamHoc: null,
      Lop: "",
    };
  }

  // Sử dụng biểu thức chính quy để tách chuỗi
  const regex = /^(.*?)(?:\s*\((.*?)\))?-(\d+)-(\d+)\s*\((.*?)\)$/; // Tách các phần
  const match = chuoi.match(regex);

  if (!match) {
    // Trường hợp không khớp với định dạng
    const regexFallback = /^(.*?)(?:\s*\((.*?)\))?$/; // Trường hợp không có học kỳ và năm
    const fallbackMatch = chuoi.match(regexFallback);
    if (fallbackMatch) {
      const tenHP = fallbackMatch[1].trim(); // Tên học phần
      const Lop = fallbackMatch[2] ? fallbackMatch[2].trim() : ""; // Lớp
      return {
        TenLop: tenHP,
        HocKi: null, // Thay đổi giá trị mặc định
        NamHoc: null, // Thay đổi giá trị mặc định
        Lop,
      };
    }

    return {
      TenLop: "",
      HocKi: null,
      NamHoc: null,
      Lop: "",
    };
  }

  // Lấy các thông tin từ kết quả match
  const tenHP = match[1].trim(); // Tên học phần
  const HocKi = match[3] ? match[3].trim() : null; // Học kỳ
  const namHoc = match[4].trim(); // Năm học kèm lớp
  const NamHoc = "20" + namHoc; // Tạo năm học từ phần thứ ba
  const Lop = match[5] ? match[5].trim() : ""; // Lớp

  return {
    TenLop: tenHP,
    HocKi,
    NamHoc,
    Lop,
  };
}

// Hàm thực thi auto fill tên, bộ môn, kiểm tra mời giảng
function processLecturerInfo(input, dataGiangVien) {
  // Loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi input
  input = input.trim();

  // Tách chuỗi input tại dấu phân cách ";" hoặc "," để tách các tên
  const namesArray = input.split(/[,;]/).map((part) => part.trim()); // Tách tại cả "," và ";"

  // Xử lý các key với tên đầu tiên trong mảng
  const giangVienGiangDay = cleanName(namesArray[0]); // HoTen: Loại bỏ ký tự đặc biệt, xử lý tên
  const moiGiang = checkIfGuestLecturer(namesArray[0]); // isGuestLecturer: Kiểm tra mời giảng
  const monGiangDayChinh = getMainTeachingSubject(namesArray[0], dataGiangVien); // mainTeachingSubject: Tìm môn giảng dạy chính

  // Nếu có môn giảng dạy chính thì gán giá trị giảng viên, nếu không gán là null
  // Nếu có bộ môn tương ứng thì giảng viên này đang hoạt động, thì mới fill tên
  // Tránh fill tên với một số trường hợp : Khoa ATTT, Giảng viên mời
  const giangVienResult = monGiangDayChinh ? giangVienGiangDay : null;

  // Trả về kết quả
  return {
    giangVienGiangDay: giangVienResult,
    moiGiang: moiGiang,
    monGiangDayChinh: monGiangDayChinh,
  };
}

// Hàm loại bỏ kí tự đặc biệt : PGS. TS ....
function cleanName(name) {
  const prefixes = [
    "PGS\\.?", // "PGS." hoặc "PGS"
    "TS\\.?", // "TS." hoặc "TS"
    "PGS\\.TS\\.?", // "PGS.TS." hoặc "PGS TS"
    "\\( gvm \\)",
    "\\(gvm\\)",
    "GVM",
    "GVMời",
    "Giảng viên mời",
  ];

  // Tạo regex tổng hợp để loại bỏ tất cả tiền tố
  const combinedRegex = new RegExp(`\\b(${prefixes.join("|")}) \\b`, "gi");

  // Xóa tất cả tiền tố trong danh sách
  name = name.replace(combinedRegex, "").trim();

  // Loại bỏ dấu ngoặc và nội dung bên trong (nếu có)
  name = name.replace(/\(.*?\)/g, "").trim();

  // Loại bỏ ký tự đặc biệt hoặc khoảng trắng thừa còn lại
  name = name.replace(/[^a-zA-ZÀ-ỹ\s]/g, "").trim(); // Chỉ giữ lại chữ cái và khoảng trắng

  return name;
}

// Hàm kiểm tra mời giảng
function checkIfGuestLecturer(name) {
  if (!name || typeof name !== "string") {
    return false; // Đảm bảo input hợp lệ, nếu không trả về false
  }

  const lowerCaseName = name.toLowerCase().trim(); // Chuyển về chữ thường để kiểm tra

  // Các mẫu ký hiệu mời giảng
  const invitePatterns = [
    "gvmời", // Mẫu ký hiệu mời giảng dạng chữ thường
    "giảng viên mời", // Mẫu khác của ký hiệu mời giảng
    "gvm", // Ký hiệu mời giảng đơn giản "gvm"
    "( gvm )", // Mẫu có dấu ngoặc
    "(gvm)", // Mẫu không có dấu cách trong ngoặc
  ];

  // Kiểm tra xem có mẫu ký hiệu mời giảng nào xuất hiện trong tên
  for (const pattern of invitePatterns) {
    if (lowerCaseName.includes(pattern)) {
      return true; // Nếu có ký hiệu mời giảng, trả về true
    }
  }

  return false; // Nếu không có ký hiệu mời giảng, trả về false
}

// Hàm tìm giảng viên trong dataGiangVien và trả về môn giảng dạy chính
function getMainTeachingSubject(name, dataGiangVien) {
  // Làm sạch tên đầu vào
  const cleanedName = cleanName(name).toLowerCase().trim(); // Chuyển về chữ thường

  // Tìm giảng viên trong danh sách, so sánh tên sau khi làm sạch
  const lecturer = dataGiangVien.find(
    (lecturer) => lecturer.HoTen.toLowerCase().trim() === cleanedName
  );

  // console.log("tìm thấy:", lecturer)
  // Nếu tìm thấy giảng viên, trả về môn giảng dạy chính, nếu không trả về null
  return lecturer ? lecturer.MonGiangDayChinh : null;
}

// Hàm lấy dữ liệu tổng hợp của giảng viên đang giảng dạy
const tongHopDuLieuGiangVien = async () => {
  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Thực hiện hai truy vấn song song bằng Promise.all
    const [results1, results2] = await Promise.all([
      connection.execute(`SELECT HoTen, MonGiangDayChinh 
          FROM gvmoi 
          WHERE TinhTrangGiangDay = 1;
      `),
      connection.execute(
        "SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM nhanvien"
      ),
    ]);

    // Kết hợp kết quả từ hai truy vấn thành một mảng duy nhất
    const allResults = results1[0].concat(results2[0]);

    return allResults;
  } catch (error) {
    console.error("Error while fetching lecturer data:", error);
    return []; // Trả về mảng rỗng nếu có lỗi
  } finally {
    connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

const importTableQC = async (jsonData) => {
  const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"

  const dataGiangVien = await tongHopDuLieuGiangVien(jsonData);
  // console.log(dataGiangVien);
  // Tạo kết nối và thực hiện truy vấn chèn hàng loạt
  const connection = await createPoolConnection();
  // Câu lệnh INSERT với các cột cần thiết
  const queryInsert = `INSERT INTO ${tableName} (
    Khoa,
    Dot,
    KiHoc,
    NamHoc,
    GiaoVien,
    GiaoVienGiangDay,
    MoiGiang,
    SoTinChi,
    MaHocPhan,
    LopHocPhan,
    TenLop,
    BoMon,
    LL,
    SoTietCTDT,
    HeSoT7CN,
    SoSinhVien,
    HeSoLopDong,
    QuyChuan,
    GhiChu,
    HeDaoTao
  ) VALUES ?;`; // Dấu '?' cho phép chèn nhiều giá trị một lần

  // Mảng để lưu tất cả giá trị cần chèn
  const allValues = [];
  const query = `SELECT VietTat FROM hedonghocphi`;
  const [rows] = await connection.query(query);
  // Gắn số từ 0 đến 9 vào từng giá trị VietTat
  const VietTatModified = rows
    .map((row) => {
      return Array.from({ length: 10 }, (_, i) => `${row.VietTat}${i}`);
    })
    .flat(); // Tạo danh sách phẳng chứa tất cả các biến VietTat

  console.log(VietTatModified);
  // Chuẩn bị dữ liệu cho mỗi item trong jsonData
  jsonData.forEach((item, index) => {
    // tách lớp học phần
    const { TenLop, HocKi, NamHoc, Lop } = tachLopHocPhan(item["LopHocPhan"]);

    // tách từ cột giảng viên theo tkb, xử lí mời giảng?, tự điền tên, tự điền bộ môn
    const { giangVienGiangDay, moiGiang, monGiangDayChinh } =
      processLecturerInfo(item["GiaoVien"], dataGiangVien);

    // Biến để kiểm tra nếu "hệ đóng học phí" đã được tìm thấy
    let HeDaoTao = "Mật mã"; // Mặc định là "chuyên ngành Kỹ thuật mật mã"

    // Lặp qua tất cả các phần tử trong VietTatModified
    for (let i = 0; i < VietTatModified.length; i++) {
      const currentVietTat = VietTatModified[i];

      // Lấy độ dài của currentVietTat
      const lengthToCompare = currentVietTat.length;

      // So sánh Lop với số ký tự tương ứng độ dài của currentVietTat
      if (Lop.slice(0, lengthToCompare) === currentVietTat) {
        HeDaoTao = "Đóng học phí";
        break; // Nếu tìm thấy "hệ đóng học phí", thoát khỏi vòng lặp
      }
    }

    allValues.push([
      item["Khoa"] || null,
      item["Dot"] || null,
      item["Ki"] || null,
      item["Nam"] || null,
      item["GiaoVien"] || null,
      giangVienGiangDay,
      moiGiang || null,
      item["SoTinChi"] || null,
      item["MaHocPhan"] || null,
      TenLop || null,
      Lop || null,
      monGiangDayChinh,
      item["LL"] || null,
      item["SoTietCTDT"] || null,
      item["HeSoT7CN"] || null,
      item["SoSinhVien"] || null,
      item["HeSoLopDong"] || null,
      item["QuyChuan"] || null,
      item["GhiChu"] || null,
      HeDaoTao,
    ]);
  });

  let results = false;
  try {
    // Thực hiện chèn tất cả giá trị cùng lúc
    await connection.query(queryInsert, [allValues]);
    results = true;

    // Thực hiện cập nhật sau khi chèn
    const queryUpdate = `UPDATE ${tableName} SET MaHocPhan = CONCAT(Khoa, id);`;
    await connection.execute(queryUpdate);
  } catch (error) {
    console.error("Error while inserting data:", error);
  } finally {
    connection.release();
  }

  return results;
};

//
const updateBanHanh = async (req, res) => {
  let connection;
  try {
    const NamHoc = req.params;
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu lệnh SQL để cập nhật trangthai
    const query1 = `UPDATE namhoc SET trangthai = ?`;
    const [result1] = await connection.query(query1, [0]);

    const query2 = `UPDATE namhoc SET trangthai = ? WHERE NamHoc = ?`;
    const [result2] = await connection.query(query2, [1, NamHoc.NamHoc]);
    // cập nhật bảng kì
    const query3 = `UPDATE ki SET trangthai = ?`;
    const [result3] = await connection.query(query3, [0]);

    const query4 = `UPDATE ki SET trangthai = ? WHERE value = ?`;
    const [result4] = await connection.query(query4, [1, NamHoc.Ki]);

    //update bảng đợt

    const query5 = `UPDATE dot SET trangthai = ?`;
    const [result5] = await connection.query(query5, [0]);

    const query6 = `UPDATE dot SET trangthai = ? WHERE value = ?`;
    const [result6] = await connection.query(query6, [1, NamHoc.Dot]);

    // Kiểm tra nếu không có dòng nào bị ảnh hưởng
    if (result2.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy năm học để cập nhật.",
      });
    }

    res.json({ success: true, message: "Cập nhật trạng thái thành công." });
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res
      .status(500)
      .json({ success: false, message: "Cập nhật thất bại, lỗi server." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// const importTableTam = async (jsonData) => {
//   const tableName = process.env.DB_TABLE_TAM; // Giả sử biến này có giá trị là "quychuan"

//   // Tạo câu lệnh INSERT động
//   const query = `
//     INSERT INTO ${tableName} (
//       Khoa,
//       Dot,
//       Ki,
//       Nam,
//       GiaoVien,
//       SoTinChi,
//       LopHocPhan,
//       LL,
//       SoTietCTDT,
//       HeSoT7CN,
//       SoSinhVien,
//       HeSoLopDong,
//       QuyChuan
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
//   `;

//   const insertPromises = jsonData.map(async (item) => {
//     const connection = await createPoolConnection(); // Lấy kết nối từ pool
//     try {
//       const values = [
//         item["Khoa"],
//         item["Dot"],
//         item["Ki"],
//         item["Nam"],
//         item["Giáo Viên"],
//         item["Số TC"],
//         item["Lớp học phần"],
//         item["Số tiết lên lớp giờ HC"],
//         item["Số tiết theo CTĐT"],
//         item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"],
//         item["Số SV"],
//         item["Hệ số lớp đông"],
//         item["QC"],
//       ];
//       await connection.query(query, values);
//     } catch (err) {
//       console.error("Error:", err);
//       throw err;
//     } finally {
//       connection.release(); // Giải phóng kết nối sau khi hoàn thành
//     }
//   });

//   let results = false;
//   try {
//     await Promise.all(insertPromises); // Thực hiện tất cả các truy vấn song song
//     results = true;
//   } catch (error) {
//     console.error("Error:", error);
//   }

//   console.log("Thêm file quy chuẩn vào bảng Tam thành công");
//   return results;
// };

const validateKhoa = (khoa) => {
  // Chuyển giá trị của khoa thành chữ viết hoa để tránh nhầm lẫn với chữ thường
  switch (khoa.trim()) {
    case "Cơ bản":
      return "CB";
    case "An toàn thông tin":
      return "ATTT";
    case "Công nghệ thông tin":
      return "CNTT";
    case "Điện tử - Viễn thông":
      return "ĐTVT";
    case "Trung tâm thực hành":
      return "TTTH";
    case "Lý luận hính trị":
      return "LLCT";
    case "QS&GDTC":
      return "QS&GDTC";
    case "Mật":
      return "MM";
    case "Khác":
      return "Khác";
    default:
      return khoa; // Nếu không khớp với bất kỳ giá trị nào, trả về chính nó :)
  }
};

// hàm này chuẩn hóa tiêu đề trong file quy chuẩn word
const normalizeKeys = (data) => {
  const keyMap = {
    "Giáo viên": "Giáo Viên", // Chuẩn hóa các biến thể
    "Giáo Viên": "Giáo Viên", // Nếu tên trường là "Giáo Viên" thì chuẩn hóa thành "Giáo Viên"
    "Giao Vien": "Giáo Viên", // Nếu tên trường là "Giao Vien" thì chuẩn hóa thành "Giáo Viên"
    "giáo Viên": "Giáo Viên",
    "Giáo Viên": "Giáo Viên", // Nếu tên trường là "giáo Viên" (chữ cái viết thường) thì chuẩn hóa thành "Giáo Viên"
    "Số TC": "Số TC", // Các trường khác không thay đổi
    "Số SV": "Số SV",
    "Số tiết lên lớp giờ HC": "Số tiết lên lớp giờ HC",
    // Thêm các cặp key khác nếu cần
  };

  return data.map((item) => {
    const normalizedItem = {};
    for (const key in item) {
      const normalizedKey = keyMap[key] || key; // Nếu không có trong keyMap thì giữ nguyên tên trường
      normalizedItem[normalizedKey] = item[key];
    }
    return normalizedItem;
  });
};

const importTableTam = async (jsonData) => {
  const tableName = process.env.DB_TABLE_TAM; // Giả sử biến này là "quychuan"

  console.log(jsonData);
  // Tạo câu lệnh INSERT động
  const query = `
    INSERT INTO ${tableName} (
      Khoa,
      Dot,
      Ki,
      Nam,
      GiaoVien, 
      SoTinChi, 
      LopHocPhan, 
      LL, 
      SoTietCTDT, 
      HeSoT7CN, 
      SoSinhVien, 
      HeSoLopDong, 
      QuyChuan
    ) VALUES ?
  `;
  const normalizedData = normalizeKeys(jsonData); // Chuẩn hóa dữ liệu
  const values = normalizedData
    .filter((item) => {
      // Log giá trị của QC để kiểm tra
      // console.log("QC value:", item["QC"]);

      // Chuyển QC về kiểu số và kiểm tra xem nó có phải là NaN hoặc bằng 0 không
      const qcValue = parseFloat(item["QC"]);

      // Nếu bằng 0 hoặc rỗng thì bỏ qua không thêm
      return !isNaN(qcValue) && qcValue !== 0;
    })
    .map((item) => [
      validateKhoa(item["Khoa"]) || null, // Đảm bảo giá trị null nếu trường bị thiếu
      item["Dot"] || null,
      item["Ki"] || null,
      item["Nam"] || null,
      item["Giáo Viên"] || null,
      item["Số TC"] || null,
      item["Lớp học phần"] || null,
      item["Số tiết lên lớp theo TKB"] ||
        item["Số tiết lên lớp giờ HC"] ||
        null,
      item["Số tiết theo CTĐT"] || null,
      item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] ||
        item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] ||
        null,
      item["Số SV"] || null,
      item["Hệ số lớp đông"] || null,
      item["QC"] || null, // QuyChuan có thể là null nếu không có giá trị
    ]);

  // Kiểm tra nếu không có đối tượng hợp lệ
  if (values.length === 0) {
    console.log("Không có dữ liệu hợp lệ để thêm vào cơ sở dữ liệu.");
    return false; // Nếu không có đối tượng hợp lệ, dừng lại
  }

  const connection = await createPoolConnection(); // Lấy kết nối từ pool
  try {
    // Thực hiện truy vấn với nhiều giá trị
    await connection.query(query, [values]);
    console.log("Thêm file quy chuẩn vào bảng Tam thành công");
    return true;
  } catch (err) {
    console.error("Lỗi:", err.message || err);
    return false;
  } finally {
    connection.release(); // Giải phóng kết nối
  }
};

const getIdUserByTeacherName = async (teacherName) => {
  const connection = await createPoolConnection(); // Lấy kết nối từ pool
  return new Promise((resolve, reject) => {
    const query = `SELECT id_User FROM nhanvien WHERE TenNhanVien = '${teacherName}'`;

    connection.query(query, (err, results) => {
      connection.release(); // Giải phóng kết nối sau khi truy vấn xong

      if (err) {
        console.error("Lỗi khi truy vấn bảng nhanvien:", err);
        reject(err);
        return;
      }

      if (results.length === 0) {
        resolve(null); // Không tìm thấy
      } else {
        resolve(results[0].id_User); // Trả về id_User của Giảng viên
      }
    });
  });
};

const importJSONToDB = async (jsonData) => {
  const tableLopName = "lop"; // Tên bảng lop
  const tableHocPhanName = "hocphan"; // Tên bảng hocphan
  const tableGiangDayName = "giangday"; // Tên bảng giangday

  // Các cột cho bảng lop
  const columnMaLop = "MaLop"; // Mã lớp
  const columnTenLop = "TenLop"; // Tên lớp
  const columnSoSinhVien = "SoSinhVien"; // Số sinh viên
  const columnNam = "NamHoc"; // Năm học
  const columnHocKi = "HocKi"; // Học kỳ
  const columnHeSoSV = "HeSoSV"; // Hệ số sinh viên

  // Các cột cho bảng hocphan
  const columnMaHocPhan = "MaHocPhan"; // Mã học phần
  const columnTenHocPhan = "TenHocPhan"; // Tên học phần
  const columnDVHT = "DVHT"; // Số tín chỉ

  // Các cột cho bảng giangday
  const columnIdUser = "id_User"; // ID Giảng viên
  const columnMaHocPhanGiangDay = "MaHocPhan"; // Mã học phần
  const columnMaLopGiangDay = "MaLop"; // Mã lớp
  const columnIdGVM = "Id_Gvm"; // ID giảng viên mời
  const columnGiaoVien = "GiaoVien"; // Tên Giảng viên
  const columnLenLop = "LenLop"; // LL
  const columnHeSoT7CN = "HeSoT7CN"; // Hệ số T7/CN
  const columnSoTietCTDT = "SoTietCTDT"; // Số tiết CTĐT

  let index = 1;

  const insertPromises = jsonData.map(async (item) => {
    const chuoi = item["Lớp học phần"];
    const { TenLop, HocKi, NamHoc, Lop } = tachLopHocPhan(chuoi);
    const tenGv = item["Giáo Viên"];
    const id_User = await getIdUserByTeacherName(tenGv); // Chờ lấy id_User

    if (id_User != null) {
      const connection = await createPoolConnection(); // Lấy kết nối từ pool

      const insertLopPromise = new Promise((resolve, reject) => {
        const queryLop = `INSERT INTO ${tableLopName} 
          (${columnMaLop}, ${columnTenLop}, ${columnSoSinhVien}, ${columnNam}, ${columnHocKi}, ${columnHeSoSV}) 
          VALUES (?, ?, ?, ?, ?, ?)`;

        connection.query(
          queryLop,
          [index, TenLop, item["Số SV"], NamHoc, HocKi, item["Hệ số lớp đông"]],
          (err, results) => {
            if (err) {
              console.error("Lỗi khi thêm vào bảng lop:", err);
              reject(err);
              return;
            }
            resolve(results);
          }
        );
      });

      const insertHocPhanPromise = new Promise((resolve, reject) => {
        const queryHocPhan = `INSERT INTO ${tableHocPhanName} 
          (${columnMaHocPhan}, ${columnTenHocPhan}, ${columnDVHT}) 
          VALUES (?, ?, ?)`;

        connection.query(
          queryHocPhan,
          [index, TenLop, item["Số TC"]],
          (err, results) => {
            if (err) {
              console.error("Lỗi khi thêm vào bảng hocphan:", err);
              reject(err);
              return;
            }
            resolve(results);
          }
        );
      });

      const insertGiangDayPromise = new Promise((resolve, reject) => {
        const queryGiangDay = `INSERT INTO ${tableGiangDayName} 
          (${columnIdUser}, ${columnMaHocPhanGiangDay}, ${columnMaLopGiangDay}, ${columnIdGVM}, ${columnGiaoVien}, ${columnLenLop}, ${columnHeSoT7CN}, ${columnSoTietCTDT}) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        connection.query(
          queryGiangDay,
          [
            id_User,
            index,
            index,
            index,
            item["Giáo Viên"],
            item["LL"],
            item["Hệ số T7/CN"],
            item["Số tiết CTĐT"],
          ],
          (err, results) => {
            if (err) {
              console.error("Lỗi khi thêm vào bảng giangday:", err);
              reject(err);
              return;
            }
            resolve(results);
          }
        );
      });

      index++;
      await Promise.all([
        insertLopPromise,
        insertHocPhanPromise,
        insertGiangDayPromise,
      ]);
      connection.release(); // Giải phóng kết nối sau khi tất cả truy vấn đã hoàn thành
    }
  });

  try {
    await Promise.all(insertPromises);
    return true;
  } catch (error) {
    console.error("Lỗi tổng quát:", error);
    return false;
  }
};

const checkFile = async (req, res) => {
  console.log("Thực hiện kiểm tra dữ liệu trong bảng Tam");
  const tableName = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  const { Khoa, Dot, Ki, Nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?) AS exist;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [Khoa, Dot, Ki, Nam]);

    // Kết quả trả về từ cơ sở dữ liệu
    const exist = results[0].exist === 1; // True nếu tồn tại, False nếu không tồn tại

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

const deleteFile = async (req, res) => {
  const tableName = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  const { Khoa, Dot, Ki, Nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Query SQL để xóa row
    const sql = `DELETE FROM ${tableName} WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;

    // Thực hiện truy vấn
    const [results] = await connection.query(sql, [Khoa, Dot, Ki, Nam]);

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

// const updateChecked = async (req, res) => {
//   const role = req.session.role;

//   const duyet = process.env.DUYET;

//   const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"

//   if (role == duyet) {
//     const jsonData = req.body; // Lấy dữ liệu từ req.body

//     // Tạo mảng các Promise cho từng item trong jsonData
//     const updatePromises = jsonData.map((item) => {
//       return new Promise((resolve, reject) => {
//         const {
//           Khoa,
//           Dot,
//           KiHoc,
//           NamHoc,
//           GiaoVien,
//           GiaoVienGiangDay,
//           MoiGiang,
//           SoTinChi,
//           MaHocPhan,
//           LopHocPhan,
//           TenLop,
//           BoMon,
//           LL,
//           SoTietCTDT,
//           HeSoT7CN,
//           SoSinhVien,
//           HeSoLopDong,
//           QuyChuan,
//           GhiChu,
//           KhoaDuyet,
//           DaoTaoDuyet,
//           TaiChinhDuyet,
//           NgayBatDau,
//           NgayKetThuc,
//         } = item;
//         const ID = item.ID;
//         // Xây dựng câu lệnh cập nhật
//         const queryUpdate = `
//          UPDATE ${tableName}
// SET
//     Khoa = ?,
//     Dot = ?,
//     KiHoc = ?,
//     NamHoc = ?,
//     GiaoVien = ?,
//     GiaoVienGiangDay = ?,
//     MoiGiang = ?,
//     SoTinChi = ?,
//     MaHocPhan = ?,
//     LopHocPhan = ?,
//     TenLop = ?,
//     BoMon = ?,
//     LL = ?,
//     SoTietCTDT = ?,
//     HeSoT7CN = ?,
//     SoSinhVien = ?,
//     HeSoLopDong = ?,
//     QuyChuan = ?,
//     GhiChu = ?,
//     KhoaDuyet = ?,
//     DaoTaoDuyet = ?,
//     TaiChinhDuyet = ?,
//     NgayBatDau = ?,
//     NgayKetThuc = ?
// WHERE ID = ${ID}
// AND (KhoaDuyet = FALSE OR DaoTaoDuyet = FALSE OR TaiChinhDuyet = FALSE);  -- Điều kiện cập nhật
//         `;

//         // Tạo mảng các giá trị tương ứng với câu lệnh
//         const values = [
//           Khoa,
//           Dot,
//           KiHoc,
//           NamHoc,
//           GiaoVien,
//           GiaoVienGiangDay,
//           MoiGiang,
//           SoTinChi,
//           MaHocPhan,
//           LopHocPhan,
//           TenLop,
//           BoMon,
//           LL,
//           SoTietCTDT,
//           HeSoT7CN,
//           SoSinhVien,
//           HeSoLopDong,
//           QuyChuan,
//           GhiChu,
//           KhoaDuyet,
//           DaoTaoDuyet,
//           TaiChinhDuyet,
//           NgayBatDau,
//           NgayKetThuc,
//         ];

//         // console.log(values[0]);

//         // Thực hiện truy vấn cập nhật
//         connection.query(queryUpdate, values, (err, results) => {
//           if (err) {
//             console.error("Error:", err);
//             reject(err);
//             return;
//           }
//           resolve(results);
//         });
//       });
//     });

//     try {
//       await Promise.all(updatePromises);
//       console.log("Cập nhật thành công");
//       res.status(200).json({ message: "Cập nhật thành công" });
//     } catch (error) {
//       console.error("Lỗi cập nhật:", error);
//       res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//     }
//   } else {
//     res
//       .status(403)
//       .json({ error: "Bạn không có quyền thực hiện hành động này" });
//   }
// };

const updateChecked = async (req, res) => {
  const role = req.session.role;
  const duyet = process.env.DUYET;
  const tableName = process.env.DB_TABLE_QC;

  if (role == duyet) {
    const jsonData = req.body;

    let connection;

    try {
      // Lấy kết nối từ createPoolConnection
      connection = await createPoolConnection();

      // Tạo mảng các Promise cho từng item trong jsonData
      const updatePromises = jsonData.map((item) => {
        return new Promise((resolve, reject) => {
          const {
            Khoa,
            Dot,
            KiHoc,
            NamHoc,
            GiaoVien,
            GiaoVienGiangDay,
            MoiGiang,
            SoTinChi,
            MaHocPhan,
            LopHocPhan,
            TenLop,
            BoMon,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            GhiChu,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            NgayBatDau,
            NgayKetThuc,
          } = item;
          const ID = item.ID;

          // Xây dựng câu lệnh cập nhật
          const queryUpdate = `
            UPDATE ${tableName}
            SET 
              Khoa = ?, 
              Dot = ?, 
              KiHoc = ?, 
              NamHoc = ?, 
              GiaoVien = ?, 
              GiaoVienGiangDay = ?, 
              MoiGiang = ?, 
              SoTinChi = ?, 
              MaHocPhan = ?, 
              LopHocPhan = ?, 
              TenLop = ?, 
              BoMon = ?, 
              LL = ?, 
              SoTietCTDT = ?, 
              HeSoT7CN = ?, 
              SoSinhVien = ?, 
              HeSoLopDong = ?, 
              QuyChuan = ?, 
              GhiChu = ?,
              KhoaDuyet = ?,
              DaoTaoDuyet = ?,
              TaiChinhDuyet = ?,
              NgayBatDau = ?,
              NgayKetThuc = ?
            WHERE ID = ?
              AND (KhoaDuyet = FALSE OR DaoTaoDuyet = FALSE OR TaiChinhDuyet = FALSE);
          `;

          // Tạo mảng các giá trị tương ứng với câu lệnh
          const values = [
            Khoa,
            Dot,
            KiHoc,
            NamHoc,
            GiaoVien,
            GiaoVienGiangDay,
            MoiGiang,
            SoTinChi,
            MaHocPhan,
            LopHocPhan,
            TenLop,
            BoMon,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            GhiChu,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            NgayBatDau,
            NgayKetThuc,
            ID,
          ];

          // Thực hiện truy vấn cập nhật
          connection.query(queryUpdate, values, (err, results) => {
            if (err) {
              console.error("Error:", err);
              reject(err);
              return;
            }
            resolve(results);
          });
        });
      });

      // Chờ tất cả các truy vấn cập nhật hoàn tất
      await Promise.all(updatePromises);
      console.log("Duyệt thành công");
      res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
    } finally {
      if (connection) connection.release(); // Trả kết nối về pool
    }
  } else {
    res
      .status(403)
      .json({ error: "Bạn không có quyền thực hiện hành động này" });
  }
};

const updateDateAll = async (req, res) => {
  const tableName = process.env.DB_TABLE_QC;
  const jsonData = req.body;

  let connection;

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Giới hạn số lượng bản ghi mỗi batch (tránh quá tải)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      batches.push(jsonData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE ${tableName}
        SET
          NgayBatDau = CASE
      `;
      const updateValues = [];
      const ids = [];

      batch.forEach(({ ID, NgayBatDau, NgayKetThuc }) => {
        // Chuẩn hóa dữ liệu
        const validNgayBatDau = isNaN(new Date(NgayBatDau).getTime())
          ? null
          : NgayBatDau;
        const validNgayKetThuc = isNaN(new Date(NgayKetThuc).getTime())
          ? null
          : NgayKetThuc;

        // Thêm logic cập nhật cho NgayBatDau
        updateQuery += ` WHEN ID = ? THEN ? `;
        updateValues.push(ID, validNgayBatDau);

        // Thêm logic cập nhật cho NgayKetThuc
        if (!ids.includes(ID)) ids.push(ID);
      });

      updateQuery += `
        END, 
        NgayKetThuc = CASE
      `;

      batch.forEach(({ ID, NgayKetThuc }) => {
        const validNgayKetThuc = isNaN(new Date(NgayKetThuc).getTime())
          ? null
          : NgayKetThuc;
        updateQuery += ` WHEN ID = ? THEN ? `;
        updateValues.push(ID, validNgayKetThuc);
      });

      // Hoàn thiện truy vấn
      updateQuery += ` END WHERE ID IN (${ids.map(() => "?").join(", ")})`;
      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật
      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// const updateDateAll = async (req, res) => {
//   const tableName = process.env.DB_TABLE_QC;
//   const jsonData = req.body;

//   let connection;

//   try {
//     // Lấy kết nối từ createPoolConnection
//     connection = await createPoolConnection();

//     // Duyệt qua từng phần tử trong jsonData
//     for (let item of jsonData) {
//       const { ID, NgayBatDau, NgayKetThuc } = item;

//       // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
//       const updateQuery = `
//         UPDATE ${tableName}
//         SET
//           NgayBatDau = ?,
//           NgayKetThuc = ?
//         WHERE ID = ?
//       `;

//       const updateValues = [
//         isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
//         isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
//         ID,
//       ];
//       //const updateValues = [NgayBatDau, NgayKetThuc, ID];

//       await connection.query(updateQuery, updateValues);
//     }

//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

// BACKUP KO ĐC XÓA
const updateQC = async (req, res) => {
  const role = req.session.role;
  const duyet = process.env.DUYET;
  const tableName = process.env.DB_TABLE_QC;
  const jsonData = req.body;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Duyệt qua từng phần tử trong jsonData
    for (let item of jsonData) {
      console.log(item);
      const {
        ID,
        Khoa,
        Dot,
        KiHoc,
        NamHoc,
        GiaoVien,
        GiaoVienGiangDay,
        MoiGiang,
        SoTinChi,
        MaHocPhan,
        LopHocPhan,
        TenLop,
        BoMon,
        LL,
        SoTietCTDT,
        HeSoT7CN,
        SoSinhVien,
        HeSoLopDong,
        QuyChuan,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        NgayBatDau,
        NgayKetThuc,
        HeDaoTao,
      } = item;

      if (KhoaDuyet == 1) {
        if (!GiaoVienGiangDay || GiaoVienGiangDay.length === 0) {
          return res.status(200).json({
            message: `Lớp học phần ${LopHocPhan} (${TenLop}) chưa được điền giảng viên`,
          });
        }
      }

      // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
      const updateQuery = `
        UPDATE ${tableName}
        SET
          Khoa = ?,
          Dot = ?,
          KiHoc = ?,
          NamHoc = ?,
          GiaoVien = ?,
          GiaoVienGiangDay = ?,
          MoiGiang = ?,
          SoTinChi = ?,
          MaHocPhan = ?,
          LopHocPhan = ?,
          TenLop = ?,
          BoMon = ?,
          LL = ?,
          SoTietCTDT = ?,
          HeSoT7CN = ?,
          SoSinhVien = ?,
          HeSoLopDong = ?,
          QuyChuan = ?,
          GhiChu = ?,
          KhoaDuyet = ?,
          DaoTaoDuyet = ?,
          TaiChinhDuyet = ?,
          NgayBatDau = ?,
          NgayKetThuc = ?,
          HeDaoTao = ?
        WHERE ID = ?
      `;

      const updateValues = [
        Khoa,
        Dot,
        KiHoc,
        NamHoc,
        GiaoVien,
        GiaoVienGiangDay,
        MoiGiang,
        SoTinChi,
        MaHocPhan,
        LopHocPhan,
        TenLop,
        BoMon,
        LL,
        SoTietCTDT,
        HeSoT7CN,
        SoSinhVien,
        HeSoLopDong,
        QuyChuan,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
        isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
        HeDaoTao,
        ID,
      ];

      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// const updateQC = async (req, res) => {
//   const { role } = req.session;
//   const tableName = process.env.DB_TABLE_QC;
//   const jsonData = req.body;

//   if (!Array.isArray(jsonData) || jsonData.length === 0) {
//     return res.status(400).json({ message: "Dữ liệu không hợp lệ hoặc rỗng." });
//   }

//   let connection;

//   try {
//     // Lấy kết nối từ pool
//     connection = await createPoolConnection();

//     // Kiểm tra toàn bộ dữ liệu trước khi cập nhật
//     for (let item of jsonData) {
//       const { LopHocPhan, TenLop, GiaoVienGiangDay, KhoaDuyet } = item;

//       if (
//         KhoaDuyet == 1 &&
//         (!GiaoVienGiangDay || GiaoVienGiangDay.length === 0)
//       ) {
//         return res.status(400).json({
//           message: `Lớp học phần ${LopHocPhan} (${TenLop}) chưa được điền giảng viên.`,
//         });
//       }
//     }

//     // Thực hiện cập nhật đồng thời tất cả bản ghi
//     const updatePromises = jsonData.map((item) => {
//       const {
//         ID,
//         Khoa,
//         Dot,
//         KiHoc,
//         NamHoc,
//         GiaoVien,
//         GiaoVienGiangDay,
//         MoiGiang,
//         SoTinChi,
//         MaHocPhan,
//         LopHocPhan,
//         TenLop,
//         BoMon,
//         LL,
//         SoTietCTDT,
//         HeSoT7CN,
//         SoSinhVien,
//         HeSoLopDong,
//         QuyChuan,
//         GhiChu,
//         KhoaDuyet,
//         DaoTaoDuyet,
//         TaiChinhDuyet,
//         NgayBatDau,
//         NgayKetThuc,
//       } = item;

//       const updateQuery = `
//         UPDATE ${tableName}
//         SET
//           Khoa = ?,
//           Dot = ?,
//           KiHoc = ?,
//           NamHoc = ?,
//           GiaoVien = ?,
//           GiaoVienGiangDay = ?,
//           MoiGiang = ?,
//           SoTinChi = ?,
//           MaHocPhan = ?,
//           LopHocPhan = ?,
//           TenLop = ?,
//           BoMon = ?,
//           LL = ?,
//           SoTietCTDT = ?,
//           HeSoT7CN = ?,
//           SoSinhVien = ?,
//           HeSoLopDong = ?,
//           QuyChuan = ?,
//           GhiChu = ?,
//           KhoaDuyet = ?,
//           DaoTaoDuyet = ?,
//           TaiChinhDuyet = ?,
//           NgayBatDau = ?,
//           NgayKetThuc = ?
//         WHERE ID = ?
//       `;

//       const updateValues = [
//         Khoa,
//         Dot,
//         KiHoc,
//         NamHoc,
//         GiaoVien,
//         GiaoVienGiangDay,
//         MoiGiang,
//         SoTinChi,
//         MaHocPhan,
//         LopHocPhan,
//         TenLop,
//         BoMon,
//         LL,
//         SoTietCTDT,
//         HeSoT7CN,
//         SoSinhVien,
//         HeSoLopDong,
//         QuyChuan,
//         GhiChu,
//         KhoaDuyet,
//         DaoTaoDuyet,
//         TaiChinhDuyet,
//         isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
//         isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
//         ID,
//       ];

//       return connection.query(updateQuery, updateValues);
//     });

//     await Promise.all(updatePromises);

//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error.message);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu." });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

const capNhatTen_BoMon = async (req, res) => {
  // console.log("Đang xử lý yêu cầu cập nhật...");

  // Nhận dữ liệu từ client
  const { GiaoVienGiangDay, BoMon, ID } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!ID || !GiaoVienGiangDay || !BoMon) {
    return res
      .status(400)
      .json({ message: "ID, GiaoVienGiangDay và BoMon là bắt buộc!" });
  }

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu lệnh SQL để cập nhật dữ liệu
    const sql = `
      UPDATE quychuan
      SET GiaoVienGiangDay = ?, BoMon = ?
      WHERE ID = ?
    `;
    const values = [GiaoVienGiangDay, BoMon, ID];

    // Thực thi truy vấn
    const [result] = await connection.execute(sql, values);

    // Kiểm tra xem có dòng nào được cập nhật không
    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } else {
      return res
        .status(404)
        .json({ message: "Không tìm thấy giảng viên với ID này!" });
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật giảng viên:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra khi cập nhật!" });
  } finally {
    // Trả kết nối về pool sau khi xử lý xong
    if (connection) {
      connection.release(); // Release kết nối lại về pool
    }
  }
};

// const updateQC = async (req, res) => {
//   const role = req.session.role;
//   const duyet = process.env.DUYET;

//   const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"
//   const jsonData = req.body; // Lấy dữ liệu từ req.body

//   //console.log("jsson = ", jsonData);
//   // Hàm trợ giúp để promisify connection.query
//   const queryAsync = (query, values) => {
//     return new Promise((resolve, reject) => {
//       connection.query(query, values, (err, results) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(results);
//         }
//       });
//     });
//   };

//   try {
//     // Biến để lưu các ID đã hoàn thiện
//     let completedIDs = [];

//     // Duyệt qua từng phần tử trong jsonData
//     for (let item of jsonData) {
//       const {
//         ID,
//         Khoa,
//         Dot,
//         KiHoc,
//         NamHoc,
//         GiaoVien,
//         GiaoVienGiangDay,
//         MoiGiang,
//         SoTinChi,
//         MaHocPhan,
//         LopHocPhan,
//         TenLop,
//         BoMon,
//         LL,
//         SoTietCTDT,
//         HeSoT7CN,
//         SoSinhVien,
//         HeSoLopDong,
//         QuyChuan,
//         GhiChu,
//         KhoaDuyet,
//         DaoTaoDuyet,
//         TaiChinhDuyet,
//         NgayBatDau,
//         NgayKetThuc,
//       } = item;

//       if (KhoaDuyet == 1) {
//         if (GiaoVienGiangDay.length == 0) {
//           return res.status(200).json({
//             message: `Lớp học phần ${LopHocPhan} (${TenLop}) chưa được điền giảng viên`,
//           });
//         }
//       }

//       // Truy vấn kiểm tra nếu bản ghi đã được duyệt đầy đủ
//       const approvalQuery = `SELECT KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet FROM ${tableName} WHERE ID = ?`;
//       const approvalResult = await queryAsync(approvalQuery, [ID]);

//       // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
//       const updateQuery = `
//         UPDATE ${tableName}
//         SET
//           Khoa = ?,
//           Dot = ?,
//           KiHoc = ?,
//           NamHoc = ?,
//           GiaoVien = ?,
//           GiaoVienGiangDay = ?,
//           MoiGiang = ?,
//           SoTinChi = ?,
//           MaHocPhan = ?,
//           LopHocPhan = ?,
//           TenLop = ?,
//           BoMon = ?,
//           LL = ?,
//           SoTietCTDT = ?,
//           HeSoT7CN = ?,
//           SoSinhVien = ?,
//           HeSoLopDong = ?,
//           QuyChuan = ?,
//           GhiChu = ?,
//           KhoaDuyet = ?,
//           DaoTaoDuyet = ?,
//           TaiChinhDuyet = ?,
//           NgayBatDau = ?,
//           NgayKetThuc = ?
//         WHERE ID = ?
//       `;
//       //          AND (KhoaDuyet = 0 OR DaoTaoDuyet = 0 OR TaiChinhDuyet = 0)

//       const updateValues = [
//         Khoa,
//         Dot,
//         KiHoc,
//         NamHoc,
//         GiaoVien,
//         GiaoVienGiangDay,
//         MoiGiang,
//         SoTinChi,
//         MaHocPhan,
//         LopHocPhan,
//         TenLop,
//         BoMon,
//         LL,
//         SoTietCTDT,
//         HeSoT7CN,
//         SoSinhVien,
//         HeSoLopDong,
//         QuyChuan,
//         GhiChu,
//         KhoaDuyet,
//         DaoTaoDuyet,
//         TaiChinhDuyet,
//         NgayBatDau,
//         NgayKetThuc,
//         ID,
//       ];

//       await queryAsync(updateQuery, updateValues);
//     }

//     // Trả về thông báo cho các ID đã hoàn thiện
//     // if (completedIDs.length == 0) {
//     //   //completedIDs.length > 0
//     //   return res.status(200).json({
//     //     message: "Dữ liệu đã hoàn thiện, không thể cập nhật",
//     //   });
//     // }

//     // Nếu tất cả cập nhật thành công
//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   }
// };

// Phòng ban duyệt - teching info2
// const phongBanDuyet = async (req, res) => {
//   const role = req.session.role;
//   const duyet = process.env.DUYET;

//   const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"
//   const jsonData = req.body; // Lấy dữ liệu từ req.body

//   // Lấy kết nối từ pool
//   const connection = await createPoolConnection();

//   try {
//     // Duyệt qua từng phần tử trong jsonData
//     for (let item of jsonData) {
//       const { ID, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet } = item;

//       // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
//       const updateQuery = `
//         UPDATE ${tableName}
//         SET
//           KhoaDuyet = ?,
//           DaoTaoDuyet = ?,
//           TaiChinhDuyet = ?
//         WHERE ID = ?
//       `;

//       const updateValues = [KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, ID];

//       await connection.query(updateQuery, updateValues);
//     }

//     // Nếu tất cả cập nhật thành công
//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   } finally {
//     connection.release(); // Trả kết nối về pool sau khi hoàn tất
//   }
// };

const phongBanDuyet = async (req, res) => {
  const tableName = process.env.DB_TABLE_QC; // Bảng cần cập nhật
  const jsonData = req.body; // Dữ liệu đầu vào

  // Lấy kết nối từ pool
  const connection = await createPoolConnection();

  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      batches.push(jsonData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE ${tableName}
        SET 
          KhoaDuyet = CASE
      `;

      const updateValues = [];
      const ids = [];

      batch.forEach((item) => {
        const { ID, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet } = item;
        updateQuery += ` WHEN ID = ? THEN ?`;
        updateValues.push(ID, KhoaDuyet);
        ids.push(ID);
      });

      updateQuery += ` END, DaoTaoDuyet = CASE `;

      batch.forEach((item) => {
        const { ID, DaoTaoDuyet } = item;
        updateQuery += ` WHEN ID = ? THEN ?`;
        updateValues.push(ID, DaoTaoDuyet);
      });

      updateQuery += ` END, TaiChinhDuyet = CASE `;

      batch.forEach((item) => {
        const { ID, TaiChinhDuyet } = item;
        updateQuery += ` WHEN ID = ? THEN ?`;
        updateValues.push(ID, TaiChinhDuyet);
      });

      updateQuery += ` END WHERE ID IN (${ids.map(() => "?").join(", ")})`;

      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật hàng loạt
      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    connection.release(); // Trả kết nối về pool
  }
};

const getDanhXung = (gioiTinh) => {
  return gioiTinh === "Nam" ? "Ông" : gioiTinh === "Nữ" ? "Bà" : "";
};

// const getGvmId = async (HoTen) => {
//   const query = "SELECT id_Gvm FROM `gvmoi` WHERE HoTen = ?";
//   const [rows] = await connection.promise().query(query, [HoTen]);

//   return rows[0].id_Gvm;
// };

const getGvmId = async (HoTen) => {
  const query = "SELECT id_Gvm FROM `gvmoi` WHERE HoTen = ?";

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [rows] = await connection.query(query, [HoTen]); // Thực hiện truy vấn
    return rows.length > 0 ? rows[0].id_Gvm : null; // Trả về id_Gvm hoặc null nếu không tìm thấy
  } catch (error) {
    console.error("Lỗi khi lấy id giảng viên mời:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// const getNhanvienId = async (HoTen) => {
//   const query = "SELECT id_User FROM `nhanvien` WHERE TenNhanVien = ?";
//   const [rows] = await connection.promise().query(query, [HoTen]);

//   return rows[0].id_User;
// };

const getNhanvienId = async (HoTen) => {
  const query = "SELECT id_User FROM `nhanvien` WHERE TenNhanVien = ?";

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [rows] = await connection.query(query, [HoTen]); // Thực hiện truy vấn
    return rows.length > 0 ? rows[0].id_User : null; // Trả về id_User hoặc null nếu không tìm thấy
  } catch (error) {
    console.error("Lỗi khi lấy id nhân viên:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// const hocPhanDaTonTai = async (TenHocPhan) => {
//   const query = `SELECT TenHocPhan FROM hocphan WHERE LOWER(REPLACE(TRIM(TenHocPhan), '  ', ' ')) = LOWER(REPLACE(TRIM(?), '  ', ' '))`;
//   const [rows] = await connection.promise().query(query, [TenHocPhan]);

//   return rows.length > 0; // Nếu có ít nhất một kết quả, môn học đã tồn tại
// };

const hocPhanDaTonTai = async (TenHocPhan) => {
  const query = `
    SELECT TenHocPhan 
    FROM hocphan 
    WHERE LOWER(REPLACE(TRIM(TenHocPhan), '  ', ' ')) = LOWER(REPLACE(TRIM(?), '  ', ' '))
  `;

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [rows] = await connection.query(query, [TenHocPhan]); // Thực hiện truy vấn
    return rows.length > 0; // Kiểm tra xem học phần có tồn tại hay không
  } catch (error) {
    console.error("Lỗi khi kiểm tra học phần:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// const themHocPhan = async (TenHocPhan, DVHT, Khoa) => {
//   const query = `
//     INSERT INTO hocphan (TenHocPhan, DVHT, Khoa)
//     VALUES (?, ?, ?)
//   `;
//   const values = [TenHocPhan, DVHT, Khoa];

//   await connection.promise().query(query, values);
// };

const themHocPhan = async (TenHocPhan, DVHT, Khoa) => {
  const query = `
    INSERT INTO hocphan (TenHocPhan, DVHT, Khoa)
    VALUES (?, ?, ?)
  `;
  const values = [TenHocPhan, DVHT, Khoa];

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    await connection.query(query, values); // Thực hiện truy vấn
  } catch (error) {
    console.error("Lỗi khi thêm học phần:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// Xét xem đã duyệt hết chưa để lưu
const TaiChinhCheckAll = async (Dot, KiHoc, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const connection = await createPoolConnection();

  try {
    const query = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const checkQuery = `
        SELECT TaiChinhDuyet FROM quychuan 
        WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?`;
      const [check, checkFields] = await connection.query(checkQuery, [
        MaPhongBan,
        Dot,
        KiHoc,
        NamHoc,
      ]);

      let checkAll = true;

      for (let j = 0; j < check.length; j++) {
        if (check[j].TaiChinhDuyet == 0) {
          checkAll = false;
          break;
        }
      }

      if (checkAll === true && check.length > 0) {
        kq += MaPhongBan + ",";
      }
    }
  } finally {
    if (connection) connection.release();
  }

  return kq;
};

// Tạo biến toàn cục để kiểm tra xem đã lưu hết dữ liệu chưa
//let tmp = 0;

// const updateAllTeachingInfo = async (req, res) => {
//   // const query2 = `
//   //     SELECT
//   //       qc.*,
//   //       gvmoi.*,
//   //       SUM(qc.QuyChuan) AS TongSoTiet,
//   //       SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS TenGiangVien
//   //     FROM quychuan qc
//   //     JOIN gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
//   //     WHERE qc.DaLuu = 0
//   //     GROUP BY gvmoi.HoTen;
//   //   `;
//   const query2 = `
// SELECT
//     qc.*,
//     gvmoi.*,
//     SUM(qc.QuyChuan) AS TongSoTiet,
//     MIN(qc.NgayBatDau) AS NgayBatDau,
//     MAX(qc.NgayKetThuc) AS NgayKetThuc
// FROM
//     quychuan qc
// JOIN
//     gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
// WHERE
//     qc.DaLuu = 0
// GROUP BY
//     gvmoi.HoTen;

// `;
//   try {
//     const [dataJoin] = await connection.promise().query(query2);

//     // Kiểm tra xem có dữ liệu không
//     if (!dataJoin || dataJoin.length === 0) {
//       return {
//         success: false,
//         message: "Không có dữ liệu để chèn.",
//       };
//     }

//     const firstItem = dataJoin[0]; // Lấy phần tử đầu tiên

//     // Lấy các thuộc tính Dot, Ki, Nam từ phần tử đầu tiên
//     const dot = firstItem.Dot; // Lấy thuộc tính Dot
//     const ki = firstItem.KiHoc; // Lấy thuộc tính Ki
//     const nam = firstItem.NamHoc; // Lấy thuộc tính Nam

//     const daDuyetHet = await TaiChinhCheckAll(dot, ki, nam);
//     const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

//     // Chuẩn bị dữ liệu để chèn từng loạt
//     //const insertValues = dataJoin.map((item) => {
//     const insertValues = await Promise.all(
//       dataJoin
//         .filter(
//           (item) =>
//             item.TaiChinhDuyet != 0 &&
//             item.DaLuu == 0 &&
//             daDuyetHetArray.includes(item.Khoa) // Kiểm tra sự tồn tại trong mảng
//         ) // Loại bỏ các mục có TaiChinhDuyet = 0
//         .map(async (item) => {
//           const {
//             ID,
//             id_Gvm,
//             DienThoai,
//             Email,
//             MaSoThue,
//             HoTen,
//             NgaySinh,
//             HocVi,
//             ChucVu,
//             HSL,
//             CCCD,
//             NgayCapCCCD,
//             NoiCapCCCD,
//             DiaChi,
//             STK,
//             NganHang,
//             NgayBatDau,
//             NgayKetThuc,
//             KiHoc,
//             TongSoTiet, // Lấy cột tổng số tiết đã tính từ SQL
//             QuyChuan,
//             Dot,
//             NamHoc,
//             MaPhongBan,
//             KhoaDuyet,
//             DaoTaoDuyet,
//             TaiChinhDuyet,
//             GioiTinh,
//           } = item;

//           req.session.tmp++;

//           const DanhXung = getDanhXung(GioiTinh);
//           // const getDanhXung = (GioiTinh) => {
//           //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
//           // };
//           let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
//           let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
//           let TruThue = 0; // Giả định không thu thuế
//           let MaBoMon = 0; // Giá trị mặc định là 0

//           return [
//             id_Gvm,
//             DienThoai,
//             Email,
//             MaSoThue,
//             DanhXung,
//             HoTen,
//             NgaySinh,
//             HocVi,
//             ChucVu,
//             HSL,
//             CCCD,
//             NgayCapCCCD,
//             NoiCapCCCD,
//             DiaChi,
//             STK,
//             NganHang,
//             NgayBatDau,
//             NgayKetThuc,
//             KiHoc,
//             SoTiet,
//             SoTien,
//             TruThue,
//             Dot,
//             NamHoc,
//             MaPhongBan,
//             MaBoMon,
//             KhoaDuyet,
//             DaoTaoDuyet,
//             TaiChinhDuyet,
//           ];
//         })
//     );

//     // Kiểm tra xem insertValues có rỗng không
//     if (
//       insertValues.length === 0 ||
//       insertValues.some((row) => row.length === 0)
//     ) {
//       return {
//         success: false,
//         message: "Không có dữ liệu hợp lệ để chèn.",
//       };
//     }

//     // Định nghĩa câu lệnh chèn
//     const queryInsert = `
//       INSERT INTO hopdonggvmoi (
//         id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
//         DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
//         Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet
//       ) VALUES ?;
//     `;

//     // Thực hiện câu lệnh chèn
//     await connection.promise().query(queryInsert, [insertValues]);

//     // Trả về kết quả thành công
//     return { success: true, message: "Dữ liệu đã được chèn thành công!" };
//   } catch (err) {
//     console.error("Lỗi:", err.message); // Ghi lại lỗi để gỡ lỗi
//     return {
//       success: false,
//       message: "Đã xảy ra lỗi trong quá trình lưu hợp đồng",
//     };
//   }
// };

const saveDataGvmDongHocPhi = async (req, res) => {
  const { dot, ki, namHoc } = req.body;

  // Lưu hệ đóng học phí

  // Lưu hệ mật mã
  const query2 = `
    SELECT
        qc.Khoa, qc.HeDaoTao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh,
        SUM(qc.QuyChuan) AS TongSoTiet,
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc
    FROM
        quychuan qc
    JOIN
        gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
    WHERE
        qc.DaLuu = 0 AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.HeDaoTao = 'Đóng học phí'
    GROUP BY
        qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh;
    `;

  const value = [dot, ki, namHoc];

  try {
    const [dataJoin] = await pool.query(query2, value);

    // Kiểm tra xem có dữ liệu không
    if (!dataJoin || dataJoin.length === 0) {
      console.log("Không có dữ liệu hợp đồng");
      return;
    }

    const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

    // Chuẩn bị dữ liệu để chèn từng loạt
    //const insertValues = dataJoin.map((item) => {
    const insertValues = await Promise.all(
      dataJoin
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.Khoa) // Kiểm tra sự tồn tại trong mảng
        ) // Loại bỏ các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          const {
            id_Gvm,
            DienThoai,
            Email,
            MaSoThue,
            HoTen,
            NgaySinh,
            HocVi,
            ChucVu,
            HSL,
            CCCD,
            NgayCapCCCD,
            NoiCapCCCD,
            DiaChi,
            STK,
            NganHang,
            NgayBatDau,
            NgayKetThuc,
            KiHoc,
            TongSoTiet, // Lấy cột tổng số tiết đã tính từ SQL
            QuyChuan,
            Dot,
            NamHoc,
            MaPhongBan,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            GioiTinh,
            HeDaoTao,
          } = item;

          req.session.tmp++;

          const DanhXung = getDanhXung(GioiTinh);
          // const getDanhXung = (GioiTinh) => {
          //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
          // };
          let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
          let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
          let TruThue = 0; // Giả định không thu thuế
          let MaBoMon = 0; // Giá trị mặc định là 0

          return [
            id_Gvm,
            DienThoai,
            Email,
            MaSoThue,
            DanhXung,
            HoTen,
            NgaySinh,
            HocVi,
            ChucVu,
            HSL,
            CCCD,
            NgayCapCCCD,
            NoiCapCCCD,
            DiaChi,
            STK,
            NganHang,
            NgayBatDau,
            NgayKetThuc,
            KiHoc,
            SoTiet,
            SoTien,
            TruThue,
            Dot,
            NamHoc,
            MaPhongBan,
            MaBoMon,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            HeDaoTao,
          ];
        })
    );

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO hopdonggvmoi (
        id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
        DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
        Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, HeDaoTao
      ) VALUES ?;
    `;

    // Thực hiện câu lệnh chèn
    if (insertValues.length > 0) {
      await pool.query(queryInsert, [insertValues]);
    }

    // Trả về kết quả thành công
    return;
  } catch (err) {
    console.error("Lỗi:", err.message); // Ghi lại lỗi để gỡ lỗi
    return {
      success: false,
      message: "Đã xảy ra lỗi trong quá trình lưu hợp đồng",
    };
  }
};

const saveDataGvmMatMa = async (req, res) => {
  const { dot, ki, namHoc } = req.body;

  // Lưu hệ đóng học phí

  // Lưu hệ mật mã
  const query2 = `
    SELECT
        qc.Khoa, qc.HeDaoTao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh,
        SUM(qc.QuyChuan) AS TongSoTiet,
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc
    FROM
        quychuan qc
    JOIN
        gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
    WHERE
        qc.DaLuu = 0 AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.HeDaoTao = 'Mật mã'
    GROUP BY
        qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh;
    `;

  const value = [dot, ki, namHoc];

  try {
    const [dataJoin] = await pool.query(query2, value);

    // Kiểm tra xem có dữ liệu không
    if (!dataJoin || dataJoin.length === 0) {
      console.log("Không có dữ liệu hợp đồng");
      return;
    }

    const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

    // Chuẩn bị dữ liệu để chèn từng loạt
    //const insertValues = dataJoin.map((item) => {
    const insertValues = await Promise.all(
      dataJoin
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.Khoa) // Kiểm tra sự tồn tại trong mảng
        ) // Loại bỏ các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          const {
            id_Gvm,
            DienThoai,
            Email,
            MaSoThue,
            HoTen,
            NgaySinh,
            HocVi,
            ChucVu,
            HSL,
            CCCD,
            NgayCapCCCD,
            NoiCapCCCD,
            DiaChi,
            STK,
            NganHang,
            NgayBatDau,
            NgayKetThuc,
            KiHoc,
            TongSoTiet, // Lấy cột tổng số tiết đã tính từ SQL
            QuyChuan,
            Dot,
            NamHoc,
            MaPhongBan,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            GioiTinh,
            HeDaoTao,
          } = item;

          req.session.tmp++;

          const DanhXung = getDanhXung(GioiTinh);
          // const getDanhXung = (GioiTinh) => {
          //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
          // };
          let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
          let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
          let TruThue = 0; // Giả định không thu thuế
          let MaBoMon = 0; // Giá trị mặc định là 0

          return [
            id_Gvm,
            DienThoai,
            Email,
            MaSoThue,
            DanhXung,
            HoTen,
            NgaySinh,
            HocVi,
            ChucVu,
            HSL,
            CCCD,
            NgayCapCCCD,
            NoiCapCCCD,
            DiaChi,
            STK,
            NganHang,
            NgayBatDau,
            NgayKetThuc,
            KiHoc,
            SoTiet,
            SoTien,
            TruThue,
            Dot,
            NamHoc,
            MaPhongBan,
            MaBoMon,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            HeDaoTao,
          ];
        })
    );

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO hopdonggvmoi (
        id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
        DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
        Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, HeDaoTao
      ) VALUES ?;
    `;

    // Thực hiện câu lệnh chèn
    if (insertValues.length > 0) {
      await pool.query(queryInsert, [insertValues]);
    }

    // Trả về kết quả thành công
    return { success: true, message: "Dữ liệu đã được chèn thành công!" };
  } catch (err) {
    console.error("Lỗi:", err.message); // Ghi lại lỗi để gỡ lỗi
    return {
      success: false,
      message: "Đã xảy ra lỗi trong quá trình lưu hợp đồng",
    };
  }
};

const getGvmList = async (req, res) => {
  const query = `SELECT * FROM gvmoi`;

  try {
    const [data] = await pool.query(query);
    return data;
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình lấy dữ liệu." });
  }
};

const getNvList = async (req, res) => {
  const query = `SELECT * FROM nhanvien`;

  try {
    const [data] = await pool.query(query);
    return data;
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình lấy dữ liệu." });
  }
};

const getHocPhanList = async (req, res) => {
  const query = `SELECT TenHocPhan FROM hocphan`;

  try {
    const [data] = await pool.query(query);
    return data;
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình lấy dữ liệu." });
  }
};

const insertGiangDay = async (
  req,
  res,
  gvmList,
  hocPhanList,
  daDuyetHetArray
) => {
  const { dot, ki, namHoc } = req.body;

  const query2 = `
    SELECT
      qc.*, 
      gvmoi.*, 
      SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS TenGiangVien
    FROM quychuan qc
    JOIN gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
    WHERE 
    qc.DaLuu = 0 AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND MoiGiang = 1
  `;

  const value = [dot, ki, namHoc];

  try {
    const [dataJoin] = await pool.query(query2, value);

    // const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    // const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

    // Chuẩn bị dữ liệu để chèn từng loạt
    const insertValues = await Promise.all(
      dataJoin
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.Khoa)
        ) // Bỏ qua các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          const {
            ID,
            Khoa,
            MoiGiang,
            SoTinChi,
            LopHocPhan,
            GiaoVien,
            GiaoVienGiangDay,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            MaHocPhan,
            TenLop,
            Dot,
            BoMon,
            HeDaoTao,
          } = item;

          req.session.tmp++;

          const TenHocPhan = LopHocPhan;
          const gv1 = GiaoVienGiangDay ? GiaoVienGiangDay.split(" - ") : [];
          let gv = gv1[0];
          let id_Gvm = 1;
          let id_User = 1;

          // Tạo giá trị cho Mã Học Phần
          const maHocPhan = item.MaHocPhan || 0; // Nếu MaHocPhan là null hoặc undefined thì thay bằng 0

          // Dùng forEach để duyệt qua mảng và Lấy id_Gvm khi giảng viên mới giảng
          gvmList.forEach((giangVien) => {
            if (giangVien.HoTen === gv1[0]) {
              id_Gvm = giangVien.id_Gvm; // Gán id
            }
          });

          // console.log("id = ", id_Gvm);

          const exists = hocPhanList.some(
            (hocPhan) => hocPhan.TenHocPhan === TenHocPhan
          )
            ? 1
            : 0;

          if (exists == 0) {
            await themHocPhan(TenHocPhan, SoTinChi, Khoa);
          }

          // Trả về mảng các giá trị đã chờ để đưa vào câu INSERT
          return [
            gv,
            SoTinChi,
            TenHocPhan,
            id_User,
            id_Gvm,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            maHocPhan,
            TenLop,
            Dot,
            Khoa,
            BoMon,
            HeDaoTao,
          ];
        })
    );

    // Kiểm tra xem có dữ liệu để chèn không
    if (insertValues.length === 0) {
      return { success: false, message: "Không có dữ liệu để chèn!" };
    }

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO giangday (
        GiangVien, SoTC, TenHocPhan, id_User, id_Gvm, LenLop, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, 
        QuyChuan, HocKy, NamHoc, MaHocPhan, Lop, Dot, Khoa, BoMon, HeDaoTao
      ) VALUES ?;
    `;

    // Thực hiện câu lệnh chèn
    await pool.query(queryInsert, [insertValues]);
    // Trả về kết quả thành công
    return { success: true, message: "Dữ liệu đã được chèn thành công!" };
  } catch (err) {
    console.error(err); // Ghi lại lỗi để gỡ lỗi
    return {
      success: false,
      message: "Đã xảy ra lỗi trong quá trình thêm dl vào giảng dạy",
    };
  }
};

const insertGiangDay2 = async (
  req,
  res,
  nvList,
  hocPhanList,
  daDuyetHetArray
) => {
  const { dot, ki, namHoc } = req.body;

  const query2 = `
    SELECT
      qc.*,
      nhanvien.*,
      SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS TenGiangVien
    FROM quychuan qc
    JOIN nhanvien ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = nhanvien.TenNhanVien
    WHERE 
    qc.DaLuu = 0 AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND MoiGiang = 0
  `;

  const value = [dot, ki, namHoc];
  try {
    const [dataJoin] = await pool.query(query2, value);

    // Chuẩn bị dữ liệu để chèn từng loạt
    const insertValues = await Promise.all(
      dataJoin
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.Khoa)
        ) // Bỏ qua các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          //dataJoin.map(async (item) => {
          const {
            ID,
            Khoa,
            MoiGiang,
            SoTinChi,
            LopHocPhan,
            GiaoVien,
            GiaoVienGiangDay,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            MaHocPhan,
            TenLop,
            Dot,
            BoMon,
            HeDaoTao,
          } = item;

          req.session.tmp++;

          const TenHocPhan = LopHocPhan;

          const gv1 = GiaoVienGiangDay ? GiaoVienGiangDay.split(" - ") : [];
          let gv = gv1[0];
          let id_Gvm = 1;
          let id_User = 1;

          // Tạo giá trị cho Mã Học Phần
          const maHocPhan = item.MaHocPhan || 0; // Nếu MaHocPhan là null hoặc undefined thì thay bằng 0

          // Dùng forEach để duyệt qua mảng và Lấy id_User
          nvList.forEach((giangVien) => {
            if (
              giangVien.TenNhanVien.toLowerCase().trim() ==
              gv1[0].toLowerCase().trim()
            ) {
              id_User = giangVien.id_User; // Gán id
            }
          });

          const exists = hocPhanList.some(
            (hocPhan) => hocPhan.TenHocPhan === TenHocPhan
          )
            ? 1
            : 0;

          //const exists = await hocPhanDaTonTai(TenHocPhan);
          // console.log("Học phần đã tồn tại:", exists); // In ra giá trị tồn tại

          if (exists == 0) {
            await themHocPhan(TenHocPhan, SoTinChi, Khoa);
          }

          // Trả về mảng các giá trị đã chờ để đưa vào câu INSERT
          return [
            gv,
            SoTinChi,
            TenHocPhan,
            id_User,
            id_Gvm,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            maHocPhan,
            TenLop,
            Dot,
            Khoa,
            BoMon,
            HeDaoTao,
          ];
        })
    );

    // Kiểm tra xem có dữ liệu để chèn không
    if (insertValues.length === 0) {
      return { success: false, message: "Không có dữ liệu để chèn!" };
    }

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO giangday (
        GiangVien, SoTC, TenHocPhan, id_User, id_Gvm, LenLop, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, 
        QuyChuan, HocKy, NamHoc, MaHocPhan, Lop, Dot, Khoa, BoMon, HeDaoTao
      ) VALUES ?;
    `;

    // Thực hiện câu lệnh chèn
    await pool.query(queryInsert, [insertValues]);
    // Trả về kết quả thành công
    return { success: true, message: "Dữ liệu đã được chèn thành công!" };
  } catch (err) {
    console.error(err); // Ghi lại lỗi để gỡ lỗi
    return {
      success: false,
      message: "Đã xảy ra lỗi trong quá trình cập nhật thông tin.",
    };
  }
};

const submitData2 = async (req, res) => {
  try {
    const gvmList = await getGvmList(req, res);
    const nvList = await getNvList(req, res);
    const hocPhanList = await getHocPhanList(req, res);
    const { dot, ki, namHoc } = req.body;
    const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    const daDuyetHetArray = daDuyetHet.split(",").filter((item) => item !== ""); // Chuyển đổi thành mảng và loại bỏ phần tử rỗng

    // Thực hiện các cập nhật và thêm dữ liệu song song
    const [updateResult, update2, insertResult] = await Promise.all([
      saveDataGvmDongHocPhi(req, res), // Hợp đồng hệ đóng học phí
      saveDataGvmMatMa(req, res), // Hợp đồng hệ mật mã
      insertGiangDay2(req, res, nvList, hocPhanList, daDuyetHetArray),
      insertGiangDay(req, res, gvmList, hocPhanList, daDuyetHetArray),
    ]);

    if (req.session.tmp == 0) {
      req.session.tmp = 0;
      return res.json({ message: "Dữ liệu đã được cập nhật đầy đủ" });
    } else {
      const DaLuu = 1;
      const placeholders = daDuyetHetArray.map(() => "?").join(", ");
      const updateQuery = `UPDATE quychuan SET DaLuu = ? WHERE Khoa IN (${placeholders});`;
      await pool.query(updateQuery, [DaLuu, ...daDuyetHetArray]);
    }

    // Đặt lại giá trị cho req.session.tmp
    req.session.tmp = 0;

    // Chỉ trả về dữ liệu
    res.json({
      message: "Lưu dữ liệu thành công",
      updateResult,
      update2,
      insertResult,
    });
  } catch (err) {
    console.error("Lỗi không xác định:", err);
    return res.status(500).json({ error: "Đã xảy ra lỗi không xác định." });
  }
};

module.exports = {
  handleUploadAndRender,
  importJSONToDB,
  importTableQC,
  importTableTam,
  checkFile,
  deleteFile,
  updateChecked,
  saveDataGvmDongHocPhi,
  submitData2,
  updateQC,
  capNhatTen_BoMon,
  checkDataQC,
  phongBanDuyet,
  updateBanHanh,
  updateDateAll,
};
