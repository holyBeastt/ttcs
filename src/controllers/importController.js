const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const { json, query } = require("express");
const { isNull } = require("util");
const mammoth = require("mammoth");
const JSZip = require("jszip");
const pdf = require("pdf-parse");

// Hàm kiểm tra một row có được merge từ cột đầu tiên đến cột cuối cùng hay không
// kiểm tra row chứa dòng chia Khoa
function isRowMerged(sheet, rowIndex, totalColumns) {
  const merges = sheet["!merges"] || [];
  return merges.some((range) => {
    return (
      range.s.r === rowIndex &&
      range.e.r === rowIndex &&
      range.s.c === 0 &&
      range.e.c === totalColumns - 1
    );
  });
}

// hàm v2 có thêm xử lí 1 sheet nhiều khoakhoa
async function convertExcelToJSON(filePath) {
  try {
    // Đọc file Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Đọc toàn bộ dữ liệu dưới dạng mảng 2D (mỗi phần tử là 1 row dưới dạng mảng)
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length === 0) {
      throw new Error("File Excel rỗng!");
    }

    // Tìm dòng chứa header. key nhận biết header là STT
    const headerRowIndex = rows.findIndex((row) => {
      return row[0] === "STT";
    });

    if (headerRowIndex === -1) {
      throw new Error(
        "Không tìm thấy dòng tiêu đề chứa STT, Số TC, Lớp học phần."
      );
    }

    // Xác định header và tổng số cột từ dòng tiêu đề
    const header = rows[headerRowIndex];
    const totalColumns = header.length;
    // Lấy các dòng dữ liệu phía sau dòng tiêu đề
    const dataRows = rows.slice(headerRowIndex + 1);

    const jsonObjects = [];
    const specialSubstring = "Các học phần thuộc Khoa";
    let currentKhoa = ""; // Biến lưu nhóm Khoa hiện tại (được xác định từ row merge)

    dataRows.forEach((row, i) => {
      // Tính chỉ số row thực trong file (với 0 là dòng đầu tiên)
      const actualRowIndex = headerRowIndex + 1 + i;

      // Nếu row được merge toàn bộ từ cột 0 đến totalColumns - 1
      if (isRowMerged(sheet, actualRowIndex, totalColumns)) {
        // Lấy giá trị của ô đầu tiên của dòng merge
        const cellValue = row[0] || "";
        // console.log(cellValue)
        // Sử dụng regex để tìm chuỗi sau từ "Khoa"
        // \S+ sẽ lấy phần chữ liên tiếp không có khoảng trắng sau "Khoa"
        const regex = /Khoa\s*(\S+)/i;
        const match = cellValue.match(regex);
        if (match && match[1]) {
          currentKhoa = match[1].trim();
        }
        // Dòng merge chỉ dùng để xác định nhóm, không thêm vào kết quả JSON
        return;
      }

      // Tạo đối tượng từ row: mapping các key (header) với giá trị tương ứng của row
      const obj = {};
      header.forEach((colName, index) => {
        // Loại bỏ \r\n trong key
        const cleanKey = colName.replace(/[\r\n]+/g, "");
        // Lấy giá trị và loại bỏ \r\n nếu là chuỗi
        let value = row[index] !== undefined ? row[index] : "";
        if (typeof value === "string") {
          value = value.replace(/[\r\n]+/g, "");
        }
        obj[cleanKey] = value;
      });

      // Luôn thêm key "Khoa" vào đối tượng, nếu không có dòng merge thì giá trị sẽ là ""
      obj["Khoa"] = currentKhoa.replace(/[\r\n]+/g, "");

      // Kiểm tra số lượng giá trị rỗng trong đối tượng
      const emptyCount = Object.values(obj).reduce((count, value) => {
        return (
          count +
          (value === "" || value === null || value === undefined ? 1 : 0)
        );
      }, 0);

      // Kiểm tra cả key và value xem có chứa chuỗi đặc biệt không
      const containsSpecial =
        Object.keys(obj).some((key) => key.includes(specialSubstring)) ||
        Object.values(obj).some(
          (val) => typeof val === "string" && val.includes(specialSubstring)
        );

      // Nếu có nhiều hơn 6 giá trị rỗng và không chứa chuỗi đặc biệt, bỏ qua đối tượng đó
      if (emptyCount > 6 && !containsSpecial) {
        return;
      }

      jsonObjects.push(obj);
    });

    // Nếu cần xóa file sau khi xử lý, có thể mở dòng dưới
    fs.unlinkSync(filePath);

    return jsonObjects;
  } catch (error) {
    throw new Error("Cannot read file!: " + error.message);
  }
}

// Hàm v1 có xử lí 1 sheet 1 khoa, nhiều sheet nhiều khoakhoa
// const convertExcelToJSON = async (filePath) => {
//   try {
//     const workbook = XLSX.readFile(filePath);
//     const sheetNames = workbook.SheetNames; // Lấy danh sách tất cả các sheet
//     let jsonObjects = [];

//     if (sheetNames.length === 1) {
//       // === Trường hợp 1: Chỉ có 1 sheet, giữ nguyên logic cũ ===
//       const sheetName = sheetNames[0];
//       const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//       const data = worksheet;
//       const header = data[0]; // Lấy tiêu đề
//       const keys = Object.keys(header);
//       const dataObjects = data.slice(1);

//       jsonObjects = dataObjects.map((values) => {
//         return keys.reduce((acc, key) => {
//           acc[header[key]] = values[key] !== undefined ? values[key] : 0;
//           return acc;
//         }, {});
//       });
//     } else {
//       // === Trường hợp 2: Có nhiều sheet, mỗi sheet thêm key "Khoa" ===
//       sheetNames.forEach((sheetName) => {
//         const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//         if (worksheet.length === 0) return; // Bỏ qua sheet rỗng

//         const header = worksheet[0];
//         const keys = Object.keys(header);
//         const dataObjects = worksheet.slice(1);

//         const sheetData = dataObjects.map((values) => {
//           const obj = keys.reduce((acc, key) => {
//             acc[header[key]] = values[key] !== undefined ? values[key] : 0;
//             return acc;
//           }, {});
//           obj.Khoa = sheetName; // Gán thêm key "Khoa"
//           return obj;
//         });

//         jsonObjects = jsonObjects.concat(sheetData);
//       });
//     }

//     fs.unlinkSync(filePath); // Xóa tệp sau khi xử lý

