const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth"); // Sử dụng mammoth để đọc file Word

const XLSX = require("xlsx");

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

  const filePath = req.file.path;

  console.log("Upload file path: " + filePath);

  console.log(`[Import ĐA] File uploaded: ${req.file.originalname}`);


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
    let tableData;

    if (fileExtension === ".pdf") {
      // Xử lý file PDF
      console.log('[Import ĐA] Xử lý file PDF...');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      content = pdfData.text; // Nội dung PDF dạng text

      tableData = processPdfFile(content);
    } else if (fileExtension === ".docx") {
      // Xử lý file Word (DOCX)
      console.log('[Import ĐA] Xử lý file DOCX...');
      content = await processWordFile(filePath);
      tableData = processWordData(content);
    } else if (fileExtension === ".xlsx") {
      // Xử lý file Excel (XLSX)
      console.log('[Import ĐA] Xử lý file XLSX...');
      content = await processExcelFile(filePath);
      tableData = processExcelData(content);
    } else {
      return res
        .status(400)
        .json({ message: "Unsupported file type", status: "error" });
    }

    console.log(`[Import ĐA] Xử lý thành công ${tableData.length} đồ án`);
    res.json({
      message: "File uploaded and processed successfully",
      content: tableData,
      duplicateGV: duplicateGV, // Danh sách các giảng viên bị trùng
      allGV: allGV, // Danh sách tất cả giảng viên
    });
  } catch (err) {
    console.error("[Import ĐA] Lỗi khi xử lý file:", err.message);
    res.status(500).json({ message: "Lỗi khi xử lý file!", error: err.message });
  } finally {
    // Xóa file tạm nếu tồn tại
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('[Import ĐA] Đã xóa file tạm');
      }
    } catch (unlinkErr) {
      console.error('[Import ĐA] Không thể xóa file tạm:', unlinkErr.message);
    }
  }
}

// Loại bỏ học hàm, học vị
function cleanName(name) {
  const prefixes = [
    "PGS\\.?", // Phó Giáo sư (PGS, PGS.)
    "CN\\.?", // Cử nhân (CN,CN.)
    "TS\\.?", // Tiễn sĩ (TS, TS.)
    "KS\\.?", // Kỹ sư (KS, KS.)
    "T(?:H)?S\\.?", // Tiến sĩ (TS, THS, thS, ...)
    "PGS\\.T(?:H)?S\\.?", // PGS.TS hoặc PGS.THS.
    "GS\\.T(?:H)?S\\.?", // GS.TS hoặc GS.THS.
  ];

  // Chỉnh regex để loại bỏ cả trường hợp có hoặc không có dấu cách sau học hàm/học vị
  const combinedRegex = new RegExp(`\\b(${prefixes.join("|")})\\.?\\s*`, "gi");

  // Thực hiện thay thế mà không làm thay đổi định dạng gốc của phần còn lại
  name = name.replace(combinedRegex, "").trim();

  // Loại bỏ dấu ngoặc và nội dung bên trong (nếu có)
  name = name.replace(/\(.*?\)/g, "").trim();

  // Loại bỏ ký tự đặc biệt, chỉ giữ lại chữ cái (cả in hoa lẫn in thường) và khoảng trắng
  name = name.replace(/[^a-zA-ZÀ-Ỹà-ỹ\s]/g, "").trim();

  return name;
}