//     validateFileExcelQC(jsonObjects);
//     console.log("Convert file quy chuẩn thành công");
//     return jsonObjects;
//   } catch (err) {
//     throw new Error("Cannot read file!: " + err.message);
//   }
// };

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

// Hàm xử lí mảng chuỗi dữ liệu của các lớp thành mảng các đối tượng
const parseDataToObjects = (lines) => {
  console.log("Start func parseDataToObjects");
  const result = []; // Khởi tạo mảng kết quả để chứa các đối tượng
  let currentKhoa = "";
  let nextKhoa = "";
  lines.forEach((line, index) => {
    let currentItem = {}; // Khởi tạo đối tượng mới cho mỗi dòng

    // Lấy Khoa nếu như có dòng Khoa trong file, nếu không có thì phải chọn ở combobox
    line = line.trim(); // Loại bỏ khoảng trắng thừa ở đầu và cuối dòng
    if (line.toLowerCase().includes("khác")) {
      nextKhoa = "Khác"; // Nếu chứa "học phần khác", gán Khoa là "Khác"
      if (index == 0) {
        currentKhoa = nextKhoa;
      }
    } else if (line.includes("Trung tâm thực hành")) {
      nextKhoa = "Trung tâm thực hành"; // Nếu chứa "Trung tâm thực hành", gán Khoa là "Trung tâm thực hành"
      if (index == 0) {
        currentKhoa = nextKhoa;
      }
    } else if (line.includes("học phần thuộc Khoa")) {
      // console.log(line);
      const khoaMatch = line.match(
        /Các học phần thuộc Khoa\s+(.+?)(?=\s*STT|$)/
      );
      nextKhoa = khoaMatch[1].trim().replace(/\d+/g, ""); // Lấy tên Khoa từ dòng kiểm tra
      if (index == 0) {
        currentKhoa = nextKhoa;
      }
    }

    // Kiểm tra xem dòng có bắt đầu bằng một số theo định dạng "Số." hay không
    if (/^\d+\./.test(line)) {
      // Bước 2: Gắn TT (Số đầu dòng)
      // Tìm số đầu dòng (TT) và gắn vào đối tượng
      const ttMatch = line.match(/^\d+/);
      if (ttMatch) {
        currentItem["STT"] = ttMatch[0]; // Gắn giá trị TT (Số đầu dòng)
        line = line.replace(/^\d+\./, "").trim(); // Loại bỏ phần TT (bao gồm cả dấu chấm) khỏi dòng
      }

      // Gắn Khoa
      currentItem["Khoa"] = currentKhoa;

      currentKhoa = nextKhoa;

      // Bước 3: Gắn Số TC (là số đầu tiên sau TT)
      const tcMatch = line.match(/^\d+/); // Tìm số đầu tiên trong dòng
      if (tcMatch) {
        // Nếu tìm thấy số đầu tiên, gắn vào Số TC
        currentItem["Số TC"] = parseInt(tcMatch[0], 10); // Chuyển thành số nguyên
        line = line.replace(/^\d+/, "").trim(); // Loại bỏ Số TC khỏi dòng
      } else {
        // Nếu không tìm thấy số đầu tiên, gắn mặc định là 0
        currentItem["Số TC"] = 0;
      }

      // Bước 4: Gắn Lớp học phần (tất cả từ đầu dòng đến dấu đóng ngoặc đơn đầu tiên)
      // Tìm và lấy phần lớp học phần từ đầu dòng đến dấu đóng ngoặc đơn đầu tiên
      const classMatch = line.match(/^(.*?\))/); // Lấy tất cả đến dấu đóng ngoặc đơn đầu tiên
      if (classMatch) {
        currentItem["Lớp học phần"] = classMatch[0].trim(); // Gắn phần Lớp học phần (bao gồm dấu đóng ngoặc đơn)
        line = line.replace(classMatch[0], "").trim(); // Loại bỏ phần đã xử lý (Lớp học phần)
      }

      // Bước 5: Trích xuất tên giáo viên (bắt đầu từ sau dấu ngoặc đơn, đến trước số đầu tiên)
      // Tìm và trích xuất tên giáo viên từ sau dấu ngoặc đơn đến trước số đầu tiên
      const teacherMatch = line.match(/^(.*?)(\d+)/); // Lấy tất cả từ đầu dòng đến trước số đầu tiên
      if (teacherMatch) {
        currentItem["Giáo viên"] = teacherMatch[1].trim(); // Gắn phần trước số đầu tiên là tên giáo viên
        line = line.replace(teacherMatch[1], "").trim(); // Loại bỏ phần tên giáo viên khỏi dòng
      }

      // Bước 6: Trích xuất các số liệu
      // Tìm tất cả các số trong dòng, nếu không có thì trả về mảng rỗng
      const numbers = line.match(/(\d+(\.\d+)?)/g) || []; // Lấy tất cả các số, nếu không có thì trả về mảng rỗng

      // Gắn giá trị tương ứng cho các số liệu. Nếu thiếu giá trị thì gắn 0
      currentItem["Số tiết theo CTĐT"] = parseFloat(numbers[0] || 0);
      currentItem["Số SV"] = parseFloat(numbers[1] || 0);
      currentItem["Số tiết lên lớp được tính QC"] = parseFloat(numbers[2] || 0);
      currentItem["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] = parseFloat(
        numbers[3] || 0
      );
      currentItem["Hệ số lớp đông"] = parseFloat(numbers[4] || 0);
      currentItem["QC"] = parseFloat(numbers[5] || 0);

      // Thêm đối tượng đã hoàn thiện vào mảng kết quả
      result.push(currentItem);
    }
  });

  return result; // Trả về mảng kết quả chứa các đối tượng đã xử lý
};

// Hàm tách dữ liệu thô ( chuỗi văn bản ) ra thành mảng chuỗi các lớp
const splitAndCleanLines = (text) => {
  // Danh sách các ký tự hoặc từ cần loại bỏ (dùng "includes" để kiểm tra sự tồn tại của chuỗi)
  const unwantedWords = [
    // "STT",
    "Số TC",
    "Lớp học phần",
    "Giáo viên",
    "Giáo viên", // 2 Giáo viên này khác nhau đấy, nếu còn bị key nào thừa thì log kq ra console rồi copy vào đây
    "Số tiết theo CTĐT",
    "Số SV",
    "Số tiết lên lớp được tính QC",
    "Hệ số lên lớp ngoài giờ",
    "HC",
    "Thạc sĩ",
    "Tiến sĩ",
    "Hệ số lớp đông",
    "QC",
    "Ghi chú",
  ];

  // Loại bỏ các từ không mong muốn
  let cleanedText = text;
  unwantedWords.forEach((word) => {
    // Kiểm tra xem có từ cần loại bỏ trong văn bản hay không và loại bỏ
    if (cleanedText.includes(word)) {
      cleanedText = cleanedText.split(word).join(""); // Xóa tất cả các lần xuất hiện của từ
    }
  });

  cleanedText = cleanedText.replace(/\s+/g, " ").trim();

  // Biểu thức chính quy để tách chuỗi khi gặp số và dấu chấm, đảm bảo không có số tiếp theo
  const splitPattern = /\b\d+\.\s+/;

  // Tách chuỗi thành các phần nhỏ dựa vào dấu chấm và số
  const lines = cleanedText
    .split(splitPattern)
    .filter((part) => part.trim() !== "");

  const result = [];

  // Xử lý từng dòng đã tách
  lines.forEach((line, index) => {
    // Nếu dòng sau khi làm sạch không rỗng, thêm vào kết quả
    if (line !== "") {
      // Gắn chỉ mục cho các dòng từ dòng thứ 2 trở đi
      result.push(index > 0 ? `${index}. ${line.trim()}` : line.trim());
    }
  });

  // console.log(result);

  return result;
};

// convert file quy chuẩn dạng word bằng thư viện mamoth
const convertWordToJSON = async (filePath) => {
  const data = [];

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Trích xuất văn bản thô từ file docx
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    let text = result.value;

    // Thay thế tất cả các ký tự xuống dòng (bao gồm cả \r\n và \n) bằng dấu cách
    text = text.replace(/\r?\n/g, " ");

    // Xóa các khoảng trắng thừa (liên tiếp nhiều khoảng trắng thành một khoảng trắng)
    text = text.replace(/\s+/g, " ").trim();

    // Tách văn bản thành các phần bắt đầu bằng chỉ mục số và dấu chấm
    const splitData = splitAndCleanLines(text);
    // Chuyển văn bản thành dạng các đối tượng
    const jsonData = parseDataToObjects(splitData);

    fs.unlinkSync(filePath);

    return jsonData;
  } catch (error) {
    console.error("Lỗi khi đọc file:", error);
    throw error; // Ném lỗi để biết có vấn đề trong quá trình xử lý
  }
};