// Chuẩn hóa lại tên giảng viên 2 trường hợp chuỗi chuẩn NFC và NFD
function normalizeString(str) {
  if (!str) return "";
  return str
    .normalize("NFC") // Chuyển đổi tổ hợp (a + dấu) thành dựng sẵn (ạ) -> Fix lỗi 17 vs 15 ký tự
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Xóa các ký tự zero-width (ẩn) nếu có
    .trim(); // Xóa khoảng trắng đầu cuối
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
    "STT",
    "Sinh viên",
    "Mã SV",
    "Tên đề tài",
    "Họ tên Cán bộ Giảng viên hướng dẫn",
    "Đơn vị công tác",
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

    // Bỏ qua nếu dòng chứa bất kỳ từ khóa tiêu đề nào
    if (headerKeywords.some((keyword) => line.includes(keyword))) {
      return;
    }

    // console.log(line);
    // Nếu đã qua 5 dòng tiêu đề, bắt đầu xử lý bảng
    if (headerCount >= 5) {
      // Nếu dòng bắt đầu bằng số TT, đây là dòng mới
      const matchTT = line.match(/^\d+$/); // Kiểm tra dòng chỉ có số
      // const matchTT = line.match(/^\d+\.$/);

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
        /*
    "PGS\\.?", // Phó Giáo sư (PGS, PGS.)
    "CN\\.?", // Cử nhân (CN,CN.)
    "TS\\.?", // Tiễn sĩ (TS, TS.)
    "KS\\.?", // Kỹ sư (KS, KS.)
    "T(?:H)?S\\.?", // Tiến sĩ (TS, THS, thS, ...)
    "PGS\\.T(?:H)?S\\.?", // PGS.TS hoặc PGS.THS.
    "GS\\.T(?:H)?S\\.?", // GS.TS hoặc GS.THS.
        */

        line.startsWith("1.") ||
        line.startsWith("2.") ||
        line.toLowerCase().startsWith("ts.") ||
        line.toLowerCase().startsWith("ts") ||
        line.toLowerCase().startsWith("ths.") ||
        line.toLowerCase().startsWith("ths") ||
        line.toLowerCase().startsWith("ks.") ||
        line.toLowerCase().startsWith("ks") ||
        line.toLowerCase().startsWith("cn.") ||
        line.toLowerCase().startsWith("cn") ||
        line.toLowerCase().startsWith("pgs.") ||
        line.toLowerCase().startsWith("pgs") ||
        line.toLowerCase().startsWith("pgs.ts.") ||
        line.toLowerCase().startsWith("pgs.ts") ||
        line.toLowerCase().startsWith("pgs.ths.") ||
        line.toLowerCase().startsWith("pgs.ths") ||
        line.toLowerCase().startsWith("gs.ts.") ||
        line.toLowerCase().startsWith("gs.ts") ||
        line.toLowerCase().startsWith("gs.ths.") ||
        line.toLowerCase().startsWith("gs.ths")
      ) {
        currentRow.GiangVienDefault += line + "\n";

        line = cleanName(line);
        // console.log("sau clean " + line)

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

  const invalidIndexes = tableData
    .map((row, index) =>
      !Array.isArray(row.GiangVien) || row.GiangVien.length === 0 ? index : -1
    )
    .filter((index) => index !== -1);

  // console.log(invalidIndexes);

  const result = tableData.map((row) => {
    let [GiangVien1, GiangVien2] = row.GiangVien.join(", ")
      .split(",")
      .map((gv) => gv.trim()); // Loại bỏ khoảng trắng đầu cuối

    // Tạo biến chuẩn hóa để dùng cho việc SO SÁNH (giữ nguyên chữ hoa thường để hiển thị đẹp, hoặc lowerCase nếu cần)
    const gv1Compare = normalizeString(GiangVien1).toLowerCase();
    const gv2Compare = GiangVien2 ? normalizeString(GiangVien2).toLowerCase() : "";

    // So sánh tên giảng viên trong đồ án với tên trong csdl xem đã có chưa
    // Kiểm tra GiangVien1
    const isGiangVien1InUniqueGV = uniqueGV.some(
      (giangVien) => normalizeString(giangVien.HoTen).toLowerCase() === gv1Compare
    );

    // Kiểm tra GiangVien2
    let isGiangVien2InUniqueGV = false;
    if (GiangVien2 !== undefined) {
      isGiangVien2InUniqueGV = uniqueGV.some(
        (giangVien) => normalizeString(giangVien.HoTen).toLowerCase() === gv2Compare
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

const processExcelFile = async (filePath) => {
  try {
    // Đọc tệp Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Lấy tên của bảng tính đầu tiên
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); // Chuyển bảng tính thành JSON

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

    console.log("Convert file đồ án excel thành công");
    console.log("Định dạng dữ liệu convert: ", jsonObjects[0]);
    return jsonObjects;
  } catch (err) {
    // Xử lý lỗi nếu có
    throw new Error("Cannot read file!: " + err.message);
  }
};

function processExcelData(dataInput) {
  // Nếu đầu vào không phải là mảng, trả về mảng rỗng
  if (!Array.isArray(dataInput)) {
    return [];
  }

  return dataInput.map((item) => {
    // Lấy các thông tin cơ bản
    const TT = item.STT !== undefined ? String(item.STT) : "";
    const SinhVien = item["Sinh viên"] ? item["Sinh viên"].trim() : "";
    const MaSV = item["Mã SV"] ? item["Mã SV"].trim() : "";
    const TenDeTai = item["Tên đề tài"] ? item["Tên đề tài"].trim() : "";
    // const DonViCongTac = item["Đơn vị công tác"] ? item["Đơn vị công tác"].trim() : "";

    // Xử lý trường giảng viên
    // Lấy chuỗi gốc và lưu lại giá trị này
    const lecturerRaw = item["Họ tên Cán bộ giảng viên hướng dẫn"] || "";
    const GiangVienDefault = lecturerRaw;

    // Tách chuỗi giảng viên thành các dòng (dựa trên ký tự xuống dòng)
    let lecturerLines = lecturerRaw.split(/\r?\n/);

    // Với mỗi dòng, loại bỏ số thứ tự và các tiền tố như "TS.", "ThS.", "PGS.TS."…
    let lecturers = lecturerLines
      .map((line) => {
        return (
          line
            .trim()
            // Bước 1: Loại bỏ các số thứ tự như "1.", "2.",...
            .replace(/^(?:\d+\.\s*)+/g, "")
            // Bước 2: Loại bỏ các tiền tố giảng viên như "PGS.TS.", "KS.", "ThS.", "TS."
            .replace(/(?:PGS\.?\s*TS|KS|ThS|TS)\.\s*/gi, "")
            .trim()
        );
      })
      .filter((line) => line !== "");

    // Nếu không có dòng nào hợp lệ, thêm một chuỗi rỗng vào mảng
    if (lecturers.length === 0) {
      lecturers.push("");
    }

    // // Xác định Giảng viên 1 và Giảng viên 2 dựa vào mảng lecturers
    // let GiangVien1 = lecturers[0];
    // let GiangVien2 = lecturers[1];

    // // So sánh với danh sách uniqueGV (được định nghĩa bên ngoài hàm) để kiểm tra tính hợp lệ của tên
    // const isGiangVien1InUniqueGV = uniqueGV.some(gv => gv.HoTen.trim() === GiangVien1);
    // const isGiangVien2InUniqueGV = uniqueGV.some(gv => gv.HoTen.trim() === GiangVien2);

    // // Lưu lại tên thật (real) của giảng viên để so sánh bên client
    // const GiangVien1Real = GiangVien1;
    // const GiangVien2Real = GiangVien2;

    // if (!isGiangVien1InUniqueGV) {
    //   GiangVien1 = null;
    // }
    // if (!isGiangVien2InUniqueGV) {
    //   // Nếu có giá trị nhưng không hợp lệ thì gán chuỗi rỗng, nếu không có thì gán "không"
    //   GiangVien2 = GiangVien2 ? "" : "không";
    // }
    // if (!GiangVien2) {
    //   GiangVien2 = "không";
    // }

    let [GiangVien1, GiangVien2] = lecturers
      .join(", ")
      .split(",")
      .map((gv) => gv.trim());

    // So sánh tên giảng viên với danh sách uniqueGV (được định nghĩa bên ngoài hàm)
    const isGiangVien1InUniqueGV = uniqueGV.some(
      (gv) => gv.HoTen.trim() === GiangVien1
    );
    const isGiangVien2InUniqueGV = uniqueGV.some(
      (gv) => gv.HoTen.trim() === GiangVien2
    );

    // Lưu lại tên thật của giảng viên để so sánh bên client
    let gv1Real = GiangVien1;
    let gv2Real = GiangVien2;

    // Nếu GiangVien1 không hợp lệ, gán null
    if (!isGiangVien1InUniqueGV) {
      GiangVien1 = null;
    }
    // Với GiangVien2: nếu có giá trị nhưng không hợp lệ thì gán chuỗi rỗng,
    // nếu không có giá trị (undefined) thì gán "không"
    if (!isGiangVien2InUniqueGV && GiangVien2 !== undefined) {
      GiangVien2 = "";
    }
    if (GiangVien2 === undefined) {
      GiangVien2 = "không";
    }

    return {
      TT,
      SinhVien,
      MaSV,
      TenDeTai,
      GiangVienDefault,
      // DonViCongTac,
      GiangVien: lecturers,
      GiangVien1,
      GiangVien2,
      GiangVien1Real: gv1Real,
      GiangVien2Real: gv2Real,
      NgayBatDau: null,
      NgayKetThuc: null,
    };
  });
}

function cutUntilTT(data) {
  let index = data.indexOf("STT"); // Tìm vị trí của "TT"
  return index !== -1 ? data.slice(index) : data; // Nếu có "TT", cắt từ đó trở đi; nếu không, giữ nguyên
}

// Xử lý file Word bằng Mammoth
async function processWordFile(filePath) {
  try {
    console.log('[Import ĐA] Đọc file Word:', filePath);
    const fileBuffer = fs.readFileSync(filePath);

    // Chuyển file Word sang text
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const data = cutUntilTT(result.value);
    console.log('[Import ĐA] Đọc file Word thành công');
    return data;
  } catch (error) {
    console.error("[Import ĐA] Lỗi khi đọc file Word:", error.message);
    throw new Error(`Không thể xử lý file Word: ${error.message}`);
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
        line.toLowerCase().startsWith("pgs.") ||
        line.toLowerCase().startsWith("pgs.ts.")
      ) {
        // Nếu dòng bắt đầu bằng "1.", "2.", hoặc "TS.", đây là thông tin Giảng viên
        // Bỏ phần "1. TS", "2. TS", "TS"
        currentRow.GiangVienDefault += line + "\n";

        line = line.replace(
          /^\d+\.\s*(PGS\.?\s*TS|KS|ThS|TS)\.\s*|^(PGS\.?\s*TS|KS|ThS|TS)\.\s*/i,
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

const saveToDB = async (req, res) => {
  const NamHoc = req.query.namHoc;
  const MaPhongBan = req.query.MaPhongBan;
  const data = req.body;

  console.log(`[Import ĐA] Bắt đầu lưu ${data.length} đồ án vào DB`);
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

    console.log(`[Import ĐA] Lưu thành công ${result.affectedRows} bản ghi`);
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
  const Ki = req.query.Ki;
  const he_dao_tao = req.query.he_dao_tao;
  const data = req.body;
  const defaultDate = "2000-01-01"; // hoặc ngày nào bạn muốn làm mặc định

  console.log(`[Import ĐA] Lưu ${data.length} đồ án - Khoa: ${MaPhongBan}, Kỳ: ${Ki}, Đợt: ${Dot}`);
  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB

    const query = `SELECT * FROM kitubatdau`;
    const [rows] = await connection.query(query);

    // Tạo mảng 2 chiều chứa tất cả các bản ghi
    const values = data.map((row) => {
      // Tạo Khóa đào tạo
      // const KhoaDaoTao = row.MaSV.slice(0, 4);
      const match = row.MaSV.match(/^([A-Za-z]+)(\d{2})/);
      const KhoaDaoTao = match ? match[1] + match[2] : null;

      const KhoaDuyet = 0,
        DaoTaoDuyet = 0,
        TaiChinhDuyet = 0,
        DaLuu = 0,
        DaBanHanh = 0;

      const startDate =
        !row.NgayBatDau || row.NgayBatDau.trim() === ""
          ? defaultDate
          : row.NgayBatDau;
      const endDate =
        !row.NgayKetThuc || row.NgayKetThuc.trim() === ""
          ? defaultDate
          : row.NgayKetThuc;

      // Biến để kiểm tra nếu "hệ đóng học phí" đã được tìm thấy
      let DoiTuong = "Việt Nam"; // Mặc định là "Việt Nam"

      for (const kitubatdau of rows) {
        const prefix = kitubatdau.viet_tat; // Lấy giá trị viet_tat
        // Kiểm tra chuỗi bắt đầu bằng prefix và ký tự tiếp theo là số
        if (
          row.MaSV.startsWith(prefix) &&
          row.MaSV[prefix.length]?.match(/^\d$/)
        ) {
          DoiTuong = kitubatdau.doi_tuong;
        }
      }

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
        startDate, // Sử dụng giá trị đã chuyển đổi cho NgayBatDau
        endDate, // Sử dụng giá trị đã chuyển đổi cho NgayKetThuc
        MaPhongBan,
        row.SoQD || null,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        DaLuu,
        row.GiangVien1Real,
        row.GiangVien2Real,
        DaBanHanh,
        Dot,
        Ki,
        DoiTuong,
        he_dao_tao,
      ];
    });

    // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
    const sql = `INSERT INTO doantotnghiep (TT, SinhVien, MaSV, KhoaDaoTao, TenDeTai, GiangVienDefault, 
    GiangVien1, GiangVien2, NamHoc, NgayBatDau, NgayKetThuc, MaPhongBan, SoQD, KhoaDuyet, DaoTaoDuyet, 
    TaiChinhDuyet, Daluu, GiangVien1Real, GiangVien2Real, DaBanHanh, Dot, Ki, DoiTuong, he_dao_tao)
    VALUES ?`;

    // Thực thi câu lệnh SQL với mảng values
    const [result] = await connection.query(sql, [values]);

    // Ghi log việc import file đồ án thành công
    const logQuery = `
      INSERT INTO lichsunhaplieu 
      (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
    const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
    const khoa = req.session?.MaPhongBan || 'Unknown Department';
    const loaiThongTin = 'Import đồ án';
    const changeMessage = `${tenNhanVien} đã thêm mới ${result.affectedRows} đồ án từ file vào cơ sở dữ liệu. Học kỳ ${Ki}, đợt ${Dot}, năm học ${namHoc}, khoa ${MaPhongBan}, hệ đào tạo ${he_dao_tao}.`;

    await connection.query(logQuery, [
      userId,
      tenNhanVien,
      khoa,
      loaiThongTin,
      changeMessage
    ]);

    console.log(`[Import ĐA] Lưu thành công ${result.affectedRows} đồ án vào bảng doantotnghiep`);
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
  const { Khoa, Dot, Ki, Nam, he_dao_tao } = req.body;
  console.log(`[Import ĐA] Kiểm tra tồn tại: Khoa ${Khoa}, Kỳ ${Ki}, Đợt ${Dot}, Năm ${Nam}`);

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT EXISTS(SELECT 1 FROM doantotnghiep WHERE MaPhongBan = ? AND Dot = ? AND Ki = ? AND NamHoc = ? AND he_dao_tao = ?) AS exist;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [
      Khoa,
      Dot,
      Ki,
      Nam,
      he_dao_tao,
    ]);

    // Kết quả trả về từ cơ sở dữ liệu
    const exist = results[0].exist === 1; // True nếu tồn tại, False nếu không tồn tại

    console.log(`[Import ĐA] Dữ liệu ${exist ? 'đã tồn tại' : 'chưa tồn tại'}`);
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
  const { Khoa, Dot, Ki, Nam, he_dao_tao } = req.body;

  console.log(`[Import ĐA] Xóa dữ liệu cũ: Khoa ${Khoa}, Kỳ ${Ki}, Đợt ${Dot}`);
  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Query SQL để xóa row
    const sql = `DELETE FROM doantotnghiep WHERE MaPhongBan = ? AND Dot = ? AND Ki = ? AND NamHoc = ? AND he_dao_tao = ?`;

    // Thực hiện truy vấn
    const [results] = await connection.query(sql, [
      Khoa,
      Dot,
      Ki,
      Nam,
      he_dao_tao,
    ]);

    if (results.affectedRows === 0) {
      console.log('[Import ĐA] Không tìm thấy dữ liệu để xóa');
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    }

    console.log(`[Import ĐA] Xóa thành công ${results.affectedRows} bản ghi`);
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