// convert file quy chuẩn dạng pdf bằng thư viện pdf-parse
const convertPDFToJSON = async (filePath) => {
  try {
    // Đọc tệp PDF vào bộ đệm
    const dataBuffer = fs.readFileSync(filePath);

    // Sử dụng pdf-parse để trích xuất văn bản từ tệp PDF
    const data = await pdf(dataBuffer);

    // Lấy văn bản thô từ tệp PDF
    let extractedText = data.text;

    // Loại bỏ các dấu xuống dòng và các khoảng trắng thừa
    extractedText = extractedText.replace(/\r?\n|\r/g, " ").trim();

    // Xóa các khoảng trắng thừa (liên tiếp nhiều khoảng trắng thành một khoảng trắng)
    extractedText = extractedText.replace(/\s+/g, " ").trim();

    // Tách văn bản thành các phần bắt đầu bằng chỉ mục số và dấu chấm
    const splitData = splitAndCleanLines(extractedText);

    // Chuyển văn bản thành dạng các đối tượng
    const jsonData = parseDataToObjects(splitData);

    fs.unlinkSync(filePath);

    return jsonData;
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

    // Gửi kết quả cho client
    res.send(result);
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

function tachLopHocPhan(chuoi) {
  // Kiểm tra đầu vào
  if (typeof chuoi !== 'string' || chuoi.trim() === '') {
    return {
      TenLop: '',
      HocKi: null,
      NamHoc: null,
      Lop: '',
    };
  }

  // Lấy thông tin học kỳ và năm học (cho phép khoảng trắng trước dấu '('
  const infoMatch = chuoi.match(/-(\d+)-(\d+)\s*\(/);
  const HocKi = infoMatch ? infoMatch[1] : null;
  const namHoc2 = infoMatch ? infoMatch[2] : null;
  const NamHoc = namHoc2 ? '20' + namHoc2 : null;

  // Lấy mã lớp từ dấu ngoặc đầu tiên
  const lopMatch = chuoi.match(/\(\s*([^()]+?)\s*\)/);
  const Lop = lopMatch ? lopMatch[1].trim() : '';

  // Xây dựng TenLop: loại bỏ phần '-HocKi-NamHoc(MaLop)', sau đó xóa cặp ngoặc chứa mã lớp, rồi loại bỏ dấu '-'
  let temp = chuoi.replace(/-\d+-\d+\s*\([^()]+\)/, '');
  if (Lop) {
    const lopRegex = new RegExp(`\\(\\s*${Lop}\\s*\\)`);
    temp = temp.replace(lopRegex, '');
  }
  const TenLop = temp.replace(/\s*-\s*/g, ' ').trim();

  return {
    TenLop,
    HocKi,
    NamHoc,
    Lop,
  };
}


function processLecturerInfo(input, dataGiangVien, soGiangVien) {
  // Loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi
  input = input.trim();

  // Tách chuỗi input tại dấu phân cách ";" hoặc "," để tách các tên
  const namesArray = input.split(/[,;]/).map((part) => part.trim());

  // Kiểm tra số lượng giảng viên cần xử lý
  let giangVienGiangDay;
  if (soGiangVien === 1) {
    // Lấy tên đầu tiên trong mảng, như hàm gốc
    giangVienGiangDay = cleanName(namesArray[0]);
  } else if (soGiangVien === 2) {
    // Lấy 2 tên đầu tiên trong mảng, nối chúng thành chuỗi
    giangVienGiangDay = namesArray
      .slice(0, 2)
      .map((name) => cleanName(name))
      .join(", "); // Nối thành chuỗi cách nhau bởi dấu phẩy
  } else {
    // Nếu soGiangVien không hợp lệ, gán giá trị mặc định là null
    giangVienGiangDay = null;
  }

  // Xử lý các giá trị còn lại
  const moiGiang = checkIfGuestLecturer(namesArray[0]); // Kiểm tra giảng viên mời
  const monGiangDayChinh = getMainTeachingSubject(namesArray[0], dataGiangVien); // Tìm môn giảng dạy chính

  // Nếu không có môn giảng dạy chính, giảng viên giảng dạy sẽ là null
  if (!monGiangDayChinh && soGiangVien === 1) {
    giangVienGiangDay = null;
  }

  // Trả về kết quả dưới dạng chuỗi
  return {
    giangVienGiangDay: giangVienGiangDay || "",
    moiGiang: moiGiang,
    monGiangDayChinh: monGiangDayChinh,
  };
}

// Hàm loại bỏ kí tự đặc biệt : PGS. TS ....
function cleanName(name) {
  const prefixes = [
    "PGS\\.?", // Phó Giáo sư (PGS, PGS.)
    "T(?:H)?S\\.?", // Tiến sĩ (TS, THS, thS, ...)
    "PGS\\.T(?:H)?S\\.?", // PGS.TS hoặc PGS.THS.
    "GS\\.T(?:H)?S\\.?", // GS.TS hoặc GS.THS.
    "\\(\\s*GVM\\s*\\)", // (GVM) với khoảng trắng tùy ý
    "GVMỜI", // GVMỜI
    "GIẢNG VIÊN MỜI", // GIẢNG VIÊN MỜI
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
    he_dao_tao,
    DoiTuong,
    isHdChinh
  ) VALUES ?;`; // Dấu '?' cho phép chèn nhiều giá trị một lần

  // Mảng để lưu tất cả giá trị cần chèn
  const allValues = [];
  const query = `SELECT * FROM kitubatdau`;
  const [rows] = await connection.query(query);

  // Chuẩn bị dữ liệu cho mỗi item trong jsonData
  jsonData.forEach((item, index) => {
    // tách lớp học phần
    const { TenLop, HocKi, NamHoc, Lop } = tachLopHocPhan(item["LopHocPhan"]);

    // tách từ cột giảng viên theo tkb, xử lí mời giảng?, tự điền tên, tự điền bộ môn
    // tham số 1 và 2 đại diện cho số lượng giảng viên giảng dạy của lớp đóđó
    let giangVienGiangDay, moiGiang, monGiangDayChinh;

    if (Lop.includes("CHAT") || Lop.includes("TSAT")) {
      ({ giangVienGiangDay, moiGiang, monGiangDayChinh } = processLecturerInfo(
        item["GiaoVien"],
        dataGiangVien,
        2
      ));
    } else {
      ({ giangVienGiangDay, moiGiang, monGiangDayChinh } = processLecturerInfo(
        item["GiaoVien"],
        dataGiangVien,
        1
      ));
    }

    // console.log("Giảng Viên Giảng Dạy:", giangVienGiangDay);

    // Biến để kiểm tra nếu "hệ đóng học phí" đã được tìm thấy
    let he_dao_tao = "Đại học (Mật mã)"; // Mặc định là "chuyên ngành Kỹ thuật mật mã"
    let doi_tuong = "Việt Nam"; // Mặc định là "Việt Nam"

    for (const row of rows) {
      const prefix = row.viet_tat; // Lấy giá trị viet_tat
      // Kiểm tra chuỗi bắt đầu bằng prefix và ký tự tiếp theo là số
      if (Lop.startsWith(prefix) && Lop[prefix.length]?.match(/^\d$/)) {
        he_dao_tao = row.gia_tri_so_sanh;
        doi_tuong = row.doi_tuong;
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
      he_dao_tao,
      doi_tuong,
      1,
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

  // Tạo câu lệnh INSERT động
  const query = `
    INSERT INTO ${tableName} (
      Khoa,
      Dot,
      Ki,
      Nam,
      SoTinChi, 
      LopHocPhan, 
      GiaoVien, 
      SoTietCTDT, 
      SoSinhVien, 
      LL, 
      HeSoT7CN, 
      HeSoLopDong, 
      QuyChuan,
      GhiChu 
    ) VALUES ?
  `;

  // hàm normalizeKeys chuẩn hóa lại đầu vào
  // phần filter sẽ lọc các lớp có quy chuẩn = 0 thì bỏ qua không thêm vào bảng tạm
  const normalizedData = normalizeKeys(jsonData);
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
      // validateKhoa(item["Khoa"]) || null, // Đảm bảo giá trị null nếu trường bị thiếu
      item["Khoa"] || null,
      item["Dot"] || null,
      item["Ki"] || null,
      item["Nam"] || null,
      item["Số TC"] || 0,
      item["Lớp học phần"] || null,
      item["Giáo Viên"] || null,
      item["Số tiết theo CTĐT"] || 0,
      item["Số SV"] || 0,
      item["Số tiết lên lớp được tính QC"] || 0,
      item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] ||
        item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] ||
        0,
      item["Hệ số lớp đông"] || 0,
      item["QC"] || 0,
      item["Ghi chú"] || null,
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

    res.status(200).json({ message: "Chèn ngày thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// BACKUP KO ĐC XÓA
// const updateQC = async (req, res) => {
//   const role = req.session.role;
//   const duyet = process.env.DUYET;
//   const tableName = process.env.DB_TABLE_QC;
//   const jsonData = req.body;

//   let connection;

//   try {
//     // Lấy kết nối từ createPoolConnection
//     connection = await createPoolConnection();

//     let error_gv_rows = [];
//     // Duyệt qua từng phần tử trong jsonData
//     for (let item of jsonData) {
//       console.log(item);
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
//         he_dao_tao,
//       } = item;

//       // Check tránh quên chưa điền giảng viên
//       if (KhoaDuyet == 1) {
//         if (!GiaoVienGiangDay || GiaoVienGiangDay.length === 0) {
//           // return res.status(200).json({
//           //   message: `Lớp học phần ${LopHocPhan} (${TenLop}) chưa được điền giảng viên`,
//           // });
//           error_gv_rows.push(`${LopHocPhan} (${TenLop})`);
//           continue;
//         }

//         // Check không có dữ liệu giảng viên
//       }

//       // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
//       const updateQuery = `
//         UPDATE ${tableName}
//         SET
//           GiaoVienGiangDay = ?,
//           MoiGiang = ?,
//           BoMon = ?,
//           GhiChu = ?,
//           KhoaDuyet = ?,
//           DaoTaoDuyet = ?,
//           TaiChinhDuyet = ?,
//           NgayBatDau = ?,
//           NgayKetThuc = ?,
//           he_dao_tao = ?
//         WHERE ID = ?
//       `;

//       const updateValues = [
//         GiaoVienGiangDay,
//         MoiGiang,
//         BoMon,
//         GhiChu,
//         KhoaDuyet,
//         DaoTaoDuyet,
//         TaiChinhDuyet,
//         isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
//         isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
//         he_dao_tao,
//         ID,
//       ];

//       await connection.query(updateQuery, updateValues);
//     }
//     let mess = "";

//     if (error_gv_rows.length > 0) {
//       mess = `<b>Dữ liệu không được lưu cho lớp sau do lỗi dữ liệu ở ô Giảng viên:</b> \n${error_gv_rows.join(
//         "\n "
//       )}`;
//     }

//     if (mess !== "") {
//       return res.status(200).json({ message: mess });
//     }

//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

// backup kiểu nhanh hơn
// const updateQC = async (req, res) => {
//   const jsonData = req.body;

//   let connection;

//   try {
//     // Lấy kết nối từ createPoolConnection
//     connection = await createPoolConnection();

//     const [gvmList] = await connection.query("select HoTen as name from gvmoi");
//     const [coHuuList] = await connection.query(
//       "select TenNhanVien as name from nhanvien"
//     );

//     let error_gv_rows = [];
//     const batchSize = 50; // Kích thước mỗi batch
//     const totalBatches = Math.ceil(jsonData.length / batchSize); // Tổng số batch cần xử lý

//     for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
//       const batch = jsonData.slice(
//         batchIndex * batchSize,
//         (batchIndex + 1) * batchSize
//       );

//       const batchPromises = batch.map(async (item) => {
//         const {
//           ID,
//           GiaoVienGiangDay,
//           MoiGiang,
//           BoMon,
//           GhiChu,
//           KhoaDuyet,
//           DaoTaoDuyet,
//           TaiChinhDuyet,
//           NgayBatDau,
//           NgayKetThuc,
//           he_dao_tao,
//           LopHocPhan,
//           TenLop,
//         } = item;

//         // Kiểm tra nếu thiếu dữ liệu giảng viên
//         if (KhoaDuyet == 1) {
//           // Nếu chưa điền giảng viên giảng dạy
//           if (!GiaoVienGiangDay || GiaoVienGiangDay.length === 0) {
//             error_gv_rows.push(
//               `${LopHocPhan} (${TenLop}) - chưa được điền giảng viên`
//             );
//             return Promise.resolve(); // Bỏ qua bản ghi lỗi
//           }

//           // Kiểm tra có bị thừa dấu , không
//           if (GiaoVienGiangDay.includes(",")) {
//             if (
//               he_dao_tao.includes("Đại học") ||
//               GiaoVienGiangDay.trim().endsWith(",")
//             ) {
//               error_gv_rows.push(
//                 `${LopHocPhan} (${TenLop}) - bị thừa dấu ',' `
//               );
//               return Promise.resolve(); // Bỏ qua bản ghi lỗi
//             }
//           }

//           // Nếu giảng viên giảng dạy không trùng khớp với dữ liệu db
//           let isValidName1 = false,
//             isValidName2 = true;

//           if (he_dao_tao.includes("Đại học")) {
//             if (MoiGiang == 1) {
//               isValidName1 = gvmList.some(
//                 (item) => item.name.trim() == GiaoVienGiangDay.trim()
//               );
//             } else {
//               isValidName1 = coHuuList.some(
//                 (item) => item.name.trim() == GiaoVienGiangDay.trim()
//               );
//             }
//           } else {
//             let GiangVien1 = GiaoVienGiangDay.trim();
//             let GiangVien2;
//             if (GiaoVienGiangDay.includes(",")) {
//               [GiangVien1 = "", GiangVien2 = ""] = GiaoVienGiangDay.split(
//                 ","
//               ).map((item) => item.trim());

//               if (MoiGiang == 1) {
//                 isValidName2 = gvmList.some(
//                   (item) => item.name.trim() == GiangVien2.trim()
//                 );
//               } else {
//                 isValidName2 = coHuuList.some(
//                   (item) => item.name.trim() == GiangVien2.trim()
//                 );
//               }
//             }

//             isValidName1 = coHuuList.some(
//               (item) => item.name.trim() == GiangVien1.trim()
//             );
//           }

//           if (isValidName1 == false || isValidName2 == false) {
//             error_gv_rows.push(
//               `${LopHocPhan} (${TenLop}) - vui lòng điền lại giảng viên`
//             );
//             return Promise.resolve(); // Bỏ qua bản ghi lỗi
//           }
//         }

//         const updateQuery = `
//           UPDATE quychuan
//           SET
//             GiaoVienGiangDay = ?,
//             MoiGiang = ?,
//             BoMon = ?,
//             GhiChu = ?,
//             KhoaDuyet = ?,
//             DaoTaoDuyet = ?,
//             TaiChinhDuyet = ?,
//             NgayBatDau = ?,
//             NgayKetThuc = ?,
//             he_dao_tao = ?
//           WHERE ID = ?
//         `;

//         const updateValues = [
//           GiaoVienGiangDay,
//           MoiGiang,
//           BoMon,
//           GhiChu,
//           KhoaDuyet,
//           DaoTaoDuyet,
//           TaiChinhDuyet,
//           isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
//           isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
//           he_dao_tao,
//           ID,
//         ];

//         return connection.query(updateQuery, updateValues);
//       });

//       // Chờ xử lý tất cả các promise trong batch
//       await Promise.all(batchPromises);
//     }

//     let mess = "";

//     if (error_gv_rows.length > 0) {
//       mess = `<b>Dữ liệu không được lưu cho lớp sau do lỗi dữ liệu ở ô Giảng viên:</b> \n${error_gv_rows.join(
//         "\n "
//       )}`;
//     }

//     if (mess !== "") {
//       return res.status(200).json({ message: mess });
//     }

//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

const updateQC = async (req, res) => {
  const jsonData = req.body;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    const [gvmList] = await connection.query("SELECT HoTen AS name FROM gvmoi");
    const [coHuuList] = await connection.query(
      "SELECT TenNhanVien AS name FROM nhanvien"
    );

    // const validNames = new Set([
    //   ...gvmList.map((gvm) => gvm.name.trim()),
    //   ...coHuuList.map((nv) => nv.name.trim()),
    // ]);

    const coHuuSet = new Set(coHuuList.map((nv) => nv.name.trim()));
    const gvmListSet = new Set(gvmList.map((gvm) => gvm.name.trim()));

    const error_gv_rows = [];
    const updates = [];
    const updateIDs = [];

    // Chuẩn bị dữ liệu cập nhật
    for (const item of jsonData) {
      const {
        ID,
        GiaoVienGiangDay,
        MoiGiang,
        BoMon,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        NgayBatDau,
        NgayKetThuc,
        he_dao_tao,
        LopHocPhan,
        TenLop,
      } = item;

      if (KhoaDuyet == 1) {
        // Check cú pháp
        // Nếu chưa điền giảng viên
        if (!GiaoVienGiangDay || GiaoVienGiangDay.trim() === "") {
          error_gv_rows.push(
            `${LopHocPhan} (${TenLop}) - Chưa nhập giảng viên`
          );
          continue;
        }

        // Nếu là hệ đại học và tên chứa dấu ,
        if (
          GiaoVienGiangDay?.includes(",") &&
          he_dao_tao?.includes("Đại học")
        ) {
          error_gv_rows.push(
            `${LopHocPhan} (${TenLop}) - lớp đại học chỉ được 1 giảng viên và không có dấu ','`
          );
          continue;
        }

        // Check tên và tích mời giảng
        if (MoiGiang == 0) {
          // Cả tên 1 và 2 (nếu có) đều phải là cơ hữu
          const names = GiaoVienGiangDay
            ? GiaoVienGiangDay.split(",").map((n) => n.trim())
            : [];
          const invalidNames = names.filter((name) => !coHuuSet.has(name));

          if (invalidNames.length > 0) {
            error_gv_rows.push(
              `${LopHocPhan} (${TenLop}) - giảng viên cơ hữu không hợp lệ: ${invalidNames.join(
                ", "
              )}`
            );
            continue;
          }
        } else {
          // Nếu mời giảng = 1
          const names = GiaoVienGiangDay
            ? GiaoVienGiangDay.split(",").map((n) => n.trim())
            : [];

          if (names.length === 2) {
            const invalidNames = [];

            if (!coHuuSet.has(names[0])) {
              invalidNames.push(
                `Giảng viên cơ hữu 1 không hợp lệ: ${names[0]}`
              );
            }
            if (!gvmListSet.has(names[1])) {
              invalidNames.push(`Giảng viên mời 2 không hợp lệ: ${names[1]}`);
            }

            if (invalidNames.length > 0) {
              error_gv_rows.push(
                `${LopHocPhan} (${TenLop}) - ${invalidNames.join(", ")}`
              );
              continue;
            }
          }
        }
      }

      updateIDs.push(ID);
      updates.push({
        ID,
        GiaoVienGiangDay,
        MoiGiang,
        BoMon,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        NgayBatDau: isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
        NgayKetThuc: isNaN(new Date(NgayKetThuc).getTime())
          ? null
          : NgayKetThuc,
        he_dao_tao,
      });
    }

    if (updates.length > 0) {
      const updateQuery = `
        UPDATE quychuan
        SET
          GiaoVienGiangDay = CASE ID
            ${updates
              .map(
                (u) =>
                  `WHEN ${u.ID} THEN ${connection.escape(u.GiaoVienGiangDay)}`
              )
              .join(" ")}
          END,
          MoiGiang = CASE ID
            ${updates.map((u) => `WHEN ${u.ID} THEN ${u.MoiGiang}`).join(" ")}
          END,
          BoMon = CASE ID
            ${updates
              .map((u) => `WHEN ${u.ID} THEN ${connection.escape(u.BoMon)}`)
              .join(" ")}
          END,
          GhiChu = CASE ID
            ${updates
              .map((u) => `WHEN ${u.ID} THEN ${connection.escape(u.GhiChu)}`)
              .join(" ")}
          END,
          KhoaDuyet = CASE ID
            ${updates.map((u) => `WHEN ${u.ID} THEN ${u.KhoaDuyet}`).join(" ")}
          END,
          DaoTaoDuyet = CASE ID
            ${updates
              .map((u) => `WHEN ${u.ID} THEN ${u.DaoTaoDuyet}`)
              .join(" ")}
          END,
          TaiChinhDuyet = CASE ID
            ${updates
              .map((u) => `WHEN ${u.ID} THEN ${u.TaiChinhDuyet}`)
              .join(" ")}
          END,
          NgayBatDau = CASE ID
            ${updates
              .map((u) =>
                u.NgayBatDau
                  ? `WHEN ${u.ID} THEN ${connection.escape(u.NgayBatDau)}`
                  : `WHEN ${u.ID} THEN NULL`
              )
              .join(" ")}
          END,
          NgayKetThuc = CASE ID
            ${updates
              .map((u) =>
                u.NgayKetThuc
                  ? `WHEN ${u.ID} THEN ${connection.escape(u.NgayKetThuc)}`
                  : `WHEN ${u.ID} THEN NULL`
              )
              .join(" ")}
          END,
          he_dao_tao = CASE ID
            ${updates
              .map(
                (u) => `WHEN ${u.ID} THEN ${connection.escape(u.he_dao_tao)}`
              )
              .join(" ")}
          END
        WHERE ID IN (${updateIDs.join(", ")});
      `;

      await connection.query(updateQuery);
    }

    let mess = "";

    if (error_gv_rows.length > 0) {
      mess = `<b>Dữ liệu không được lưu cho lớp sau do lỗi dữ liệu ở ô Giảng viên:</b> \n${error_gv_rows.join(
        "\n "
      )}`;
    }

    if (mess !== "") {
      return res.status(200).json({ message: mess });
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

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
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const getDanhXung = (gioiTinh) => {
  return gioiTinh === "Nam" ? "Ông" : gioiTinh === "Nữ" ? "Bà" : "";
};

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

const saveDataGvmDongHocPhi = async (req, res, daDuyetHetArray) => {
  const { dot, ki, namHoc } = req.body;

  // Lưu hệ đóng học phí

  // Lưu hệ mật mã
  const query2 = `
    SELECT
        qc.Khoa, qc.he_dao_tao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh, gvmoi.NoiCongTac, gvmoi.MonGiangDayChinh AS MaBoMon,
        SUM(qc.QuyChuan) AS TongSoTiet,
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc
    FROM
        quychuan qc
    JOIN
        gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
    WHERE
        qc.DaLuu = 0 AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? 
        AND he_dao_tao like '%Đại học%' AND qc.MoiGiang = 1
    GROUP BY
        qc.Khoa, qc.he_dao_tao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh, gvmoi.NoiCongTac, gvmoi.MonGiangDayChinh;
    `;

  const value = [dot, ki, namHoc];

  try {
    const [dataJoin] = await pool.query(query2, value);

    // Kiểm tra xem có dữ liệu không
    if (!dataJoin || dataJoin.length === 0) {
      console.log("Không có dữ liệu hợp đồng");
      return;
    }

    //const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    //const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

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
            he_dao_tao,
            NoiCongTac,
            MaBoMon,
          } = item;

          req.session.tmp++;

          const DanhXung = getDanhXung(GioiTinh);
          // const getDanhXung = (GioiTinh) => {
          //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
          // };
          let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
          let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
          let TruThue = 0; // Giả định không thu thuế

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
            he_dao_tao,
            NoiCongTac,
          ];
        })
    );

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO hopdonggvmoi (
        id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
        DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
        Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, he_dao_tao, NoiCongTac
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
            he_dao_tao,
            isHdChinh,
            DoiTuong,
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

          // const exists = hocPhanList.some(
          //   (hocPhan) => hocPhan.TenHocPhan === TenHocPhan
          // )
          //   ? 1
          //   : 0;

          // if (exists == 0) {
          //   await themHocPhan(TenHocPhan, SoTinChi, Khoa);
          // }

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
            he_dao_tao,
            isHdChinh,
            DoiTuong,
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
        QuyChuan, HocKy, NamHoc, MaHocPhan, Lop, Dot, Khoa, BoMon, he_dao_tao, isHdChinh, DoiTuong
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


const joinData = (dataArray, nhanvienList, gvmList) => {
  // Mảng kết quả chứa các đối tượng sau khi gộp thông tin
  const result = [];
  // Duyệt qua mảng đối tượng dữ liệu
  dataArray.forEach((item) => {
    // Tách tên giảng viên từ trường GiaoVienGiangDay, có thể có nhiều giảng viên
    const giaoVienGiangDayArray = item.GiaoVienGiangDay.split(","); // Nếu có nhiều giảng viên
    giaoVienGiangDayArray.forEach((gv) => {
      // Lấy tên giảng viên, bỏ phần (1) hay (2)

      // Nếu là giảng viên (1) thì là Giảng viên cơ hữu
      if (gv.includes("(1)")) {
        const tenGiangVien = gv.trim().split("(")[0].trim();

        // Tìm giảng viên trong danh sách nhanvienList
        const nhanVien = nhanvienList.find(
          (nv) =>
            nv.TenNhanVien.toLowerCase().trim() ===
            tenGiangVien.toLowerCase().trim()
        );

        if (nhanVien) {
          // Tạo bản sao đối tượng gốc
          const newItem = { ...item };

          // Gộp tất cả thông tin từ nhanvien vào newItem
          Object.keys(nhanVien).forEach((key) => {
            if (!newItem.hasOwnProperty(key)) {
              // Kiểm tra xem key đã có trong newItem chưa
              newItem[key] = nhanVien[key]; // Gán giá trị từ nhanvien vào newItem
            }
          });

          newItem.id_Gvm = 1;
          newItem.GiaoVienGiangDay = `${tenGiangVien}`;

          // Thêm vào mảng kết quả
          result.push(newItem);
        }
      } else {
        const tenGiangVien = gv.trim().split("(")[0].trim();

        // Tìm giảng viên trong danh sách
        if (item.MoiGiang == 1) {
          const gvmoi = gvmList.find(
            (gvm) =>
              gvm.HoTen.toLowerCase().trim() ===
              tenGiangVien.toLowerCase().trim()
          );

          if (gvmoi) {
            // Tạo bản sao đối tượng gốc
            const newItem = { ...item };

            // Gộp tất cả thông tin từ gvmoi vào newItem
            Object.keys(gvmoi).forEach((key) => {
              if (!newItem.hasOwnProperty(key)) {
                // Kiểm tra xem key đã có trong newItem chưa
                newItem[key] = gvmoi[key]; // Gán giá trị từ gvmoi vào newItem
              }
            });

            newItem.id_Gvm = gvmoi.id_Gvm;
            newItem.id_User = 1;
            newItem.GiaoVienGiangDay = `${tenGiangVien}`;
            newItem.isHdChinh = 0; // Thêm cột isHdChinh = 1

            // Thêm vào mảng kết quả
            result.push(newItem);
          }
        } else {
          const nhanVien = nhanvienList.find(
            (nv) =>
              nv.TenNhanVien.toLowerCase().trim() ===
              tenGiangVien.toLowerCase().trim()
          );

          if (nhanVien) {
            // Tạo bản sao đối tượng gốc
            const newItem = { ...item };

            // Gộp tất cả thông tin từ nhanvien vào newItem
            Object.keys(nhanVien).forEach((key) => {
              if (!newItem.hasOwnProperty(key)) {
                // Kiểm tra xem key đã có trong newItem chưa
                newItem[key] = nhanVien[key]; // Gán giá trị từ nhanvien vào newItem
              }
            });

            newItem.id_Gvm = 1;
            newItem.GiaoVienGiangDay = `${tenGiangVien}`;
            // Thêm vào mảng kết quả
            result.push(newItem);
          }
        }
      }
    });
  });

  return result;
};

// tách tên giảng viên giảng dạy, đánh dấu 1, 2 kèm chia số tiết quy chuẩn
const splitTeachers = (data) => {
  const result = [];

  data.forEach((item) => {
    // Tách danh sách giảng viên từ trường 'GiaoVienGiangDay' bằng dấu phẩy
    const teachers = item.GiaoVienGiangDay.split(",").map((teacher) =>
      teacher.trim()
    );

    // Giả sử trường QC là giá trị của lớp gốc (100%)
    const originalQC = item.QuyChuan || 100; // Nếu không có QC thì mặc định là 100%
    const secondQC = parseFloat((originalQC * 0.7).toFixed(2));
    const firstQC = originalQC - secondQC;

    // Tạo đối tượng cho mỗi giảng viên, gắn dấu (1), (2) vào tên và chia tỷ lệ QC
    teachers.forEach((teacher, index) => {
      const newItem = { ...item }; // sao chép đối tượng gốc

      // Gắn (1) và (2) vào tên giảng viên
      newItem.GiaoVienGiangDay = `${teacher} (${index + 1})`;

      // Điều chỉnh giá trị QC
      if (index === 0) {
        newItem.QuyChuan = firstQC;
      } else if (index === 1) {
        newItem.QuyChuan = secondQC;
      } else {
        newItem.QuyChuan = originalQC; // Nếu có nhiều hơn 2 giảng viên, giữ nguyên QC cho các trường hợp còn lại
      }

      result.push(newItem); // thêm vào mảng kết quả
    });
  });
  return result;
};

const insertGiangDay2 = async (
  req,
  res,
  nvList,
  gvmList,
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
    AND qc.GiaoVienGiangDay NOT LIKE '%,%'
  `;

  // lấy lớp có 2 tên giảng viên
  const query3 = `
      SELECT *
  FROM quychuan 
  WHERE 
    quychuan.DaLuu = 0 
    AND quychuan.Dot = ?
    AND quychuan.KiHoc = ? 
    AND quychuan.NamHoc = ?
    AND quychuan.GiaoVienGiangDay LIKE '%,%'
  `;

  const value = [dot, ki, namHoc];
  // join bình thường với lớp 1 giảng viên
  const [dataJoin] = await pool.query(query2, value);

  // lấy các lớp 2 giảng viên
  const [dataGiangVienSauDaiHoc] = await pool.query(query3, value);
  const tachLopGiangVienSauDaiHoc = splitTeachers(dataGiangVienSauDaiHoc);
  const gopLopSauDaiHocVoiBangNhanVien = joinData(
    tachLopGiangVienSauDaiHoc,
    nvList,
    gvmList
  );

  // gộp 2 mảng dữ liệu
  const mergedArray = dataJoin.concat(gopLopSauDaiHocVoiBangNhanVien);

  try {
    // Chuẩn bị dữ liệu để chèn từng loạt
    const insertValues = await Promise.all(
      mergedArray
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.Khoa)
        ) // Bỏ qua các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          //dataJoin.map(async (item) => {
          let {
            id_Gvm,
            id_User,
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
            he_dao_tao,
            isHdChinh,
            DoiTuong,
          } = item;

          req.session.tmp++;

          const TenHocPhan = LopHocPhan;

          const gv1 = GiaoVienGiangDay ? GiaoVienGiangDay.split(" - ") : [];
          let gv = gv1[0];
          // let id_Gvm = 1;
          // let id_User = 1;

          if (id_Gvm == 0 || id_Gvm == null || id_Gvm == undefined) {
            id_Gvm = 1;
          }

          // Tạo giá trị cho Mã Học Phần
          const maHocPhan = item.MaHocPhan || 0; // Nếu MaHocPhan là null hoặc undefined thì thay bằng 0

          // Dùng forEach để duyệt qua mảng và Lấy id_User
          // nvList.forEach((giangVien) => {
          //   if (
          //     giangVien.TenNhanVien.toLowerCase().trim() ==
          //     gv1[0].toLowerCase().trim()
          //   ) {
          //     id_User = giangVien.id_User; // Gán id
          //   }
          // });

          // const exists = hocPhanList.some(
          //   (hocPhan) => hocPhan.TenHocPhan === TenHocPhan
          // )
          //   ? 1
          //   : 0;

          // if (exists == 0) {
          //   await themHocPhan(TenHocPhan, SoTinChi, Khoa);
          // }

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
            he_dao_tao,
            isHdChinh,
            DoiTuong,
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
        QuyChuan, HocKy, NamHoc, MaHocPhan, Lop, Dot, Khoa, BoMon, he_dao_tao, isHdChinh, DoiTuong
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

const saveHopDongGvmSauDaiHoc = async (req, res, daDuyetHetArray) => {
  const { dot, ki, namHoc } = req.body;

  // Lưu hệ sau đại học
  const query = `
SELECT
    qc.Khoa, qc.he_dao_tao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
    gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
    gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
    gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh, gvmoi.NoiCongTac, gvmoi.MonGiangDayChinh AS MaBoMon,
    SUM(
        ROUND(
            CASE 
                WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN qc.QuyChuan * 0.7
                ELSE qc.QuyChuan * 1
            END, 2)
    ) AS TongSoTiet,
    MIN(qc.NgayBatDau) AS NgayBatDau,
    MAX(qc.NgayKetThuc) AS NgayKetThuc
FROM
    quychuan qc
JOIN
    gvmoi ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',' , -1)) = gvmoi.HoTen
WHERE
    qc.DaLuu = 0 AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.MoiGiang = 1
    AND (gvmoi.isQuanDoi != 1 OR gvmoi.isQuanDoi IS NULL) 
    AND he_dao_tao NOT LIKE '%Đại học%'   
GROUP BY
    qc.Khoa, qc.he_dao_tao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
    gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
    gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
    gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh, gvmoi.NoiCongTac, gvmoi.MonGiangDayChinh;
`;

  const value = [dot, ki, namHoc];

  try {
    const [dataJoin] = await pool.query(query, value);

    // Kiểm tra xem có dữ liệu không
    if (!dataJoin || dataJoin.length === 0) {
      console.log("Không có dữ liệu hợp đồng");
      return;
    }

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
            he_dao_tao,
            NoiCongTac,
            MaBoMon,
          } = item;

          req.session.tmp++;

          const DanhXung = getDanhXung(GioiTinh);
          // const getDanhXung = (GioiTinh) => {
          //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
          // };
          let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
          let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
          let TruThue = 0; // Giả định không thu thuế

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
            he_dao_tao,
            NoiCongTac,
          ];
        })
    );

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO hopdonggvmoi (
        id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
        DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
        Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, he_dao_tao, NoiCongTac
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
      saveDataGvmDongHocPhi(req, res, daDuyetHetArray), // Hợp đồng hệ đóng học phí
      //saveDataGvmMatMa(req, res, daDuyetHetArray), // Hợp đồng hệ mật mã
      saveHopDongGvmSauDaiHoc(req, res, daDuyetHetArray), // Hợp đồng sau đại học
      insertGiangDay2(req, res, nvList, gvmList, hocPhanList, daDuyetHetArray), // Lưu các lớp cơ hữu vào bảng giảng dạy
      insertGiangDay(req, res, gvmList, hocPhanList, daDuyetHetArray), // Lưu các lớp mời giảng vào bảng giảng dạy
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
