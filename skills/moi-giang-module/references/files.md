# Files

## File: src/controllers/createGvmController.js
```javascript
const createPoolConnection = require("../config/databasePool");
const path = require("path");
const fs = require("fs");
const appRoot = require("app-root-path");

const fsp = fs.promises;

const buildFileName = (fieldName, khoa, hoTen, originalName) => {
  let computedField = fieldName;

  if (fieldName === "fileBoSung") {
    computedField = `${khoa}_${hoTen}`;
  }

  if (fieldName === "FileLyLich") {
    computedField = `${khoa}_Lý lịch_${hoTen}`;
  }

  return `${computedField}${path.extname(originalName)}`;
};

const prepareFilePlan = (files, { khoa, boMon, hoTen }) => {
  if (!files || !boMon || !hoTen || !khoa) {
    return {};
  }

  const plan = {};

  Object.entries(files).forEach(([fieldName, fileList]) => {
    if (!Array.isArray(fileList) || !fileList[0]) {
      return;
    }

    const file = fileList[0];
    const filename = buildFileName(fieldName, khoa, hoTen, file.originalname);

    plan[fieldName] = {
      filename,
      buffer: file.buffer,
    };
  });

  return plan;
};

const persistFilePlan = async (plan, folderPath) => {
  if (!plan || Object.keys(plan).length === 0) {
    return;
  }

  await fsp.mkdir(folderPath, { recursive: true });

  await Promise.all(
    Object.values(plan).map(({ filename, buffer }) => {
      const filePath = path.join(folderPath, filename);
      return fsp.writeFile(filePath, buffer);
    })
  );
};

const getGvmLists = async (connection) => {
  try {
    const query = "SELECT * FROM `gvmoi`";
    const [results] = await connection.query(query);

    // Gửi danh sách giảng viên dưới dạng mảng
    return results; // Chỉ gửi kết quả mảng
  } catch (error) {
    return;
  }
};

let createGvm = async (req, res) => {
  let connection;

  try {
    connection = await createPoolConnection();

    const gvms = await getGvmLists(connection); // Truyền kết nối vào

    const lengthList = parseInt(gvms.length) + 1; // Đảm bảo biến này được khai báo bằng const

    const khoa = req.session.MaPhongBan;

    // Lấy dữ liệu từ site ejs
    let MaGvm = khoa + "_GVM_" + lengthList;
    let HoTen = req.body.HoTen;
    let GioiTinh = req.body.GioiTinh;
    let NgaySinh = req.body.NgaySinh;
    let CCCD = req.body.CCCD;
    let NgayCapCCCD = req.body.NgayCapCCCD;
    let NoiCapCCCD = req.body.NoiCapCCCD;
    let NoiCongTac = req.body.NoiCongTac;
    let DiaChi = req.body.DiaChi;
    let DienThoai = req.body.DienThoai;
    let email = req.body.email;
    let MaSoThue = req.body.MaSoThue;
    let HocVi = req.body.HocVi;
    let ChucVu = req.body.ChucVu;
    let HeSoLuong = req.body.HeSoLuong;
    let STK = req.body.STK;
    let NganHang = req.body.NganHang;
    let tinhTrangGiangDay = req.body.tinhTrangGiangDay ? 1 : 0;
    let BangTotNghiepLoai = req.body.BangTotNghiepLoai;
    let MonGiangDayChinh = req.body.monGiangDayChinh;
    const MaPhongBan = khoa;
    let QrCode = req.body.QrCode;
    let isQuanDoi = req.body.thuocQuanDoi;
    let isNghiHuu = req.body.isNghiHuu;
    let chuc_danh = req.body.ChucDanhNgheNghiep;

    // Kiểm tra HSL
    // Nếu là chuỗi, thay dấu phẩy bằng dấu chấm
    if (typeof HeSoLuong === "string") {
      HeSoLuong = HeSoLuong.replace(",", ".");
    }

    if (isNaN(HeSoLuong)) {
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res.redirect("/gvmList?message=HeSoLuongNotValue");
    }

    // Kiểm tra trùng lặp CCCD
    const checkDuplicateQuery =
      "SELECT COUNT(*) as count FROM gvmoi WHERE CCCD = ?";
    const [duplicateRows] = await connection.query(checkDuplicateQuery, [CCCD]);
    if (duplicateRows[0].count > 0) {
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res.redirect("/gvmList?message=duplicateCCCD");
    }

    // Kiểm tra trùng lặp tên
    let nameExists = true;
    let modifiedName = HoTen; // Biến tạm để lưu tên cuối cùng
    let duplicateName = [];
    let duplicateCount = 0;
    let originalName = HoTen;

    while (nameExists) {
      nameExists = gvms.some((gvm) => gvm.HoTen === modifiedName);
      if (nameExists) {
        duplicateCount++;
        modifiedName = `${originalName} (${String.fromCharCode(
          64 + duplicateCount
        )})`; // A, B, C...
      }
    }
    // Khi xử lý xong, thêm tên cuối cùng vào danh sách trùng
    if (modifiedName !== HoTen) {
      duplicateName.push(`${HoTen} -> ${modifiedName}`); // Ghi lại thay đổi
    }
    HoTen = modifiedName; // Cập nhật tên cuối cùng

    const filePlan = prepareFilePlan(req.files, {
      khoa,
      boMon: MonGiangDayChinh,
      hoTen: HoTen,
    });

    let truocCCCD = filePlan["truocCCCD"] ? filePlan["truocCCCD"].filename : null;
    let sauCCCD = filePlan["sauCCCD"] ? filePlan["sauCCCD"].filename : null;
    let bangTotNghiep = filePlan["bangTotNghiep"]
      ? filePlan["bangTotNghiep"].filename
      : null;
    let FileLyLich = filePlan["FileLyLich"]
      ? filePlan["FileLyLich"].filename
      : null;
    let fileBoSung = filePlan["fileBoSung"]
      ? filePlan["fileBoSung"].filename
      : null;
    QrCode = filePlan["QrCode"] ? filePlan["QrCode"].filename : QrCode;

    const query = `INSERT INTO gvmoi (MaGvm, HoTen, GioiTinh, NgaySinh, CCCD, NgayCapCCCD, NoiCapCCCD, NoiCongTac, DiaChi, DienThoai, Email, MaSoThue, HocVi, ChucVu, HSL, STK, NganHang, MatTruocCCCD, MatSauCCCD, BangTotNghiep, FileLyLich, MaPhongBan, TinhTrangGiangDay, BangTotNghiepLoai, MonGiangDayChinh, isQuanDoi, isNghiHuu, fileBoSung, QrCode, chuc_danh)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
      await connection.query(query, [
        MaGvm,
        HoTen,
        GioiTinh,
        NgaySinh,
        CCCD,
        NgayCapCCCD,
        NoiCapCCCD,
        NoiCongTac,
        DiaChi,
        DienThoai,
        email,
        MaSoThue,
        HocVi,
        ChucVu,
        HeSoLuong,
        STK,
        NganHang,
        truocCCCD,
        sauCCCD,
        bangTotNghiep,
        FileLyLich,
        MaPhongBan,
        tinhTrangGiangDay,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        isQuanDoi,
        isNghiHuu,
        fileBoSung,
        QrCode,
        chuc_danh,
      ]);

      // Log the creation of a new guest lecturer
      try {
        // Lấy thông tin user và khoa từ session
        const userId = req.session.userId || req.session.userInfo?.ID || 0;
        const tenNhanVien =
          req.session.TenNhanVien || req.session.username || "Unknown User";
        const khoaSession = req.session.MaPhongBan || "Unknown Department";

        const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
                           VALUES (?, ?, ?, ?, ?, NOW())`;

        await connection.query(logQuery, [
          userId,
          tenNhanVien,
          khoaSession,
          "Tạo mới giảng viên mời",
          `Thêm giảng viên mời mới: ${HoTen} (Mã: ${MaGvm}, CCCD: ${CCCD})`,
        ]);
      } catch (logError) {
        // Continue with the response even if logging fails
      }

      const folderPath = path.join(
        appRoot.path || appRoot,
        "Giang_Vien_Moi",
        khoa,
        MonGiangDayChinh,
        HoTen
      );

      try {
        await persistFilePlan(filePlan, folderPath);
      } catch (fileError) {
        await connection.query("DELETE FROM gvmoi WHERE MaGvm = ?", [MaGvm]);
        return res.redirect("/gvmList?message=fileSaveFailed");
      }

      if (duplicateName.length > 0) {
        const message = "Tên giảng viên bị trùng sẽ được lưu như sau";
        const encodedMessage = encodeURIComponent(message);

        // Mã hóa duplicateName và nối với thông điệp
        const encodedDuplicateNames = encodeURIComponent(
          duplicateName.join(", ")
        );

        // Nối thông điệp và danh sách tên đã mã hóa
        return res.redirect(
          `/gvmList?message=${encodedMessage}&duplicateName=${encodedDuplicateNames}`
        );
      }

      res.redirect("/gvmList?message=insertSuccess");
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.redirect("/gvmList?message=duplicateEntry");
      }
      return res.redirect("/gvmList?message=insertFalse");
    }
  } catch (error) {
    res.status(500).send("Lỗi khi xử lý tải lên");
  } finally {
    if (connection) connection.release();
  }
};

const getBoMonList = async (req, res) => {
  let maPhongBan = req.params.maPhongBan;
  let isKhoa = req.params.isKhoa === "true"; // Chuyển đổi isKhoa thành boolean

  let connection;
  try {
    connection = await createPoolConnection();
    let results;
    if (isKhoa) {
      const query = `SELECT * FROM bomon WHERE MaPhongBan = ?`;
      [results] = await connection.query(query, [maPhongBan]);
    } else {
      const query = `SELECT * FROM bomon`;
      [results] = await connection.query(query);
    }

    res.json({
      success: true,
      maBoMon: results,
    });
  } catch (error) {
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  createGvm,
  getBoMonList,
};
```

## File: src/controllers/exportHDController.js
```javascript
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");
const gvmServices = require("../services/gvmServices");
require("dotenv").config(); // Load biến môi trường

const phuLucDHController = require("../controllers/phuLucHDController");
const {
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  VerticalAlign,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  TextRun,
  AlignmentType,
} = require("docx");

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Đệ quy xóa thư mục con
        deleteFolderRecursive(curPath);
      } else {
        // Xóa file
        fs.unlinkSync(curPath);
      }
    });
    // Xóa thư mục rỗng
    fs.rmdirSync(folderPath);
  }
}
const convertToRoman = (num) => {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
};

// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  // Làm tròn để tránh lỗi floating-point
  num = Math.round(num);
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const result = capitalizeFirstLetter(words.trim() + " đồng");
  return result;
};

// Hàm chuyển đổi số thập phân thành chữ
const numberWithDecimalToWords = (num) => {
  const [integerPart, decimalPart] = num.toString().split(".");
  const integerWords = numberToWords(parseInt(integerPart, 10));
  let decimalWords = "";

  if (decimalPart) {
    decimalWords =
      "phẩy " +
      decimalPart
        .split("")
        .map((digit) => ones[parseInt(digit)])
        .join(" ");
  }

  return `${integerWords}${decimalWords ? " " + decimalWords : ""}`.trim();
};

// Hàm định dạng ngày/tháng/năm
const formatDate1 = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`; // Định dạng ngày/tháng/năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Hàm định dạng ngày tháng năm
const formatDate = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `ngày ${day} tháng ${month} năm ${year}`; // Định dạng ngày tháng năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
// Tính toán khoảng thời gian thực hiện
const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Định dạng ngày bắt đầu
  const startDay = start.getDate().toString().padStart(2, "0");
  const startMonth = (start.getMonth() + 1).toString().padStart(2, "0");
  const startYear = start.getFullYear();

  // Định dạng ngày kết thúc
  const endDay = end.getDate().toString().padStart(2, "0");
  const endMonth = (end.getMonth() + 1).toString().padStart(2, "0");
  const endYear = end.getFullYear();

  return `Từ ngày ${startDay}/${startMonth}/${startYear} đến ngày ${endDay}/${endMonth}/${endYear}`;
};

/**
 * Hàm chuyển đổi date cho Excel
 * Excel lưu trữ date dưới dạng serial number (số ngày kể từ 1/1/1900)
 * Nhưng ExcelJS có thể nhận Date object hoặc string ISO
 * @param {*} dateValue - Giá trị date từ database (có thể là Date, string YYYY-MM-DD, null, undefined)
 * @returns {string|null} - String định dạng DD/MM/YYYY hoặc null
 */
const formatDateForExcel = (dateValue) => {
  try {
    // Nếu null, undefined hoặc chuỗi rỗng
    if (!dateValue || dateValue === '') {
      return null;
    }

    // Nếu đã là Date object hợp lệ
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là string
    if (typeof dateValue === 'string') {
      // Loại bỏ khoảng trắng
      const trimmed = dateValue.trim();
      if (trimmed === '' || trimmed === '0000-00-00') {
        return null;
      }

      // Xử lý định dạng YYYY-MM-DD từ database
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = trimmed.split('-');
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        // Kiểm tra giá trị hợp lệ
        if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }

        // Trả về string định dạng DD/MM/YYYY
        return `${day}/${month}/${year}`;
      }

      // Fallback cho các định dạng khác
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;

      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là number (timestamp)
    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) return null;
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Các trường hợp khác
    return null;
  } catch (error) {
    console.error('Error in formatDateForExcel:', error);
    return null;
  }
};

const getTemplateFileName = (loaiHopDongId, heDaoTaoData) => {
  const heDaoTao = heDaoTaoData.find(item => item.id == loaiHopDongId);
  if (!heDaoTao) return null;

  const { cap_do, loai_hinh } = heDaoTao;

  // ĐỒ ÁN
  if (loai_hinh === "đồ án") {
    return "HopDongDA.docx";
  }

  // MỜI GIẢNG
  if (loai_hinh === "mời giảng") {
    switch (cap_do) {
      case 1:
        return "HopDongHP.docx";   // Đại học
      case 2:
        return "HopDongMM.docx";   // MM
      case 3:
        return "HopDongCH.docx";  // Cao học
      case 4:
        return "HopDongNCS.docx";  // NCS
      default:
        return null;
    }
  }

  return null;
};

// Controller xuất nhiều hợp đồng
const exportMultipleContracts = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    // Convert loaiHopDong from name to ID if it's a string
    let loaiHopDongId = loaiHopDong;
    if (loaiHopDong && isNaN(loaiHopDong)) {
      // It's a name, convert to ID
      const [heDaoTaoRows] = await connection.query(
        'SELECT id FROM he_dao_tao WHERE he_dao_tao = ?',
        [loaiHopDong]
      );
      if (heDaoTaoRows.length > 0) {
        loaiHopDongId = heDaoTaoRows[0].id;
      } else {
        return res.status(404).send(
          "<script>alert('Không tìm thấy hệ đào tạo'); window.location.href='/exportHD';</script>"
        );
      }
    }
    // Lấy hệ đào tạo
    const heDaoTaoData = await gvmServices.getHeDaoTaoData(req, res);

    let query = `SELECT
    hd.id_Gvm,
    hd.DienThoai,
    hd.Email,
    hd.MaSoThue,
    hd.DanhXung,
    hd.HoTen,
    hd.NgaySinh,
    hd.HocVi,
    hd.ChucVu,
    hd.HSL,
    hd.CCCD,
    hd.NoiCapCCCD,
    hd.DiaChi,
    hd.STK,
    hd.NganHang,
    MIN(hd.NgayBatDau) AS NgayBatDau,
    MAX(hd.NgayKetThuc) AS NgayKetThuc,
    SUM(hd.SoTiet) AS SoTiet,
    SUM(hd.SoTien) AS SoTien,
    SUM(hd.TruThue) AS TruThue,
    hd.NgayCap,
    SUM(hd.ThucNhan) AS ThucNhan,
    hd.NgayNghiemThu,
    hd.Dot,
    hd.KiHoc,
    hd.NamHoc,
    hd.MaPhongBan,
    hd.MaBoMon,
    hd.NoiCongTac,
    hd.SoHopDong,
    hd.SoThanhLyHopDong,
    hd.CoSoDaoTao
  FROM
    hopdonggvmoi hd
  JOIN
    gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
  WHERE
    hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.he_dao_tao = ?
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, hd.NgayNghiemThu, hd.Dot, 
    hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
    hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

    let params = [dot, ki, namHoc, loaiHopDongId];

    // Xử lý các trường hợp khác nhau
    if (khoa && khoa !== "ALL") {
      query = `SELECT
      hd.id_Gvm,
      hd.DienThoai,
      hd.Email,
      hd.MaSoThue,
      hd.DanhXung,
      hd.HoTen,
      hd.NgaySinh,
      hd.HocVi,
      hd.ChucVu,
      hd.HSL,
      hd.CCCD,
      hd.NoiCapCCCD,
      hd.DiaChi,
      hd.STK,
      hd.NganHang,
      MIN(hd.NgayBatDau) AS NgayBatDau,
      MAX(hd.NgayKetThuc) AS NgayKetThuc,
      SUM(hd.SoTiet) AS SoTiet,
      SUM(hd.SoTien) AS SoTien,
      SUM(hd.TruThue) AS TruThue,
      hd.NgayCap,
      SUM(hd.ThucNhan) AS ThucNhan,
      hd.NgayNghiemThu,
      hd.Dot,
      hd.KiHoc,
      hd.NamHoc,
      hd.MaPhongBan,
      hd.MaBoMon,
      hd.NoiCongTac,
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.MaPhongBan like ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;
      params = [dot, ki, namHoc, `%${khoa}%`, loaiHopDongId];
    }
    if (teacherName) {
      query = `SELECT
      hd.id_Gvm,
      hd.DienThoai,
      hd.Email,
      hd.MaSoThue,
      hd.DanhXung,
      hd.HoTen,
      hd.NgaySinh,
      hd.HocVi,
      hd.ChucVu,
      hd.HSL,
      hd.CCCD,
      hd.NoiCapCCCD,
      hd.DiaChi,
      hd.STK,
      hd.NganHang,
      MIN(hd.NgayBatDau) AS NgayBatDau,
      MAX(hd.NgayKetThuc) AS NgayKetThuc,
      SUM(hd.SoTiet) AS SoTiet,
      SUM(hd.SoTien) AS SoTien,
      SUM(hd.TruThue) AS TruThue,
      hd.NgayCap,
      SUM(hd.ThucNhan) AS ThucNhan,
      hd.NgayNghiemThu,
      hd.Dot,
      hd.KiHoc,
      hd.NamHoc,
      hd.MaPhongBan,
      hd.MaBoMon,
      hd.NoiCongTac,
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.HoTen LIKE ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap,
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

      params = [dot, ki, namHoc, `%${teacherName}%`, loaiHopDongId];
    }

    const [teachers] = await connection.execute(query, params);

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/exportHD';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    // Dữ liệu để tạo file thống kê
    const summaryData = [];
    const summaryData2 = [];

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      console.log("Processing teacher:", teacher);
      const soTiet = teacher.SoTiet || 0;

      // Gán giá trị mặc định "Thạc sĩ" nếu cột học vị trống
      teacher.HocVi = teacher.HocVi || "Thạc sĩ";


      // Đảm bảo soTiet là số và làm tròn để tránh lỗi floating-point
      const soTietNumber = typeof soTiet === 'string' ? parseFloat(soTiet) : soTiet;

      // Làm tròn kết quả để tránh lỗi floating-point (27839999.999999996 -> 27840000)
      const tienText = Math.round(teacher.SoTien || 0);

      // Nếu số tiền <= 2 triệu đồng thì không tính thuế
      const tienThueText = Math.round(teacher.TruThue || 0);

      const tienThucNhanText = teacher.ThucNhan;
      const thoiGianThucHien = formatDateRange(
        teacher.NgayBatDau,
        teacher.NgayKetThuc
      );

      // Cập nhật lại số tiền vào bảng hopdonggvmoi
      // await updateSoTienThucNhan(
      //   connection,
      //   teacher.id_Gvm,
      //   dot,
      //   ki,
      //   namHoc,
      //   tienThueText,
      //   tienThucNhanText
      // );

      // Ghi dữ liệu cho thống kê chuyển khoản
      summaryData.push({
        HoTen: teacher.HoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienThucNhanText,
        TongTien: tienText, // Lưu tổng tiền trước thuế để tính toán chính xác
        SoHopDong: teacher.SoHopDong,
      });

      summaryData2.push({
        HoTen: teacher.HoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienText, // Tiền trước thuế
        SoHopDong: teacher.SoHopDong,
      });

      let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      const bangChuSoTien = numberToWords(tienText);
      const bangChuThucNhan = numberToWords(tienThucNhanText);
      const MucTien = teacher.SoTien / teacher.SoTiet;

      const data = {
        Số_hợp_đồng: teacher.SoHopDong || "    ",
        Số_thanh_lý: teacher.SoThanhLyHopDong || "    ",
        Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
        Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
        Danh_xưng: teacher.DanhXung,
        Họ_và_tên: hoTenTrim,
        CCCD: teacher.CCCD,
        Ngày_cấp: formatDate1(teacher.NgayCap),
        Nơi_cấp: teacher.NoiCapCCCD,
        Chức_vụ: teacher.ChucVu,
        Cấp_bậc: teacher.HocVi,
        Hệ_số_lương: Number(teacher.HSL).toFixed(2).replace(".", ","),
        Địa_chỉ_theo_CCCD: teacher.DiaChi,
        Điện_thoại: teacher.DienThoai,
        Mã_số_thuế: teacher.MaSoThue,
        Số_tài_khoản: teacher.STK,
        Email: teacher.Email,
        Tại_ngân_hàng: teacher.NganHang,
        Số_tiết: teacher.SoTiet.toString().replace(".", ","),
        Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
        Tiền_text: tienText.toLocaleString("vi-VN"),
        Bằng_chữ_số_tiền: bangChuSoTien,
        Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
        Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
        Bằng_chữ_của_thực_nhận: bangChuThucNhan,
        Kỳ: convertToRoman(teacher.KiHoc),
        Năm_học: teacher.NamHoc,
        Thời_gian_thực_hiện: thoiGianThucHien,
        Mức_tiền: MucTien.toLocaleString("vi-VN"),
        Nơi_công_tác: teacher.NoiCongTac,
        Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã"
      };

      // Chọn template dựa trên ID hệ đào tạo
      let templateFileName;

      // Map ID to template file
      // const templateMap = {
      //   1: "HopDongHP.docx",      // Đại học (Đóng học phí)
      //   2: "HopDongMM.docx",      // Đại học (Mật mã)
      //   6: "HopDongCH.docx",      // Cao học (Đóng học phí)
      //   4: "HopDongNCS.docx",     // Nghiên cứu sinh (Đóng học phí)
      //   5: "HopDongDA.docx",      // Đồ án
      // };

      // templateFileName = templateMap[loaiHopDongId];

      templateFileName = getTemplateFileName(loaiHopDongId, heDaoTaoData);

      console.log("Template file name:", templateFileName);

      // Fallback to name-based selection if ID mapping not found
      if (!templateFileName) {
        // Try to get he_dao_tao name from database if we only have ID
        let heHopDongName;
        if (!isNaN(loaiHopDong)) {
          const [heDaoTaoRows] = await connection.query(
            'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
            [loaiHopDongId]
          );
          heHopDongName = heDaoTaoRows.length > 0 ? heDaoTaoRows[0].he_dao_tao : loaiHopDong;
        } else {
          heHopDongName = loaiHopDong;
        }

        console.log("Hệ hợp đồng (dựa trên tên):", heHopDongName);

        // Fallback to name-based selection
        switch (heHopDongName) {
          case "Đại học (Đóng học phí)":
            templateFileName = "HopDongHP.docx";
            break;
          case "Đại học (Mật mã)":
            templateFileName = "HopDongMM.docx";
            break;
          case "Đồ án":
            templateFileName = "HopDongDA.docx";
            break;
          case "Nghiên cứu sinh (Đóng học phí)":
            templateFileName = "HopDongNCS.docx";
            break;
          case "Cao học (Đóng học phí)":
            templateFileName = "HopDongCH.docx";
            break;
          default:
            return res.status(400).send("Loại hợp đồng không hợp lệ.");
        }
      }

      const templatePath = path.resolve(
        __dirname,
        "../templates",
        templateFileName
      );
      const content = fs.readFileSync(templatePath, "binary");
      const zip = new PizZip(content);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: "«",
          end: "»",
        },
      });

      doc.render(data);

      const buf = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      const fileName = `HopDong_${hoTenTrim}_${teacher.CCCD}.docx`;
      fs.writeFileSync(path.join(tempDir, fileName), buf);
    }

    // Tạo file thống kê chuyển khoản sau thuế
    const noiDung = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc}`;
    const summaryDoc = createTransferDetailDocument(summaryData, noiDung, "sau thuế");
    const summaryBuf = await Packer.toBuffer(summaryDoc);
    const summaryName = `GiangDay_Daihoc_Thongke_chuyenkhoan_sauthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName), summaryBuf);


    // Tạo file thống kê chuyển khoản trước thuế
    const noiDung2 = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc}`;
    const summaryDoc2 = createTransferDetailDocument(summaryData2, noiDung2, "trước thuế");
    const summaryBuf2 = await Packer.toBuffer(summaryDoc2);
    const summaryName2 = `GiangDay_Daihoc_Thongke_chuyenkhoan_truocthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName2), summaryBuf2);


    // Tạo file Excel báo cáo thuế - lấy dữ liệu trực tiếp từ database
    const taxReportData = teachers.map((teacher, index) => {
      const hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      // Ép kiểu Number để đảm bảo Excel SUM hoạt động đúng
      const amount = Number(teacher.SoTien);
      const taxDeducted = Number(teacher.TruThue);
      const netAmount = Number(teacher.ThucNhan);

      return {
        stt: index + 1,
        contractNumber: teacher.SoHopDong,
        executor: hoTenTrim,
        expenseDescription: `Hợp đồng giao khoán công việc`,
        idNumber: teacher.CCCD || '',
        issueDate: formatDateForExcel(teacher.NgayCap),
        issuePlace: teacher.NoiCapCCCD || '',
        idAddress: teacher.DiaChi || '',
        phoneNumber: teacher.DienThoai,
        taxCode: teacher.MaSoThue,
        amount: amount, // Tổng tiền trước thuế từ DB (đã ép kiểu Number)
        taxDeducted: taxDeducted, // Thuế từ DB (đã ép kiểu Number)
        netAmount: netAmount // Tiền sau thuế từ DB (đã ép kiểu Number)
      };
    });

    const taxReportWorkbook = createTaxReportWorkbook(taxReportData);
    const taxReportName = `GiangDay_Daihoc_BangKeTongHopThue.xlsx`;
    await taxReportWorkbook.xlsx.writeFile(path.join(tempDir, taxReportName));


    // Tạo thư mục cho ZIP file bên ngoài tempDir
    const zipOutputDir = path.join(__dirname, '..', 'public', 'tempZips');
    if (!fs.existsSync(zipOutputDir)) {
      fs.mkdirSync(zipOutputDir, { recursive: true });
    }

    const zipFileName = `HopDong_GiangDay_Dot${dot}_Ki${ki}_${namHoc}_${khoa || "all"}.zip`;
    const zipPath = path.join(zipOutputDir, zipFileName);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    const output = fs.createWriteStream(zipPath);

    archive.pipe(output);

    // Thêm từng file thay vì toàn bộ directory
    const files = fs.readdirSync(tempDir);

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      archive.file(filePath, { name: file });
    });

    await new Promise((resolve, reject) => {
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(err);
      });
      output.on("close", () => {
        console.log("Archive finalized successfully");
        resolve();
      });
      console.log("Finalizing archive...");
      archive.finalize();
    });

    res.download(zipPath, zipFileName, (err) => {
      if (err) {
        console.error("Error sending zip file:", err);
        return;
      }

      console.log("Download completed, starting cleanup...");
      setTimeout(() => {
        try {
          // Xóa các file trong tempDir
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
              const filePath = path.join(tempDir, file);
              fs.unlinkSync(filePath);
            }
            fs.rmdirSync(tempDir);
          }

          // Xóa file ZIP
          if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
          }

          console.log("Cleanup completed successfully");
        } catch (error) {
          console.error("Error cleaning up temporary directory:", error);
        }
      }, 1000);
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};


const updateSoTienThucNhan = async (
  connection,
  idGvm,
  dot,
  kiHoc,
  namHoc,
  truThue,
  thucNhan
) => {
  try {
    const updateQuery = `
      UPDATE hopdonggvmoi
      SET TruThue = ?, ThucNhan = ?
      WHERE id_Gvm = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
    `;
    const [result] = await connection.execute(updateQuery, [
      truThue,
      thucNhan,
      idGvm,
      dot,
      kiHoc,
      namHoc,
    ]);

    if (result.affectedRows === 0) {
      console.warn(
        `Không tìm thấy bản ghi để cập nhật cho giảng viên ${idGvm}`
      );
    } else {
      console.log(`Đã cập nhật TruThue và ThucNhan cho giảng viên ${idGvm}`);
    }
  } catch (err) {
    console.error(`Lỗi khi cập nhật thu nhập cho giảng viên ${idGvm}:`, err);
    throw err;
  }
};

const getExportHDSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("exportHD", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Tải tổng hợp hợp đồng
const exportAdditionalInfoGvm = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    let { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    connection = await createPoolConnection();

    // Convert loaiHopDong from name to ID if it's a string
    let loaiHopDongId = loaiHopDong;
    if (loaiHopDong && isNaN(loaiHopDong)) {
      // It's a name, convert to ID
      const [heDaoTaoRows] = await connection.query(
        'SELECT id FROM he_dao_tao WHERE he_dao_tao = ?',
        [loaiHopDong]
      );
      if (heDaoTaoRows.length > 0) {
        loaiHopDongId = heDaoTaoRows[0].id;
      } else {
        return res.status(404).send(
          "<script>alert('Không tìm thấy hệ đào tạo'); window.location.href='/exportHD';</script>"
        );
      }
    }

    let query = `SELECT
    hd.id_Gvm,
    hd.DienThoai,
    hd.Email,
    hd.MaSoThue,
    hd.DanhXung,
    hd.HoTen,
    hd.NgaySinh,
    hd.HocVi,
    hd.ChucVu,
    hd.HSL,
    hd.CCCD,
    hd.NoiCapCCCD,
    hd.DiaChi,
    hd.STK,
    hd.NganHang,
    MIN(hd.NgayBatDau) AS NgayBatDau,
    MAX(hd.NgayKetThuc) AS NgayKetThuc,
    SUM(hd.SoTiet) AS SoTiet,
    SUM(hd.SoTien) AS SoTien,
    SUM(hd.TruThue) AS TruThue,
    hd.NgayCap,
    SUM(hd.ThucNhan) AS ThucNhan,
    hd.NgayNghiemThu,
    hd.Dot,
    hd.KiHoc,
    hd.NamHoc,
    hd.MaPhongBan,
    hd.MaBoMon,
    hd.NoiCongTac,
    hd.SoHopDong,
    hd.SoThanhLyHopDong,
    hd.CoSoDaoTao
  FROM
    hopdonggvmoi hd
  JOIN
    gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
  WHERE
    hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.he_dao_tao = ?
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, hd.NgayNghiemThu, hd.Dot, 
    hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
    hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

    let params = [dot, ki, namHoc, loaiHopDongId];

    // Xử lý các trường hợp khác nhau
    if (khoa && khoa !== "ALL") {
      query = `SELECT
      hd.id_Gvm,
      hd.DienThoai,
      hd.Email,
      hd.MaSoThue,
      hd.DanhXung,
      hd.HoTen,
      hd.NgaySinh,
      hd.HocVi,
      hd.ChucVu,
      hd.HSL,
      hd.CCCD,
      hd.NoiCapCCCD,
      hd.DiaChi,
      hd.STK,
      hd.NganHang,
      MIN(hd.NgayBatDau) AS NgayBatDau,
      MAX(hd.NgayKetThuc) AS NgayKetThuc,
      SUM(hd.SoTiet) AS SoTiet,
      SUM(hd.SoTien) AS SoTien,
      SUM(hd.TruThue) AS TruThue,
      hd.NgayCap,
      SUM(hd.ThucNhan) AS ThucNhan,
      hd.NgayNghiemThu,
      hd.Dot,
      hd.KiHoc,
      hd.NamHoc,
      hd.MaPhongBan,
      hd.MaBoMon,
      hd.NoiCongTac,
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.MaPhongBan like ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;
      params = [dot, ki, namHoc, `%${khoa}%`, loaiHopDongId];
    }
    if (teacherName) {
      query = `SELECT
      hd.id_Gvm,
      hd.DienThoai,
      hd.Email,
      hd.MaSoThue,
      hd.DanhXung,
      hd.HoTen,
      hd.NgaySinh,
      hd.HocVi,
      hd.ChucVu,
      hd.HSL,
      hd.CCCD,
      hd.NoiCapCCCD,
      hd.DiaChi,
      hd.STK,
      hd.NganHang,
      MIN(hd.NgayBatDau) AS NgayBatDau,
      MAX(hd.NgayKetThuc) AS NgayKetThuc,
      SUM(hd.SoTiet) AS SoTiet,
      SUM(hd.SoTien) AS SoTien,
      SUM(hd.TruThue) AS TruThue,
      hd.NgayCap,
      SUM(hd.ThucNhan) AS ThucNhan,
      hd.NgayNghiemThu,
      hd.Dot,
      hd.KiHoc,
      hd.NamHoc,
      hd.MaPhongBan,
      hd.MaBoMon,
      hd.NoiCongTac,
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.HoTen LIKE ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap,
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

      params = [dot, ki, namHoc, `%${teacherName}%`, loaiHopDongId];
    }

    const [teachers] = await connection.execute(query, params);

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/hd-gvm/additional-file-site';</script>"
      );
    }

    const heDaoTaoData = await gvmServices.getHeDaoTaoData(req, res);

    const loaiHopDongText = heDaoTaoData.find(
      (item) => item.id.toString() === loaiHopDong.toString()
    )?.he_dao_tao || "UnknownType";

    // Lấy danh sách phụ lục hợp đồng của giảng viên
    const phuLucData = await getAppendixData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      teacherName,
      loaiHopDong
    );

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const contractFiles = [];
    try {
      for (const teacher of teachers) {
        let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
        const teacherZipName = `${hoTenTrim}_${teacher.CCCD}.zip`;
        const teacherZipPath = path.join(tempDir, teacherZipName);
        const teacherArchive = archiver("zip", { zlib: { level: 9 } });
        const output = fs.createWriteStream(teacherZipPath);
        teacherArchive.pipe(output);

        // Lưu các file cần xóa sau khi nén
        const filesToDelete = [];
        const dirsToDelete = [];

        console.log("Generating contract for teacher:", teacher.HoTen);

        // Tạo file hợp đồng
        const filePathContract = await generateContractForTeacher(
          teacher,
          loaiHopDong,
          tempDir,
          heDaoTaoData,
        );


        // Lấy file tài liệu bổ sung
        const filePathAdditional = await generateAdditionalFile(
          teacher,
          tempDir
        );

        // Lấy file phụ lục
        const phuLucTeacher = phuLucData.filter(
          (item) => item.GiangVien.trim() === teacher.HoTen.trim()
        );

        const filePathAppendix =
          await phuLucDHController.getExportPhuLucGiangVienMoiPath(
            req,
            connection,
            dot,
            ki,
            namHoc,
            loaiHopDongText,
            khoa,
            teacherName,
            phuLucTeacher
          );

        // Kiểm tra các file
        if (
          !fs.existsSync(filePathContract) ||
          fs.statSync(filePathContract).size === 0
        ) {
          console.error(`File bị lỗi hoặc trống: ${filePathContract}`);
          continue;
        }

        if (
          filePathAdditional &&
          (!fs.existsSync(filePathAdditional) ||
            fs.statSync(filePathAdditional).size === 0)
        ) {
          console.error(`File bị lỗi hoặc trống: ${filePathAdditional}`);
          continue;
        }

        if (
          filePathAppendix &&
          (!fs.existsSync(filePathAppendix) ||
            fs.statSync(filePathAppendix).size === 0)
        ) {
          console.error(`File bị lỗi hoặc trống: ${filePathAppendix}`);
          continue;
        }

        // Thêm các file vào archive
        teacherArchive.file(filePathContract, {
          name: path.basename(filePathContract),
        });

        if (filePathAdditional) {
          teacherArchive.file(filePathAdditional, {
            name: path.basename(filePathAdditional),
          });
        }

        if (filePathAppendix) {
          teacherArchive.file(filePathAppendix, {
            name: path.basename(filePathAppendix),
          });

          filesToDelete.push(filePathAppendix);
          const appendixDir = path.dirname(filePathAppendix);
          dirsToDelete.push(appendixDir);
        }

        // Đợi quá trình nén hoàn tất
        await new Promise((resolve, reject) => {
          output.on("close", resolve);
          output.on("error", reject);
          teacherArchive.finalize();
        });

        // Lưu đường dẫn zip
        contractFiles.push(teacherZipPath);

        // Sau khi zip xong mới xóa file
        for (const filePath of filesToDelete) {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Đã xóa file:", filePath);
          }
        }

        for (const dirPath of dirsToDelete) {
          try {
            if (
              fs.existsSync(dirPath) &&
              fs.readdirSync(dirPath).length === 0
            ) {
              fs.rmdirSync(dirPath);
              console.log("Đã xóa thư mục:", dirPath);
            }
          } catch (err) {
            console.log("Không thể xóa thư mục (có thể không rỗng):", dirPath);
          }
        }
      }
    } catch (error) {
      return res
        .status(400)
        .send(
          `<script>alert('${error.message}'); window.location.href='/api/hd-gvm/additional-file-site';</script>`
        );
    }

    // Tạo file ZIP tổng hợp chứa tất cả file ZIP của giảng viên
    let zipFileName = `TongHopHopDong_GiangDay_Dot${dot}_Ki${ki}_${namHoc}_${loaiHopDong}`;

    if (teacherName) {
      zipFileName += `_${teacherName}.zip`;
    } else {
      zipFileName += `_${khoa || "all"}.zip`;
    }
    const zipPath = path.join(tempDir, zipFileName);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);

    // Thêm tất cả các file ZIP của giảng viên vào file ZIP tổng hợp
    contractFiles.forEach((file) => {
      archive.file(file, { name: path.basename(file) });
    });

    //await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    // Kiểm tra file ZIP trước khi gửi
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      console.error("Lỗi: File ZIP bị trống hoặc hỏng");
      return res.status(500).send("Lỗi: Không thể tạo file ZIP.");
    }

    // Gửi file ZIP cuối cùng về cho client
    res.download(zipPath, zipFileName, (err) => {
      if (!err) {
        setTimeout(() => {
          try {
            if (fs.existsSync(tempDir)) {
              fs.readdirSync(tempDir).forEach((file) =>
                fs.unlinkSync(path.join(tempDir, file))
              );
              fs.rmdirSync(tempDir);
            }
          } catch (error) {
            console.error("Error cleaning up temporary directory:", error);
          }
        }, 1000);
      }
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const generateContractForTeacher = async (
  teacher,
  loaiHopDong,
  tempDir,
  heDaoTaoData
) => {
  const soTiet = teacher.SoTiet || 0;

  // Assign default value "Thạc sĩ" if HocVi is empty
  teacher.HocVi = teacher.HocVi || "Thạc sĩ";

  const tienText = teacher.SoTien || 0;
  // Nếu số tiền <= 2 triệu đồng thì không tính thuế
  const tienThueText = teacher.TruThue || 0;
  const tienThucNhanText = teacher.ThucNhan || 0;
  const thoiGianThucHien = formatDateRange(
    teacher.NgayBatDau,
    teacher.NgayKetThuc
  );
  const MucTien = teacher.SoTien / soTiet || 0;

  const data = {
    Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
    Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
    Danh_xưng: teacher.DanhXung,
    Họ_và_tên: teacher.HoTen,
    CCCD: teacher.CCCD,
    Ngày_cấp: formatDate1(teacher.NgayCap),
    Nơi_cấp: teacher.NoiCapCCCD,
    Chức_vụ: teacher.ChucVu,
    Cấp_bậc: teacher.HocVi,
    Hệ_số_lương: Number(teacher.HSL).toFixed(2).replace(".", ","),
    Địa_chỉ_theo_CCCD: teacher.DiaChi,
    Điện_thoại: teacher.DienThoai,
    Mã_số_thuế: teacher.MaSoThue,
    Số_tài_khoản: teacher.STK,
    Email: teacher.Email,
    Tại_ngân_hàng: teacher.NganHang,
    Số_tiết: teacher.SoTiet.toString().replace(".", ","),
    Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
    Tiền_text: tienText.toLocaleString("vi-VN"),
    Bằng_chữ_số_tiền: numberToWords(tienText),
    Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
    Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
    Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
    Kỳ: convertToRoman(teacher.KiHoc),
    Năm_học: teacher.NamHoc,
    Thời_gian_thực_hiện: thoiGianThucHien,
    Mức_tiền: MucTien.toLocaleString("vi-VN"),
    Nơi_công_tác: teacher.NoiCongTac,
    Số_hợp_đồng: teacher.SoHopDong || "",
    Số_thanh_lý: teacher.SoThanhLyHopDong || "",
    Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã",
  };



  let templateFileName;

  templateFileName = getTemplateFileName(loaiHopDong, heDaoTaoData);
  const templatePath = path.resolve(
    __dirname,
    "../templates",
    templateFileName
  );
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "«", end: "»" },
  });

  doc.render(data);

  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
  const fileName = `HopDong_${hoTenTrim}_${teacher.CCCD}.docx`;
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, buf);

  return filePath; // Trả về đường dẫn file để dùng sau này
};

const getAppendixData = async (
  connection,
  dot,
  ki,
  namHoc,
  khoa,
  teacherName,
  loaiHopDongId
) => {
  try {
    let query = `
      WITH 
  phuLucSauDH AS (
      SELECT DISTINCT
          TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) AS GiangVien, 
          qc.TenLop AS Lop, 
          ROUND(qc.QuyChuan * 0.3, 2) AS SoTiet, 
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          gv.HocVi, 
          gv.HSL,
          gv.DienThoai,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,
          qc.he_dao_tao,
          hd.SoHopDong,
          hd.SoThanhLyHopDong
      FROM quychuan qc
      JOIN gvmoi gv 
          ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen 
      LEFT JOIN hopdonggvmoi hd 
          ON gv.id_Gvm = hd.id_Gvm 
          AND qc.Dot = hd.Dot 
          AND qc.KiHoc = hd.KiHoc 
          AND qc.NamHoc = hd.NamHoc
          AND qc.he_dao_tao = hd.he_dao_tao
      WHERE qc.GiaoVienGiangDay LIKE '%,%'
  ),
  phuLucDH AS (
      SELECT DISTINCT
          TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien, 
          qc.TenLop AS Lop, 
          qc.QuyChuan AS SoTiet, 
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          gv.HocVi, 
          gv.HSL,
          gv.DienThoai,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,
          qc.he_dao_tao,
          hd.SoHopDong,
          hd.SoThanhLyHopDong
      FROM quychuan qc
      JOIN gvmoi gv 
          ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) = gv.HoTen
      LEFT JOIN hopdonggvmoi hd 
          ON gv.id_Gvm = hd.id_Gvm 
          AND qc.Dot = hd.Dot 
          AND qc.KiHoc = hd.KiHoc 
          AND qc.NamHoc = hd.NamHoc
          AND qc.he_dao_tao = hd.he_dao_tao
      WHERE qc.MoiGiang = 1 AND qc.GiaoVienGiangDay NOT LIKE '%,%'
  ),
  table_ALL AS (
      SELECT * FROM phuLucSauDH
      UNION
      SELECT * FROM phuLucDH
  )
  
  SELECT * FROM table_ALL WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?  AND he_dao_tao = ?
      `;

    let params = [dot, ki, namHoc, loaiHopDongId];

    if (khoa && khoa !== "ALL") {
      query += ` AND Khoa = ?`;
      params.push(khoa);
    }

    if (teacherName) {
      query += ` AND GiangVien LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    const [phuLucData] = await connection.execute(query, params);

    // Nhóm dữ liệu theo giảng viên
    // const groupedData = phuLucData.reduce((acc, cur) => {
    //   (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
    //   return acc;
    // }, {});

    return phuLucData;
  } catch (error) {
    console.log(error);
  }
};

const generateAppendixContract = async (
  connection,
  tienLuongList,
  data,
  req,
  res,
  tempDir
) => {
  try {
    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();

    // Nhóm dữ liệu theo giảng viên
    const groupedData = data.reduce((acc, cur) => {
      (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
      return acc;
    }, {});
    const summarySheet = workbook.addWorksheet("Tổng hợp");

    // Thiết lập các thông số cho trang
    summarySheet.pageSetup = {
      paperSize: 9, // Kích thước giấy A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3149,
        right: 0.3149,
        top: 0,
        bottom: 0,
        header: 0.3149,
        footer: 0.3149,
      },
    };

    // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
    const titleRow0 = summarySheet.addRow(["Ban Cơ yếu Chính phủ"]);
    titleRow0.font = { name: "Times New Roman", size: 17 };
    titleRow0.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

    // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
    const titleRow1 = summarySheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
    titleRow1.font = { name: "Times New Roman", bold: true, size: 22 };
    titleRow1.alignment = { vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow1.number}:F${titleRow1.number}`);

    const titleRow2 = summarySheet.addRow(["Phụ lục"]);
    titleRow2.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

    // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
    const titleRow5 = summarySheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Đơn vị tính: Đồng",
      "",
      "",
    ]);
    titleRow5.font = { name: "Times New Roman", bold: true, size: 14 };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

    // Thiết lập tiêu đề cột
    const summaryHeader = [
      "STT",
      "Họ tên giảng viên",
      "Tên học phần",
      "Tên lớp",
      "Số tiết",
      "Thời gian thực hiện",
      "Học kỳ",
      "Địa chỉ",
      "Học vị",
      "Hệ số lương",
      "Mức thanh toán",
      "Thành tiền",
      "Trừ thuế TNCN 10%",
      "Còn lại",
    ];

    const headerRow = summarySheet.addRow(summaryHeader);
    headerRow.font = { name: "Times New Roman", bold: true };

    // Định dạng cột
    summarySheet.getColumn(1).width = 5; // STT
    summarySheet.getColumn(2).width = 18; // Họ tên giảng viên
    summarySheet.getColumn(3).width = 14; // Tên học phần
    summarySheet.getColumn(4).width = 14; // Tên lớp
    summarySheet.getColumn(5).width = 10; // Số tiết
    summarySheet.getColumn(6).width = 16; // Thời gian thực hiện
    summarySheet.getColumn(7).width = 6; // Học kỳ
    summarySheet.getColumn(8).width = 16; // Địa chỉ
    summarySheet.getColumn(9).width = 6; // Học vị
    summarySheet.getColumn(10).width = 7; // Hệ số lương
    summarySheet.getColumn(11).width = 12; // Mức thanh toán
    summarySheet.getColumn(12).width = 15; // Thành tiền
    summarySheet.getColumn(13).width = 15; // Trừ thuế TNCN 10%
    summarySheet.getColumn(14).width = 15; // Còn lại

    // Thêm dữ liệu vào sheet tổng hợp
    let stt = 1;
    let totalSoTiet = 0;
    let totalSoTien = 0;
    let totalTruThue = 0;
    let totalThucNhan = 0;

    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      giangVienData.forEach((item) => {
        const soTiet = item.SoTiet;
        const soTien = tinhSoTien(item, soTiet, tienLuongList); // Tính toán soTien
        // Nếu số tiền <= 2 triệu đồng thì không tính thuế
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1; // Trừ Thuế = 10% của Số Tiền (hoặc 0 nếu < 2 triệu)
        const thucNhan = soTien - truThue; // Thực Nhận = Số Tiền - Trừ Thuế
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === item.HocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;

        // Thêm hàng dữ liệu vào sheet tổng hợp
        const summaryRow = summarySheet.addRow([
          stt,
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          item.SoTiet,
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL,
          mucThanhToan, // Mức thanh toán
          soTien.toLocaleString("vi-VN").replace(/\./g, ","), // Định dạng số tiền
          truThue.toLocaleString("vi-VN").replace(/\./g, ","), // Định dạng số tiền
          thucNhan.toLocaleString("vi-VN").replace(/\./g, ","), // Định dạng số tiền
        ]);

        // Cập nhật các tổng cộng
        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;

        // Căn chỉnh cỡ chữ và kiểu chữ cho từng ô trong hàng dữ liệu
        summaryRow.eachCell((cell, colNumber) => {
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13, bold: true };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 15 };
              break;
          }
          cell.alignment = { horizontal: "center", vertical: "middle" }; // Căn giữa
          cell.alignment.wrapText = true; // Bật wrapText cho ô
        });

        stt++; // Tăng số thứ tự
      });
    }

    // Thêm hàng tổng cộng vào cuối bảng

    const totalRow = summarySheet.addRow([
      "Tổng cộng",
      "",
      "",
      "",
      totalSoTiet,
      "",
      "",
      "",
      "",
      "",
      "",
      totalSoTien.toLocaleString("vi-VN").replace(/\./g, ","),
      totalTruThue.toLocaleString("vi-VN").replace(/\./g, ","),
      totalThucNhan.toLocaleString("vi-VN").replace(/\./g, ","),
    ]);

    totalRow.font = { name: "Times New Roman", bold: true, size: 14 };
    totalRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Gộp ô cho hàng tổng cộng
    summarySheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    // Định dạng các ô trong bảng
    const firstRowOfTable = 6; // Giả sử bảng bắt đầu từ hàng 8
    const lastRowOfTable = totalRow.number; // Hàng tổng cộng

    for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
      const row = summarySheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // Định dạng cho tiêu đề cột
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    // Tạo một sheet cho mỗi giảng viên
    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      const worksheet = workbook.addWorksheet(giangVien);

      worksheet.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0 = worksheet.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0.font = { name: "Times New Roman", size: 17 };
      titleRow0.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1 = worksheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1.font = { name: "Times New Roman", bold: true, size: 22 };
      titleRow1.alignment = { vertical: "middle" };
      worksheet.mergeCells(`A${titleRow1.number}:F${titleRow1.number}`);

      const titleRow2 = worksheet.addRow(["Phụ lục"]);
      titleRow2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

      // Tìm ngày bắt đầu sớm nhất từ dữ liệu giảng viên
      const earliestDate = giangVienData.reduce((minDate, item) => {
        const currentStartDate = new Date(item.NgayBatDau);
        return currentStartDate < minDate ? currentStartDate : minDate;
      }, new Date(giangVienData[0].NgayBatDau));

      // Định dạng ngày bắt đầu sớm nhất thành chuỗi
      const formattedEarliestDate = formatVietnameseDate(earliestDate);

      const titleRow3 = worksheet.addRow([
        `Hợp đồng số:    /HĐ-ĐT ${formattedEarliestDate}`,
      ]);
      titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

      const titleRow4 = worksheet.addRow([
        `Kèm theo biên bản nghiệm thu và thanh lý Hợp đồng số:     /HĐ-ĐT ${formattedEarliestDate}`,
      ]);
      titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow4.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5 = worksheet.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5.font = { name: "Times New Roman", bold: true, size: 14 };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
        "STT", // Thêm tiêu đề STT
        "Họ tên giảng viên",
        "Tên học phần",
        "Tên lớp",
        "Số tiết",
        "Thời gian thực hiện",
        "Học kỳ",
        "Địa Chỉ",
        "Học vị",
        "Hệ số lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow = worksheet.addRow(header);
      headerRow.font = { name: "Times New Roman", bold: true };
      worksheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
      worksheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
      worksheet.getColumn(13).numFmt = "#,##0"; // Còn lại
      worksheet.getColumn(14).numFmt = "#,##0"; // Còn lại

      worksheet.pageSetup = {
        paperSize: 9, // A4 paper size
        orientation: "landscape",
        fitToPage: true, // Fit to page
        fitToWidth: 1, // Fit to width
        fitToHeight: 0, // Do not fit to height
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };

      // Căn chỉnh độ rộng cột
      // Định dạng độ rộng cột, bao gồm cột STT
      worksheet.getColumn(1).width = 5; // STT
      worksheet.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet.getColumn(3).width = 14; // Tên học phần
      worksheet.getColumn(4).width = 14; // Tên lớp
      worksheet.getColumn(5).width = 10; // Số tiết
      worksheet.getColumn(6).width = 16; // Thời gian thực hiện
      worksheet.getColumn(7).width = 6; // Học kỳ
      worksheet.getColumn(8).width = 16; // Địa Chỉ
      worksheet.getColumn(9).width = 6; // Học vị
      worksheet.getColumn(10).width = 7; // Hệ số lương
      worksheet.getColumn(11).width = 12; // Mức thanh toán
      worksheet.getColumn(12).width = 15; // Thành tiền
      worksheet.getColumn(13).width = 15; // Trừ thuế TNCN 10%
      worksheet.getColumn(14).width = 15; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFF00" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      let totalSoTiet = 0;
      let totalSoTien = 0;
      let totalTruThue = 0;
      let totalThucNhan = 0;

      giangVienData.forEach((item, index) => {
        const soTiet = item.SoTiet;
        const soTien = tinhSoTien(item, soTiet, tienLuongList); // Tính toán soTien
        const truThue = soTien * 0.1; // Trừ Thuế = 10% của Số Tiền
        const thucNhan = soTien - truThue; // Thực Nhận = Số Tiền - Trừ Thuế
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === item.HocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        const hocKyLaMa = convertToRoman(item.HocKy);
        // Viết tắt Học vị
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;
        const row = worksheet.addRow([
          index + 1, // STT
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          item.SoTiet,
          thoiGianThucHien,
          hocKyLaMa, // Sử dụng số La Mã cho Học kỳ
          item.DiaChi,
          hocViVietTat, // Sử dụng viết tắt cho Học vị
          item.HSL,
          mucThanhToan,
          soTien,
          truThue,
          thucNhan,
        ]);
        row.font = { name: "Times New Roman", size: 13 };

        row.getCell(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
        row.getCell(13).numFmt = "#,##0"; // Còn lại
        row.getCell(14).numFmt = "#,##0"; // Còn lại

        // Bật wrapText cho các ô dữ liệu và căn giữa
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Chỉnh cỡ chữ cho từng cột
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13, bold: true };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 15 };
              break;
          }
        });

        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;
      });

      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet,
        "",
        "",
        "",
        "",
        "",
        "",
        totalSoTien,
        totalTruThue,
        totalThucNhan,
      ]);
      totalRow.font = { name: "Times New Roman", bold: true, size: 14 };
      totalRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Gộp ô cho hàng tổng cộng
      worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      // Thêm hai dòng trống
      worksheet.addRow([]);

      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      const bangChuRow = worksheet.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien)}`,
      ]);
      bangChuRow.font = { name: "Times New Roman", italic: true, size: 17 };
      worksheet.mergeCells(`A${bangChuRow.number}:${bangChuRow.number}`);
      bangChuRow.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 6 trở đi
      const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 7
      const lastRowOfTable = totalRow.number; // Hàng tổng cộng

      for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }
    }

    // Tạo tên file
    let fileName = `PhuLuc_${data?.[0]?.GiangVien || "KhongRo"}`;

    fileName += ".xlsx";

    // Set headers cho response và gửi file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    // Lưu file vào thư mục tạm
    const filePath = path.join(tempDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    return filePath; // Trả về đường dẫn file để nén vào ZIP
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// const generateAdditionalFile = async (teacher, tempDir) => {
//   const teacherFolderPath = path.resolve(
//     __dirname,
//     "..",
//     "..",
//     "Giang_Vien_Moi",
//     teacher.MaPhongBan,
//     teacher.MaBoMon,
//     teacher.HoTen
//   );

//   if (!fs.existsSync(teacherFolderPath)) return null; // Không có thư mục

//   const files = fs.readdirSync(teacherFolderPath);
//   const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",").map(
//     (ext) => ext.toLowerCase()
//   );

//   const documentFile = files.find((f) =>
//     allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
//   );

//   return documentFile ? path.join(teacherFolderPath, documentFile) : null;
// };

const generateAdditionalFile = async (teacher, tempDir) => {
  const teacherFolderPath = path.resolve(
    __dirname,
    "..",
    "..",
    "Giang_Vien_Moi",
    teacher.MaPhongBan,
    teacher.MaBoMon,
    teacher.HoTen
  );

  if (!fs.existsSync(teacherFolderPath)) return null; // Không có thư mục

  const files = fs.readdirSync(teacherFolderPath);
  const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",").map(
    (ext) => ext.toLowerCase()
  );

  // const documentFile = files.find((f) =>
  //   allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
  // );

  const documentFile = files.find((f) => {
    const baseName = path.parse(f).name; // Lấy tên file không có phần mở rộng
    const ext = path.extname(f).toLowerCase().slice(1); // Lấy phần mở rộng không có dấu chấm

    return (
      baseName === `${teacher.MaPhongBan}_${teacher.HoTen}` &&
      allowedExtensions.includes(ext)
    );
  });

  if (!documentFile) return null; // Không tìm thấy file hợp lệ

  const oldFilePath = path.join(teacherFolderPath, documentFile);
  // const newFileName = `BoSung_${teacher.HoTen}${path.extname(documentFile)}`;
  // const newFilePath = path.join(teacherFolderPath, newFileName);

  // Đổi tên file
  //fs.renameSync(oldFilePath, newFilePath);

  return oldFilePath;
};

const getExportAdditionalInfoGvmSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("exportAdditionalInfoGvm", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

function formatVietnameseDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}

function formatDateDMY(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const getTienLuongList = async (connection) => {
  const query = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
  const [tienLuongList] = await connection.execute(query);
  return tienLuongList;
};

function tinhSoTien(row, soTiet, tienLuongList) {
  const tienLuong = tienLuongList.find(
    (tl) => tl.he_dao_tao === row.he_dao_tao && tl.HocVi === row.HocVi
  );
  if (tienLuong) {
    return soTiet * tienLuong.SoTien;
  } else {
    return 0;
  }
}

// Tải danh sách file bổ sung
const getImageDownloadSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("moigiang.phuLucMinhChungGVM.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const exportImageDownloadData = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    let { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    connection = await createPoolConnection();

    // Convert loaiHopDong from name to ID if it's a string
    let loaiHopDongId = loaiHopDong;
    if (loaiHopDong && isNaN(loaiHopDong)) {
      // It's a name, convert to ID
      const [heDaoTaoRows] = await connection.query(
        'SELECT id FROM he_dao_tao WHERE he_dao_tao = ?',
        [loaiHopDong]
      );
      if (heDaoTaoRows.length > 0) {
        loaiHopDongId = heDaoTaoRows[0].id;
      } else {
        return res.status(404).send(
          "<script>alert('Không tìm thấy hệ đào tạo'); window.location.href='/phu-luc-minh-chung-gvm';</script>"
        );
      }
    }

    let query = `
  SELECT
    hd.id_Gvm,
    hd.DienThoai,
    hd.Email,
    hd.MaSoThue,
    hd.DanhXung,
    hd.HoTen,
    hd.NgaySinh,
    hd.HocVi,
    hd.ChucVu,
    hd.HSL,
    hd.CCCD,
    hd.NoiCapCCCD,
    hd.DiaChi,
    hd.STK,
    hd.NganHang,
    MIN(hd.NgayBatDau) AS NgayBatDau,
    MAX(hd.NgayKetThuc) AS NgayKetThuc,
    hd.Dot,
    hd.KiHoc,
    hd.NamHoc,
    hd.MaPhongBan,
    hd.MaBoMon,
    hd.NoiCongTac
  FROM hopdonggvmoi hd
  JOIN gvmoi gv ON hd.id_Gvm = gv.id_Gvm
`;

    const conditions = [];
    const params = [];

    /* điều kiện bắt buộc */
    conditions.push("hd.Dot = ?");
    params.push(dot);

    conditions.push("hd.KiHoc = ?");
    params.push(ki);

    conditions.push("hd.NamHoc = ?");
    params.push(namHoc);

    conditions.push("hd.he_dao_tao = ?");
    params.push(loaiHopDongId);

    /* điều kiện theo khoa */
    if (khoa && khoa !== "ALL") {
      conditions.push("hd.MaPhongBan LIKE ?");
      params.push(`%${khoa}%`);
    }

    /* điều kiện theo tên giảng viên */
    if (teacherName) {
      conditions.push("hd.HoTen LIKE ?");
      params.push(`%${teacherName}%`);
    }

    /* ghép WHERE */
    query += " WHERE " + conditions.join(" AND ");

    /* GROUP BY */
    query += `
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue,
    hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi,
    hd.STK, hd.NganHang,
    hd.Dot, hd.KiHoc, hd.NamHoc,
    hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac
  `;

    const [teachers] = await connection.execute(query, params);


    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/moi-giang/hd-gvm/img-download-site';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      const fileList = [];
      const missingFiles = [];


      for (const teacher of teachers) {
        const filePathAdditional = await generateAdditionalFile(
          teacher,
          tempDir
        );
        if (filePathAdditional) {
          fileList.push(filePathAdditional);
        } else {
          missingFiles.push(teacher.HoTen);
        }

      }

      if (fileList.length === 0) {
        return res
          .status(400)
          .send(
            `<script>alert('Không có tài liệu bổ sung nào.'); window.location.href='/api/moi-giang/hd-gvm/img-download-site';</script>`
          );
      }

      const zipPath = path.resolve(__dirname, "TaiLieuBoSung.zip");
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {

        let fileName = `file_bo_sung_dot${dot}_ki${ki}_${namHoc}`;

        if (teacherName) {
          fileName += "_" + teacherName + ".zip";
        } else if (khoa != "ALL") {
          fileName += "_" + khoa + ".zip";
        } else {
          fileName += "_ALL.zip";
        }

        let warningMsg = "";
        if (missingFiles.length > 0) {
          warningMsg = `\\n⚠ Thiếu file minh chứng của: ${missingFiles.join(", ")}`;
        }

        res.download(zipPath, fileName, (err) => {
          if (err) {
            console.error("Lỗi gửi file:", err.message);
            res.status(500).send("Không thể tải file zip.");
          }

          fs.unlinkSync(zipPath);

          if (warningMsg) {
            console.warn(warningMsg);
          }
        });
      });


      // output.on("close", () => {

      //   let fileName = `file_bo_sung_dot${dot}_ki${ki}_${namHoc}`;

      //   if (teacherName) {
      //     fileName += "_" + teacherName + ".zip";
      //   } else if (khoa != "ALL") {
      //     fileName += "_" + khoa + ".zip";
      //   } else {
      //     fileName += "_ALL" + ".zip";
      //   }
      //   // Gửi file zip về client
      //   res.download(zipPath, `${fileName}`, (err) => {
      //     if (err) {
      //       console.error("Lỗi gửi file:", err.message);
      //       res.status(500).send("Không thể tải file zip.");
      //     }

      //     // Xoá file zip sau khi tải nếu muốn
      //     fs.unlinkSync(zipPath);
      //   });
      // });

      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(output);

      fileList.forEach((filePath) => {
        archive.file(filePath, { name: path.basename(filePath) });
      });

      await archive.finalize();
    } catch (error) {
      console.error("Lỗi:", error.message);
      return res
        .status(400)
        .send(
          `<script>alert('${error.message}'); window.location.href='/api/moi-giang/hd-gvm/img-download-site';</script>`
        );
    }
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

function createTransferDetailDocument(data = [], noiDung = "", truocthue_or_sauthue) {
  // Hàm phụ trợ: tạo ô header
  function createHeaderCell(text, isBold, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || '').split('\n');
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(new TextRun({
        text: line,
        bold: isBold,
        font: "Times New Roman",
        size: 22,
        color: "000000",
      }));
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  }  // Hàm phụ trợ: tạo ô bình thường
  function createCell(text, isBold = false, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || '').split('\n');
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(new TextRun({
        text: line,
        bold: isBold,
        font: "Times New Roman",
        size: 22,
        color: "000000",
      }));
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  }

  // Hàm tính tổng tiền
  function calculateTotal(data) {
    return data.reduce((sum, row) => sum + (row.ThucNhan || 0), 0);
  }

  // Hàm định dạng số tiền theo VNĐ
  function formatVND(amount) {
    return amount.toLocaleString("vi-VN");
  }

  // Hàm tạo bảng chi tiết
  function createDetailTable(data) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("STT", true),
        createHeaderCell("Số HĐ", true, 1950), // Đặt width cố định 1950 twips cho cột Số HĐ (tăng 50px)
        createHeaderCell("Đơn vị thụ hưởng\n(hoặc cá nhân)", true),
        createHeaderCell("SĐT", true),
        createHeaderCell("Mã số thuế", true),
        createHeaderCell("Số tài khoản", true),
        createHeaderCell("Tại ngân hàng", true, 4800), // Đặt width cố định 3600 twips (gấp 3 lần cột Số HĐ)
        createHeaderCell("Số tiền (VNĐ)", true),
      ],
    }); const dataRows = data.length
      ? data.map(
        (row, idx) =>
          new TableRow({
            children: [
              createCell((idx + 1).toString()),
              createCell((row.SoHopDong || '') + '', false, 1950), // Ô Số HĐ với width cố định (tăng 50px)
              createCell(row.HoTen || ""),
              createCell(row.DienThoai || ""),
              createCell(row.MaSoThue || ""),
              createCell(row.STK || ""),
              createCell(row.NganHang || "", false, 4800),
              createCell(row.ThucNhan ? formatVND(row.ThucNhan) : ""),
            ],
          })
      )
      : Array.from({ length: 4 }).map(
        () =>
          new TableRow({
            children: [
              createCell(""), // STT
              createCell("", false, 1950), // Số HĐ với width cố định (tăng 50px)
              createCell(""), // Đơn vị thụ hưởng
              createCell(""), // SĐT
              createCell(""), // Mã số thuế
              createCell(""), // Số tài khoản
              createCell("", false, 4800), // Tại ngân hàng với width cố định
              createCell(""), // Số tiền
            ],
          })
      );

    const totalAmount = calculateTotal(data);
    const formattedTotalAmount = formatVND(totalAmount);

    const totalRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Tổng cộng",
                  bold: true,
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          columnSpan: 7,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({
                text: formattedTotalAmount || '',  // Thay thế null/undefined bằng chuỗi rỗng
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
      ],
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
      rows: [headerRow, ...dataRows, totalRow],
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          font: "Times New Roman",
          size: 22,
          color: "000000",
        },
        paragraph: {
          color: "000000",
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE, // Đặt orientation là landscape
            margin: {
              top: 567, // 1 cm = 567 twips
              right: 567, // 1 cm
              bottom: 567, // 1 cm
              left: 567, // 1 cm
            },
            size: {
              width: 15840, // A4 landscape width (11 inches = 15840 twips)
              height: 12240, // A4 landscape height (8.5 inches = 12240 twips)
            },
          },
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "BAN CƠ YẾU CHÍNH PHỦ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "BẢNG KÊ CHI TIẾT THÔNG TIN CHUYỂN KHOẢN",
                font: "Times New Roman",
                size: 26,
                color: "000000",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Nội dung: `,
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }), new TextRun({
                text: `${noiDung || ''}`,  // Thay thế null/undefined bằng chuỗi rỗng
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
            ],
            spacing: { after: 200 },
          }),
          createDetailTable(data),
          new Paragraph({
            italics: true,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `Ghi chú: Số tiền chuyển khoản là số tiền ${truocthue_or_sauthue}`,
                font: "Times New Roman",
                size: 22,
                color: "000000",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

/**
 * Tạo và trả về Workbook cho bảng kê trừ thuế
 * @param {Array<Object>} records Mảng đối tượng chứa dữ liệu dòng (stt, contractNumber, executor, expenseDescription, idNumber, issueDate, issuePlace, idAddress, taxCode, amount, taxDeducted, netAmount)
 * @returns {ExcelJS.Workbook}
 */
function createTaxReportWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng kê tổng hợp thuế');

  // Banner & tiêu đề
  worksheet.addRow(['BAN CƠ YẾU CHÍNH PHỦ']);
  worksheet.addRow(['HỌC VIỆN KỸ THUẬT MẬT MÃ']);
  worksheet.addRow([]);
  worksheet.addRow(['BẢNG KÊ TỔNG HỢP THUẾ']);
  // worksheet.addRow(['Hợp đồng hướng dẫn đồ án tốt nghiệp']);
  worksheet.addRow([]);

  [1, 2, 4, 5].forEach(rowNum => {
    worksheet.mergeCells(`A${rowNum}:M${rowNum}`);
    worksheet.getRow(rowNum).font = { bold: true, size: rowNum === 4 ? 13 : 11 };
    worksheet.getRow(rowNum).alignment = { horizontal: 'center' };
  });

  // Cột header
  worksheet.addRow(['STT', 'Số HĐ', 'Người thực hiện', 'Nội dung chi tiêu', 'Số CCCD', 'Ngày cấp', 'Nơi cấp', 'Địa chỉ CCCD', 'SĐT', 'Mã số thuế', 'Số tiền', 'Trừ thuế', 'Còn lại']);

  // Cài đặt độ rộng cột vừa đủ với nội dung
  worksheet.columns = [
    { key: 'stt', width: 5 },                    // STT - chỉ cần vừa số
    { key: 'contractNumber', width: 6 },        // Số hợp đồng - vừa với format "123/HĐ-ĐT"
    { key: 'executor', width: 22 },              // Người thực hiện - tên đầy đủ
    { key: 'expenseDescription', width: 28 },    // Nội dung chi tiêu - mô tả dài
    { key: 'idNumber', width: 14 },              // Số CCCD - 12 chữ số + buffer
    { key: 'issueDate', width: 12 },             // Ngày cấp - DD/MM/YYYY
    { key: 'issuePlace', width: 25 },            // Nơi cấp - tên cơ quan
    { key: 'idAddress', width: 40 },             // Địa chỉ CCCD - địa chỉ đầy đủ
    { key: 'phoneNumber', width: 14 },           // SĐT - số điện thoại
    { key: 'taxCode', width: 14 },               // Mã số thuế - 10-13 chữ số
    { key: 'amount', width: 16 },                // Số tiền - định dạng #,##0
    { key: 'taxDeducted', width: 16 },           // Trừ thuế - định dạng #,##0
    { key: 'netAmount', width: 16 }              // Còn lại - định dạng #,##0
  ];

  worksheet.getRow(7).font = { bold: true, size: 11 };
  worksheet.autoFilter = 'A7:M7';
  worksheet.views = [{ state: 'frozen', ySplit: 7 }];

  // Chèn dữ liệu bắt đầu từ hàng 8
  // Đảm bảo dữ liệu được chèn đúng thứ tự cột bằng cách chuyển đổi object thành array
  const dataRows = records.map(record => [
    record.stt,
    record.contractNumber,
    record.executor,
    record.expenseDescription,
    record.idNumber,
    record.issueDate,
    record.issuePlace,
    record.idAddress,
    record.phoneNumber,
    record.taxCode,
    record.amount,
    record.taxDeducted,
    record.netAmount
  ]);

  dataRows.forEach(row => {
    worksheet.addRow(row);
  });

  // Áp dụng định dạng số có dấu phẩy cho các cột tiền tệ
  const dataStartRow = 8;
  const dataEndRow = worksheet.lastRow.number; // Dòng cuối của dữ liệu (không bao gồm tổng cộng)

  // Định dạng cột F (Ngày cấp CCCD) - định dạng ngày DD/MM/YYYY
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const cell = worksheet.getCell(`F${row}`);
    if (cell.value && cell.value instanceof Date) {
      cell.numFmt = 'dd/mm/yyyy';
    }
  }

  // Định dạng cột K (Số tiền), L (Trừ thuế), M (Còn lại)
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    ['K', 'L', 'M'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      if (cell.value && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  // Tính tổng trước khi thêm vào Excel
  let totalAmount = 0;
  let totalTax = 0;
  let totalNet = 0;
  if (records && records.length > 0) {
    records.forEach(record => {
      totalAmount += typeof record.amount === 'number' ? record.amount : 0;
      totalTax += typeof record.taxDeducted === 'number' ? record.taxDeducted : 0;
      totalNet += typeof record.netAmount === 'number' ? record.netAmount : 0;
    });
  }

  // Footer: Tổng cộng - sử dụng giá trị đã tính sẵn thay vì formula
  worksheet.addRow([
    'Tổng cộng:', '', '', '', '', '', '', '', '', '',
    totalAmount,
    totalTax,
    totalNet
  ]);
  const totalRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${totalRow}:J${totalRow}`);
  worksheet.getRow(totalRow).font = { bold: true };
  worksheet.getRow(totalRow).alignment = { horizontal: 'right' };

  // Áp dụng định dạng số có dấu phẩy cho dòng tổng cộng
  ['K', 'L', 'M'].forEach(col => {
    worksheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });

  // Bằng chữ - sử dụng totalAmount đã tính ở trên
  const textRowVal = `Bằng chữ: ${numberToWords(totalAmount)} đồng chẵn.`;
  worksheet.addRow([textRowVal]);
  const textRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${textRow}:M${textRow}`);
  worksheet.getRow(textRow).font = { italic: true, size: 10 };

  // Ngày tháng năm
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', '', '', '', '', '', `Ngày ... tháng ... năm 2025`, '', '', '', '']);
  const dateRow = worksheet.lastRow.number;
  worksheet.mergeCells(`J${dateRow}:M${dateRow}`);
  worksheet.getRow(dateRow).font = { size: 10 };
  worksheet.getRow(dateRow).alignment = { horizontal: 'center' };

  // Ký tên
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', 'Người lập bảng', '', '', '', 'Trưởng phòng Đào tạo', '', '', '', '']);
  const signRow = worksheet.lastRow.number;
  worksheet.getRow(signRow).font = { bold: true, size: 10 };
  worksheet.getRow(signRow).alignment = { horizontal: 'center' };

  return workbook;
}

module.exports = {
  exportMultipleContracts,
  getExportHDSite,
  exportAdditionalInfoGvm,
  getExportAdditionalInfoGvmSite,
  getImageDownloadSite,
  exportImageDownloadData,
};
```

## File: src/controllers/gvmListController.js
```javascript
const express = require("express");
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const ExcelJS = require("exceljs");
const path = require("path"); // Thêm dòng này
const fs = require("fs"); // Thêm dòng này

let gvmLists;
const getGvmList = async (req, res) => {
  try {
    // Lấy danh sách bộ môn để lọc

    // Lấy danh sách phòng ban để lọc
    const qrPhongBan = `select * from phongban where isKhoa = 1`;
    const [phongBanList] = await pool.query(qrPhongBan);

    // Lấy danh sách giảng viên mời
    const isKhoa = req.session.isKhoa;
    const MaPhongBan = req.session.MaPhongBan;
    let query;

    if (isKhoa == 0) {
      query = `select * from gvmoi where TinhTrangGiangDay = 1 AND CCCD != '00001'`;
    } else if (isKhoa == 1) {
      query = `SELECT * FROM gvmoi WHERE TinhTrangGiangDay = 1 AND MaPhongBan LIKE '%${MaPhongBan}%'`;
    }

    const [results, fields] = await pool.query(query);
    const gvmLists = results;

    res.render("gvmList.ejs", {
      gvmLists: gvmLists,
      phongBanList: phongBanList,
    });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const getGvm = async (req, res) => {
  try {
    res.json(gvmLists); // Trả về danh sách giảng viên mời
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" }); // Xử lý lỗi
  }
};

// =================================================================
// Danh sách đã ngừng giảng dạy
// Render waiting list site
const getStoppedTeachingListSite = async (req, res) => {
  res.render("gvm.stoppedTeaching.ejs");
};

// Lấy data danh sách đã dừng giảng dạy
const getStoppedTeachingListData = async (req, res) => {
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
  const khoa = req.query.khoa;

  try {
    let query = `SELECT * FROM gvmoi WHERE 
    TinhTrangGiangDay = 0 AND id_Gvm != 1`;
    let params = [];

    if (isKhoa == 1) {
      query += ` AND MaPhongBan = ?`;
      params.push(MaPhongBan);
    } else if (isKhoa == 0) {
      if (khoa !== "ALL") {
        query += ` AND MaPhongBan = ?`;
        params.push(khoa);
      }
    }

    const [results] = await pool.query(query, params);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateStoppedTeaching = async (req, res) => {
  const updatedData = req.body;
  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < updatedData.length; i += batchSize) {
      batches.push(updatedData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE gvmoi
        SET 
          TinhTrangGiangDay = CASE
      `;

      const updateValues = [];
      const ids = [];

      batch.forEach((item) => {
        let { id_Gvm, TinhTrangGiangDay } = item;

        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, TinhTrangGiangDay);
        ids.push(id_Gvm);
      });

      updateQuery += ` END WHERE id_Gvm IN (${ids.map(() => "?").join(", ")})`;

      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật hàng loạt
      await pool.query(updateQuery, updateValues);
    }
    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  }
};

// =================================================================
// Danh sách chờ duyệt
// Render waiting list site
const getWaitingListSite = async (req, res) => {
  res.render("gvm.waitingList.ejs");
};

// Lấy danh sách chờ duyệt
const getWaitingListData = async (req, res, khoa, checkOrder) => {
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;

  try {
    let query = `SELECT * FROM gvmoi WHERE 
    TinhTrangGiangDay = 1 AND
    (hoc_vien_duyet IS NULL OR hoc_vien_duyet != 1) 
    AND id_Gvm != 1`;

    if (checkOrder != "ALL") {
      if (checkOrder == "khoaChecked") {
        query += ` AND khoa_duyet = 1`;
      }
      if (checkOrder == "daoTaoChecked") {
        query += ` AND dao_tao_duyet = 1`;
      }
      if (checkOrder == "unChecked") {
        query += ` AND khoa_duyet = 0`;
      }
    }

    // Thêm điều kiện lọc
    let params = [];
    let displayOrder = ` ORDER BY 
    (khoa_duyet = 1 AND dao_tao_duyet = 0) DESC, 
    (khoa_duyet = 1 AND dao_tao_duyet = 1) DESC, 
    khoa_duyet ASC`;

    if (MaPhongBan == "BGĐ")
      displayOrder = ` ORDER BY dao_tao_duyet DESC, khoa_duyet DESC`;

    if (isKhoa == 1) {
      query += ` AND MaPhongBan = ?`;
      displayOrder = ` ORDER BY 
      (khoa_duyet = 0 AND dao_tao_duyet = 1) DESC, 
      khoa_duyet ASC`;
      params.push(MaPhongBan);
    } else if (isKhoa == 0 && khoa !== "ALL") {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }

    // Thêm điều kiện sắp xếp
    query += displayOrder;

    const [results] = await pool.query(query, params);

    return results;
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    return;
  }
};

// Lấy danh sách chờ duyệt để hiển thị
const getWaitingListToRender = async (req, res) => {
  const { khoa, checkOrder } = req.query;

  try {
    const results = await getWaitingListData(req, res, khoa, checkOrder);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Lấy số lượng giảng viên chờ duyệt
const getWaitingCountUnapproved = async (req, res) => {
  try {
    // Lấy isKhoa và MaPhongBan để hiển thị
    const isKhoa = req.session.isKhoa;
    const MaPhongBan = req.session.MaPhongBan;
    let query;
    if (isKhoa == 0) {
      query = `SELECT count(*) as count FROM gvmoi WHERE 
        TinhTrangGiangDay = 1 AND
        (hoc_vien_duyet IS NULL OR hoc_vien_duyet != 1) 
        AND id_Gvm != 1`;

      // Nếu là đào tạo, lấy số lượng khi khoa đã duyệt
      if (MaPhongBan === "DAOTAO") {
        query += " AND khoa_duyet = 1";
      }

      // Nếu là học viện, lấy số lượng khi đào tạo đã duyệt
      if (MaPhongBan === "BGĐ") {
        query += " AND dao_tao_duyet = 1";
      }
    } else if (isKhoa == 1) {
      query = `SELECT count(*) as count FROM gvmoi WHERE 
      TinhTrangGiangDay = 1 AND
      MaPhongBan LIKE '%${MaPhongBan}%' 
      AND (hoc_vien_duyet IS NULL OR hoc_vien_duyet != 1) 
      AND id_Gvm != 1`;
    }

    const [results] = await pool.query(query);

    return res.json(results[0].count);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Duyệt giảng viên
const updateWaitingList = async (req, res) => {
  const updatedData = req.body;
  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Lấy thông tin người dùng từ session để ghi log
    const userId = req.session?.userId || 0;
    const userName = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
    const userRole = req.session?.role || '';
    const maPhongBan = req.session?.MaPhongBan || '';

    // Lấy thông tin giảng viên trước khi cập nhật để so sánh
    const gvmIds = updatedData.map(item => item.id_Gvm);
    const [originalData] = await pool.query(
      `SELECT id_Gvm, MaGvm, HoTen, khoa_duyet, dao_tao_duyet, hoc_vien_duyet FROM gvmoi WHERE id_Gvm IN (?)`,
      [gvmIds]
    );
    
    // Tạo map để dễ dàng tra cứu
    const originalGvmMap = {};
    originalData.forEach(gvm => {
      originalGvmMap[gvm.id_Gvm] = gvm;
    });

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < updatedData.length; i += batchSize) {
      batches.push(updatedData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE gvmoi
        SET 
          khoa_duyet = CASE
      `;

      const updateValues = [];
      const ids = [];

      batch.forEach((item) => {
        let { id_Gvm, khoa_duyet } = item;

        if (item.unchecked == true) {
          khoa_duyet = 0;
        }
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, khoa_duyet);
        ids.push(id_Gvm);
      });

      // Đào tạo duyệt
      updateQuery += ` END, dao_tao_duyet = CASE `;

      batch.forEach((item) => {
        const { id_Gvm, dao_tao_duyet } = item;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, dao_tao_duyet);
      });

      // Học viên duyệt
      updateQuery += ` END, hoc_vien_duyet = CASE `;

      batch.forEach((item) => {
        const { id_Gvm, hoc_vien_duyet } = item;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, hoc_vien_duyet);
      });

      updateQuery += ` END WHERE id_Gvm IN (${ids.map(() => "?").join(", ")})`;

      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật hàng loạt
      await pool.query(updateQuery, updateValues);
    }

    // Ghi log các thay đổi
    try {
      for (const item of updatedData) {
        const original = originalGvmMap[item.id_Gvm];
        if (!original) continue;
        
        // Xác định loại phê duyệt dựa trên role và trạng thái thay đổi
        let logMessages = [];
        
        // Log khoa duyệt
        if (original.khoa_duyet !== item.khoa_duyet) {
          const action = item.khoa_duyet === 1 ? 'đã duyệt' : 'đã hủy duyệt';
          if (req.session.isKhoa === 1) {
            logMessages.push(`Khoa ${action} giảng viên mời: ${original.HoTen} (${original.MaGvm})`);
          }
        }
        
        // Log đào tạo duyệt
        if (original.dao_tao_duyet !== item.dao_tao_duyet) {
          const action = item.dao_tao_duyet === 1 ? 'đã duyệt' : 'đã hủy duyệt';
          if (maPhongBan === 'DAOTAO') {
            logMessages.push(`Đào tạo ${action} giảng viên mời: ${original.HoTen} (${original.MaGvm})`);
          }
        }
        
        // Log học viện duyệt
        if (original.hoc_vien_duyet !== item.hoc_vien_duyet) {
          const action = item.hoc_vien_duyet === 1 ? 'đã duyệt' : 'đã hủy duyệt';
          if (maPhongBan === 'BGĐ') {
            logMessages.push(`Ban giám đốc ${action} giảng viên mời: ${original.HoTen} (${original.MaGvm})`);
          }
        }
        
        // Ghi log nếu có thay đổi
        for (const message of logMessages) {
          const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
                           VALUES (?, ?, ?, ?, ?, NOW())`;
          
          await pool.query(logQuery, [
            userId,
            userName,
            maPhongBan,
            'Duyệt giảng viên mời',
            message
          ]);
        }
      }
    } catch (logError) {
      // Tiếp tục với phản hồi ngay cả khi ghi log thất bại
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  }
};

// Export danh sách chờ duyệt
const exportWaitingList = async (req, res) => {
  const { MaPhongBan, checkOrder } = req.body;

  const isKhoa = req.session.isKhoa;
  const MaPhongBanSession = req.session.MaPhongBan;

  try {
    const results = await getWaitingListData(req, res, MaPhongBan, checkOrder);

    await getGvmListXLSX(
      req,
      res,
      results,
      isKhoa == 1 ? MaPhongBanSession : MaPhongBan
    );
  } catch (error) {
    console.error("Lỗi truy vấn:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi xuất danh sách" });
  }
};

// ================================================================
// Danh sách đã duyệt
// Render checked list site
const getCheckedListSite = async (req, res) => {
  res.render("gvm.checkedList.ejs");
};

// Lấy dữ liệu danh sách đã duyệt
const getCheckedListData = async (req, res, khoa) => {
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;

  try {
    let query = `SELECT * FROM gvmoi WHERE
    TinhTrangGiangDay = 1 AND
     hoc_vien_duyet = 1 AND id_Gvm != 1`;
    let params = [];

    if (isKhoa == 1) {
      query += ` AND MaPhongBan = ?`;
      params.push(MaPhongBan);
    } else if (isKhoa == 0) {
      if (khoa !== "ALL") {
        query += ` AND MaPhongBan = ?`;
        params.push(khoa);
      }
    }

    const [results] = await pool.query(query, params);

    return results;
  } catch (error) {
    console.error("Error fetching waiting list:", error);
  }
};

// Lấy danh sách đã duyệt để hiển thị
const getCheckedListToRender = async (req, res) => {
  const khoa = req.query.khoa;

  try {
    const results = await getCheckedListData(req, res, khoa);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const exportCheckedList = async (req, res) => {
  let { MaPhongBan } = req.body;

  const isKhoa = req.session.isKhoa;
  const MaPhongBanSession = req.session.MaPhongBan;

  if (isKhoa == 1) {
    MaPhongBan = MaPhongBanSession;
  }

  try {
    const results = await getCheckedListData(req, res, MaPhongBan);

    await getGvmListXLSX(req, res, results, MaPhongBan);
  } catch (error) {
    console.error("Lỗi truy vấn:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi xuất danh sách" });
  }
};

// Bỏ duyệt
const unCheckedLecturers = async (req, res) => {
  const updatedData = req.body;

  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }
    
    // Lấy thông tin người dùng từ session để ghi log
    const userId = req.session?.userId || 0;
    const userName = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
    const userRole = req.session?.role || '';
    const maPhongBan = req.session?.MaPhongBan || '';

    // Lấy thông tin giảng viên trước khi cập nhật để so sánh
    const gvmIds = updatedData.map(item => item.id_Gvm);
    const [originalData] = await pool.query(
      `SELECT id_Gvm, MaGvm, HoTen, khoa_duyet, dao_tao_duyet, hoc_vien_duyet FROM gvmoi WHERE id_Gvm IN (?)`,
      [gvmIds]
    );
    
    // Tạo map để dễ dàng tra cứu
    const originalGvmMap = {};
    originalData.forEach(gvm => {
      originalGvmMap[gvm.id_Gvm] = gvm;
    });

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < updatedData.length; i += batchSize) {
      batches.push(updatedData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE gvmoi
        SET 
          khoa_duyet = CASE
      `;

      const updateValues = [];
      const ids = [];

      batch.forEach((item) => {
        let { id_Gvm, khoa_duyet } = item;

        khoa_duyet = 0;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, khoa_duyet);
        ids.push(id_Gvm);
      });

      // Đào tạo duyệt
      updateQuery += ` END, dao_tao_duyet = CASE `;

      batch.forEach((item) => {
        let { id_Gvm, dao_tao_duyet } = item;

        dao_tao_duyet = 0;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, dao_tao_duyet);
      });

      // Học viên duyệt
      updateQuery += ` END, hoc_vien_duyet = CASE `;

      batch.forEach((item) => {
        const { id_Gvm, hoc_vien_duyet } = item;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, hoc_vien_duyet);
      });

      updateQuery += ` END WHERE id_Gvm IN (${ids.map(() => "?").join(", ")})`;

      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật hàng loạt
      await pool.query(updateQuery, updateValues);
    }
    
    // Ghi log các thay đổi
    try {
      for (const item of updatedData) {
        const original = originalGvmMap[item.id_Gvm];
        if (!original) continue;
        
        // Xác định người hủy duyệt dựa trên role
        let actionType = 'Hủy phê duyệt';
        let message = '';
        
        if (req.session.isKhoa === 1) {
          message = `Khoa hủy tất cả phê duyệt giảng viên mời: ${original.HoTen} (${original.MaGvm})`;
        } else if (maPhongBan === 'DAOTAO') {
          message = `Đào tạo hủy tất cả phê duyệt giảng viên mời: ${original.HoTen} (${original.MaGvm})`;
        } else if (maPhongBan === 'BGĐ') {
          message = `Ban giám đốc hủy tất cả phê duyệt giảng viên mời: ${original.HoTen} (${original.MaGvm})`;
        } else {
          message = `${userName} hủy tất cả phê duyệt giảng viên mời: ${original.HoTen} (${original.MaGvm})`;
        }
        const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
                         VALUES (?, ?, ?, ?, ?, NOW())`;
        
        await pool.query(logQuery, [
          userId,
          userName,
          maPhongBan,
          'Hủy duyệt giảng viên mời',
          message
        ]);
      }
    } catch (logError) {
      // Tiếp tục với phản hồi ngay cả khi ghi log thất bại
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  }
};

// ===============================================================
// Dùng chung
// Hàm sanitize tên file
const sanitizeFileName = (name) => {
  return name.replace(/[\/\\?%*:|"<> ]/g, "_");
};

// Export danh sách giảng viên
const getGvmListXLSX = async (req, res, rows, MaPhongBan) => {
  try {
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu để xuất." });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GiangVienMoi");

    worksheet.columns = [
      { header: "STT", key: "stt", width: 5 },
      { header: "Họ và tên", key: "HoTen", width: 20 },
      { header: "Giới Tính", key: "GioiTinh", width: 12 },
      { header: "Ngày Sinh", key: "NgaySinh", width: 15 },
      { header: "Điện Thoại", key: "DienThoai", width: 15 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Học Vị", key: "HocVi", width: 10 },
      { header: "Bằng loại", key: "BangTotNghiepLoai", width: 10 },
      { header: "Chức Vụ", key: "ChucVu", width: 12 },
      { header: "Hệ Số Lương", key: "HSL", width: 10 },
      { header: "Nơi Công Tác", key: "NoiCongTac", width: 20 },
      { header: "Số CCCD", key: "CCCD", width: 15 },
      { header: "Ngày Cấp CCCD", key: "NgayCapCCCD", width: 15 },
      { header: "Nơi Cấp", key: "NoiCapCCCD", width: 15 },
      { header: "Địa Chỉ", key: "DiaChi", width: 20 },
      { header: "Mã Số Thuế", key: "MaSoThue", width: 15 },
      { header: "Số Tài Khoản", key: "STK", width: 15 },
      { header: "Tại Ngân Hàng", key: "NganHang", width: 20 },
      { header: "Khoa", key: "MaPhongBan", width: 20 },
      { header: "Bộ Môn", key: "MonGiangDayChinh", width: 20 },
      { header: "Đã nghỉ hưu", key: "isNghiHuu", width: 15 },
    ];

    rows.forEach((row, index) => {
      // Định dạng ngày
      row.NgaySinh = row.NgaySinh
        ? new Date(row.NgaySinh).toLocaleDateString("vi-VN")
        : "";
      row.NgayCapCCCD = row.NgayCapCCCD
        ? new Date(row.NgayCapCCCD).toLocaleDateString("vi-VN")
        : "";
      
      // Định dạng trạng thái nghỉ hưu
      row.isNghiHuu = row.isNghiHuu == 1 ? "Đã nghỉ hưu" : "Chưa nghỉ hưu";

      worksheet.addRow({
        stt: index + 1,
        ...row,
      });
    });

    // Định dạng tiêu đề
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { name: "Times New Roman", size: 12, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Border và font toàn bộ bảng
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.font = { name: "Times New Roman", size: 12 };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    let fileName = `Danh_sach_giang_vien_moi`;
    if (MaPhongBan && MaPhongBan !== "ALL") {
      fileName += `_${sanitizeFileName(MaPhongBan)}`;
    }
    fileName += `.xlsx`;

    const filePath = path.join(__dirname, "../public/exports", fileName);
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return res.status(500).send("Lỗi khi tải file");
      }
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("Lỗi khi xuất Excel:", error);
    res
      .status(500)
      .json({ error: "Có lỗi xảy ra khi xuất danh sách giảng viên mới" });
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getGvmList,
  getGvm,
  //exportGvmToExcel, // Đảm bảo export controller này
  getWaitingListToRender,
  getWaitingListSite, // Danh sách chưa duyệt
  getCheckedListSite, // Danh sách đã duyệt
  getWaitingCountUnapproved,
  updateWaitingList, // Cập nhật duyệt
  getCheckedListData,
  unCheckedLecturers,
  getStoppedTeachingListSite,
  getStoppedTeachingListData, // Danh sách đã dừng giảng dạy
  updateStoppedTeaching,
  exportWaitingList,
  getCheckedListToRender,
  exportCheckedList,
};
```

## File: src/controllers/hopdong.duyetHopDongMoiGiangController.js
```javascript
const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const { DON_GIA_EXPR } = require('../queries/hopdongQueries');

/**
 * Render site
 */
const getDuyetHopDongPage = (req, res) => {
    try {
        res.render('hopdong.duyetHopDongMoiGiang.ejs');
    } catch (error) {
        console.error("Error rendering duyet hop dong page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Hiển thị theo giảng viên
const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan } = req.body;
        if (!dot || !ki || !namHoc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học"
            });
        }

        /** ------------------------------------------------------------------
         *  Truy vấn vào bảng quychuan, tính theo 2 hệ : Đại học, Sau đại học.
         * 
         * Hệ đại học : 100% số tiết
         * Hệ sau đại học : giảng viên trước dấu phẩy 0,3 sau dấu phẩy nhân 0,7 số tiết
         * 
         * 
         *  ------------------------------------------------------------------ */
        const query = `
        /* HỆ ĐẠI HỌC  */
        WITH DaiHocData AS (
            SELECT
                MIN(qc.NgayBatDau)                              AS NgayBatDau,
                MAX(qc.NgayKetThuc)                              AS NgayKetThuc,
                gv.id_Gvm,
                gv.HoTen,
                gv.GioiTinh,
                gv.NgaySinh,
                gv.CCCD,
                gv.NoiCapCCCD,
                gv.Email,
                gv.MaSoThue,
                gv.HocVi,
                gv.ChucVu,
                gv.HSL,
                gv.DienThoai,
                gv.STK,
                gv.NganHang,
                gv.MaPhongBan,          -- Khoa 
                gv.isNghiHuu,
                gv.MaPhongBan           AS MaKhoaMonHoc,        
                qc.he_dao_tao           AS id_he_dao_tao,
                hdt.he_dao_tao          AS ten_he_dao_tao,
                qc.NamHoc,
                qc.KiHoc,
                qc.Dot,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,

                /* ===== TIỀN (DÙNG EXPR – KHÔNG JOIN tienluong) ===== */
                SUM(qc.QuyChuan)                                        AS SoTiet,
                ${DON_GIA_EXPR('qc', 'Khoa')}                           AS TienMoiGiang,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan)        AS ThanhTien,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan) * 0.1  AS Thue,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan) * 0.9  AS ThucNhan,

                pb.TenPhongBan,

                /* Duyệt */
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                /* MATCH GIẢNG VIÊN HỆ ĐH: lấy phần trước ' - ' */
                JOIN gvmoi gv
                    ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                JOIN he_dao_tao hdt
                    ON qc.he_dao_tao = hdt.id
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND hdt.cap_do = 1
                AND gv.isQuanDoi = 0
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            /* Gộp THEO GIẢNG VIÊN + HỆ ĐÀO TẠO (KHÔNG gộp theo khoa học phần) */
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao, hdt.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                qc.NamHoc, qc.KiHoc, qc.Dot, qc.Khoa,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                pb.TenPhongBan
        ),

        /* SAU ĐẠI HỌC */
        SauDaiHocData AS (
            SELECT
                MIN(qc.NgayBatDau)                              AS NgayBatDau,
                MAX(qc.NgayKetThuc)                              AS NgayKetThuc,
                gv.id_Gvm,
                gv.HoTen,
                gv.GioiTinh,
                gv.NgaySinh,
                gv.CCCD,
                gv.NoiCapCCCD,
                gv.Email,
                gv.MaSoThue,
                gv.HocVi,
                gv.ChucVu,
                gv.HSL,
                gv.DienThoai,
                gv.STK,
                gv.NganHang,
                gv.MaPhongBan,
                gv.isNghiHuu,
                gv.MaPhongBan           AS MaKhoaMonHoc,
                qc.he_dao_tao           AS id_he_dao_tao,
                hdt.he_dao_tao          AS ten_he_dao_tao,
                qc.NamHoc,
                qc.KiHoc,
                qc.Dot,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,

                /* ===== TIỀN (DÙNG EXPR) ===== */
                                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                )                                             AS SoTiet,
                ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) AS ThanhTien,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.1 AS Thue,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.9 AS ThucNhan,

                pb.TenPhongBan,
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                
                JOIN gvmoi gv
                    ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
                JOIN he_dao_tao hdt
                    ON qc.he_dao_tao = hdt.id
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND hdt.cap_do != 1
                AND gv.isQuanDoi = 0
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao, hdt.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                qc.NamHoc, qc.KiHoc, qc.Dot, qc.Khoa,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                pb.TenPhongBan
        )

        /* UNION DATA */
        SELECT * FROM DaiHocData
        UNION ALL
        SELECT * FROM SauDaiHocData
        ORDER BY SoTiet DESC, HoTen, id_he_dao_tao
        `;

        /* tham số truyền vào where */
        const params = [namHoc, dot, ki];
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);
        params.push(namHoc, dot, ki);
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);

        const [results] = await connection.query(query, params);

        /** ------------------------------------------------------------------
         *  2. Tính theo giảng viên
         *  ------------------------------------------------------------------ */
        const groupedByTeacher = results.reduce((acc, cur) => {
            const teacher = cur.HoTen;
            if (!acc[teacher]) {
                acc[teacher] = {
                    teacherInfo: {
                        id_Gvm: cur.id_Gvm,
                        HoTen: cur.HoTen,
                        GioiTinh: cur.GioiTinh,
                        NgaySinh: cur.NgaySinh,
                        CCCD: cur.CCCD,
                        NoiCapCCCD: cur.NoiCapCCCD,
                        NgayCapCCCD: cur.NgayCapCCCD,
                        Email: cur.Email,
                        MaSoThue: cur.MaSoThue,
                        HocVi: cur.HocVi,
                        ChucVu: cur.ChucVu,
                        HSL: cur.HSL,
                        DienThoai: cur.DienThoai,
                        STK: cur.STK,
                        NganHang: cur.NganHang,
                        MaPhongBan: cur.MaPhongBan,
                        DiaChi: cur.DiaChi,
                        BangTotNghiep: cur.BangTotNghiep,
                        NoiCongTac: cur.NoiCongTac,
                        BangTotNghiepLoai: cur.BangTotNghiepLoai,
                        MonGiangDayChinh: cur.MonGiangDayChinh,
                        NgayBatDau: cur.NgayBatDau,
                        NgayKetThuc: cur.NgayKetThuc,
                        TenPhongBan: cur.TenPhongBan,
                        isNghiHuu: cur.isNghiHuu
                    },
                    trainingPrograms: [],
                    totalFinancials: {
                        totalSoTiet: 0,
                        totalThanhTien: 0,
                        totalThue: 0,
                        totalThucNhan: 0
                    }
                };
            }

            /* Gộp theo he_dao_tao (nếu trùng thì cộng dồn) */
            const tpArr = acc[teacher].trainingPrograms;
            const existing = tpArr.find(tp => tp.id === cur.id_he_dao_tao);

            const currProgram = {
                id: cur.id_he_dao_tao,
                tenHe: cur.ten_he_dao_tao,
                SoTiet: parseFloat(cur.SoTiet) || 0,
                TienMoiGiang: parseFloat(cur.TienMoiGiang) || 0,
                ThanhTien: parseFloat(cur.ThanhTien) || 0,
                Thue: parseFloat(cur.Thue) || 0,
                ThucNhan: parseFloat(cur.ThucNhan) || 0,
                MaKhoaMonHoc: cur.MaKhoaMonHoc,
                DaoTaoDuyet: cur.DaoTaoDuyet,
                TaiChinhDuyet: cur.TaiChinhDuyet
            };

            if (existing) {
                /* Cộng dồn trị số nếu đã có hệ này */
                existing.SoTiet += currProgram.SoTiet;
                existing.ThanhTien += currProgram.ThanhTien;
                existing.Thue += currProgram.Thue;
                existing.ThucNhan += currProgram.ThucNhan;
            } else {
                tpArr.push(currProgram);
            }

            /* Cộng dồn tổng */
            acc[teacher].totalFinancials.totalSoTiet += currProgram.SoTiet;
            acc[teacher].totalFinancials.totalThanhTien += currProgram.ThanhTien;
            acc[teacher].totalFinancials.totalThue += currProgram.Thue;
            acc[teacher].totalFinancials.totalThucNhan += currProgram.ThucNhan;

            return acc;
        }, {});

        // Chuyển sang Mảng để sort theo số tiết
        const teachersWithTotals = Object.keys(groupedByTeacher).map(name => ({
            teacherName: name,
            teacherData: groupedByTeacher[name],
            totalSoTiet: groupedByTeacher[name].totalFinancials.totalSoTiet,
            maPhongBan: groupedByTeacher[name].teacherInfo.MaPhongBan
        }));

        // sort theo số tiết
        teachersWithTotals.sort((a, b) => {
            if (a.maPhongBan !== b.maPhongBan) {
                return (a.maPhongBan || '').localeCompare(b.maPhongBan || '', 'vi');
            }
            if (b.totalSoTiet !== a.totalSoTiet) return b.totalSoTiet - a.totalSoTiet;
            return a.teacherName.localeCompare(b.teacherName, 'vi');
        });

        // sau khi sort, chuyển lại từ mảng sang obj
        const simplifiedGroupedByTeacher = teachersWithTotals.reduce((acc, { teacherName, teacherData }) => {
            acc[teacherName] = [{
                ...teacherData.teacherInfo,
                SoTiet: teacherData.totalFinancials.totalSoTiet,
                ThanhTien: teacherData.totalFinancials.totalThanhTien,
                Thue: teacherData.totalFinancials.totalThue,
                ThucNhan: teacherData.totalFinancials.totalThucNhan,
                trainingPrograms: teacherData.trainingPrograms,
                totalFinancials: teacherData.totalFinancials
            }];
            return acc;
        }, {});

        /** ------------------------------------------------------------------
         *  4. SỐ TIẾT ĐỊNH MỨC 2 ĐỐI TƯỢNG NGHỈ HƯU VÀ CHƯA NGHỈ HƯU
         *  ------------------------------------------------------------------ */
        const [sotietResult] = await connection.query(
            `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`
        );
        const SoTietDinhMuc = sotietResult[0]?.GiangDay;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu;

        // TÍNH TỔNG TIỀN
        let totalQC = 0, totalThanhTienAll = 0, totalThueAll = 0, totalThucNhanAll = 0;
        Object.values(groupedByTeacher).forEach(t => {
            totalQC += t.totalFinancials.totalSoTiet;
            totalThanhTienAll += t.totalFinancials.totalThanhTien;
            totalThueAll += t.totalFinancials.totalThue;
            totalThucNhanAll += t.totalFinancials.totalThucNhan;
        });

        // gom thành json 
        res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher: groupedByTeacher,    // full detail
            SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu,
            totalsByTeacher: {
                totalQC,
                totalThanhTienAll,
                totalThueAll,
                totalThucNhanAll
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Duyệt tài chính
 */
const approveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }        // Validation for contract type
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Validation for "Mời giảng" - must select all faculties
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            return res.status(400).json({
                success: false,
                message: "Với hợp đồng mời giảng, chỉ được chọn tất cả khoa, không thể duyệt từng khoa riêng lẻ"
            });
        }        // First, check if all records have DaoTaoDuyet = 1 (following TaiChinhCheckAll pattern)
        let unapprovedFaculties = [];

        // For mời giảng, check all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                const [check] = await connection.query(`
                    SELECT DaoTaoDuyet FROM quychuan 
                    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND DaLuu = 0 
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                // Check if all records in this faculty have DaoTaoDuyet = 1
                const hasUnapprovedDaoTao = check.some(record => record.DaoTaoDuyet != 1);
                if (hasUnapprovedDaoTao) {
                    unapprovedFaculties.push(faculty.MaPhongBan);
                }
            }
        }

        // If there are faculties with unapproved DaoTao, return notification instead of error
        if (unapprovedFaculties.length > 0) {
            return res.status(200).json({
                success: false,
                isNotification: true,
                message: `Hiện tại không thể duyệt vì các khoa sau chưa được đào tạo duyệt hoàn toàn: ${unapprovedFaculties.join(', ')}. Vui lòng đợi đào tạo duyệt xong trước khi tiến hành duyệt tài chính.`,
                unapprovedFaculties: unapprovedFaculties,
                affectedRows: 0
            });
        }        // If all checks pass, update TaiChinhDuyet = 1 for mời giảng
        let affectedRows = 0;

        // Lấy thông tin session để ghi log
        const userId = req.session.userId;
        const tenNhanVien = req.session.TenNhanVien || '';
        const khoa = req.session.MaPhongBan || '';

        // Mảng chứa tất cả log entries
        const logEntries = [];

        // For mời giảng, update all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties and update each that has all DaoTaoDuyet = 1
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                // Double-check this faculty is fully approved by DaoTao
                const [check] = await connection.query(`
                    SELECT DaoTaoDuyet FROM quychuan 
                    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND DaLuu = 0 
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                const allDaoTaoApproved = check.every(record => record.DaoTaoDuyet == 1);

                if (allDaoTaoApproved && check.length > 0) {
                    const [updateResult] = await connection.query(`
                        UPDATE quychuan qc
                        SET qc.TaiChinhDuyet = 1 
                        WHERE qc.Khoa = ? AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? 
                          AND qc.DaoTaoDuyet = 1 AND qc.TaiChinhDuyet != 1 AND qc.DaLuu = 0
                    `, [faculty.MaPhongBan, dot, ki, namHoc]);

                    affectedRows += updateResult.affectedRows;

                    // Ghi log cho từng khoa được cập nhật
                    if (updateResult.affectedRows > 0) {
                        const noiDungThayDoi = `Duyệt tài chính ${updateResult.affectedRows} hợp đồng mời giảng - Khoa: ${faculty.MaPhongBan}, Đợt: ${dot}, Kì: ${ki}, Năm: ${namHoc}`;
                        logEntries.push([
                            userId,
                            tenNhanVien,
                            khoa,
                            'Duyệt hợp đồng mời giảng',
                            noiDungThayDoi,
                            new Date()
                        ]);
                    }
                }
            }
        }

        // Ghi tất cả log entries vào database một lần
        if (logEntries.length > 0) {
            await connection.query(
                `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES ?`,
                [logEntries]
            );
        } const facultyText = ' của tất cả khoa';

        res.json({
            success: true,
            message: `Duyệt thành công`,
            affectedRows: affectedRows
        });

    } catch (error) {
        console.error("Error approving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi duyệt hợp đồng"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Bỏ duyệt tài chính
 */
const unapproveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }

        // Validation for contract type
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Validation for "Mời giảng" - must select all faculties
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            return res.status(400).json({
                success: false,
                message: "Với hợp đồng mời giảng, chỉ được chọn tất cả khoa, không thể bỏ duyệt từng khoa riêng lẻ"
            });
        }

        // Update TaiChinhDuyet = 0 for mời giảng (reverse of approval)
        let affectedRows = 0;

        // Lấy thông tin session để ghi log
        const userId = req.session.userId;
        const tenNhanVien = req.session.TenNhanVien || '';
        const khoa = req.session.MaPhongBan || '';

        // Mảng chứa tất cả log entries
        const logEntries = [];

        // For mời giảng, update all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties and update each that has TaiChinhDuyet = 1
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                const [updateResult] = await connection.query(`
                    UPDATE quychuan qc
                    JOIN gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                    SET qc.TaiChinhDuyet = 0 
                    WHERE qc.Khoa = ? AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.DaLuu = 0
                      AND qc.TaiChinhDuyet = 1
                      AND gv.isQuanDoi = 0
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                affectedRows += updateResult.affectedRows;

                // Ghi log cho từng khoa được cập nhật
                if (updateResult.affectedRows > 0) {
                    const noiDungThayDoi = `Bỏ duyệt tài chính ${updateResult.affectedRows} hợp đồng mời giảng - Khoa: ${faculty.MaPhongBan}, Đợt: ${dot}, Kì: ${ki}, Năm: ${namHoc}`;
                    logEntries.push([
                        userId,
                        tenNhanVien,
                        khoa,
                        'Bỏ duyệt hợp đồng mời giảng',
                        noiDungThayDoi,
                        new Date()
                    ]);
                }
            }
        }

        // Ghi tất cả log entries vào database một lần
        if (logEntries.length > 0) {
            await connection.query(
                `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES ?`,
                [logEntries]
            );
        } const facultyText = ' của tất cả khoa';

        res.json({
            success: true,
            message: `Đã bỏ duyệt thành công hợp đồng`,
        });

    } catch (error) {
        console.error("Error unapproving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi bỏ duyệt hợp đồng"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Hiển thị hợp đồng theo hệ đào tạo
 */
const gvmServices = require("../services/gvmServices")

const getDuyetHopDongTheoHeDaoTao = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học"
            });
        }        // Validate loaiHopDong values

        // Lấy danh sách hệ đào tạo
        const heDaoTaoLists = await gvmServices.getHeMoiGiangData();


        let results = [];          // 👉 Tổng theo hệ đào tạo
        let enhancedResults = [];  // 👉 Chi tiết theo hệ

        for (const heDaoTao of heDaoTaoLists) {
            const he_dao_tao = heDaoTao.id;
            const khoa = 'ALL';

            const { finalQuery, params } = gvmServices.buildDynamicQuery({
                namHoc,
                dot,
                ki,
                he_dao_tao,
                khoa
            });

            const [rows] = await connection.query(finalQuery, params);

            // ✅ TÍNH TỔNG: SỐ TIẾT – THÀNH TIỀN – THỰC NHẬN
            const totals = rows.reduce((acc, gv) => {
                acc.tongSoTiet += parseFloat(gv.SoTiet) || 0;
                acc.tongThanhTien += parseFloat(gv.ThanhTien) || 0;
                acc.tongThucNhan += parseFloat(gv.ThucNhan) || 0;
                return acc;
            }, {
                tongSoTiet: 0,
                tongThanhTien: 0,
                tongThucNhan: 0
            });

            // ✅ MẢNG TỔNG RIÊNG
            results.push({
                heDaoTaoId: heDaoTao.id,
                tenHeDaoTao: heDaoTao.he_dao_tao,
                ...totals
            });

            // ✅ MẢNG CHI TIẾT RIÊNG
            enhancedResults.push({
                ...heDaoTao,
                chiTietGiangVien: rows
            });
        }




        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560;

        // Calculate totals for training program view - Tách riêng ĐTPH và khác
        let totalDTPH = {
            totalSoTietHeDaoTao: 0,
            totalThanhTienHeDaoTao: 0,
            totalThueHeDaoTao: 0,
            totalThucNhanHeDaoTao: 0
        };

        let totalMienBac = {
            totalSoTietHeDaoTao: 0,
            totalThanhTienHeDaoTao: 0,
            totalThueHeDaoTao: 0,
            totalThucNhanHeDaoTao: 0
        };

        // Lấy dữ liệu chi tiết để phân loại theo khoa
        for (const heDaoTao of enhancedResults) {
            // Duyệt qua từng giảng viên trong hệ đào tạo để phân loại theo khoa
            heDaoTao.chiTietGiangVien.forEach(giangVien => {
                const soTiet = parseFloat(giangVien.TongTiet) || 0;
                const thanhTien = parseFloat(giangVien.ThanhTien) || 0;
                const thue = parseFloat(giangVien.Thue) || 0;
                const thucNhan = parseFloat(giangVien.ThucNhan) || 0;

                console.log("tiet = ", soTiet)

                if (giangVien.MaPhongBan === 'ĐTPH') {
                    totalDTPH.totalSoTietHeDaoTao += soTiet;
                    totalDTPH.totalThanhTienHeDaoTao += thanhTien;
                    totalDTPH.totalThueHeDaoTao += thue;
                    totalDTPH.totalThucNhanHeDaoTao += thucNhan;
                } else {
                    totalMienBac.totalSoTietHeDaoTao += soTiet;
                    totalMienBac.totalThanhTienHeDaoTao += thanhTien;
                    totalMienBac.totalThueHeDaoTao += thue;
                    totalMienBac.totalThucNhanHeDaoTao += thucNhan;
                }
            });
        }

        // Debug log to verify structure
        console.log('Enhanced Results Sample:', enhancedResults.length > 0 ? {
            firstItem: {
                id: enhancedResults[0].id,
                tenHe: enhancedResults[0].tenHe,
                hasId: !!enhancedResults[0].id,
                hasTenHe: !!enhancedResults[0].tenHe,
                keys: Object.keys(enhancedResults[0])
            }
        } : 'No data');

        res.json({
            success: true,
            data: results,
            enhancedData: enhancedResults,  // Include detailed data with teacher information
            SoTietDinhMuc: SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu: SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu: SoTietDinhMucDaNghiHuu,
            message: `Tải dữ liệu thành công`,
            // Include calculated totals for training program view - Tách riêng ĐTPH và Miền Bắc
            totalsByHeDaoTao: {
                DTPH: totalDTPH,
                MIEN_BAC: totalMienBac,
                // Giữ lại tổng chung nếu cần
                TONG_CHUNG: {
                    totalSoTietHeDaoTao: totalDTPH.totalSoTietHeDaoTao + totalMienBac.totalSoTietHeDaoTao,
                    totalThanhTienHeDaoTao: totalDTPH.totalThanhTienHeDaoTao + totalMienBac.totalThanhTienHeDaoTao,
                    totalThueHeDaoTao: totalDTPH.totalThueHeDaoTao + totalMienBac.totalThueHeDaoTao,
                    totalThucNhanHeDaoTao: totalDTPH.totalThucNhanHeDaoTao + totalMienBac.totalThucNhanHeDaoTao
                }
            }
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongTheoHeDaoTao:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu theo hệ đào tạo",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check đã lưu
 */
const checkContractSaveStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }        // Validate loaiHopDong values
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }        // Check overall status for mời giảng
        // const statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT DaLuu) as distinctValues, MIN(DaLuu) as minValue, MAX(DaLuu) as maxVal FROM quychuan qc WHERE qc.NamHoc = ? AND qc.Dot = ? AND qc.KiHoc = ?";
        const statusQuery = `
    SELECT COUNT(*) as totalRecords, 
           COUNT(DISTINCT DaLuu) as distinctValues, 
           MIN(DaLuu) as minValue, 
           MAX(DaLuu) as maxVal 
    FROM quychuan qc 
    WHERE qc.NamHoc = ? 
      AND qc.Dot = ? 
      AND qc.KiHoc = ?
      AND qc.MoiGiang = 1`;
        const statusParams = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND qc.Khoa = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không có dữ liệu";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có DaLuu = 1
            message = "Đã lưu HĐ";
        } else {            // Có bản ghi chưa đạt điều kiện - lấy chi tiết
            message = "Chưa lưu HĐ";

            const detailQuery = `
    SELECT 
        qc.ID,
        qc.Khoa,
        qc.MaHocPhan,
        qc.LopHocPhan,
        qc.TenLop,
        qc.GiaoVienGiangDay,
        qc.QuyChuan,
        qc.DaLuu,
        qc.NgayBatDau,
        qc.NgayKetThuc,
        pb.TenPhongBan as TenKhoa
    FROM quychuan qc
    LEFT JOIN phongban pb ON qc.Khoa = pb.MaPhongBan
    WHERE qc.NamHoc = ? 
      AND qc.Dot = ? 
      AND qc.KiHoc = ?
      AND qc.MoiGiang = 1          -- ✅ BỔ SUNG
      AND (qc.DaLuu IS NULL OR qc.DaLuu <> 1)
`;
            const detailParams = [namHoc, dot, ki];

            if (maPhongBan && maPhongBan !== "ALL") {
                detailQuery += " AND qc.Khoa = ?";
                detailParams.push(maPhongBan);
            }

            const [detailResults] = await connection.query(detailQuery, detailParams);
            unmetRecords = detailResults;
        } res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractSaveStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái lưu hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * check đã duyệt
 */
const checkContractFinanceApprovalStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }

        // Validate loaiHopDong values
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Check overall TaiChinhDuyet status for mời giảng
        let statusQuery = `
            SELECT COUNT(*) as totalRecords, 
                   COUNT(DISTINCT TaiChinhDuyet) as distinctValues, 
                   MIN(TaiChinhDuyet) as minValue, 
                   MAX(TaiChinhDuyet) as maxVal 
            FROM quychuan qc 
            WHERE qc.NamHoc = ? 
              AND qc.Dot = ? 
              AND qc.KiHoc = ?
              AND qc.MoiGiang = 1`;

        const statusParams = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND qc.Khoa = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;

        if (statusData.totalRecords === 0) {
            message = "Chưa duyệt";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có TaiChinhDuyet = 1
            message = "Đã duyệt";
        } else {
            // Có bản ghi chưa đạt điều kiện
            message = "Chưa duyệt";
        }

        console.log("debug tc duyet moi giang : " + message);

        res.json({
            success: true,
            message: message
        });

    } catch (error) {
        console.error("❌ Error in checkContractFinanceApprovalStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái duyệt tài chính hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDuyetHopDongPage,
    getDuyetHopDongData,
    getDuyetHopDongTheoHeDaoTao,
    approveContracts,
    unapproveContracts,
    checkContractSaveStatus,
    checkContractFinanceApprovalStatus
};
```

## File: src/controllers/phuLucHDController.js
```javascript
const express = require("express");
const ExcelJS = require("exceljs");
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const path = require("path");
const gvmService = require("../services/gvmServices");

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]/gi, "_");
}

function convertToRoman(num) {
  const romanNumerals = [
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 8, numeral: "VIII" },
    { value: 7, numeral: "VII" },
    { value: 6, numeral: "VI" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 3, numeral: "III" },
    { value: 2, numeral: "II" },
    { value: 1, numeral: "I" },
  ];

  return romanNumerals
    .filter((r) => num >= r.value)
    .map((r) => {
      const times = Math.floor(num / r.value);
      num -= times * r.value;
      return r.numeral.repeat(times);
    })
    .join("");
}
// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return capitalizeFirstLetter(words.trim() + " đồng");
};

function formatVietnameseDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}
function formatDateDMY(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
const getTienLuongList = async (connection) => {
  const query = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
  const [tienLuongList] = await connection.execute(query);
  return tienLuongList;
};

const getExportPhuLucGiangVienMoiPath = async (
  req,
  connection,
  dot,
  ki,
  namHoc,
  loaiHopDongText,
  khoa,
  teacherName,
  data
) => {
  try {
    // Lấy dữ liệu từ session
    const isKhoa = req.session.isKhoa;

    const tienLuongList = await getTienLuongList(connection);

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();

    // Nhóm dữ liệu theo giảng viên
    const groupedData = data.reduce((acc, cur) => {
      (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
      return acc;
    }, {});
    const summarySheet = workbook.addWorksheet("Tổng hợp");

    // Thiết lập các thông số cho trang
    summarySheet.pageSetup = {
      paperSize: 9, // Kích thước giấy A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3149,
        right: 0.3149,
        top: 0,
        bottom: 0,
        header: 0.3149,
        footer: 0.3149,
      },
    };
    summarySheet.addRow([]); // Thêm một hàng trống ở đầu sheet
    // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
    const titleRow0 = summarySheet.addRow(["Ban Cơ yếu Chính phủ"]);
    titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
    titleRow0.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

    // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
    const titleRow1 = summarySheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
    titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow1.alignment = { vertical: "middle", horizontal: "center" };
    summarySheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`); const titleRow2 = summarySheet.addRow(["Phụ lục"]);
    titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

    // Lấy SoHopDong và SoThanhLyHopDong từ dữ liệu đầu tiên để hiển thị trong tổng hợp
    const firstSoHopDong = data[0]?.SoHopDong || '';
    const firstSoThanhLyHopDong = data[0]?.SoThanhLyHopDong || '';

    // Xử lý firstSoHopDong: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
    const summaryContractNumber = firstSoHopDong && firstSoHopDong.trim() !== ''
      ? `Hợp đồng số: ${firstSoHopDong} `
      : `Hợp đồng số:           /HĐ-ĐT `;

    const titleRow3 = summarySheet.addRow([summaryContractNumber]);
    titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow3.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

    // Xử lý firstSoThanhLyHopDong: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
    const summaryVerificationNumber = firstSoThanhLyHopDong && firstSoThanhLyHopDong.trim() !== ''
      ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${firstSoThanhLyHopDong} `
      : `Kèm theo biên bản nghiệm thu Hợp đồng số:           /HĐNT-ĐT `;

    const titleRow4 = summarySheet.addRow([
      summaryVerificationNumber,
    ]);
    titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow4.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);
    // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
    const titleRow5 = summarySheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Đơn vị tính: Đồng",
      "",
      "",
    ]);
    titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

    // Thiết lập tiêu đề cột
    const summaryHeader = [
      "STT",
      "Họ tên giảng viên",
      "Tên học phần",
      "Tên lớp",
      "Số tiết",
      "Thời gian thực hiện",
      "Học kỳ",
      "Địa chỉ",
      "Học vị",
      "HS lương",
      "Mức thanh toán",
      "Thành tiền",
      "Trừ thuế TNCN 10%",
      "Còn lại",
    ];

    const headerRow = summarySheet.addRow(summaryHeader);
    headerRow.font = { name: "Times New Roman", bold: true };

    // Định dạng cột
    summarySheet.getColumn(1).width = 5; // STT
    summarySheet.getColumn(2).width = 18; // Họ tên giảng viên
    summarySheet.getColumn(3).width = 30; // Tên học phần
    summarySheet.getColumn(4).width = 14; // Tên lớp
    summarySheet.getColumn(5).width = 10; // Số tiết
    summarySheet.getColumn(6).width = 17; // Thời gian thực hiện
    summarySheet.getColumn(7).width = 6; // Học kỳ
    summarySheet.getColumn(8).width = 29; // Địa chỉ
    summarySheet.getColumn(9).width = 6; // Học vị
    summarySheet.getColumn(10).width = 6; // Hệ số lương
    summarySheet.getColumn(11).width = 12; // Mức thanh toán
    summarySheet.getColumn(12).width = 14; // Thành tiền
    summarySheet.getColumn(13).width = 14; // Trừ thuế TNCN 10%
    summarySheet.getColumn(14).width = 14; // Còn lại

    // Thêm dữ liệu vào sheet tổng hợp
    let stt = 1;
    let totalSoTiet = 0;
    let totalSoTien = 0;
    let totalTruThue = 0;
    let totalThucNhan = 0;

    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      giangVienData.forEach((item) => {
        const soTiet = item.SoTiet;
        const hocVi = item.HocVi || "Thạc sĩ"; // Default to "Thạc sĩ" if HocVi is empty

        // Tìm mức tiền lương dựa trên he_dao_tao và HocVi
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;

        // Tính toán số tiền, thuế, thực nhận
        const soTien = soTiet * mucThanhToan;
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1;
        const thucNhan = soTien - truThue;
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;        // Thêm hàng dữ liệu vào sheet tổng hợp
        const summaryRow = summarySheet.addRow([
          stt,
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          (item.SoTiet || 0).toLocaleString("vi-VN"),
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN"),
          mucThanhToan.toLocaleString("vi-VN"), // Mức thanh toán
          soTien.toLocaleString("vi-VN"), // Định dạng số tiền
          truThue.toLocaleString("vi-VN"), // Định dạng số tiền
          thucNhan.toLocaleString("vi-VN"), // Định dạng số tiền
        ]);

        // Cập nhật các tổng cộng
        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;

        // Căn chỉnh cỡ chữ và kiểu chữ cho từng ô trong hàng dữ liệu
        summaryRow.eachCell((cell, colNumber) => {
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
          cell.alignment = { horizontal: "center", vertical: "middle" }; // Căn giữa
          cell.alignment.wrapText = true; // Bật wrapText cho ô
        });

        stt++; // Tăng số thứ tự
      });
    }    // Thêm hàng tổng cộng vào cuối bảng
    const totalRow = summarySheet.addRow([
      "Tổng cộng",
      "",
      "",
      "",
      totalSoTiet.toLocaleString("vi-VN"),
      "",
      "",
      "",
      "",
      "",
      "",
      totalSoTien.toLocaleString("vi-VN"),
      totalTruThue.toLocaleString("vi-VN"),
      totalThucNhan.toLocaleString("vi-VN"),
    ]);

    totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
    totalRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Gộp ô cho hàng tổng cộng
    summarySheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    // Định dạng các ô trong bảng
    const firstRowOfTable = 6; // Giả sử bảng bắt đầu từ hàng 8
    const lastRowOfTable = totalRow.number; // Hàng tổng cộng

    for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
      const row = summarySheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }
    // Định dạng cho tiêu đề cột
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "none", // Không màu nền
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    // Tạo một sheet cho mỗi giảng viên
    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      const worksheet = workbook.addWorksheet(giangVien);

      worksheet.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0 = worksheet.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1 = worksheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);

      const titleRow2 = worksheet.addRow(["Phụ lục"]);
      titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);      // Tìm ngày bắt đầu sớm nhất từ dữ liệu giảng viên
      const earliestDate = giangVienData.reduce((minDate, item) => {
        const currentStartDate = new Date(item.NgayBatDau);
        return currentStartDate < minDate ? currentStartDate : minDate;
      }, new Date(giangVienData[0].NgayBatDau));

      // Định dạng ngày bắt đầu sớm nhất thành chuỗi
      const formattedEarliestDate = formatVietnameseDate(earliestDate);      // Lấy SoHopDong từ dữ liệu giảng viên (vì tất cả có cùng CCCD nên SoHopDong giống nhau)
      const soHopDong = giangVienData[0]?.SoHopDong || '';
      const soThanhLyHopDong = giangVienData[0]?.SoThanhLyHopDong || '';

      // Xử lý soHopDong: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
      const contractNumber = soHopDong && soHopDong.trim() !== ''
        ? `Hợp đồng số: ${soHopDong} ${formattedEarliestDate}`
        : `Hợp đồng số:           /HĐ-ĐT ${formattedEarliestDate}`;

      const titleRow3 = worksheet.addRow([
        contractNumber,
      ]);
      titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5 = worksheet.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
        "STT", // Thêm tiêu đề STT
        "Họ tên giảng viên",
        "Tên học phần",
        "Tên lớp",
        "Số tiết",
        "Thời gian thực hiện",
        "Học kỳ",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow = worksheet.addRow(header);
      headerRow.font = { name: "Times New Roman", bold: true };

      worksheet.pageSetup = {
        paperSize: 9, // A4 paper size
        orientation: "landscape",
        fitToPage: true, // Fit to page
        fitToWidth: 1, // Fit to width
        fitToHeight: 0, // Do not fit to height
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };

      // Căn chỉnh độ rộng cột
      // Định dạng độ rộng cột, bao gồm cột STT
      worksheet.getColumn(1).width = 5; // STT
      worksheet.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet.getColumn(3).width = 30; // Tên học phần
      worksheet.getColumn(4).width = 14; // Tên lớp
      worksheet.getColumn(5).width = 10; // Số tiết
      worksheet.getColumn(6).width = 17; // Thời gian thực hiện
      worksheet.getColumn(7).width = 6; // Học kỳ
      worksheet.getColumn(8).width = 29; // Địa Chỉ
      worksheet.getColumn(9).width = 6; // Học vị
      worksheet.getColumn(10).width = 6; // Hệ số lương
      worksheet.getColumn(11).width = 12; // Mức thanh toán
      worksheet.getColumn(12).width = 14; // Thành tiền
      worksheet.getColumn(13).width = 14; // Trừ thuế TNCN 10%
      worksheet.getColumn(14).width = 14; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "none", // Không màu nền
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      let totalSoTiet = 0;
      let totalSoTien = 0;
      let totalTruThue = 0;
      let totalThucNhan = 0;

      giangVienData.forEach((item, index) => {
        const soTiet = item.SoTiet;
        const hocVi = item.HocVi || "Thạc sĩ"; // Default to "Thạc sĩ" if HocVi is empty

        // Tìm mức tiền lương dựa trên he_dao_tao và HocVi
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;

        // Tính toán số tiền, thuế, thực nhận
        const soTien = soTiet * mucThanhToan;
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1;
        const thucNhan = soTien - truThue;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        const hocKyLaMa = convertToRoman(item.HocKy);
        // Viết tắt Học vị
        const hocViVietTat =
          hocVi === "Tiến sĩ" ? "TS" : hocVi === "Thạc sĩ" ? "ThS" : hocVi; const row = worksheet.addRow([
            index + 1, // STT
            item.GiangVien,
            item.TenHocPhan,
            item.Lop,
            (item.SoTiet || 0).toLocaleString("vi-VN"),
            thoiGianThucHien,
            hocKyLaMa, // Sử dụng số La Mã cho Học kỳ
            item.DiaChi,
            hocViVietTat, // Sử dụng viết tắt cho Học vị
            item.HSL.toLocaleString("vi-VN"),
            mucThanhToan.toLocaleString("vi-VN"), // Mức thanh toán
            soTien.toLocaleString("vi-VN"), // Định dạng số tiền
            truThue.toLocaleString("vi-VN"),
            thucNhan.toLocaleString("vi-VN"),
          ]);
        row.font = { name: "Times New Roman", size: 13 };

        // Bật wrapText cho các ô dữ liệu và căn giữa
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Chỉnh cỡ chữ cho từng cột
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;
      });      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet.toLocaleString("vi-VN"),
        "",
        "",
        "",
        "",
        "",
        "",
        totalSoTien.toLocaleString("vi-VN"),
        totalTruThue.toLocaleString("vi-VN"),
        totalThucNhan.toLocaleString("vi-VN"),
      ]);
      totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Gộp ô cho hàng tổng cộng
      worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      // Thêm hai dòng trống
      worksheet.addRow([]);
      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      const bangChuRow = worksheet.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien)}`,
      ]);
      bangChuRow.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet.mergeCells(`A${bangChuRow.number}:${bangChuRow.number}`);
      bangChuRow.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 6 trở đi
      const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 7
      const lastRowOfTable = totalRow.number; // Hàng tổng cộng

      for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }

      // Thêm sheet 2 cho mỗi giảng viên
      const worksheet2 = workbook.addWorksheet(`${giangVien} (2)`);

      worksheet2.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0_2 = worksheet2.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0_2.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow0_2.number}:C${titleRow0_2.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1_2 = worksheet2.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1_2.alignment = { vertical: "middle", horizontal: "center" };
      worksheet2.mergeCells(`A${titleRow1_2.number}:C${titleRow1_2.number}`);

      const titleRow2_2 = worksheet2.addRow(["Phụ lục"]);
      titleRow2_2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow2_2.number}:L${titleRow2_2.number}`);

      // Tìm ngày kết thúc muộn nhất từ dữ liệu giảng viên (cho biên bản nghiệm thu)
      const latestEndDate = giangVienData.reduce((maxDate, item) => {
        const currentEndDate = new Date(item.NgayKetThuc);
        return currentEndDate > maxDate ? currentEndDate : maxDate;
      }, new Date(giangVienData[0].NgayKetThuc));

      // Định dạng ngày kết thúc muộn nhất thành chuỗi
      const formattedLatestEndDate = formatVietnameseDate(latestEndDate);

      // Lấy SoThanhLyHopDong từ dữ liệu giảng viên
      const soHopDong_2 = giangVienData[0]?.SoHopDong || '';
      const soThanhLyHopDong_2 = giangVienData[0]?.SoThanhLyHopDong || '';

      // Xử lý soThanhLyHopDong_2: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
      const contractNumberWithVerification = soThanhLyHopDong_2 && soThanhLyHopDong_2.trim() !== ''
        ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${soThanhLyHopDong_2} ${formattedLatestEndDate}`
        : `Kèm theo biên bản nghiệm thu Hợp đồng số:           /HĐNT-ĐT ${formattedLatestEndDate}`;

      const titleRow4_2 = worksheet2.addRow([
        contractNumberWithVerification,
      ]);
      titleRow4_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow4_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow4_2.number}:M${titleRow4_2.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5_2 = worksheet2.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5_2.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`L${titleRow5_2.number}:N${titleRow5_2.number}`);

      // Định nghĩa tiêu đề cột cho sheet 2
      const header2 = [
        "STT",
        "Họ tên giảng viên",
        "Tên học phần",
        "Tên lớp",
        "Số tiết",
        "Thời gian thực hiện",
        "Học kỳ",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow2 = worksheet2.addRow(header2);
      headerRow2.font = { name: "Times New Roman", bold: true };

      worksheet2.pageSetup = { ...worksheet.pageSetup };

      // Định dạng cột giống sheet 1
      worksheet2.getColumn(1).width = 5; // STT
      worksheet2.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet2.getColumn(3).width = 30; // Tên học phần
      worksheet2.getColumn(4).width = 14; // Tên lớp
      worksheet2.getColumn(5).width = 10; // Số tiết
      worksheet2.getColumn(6).width = 17; // Thời gian thực hiện
      worksheet2.getColumn(7).width = 6; // Học kỳ
      worksheet2.getColumn(8).width = 29; // Địa chỉ
      worksheet2.getColumn(9).width = 6; // Học vị
      worksheet2.getColumn(10).width = 6; // Hệ số lương
      worksheet2.getColumn(11).width = 12; // Mức thanh toán
      worksheet2.getColumn(12).width = 14; // Thành tiền
      worksheet2.getColumn(13).width = 14; // Trừ thuế TNCN 10%
      worksheet2.getColumn(14).width = 14; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow2.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "none", // Không màu nền
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      // Thêm dữ liệu cho sheet 2 giống sheet 1
      let totalSoTiet2 = 0;
      let totalSoTien2 = 0;
      let totalTruThue2 = 0;
      let totalThucNhan2 = 0;

      giangVienData.forEach((item, index) => {
        const soTiet = item.SoTiet;
        const hocVi = item.HocVi || "Thạc sĩ";

        // Tìm mức tiền lương dựa trên he_dao_tao và HocVi
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;

        // Tính toán số tiền, thuế, thực nhận
        const soTien = soTiet * mucThanhToan;
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1;
        const thucNhan = soTien - truThue;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;
        const hocKyLaMa = convertToRoman(item.HocKy);
        const hocViVietTat =
          hocVi === "Tiến sĩ" ? "TS" : hocVi === "Thạc sĩ" ? "ThS" : hocVi; const row = worksheet2.addRow([
            index + 1,
            item.GiangVien,
            item.TenHocPhan,
            item.Lop,
            (item.SoTiet || 0).toLocaleString("vi-VN"),
            thoiGianThucHien,
            hocKyLaMa,
            item.DiaChi,
            hocViVietTat,
            item.HSL.toLocaleString("vi-VN"),
            mucThanhToan.toLocaleString("vi-VN"),
            soTien.toLocaleString("vi-VN"),
            truThue.toLocaleString("vi-VN"),
            thucNhan.toLocaleString("vi-VN"),
          ]);
        row.font = { name: "Times New Roman", size: 13 };
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          // Định dạng font cho từng cột giống sheet 1
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet2 += parseFloat(item.SoTiet);
        totalSoTien2 += soTien;
        totalTruThue2 += truThue;
        totalThucNhan2 += thucNhan;
      });      // Thêm hàng tổng cộng cho sheet 2
      const totalRow2 = worksheet2.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet2.toLocaleString("vi-VN"),
        "",
        "",
        "",
        "",
        "",
        "",
        totalSoTien2.toLocaleString("vi-VN"),
        totalTruThue2.toLocaleString("vi-VN"),
        totalThucNhan2.toLocaleString("vi-VN"),
      ]);
      totalRow2.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow2.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet2.mergeCells(`A${totalRow2.number}:C${totalRow2.number}`);

      // Thêm hai dòng trống
      worksheet2.addRow([]);

      // Thêm dòng "Bằng chữ" cho sheet 2
      const bangChuRow2 = worksheet2.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien2)}`,
      ]);
      bangChuRow2.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet2.mergeCells(`A${bangChuRow2.number}:${bangChuRow2.number}`);
      bangChuRow2.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 8 đến hàng tổng cộng
      const firstRowOfTable2 = 8;
      const lastRowOfTable2 = totalRow2.number;
      for (let i = firstRowOfTable2; i <= lastRowOfTable2; i++) {
        const row = worksheet2.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    // Tạo tên file
    let fileName = `PhuLuc_GiangDay_${loaiHopDongText}_Dot${dot}_Ki${ki}_${namHoc}`;
    if (khoa && khoa !== "ALL") {
      fileName += `_${sanitizeFileName(khoa)}`;
    }
    if (teacherName) {
      fileName += `_${sanitizeFileName(teacherName)}`;
    }
    fileName += ".xlsx";

    // Tạo đường dẫn đầy đủ tới file
    const filePath = path.join(tempDir, fileName);

    // Ghi workbook vào file
    await workbook.xlsx.writeFile(filePath);

    // Trả về đường dẫn file để dùng tiếp (nén, gửi,...)
    return filePath;
  } catch (error) {
    console.error("Error exporting data file path:", error);
  }
};

const exportPhuLucGiangVienMoi = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    let { dot, ki, namHoc, loaiHopDong, khoa, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đợt, kỳ hoặc năm học",
      });
    } let query = `
      WITH 
    phuLucSauDH AS (
        SELECT DISTINCT
            TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) AS GiangVien, 
            qc.TenLop AS Lop, 
            ROUND(qc.QuyChuan * 0.7, 2) AS SoTiet, 
            qc.LopHocPhan AS TenHocPhan, 
            qc.KiHoc AS HocKy,
            gv.HocVi, 
            gv.HSL,
            gv.CCCD,
            qc.NgayBatDau, 
            qc.NgayKetThuc,
            gv.DiaChi,
            qc.Dot,
            qc.KiHoc,
            qc.NamHoc,
            qc.Khoa,
            qc.he_dao_tao,
            gv.MaPhongBan
        FROM quychuan qc
        JOIN gvmoi gv 
            ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen 
        WHERE qc.GiaoVienGiangDay LIKE '%,%'
    ),
    phuLucDH AS (
        SELECT DISTINCT
            TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien, 
            qc.TenLop AS Lop, 
            qc.QuyChuan AS SoTiet, 
            qc.LopHocPhan AS TenHocPhan, 
            qc.KiHoc AS HocKy,
            gv.HocVi, 
            gv.HSL,
            gv.CCCD,
            qc.NgayBatDau, 
            qc.NgayKetThuc,
            gv.DiaChi,
            qc.Dot,
            qc.KiHoc,
            qc.NamHoc,
            qc.Khoa,
            qc.he_dao_tao,
            gv.MaPhongBan
        FROM quychuan qc
        JOIN gvmoi gv 
            ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) = gv.HoTen
        WHERE qc.MoiGiang = 1 AND qc.GiaoVienGiangDay NOT LIKE '%,%'
    ),
    table_ALL AS (
        SELECT * FROM phuLucSauDH
        UNION
        SELECT * FROM phuLucDH
    ),
    hopDongInfo AS (
        SELECT 
            CCCD, 
            he_dao_tao,
            Dot,
            KiHoc,
            NamHoc,
            MaPhongBan,
            MAX(SoHopDong) as SoHopDong, 
            MAX(SoThanhLyHopDong) as SoThanhLyHopDong
        FROM hopdonggvmoi
        WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND he_dao_tao = ?
        GROUP BY CCCD, he_dao_tao, Dot, KiHoc, NamHoc, MaPhongBan
    )    
    SELECT DISTINCT t.*, hd.SoHopDong, hd.SoThanhLyHopDong 
    FROM table_ALL t
    LEFT JOIN hopDongInfo hd ON t.CCCD = hd.CCCD 
        AND t.Dot = hd.Dot 
        AND t.KiHoc = hd.KiHoc 
        AND t.NamHoc = hd.NamHoc
        AND t.he_dao_tao = hd.he_dao_tao
        AND t.MaPhongBan = hd.MaPhongBan
    WHERE t.Dot = ? AND t.KiHoc = ? AND t.NamHoc = ? AND t.he_dao_tao = ?
    `;

    let params = [dot, ki, namHoc, loaiHopDong, dot, ki, namHoc, loaiHopDong]; if (khoa && khoa !== "ALL") {
      query += ` AND t.MaPhongBan = ?`;
      params.push(khoa);
    }

    if (teacherName) {
      query += ` AND t.GiangVien LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    const [data] = await connection.execute(query, params);

    if (data.length === 0) {
      return res.send(
        `<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/phuLucHD';</script>`
      );
    }

    const heDaoTaoData = await gvmService.getHeMoiGiangData(req, res);

    const loaiHopDongText = heDaoTaoData.find(
      (item) => item.id.toString() === loaiHopDong.toString()
    )?.he_dao_tao || "UnknownType";

    const filePaths = await getExportPhuLucGiangVienMoiPath(
      req,
      connection,
      dot,
      ki,
      namHoc,
      loaiHopDongText,
      khoa,
      teacherName,
      data
    );

    // Kiểm tra filePaths
    if (!filePaths) {
      console.error("getExportPhuLucGiangVienMoiPath trả về undefined");
      return res.status(500).json({
        success: false,
        message: "Không thể tạo file export",
      });
    }

    // Lấy tên file từ đường dẫn
    const fileName = path.basename(filePaths);

    // Gửi file cho client
    res.download(filePaths, fileName, (err) => {
      if (err) {
        console.error("Lỗi khi gửi file:", err);
        if (!res.headersSent) {
          return res.status(500).send("Lỗi khi gửi file");
        }
      }

      // Xóa file và thư mục sau khi gửi
      setTimeout(() => {
        try {
          if (fs.existsSync(filePaths)) {
            fs.unlinkSync(filePaths); // Xóa file
            console.log("Đã xóa file:", filePaths);

            // Xóa thư mục tạm (nếu rỗng)
            const tempDir = path.dirname(filePaths);
            try {
              fs.rmdirSync(tempDir); // Chỉ xóa được thư mục rỗng
              console.log("Đã xóa thư mục:", tempDir);
            } catch (dirErr) {
              console.log(
                "Không thể xóa thư mục (có thể không rỗng):",
                tempDir
              );
            }
          }
        } catch (cleanupErr) {
          console.error("Lỗi khi xóa file:", cleanupErr);
        }
      }, 100);
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getPhuLucHDSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("moigiang.phuLucHopDongGVM.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  exportPhuLucGiangVienMoi,
  getPhuLucHDSite,
  getExportPhuLucGiangVienMoiPath,
};
```

## File: src/controllers/suaHDController.js
```javascript
const path = require('path');
const fs = require('fs');

// Controller xử lý yêu cầu tải tệp
exports.downloadFile = (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '..', 'templates', fileName); // Đường dẫn đến thư mục templates

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Tệp không tìm thấy');
        }

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Lỗi khi tải xuống:', err);
                res.status(500).send('Có lỗi xảy ra khi tải xuống');
            }
        });
    });
};

// Controller xử lý yêu cầu upload và ghi đè tệp
exports.uploadFile = (req, res) => {
    console.log("Bắt đầu xử lý upload file...");
    console.log("Thông tin file nhận được:", req.file);

    if (!req.file) {
        console.error("Không có tệp nào được gửi!");
        return res.status(400).send('Không có tệp nào được gửi!');
    }

    const filePath = path.join(__dirname, '..', 'templates', req.file.originalname); // Đường dẫn lưu tệp
    const tempPath = req.file.path; // Đường dẫn file tạm

    console.log("Đường dẫn file tạm:", tempPath);
    console.log("Đường dẫn file đích:", filePath);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error("Tên tệp tải lên không trùng với tên tệp đã tồn tại!");
            fs.unlink(tempPath, () => {});
            return res.status(400).send('Tên tệp tải lên không trùng với tên tệp đã tồn tại!');
        }

        // Nếu tệp đã tồn tại, xóa tệp cũ trước khi ghi đè
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error("Lỗi khi xóa tệp cũ:", err);
                fs.unlink(tempPath, () => {}); // Xóa file tạm nếu có lỗi
                return res.status(500).send('Có lỗi xảy ra khi xóa tệp cũ!');
            }

            // Di chuyển file mới vào thư mục templates
            fs.rename(tempPath, filePath, (err) => {
                if (err) {
                    console.error("Lỗi khi ghi đè tệp:", err);
                    fs.unlink(tempPath, () => {}); // Xóa file tạm nếu có lỗi
                    return res.status(500).send('Có lỗi xảy ra khi ghi đè tệp!');
                }

                console.log("Tệp đã được tải lên và ghi đè thành công!");
                res.json({ message: 'Tệp đã được tải lên và ghi đè thành công' });
            });
        });
    });
};
```

## File: src/controllers/thongkeChiTietMGController.js
```javascript
const createConnection = require("../config/databasePool");

const thongkeChiTietMGController = {
    showPage: (req, res) => {
        res.render("thongkeChiTietMG");
    },

    getFilterOptions: async (req, res) => {
        let connection;
        try {
            connection = await createConnection();

            // Lấy danh sách năm học từ cả hai bảng
            const [namHoc] = await connection.query(`
                SELECT DISTINCT namhoc FROM giangday
                UNION
                SELECT DISTINCT namhoc FROM exportdoantotnghiep
                ORDER BY namhoc DESC
            `);

            // Lấy danh sách kỳ từ cả hai bảng
            const [ki] = await connection.query(`
                SELECT DISTINCT HocKy AS ki FROM giangday
                UNION
                SELECT DISTINCT ki FROM exportdoantotnghiep
                ORDER BY ki DESC
            `);

            // Lấy danh sách khoa từ cả hai bảng
            const [khoa] = await connection.query(`
                SELECT DISTINCT Khoa AS MaPhongBan FROM giangday
                UNION
                SELECT DISTINCT MaPhongBan FROM exportdoantotnghiep
                ORDER BY MaPhongBan
            `);

            res.json({
                success: true,
                namHoc: [{ namhoc: "ALL" }, ...namHoc],
                ki: [{ ki: "ALL" }, ...ki],
                khoa: [{ MaPhongBan: "ALL" }, ...khoa],
            });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu filter:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        } finally {
            if (connection) connection.release();
        }
    },

    getGiangVien: async (req, res) => {
        let connection;
        const { namhoc, khoa, ki } = req.query; // Thêm `ki` vào danh sách tham số
        try {
            connection = await createConnection();

            // Truy vấn lấy danh sách giảng viên từ cả hai bảng
            let query = `
                SELECT DISTINCT HoTen AS hoten FROM (
                    SELECT GiangVien AS HoTen
                    FROM giangday
                    WHERE 1=1
                    ${namhoc && namhoc !== 'ALL' ? 'AND NamHoc = ?' : ''}
                    ${khoa && khoa !== 'ALL' ? 'AND Khoa = ?' : ''}
                    ${ki && ki !== 'ALL' ? 'AND HocKy = ?' : ''}
                    UNION
                    SELECT GiangVien AS HoTen
                    FROM exportdoantotnghiep
                    WHERE 1=1
                    ${namhoc && namhoc !== 'ALL' ? 'AND NamHoc = ?' : ''}
                    ${khoa && khoa !== 'ALL' ? 'AND MaPhongBan = ?' : ''}
                    ${ki && ki !== 'ALL' ? 'AND Ki = ?' : ''}
                ) AS combined
                ORDER BY HoTen
            `;

            // Thêm tham số vào mảng params
            const params = [];
            if (namhoc && namhoc !== 'ALL') {
                params.push(namhoc, namhoc); // Push 2 lần vì có 2 điều kiện trong UNION
            }
            if (khoa && khoa !== 'ALL') {
                params.push(khoa, khoa); // Push 2 lần vì có 2 điều kiện trong UNION
            }
            if (ki && ki !== 'ALL') {
                params.push(ki, ki); // Push 2 lần vì có 2 điều kiện trong UNION
            }

            console.log("Query Giảng Viên:", query, params); // Debug truy vấn và tham số

            const [giangVien] = await connection.query(query, params);

            res.json({
                success: true,
                giangVien: [{ hoten: "ALL" }, ...giangVien],
            });
        } catch (error) {
            console.error("Lỗi khi lấy danh sách giảng viên:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        } finally {
            if (connection) connection.release();
        }
    },

    getData: async (req, res) => {
        let connection;
        const { ki, namhoc, khoa, giangvien } = req.query;
        try {
            connection = await createConnection();

            // Khai báo giangDayParams
            const giangDayParams = [];

            // Truy vấn dữ liệu giảng dạy
            let giangDayQuery = `
                SELECT 
                    GiangVien AS hoten,
                    Khoa AS MaPhongBan,
                    NamHoc AS namhoc,
                    HocKy AS ki,
                    Lop AS lop,
                    TenHocPhan AS tenhocphan,
                    SoTC AS sotinchi,
                    QuyChuan AS sotiet,
                    he_dao_tao AS hedaotao
                FROM giangday
                WHERE 1=1
            `;

            if (namhoc && namhoc !== 'ALL') {
                giangDayQuery += " AND NamHoc = ?";
                giangDayParams.push(namhoc);
            }

            if (khoa && khoa !== 'ALL') {
                giangDayQuery += " AND Khoa = ?";
                giangDayParams.push(khoa);
            }

            if (giangvien && giangvien !== 'ALL') {
                giangDayQuery += " AND GiangVien LIKE ?";
                giangDayParams.push(`%${giangvien}%`);
            }

            if (ki && ki !== 'ALL') {
                giangDayQuery += " AND HocKy = ?";
                giangDayParams.push(ki);
            }

            console.log("Giảng dạy Query:", giangDayQuery, giangDayParams);
            const [giangDayResult] = await connection.query(giangDayQuery, giangDayParams);

            // Truy vấn dữ liệu đồ án
            const doAnParams = [];
            let doAnQuery = `
                SELECT 
                    GiangVien AS hoten,
                    MaPhongBan,
                    NamHoc AS namhoc,
                    dot,
                    Ki AS kihoc,
                    TenDeTai AS detai,
                    SoTiet AS sotiet
                FROM exportdoantotnghiep
                WHERE 1=1
            `;

            if (ki && ki !== 'ALL') {
                doAnQuery += " AND ki = ?";
                doAnParams.push(ki);
            }

            if (namhoc && namhoc !== 'ALL') {
                doAnQuery += " AND NamHoc = ?";
                doAnParams.push(namhoc);
            }

            if (khoa && khoa !== 'ALL') {
                doAnQuery += " AND MaPhongBan = ?";
                doAnParams.push(khoa);
            }

            if (giangvien && giangvien !== 'ALL') {
                doAnQuery += " AND GiangVien LIKE ?";
                doAnParams.push(`%${giangvien}%`);
            }

            console.log("Đồ án Query:", doAnQuery, doAnParams);
            const [doAnResult] = await connection.query(doAnQuery, doAnParams);

            res.json({
                success: true,
                dataGiangDay: giangDayResult,
                dataDoAn: doAnResult,
            });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
            res.status(500).json({ success: false, message: error.message || "Lỗi server" });
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = thongkeChiTietMGController;
```

## File: src/controllers/thongkemgController.js
```javascript
const createConnection = require("../config/databasePool");

const thongkemgController = {
  showThongkemgPage: (req, res) => {
    res.render("thongkemg");
  },

  getThongkemgData: async (req, res) => {
    let connection;
    const { kihoc, namhoc, khoa, hedaotao, type, isQuanDoi } = req.query; // Thêm isQuanDoi
    const thongkeType = type || "khoa"; // mặc định là theo khoa

    try {
      connection = await createConnection();
      let query;
      const params = [];

      if (thongkeType === "hedaotao") {
        if (!hedaotao || hedaotao === "ALL") {
          // Query khi chọn tất cả hệ đào tạo
          query = `
            SELECT 
                gd.he_dao_tao as hedaotao,
                COUNT(DISTINCT gd.GiangVien) as sogiangvien,
                SUM(gd.quychuan) as tongsotiet,
                SUM(gd.quychuan * IFNULL(tl.SoTien, 0)) as tongtien
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            LEFT JOIN tienluong tl ON gd.he_dao_tao = tl.he_dao_tao AND gm.HocVi = tl.HocVi
            WHERE gd.id_Gvm != 1
          `;
        } else {
          // Query cho hệ đào tạo cụ thể
          query = `
            SELECT 
                gd.GiangVien as hoten,
                gd.he_dao_tao as hedaotao,
                gm.HocVi as hocvi,
                SUM(gd.quychuan) as tongsotiet,
                SUM(gd.quychuan * IFNULL(tl.SoTien, 0)) as tongtien
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            LEFT JOIN tienluong tl ON gd.he_dao_tao = tl.he_dao_tao AND gm.HocVi = tl.HocVi
            WHERE gd.he_dao_tao = ? AND gd.id_Gvm != 1
          `;
          params.push(hedaotao);
        }
        // Thêm điều kiện lọc
        if (kihoc && kihoc !== "ALL") {
          query += ` AND gd.HocKy = ?`;
          params.push(kihoc);
        }
        if (namhoc && namhoc !== "ALL") {
          query += ` AND gd.NamHoc = ?`;
          params.push(namhoc);
        }
        // Thêm điều kiện lọc isQuanDoi
        if (isQuanDoi === "1") {
          query += ` AND gm.isQuanDoi = 1`;
        }
        // GROUP BY
        if (!hedaotao || hedaotao === "ALL") {
          query += ` GROUP BY gd.he_dao_tao ORDER BY tongsotiet DESC`;
        } else {
          query += ` GROUP BY hoten, hedaotao, hocvi ORDER BY tongsotiet DESC`;
        }
      } else {
        if (khoa === "ALL") {
          // Query khi chọn tất cả khoa
          query = `
            SELECT 
                gd.Khoa as khoa,
                COUNT(DISTINCT gd.GiangVien) as sogiangvien,
                SUM(gd.quychuan) as tongsotiet
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            WHERE gd.id_Gvm != 1
          `;
        } else {
          // Query cho khoa cụ thể
          query = `
            SELECT gd.GiangVien as hoten, 
                   SUM(gd.quychuan) as tongsotiet,
                   gd.he_dao_tao as hedaotao
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            WHERE gd.Khoa = ? AND gd.id_Gvm != 1
          `;
          params.push(khoa);
        }
        // Thêm các điều kiện lọc khác
        if (kihoc && kihoc !== "ALL") {
          query += ` AND gd.HocKy = ?`;
          params.push(kihoc);
        }
        if (namhoc && namhoc !== "ALL") {
          query += ` AND gd.NamHoc = ?`;
          params.push(namhoc);
        }
        // Thêm điều kiện lọc isQuanDoi
        if (isQuanDoi === "1") {
          query += ` AND gm.isQuanDoi = 1`;
        }

        // Thêm GROUP BY
        if (khoa === "ALL") {
          query += ` GROUP BY gd.Khoa ORDER BY tongsotiet DESC`;
        } else {
          query += ` GROUP BY hoten, he_dao_tao ORDER BY tongsotiet DESC`;
        }
      }

      const [result] = await connection.query(query, params);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  },

  getNamHocData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();

      // Lấy danh sách năm học
      const [namHoc] = await connection.query(
        "SELECT DISTINCT NamHoc as NamHoc FROM giangday ORDER BY NamHoc DESC"
      );

      // Lấy danh sách kỳ học
      const [hocKy] = await connection.query(
        "SELECT DISTINCT HocKy as Ki FROM giangday ORDER BY HocKy"
      );

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL"; // Lấy năm học lớn nhất

      // Thêm "Tất cả năm" và "Cả năm" vào đầu danh sách
      namHoc.unshift({ NamHoc: "ALL" });
      hocKy.unshift({ Ki: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        Ki: hocKy,
        MaxNamHoc: maxNamHoc, // Trả về năm học lớn nhất
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
    }
  },

  getPhongBanMG: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      // Thêm DISTINCT để loại bỏ các giá trị trùng lặp
      const [phongBan] = await connection.query(
        "SELECT DISTINCT Khoa as MaPhongBan FROM giangday ORDER BY Khoa"
      );

      // Tạo mảng mới không có giá trị trùng lặp
      const uniquePhongBan = Array.from(
        new Set(phongBan.map((item) => item.MaPhongBan))
      ).map((maPB) => ({ MaPhongBan: maPB }));

      connection.release();
      res.json({
        success: true,
        MaPhongBan: uniquePhongBan,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    } finally {
      if (connection) connection.release();
    }
  },

  getHeDaoTaoMG: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [hedaotao] = await connection.query(
        "SELECT DISTINCT he_dao_tao as HeDaoTao FROM giangday ORDER BY he_dao_tao"
      );
      res.json({
        success: true,
        HeDaoTao: hedaotao,
      });
    } catch (error) {
      res.json({ success: false });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongkemgController;
```

## File: src/controllers/moiGiangQCDKController.js
```javascript
require("dotenv").config();
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const tkbServices = require("../services/tkbServices");
const fs = require("fs");
const {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  HeadingLevel,
} = require("docx");
const XLSX = require("xlsx");

const ExcelJS = require("exceljs");

let tableTam = process.env.DB_TABLE_TAM;

// Helper function để format ngày từ ISO string hoặc dd/mm/yyyy sang YYYY-MM-DD
const formatDateForDB = (dateValue) => {
  if (!dateValue) return null;

  // Nếu đã là định dạng YYYY-MM-DD
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  try {
    let date;

    // Nếu là ISO string (có chứa T hoặc Z)
    if (typeof dateValue === 'string' && (dateValue.includes('T') || dateValue.includes('Z'))) {
      date = new Date(dateValue);
    }
    // Nếu là định dạng dd/mm/yyyy
    else if (typeof dateValue === 'string' && dateValue.includes('/')) {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    // Nếu là Date object
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Các trường hợp khác
    else {
      date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) {
      return null;
    }

    // Trả về định dạng YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

// render bảng
const getTableTam = async (req, res) => {
  const { Khoa, Dot, Ki, Nam, HeDaoTao } = req.body;

  console.log("Lấy dữ liệu bảng tạm Khoa Đợt Kì Năm Hệ:", Khoa, Dot, Ki, Nam, HeDaoTao);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query;
    const queryParams = [];

    // Xây dựng truy vấn dựa vào giá trị của Khoa
    if (Khoa !== "ALL") {
      query = `SELECT * FROM tam WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;
      queryParams.push(Khoa, Dot, Ki, Nam);
    } else {
      query = `SELECT * FROM tam WHERE Dot = ? AND Ki = ? AND Nam = ?`;
      queryParams.push(Dot, Ki, Nam);
    }

    // Thêm filter he_dao_tao nếu có
    if (HeDaoTao && HeDaoTao !== "ALL") {
      query += ` AND he_dao_tao = ?`;
      queryParams.push(HeDaoTao);
    }

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    if (results.length == 0) {
      res.status(200).json({
        success: false,
        message: "Không tìm thấy dữ liệu",
      });
    } else {
      // Format ngày tháng trước khi trả về frontend
      const formattedResults = results.map(row => ({
        ...row,
        NgayBatDau: formatDateForDB(row.NgayBatDau),
        NgayKetThuc: formatDateForDB(row.NgayKetThuc)
      }));

      // Trả về kết quả dưới dạng JSON
      res.json({
        success: true,
        data: formattedResults,
      });
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTableTam:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const resetPublishStatusTKB = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;
  try {
    if (Khoa !== "ALL") {
      const updateQuery = `UPDATE course_schedule_details SET da_luu = 0 WHERE major = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ?`;
      await pool.query(updateQuery, [Khoa, Dot, Ki, Nam]);
    } else {
      const updateQuery = `UPDATE course_schedule_details SET da_luu = 0 WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?`;
      await pool.query(updateQuery, [Dot, Ki, Nam]);
    }

    console.log("Đã cập nhật trạng thái đã lưu TKB thành công.");
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái đã lưu TKB:", error);
  }
}

// xóa bảng
const deleteTableTam = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body; // Lấy thông tin từ body
  console.log(
    "Xóa thành công dữ liệu bảng tạm khoa, đợt, kì, năm:",
    Khoa,
    Dot,
    Ki,
    Nam
  );

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let query; // Khai báo biến cho câu truy vấn

  let connection; // Khai báo biến kết nối
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (Khoa !== "ALL") {
      // Nếu Khoa khác "ALL"
      query = `DELETE FROM ?? WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;
      const [results] = await connection.query(query, [
        tableTam,
        Khoa,
        Dot,
        Ki,
        Nam,
      ]);

      // Kiểm tra xem có bản ghi nào bị xóa không
      if (results.affectedRows > 0) {

        return res.json({ message: "Xóa thành công dữ liệu." });
      } else {
        return res
          .status(404)
          .json({ message: "Không tìm thấy dữ liệu để xóa." });
      }
    } else {
      // Nếu Khoa là "ALL"
      query = `DELETE FROM ?? WHERE Dot = ? AND Ki = ? AND Nam = ?`;
      const [results] = await connection.query(query, [tableTam, Dot, Ki, Nam]);

      // Kiểm tra xem có bản ghi nào bị xóa không
      if (results.affectedRows > 0) {

        return res.json({
          success: "true",
          message: "Xóa thành công dữ liệu.",
        });
      } else {
        return res.status(404).json({
          success: "false",
          message: "Không tìm thấy dữ liệu để xóa.",
        });
      }
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// Lấy tên hệ đào tạo từ ID
const getHeDaoTaoTexts = async (oldHeDaoTaoId, newHeDaoTaoId) => {
  try {
    const [[oldRow]] = await pool.query(
      'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
      [oldHeDaoTaoId]
    );
    const [[newRow]] = await pool.query(
      'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
      [newHeDaoTaoId]
    );
    return {
      oldHeDaoTao: oldRow?.he_dao_tao || '',
      newHeDaoTao: newRow?.he_dao_tao || ''
    };
  } catch (error) {
    console.error('Lỗi lấy tên hệ đào tạo:', error);
    return { oldHeDaoTao: '', newHeDaoTao: '' };
  }
};

// Tính HeSoT7CN (bonus_time) theo hệ đào tạo
const getBonusTimeForHeDaoTao = async (
  oldHeDaoTaoId,
  newHeDaoTaoId,
  currentBonusTime
) => {
  const { oldHeDaoTao, newHeDaoTao } =
    await getHeDaoTaoTexts(oldHeDaoTaoId, newHeDaoTaoId);

  let tmp = 1;

  // Xác định hệ số ngoài giờ cũ
  if (oldHeDaoTao.includes("ĐH") && currentBonusTime == 1.5) {
    tmp = 1.5;
  }
  if (oldHeDaoTao.includes("CH") && currentBonusTime == 2.25) {
    tmp = 1.5;
  }
  if (oldHeDaoTao.includes("NCS") && currentBonusTime == 3) {
    tmp = 1.5;
  }

  // Tính lại theo hệ đào tạo mới
  if (newHeDaoTao.includes("ĐH")) return 1 * tmp;
  if (newHeDaoTao.includes("CH")) return 1.5 * tmp;
  if (newHeDaoTao.includes("NCS")) return 2.0 * tmp;

  return currentBonusTime; // fallback
};

const quyDoiHeSo = async (item, bonusRules) => {
  // Biến để lưu giá trị HeSoLopDong
  let HeSoLopDong = item.HeSoLopDong;

  // Tính HeSoLopDong theo số lượng sinh viên từ bảng he_so_lop_dong
  const SoSinhVien = item.SoSinhVien;
  if (SoSinhVien && bonusRules && bonusRules.length > 0) {
    HeSoLopDong = tkbServices.calculateStudentBonus(SoSinhVien, bonusRules);
  }

  // Auto-set HeSoT7CN theo he_dao_tao nếu chưa có hoặc he_dao_tao thay đổi
  let HeSoT7CN = item.HeSoT7CN;
  if (item.he_dao_tao && (!HeSoT7CN || HeSoT7CN === 0)) {
    // Set giá trị mặc định theo hệ đào tạo
    HeSoT7CN = await getBonusTimeForHeDaoTao(null, item.he_dao_tao, 1);
  }

  // Tính QuyChuan sau khi có đầy đủ các giá trị
  let QuyChuan = null;
  if (item.LL && HeSoT7CN) {
    QuyChuan = Number(item.LL) * Number(HeSoLopDong) * Number(HeSoT7CN);
  }

  // Trả về kết quả quy đổi bao gồm HeSoLopDong, HeSoT7CN và QuyChuan
  return {
    HeSoLopDong,
    HeSoT7CN,
    QuyChuan,
  };
};

const updateTableTam = async (req, res) => {
  const data = req.body; // Lấy dữ liệu từ body (mảng các đối tượng dữ liệu cần lưu)
  console.log("Dữ liệu nhận để lưu vào bảng tạm:", data);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection; // Khai báo biến kết nối

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Nếu dữ liệu không tồn tại hoặc không phải là mảng
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ hoặc rỗng." });
    }

    // Load bonus rules từ bảng he_so_lop_dong
    const bonusRules = await tkbServices.getBonusRules();

    // Vòng lặp qua từng đối tượng dữ liệu trong mảng và gọi hàm quyDoiHeSo để gắn lại hệ số lớp đông
    for (const element of data) {
      const row = element;
      const result = await quyDoiHeSo(row, bonusRules); // Gọi hàm quyDoiHeSo để tính toán (async)
      row.HeSoLopDong = result.HeSoLopDong; // Cập nhật lại hệ số lớp đông
      row.HeSoT7CN = result.HeSoT7CN; // Cập nhật HeSoT7CN
      row.QuyChuan = result.QuyChuan ? parseFloat(result.QuyChuan).toFixed(2) : null;
    }

    // Khởi tạo mảng chứa các giá trị để thực thi truy vấn INSERT ... ON DUPLICATE KEY UPDATE
    const insertUpdateValues = data.map((row) => [
      row.ID || null,
      row.Khoa || null,
      row.Dot || null,
      row.Ki || null,
      row.Nam || null,
      row.GiaoVien || null,
      row.HeSoLopDong || null,
      row.HeSoT7CN || null,
      row.LL || null,
      row.LopHocPhan || null,
      row.QuyChuan || null,
      row.SoSinhVien || null,
      row.SoTietCTDT || null,
      row.SoTinChi || null,
      row.GhiChu || null,
      row.he_dao_tao || null,
      formatDateForDB(row.NgayBatDau),
      formatDateForDB(row.NgayKetThuc),
    ]);

    // Nếu không có dữ liệu hợp lệ, trả về lỗi
    if (insertUpdateValues.length === 0) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ hoặc thiếu dữ liệu hợp lệ để cập nhật.",
      });
    }

    // Truy vấn SQL
    const insertUpdateQuery = `
            INSERT INTO ?? (ID, Khoa, Dot, Ki, Nam, GiaoVien, HeSoLopDong, HeSoT7CN, LL, LopHocPhan, QuyChuan, SoSinhVien, SoTietCTDT, SoTinChi, GhiChu, he_dao_tao, NgayBatDau, NgayKetThuc) 
            VALUES ?
            ON DUPLICATE KEY UPDATE
                Khoa = VALUES(Khoa),
                Dot = VALUES(Dot),
                Ki = VALUES(Ki),
                Nam = VALUES(Nam),
                GiaoVien = VALUES(GiaoVien),
                HeSoLopDong = VALUES(HeSoLopDong),
                HeSoT7CN = VALUES(HeSoT7CN),
                LL = VALUES(LL),
                LopHocPhan = VALUES(LopHocPhan),
                QuyChuan = VALUES(QuyChuan),
                SoSinhVien = VALUES(SoSinhVien),
                SoTietCTDT = VALUES(SoTietCTDT),
                SoTinChi = VALUES(SoTinChi),
                GhiChu = VALUES(GhiChu),
                he_dao_tao = VALUES(he_dao_tao),
                NgayBatDau = VALUES(NgayBatDau),
                NgayKetThuc = VALUES(NgayKetThuc);
        `;

    // Thực thi truy vấn
    await connection.query(insertUpdateQuery, [tableTam, insertUpdateValues]);

    // Trả về phản hồi thành công
    return res.json({
      message: "Cập nhật dữ liệu thành công.",
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi xử lý dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// hàm sửa 1 dòng
const updateRow = async (req, res) => {
  const ID = req.params.id;
  const data = req.body; // Dữ liệu của dòng cần cập nhật
  console.log(`Cập nhật ${ID} trong bảng Tạm`);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection; // Khai báo biến kết nối

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra dữ liệu đầu vào
    if (!data || typeof data !== "object" || !ID) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ hoặc thiếu ID." });
    }

    // Load bonus rules từ bảng he_so_lop_dong
    const bonusRules = await tkbServices.getBonusRules();

    // Tính toán tự động HeSoLopDong, HeSoT7CN và QuyChuan
    const result = await quyDoiHeSo(data, bonusRules);
    data.HeSoLopDong = result.HeSoLopDong;
    data.HeSoT7CN = result.HeSoT7CN;
    data.QuyChuan = result.QuyChuan ? parseFloat(result.QuyChuan).toFixed(2) : null;

    // Chuẩn bị giá trị cho truy vấn UPDATE
    const updateValues = [
      data.Khoa,
      data.Dot,
      data.Ki,
      data.Nam,
      data.GiaoVien || null,
      data.HeSoLopDong || null,
      data.HeSoT7CN || null,
      data.LL || null,
      data.LopHocPhan || null,
      data.QuyChuan || null,
      data.SoSinhVien || null,
      data.SoTietCTDT || null,
      data.SoTinChi || null,
      data.GhiChu || null,
      data.he_dao_tao || null,
      formatDateForDB(data.NgayBatDau),
      formatDateForDB(data.NgayKetThuc),
      ID, // Điều kiện WHERE sử dụng ID
    ];

    const updateQuery = `
            UPDATE ?? 
            SET 
                Khoa = ?, 
                Dot = ?, 
                Ki = ?, 
                Nam = ?, 
                GiaoVien = ?, 
                HeSoLopDong = ?, 
                HeSoT7CN = ?, 
                LL = ?, 
                LopHocPhan = ?, 
                QuyChuan = ?, 
                SoSinhVien = ?, 
                SoTietCTDT = ?, 
                SoTinChi = ?,
                GhiChu = ?,
                he_dao_tao = ?,
                NgayBatDau = ?,
                NgayKetThuc = ?
            WHERE ID = ?
        `;

    // Thực thi truy vấn
    await connection.query(updateQuery, [tableTam, ...updateValues]);

    // Trả về phản hồi thành công với dữ liệu đã tính toán
    return res.json({
      message: "Dòng dữ liệu đã được cập nhật thành công.",
      success: true,
      data: data
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật dòng dữ liệu:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi cập nhật dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// hàm xóa 1 dòng
const deleteRow = async (req, res) => {
  const { id } = req.params; // Lấy ID từ URL

  console.log(`Xóa ${id} trong bảng Tạm:`);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra xem ID có hợp lệ không
    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    // Chuẩn bị truy vấn DELETE
    const deleteQuery = `DELETE FROM ?? WHERE ID = ?`;

    // Thực thi truy vấn
    await connection.query(deleteQuery, [tableTam, id]);

    // Trả về phản hồi thành công
    return res.json({ message: "Dòng dữ liệu đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa dòng dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// hàm thêm 1 dòng
const addNewRow = async (req, res) => {
  const data = req.body; // Lấy dữ liệu dòng mới từ body
  console.log("Dữ liệu nhận để thêm dòng mới:", data);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection;

  try {
    connection = await createPoolConnection(); // Tạo kết nối mới từ pool

    // Kiểm tra dữ liệu đầu vào
    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ." });
    }

    // Chuẩn bị câu truy vấn INSERT
    const insertValues = [
      data.Khoa,
      data.Dot,
      data.Ki,
      data.Nam,
      data.GiaoVien || null,
      data.HeSoLopDong || null,
      data.HeSoT7CN || null,
      data.LL || null,
      data.LopHocPhan || null,
      data.QuyChuan || null,
      data.SoSinhVien || null,
      data.SoTietCTDT || null,
      data.SoTinChi || null,
      data.he_dao_tao || null,
    ];

    const insertQuery = `
        INSERT INTO ?? 
        (Khoa, Dot, Ki, Nam, GiaoVien, HeSoLopDong, HeSoT7CN, LL, LopHocPhan, QuyChuan, SoSinhVien, SoTietCTDT, SoTinChi, he_dao_tao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

    // Thực thi câu truy vấn INSERT
    const [result] = await connection.query(insertQuery, [
      tableTam,
      ...insertValues,
    ]);

    // Trả về phản hồi thành công, bao gồm ID của dòng mới
    res.json({ message: "Dòng đã được thêm thành công", ID: result.insertId });
  } catch (error) {
    console.error("Lỗi khi thêm dòng:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi thêm dòng." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const exportToWord = async (req, res) => {
  const { data, titleMap, orderedKeys } = req.body; // Dữ liệu gửi từ client

  // Định nghĩa ánh xạ Khoa
  const khoaMap = {
    CB: "CB",
    ATTT: "ATTT",
    "QS&GDTC": "KQS&GDTC",
    LLCT: "LLCT",
    TTTH: "TTTH",
    CNTT: "CNTT",
    ĐTVT: "ĐTVT",
    MM: "MM",
  };

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ hoặc rỗng." });
    }

    // Nhóm dữ liệu theo Khoa
    const groupedByKhoa = data.reduce((groups, item) => {
      const khoa = item.Khoa; // Dùng giá trị của Khoa làm key để nhóm
      if (!groups[khoa]) {
        groups[khoa] = []; // Nếu chưa có nhóm cho khoa này, tạo nhóm mới
      }
      groups[khoa].push(item); // Thêm đối tượng vào nhóm tương ứng
      return groups;
    }, {});

    // Tạo tài liệu Word với từng nhóm khoa
    const sections = [];

    // Duyệt qua các nhóm khoa và tạo bảng cho từng khoa
    for (const khoa in groupedByKhoa) {
      const khoaName = khoaMap[khoa] || khoa; // Sử dụng ánh xạ Khoa hoặc giữ nguyên nếu không có ánh xạ

      // Thêm dòng đánh dấu cho Khoa (dòng 1 cột)
      sections.push(
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      text: `Các học phần thuộc Khoa ${khoaName}`,
                      alignment: "center", // Căn giữa dòng
                      bold: true, // In đậm dòng "Khoa"
                    }),
                  ],
                  columnSpan: orderedKeys.length - 1, // Giảm số cột vì bỏ cột Khoa
                }),
              ],
            }),
          ],
        })
      );

      // Tạo bảng cho các học phần trong khoa
      const filteredKeys = orderedKeys.filter((key) => key !== "Khoa"); // Loại bỏ cột "Khoa"
      const tableRows = [
        // Header row (sử dụng titleMap)
        new TableRow({
          children: filteredKeys.map(
            (key) =>
              new TableCell({
                children: [
                  new Paragraph({ text: titleMap[key] || key, bold: true }),
                ],
              })
          ),
        }),
        // Data rows (dùng orderedKeys để sắp xếp thứ tự các cột)
        ...groupedByKhoa[khoa].map(
          (row, index) =>
            new TableRow({
              children: filteredKeys.map((key) => {
                // Nếu là "TT", tạo số thứ tự
                const cellValue = key === "STT" ? `${index + 1}` : row[key];
                return new TableCell({
                  children: [
                    new Paragraph({
                      text: cellValue !== null ? String(cellValue) : "",
                    }),
                  ],
                });
              }),
            })
        ),
      ];

      const table = new Table({
        rows: tableRows,
      });

      // Thêm bảng vào phần tương ứng trong tài liệu
      sections.push(table);
    }

    // Tạo tài liệu Word với tất cả các phần
    const doc = new Document({
      sections: [
        {
          children: sections,
        },
      ],
    });

    // Lưu tài liệu vào buffer
    const buffer = await Packer.toBuffer(doc);

    // Đặt tên file
    const fileName = `exported_data_${new Date().toISOString()}.docx`;

    // Gửi file về client
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (error) {
    console.error("Lỗi khi xuất file docx:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xuất file docx." });
  }
};

// V1
// const exportToExcel = async (req, res) => {
//   const { renderData } = req.body;

//   // console.log(renderData[0]);
//   // Mảng tiêu đề theo thứ tự mong muốn
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//   };

//   // Mảng tiêu đề dựa trên titleMap
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );

//   // Nhóm dữ liệu theo 'Khoa'
//   const groupedData = renderData.reduce((acc, item, index) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];

//     // Tạo hàng dữ liệu theo thứ tự
//     const row = orderedKeys.map((key) =>
//       key === "STT" ? `${acc[department].length + 1}.` : item[key] || ""
//     );
//     acc[department].push(row);

//     return acc;
//   }, {});

//   // Tạo workbook
//   const workbook = XLSX.utils.book_new();

//   // Tạo từng sheet cho từng Khoa
//   Object.entries(groupedData).forEach(([department, rows]) => {
//     const headerTitle = [[`SỐ TIẾT QUY CHUẨN THEO KHOA ${department}`]];
//     const worksheetData = [...headerTitle, [], headers, ...rows];

//     const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

//     // Căn chỉnh độ rộng cột
//     worksheet["!cols"] = headers.map((header) => ({
//       wpx: Math.min(header.length * 10, 150),
//     }));

//     XLSX.utils.book_append_sheet(workbook, worksheet, department);
//   });

//   // Tạo tên file dựa trên Ki và Nam học
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   // Tạo file trong thư mục templates
//   const filePath = path.join("./uploads", fileName);

//   // Ghi file Excel vào filePath
//   XLSX.writeFile(workbook, filePath);

//   // Gửi file về client và xóa file sau khi gửi
//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       res.status(500).send("Không thể tải file");
//     } else {
//       // Xóa file sau khi gửi thành công
//       fs.unlink(filePath, (unlinkErr) => {
//         if (unlinkErr) {
//           console.error("Lỗi khi xóa file:", unlinkErr);
//         } else {
//           console.log("File đã được xóa thành công.");
//         }
//       });
//     }
//   });
// };

// const exportToExcel = async (req, res) => {
//   const { renderData } = req.body;

//   // Mảng tiêu đề theo thứ tự mong muốn
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//   };

//   // Tạo tiêu đề hiển thị cho Excel
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );

//   // Biến đếm STT toàn cục (tăng từ 1 đến hết)
//   let sttCounter = 1;

//   // Nhóm dữ liệu theo 'Khoa', đồng thời gán STT theo sttCounter
//   const groupedData = renderData.reduce((acc, item) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];
//     const row = orderedKeys.map((key) =>
//       key === "STT" ? `${sttCounter++}.` : (item[key] || "")
//     );
//     acc[department].push(row);
//     return acc;
//   }, {});

//   // Hàm chuyển số sang số la mã (Roman numeral)
//   const toRoman = (num) => {
//     const romanNumerals = [
//       ["M", 1000],
//       ["CM", 900],
//       ["D", 500],
//       ["CD", 400],
//       ["C", 100],
//       ["XC", 90],
//       ["L", 50],
//       ["XL", 40],
//       ["X", 10],
//       ["IX", 9],
//       ["V", 5],
//       ["IV", 4],
//       ["I", 1],
//     ];
//     let roman = "";
//     for (const [letter, value] of romanNumerals) {
//       while (num >= value) {
//         roman += letter;
//         num -= value;
//       }
//     }
//     return roman;
//   };

//   // Tạo workbook và worksheet mới bằng ExcelJS
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet("ALL", {
//     pageSetup: {
//       // Thiết lập in theo dạng landscape
//       orientation: "landscape",
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//       paperSize: 9, // 9 tương ứng với A4 trong ExcelJS
//     },
//   });

//   // Chỉ in dòng header (tiêu đề cột) 1 lần sau divider của nhóm đầu tiên
//   let headerPrinted = false;
//   let romanCounter = 1;

//   // Duyệt qua từng nhóm khoa
//   for (const [department, rows] of Object.entries(groupedData)) {
//     // Thêm dòng divider cho từng khoa với số la mã
//     const roman = toRoman(romanCounter++);
//     const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
//     const dividerRow = worksheet.addRow([dividerText]);
//     // Hợp nhất các ô từ cột 1 đến cột cuối
//     worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, headers.length);
//     dividerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     // Làm đậm dòng divider
//     dividerRow.font = { bold: true };

//     // Nếu chưa in header, in dòng header ngay sau divider của nhóm đầu tiên
//     if (!headerPrinted) {
//       const headerRow = worksheet.addRow(headers);
//       headerRow.eachCell((cell) => {
//         cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//         cell.font = { bold: true };
//       });
//       headerPrinted = true;
//     }

//     // Thêm các dòng dữ liệu của khoa
//     rows.forEach((dataRow) => {
//       worksheet.addRow(dataRow);
//     });

//     // Thêm một dòng trống giữa các nhóm (tuỳ chọn)
//     worksheet.addRow([]);
//   }

//   // Áp dụng border và wrapText cho tất cả các ô trong worksheet
//   worksheet.eachRow((row) => {
//     row.eachCell({ includeEmpty: true }, (cell) => {
//       cell.border = {
//         top: { style: "thin", color: { argb: "FF000000" } },
//         left: { style: "thin", color: { argb: "FF000000" } },
//         bottom: { style: "thin", color: { argb: "FF000000" } },
//         right: { style: "thin", color: { argb: "FF000000" } },
//       };
//       cell.alignment = cell.alignment || { horizontal: "left" };
//       cell.alignment.wrapText = true;
//       cell.font = {
//         name: "Cambria",
//         size: 13,
//         bold: cell.font?.bold || false,
//       };
//     });
//   });

//   // Đặt độ rộng cột theo yêu cầu:
//   // - Cột "STT" và "Số TC" (SoTinChi) có độ rộng nhỏ nhất (10 đơn vị)
//   // - Cột "GiaoVien" và "LopHocPhan" mỗi cột chiếm 20% tổng chiều rộng (150 đơn vị)
//   // - Các cột còn lại chia đều phần còn lại
//   const maxTotalWidth = 160; // Tổng chiều rộng tối đa của bảng
//   const colCount = headers.length;
//   const sttIndex = orderedKeys.indexOf("STT");
//   const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
//   const teacherIndex = orderedKeys.indexOf("GiaoVien");
//   const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");

//   const fixedWidthSTT = 5; // Cột STT và Số TC
//   const fixedWidthTeacher = maxTotalWidth * 0.2; // 30 đơn vị
//   const fixedWidthLopHocPhan = maxTotalWidth * 0.2; // 30 đơn vị

//   // Tổng width cố định
//   const fixedTotal =
//     fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan;
//   const remainingColumnsCount = colCount - 4; // trừ STT, SoTinChi, GiaoVien, LopHocPhan
//   const remainingWidthEach =
//     remainingColumnsCount > 0
//       ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
//       : 0;

//   for (let i = 1; i <= colCount; i++) {
//     if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
//       worksheet.getColumn(i).width = fixedWidthSTT;
//     } else if (i - 1 === teacherIndex) {
//       worksheet.getColumn(i).width = fixedWidthTeacher;
//     } else if (i - 1 === lopHocPhanIndex) {
//       worksheet.getColumn(i).width = fixedWidthLopHocPhan;
//     } else {
//       worksheet.getColumn(i).width = remainingWidthEach;
//     }
//   }

//   // Tạo tên file dựa trên Ki và Nam học
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   const filePath = path.join("./uploads", fileName);

//   // Ghi file Excel ra filePath
//   await workbook.xlsx.writeFile(filePath);

//   // Gửi file về client và xóa file sau khi gửi
//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       res.status(500).send("Không thể tải file");
//     } else {
//       fs.unlink(filePath, (unlinkErr) => {
//         if (unlinkErr) {
//           console.error("Lỗi khi xóa file:", unlinkErr);
//         } else {
//           console.log("File đã được xóa thành công.");
//         }
//       });
//     }
//   });
// };

// V2
// const exportToExcel = async (req, res) => {
//   const { renderData } = req.body;

//   // Mảng tiêu đề theo thứ tự mong muốn
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//     "GhiChu"
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//     GhiChu: "Ghi chú"
//   };

//   // Tạo tiêu đề hiển thị cho Excel
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );

//   // Biến đếm STT toàn cục (tăng từ 1 đến hết)
//   let sttCounter = 1;

//   // Nhóm dữ liệu theo 'Khoa', đồng thời gán STT theo sttCounter
//   const groupedData = renderData.reduce((acc, item) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];
//     const row = orderedKeys.map((key) =>
//       key === "STT" ? `${sttCounter++}.` : (item[key] || "")
//     );
//     acc[department].push(row);
//     return acc;
//   }, {});

//   // Hàm chuyển số sang số la mã (Roman numeral)
//   const toRoman = (num) => {
//     const romanNumerals = [
//       ["M", 1000],
//       ["CM", 900],
//       ["D", 500],
//       ["CD", 400],
//       ["C", 100],
//       ["XC", 90],
//       ["L", 50],
//       ["XL", 40],
//       ["X", 10],
//       ["IX", 9],
//       ["V", 5],
//       ["IV", 4],
//       ["I", 1],
//     ];
//     let roman = "";
//     for (const [letter, value] of romanNumerals) {
//       while (num >= value) {
//         roman += letter;
//         num -= value;
//       }
//     }
//     return roman;
//   };

//   // Tạo workbook và worksheet mới bằng ExcelJS
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet("ALL", {
//     pageSetup: {
//       orientation: "landscape",
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//       paperSize: 9, // 9 tương ứng với A4 trong ExcelJS
//     },
//   });

//   // In header đầu tiên ở đầu trang
//   const headerRow = worksheet.addRow(headers);
//   headerRow.eachCell((cell) => {
//     cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     cell.font = { bold: true };
//   });

//   let romanCounter = 1;

//   // Duyệt qua từng nhóm khoa
//   for (const [department, rows] of Object.entries(groupedData)) {
//     // Thêm dòng divider cho từng khoa với số la mã
//     const roman = toRoman(romanCounter++);
//     const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
//     const dividerRow = worksheet.addRow([dividerText]);
//     // Hợp nhất các ô từ cột 1 đến cột cuối
//     worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, headers.length);
//     dividerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     dividerRow.font = { bold: true };

//     // Thêm các dòng dữ liệu của khoa
//     rows.forEach((dataRow) => {
//       worksheet.addRow(dataRow);
//     });

//     // Thêm một dòng trống giữa các nhóm (tuỳ chọn)
//     worksheet.addRow([]);
//   }

//   // Áp dụng border và wrapText cho tất cả các ô trong worksheet
//   worksheet.eachRow((row) => {
//     row.eachCell({ includeEmpty: true }, (cell) => {
//       cell.border = {
//         top: { style: "thin", color: { argb: "FF000000" } },
//         left: { style: "thin", color: { argb: "FF000000" } },
//         bottom: { style: "thin", color: { argb: "FF000000" } },
//         right: { style: "thin", color: { argb: "FF000000" } },
//       };
//       cell.alignment = cell.alignment || { horizontal: "left" };
//       cell.alignment.wrapText = true;
//       cell.font = {
//         name: "Cambria",
//         size: 13,
//         bold: cell.font?.bold || false,
//       };
//     });
//   });

//   // Đặt độ rộng cột theo yêu cầu:
//   // - Cột "STT" và "Số TC" (SoTinChi) có độ rộng cố định
//   // - Cột "GiaoVien" và "LopHocPhan" chiếm 20% tổng chiều rộng
//   // - Các cột còn lại chia đều phần còn lại
//   const maxTotalWidth = 150; // Tổng chiều rộng tối đa của bảng
//   const colCount = headers.length;
//   const sttIndex = orderedKeys.indexOf("STT");
//   const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
//   const teacherIndex = orderedKeys.indexOf("GiaoVien");
//   const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");

//   const fixedWidthSTT = 7; // Cột STT và Số TC
//   const fixedWidthTeacher = maxTotalWidth * 0.2; // 20% tổng width
//   const fixedWidthLopHocPhan = maxTotalWidth * 0.2; // 20% tổng width

//   // Tổng width cố định
//   const fixedTotal =
//     fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan;
//   const remainingColumnsCount = colCount - 4; // trừ STT, SoTinChi, GiaoVien, LopHocPhan
//   const remainingWidthEach =
//     remainingColumnsCount > 0
//       ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
//       : 0;

//   for (let i = 1; i <= colCount; i++) {
//     if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
//       worksheet.getColumn(i).width = fixedWidthSTT;
//     } else if (i - 1 === teacherIndex) {
//       worksheet.getColumn(i).width = fixedWidthTeacher;
//     } else if (i - 1 === lopHocPhanIndex) {
//       worksheet.getColumn(i).width = fixedWidthLopHocPhan;
//     } else {
//       worksheet.getColumn(i).width = remainingWidthEach;
//     }
//   }

//   // Tạo tên file dựa trên Ki và Nam học
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   const filePath = path.join("./uploads", fileName);

//   // Ghi file Excel ra filePath
//   await workbook.xlsx.writeFile(filePath);

//   // Gửi file về client và xóa file sau khi gửi
//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       res.status(500).send("Không thể tải file");
//     } else {
//       fs.unlink(filePath, (unlinkErr) => {
//         if (unlinkErr) {
//           console.error("Lỗi khi xóa file:", unlinkErr);
//         } else {
//           console.log("File đã được xóa thành công.");
//         }
//       });
//     }
//   });
// };

// V3
// const exportToExcel2 = async (req, res) => {
//   const { renderData } = req.body;

//   // 1) Chuẩn bị key và map tiêu đề
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//     "GhiChu"
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//     GhiChu: "Ghi chú"
//   };

//   // Danh sách header hiển thị
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );
//   // Tổng số cột
//   const totalColumns = headers.length; // 11 cột

//   // Tạo workbook & worksheet
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet("ALL", {
//     pageSetup: {
//       orientation: "landscape",
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//       paperSize: 9, // A4
//     },
//   });

//   // ========================
//   // PHẦN HEADER NGOÀI
//   // ========================

//   // Row 1: (Trái - Phải)
//   let row = worksheet.addRow([]);
//   row.getCell(1).value = "BAN CƠ YẾU CHÍNH PHỦ";
//   row.getCell(6).value = "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM";
//   worksheet.mergeCells(row.number, 1, row.number, 4);   // A->E
//   worksheet.mergeCells(row.number, 6, row.number, 11);  // F->K
//   // Định dạng căn trái - phải tùy ý
//   row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
//   row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

//   // Row 2: (Trái - Phải)
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "HỌC VIỆN KỸ THUẬT MẬT MÃ";
//   row.getCell(6).value = "Độc lập - Tự do - Hạnh phúc";
//   worksheet.mergeCells(row.number, 1, row.number, 4);
//   worksheet.mergeCells(row.number, 6, row.number, 11);
//   row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
//   row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

//   // Row 3: (Trái - Phải)
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "Số:          /TB-HVM";
//   row.getCell(6).value = "Hà Nội, ngày        tháng 03 năm 2025";
//   worksheet.mergeCells(row.number, 1, row.number, 4);
//   worksheet.mergeCells(row.number, 6, row.number, 11);
//   row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
//   row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

//   // Row 4: dòng trống
//   row = worksheet.addRow([]);
//   worksheet.mergeCells(row.number, 1, row.number, 11);

//   // ========================
//   // PHẦN THÔNG BÁO
//   // ========================

//   // Row 5: THÔNG BÁO
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "THÔNG BÁO";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

//   // Row 6: Số tiết quy chuẩn...
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "Số tiết quy chuẩn các lớp học phần thuộc học kỳ 2, năm học 2024 – 2025";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

//   // Row 7: (Cơ sở đào tạo phía Bắc)
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "(Cơ sở đào tạo phía Bắc)";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

//   // ========================
//   // PHẦN CÁC "CĂN CỨ..."
//   // ========================
//   const canCuuList = [
//     "           Căn cứ Thông tư số 20/2020/TT-BGDĐT ngày 27 tháng 7 năm 2020 của Bộ trưởng Bộ Giáo dục và đào tạo ban hành Quy định chế độ làm việc của giảng viên cơ sở giáo dục đại học;",
//     "           Căn cứ Quyết định số 1409/QĐ-HVM ngày 30 tháng 12 năm 2021 của Giám đốc Học viện Kỹ thuật mật mã ban hành Quy định chế độ làm việc đối với giảng viên Học viện Kỹ thuật mật mã;",
//     "           Căn cứ Thời khóa biểu học kỳ 2, năm học 2024-2025;",
//     "           Căn cứ kết quả đăng ký các học phần của học viên, sinh viên thuộc học kỳ 2, năm 2024 - 2025;",
//     "           Căn cứ Đề nghị thay đổi giảng viên các lớp học phần của các Khoa.",
//     "           Học viện Kỹ thuật mật mã thông báo số tiết quy chuẩn các lớp học phần thuộc học kỳ 2, năm học 2024-2025 (Cơ sở đào tạo phía Bắc) như sau:"
//   ];

//   canCuuList.forEach((text) => {
//     let r = worksheet.addRow([]);
//     r.getCell(1).value = text;
//     worksheet.mergeCells(r.number, 1, r.number, totalColumns);
//     r.getCell(1).alignment = {
//       horizontal: "left",
//       vertical: "top",
//       wrapText: true,
//     };
//   });

//   // Thêm 1 row trống trước khi vào bảng
//   worksheet.addRow([]);

//   // ========================
//   // PHẦN HEADER BẢNG
//   // ========================

//   // Thêm header bảng
//   const headerRow = worksheet.addRow(headers);
//   headerRow.eachCell((cell) => {
//     cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     cell.font = { bold: true };
//   });

//   // ========================
//   // XỬ LÝ DỮ LIỆU: NHÓM THEO KHOA
//   // ========================
//   let sttCounter = 1;
//   const groupedData = renderData.reduce((acc, item) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];
//     const rowData = orderedKeys.map((key) =>
//       key === "STT" ? `${sttCounter++}.` : (item[key] || "")
//     );
//     acc[department].push(rowData);
//     return acc;
//   }, {});

//   // Hàm chuyển số sang La Mã
//   const toRoman = (num) => {
//     const romanNumerals = [
//       ["M", 1000],
//       ["CM", 900],
//       ["D", 500],
//       ["CD", 400],
//       ["C", 100],
//       ["XC", 90],
//       ["L", 50],
//       ["XL", 40],
//       ["X", 10],
//       ["IX", 9],
//       ["V", 5],
//       ["IV", 4],
//       ["I", 1],
//     ];
//     let roman = "";
//     for (const [letter, value] of romanNumerals) {
//       while (num >= value) {
//         roman += letter;
//         num -= value;
//       }
//     }
//     return roman;
//   };

//   let romanCounter = 1;
//   for (const [department, rowsData] of Object.entries(groupedData)) {
//     const roman = toRoman(romanCounter++);
//     const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
//     let dividerRow = worksheet.addRow([dividerText]);
//     worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, totalColumns);
//     dividerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     dividerRow.font = { bold: true };

//     // Thêm data rows
//     rowsData.forEach((rData) => {
//       worksheet.addRow(rData);
//     });
//     // Row trống sau mỗi nhóm
//     worksheet.addRow([]);
//   }

//   // ========================
//   // PHẦN ROW CUỐI: THÔNG BÁO KẾT
//   // ========================
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "        Nhận được Thông báo này các cơ quan, đơn vị có liên quan chủ động triển khai thực hiện./.";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "left", vertical: "top", wrapText: true };

//   // (Tuỳ chọn) Thêm các row “Nơi nhận”, chữ ký… nếu muốn

//   // ========================
//   // ĐỊNH DẠNG CHUNG (border, font, wrapText)
//   // ========================
//   worksheet.eachRow((rItem) => {
//     rItem.eachCell({ includeEmpty: true }, (cell) => {
//       cell.border = {
//         top: { style: "thin", color: { argb: "FF000000" } },
//         left: { style: "thin", color: { argb: "FF000000" } },
//         bottom: { style: "thin", color: { argb: "FF000000" } },
//         right: { style: "thin", color: { argb: "FF000000" } },
//       };
//       cell.font = {
//         name: "Cambria",
//         size: 13,
//         bold: cell.font?.bold || false,
//       };
//       if (!cell.alignment) {
//         cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
//       } else {
//         cell.alignment.wrapText = true;
//       }
//     });
//   });

//   // ========================
//   // ĐỘ RỘNG CỘT
//   // ========================
//   const maxTotalWidth = 150;
//   const colCount = totalColumns; // 11
//   const sttIndex = orderedKeys.indexOf("STT");
//   const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
//   const teacherIndex = orderedKeys.indexOf("GiaoVien");
//   const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");

//   const fixedWidthSTT = 7; // Cột STT + Số TC
//   const fixedWidthTeacher = maxTotalWidth * 0.2; // 20%
//   const fixedWidthLopHocPhan = maxTotalWidth * 0.2; // 20%

//   const fixedTotal = fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan;
//   const remainingColumnsCount = colCount - 4;
//   const remainingWidthEach =
//     remainingColumnsCount > 0
//       ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
//       : 0;

//   for (let i = 1; i <= colCount; i++) {
//     if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
//       worksheet.getColumn(i).width = fixedWidthSTT;
//     } else if (i - 1 === teacherIndex) {
//       worksheet.getColumn(i).width = fixedWidthTeacher;
//     } else if (i - 1 === lopHocPhanIndex) {
//       worksheet.getColumn(i).width = fixedWidthLopHocPhan;
//     } else {
//       worksheet.getColumn(i).width = remainingWidthEach;
//     }
//   }

//   // ========================
//   // GHI FILE VÀ TRẢ VỀ CLIENT
//   // ========================
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   const filePath = path.join("./uploads", fileName);

//   await workbook.xlsx.writeFile(filePath);

//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       return res.status(500).send("Không thể tải file");
//     }
//     fs.unlink(filePath, (unlinkErr) => {
//       if (unlinkErr) {
//         console.error("Lỗi khi xóa file:", unlinkErr);
//       } else {
//         console.log("File đã được xóa thành công sau khi gửi.");
//       }
//     });
//   });
// };

// V4
const exportToExcel = async (req, res) => {
  const { renderData } = req.body;

  // 1) Chuẩn bị key và map tiêu đề
  const orderedKeys = [
    "STT",
    "LopHocPhan",
    "GiaoVien",
    "SoTinChi",
    "NgayBatDau",
    "NgayKetThuc",
    "LL",
    "SoSinhVien",
    "SoTietCTDT",
    "HeSoLopDong",
    "HeSoT7CN",
    "QuyChuan",
    "he_dao_tao",
    "GhiChu",
  ];

  const titleMap = {
    SoTinChi: "Số TC",
    LopHocPhan: "Lớp học phần",
    GiaoVien: "Giảng viên theo TKB",
    NgayBatDau: "Ngày bắt đầu",
    NgayKetThuc: "Ngày kết thúc",
    SoTietCTDT: "Số tiết theo CTĐT",
    SoSinhVien: "Số SV",
    LL: "Số tiết lên lớp",
    HeSoT7CN: "Hệ số lên lớp ngoài giờ",
    HeSoLopDong: "Hệ số lớp đông",
    QuyChuan: "QC",
    he_dao_tao: "Hệ đào tạo",
    GhiChu: "Ghi chú",
  };

  // Danh sách header hiển thị
  const headers = orderedKeys.map((key) =>
    key === "STT" ? "STT" : titleMap[key] || key
  );
  // Tổng số cột
  const totalColumns = headers.length; // 14 cột (bao gồm STT, đã bỏ Khoa, Đợt, Kì, Năm)

  // Tạo workbook & worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("ALL", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  // ========================
  // PHẦN HEADER NGOÀI
  // ========================

  // Row 1: (Trái - Phải)
  // Row 1: (Trái - Phải)
  let row = worksheet.addRow([]);
  row.getCell(2).value = "BAN CƠ YẾU CHÍNH PHỦ".toUpperCase();
  row.getCell(5).value = "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM".toUpperCase();
  worksheet.mergeCells(row.number, 2, row.number, 3); // B->C
  worksheet.mergeCells(row.number, 5, row.number, 10); // E->J

  // Căn giữa, in đậm
  row.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(5).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  row.getCell(2).font = { bold: true };
  row.getCell(5).font = { bold: true };

  // Row 2: (Trái - Phải)
  row = worksheet.addRow([]);
  row.getCell(2).value = "HỌC VIỆN KỸ THUẬT MẬT MÃ".toUpperCase();
  row.getCell(5).value = "Độc lập - Tự do - Hạnh phúc";

  worksheet.mergeCells(row.number, 2, row.number, 3);
  worksheet.mergeCells(row.number, 5, row.number, 10);

  // Căn giữa & in đậm
  row.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(5).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  row.getCell(2).font = { bold: true };
  row.getCell(5).font = { bold: true };

  // Row 3: (Trái - Phải)
  row = worksheet.addRow([]);
  row.getCell(2).value = "Số:          /TB-HVM";
  row.getCell(5).value = "Hà Nội, ngày        tháng        năm           ";
  worksheet.mergeCells(row.number, 2, row.number, 3);
  worksheet.mergeCells(row.number, 5, row.number, 10);
  row.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(5).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  // Row 4: dòng trống
  row = worksheet.addRow([]);
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);

  // ========================
  // PHẦN THÔNG BÁO
  // ========================

  // Row 5: THÔNG BÁO
  row = worksheet.addRow([]);
  row.getCell(1).value = "THÔNG BÁO".toUpperCase();
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { bold: true };

  // Row 6: Số tiết quy chuẩn...
  row = worksheet.addRow([]);
  row.getCell(
    1
  ).value = `Số tiết quy chuẩn các lớp học phần thuộc học kỳ ${renderData[0].Ki}, năm học ${renderData[0].Nam}`;
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { bold: true };

  // Row 7: (Cơ sở đào tạo phía Bắc)
  row = worksheet.addRow([]);
  row.getCell(1).value = "(Cơ sở đào tạo phía Bắc)";
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { name: "Times New Roman", italic: true };

  // ========================
  // PHẦN CÁC "CĂN CỨ..."
  // ========================
  const canCuuList = [
    "           Căn cứ Thông tư số 20/2020/TT-BGDĐT ngày 27 tháng 7 năm 2020 của Bộ trưởng Bộ Giáo dục và đào tạo ban hành Quy định chế độ làm việc của giảng viên cơ sở giáo dục đại học;",
    "           Căn cứ Quyết định số 1409/QĐ-HVM ngày 30 tháng 12 năm 2021 của Giám đốc Học viện Kỹ thuật mật mã ban hành Quy định chế độ làm việc đối với giảng viên Học viện Kỹ thuật mật mã;",
    `           Căn cứ Thời khóa biểu học kỳ ${renderData[0].Ki}, năm học ${renderData[0].Nam};`,
    `           Căn cứ kết quả đăng ký các học phần của học viên, sinh viên thuộc học kỳ ${renderData[0].Ki}, năm ${renderData[0].Nam};`,
    "           Căn cứ Đề nghị thay đổi giảng viên các lớp học phần của các Khoa.",
    `           Học viện Kỹ thuật mật mã thông báo số tiết quy chuẩn các lớp học phần thuộc học kỳ ${renderData[0].Ki}, năm học ${renderData[0].Nam} (Cơ sở đào tạo phía Bắc) như sau:`,
  ];

  const rowsWithFixedHeight = [0, 1]; // Các dòng x3 chiều cao

  canCuuList.forEach((text, index) => {
    let r = worksheet.addRow([]);
    r.getCell(1).value = text;
    worksheet.mergeCells(r.number, 1, r.number, totalColumns);
    r.getCell(1).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };
    if (rowsWithFixedHeight.includes(index)) {
      r.height = 45;
    }
  });

  // Thêm 1 row trống trước khi vào bảng
  worksheet.addRow([]);

  // ========================
  // PHẦN HEADER BẢNG
  // ========================
  // Thêm header bảng
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.font = { bold: true };
  });
  // Lưu lại dòng bắt đầu của vùng bảng
  const tableStart = headerRow.number;

  // ========================
  // XỬ LÝ DỮ LIỆU: NHÓM THEO KHOA
  // ========================
  let sttCounter = 1;
  const groupedData = renderData.reduce((acc, item) => {
    const department = item.Khoa || "Khac";
    if (!acc[department]) acc[department] = [];
    const rowData = orderedKeys.map((key) => {
      if (key === "STT") {
        return `${sttCounter++}`;
      } else if (key === "NgayBatDau" || key === "NgayKetThuc") {
        // Format ngày tháng
        return item[key] ? formatDate(item[key]) : "";
      } else if (key === "SoSinhVien" || key === "LL") {
        // Xử lý NULL: nếu NULL hoặc undefined thì set thành 0
        const value = item[key];
        return (value === null || value === undefined || value === "") ? 0 : value;
      } else {
        return item[key] || "";
      }
    });
    acc[department].push(rowData);
    return acc;
  }, {});

  // Hàm chuyển số sang La Mã
  const toRoman = (num) => {
    const romanNumerals = [
      ["M", 1000],
      ["CM", 900],
      ["D", 500],
      ["CD", 400],
      ["C", 100],
      ["XC", 90],
      ["L", 50],
      ["XL", 40],
      ["X", 10],
      ["IX", 9],
      ["V", 5],
      ["IV", 4],
      ["I", 1],
    ];
    let roman = "";
    for (const [letter, value] of romanNumerals) {
      while (num >= value) {
        roman += letter;
        num -= value;
      }
    }
    return roman;
  };

  let romanCounter = 1;
  for (const [department, rowsData] of Object.entries(groupedData)) {
    const roman = toRoman(romanCounter++);
    const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
    let dividerRow = worksheet.addRow([dividerText]);
    worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, totalColumns);
    dividerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    dividerRow.font = { bold: true };

    // Thêm viền cho toàn bộ hàng
    for (let col = 1; col <= totalColumns; col++) {
      dividerRow.getCell(col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }

    // Thêm data rows
    rowsData.forEach((rData) => {
      worksheet.addRow(rData);
    });

    // Row trống sau mỗi nhóm
    // worksheet.addRow([]);
  }

  worksheet.addRow([]);

  // Lưu lại dòng kết thúc của vùng bảng (trước phần thông báo cuối)
  const tableEnd = worksheet.lastRow.number;

  // ========================
  // PHẦN ROW CUỐI: THÔNG BÁO KẾT
  // ========================
  row = worksheet.addRow([]);
  row.getCell(1).value =
    "        Nhận được Thông báo này các cơ quan, đơn vị có liên quan chủ động triển khai thực hiện./.";
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "left",
    vertical: "top",
    wrapText: true,
  };

  row = worksheet.addRow([]); // Dòng trống
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);

  // ==============
  // PHẦN NƠI NHẬN & CHỮ KÝ
  // ==============

  // 1) Dòng "Nơi nhận" (bên trái) & "KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC" (bên phải)
  row = worksheet.addRow([]);
  row.getCell(2).value = "Nơi nhận:";
  worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
  row.getCell(2).alignment = {
    horizontal: "left",
    vertical: "top",
    wrapText: true,
  };
  row.getCell(2).font = { bold: true };

  // Bên phải
  row.getCell(7).value = "KT. GIÁM ĐỐC\nPHÓ GIÁM ĐỐC";
  worksheet.mergeCells(row.number, 7, row.number, totalColumns); // G->K
  row.getCell(7).alignment = {
    horizontal: "center",
    vertical: "top",
    wrapText: true,
  };
  row.getCell(7).font = { bold: true };

  // 2) Các dòng gạch đầu dòng bên trái
  const bulletLines = [
    "- Ban Giám đốc (2) (để b/c)",
    "- Phòng KH-TC;",
    "- Các khoa: NM, ATTT, CNTT, ĐTVT,",
    "  TTTH, CB, LLCT, KQS&QĐ...;",
    "- Lưu: VT, ĐT P13.",
  ];
  bulletLines.forEach((text) => {
    row = worksheet.addRow([]);
    // Bên trái
    row.getCell(2).value = text;
    worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
    row.getCell(2).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };

    // Bên phải để trống, vẫn merge để không bị border
    worksheet.mergeCells(row.number, 7, row.number, totalColumns);
  });

  // 3) Thêm một vài dòng trống (tùy chỉnh) để tạo khoảng cho chữ ký
  for (let i = 0; i < 2; i++) {
    row = worksheet.addRow([]);
    worksheet.mergeCells(row.number, 1, row.number, 6);
    worksheet.mergeCells(row.number, 7, row.number, totalColumns);
  }

  // ========================
  // ĐỊNH DẠNG CHUNG (border, font, wrapText)
  // ========================
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (rowNumber >= tableStart && rowNumber <= tableEnd) {
        // Vùng bảng: áp dụng border và căn giữa theo vertical
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
        cell.alignment = {
          horizontal: cell.alignment?.horizontal || "left",
          vertical: "middle",
          wrapText: true,
        };
      } else {
        // Vùng ngoài bảng: không viền, chỉ thêm wrapText: true
        cell.border = undefined;
        cell.alignment = {
          horizontal: cell.alignment?.horizontal || "left",
          vertical: "top",
          wrapText: true,
        };
      }
      cell.font = {
        name: "Times New Roman",
        size: 13,
        bold: cell.font?.bold || false,
      };
    });
  });

  // ========================
  // ĐỘ RỘNG CỘT
  // ========================
  const maxTotalWidth = 150;
  const colCount = totalColumns; // 14
  const sttIndex = orderedKeys.indexOf("STT");
  const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
  const teacherIndex = orderedKeys.indexOf("GiaoVien");
  const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");
  const heDaoTaoIndex = orderedKeys.indexOf("he_dao_tao");

  const fixedWidthSTT = 7; // Cột STT + Số TC
  const fixedWidthTeacher = maxTotalWidth * 0.15; // 15% (giảm từ 20%)
  const fixedWidthLopHocPhan = maxTotalWidth * 0.2; // 20% (giảm từ 30%)
  const fixedWidthHeDaoTao = maxTotalWidth * 0.12; // 12% (tăng cho Hệ đào tạo)

  const fixedTotal =
    fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan + fixedWidthHeDaoTao;
  const remainingColumnsCount = colCount - 5; // Trừ đi STT, SoTinChi, GiaoVien, LopHocPhan, he_dao_tao
  const remainingWidthEach =
    remainingColumnsCount > 0
      ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
      : 0;

  for (let i = 1; i <= colCount; i++) {
    if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
      worksheet.getColumn(i).width = fixedWidthSTT;
    } else if (i - 1 === teacherIndex) {
      worksheet.getColumn(i).width = fixedWidthTeacher;
    } else if (i - 1 === lopHocPhanIndex) {
      worksheet.getColumn(i).width = fixedWidthLopHocPhan;
    } else if (i - 1 === heDaoTaoIndex) {
      worksheet.getColumn(i).width = fixedWidthHeDaoTao;
    } else {
      worksheet.getColumn(i).width = remainingWidthEach;
    }
  }

  // ========================
  // GHI FILE VÀ TRẢ VỀ CLIENT
  // ========================
  const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
  const filePath = path.join("./uploads", fileName);

  await workbook.xlsx.writeFile(filePath);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Lỗi khi gửi file:", err);
      return res.status(500).send("Không thể tải file");
    }
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error("Lỗi khi xóa file:", unlinkErr);
      } else {
        console.log("File đã được xóa thành công sau khi gửi.");
      }
    });
  });
};

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  // Sử dụng các phương thức lấy giá trị theo giờ địa phương
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// API mới xuất file Excel quy chuẩn chính thức với 19 cột
const exportToExcelQC = async (req, res) => {
  const { renderData } = req.body;

  // 1) Chuẩn bị key và map tiêu đề (bỏ Đợt, Kì, Năm - sẽ hiển thị dưới dạng text ghi chú)
  const orderedKeys = [
    "STT",
    "LopHocPhan",
    "SoTinChi",
    "TenLop",
    "he_dao_tao",
    "GiaoVien",
    "GiaoVienGiangDay",
    "MoiGiang",
    "NgayBatDau",
    "NgayKetThuc",
    "LL",
    "SoSinhVien",
    "HeSoLopDong",
    "HeSoT7CN",
    "QuyChuan",
    "GhiChu",
  ];

  const titleMap = {
    Dot: "Đợt",
    KiHoc: "Kì",
    NamHoc: "Năm",
    LopHocPhan: "Lớp học phần",
    SoTinChi: "Số TC",
    TenLop: "Mã lớp",
    he_dao_tao: "Hệ đào tạo",
    GiaoVien: "Giảng viên theo TKB",
    GiaoVienGiangDay: "Giảng viên giảng dạy",
    MoiGiang: "Mời giảng?",
    NgayBatDau: "Ngày bắt đầu",
    NgayKetThuc: "Ngày kết thúc",
    LL: "Số tiết LL",
    SoSinhVien: "Số SV",
    HeSoLopDong: "Hệ số lớp đông",
    HeSoT7CN: "Hệ số ngoài giờ",
    QuyChuan: "Số tiết QC",
    GhiChu: "Ghi chú",
  };

  // Danh sách header hiển thị
  const headers = orderedKeys.map((key) =>
    key === "STT" ? "STT" : titleMap[key] || key
  );
  // Tổng số cột (đã bỏ 3 cột Đợt, Kì, Năm)
  const totalColumns = headers.length; // 16 cột (19 - 3)

  // Tạo workbook & worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("ALL", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  // ========================
  // PHẦN HEADER NGOÀI
  // ========================
  // Tính toán vị trí căn giữa dựa trên số cột
  const leftStartCol = 1;
  const leftEndCol = Math.floor(totalColumns / 3); // 1/3 bên trái
  const rightStartCol = Math.floor(totalColumns * 2 / 3); // Bắt đầu từ 2/3
  const rightEndCol = totalColumns; // Đến cuối

  // Row 1: (Trái - Phải)
  let row = worksheet.addRow([]);
  row.getCell(leftStartCol).value = "BAN CƠ YẾU CHÍNH PHỦ".toUpperCase();
  row.getCell(rightStartCol).value = "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM".toUpperCase();
  worksheet.mergeCells(row.number, leftStartCol, row.number, leftEndCol);
  worksheet.mergeCells(row.number, rightStartCol, row.number, rightEndCol);

  // Căn giữa, in đậm
  row.getCell(leftStartCol).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(rightStartCol).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  row.getCell(leftStartCol).font = { bold: true };
  row.getCell(rightStartCol).font = { bold: true };

  // Row 2: (Trái - Phải)
  row = worksheet.addRow([]);
  row.getCell(leftStartCol).value = "HỌC VIỆN KỸ THUẬT MẬT MÃ".toUpperCase();
  row.getCell(rightStartCol).value = "Độc lập - Tự do - Hạnh phúc";

  worksheet.mergeCells(row.number, leftStartCol, row.number, leftEndCol);
  worksheet.mergeCells(row.number, rightStartCol, row.number, rightEndCol);

  // Căn giữa & in đậm
  row.getCell(leftStartCol).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(rightStartCol).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  row.getCell(leftStartCol).font = { bold: true };
  row.getCell(rightStartCol).font = { bold: true };

  // Row 3: (Trái - Phải)
  row = worksheet.addRow([]);
  row.getCell(leftStartCol).value = "Số:          /TB-HVM";
  row.getCell(rightStartCol).value = "Hà Nội, ngày        tháng        năm           ";
  worksheet.mergeCells(row.number, leftStartCol, row.number, leftEndCol);
  worksheet.mergeCells(row.number, rightStartCol, row.number, rightEndCol);
  row.getCell(leftStartCol).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(rightStartCol).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  // Row 4: dòng trống
  row = worksheet.addRow([]);
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);

  // ========================
  // PHẦN THÔNG BÁO
  // ========================

  // Row 5: THÔNG BÁO
  row = worksheet.addRow([]);
  row.getCell(1).value = "THÔNG BÁO".toUpperCase();
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { bold: true };

  // Row 6: Số tiết quy chuẩn...
  row = worksheet.addRow([]);
  const dotValue = renderData[0]?.Dot || renderData[0]?.dot || "";
  const kiHoc = renderData[0]?.KiHoc || renderData[0]?.Ki || "";
  const namHoc = renderData[0]?.NamHoc || renderData[0]?.Nam || "";
  row.getCell(
    1
  ).value = `Số tiết quy chuẩn các lớp học phần thuộc đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc}`;
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { bold: true };

  // Row 7: (Cơ sở đào tạo phía Bắc)
  row = worksheet.addRow([]);
  row.getCell(1).value = "(Cơ sở đào tạo phía Bắc)";
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { name: "Times New Roman", italic: true };

  // ========================
  // PHẦN CÁC "CĂN CỨ..."
  // ========================
  const canCuuList = [
    "           Căn cứ Thông tư số 20/2020/TT-BGDĐT ngày 27 tháng 7 năm 2020 của Bộ trưởng Bộ Giáo dục và đào tạo ban hành Quy định chế độ làm việc của giảng viên cơ sở giáo dục đại học;",
    "           Căn cứ Quyết định số 1409/QĐ-HVM ngày 30 tháng 12 năm 2021 của Giám đốc Học viện Kỹ thuật mật mã ban hành Quy định chế độ làm việc đối với giảng viên Học viện Kỹ thuật mật mã;",
    `           Căn cứ Thời khóa biểu đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc};`,
    `           Căn cứ kết quả đăng ký các học phần của học viên, sinh viên thuộc đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc};`,
    "           Căn cứ Đề nghị thay đổi giảng viên các lớp học phần của các Khoa.",
    `           Học viện Kỹ thuật mật mã thông báo số tiết quy chuẩn các lớp học phần thuộc đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc} (Cơ sở đào tạo phía Bắc) như sau:`,
  ];

  const rowsWithFixedHeight = [0, 1]; // Các dòng x3 chiều cao

  canCuuList.forEach((text, index) => {
    let r = worksheet.addRow([]);
    r.getCell(1).value = text;
    worksheet.mergeCells(r.number, 1, r.number, totalColumns);
    r.getCell(1).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };
    if (rowsWithFixedHeight.includes(index)) {
      r.height = 45;
    }
  });

  // Thêm 1 row trống trước khi vào bảng
  worksheet.addRow([]);

  // ========================
  // PHẦN HEADER BẢNG
  // ========================
  // Thêm header bảng
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.font = { bold: true };
  });
  // Lưu lại dòng bắt đầu của vùng bảng
  const tableStart = headerRow.number;

  // ========================
  // XỬ LÝ DỮ LIỆU: NHÓM THEO KHOA
  // ========================
  let sttCounter = 1;
  const groupedData = renderData.reduce((acc, item) => {
    const department = item.Khoa || "Khac";
    if (!acc[department]) acc[department] = [];
    const rowData = orderedKeys.map((key) => {
      if (key === "STT") {
        return `${sttCounter++}`;
      } else if (key === "NgayBatDau" || key === "NgayKetThuc") {
        // Format ngày tháng
        return item[key] ? formatDate(item[key]) : "";
      } else if (key === "MoiGiang") {
        // Chuyển đổi 0/1 thành Có/Không
        return item[key] === 1 ? "Có" : "Không";
      } else if (key === "SoSinhVien" || key === "LL") {
        // Xử lý NULL: nếu NULL hoặc undefined thì set thành 0
        const value = item[key];
        return (value === null || value === undefined || value === "") ? 0 : value;
      } else {
        // Bỏ qua Dot, KiHoc, NamHoc vì đã hiển thị ở text ghi chú
        return item[key] || "";
      }
    });
    acc[department].push(rowData);
    return acc;
  }, {});

  // Hàm chuyển số sang La Mã
  const toRoman = (num) => {
    const romanNumerals = [
      ["M", 1000],
      ["CM", 900],
      ["D", 500],
      ["CD", 400],
      ["C", 100],
      ["XC", 90],
      ["L", 50],
      ["XL", 40],
      ["X", 10],
      ["IX", 9],
      ["V", 5],
      ["IV", 4],
      ["I", 1],
    ];
    let roman = "";
    for (const [letter, value] of romanNumerals) {
      while (num >= value) {
        roman += letter;
        num -= value;
      }
    }
    return roman;
  };

  let romanCounter = 1;
  for (const [department, rowsData] of Object.entries(groupedData)) {
    const roman = toRoman(romanCounter++);
    const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
    let dividerRow = worksheet.addRow([dividerText]);
    worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, totalColumns);
    dividerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    dividerRow.font = { bold: true };

    // Thêm viền cho toàn bộ hàng
    for (let col = 1; col <= totalColumns; col++) {
      dividerRow.getCell(col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }

    // Thêm data rows
    rowsData.forEach((rData) => {
      worksheet.addRow(rData);
    });

    // Row trống sau mỗi nhóm
    // worksheet.addRow([]);
  }

  worksheet.addRow([]);

  // Lưu lại dòng kết thúc của vùng bảng (trước phần thông báo cuối)
  const tableEnd = worksheet.lastRow.number;

  // ========================
  // PHẦN ROW CUỐI: THÔNG BÁO KẾT
  // ========================
  row = worksheet.addRow([]);
  row.getCell(1).value =
    "        Nhận được Thông báo này các cơ quan, đơn vị có liên quan chủ động triển khai thực hiện./.";
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "left",
    vertical: "top",
    wrapText: true,
  };

  row = worksheet.addRow([]); // Dòng trống
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);

  // ==============
  // PHẦN NƠI NHẬN & CHỮ KÝ
  // ==============

  // 1) Dòng "Nơi nhận" (bên trái) & "KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC" (bên phải)
  row = worksheet.addRow([]);
  row.getCell(2).value = "Nơi nhận:";
  worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
  row.getCell(2).alignment = {
    horizontal: "left",
    vertical: "top",
    wrapText: true,
  };
  row.getCell(2).font = { bold: true };

  // Bên phải
  row.getCell(7).value = "KT. GIÁM ĐỐC\nPHÓ GIÁM ĐỐC";
  worksheet.mergeCells(row.number, 7, row.number, totalColumns); // G->K
  row.getCell(7).alignment = {
    horizontal: "center",
    vertical: "top",
    wrapText: true,
  };
  row.getCell(7).font = { bold: true };

  // 2) Các dòng gạch đầu dòng bên trái
  const bulletLines = [
    "- Ban Giám đốc (2) (để b/c)",
    "- Phòng KH-TC;",
    "- Các khoa: NM, ATTT, CNTT, ĐTVT,",
    "  TTTH, CB, LLCT, KQS&QĐ...;",
    "- Lưu: VT, ĐT P13.",
  ];
  bulletLines.forEach((text) => {
    row = worksheet.addRow([]);
    // Bên trái
    row.getCell(2).value = text;
    worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
    row.getCell(2).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };

    // Bên phải để trống, vẫn merge để không bị border
    worksheet.mergeCells(row.number, 7, row.number, totalColumns);
  });

  // 3) Thêm một vài dòng trống (tùy chỉnh) để tạo khoảng cho chữ ký
  for (let i = 0; i < 2; i++) {
    row = worksheet.addRow([]);
    worksheet.mergeCells(row.number, 1, row.number, 6);
    worksheet.mergeCells(row.number, 7, row.number, totalColumns);
  }

  // ========================
  // ĐỊNH DẠNG CHUNG (border, font, wrapText)
  // ========================
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (rowNumber >= tableStart && rowNumber <= tableEnd) {
        // Vùng bảng: áp dụng border và căn giữa theo vertical
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
        cell.alignment = {
          horizontal: cell.alignment?.horizontal || "left",
          vertical: "middle",
          wrapText: true,
        };
      } else {
        // Vùng ngoài bảng: không viền, chỉ thêm wrapText: true
        cell.border = undefined;
        cell.alignment = {
          horizontal: cell.alignment?.horizontal || "left",
          vertical: "top",
          wrapText: true,
        };
      }
      cell.font = {
        name: "Times New Roman",
        size: 13,
        bold: cell.font?.bold || false,
      };
    });
  });

  // ========================
  // ĐỘ RỘNG CỘT
  // ========================
  // Định nghĩa độ rộng cho từng cột (theo thứ tự trong orderedKeys, đã bỏ Dot, KiHoc, NamHoc)
  const columnWidths = {
    STT: 6,                    // Số thứ tự - nhỏ
    LopHocPhan: 20,            // Lớp học phần - rộng
    SoTinChi: 8,               // Số TC - nhỏ
    TenLop: 12,                // Mã lớp - trung bình
    he_dao_tao: 12,            // Hệ đào tạo - trung bình
    GiaoVien: 25,              // Giảng viên theo TKB - rất rộng
    GiaoVienGiangDay: 25,      // Giảng viên giảng dạy - rất rộng
    MoiGiang: 10,              // Mời giảng? - trung bình
    NgayBatDau: 12,            // Ngày bắt đầu - trung bình
    NgayKetThuc: 12,           // Ngày kết thúc - trung bình
    LL: 8,                     // Số tiết LL - giảm từ 10 xuống 8
    SoSinhVien: 8,             // Số SV - nhỏ
    HeSoLopDong: 10,           // Hệ số lớp đông - giảm từ 12 xuống 10
    HeSoT7CN: 12,              // Hệ số ngoài giờ - giảm từ 15 xuống 12
    QuyChuan: 10,              // Số tiết QC - giảm từ 12 xuống 10
    GhiChu: 15,                // Ghi chú - giảm từ 20 xuống 15
  };

  // Áp dụng độ rộng cho từng cột
  for (let i = 1; i <= totalColumns; i++) {
    const keyIndex = i - 1;
    const key = orderedKeys[keyIndex];
    if (columnWidths[key]) {
      worksheet.getColumn(i).width = columnWidths[key];
    } else {
      // Nếu không có trong map, đặt mặc định
      worksheet.getColumn(i).width = 12;
    }
  }

  // ========================
  // GHI FILE VÀ TRẢ VỀ CLIENT
  // ========================
  const fileName = `file_quy_chuan_chinh_thuc_hoc_ki_${kiHoc}_nam_hoc_${namHoc}.xlsx`;
  const filePath = path.join("./uploads", fileName);

  await workbook.xlsx.writeFile(filePath);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Lỗi khi gửi file:", err);
      return res.status(500).send("Không thể tải file");
    }
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error("Lỗi khi xóa file:", unlinkErr);
      } else {
        console.log("File đã được xóa thành công sau khi gửi.");
      }
    });
  });
};

const exportToExcel_HDDK = async (req, res) => {
  try {
    const { renderData } = req.body;

    if (!renderData || renderData.length === 0) {
      return res.status(400).send("Dữ liệu trống, không thể xuất file Excel");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1", {
      pageSetup: { orientation: "landscape" },
    });

    // Ánh xạ tên cột theo yêu cầu
    const headerMapping = {
      TongTiet: "Số tiết",
      TongSoTiet: "Tổng số tiết",
      NgayBatDau: "Ngày kí HĐ",
      NgayKetThuc: "Ngày thanh lí HĐ",
      GioiTinh: "Danh xưng",
      GiangVien: "Họ tên",
      NgaySinh: "Ngày sinh",
      CCCD: "CCCD",
      NgayCapCCCD: "Ngày cấp CCCD",
      HocVi: "Học vị",
      ChucVu: "Chức vụ",
      DienThoai: "Điện thoại",
      Email: "Email",
      STK: "Số TK",
      NganHang: "Ngân hàng",
      MaSoThue: "Mã số thuế",
      DiaChi: "Địa chỉ",
      NoiCongTac: "Nơi công tác",
      MonGiangDayChinh: "Bộ môn",
    };

    // Tạo danh sách header từ các key của headerMapping
    const headers = Object.keys(headerMapping);

    // Tính toán độ rộng tự động cho từng cột dựa trên header và nội dung
    const rawWidths = headers.map((key) => {
      let maxLen = headerMapping[key].length;
      renderData.forEach((row) => {
        // Nếu là ngày thì chuyển đổi sang chuỗi dạng dd/mm/yyyy để tính độ dài
        let cellValue;
        if ((key === "NgayBatDau" || key === "NgayKetThuc") && row[key]) {
          const date = new Date(row[key]);
          cellValue = `${date.getDate().toString().padStart(2, "0")}/${(
            date.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}/${date.getFullYear()}`;
        } else {
          cellValue =
            row[key] !== null && row[key] !== undefined
              ? row[key].toString()
              : "";
        }
        if (cellValue.length > maxLen) {
          maxLen = cellValue.length;
        }
      });
      return maxLen;
    });

    const totalRawWidth = rawWidths.reduce((sum, w) => sum + w, 0);
    const scale = totalRawWidth > 0 ? 500 / totalRawWidth : 1;

    worksheet.columns = headers.map((key, index) => ({
      header: headerMapping[key],
      key: key,
      width: Math.round(rawWidths[index] * scale * 100) / 100,
    }));

    // Thiết lập style cho dòng header: font Times New Roman, in đậm, màu nền #007bff và màu chữ trắng
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.font = {
        bold: true,
      };
    });

    // Chuyển đổi giá trị của ngày thành Date object và định dạng danh xưng
    const formattedData = renderData.map((row) => {
      const formattedRow = { ...row };
      if (row.NgayBatDau) {
        formattedRow.NgayBatDau = formatDate(row.NgayBatDau);
      }
      if (row.NgayKetThuc) {
        formattedRow.NgayKetThuc = formatDate(row.NgayKetThuc);
      }
      if (row.NgaySinh) {
        formattedRow.NgaySinh = formatDate(row.NgaySinh);
      }
      if (row.NgayCapCCCD) {
        formattedRow.NgayCapCCCD = formatDate(row.NgayCapCCCD);
      }
      formattedRow.GioiTinh = row.GioiTinh === "Nam" ? "Ông" : "Bà";
      return formattedRow;
    });

    // Thêm dữ liệu vào sheet
    formattedData.forEach((data) => {
      worksheet.addRow(data);
    });

    // Căn chỉnh cho tất cả các cell
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        };
      });
    });

    // Định dạng cột ngày: NgayBatDau và NgayKetThuc theo định dạng "dd/mm/yyyy"
    if (worksheet.getColumn("NgayBatDau")) {
      worksheet.getColumn("NgayBatDau").numFmt = "dd/mm/yyyy";
    }
    if (worksheet.getColumn("NgayKetThuc")) {
      worksheet.getColumn("NgayKetThuc").numFmt = "dd/mm/yyyy";
    }

    // Đặt tên file dựa trên dữ liệu mẫu (lưu ý: KiHoc và NamHoc phải có trong renderData[0])
    const fileName = `thong_tin_hop_dong_du_kien_ki_${renderData[0].KiHoc}_nam_hoc_${renderData[0].NamHoc}.xlsx`;
    const filePath = path.join("./uploads", fileName);

    // Ghi file Excel ra file hệ thống
    await workbook.xlsx.writeFile(filePath);

    // Gửi file về client và sau đó xóa file khỏi hệ thống
    res.download(filePath, fileName, async (err) => {
      if (err) {
        console.error("Lỗi khi gửi file:", err);
        return res.status(500).send("Không thể tải file");
      }
      try {
        await fs.promises.unlink(filePath);
        console.log("File đã được xóa thành công sau khi gửi.");
      } catch (unlinkErr) {
        console.error("Lỗi khi xóa file:", unlinkErr);
      }
    });
  } catch (error) {
    console.error("Lỗi khi xuất file Excel:", error);
    res.status(500).send("Lỗi khi xuất file Excel");
  }
};

const editStudentQuanity = async (req, res) => {
  const data = req.body; // Nhận dữ liệu từ body
  // console.log("Dữ liệu nhận để cập nhật:", data); // In ra để kiểm tra

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection;

  try {
    connection = await createPoolConnection(); // Tạo kết nối từ pool

    // Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu không hợp lệ hoặc rỗng." });
    }

    // Xây dựng phần CASE trong câu lệnh UPDATE
    let updateCaseStatements = {
      SoSinhVien: [],
      HeSoLopDong: [],
      QuyChuan: [],
    };
    let updateValues = [];
    let idsToUpdate = [];

    data.forEach((item) => {
      const { ID, StudentQuantityUpdate, StudentQuantity, HeSoT7CN, LL } = item; // Lấy HeSoNgoaiGio từ item

      // Kiểm tra nếu ID, StudentQuantityUpdate và StudentQuantity tồn tại
      if (
        !ID ||
        StudentQuantityUpdate === undefined ||
        StudentQuantity === undefined
      ) {
        throw new Error(
          `Thiếu ID, StudentQuantityUpdate hoặc StudentQuantity cho bản ghi: ${JSON.stringify(
            item
          )}`
        );
      }

      // Sử dụng Regular Expression để trích xuất số từ ID
      const regex = /-(\d+)-/; // Biểu thức chính quy để tìm số giữa 2 dấu gạch nối
      const match = ID.match(regex);

      if (!match) {
        throw new Error(`Không thể trích xuất số ID từ: ${ID}`);
      }

      const numericID = match[1]; // Lấy phần số từ kết quả regex

      if (!numericID) {
        throw new Error(`Không thể trích xuất số ID từ: ${ID}`);
      }

      // Đồng bộ tất cả về định dạng số, nếu rỗng thì trở thành 0
      const studentQuantityUpdate =
        StudentQuantityUpdate === "" ? 0 : parseInt(StudentQuantityUpdate, 10);
      const studentQuantity =
        StudentQuantity === "" ? 0 : parseInt(StudentQuantity, 10);

      // Kiểm tra xem StudentQuantityUpdate có khác StudentQuantity không
      if (studentQuantity !== studentQuantityUpdate) {
        console.log(
          "Update ID: " +
          ID +
          " số sinh viên cũ : " +
          studentQuantity +
          " số sinh viên mới : " +
          studentQuantityUpdate
        );

        // Nếu StudentQuantityUpdate không hợp lệ (NaN), gán giá trị là 0
        if (isNaN(studentQuantityUpdate)) {
          throw new Error(
            `Số lượng sinh viên không hợp lệ: ${StudentQuantityUpdate}`
          );
        }

        // Gọi hàm quy đổi hệ số
        const { HeSoLopDong } = quyDoiHeSo(item); // Giả sử hàm quyDoiHeSo đã được định nghĩa trước đó

        // Tính QuyChuan
        const QuyChuan = Number(LL) * Number(HeSoLopDong) * Number(HeSoT7CN); // Nếu HeSoNgoaiGio là null, mặc định lấy giá trị 1

        console.log(QuyChuan);

        // Cập nhật các giá trị cần thay đổi
        updateCaseStatements.SoSinhVien.push(`WHEN ID = ? THEN ?`);
        updateValues.push(numericID, studentQuantityUpdate);

        updateCaseStatements.HeSoLopDong.push(`WHEN ID = ? THEN ?`);
        updateValues.push(numericID, HeSoLopDong);

        updateCaseStatements.QuyChuan.push(`WHEN ID = ? THEN ?`);
        updateValues.push(numericID, QuyChuan);

        idsToUpdate.push(numericID); // Thêm ID vào mảng idsToUpdate
      }
    });

    // Nếu không có bản ghi nào cần cập nhật, trả về thông báo
    if (updateCaseStatements.SoSinhVien.length === 0) {
      return res.json({
        success: false,
        message: "Không có lớp nào cập nhật số sinh viên",
      });
    }

    // Nếu chỉ có một ID trong mảng idsToUpdate, biến nó thành mảng để truyền vào IN
    const idsToUpdateParam =
      idsToUpdate.length === 1 ? [idsToUpdate[0]] : idsToUpdate;

    // Xây dựng câu lệnh UPDATE
    const updateQuery = `
            UPDATE ?? 
            SET 
                SoSinhVien = CASE ${updateCaseStatements.SoSinhVien.join(
      " "
    )} ELSE SoSinhVien END,
                HeSoLopDong = CASE ${updateCaseStatements.HeSoLopDong.join(
      " "
    )} ELSE HeSoLopDong END,
                QuyChuan = CASE ${updateCaseStatements.QuyChuan.join(
      " "
    )} ELSE QuyChuan END
            WHERE ID IN (?);
        `;

    // Thực thi câu lệnh UPDATE
    await connection.query(updateQuery, [
      tableTam,
      ...updateValues,
      idsToUpdateParam,
    ]);

    res.json({
      success: true,
      message: "Cập nhật số lượng sinh viên, hệ số và QuyChuan thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật số lượng sinh viên:", error);
    res.status(500).json({
      success: false,
      message: `Đã xảy ra lỗi khi cập nhật dữ liệu: ${error.message}`,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối về pool
  }
};

// Xuất các hàm để sử dụng
module.exports = {
  getTableTam,
  deleteTableTam,
  updateTableTam,
  updateRow,
  deleteRow,
  addNewRow,
  exportToWord,
  exportToExcel,
  editStudentQuanity,
  exportToExcel_HDDK,
  exportToExcelQC,
  resetPublishStatusTKB,
};
```

## File: src/controllers/importController.js
```javascript
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
const fsp = fs.promises;

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

// Reverse mapping từ titleMap (tiếng Việt -> key database) để map dữ liệu từ file Excel xuất ra
const reverseTitleMap = {
  "STT": "STT", // Bỏ qua khi import
  "Số TC": "Số TC",
  "Lớp học phần": "Lớp học phần",
  "Giảng viên theo TKB": "Giáo Viên",
  "Ngày bắt đầu": "Ngày bắt đầu",
  "Ngày kết thúc": "Ngày kết thúc",
  "Số tiết lên lớp": "Số tiết lên lớp được tính QC",
  "Số SV": "Số SV",
  "Số tiết theo CTĐT": "Số tiết theo CTĐT",
  "Hệ số lớp đông": "Hệ số lớp đông",
  "Hệ số lên lớp ngoài giờ": "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
  "QC": "QC",
  "Hệ đào tạo": "Hệ đào tạo",
  "Ghi chú": "Ghi chú",
};

async function convertExcelToJSON(optsOrPath) {
  const opts = (typeof optsOrPath === 'string')
    ? { filePath: optsOrPath }
    : (optsOrPath || {});
  const { buffer, filePath } = opts;

  try {
    let workbook;
    let absToRead;

    if (buffer && buffer.length) {
      // Đọc từ buffer (memoryStorage)
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } else if (filePath) {
      // Chuẩn hóa path tuyệt đối
      const absGiven = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      absToRead = absGiven;

      // Nếu không tồn tại, thử biến thể /src/uploads/ (Linux) hoặc \src\uploads\ (Windows)
      try {
        await fsp.access(absToRead, fs.constants.R_OK);
      } catch {
        const alt = absGiven.replace(
          new RegExp(`\\${path.sep}uploads\\${path.sep}`),
          `${path.sep}src${path.sep}uploads${path.sep}`
        );
        await fsp.access(alt, fs.constants.R_OK);
        absToRead = alt;
      }

      workbook = XLSX.readFile(absToRead);
    } else {
      throw new Error('No buffer or filePath provided');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows.length) throw new Error('File Excel rỗng!');

    const headerRowIndex = rows.findIndex((row) => String(row?.[0] ?? '').trim() === 'STT');
    if (headerRowIndex === -1) {
      throw new Error('Không tìm thấy dòng tiêu đề chứa STT, Số TC, Lớp học phần.');
    }

    const header = rows[headerRowIndex];
    const totalColumns = header.length;
    const dataRows = rows.slice(headerRowIndex + 1);

    const jsonObjects = [];
    const specialSubstring = 'Các học phần thuộc Khoa';
    let currentKhoa = '';

    dataRows.forEach((row, i) => {
      const actualRowIndex = headerRowIndex + 1 + i;
      const merged = (typeof isRowMerged === 'function')
        ? isRowMerged(sheet, actualRowIndex, totalColumns)
        : false;

      if (merged) {
        const cellValue = (row?.[0] ?? '').toString();
        const match = cellValue.match(/Khoa\s*(\S+)/i);
        if (match?.[1]) currentKhoa = match[1].trim();
        return;
      }

      const obj = {};
      header.forEach((colName, idx) => {
        const cleanKey = String(colName ?? '').replace(/[\r\n]+/g, '').trim();
        let value = row?.[idx] ?? '';
        if (typeof value === 'string') value = value.replace(/[\r\n]+/g, '').trim();

        // Map từ tên cột tiếng Việt sang key database (nếu có trong reverseTitleMap)
        const mappedKey = reverseTitleMap[cleanKey] || cleanKey;

        // Bỏ qua cột STT khi import
        if (mappedKey !== 'STT') {
          obj[mappedKey] = value;
        }
      });

      obj['Khoa'] = String(currentKhoa ?? '').replace(/[\r\n]+/g, '');

      const emptyCount = Object.values(obj).reduce(
        (acc, v) => acc + (v === '' || v == null ? 1 : 0), 0
      );

      const containsSpecial =
        Object.keys(obj).some((k) => k.includes(specialSubstring)) ||
        Object.values(obj).some((v) => typeof v === 'string' && v.includes(specialSubstring));

      if (emptyCount > 6 && !containsSpecial) return;

      jsonObjects.push(obj);
    });

    // ✅ Xoá file sau khi xử lý (chỉ khi có filePath)
    if (absToRead) {
      fsp.unlink(absToRead).catch(() => { });
    }

    return jsonObjects;
  } catch (err) {
    throw new Error('Cannot read file!: ' + (err?.message || String(err)));
  }
}

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
  if (typeof chuoi !== "string" || chuoi.trim() === "") {
    return {
      TenLop: "",
      HocKi: null,
      NamHoc: null,
      Lop: "",
    };
  }

  // Lấy thông tin học kỳ và năm học (cho phép khoảng trắng trước dấu '('
  const infoMatch = chuoi.match(/-(\d+)-(\d+)\s*\(/);
  const HocKi = infoMatch ? infoMatch[1] : null;
  const namHoc2 = infoMatch ? infoMatch[2] : null;
  const NamHoc = namHoc2 ? "20" + namHoc2 : null;

  // Lấy mã lớp từ dấu ngoặc đầu tiên
  const lopMatch = chuoi.match(/\(\s*([^()]+?)\s*\)/);
  const Lop = lopMatch ? lopMatch[1].trim() : "";

  // Xây dựng TenLop: loại bỏ phần '-HocKi-NamHoc(MaLop)', sau đó xóa cặp ngoặc chứa mã lớp, rồi loại bỏ dấu '-'
  let temp = chuoi.replace(/-\d+-\d+\s*\([^()]+\)/, "");
  if (Lop) {
    const lopRegex = new RegExp(`\\(\\s*${Lop}\\s*\\)`);
    temp = temp.replace(lopRegex, "");
  }
  const TenLop = temp.replace(/\s*-\s*/g, " ").trim();

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

const formatDateValue = (dateValue) => {
  if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
    return null;
  }

  let date = null;

  // Nếu đã là Date object
  if (dateValue instanceof Date) {
    date = new Date(dateValue);
  }
  // Nếu là string, thử parse
  else if (typeof dateValue === 'string') {
    // Format dd/mm/yyyy
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
      if (isNaN(date.getTime())) {
        date = null;
      }
    }

    // Nếu chưa parse được, thử parse ISO format hoặc các format khác
    if (!date) {
      date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        date = null;
      }
    }
  }

  // Nếu không parse được date hợp lệ
  if (!date) {
    return null;
  }

  // Kiểm tra và điều chỉnh nếu rơi vào cuối tuần
  const dayOfWeek = date.getDay(); // 0 = Chủ nhật, 6 = Thứ 7

  if (dayOfWeek === 0) {
    // Chủ nhật -> lùi 2 ngày về Thứ 6
    date.setDate(date.getDate() - 2);

  } else if (dayOfWeek === 6) {
    // Thứ 7 -> lùi 1 ngày về Thứ 6
    date.setDate(date.getDate() - 1);
  }

  return date;
};

const importTableQC = async (jsonData, req) => {
  const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"

  const dataGiangVien = await tongHopDuLieuGiangVien(jsonData);
  // console.log(dataGiangVien);
  // Tạo kết nối và thực hiện truy vấn chèn hàng loạt
  const connection = await createPoolConnection();

  // 1. Tải bảng cấu hình ký tự bắt đầu để đối chiếu hệ đào tạo & đối tượng
  const prefixQuery = `
    SELECT 
      k.viet_tat,
      k.doi_tuong,
      h.he_dao_tao AS ten_he_dao_tao
    FROM kitubatdau k
    LEFT JOIN he_dao_tao h ON CAST(k.gia_tri_so_sanh AS UNSIGNED) = h.id;
  `;
  const [configs] = await connection.query(prefixQuery);
  const mappingMap = new Map();
  for (const config of configs) {
    if (config.viet_tat) {
      mappingMap.set(config.viet_tat.toUpperCase().trim(), {
        doi_tuong: config.doi_tuong,
        he_dao_tao: config.ten_he_dao_tao
      });
    }
  }

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
    NgayBatDau,
    NgayKetThuc,
    he_dao_tao,
    DoiTuong,
    isHdChinh
  ) VALUES ?;`; // Dấu '?' cho phép chèn nhiều giá trị một lần

  // Mảng để lưu tất cả giá trị cần chèn
  const allValues = [];

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

    // Lấy hệ đào tạo từ dữ liệu gốc
    let he_dao_tao = item["he_dao_tao"] || item["Hệ đào tạo"] || null;
    let doi_tuong = "Việt Nam"; // Mặc định là "Việt Nam"

    // Trích xuất tiền tố của Lop để map
    const matchPrefix = String(Lop || "").trim().match(/^[A-Za-z]+/);
    const prefix = matchPrefix ? matchPrefix[0].toUpperCase().trim() : "";

    if (mappingMap.has(prefix)) {
      const matchConfig = mappingMap.get(prefix);
      doi_tuong = matchConfig.doi_tuong || doi_tuong;
      if (!he_dao_tao) {
        he_dao_tao = matchConfig.he_dao_tao || null;
      }
    }

    // Lấy ngày bắt đầu và ngày kết thúc từ dữ liệu (hỗ trợ nhiều format key)
    const ngayBatDau = item["NgayBatDau"] || item["Ngày bắt đầu"] || null;
    const ngayKetThuc = item["NgayKetThuc"] || item["Ngày kết thúc"] || null;

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
      formatDateValue(ngayBatDau),
      formatDateValue(ngayKetThuc),
      he_dao_tao,
      doi_tuong,
      1,
    ]);
  });

  let results = false;
  try {
    // Thực hiện chèn tất cả giá trị cùng lúc
    const [insertResult] = await connection.query(queryInsert, [allValues]);
    results = true;

    // Thực hiện cập nhật sau khi chèn
    const queryUpdate = `UPDATE ${tableName} SET MaHocPhan = CONCAT(Khoa, id);`;
    await connection.execute(queryUpdate);

    // Ghi log việc ban hành quy chuẩn thành công
    if (req && req.session) {
      try {
        const logQuery = `
          INSERT INTO lichsunhaplieu 
          (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;

        const userId = req.session?.userInfo?.ID || req.session?.userId || 0;
        const tenNhanVien = req.session?.userInfo?.TenNhanVien || req.session?.TenNhanVien || req.session?.username || 'Unknown User';
        const khoa = req.session?.userInfo?.MaPhongBan || req.session?.MaPhongBan || 'Unknown Department';
        const loaiThongTin = "Ban hành bảng tạm";

        // Lấy thông tin từ dữ liệu đầu tiên nếu có
        const dot = jsonData[0]?.Dot || "";
        const ki = jsonData[0]?.Ki || "";
        const nam = jsonData[0]?.Nam || "";

        const changeMessage = `${tenNhanVien} đã ban hành ${insertResult.affectedRows} môn học từ bảng tạm vào quy chuẩn chính thức. Kì ${ki}, đợt ${dot}, năm học ${nam}.`;

        await connection.query(logQuery, [
          userId,
          tenNhanVien,
          khoa,
          loaiThongTin,
          changeMessage,
        ]);

        console.log("Đã ghi log ban hành thành công");
      } catch (logError) {
        console.error("Lỗi khi ghi log ban hành:", logError);
      }
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      // Trích xuất tên lớp học phần bị trùng từ sqlMessage
      let duplicateCourseName = "";
      let dupValue = "";
      if (error.sqlMessage) {
        const match = error.sqlMessage.match(/Duplicate entry '(.*?)' for key/i);
        if (match && match[1]) {
          dupValue = match[1];
          const dupString = match[1];
          // Tìm trong jsonData xem LopHocPhan nào khớp
          for (const item of jsonData) {
            const lopHocPhan = item["LopHocPhan"] || item["Lớp học phần"] || "";
            if (lopHocPhan && dupString.includes(lopHocPhan)) {
              duplicateCourseName = lopHocPhan;
              break;
            }
          }
        }
      }
      const dupMsg = duplicateCourseName
        ? ` (Tại lớp học phần: ${duplicateCourseName})`
        : "";
      
      const messageDetail = `Dữ liệu bị trùng lặp trong bảng quy chuẩn${dupMsg}. Giá trị bị trùng: "${dupValue}". Vui lòng chỉnh sửa lại: Trong cùng một đợt, kì, năm thì tên lớp (bao gồm Tên học phần + tên lớp) phải khác nhau.`;
      
      console.error("======================================");
      console.error("🚨 [LỖI TRÙNG DỮ LIỆU BAN HÀNH] 🚨");
      console.error("Nguyên nhân: Bản ghi đang ban hành đã bị trùng khóa duy nhất trong database.");
      console.error("Chi tiết từ MySQL:", error.sqlMessage || error.message);
      console.error("Lớp dự đoán bị lỗi:", duplicateCourseName || "Không thể map từ JSON");
      console.error("Giá trị SQL nhận được:", dupValue || "Không rõ");
      console.error("======================================");

      const err = new Error(messageDetail);
      err.code = "ER_DUP_ENTRY";
      throw err;
    }
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

// hàm này chuẩn hóa tiêu đề trong file quy chuẩn word và Excel
const normalizeKeys = (data) => {
  const keyMap = {
    "Giáo viên": "Giáo Viên", // Chuẩn hóa các biến thể
    "Giáo Viên": "Giáo Viên", // Nếu tên trường là "Giáo Viên" thì chuẩn hóa thành "Giáo Viên"
    "Giao Vien": "Giáo Viên", // Nếu tên trường là "Giao Vien" thì chuẩn hóa thành "Giáo Viên"
    "giáo Viên": "Giáo Viên",
    "Giảng viên theo TKB": "Giáo Viên", // Map từ file Excel xuất ra
    "Số TC": "Số TC", // Các trường khác không thay đổi
    "Số SV": "Số SV",
    "Số tiết lên lớp giờ HC": "Số tiết lên lớp giờ HC",
    "Số tiết lên lớp": "Số tiết lên lớp được tính QC", // Map từ file Excel xuất ra
    "Hệ số lên lớp ngoài giờ": "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ", // Map từ file Excel xuất ra
    "Ngày bắt đầu": "Ngày bắt đầu", // Map từ file Excel xuất ra
    "Ngày kết thúc": "Ngày kết thúc", // Map từ file Excel xuất ra
    "Hệ đào tạo": "Hệ đào tạo", // Map từ file Excel xuất ra
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
      NgayBatDau,
      NgayKetThuc,
      SoTietCTDT, 
      SoSinhVien, 
      LL, 
      HeSoT7CN, 
      HeSoLopDong, 
      QuyChuan,
      he_dao_tao,
      GhiChu 
    ) VALUES ?
  `;

  // Hàm format ngày từ string sang Date object hoặc null
  const formatDateValue = (dateValue) => {
    if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
      return null;
    }

    // Nếu đã là Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // Nếu là string, thử parse
    if (typeof dateValue === 'string') {
      // Format dd/mm/yyyy
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Thử parse ISO format hoặc các format khác
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  };

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
      item["Giáo Viên"] || item["Giảng viên theo TKB"] || null,
      formatDateValue(item["Ngày bắt đầu"]),
      formatDateValue(item["Ngày kết thúc"]),
      item["Số tiết theo CTĐT"] || 0,
      item["Số SV"] || 0,
      item["Số tiết lên lớp được tính QC"] || item["Số tiết lên lớp"] || 0,
      item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] ||
      item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"] ||
      item["Hệ số lên lớp ngoài giờ"] ||
      0,
      item["Hệ số lớp đông"] || 0,
      item["QC"] || 0,
      item["Hệ đào tạo"] || null,
      item["Ghi chú"] || null,
    ]);

  // Kiểm tra nếu không có đối tượng hợp lệ
  if (values.length === 0) {
    console.log("Không có dữ liệu hợp lệ để thêm vào cơ sở dữ liệu.");
    return { success: false, message: "Không có dữ liệu hợp lệ để thêm vào cơ sở dữ liệu." }; // Nếu không có đối tượng hợp lệ, dừng lại
  }

  const connection = await createPoolConnection(); // Lấy kết nối từ pool
  try {
    // Thực hiện truy vấn với nhiều giá trị
    await connection.query(query, [values]);
    console.log("Thêm file quy chuẩn vào bảng Tam thành công");
    return { success: true };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      const dupMatch = err.message.match(/Duplicate entry '(.+)' for key '(.+)'/);
      const dupValue = dupMatch ? dupMatch[1] : "không xác định";
      const dupKey = dupMatch ? dupMatch[2] : "unknown_key";

      const ki = values[0] ? values[0][2] : "";
      const dot = values[0] ? values[0][1] : "";
      const nam = values[0] ? values[0][3] : "";

      return {
        success: false,
        message: `Dữ liệu bị trùng lặp trong bảng tạm. Giá trị "${dupValue}" trùng với khóa unique ("${dupKey}") trong kỳ ${ki}, đợt ${dot}, năm học ${nam}. Vui lòng kiểm tra lại file Excel.`,
        errorCode: "DUPLICATE_ENTRY",
      };
    }
    console.error("Lỗi:", err.message || err);
    return { success: false, message: "Lưu dữ liệu thất bại!" };
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

      // Lấy thông tin user từ session để ghi log
      const userId = req.session.userId || req.session.userInfo?.ID || 0;
      const tenNhanVien = req.session.TenNhanVien || req.session.username || 'Unknown User';
      const maPhongBan = req.session.MaPhongBan || 'Unknown Department';

      // Lấy tên phòng ban thực tế từ database
      let tenPhongBan = maPhongBan;
      try {
        const [phongBanInfo] = await connection.query(
          "SELECT TenPhongBan FROM phongban WHERE MaPhongBan = ?",
          [maPhongBan]
        );
        if (phongBanInfo.length > 0) {
          tenPhongBan = phongBanInfo[0].TenPhongBan;
        }
      } catch (error) {
        console.log("Không lấy được tên phòng ban:", error);
      }

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
          connection.query(queryUpdate, values, async (err, results) => {
            if (err) {
              console.error("Error:", err);
              reject(err);
              return;
            }

            // Ghi log cho việc duyệt nếu có thay đổi duyệt
            if (results.affectedRows > 0) {
              try {
                let logContent = [];
                if (KhoaDuyet === 1) {
                  logContent.push(`${tenPhongBan} thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
                }
                if (DaoTaoDuyet === 1) {
                  logContent.push(`Đào tạo thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
                }
                if (TaiChinhDuyet === 1) {
                  logContent.push(`Tài chính thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
                }

                if (logContent.length > 0) {
                  await connection.query(
                    "INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, ?, NOW())",
                    [
                      userId,
                      tenNhanVien,
                      maPhongBan,
                      "Thay đổi thông tin giảng dạy",
                      logContent.join(". ")
                    ]
                  );
                }
              } catch (logError) {
                console.error("Lỗi ghi log:", logError);
              }
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

  // Lấy ID người dùng và tên người dùng từ session
  const userId = req.session.userId || req.session.userInfo?.ID || 0;
  const tenNhanVien = req.session.TenNhanVien || req.session.username || 'Unknown User';

  console.log("User ID:", userId);
  console.log("User Name:", tenNhanVien);

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Import utility function để ghi log
    const { logQuyChuanChanges } = require("../utils/logChanges");

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
          } else {
            // Nếu chỉ có 1 giảng viên
            if (!gvmListSet.has(GiaoVienGiangDay.trim())) {
              error_gv_rows.push(
                `${LopHocPhan} (${TenLop}) - Giảng viên mời không hợp lệ: ${GiaoVienGiangDay}`
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
        LopHocPhan,
        TenLop,
      });
    }

    // Lấy dữ liệu cũ trước khi cập nhật để ghi log
    const oldDataMap = {};
    if (updateIDs.length > 0) {
      const selectQuery = `
        SELECT * FROM quychuan
        WHERE ID IN (${updateIDs.join(", ")})
      `;
      const [oldDataRows] = await connection.query(selectQuery);

      // Tạo map từ ID đến dữ liệu cũ
      for (const row of oldDataRows) {
        oldDataMap[row.ID] = row;
      }
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

      // Lấy dữ liệu mới sau khi cập nhật và ghi log thay đổi
      const [updatedRows] = await connection.query(`
        SELECT * FROM quychuan
        WHERE ID IN (${updateIDs.join(", ")})
      `);

      // Ghi log cho từng dòng dữ liệu đã cập nhật
      for (const updatedRow of updatedRows) {
        const oldData = oldDataMap[updatedRow.ID];
        if (oldData) {
          // Gọi hàm ghi log thay đổi từ utils/logChanges.js
          await logQuyChuanChanges(
            connection,
            oldData,
            updatedRow,
            req
          );
        }
      }
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

  // Lấy ID người dùng và tên người dùng từ session
  const userId = req.session.userId || req.session.userInfo?.ID || 0;
  const tenNhanVien = req.session.TenNhanVien || req.session.username || 'Unknown User';

  console.log("User ID:", userId);
  console.log("User Name:", tenNhanVien);

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

    // Import utility function để ghi log
    const { logQuyChuanChanges } = require("../utils/logChanges");

    // Lấy dữ liệu cũ TRƯỚC khi cập nhật
    const [oldDataRows] = await connection.query(
      "SELECT * FROM quychuan WHERE ID = ?",
      [ID]
    );

    const oldData = oldDataRows[0];

    // Nếu không tìm thấy dữ liệu cũ, trả về lỗi
    if (!oldData) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy giảng viên với ID này!" });
    }

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
      // Lấy dữ liệu mới SAU khi cập nhật
      const [newDataRows] = await connection.query(
        "SELECT * FROM quychuan WHERE ID = ?",
        [ID]
      );

      const newData = newDataRows[0];

      // Ghi log thay đổi
      await logQuyChuanChanges(
        connection,
        oldData,
        newData,
        req
      );

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

    // Lấy thông tin user từ session để ghi log
    const userId = req.session.userId || req.session.userInfo?.ID || 0;
    const tenNhanVien = req.session.TenNhanVien || req.session.username || 'Unknown User';
    const maPhongBan = req.session.MaPhongBan || 'Unknown Department';

    // Lấy tên phòng ban thực tế từ database
    let tenPhongBan = maPhongBan;
    try {
      const [phongBanInfo] = await connection.query(
        "SELECT TenPhongBan FROM phongban WHERE MaPhongBan = ?",
        [maPhongBan]
      );
      if (phongBanInfo.length > 0) {
        tenPhongBan = phongBanInfo[0].TenPhongBan;
      }
    } catch (error) {
      console.log("Không lấy được tên phòng ban:", error);
    }

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      batches.push(jsonData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {

      // Lấy dữ liệu cũ trước khi cập nhật để ghi log
      const ids = batch.map(item => item.ID);
      const [oldDataRows] = await connection.query(
        `SELECT ID, LopHocPhan, TenLop, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet FROM ${tableName} WHERE ID IN (${ids.map(() => "?").join(", ")})`,
        ids
      );

      // Tạo map từ ID đến dữ liệu cũ
      const oldDataMap = {};
      for (const row of oldDataRows) {
        oldDataMap[row.ID] = row;
      }

      let updateQuery = `
        UPDATE ${tableName}
        SET 
          KhoaDuyet = CASE
      `;

      const updateValues = [];

      batch.forEach((item) => {
        const { ID, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet } = item;
        updateQuery += ` WHEN ID = ? THEN ?`;
        updateValues.push(ID, KhoaDuyet);
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

      // Ghi log cho từng item trong batch - so sánh với dữ liệu cũ
      for (const item of batch) {
        const { ID, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet } = item;
        const oldData = oldDataMap[ID];

        if (oldData) {
          const { LopHocPhan, TenLop } = oldData;
          let logContent = [];

          // Ghi log cho Khoa duyệt
          if (Number(oldData.KhoaDuyet) !== Number(KhoaDuyet)) {
            if (Number(KhoaDuyet) === 1) {
              logContent.push(`${tenPhongBan} thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
            } else {
              logContent.push(`${tenPhongBan} thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Hủy duyệt`);
            }
          }

          // Ghi log cho Đào tạo duyệt
          if (Number(oldData.DaoTaoDuyet) !== Number(DaoTaoDuyet)) {
            if (Number(DaoTaoDuyet) === 1) {
              logContent.push(`Đào tạo thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
            } else {
              logContent.push(`Đào tạo thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Hủy duyệt`);
            }
          }

          // Ghi log cho Tài chính duyệt  
          if (Number(oldData.TaiChinhDuyet) !== Number(TaiChinhDuyet)) {
            if (Number(TaiChinhDuyet) === 1) {
              logContent.push(`Tài chính thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
            } else {
              logContent.push(`Tài chính thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Hủy duyệt`);
            }
          }

          if (logContent.length > 0) {
            await connection.query(
              "INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, ?, NOW())",
              [
                userId,
                tenNhanVien,
                maPhongBan,
                "Thay đổi thông tin giảng dạy",
                logContent.join(". ")
              ]
            );
          }
        }
      }
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

const { DON_GIA_EXPR } = require('../queries/hopdongQueries');

const saveDataGvmDongHocPhi = async (req, res, daDuyetHetArray) => {
  const { dot, ki, namHoc } = req.body;

  // Lưu hệ đóng học phí

  // Lưu hệ mật mã
  const query2 = `
    SELECT
        qc.Khoa, qc.he_dao_tao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gv.id_Gvm, gv.DienThoai, gv.Email, gv.MaSoThue, gv.HoTen, gv.NgaySinh,
        gv.HocVi, gv.ChucVu, gv.HSL, gv.CCCD, gv.NgayCapCCCD, gv.NoiCapCCCD,
        gv.DiaChi, gv.STK, gv.NganHang, gv.MaPhongBan, gv.GioiTinh, gv.NoiCongTac, gv.MonGiangDayChinh AS MaBoMon,
        SUM(qc.QuyChuan) AS TongSoTiet,
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc,
        ${DON_GIA_EXPR('qc', 'Khoa')} AS DonGia
    FROM
        quychuan qc
    JOIN
        gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
    WHERE
        qc.DaLuu = 0 AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? 
        AND qc.MoiGiang = 1 AND gv.isQuanDoi != 1 AND qc.he_dao_tao in (select id from he_dao_tao where cap_do = 1)
    GROUP BY
        qc.Khoa, qc.he_dao_tao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gv.id_Gvm, gv.DienThoai, gv.Email, gv.MaSoThue, gv.HoTen, gv.NgaySinh,
        gv.HocVi, gv.ChucVu, gv.HSL, gv.CCCD, gv.NgayCapCCCD, gv.NoiCapCCCD,
        gv.DiaChi, gv.STK, gv.NganHang, gv.MaPhongBan, gv.GioiTinh, gv.NoiCongTac, gv.MonGiangDayChinh;
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
            DonGia,
          } = item;

          req.session.tmp++;

          const DanhXung = getDanhXung(GioiTinh);
          // const getDanhXung = (GioiTinh) => {
          //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
          // };
          let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
          let SoTien = (TongSoTiet || 0) * DonGia; // Tính toán số tiền

          let TruThue = 0;
          if (SoTien > 2000000) {
            TruThue = Math.round(SoTien * 0.1); // Giả định thuế suất 10%
          }
          const ThucNhan = SoTien - TruThue;

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
            ThucNhan,
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
        DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue, ThucNhan,
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
        } else {
          // Nếu không tìm thấy giảng viên trong danh sách, có thể ghi log hoặc xử lý theo cách khác
          console.warn(`Không tìm thấy giảng viên: ${tenGiangVien}`);
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
    gv.id_Gvm, gv.DienThoai, gv.Email, gv.MaSoThue, gv.HoTen, gv.NgaySinh,
    gv.HocVi, gv.ChucVu, gv.HSL, gv.CCCD, gv.NgayCapCCCD, gv.NoiCapCCCD,
    gv.DiaChi, gv.STK, gv.NganHang, gv.MaPhongBan, gv.GioiTinh, gv.NoiCongTac, gv.MonGiangDayChinh AS MaBoMon,
    SUM(
        ROUND(
            CASE 
                WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN qc.QuyChuan * 0.7
                ELSE qc.QuyChuan * 1
            END, 2)
    ) AS TongSoTiet,
    MIN(qc.NgayBatDau) AS NgayBatDau,
    MAX(qc.NgayKetThuc) AS NgayKetThuc,
    ${DON_GIA_EXPR('qc', 'Khoa')} AS DonGia
FROM
    quychuan qc
JOIN
    gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',' , -1)) = gv.HoTen
WHERE
    qc.DaLuu = 0 AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.MoiGiang = 1
    AND gv.isQuanDoi != 1
    AND qc.he_dao_tao in (select id from he_dao_tao where cap_do > 1)  
GROUP BY
    qc.Khoa, qc.he_dao_tao, qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
    gv.id_Gvm, gv.DienThoai, gv.Email, gv.MaSoThue, gv.HoTen, gv.NgaySinh,
    gv.HocVi, gv.ChucVu, gv.HSL, gv.CCCD, gv.NgayCapCCCD, gv.NoiCapCCCD,
    gv.DiaChi, gv.STK, gv.NganHang, gv.MaPhongBan, gv.GioiTinh, gv.NoiCongTac, gv.MonGiangDayChinh;
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
            DonGia,
          } = item;

          req.session.tmp++;

          const DanhXung = getDanhXung(GioiTinh);
          // const getDanhXung = (GioiTinh) => {
          //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
          // };
          let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
          let SoTien = (TongSoTiet || 0) * DonGia; // Tính toán số tiền
          let TruThue = 0; // Giả định không thu thuế

          if (SoTien > 2000000) {
            TruThue = SoTien * 0.1; // Giả định không thu thuế
          }
          let ThucNhan = SoTien - TruThue;

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
            ThucNhan,
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
        DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue, ThucNhan,
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
      const updateQuery = `UPDATE quychuan SET DaLuu = ? WHERE Dot = ? and KiHoc = ? and NamHoc = ? AND Khoa IN (${placeholders});`;
      await pool.query(updateQuery, [
        DaLuu,
        dot,
        ki,
        namHoc,
        ...daDuyetHetArray,
      ]);
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

const unsaveAll = async (req, res) => {
  const { dot, ki, namHoc } = req.body;

  try {
    const updateQuery = `
      UPDATE quychuan
      SET TaiChinhDuyet = 0, daluu = 0
      WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?;
    `;

    const delGiangDayQuery = `
      DELETE FROM giangday
      WHERE Dot = ? AND HocKy = ? AND NamHoc = ?;
    `;

    const delHopDongQuery = `
      DELETE FROM hopdonggvmoi
      WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?;
    `;

    await pool.query(updateQuery, [dot, ki, namHoc]);
    await pool.query(delGiangDayQuery, [dot, ki, namHoc]);
    await pool.query(delHopDongQuery, [dot, ki, namHoc]);

    return res.status(200).json({ success: true, message: "Bỏ lưu thành công." });

  } catch (error) {
    console.error("Lỗi khi bỏ duyệt mời giảng:", error);
    return res.status(500).json({ error: "Đã xảy ra lỗi khi bỏ duyệt." });
  }
}

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
  unsaveAll,

  // Debug endpoint để kiểm tra session
  checkSession: (req, res) => {
    console.log("Full Session Info:", req.session);
    return res.json({
      sessionInfo: req.session,
      userInfo: req.session?.userInfo || "No userInfo in session",
      userId: req.session?.userInfo?.ID || "No ID in userInfo",
      userName:
        req.session?.userInfo?.TenNhanVien || "No TenNhanVien in userInfo",
    });
  },
};
```

## File: src/controllers/TKBImportController.js
```javascript
const XLSX = require("xlsx");
const pool = require("../config/Pool");

const tkbServices = require("../services/tkbServices");

function getFirstParenthesesContent(str) {
  const match = str.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractPrefix(str) {
  const match = str.match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

function getHeDaoTao(classType, heDaoTaoArr) {
  const prefix = extractPrefix(classType);

  const found = heDaoTaoArr.find(
    r => r.viet_tat.toUpperCase().trim() === prefix.toUpperCase().trim()
  );

  if (!found) {
    return {
      he_dao_tao: "1",
      bonus_time: 1
    };
  }

  return {
    he_dao_tao: found.gia_tri_so_sanh,
    bonus_time: found.he_so
  };
}

/**
 * Tự động tìm dòng header trong Excel sheet
 * @param {Object} sheet - XLSX sheet object
 * @returns {number} Index của dòng header (0-indexed)
 */
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const requiredColumns = ['TT', 'Số TC', 'Lớp học phần', 'Giáo Viên'];

  // Chỉ tìm trong 10 dòng đầu tiên
  for (let row = 0; row <= Math.min(range.e.r, 10); row++) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: row
    })[0] || [];

    const rowText = rowData.map(cell => (cell || '').toString().trim());

    // Kiểm tra có chứa ít nhất 3/4 cột bắt buộc
    const matchCount = requiredColumns.filter(col =>
      rowText.some(cell => cell.includes(col))
    ).length;

    if (matchCount >= 3) {
      console.log(`✅ Tìm thấy header tại dòng ${row + 1} (Sheet: ${sheet['!ref']})`);
      return row;
    }
  }

  console.warn('⚠️ Không tìm thấy header, sử dụng mặc định dòng 4');
  return 3; // Mặc định dòng 4 (0-indexed = 3)
}

const importExcelTKB = async (req, res) => {
  const semester = JSON.parse(req.body.semester);
  let lastTTValue = JSON.parse(req.body.lastTTValue);
  const location = (req.body.location || "hvktmm").trim().toLowerCase(); // Mặc định là hvktmm, normalize

  const { dot, ki, nam } = semester;

  if (!req.file) {
    return res.status(400).json({ message: "Vui lòng chọn file Excel." });
  }

  try {
    // Lấy các dữ liệu cần thiết trước khi xử lý file để chỉ query 1 lần
    // Lấy bảng hệ số lớp đông
    const bonusRules = await tkbServices.getBonusRules();

    // Lấy bảng hệ đào tạo
    const kiTuBatDauArr = await tkbServices.getHeDaoTaoList();

    // Lấy danh sách hệ đào tạo và cấp độ

    // Lấy bảng kí tự bắt đầu của khoa
    const majorMap = await tkbServices.getMajorPrefixMap();

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: false,
      raw: false,
      cellText: true,
    });

    //const workbook = XLSX.read(req.file.buffer, { type: "buffer" }, { cellDates: true });

    let allData = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      // 🔥 Tự động phát hiện dòng header
      const headerRowIndex = findHeaderRow(sheet);
      const dataStartIndex = headerRowIndex + 1;

      // Lấy hàng tiêu đề động
      const headerRow = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: headerRowIndex,
      })[0] || [];

      const validHeaders = headerRow.map((h) => (h || "").toString().trim());

      // Đọc dữ liệu từ dòng sau header, luôn đọc TEXT
      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: validHeaders,
        range: dataStartIndex,
        defval: "",
        raw: false,          // GIỮ TEXT, KHÔNG CHO LẤY SERIAL
        cellText: true,      // LUÔN LẤY `.w` thay vì `.v`
      });

      // Buộc lấy `.w` cho mọi cell vì sheet_to_json đôi khi trộn .v
      const range = XLSX.utils.decode_range(sheet["!ref"]);

      rawRows.forEach((row, rowIndex) => {
        // Tính số dòng thực tế dựa trên vị trí header động
        let realRowNumber = dataStartIndex + rowIndex + 1;  // +1 vì 1-indexed trong Excel
        for (let col = 0; col < validHeaders.length; col++) {
          const colLetter = XLSX.utils.encode_col(col);
          const cellAddress = `${colLetter}${realRowNumber}`;
          const cell = sheet[cellAddress];

          if (cell && cell.w !== undefined) {
            row[validHeaders[col]] = cell.w; // luôn gán TEXT
          }
        }

        row.sheet_name = sheetName;
      });

      allData = allData.concat(rawRows);
    });

    if (allData.length === 0) {
      return res.status(400).json({ message: "File Excel không có dữ liệu." });
    }

    // 1. Định nghĩa danh sách các cột ĐƯỢC PHÉP kế thừa dữ liệu từ dòng trên
    const columnsToMerge = [
      "TT",
      "Mã HP",
      "Số TC",
      "Lớp học phần",
      "Giáo Viên",
      "Số SV",
      "ST/ tuần",
      // "Ngày BĐ",
      // "Ngày KT"
    ];

    // 2. Chỉ loop và fill dữ liệu cho các cột trong danh sách trên
    for (let i = 1; i < allData.length; i++) {
      for (const key of Object.keys(allData[i])) {
        // Chỉ copy nếu cột nằm trong danh sách cho phép (Allow List)
        if (columnsToMerge.includes(key) && (allData[i][key] === "" || allData[i][key] === undefined)) {
          allData[i][key] = allData[i - 1][key];
        }
      }
    }

    // Map tên cột từ tiếng Việt sang key tiếng Anh
    const renameMap = {
      "TT": "tt",
      "Mã HP": "course_code",
      "Số TC": "credit_hours",
      "LL": "ll_total",
      "Số SV": "student_quantity",
      "HS lớp đông": "student_bonus",
      "Ngoài giờ HC": "bonus_time",
      "LL thực": "ll_code_actual",
      "Lớp học phần": "course_name",
      "Hình thức học": "study_format",
      "ST/ tuần": "periods_per_week",
      "Thứ": "day_of_week",
      "Tiết học": "period_range",
      "Phòng học": "classroom",
      "Ngày BĐ": "start_date",
      "Ngày KT": "end_date",
      "Giáo Viên": "lecturer",
    };

    // Đặt lại theo tên các trường dữ liệu trong database
    const renamedData = allData.map((row, index) => {
      const newRow = {};
      for (const [oldKey, newKey] of Object.entries(renameMap)) {
        newRow[newKey] = row[oldKey] ?? "";
      }
      newRow.sheet_name = row.sheet_name;

      // 1. Áp dụng masterConvert ngay lập tức cho ngày tháng
      // Kết quả: "YYYY-MM-DD" hoặc null
      newRow.start_date = masterConvert(newRow.start_date);
      newRow.end_date = masterConvert(newRow.end_date);

      // Phân loại Khoa theo địa điểm
      if (location === "phhv") {
        // Nếu là Phân hiệu học viện, tất cả row có major = "ĐTPH"
        newRow.major = "ĐTPH";
      } else {
        // Nếu là Học viện Kỹ thuật mật mã (hvktmm), map theo course_code
        const courseCode = (newRow.course_code || "").trim().toUpperCase();
        const firstChar = courseCode.charAt(0);

        newRow.major = majorMap[firstChar] || "unknown";
      }

      // Debug log cho row đầu tiên
      if (index === 0) {
        console.log(`📍 Row 0 - Location: "${location}", Course Code: "${newRow.course_code}", Major: "${newRow.major}"`);
      }

      return newRow;
    });

    // Tính tổng tiết cho mỗi lớp học phần
    const tongTietMap = {};
    for (const row of renamedData) {

      // Kiểm tra period_range phải là string
      if (
        typeof row.period_range !== "string" ||
        !row.period_range.includes("->")
      ) {
        continue;
      }

      const [startTiet, endTiet] = row.period_range.split("->").map(Number);
      if (isNaN(startTiet) || isNaN(endTiet)) continue;

      if (
        typeof row.start_date !== "string" ||
        typeof row.end_date !== "string"
      ) {
        continue;
      }

      const startDate = parseDateDDMMYY(row.start_date);
      const endDate = parseDateDDMMYY(row.end_date);
      if (!startDate || !endDate) continue;

      const tietBuoi = endTiet - startTiet + 1;
      const soTuan = Math.ceil(
        (endDate - startDate) / (7 * 24 * 60 * 60 * 1000)
      );
      const tongTiet = soTuan * tietBuoi;

      tongTietMap[row.course_name] =
        (tongTietMap[row.course_name] || 0) + tongTiet;
    }

    // ✅ Lưu tt đầu tiên TRƯỚC vòng loop để tính range chính xác
    const firstTTValue = lastTTValue + 1;

    let preTT = 0;
    let preCourseName = "";  // Thêm: Lưu course_name dòng trước
    // let preClassroom = "";   // Thêm: Lưu classroom dòng trước
    let ll_tmp = 0;

    for (let i = 0; i < renamedData.length; i++) {
      const row = renamedData[i];
      // Tìm hệ đào tạo của lớp học phần
      const classType = getFirstParenthesesContent(row.course_name) || "";

      const { he_dao_tao, bonus_time } = getHeDaoTao(classType, kiTuBatDauArr);

      row.he_dao_tao = he_dao_tao;
      row.bonus_time = bonus_time;

      // Thêm period_start, period_end, ll_total vào từng dòng
      let tmp = 0;
      // Ép về string nếu là số hoặc kiểu khác
      const range = (typeof row.period_range === "string")
        ? row.period_range
        : (row.period_range != null ? String(row.period_range) : null);

      if (range && range.includes("->")) {
        const [start, end] = range.split("->").map(Number);

        row.period_start = isNaN(start) ? null : start;
        row.period_end = isNaN(end) ? null : end;

        if (!isNaN(start) && start >= 13) {
          tmp++;
        }
      } else {
        row.period_start = null;
        row.period_end = null;
      }


      // Lấy giá trị thô
      const rawDay = row.day_of_week;

      // Ép sang chuỗi để xử lý text (trim, uppercase)
      const dayOfWeek = String(rawDay || "").trim().toUpperCase();
      if (dayOfWeek == "CN" || dayOfWeek == "7") {
        tmp++;
      }

      if (tmp > 0) {
        row.bonus_time = row.bonus_time * 1.5;
      }

      // Số tiết lên lớp theo Ngày bắt đầu, ngày kết thúc và tiết học
      //row.ll_total = tongTietMap[row.course_name] || 0;

      // Tính hệ số lớp đông dựa trên số lượng sinh viên
      row.student_bonus = tkbServices.calculateStudentBonus(
        parseInt(row.student_quantity) || 0,
        bonusRules
      );

      // Gán lại tt phục vụ tkb và phòng học
      if (i > 0) {
        // ✅ Kiểm tra 3 điều kiện để xác định "nhóm mới"
        const isTTChanged = row.tt !== preTT;
        const isCourseNameChanged = row.course_name !== preCourseName;
        // const isClassroomChanged = row.classroom !== preClassroom;

        if (isTTChanged || isCourseNameChanged) {
          // ⚡ NHÓM MỚI: Bất kỳ điều kiện nào thay đổi
          preTT = row.tt;
          preCourseName = row.course_name;
          // preClassroom = row.classroom;

          row.tt = ++lastTTValue;
          ll_tmp = row.ll_total || 0;
        } else {
          // ⚡ CÙNG NHÓM: Tất cả điều kiện giống nhau
          row.tt = lastTTValue;
        }
      } else {
        // ⚡ Dòng đầu tiên
        preTT = row.tt;
        preCourseName = row.course_name;
        // preClassroom = row.classroom;

        row.tt = ++lastTTValue;
        ll_tmp = row.ll_total || 0;
      }

      row.ll_total = ll_tmp;
      row.qc = row.ll_total * row.bonus_time * row.student_bonus;
    }

    // Chuẩn bị values để insert
    const values = renamedData.map((row) => [
      row.tt,
      row.course_code,
      row.credit_hours,
      row.student_quantity || 0,
      row.student_bonus || 0,
      row.bonus_time || 1, // Nếu không có giá trị thì mặc định là 1
      row.ll_code || 0,
      row.ll_total || 0,
      row.qc || 0,
      row.course_name,
      row.study_format,
      row.periods_per_week,
      row.day_of_week,
      row.period_start,
      row.period_end,
      row.classroom,
      row.start_date,
      row.end_date,
      row.lecturer,
      row.major,
      row.he_dao_tao,
      dot,
      ki,
      nam,
    ]);

    const ttMin = firstTTValue;
    const ttMax = lastTTValue;

    // Bắt đầu transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert vào room_timetable
      await connection.query(
        `INSERT INTO room_timetable (
      TT, course_code, credit_hours, student_quantity, student_bonus, bonus_time,
      ll_code, ll_total, qc, course_name, study_format, periods_per_week,
      day_of_week, period_start, period_end, classroom, start_date, end_date,
      lecturer, major, he_dao_tao, dot, ki_hoc, nam_hoc
    ) VALUES ?`,
        [values]
      );

      // Insert vào course_schedule_details
      await connection.query(
        `INSERT INTO course_schedule_details (
        course_name, credit_hours, ll_code, ll_total, classroom,
        course_code, major, study_format, lecturer, periods_per_week,
        period_start, period_end, day_of_week, start_date, end_date,
        student_quantity, student_bonus, bonus_time, bonus_teacher,
        bonus_total, qc, class_section, course_id, semester,
        description, da_luu, dot, ki_hoc, nam_hoc, note,
        he_dao_tao, class_type
    )
    SELECT
        MAX(course_name), MAX(credit_hours), MAX(ll_code), MAX(ll_total),MAX(classroom), 
        MAX(course_code), MAX(major), MAX(study_format), MAX(lecturer),MAX(periods_per_week), 
        MAX(period_start), MAX(period_end), MAX(day_of_week),MIN(start_date), MAX(end_date), 
        MAX(student_quantity), MAX(student_bonus),MAX(bonus_time), MAX(bonus_teacher), 
        MAX(bonus_total), MAX(qc),MAX(class_section), MAX(course_id), MAX(semester), 
        MAX(description),MAX(da_luu), dot, ki_hoc, nam_hoc, MAX(note), 
        MAX(he_dao_tao), MAX(class_type)
    FROM room_timetable
    WHERE tt BETWEEN ? AND ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ?
    GROUP BY tt, dot, ki_hoc, nam_hoc`,
        [ttMin, ttMax, dot, ki, nam]
      );

      await connection.commit();

    } catch (err) {
      await connection.rollback();

      // ✅ Bắt lỗi duplicate unique (bất kỳ bảng nào)
      // MySQL error code 1062 = Duplicate entry
      if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
        // VD: "Duplicate entry 'Toán cao cấp (ĐH)-1-1-2024' for key 'unique_course'"
        const dupMatch = err.message.match(/Duplicate entry '(.+)' for key '(.+)'/);
        const dupValue = dupMatch ? dupMatch[1] : "không xác định";
        const dupKey = dupMatch ? dupMatch[2] : "unknown_key";

        const entity = (err.sql && err.sql.includes("INSERT INTO room_timetable"))
          ? "room_timetable"
          : "course_schedule_details";

        return res.status(409).json({
          success: false,
          message: `Dữ liệu bị trùng lặp trong bảng ${entity}. Giá trị "${dupValue}" trùng với khóa unique ("${dupKey}") trong kỳ ${ki}, đợt ${dot}, năm học ${nam}. Vui lòng kiểm tra lại file Excel.`,
          errorCode: "DUPLICATE_ENTRY",
        });
      }

      throw err; // Ném lại các lỗi khác để catch bên ngoài xử lý
    } finally {
      connection.release();
    }

    // Ghi log việc import thời khóa biểu thành công
    try {
      const logQuery = `
        INSERT INTO lichsunhaplieu 
        (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
      const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
      const khoa = req.session?.MaPhongBan || 'Unknown Department';
      const loaiThongTin = 'Import thời khóa biểu';
      const changeMessage = `${tenNhanVien} đã thêm mới lịch học từ file thời khóa biểu vào cơ sở dữ liệu. Kỳ ${ki}, đợt ${dot}, năm học ${nam}.`;

      await pool.query(logQuery, [
        userId,
        tenNhanVien,
        khoa,
        loaiThongTin,
        changeMessage
      ]);
    } catch (logError) {
      console.error("Lỗi khi ghi log:", logError);
      // Không throw error để không ảnh hưởng đến việc import chính
    }

    // ✅ Thêm xử lý cập nhật trạng thái thẻ năm học (tương tự ban hành)
    try {
      // Đặt tất cả trạng thái về 0
      await pool.query(`UPDATE namhoc SET trangthai = ?`, [0]);
      await pool.query(`UPDATE ki SET trangthai = ?`, [0]);
      await pool.query(`UPDATE dot SET trangthai = ?`, [0]);

      // Chỉ kích hoạt năm/kỳ/đợt được chọn
      await pool.query(`UPDATE namhoc SET trangthai = ? WHERE NamHoc = ?`, [1, nam]);
      await pool.query(`UPDATE ki SET trangthai = ? WHERE value = ?`, [1, ki]);
      await pool.query(`UPDATE dot SET trangthai = ? WHERE value = ?`, [1, dot]);

      console.log(`Đã cập nhật trạng thái: Năm ${nam}, Kỳ ${ki}, Đợt ${dot}`);
    } catch (statusError) {
      console.error("⚠️ Lỗi cập nhật trạng thái thẻ năm học:", statusError);
      // Không throw error để không làm gián đoạn quy trình chính
    }

    res.status(200).json({
      success: true,
      message: "Đọc file và lưu thành công",
      data: {} // Nếu có dữ liệu kèm theo
    });
  } catch (err) {
    console.error("Lỗi khi xử lý file Excel:", err);
    res.status(500).json({ message: "Lỗi khi xử lý file Excel." });
  }
};

function parseDateDDMMYY(str) {

  if (!str) return null;

  const [day, month, year] = str.split("/").map(Number);

  const fullYear = year < 100 ? 2000 + year : year;

  return new Date(fullYear, month - 1, day);

}

function convertDateToMySQL(str) {
  if (!str) return null;

  // 1. Cắt chuỗi bằng regex để chấp nhận cả /, -, .
  const parts = String(str).trim().split(/[\/\-\.]/);

  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Xử lý năm tắt (vd: 25 -> 2025)
    if (year < 100) year += 2000;

    // 🔥 2. LOGIC CỨU DỮ LIỆU: Check ngược ngày/tháng
    // Nếu tháng > 12 mà ngày <= 12 -> Chắc chắn là bị ngược -> Đổi chỗ
    if (month > 12 && day <= 12) {
      console.warn(`⚠️ Đảo format ngày: ${str} -> ${month}/${day}/${year}`);
      [day, month] = [month, day]; // Swap
    }

    // 3. Kiểm tra ngày hợp lệ chặt chẽ (Chặn ngày 30/02 hoặc tháng 13)
    // Lưu ý: month trong new Date bắt đầu từ 0
    const dateObj = new Date(year, month - 1, day);

    // So sánh ngược lại xem JS có tự động nhảy ngày không
    if (
      dateObj.getFullYear() === year &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getDate() === day
    ) {
      // 4. Format chuẩn MySQL YYYY-MM-DD
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  console.error(`❌ Ngày sai định dạng, set NULL: ${str}`);
  return null; // Trả về null để MySQL lưu là NULL thay vì ngày sai
}

/**
 * Hàm 1: Chuyển đổi Serial Number của Excel (VD: 45667) sang Date
 */
function excelSerialToDate(serial) {
  // Excel tính mốc từ 30/12/1899. 
  // 25569 là số ngày từ 1900 đến 1970 (Unix epoch)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  // Lưu ý: Excel có bug tính dư 1 ngày nhuận năm 1900, 
  // nhưng với ngày tháng năm 2025 thì công thức này an toàn.
  return date_info;
}

/**
 * Hàm 2: Format Date Object chuẩn sang chuỗi MySQL YYYY-MM-DD
 */
function formatDateToMySQL(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 🔥 Hàm 3 (QUAN TRỌNG): Hàm tổng hợp xử lý mọi loại dữ liệu đầu vào
 */
function masterConvert(input) {
  if (input === null || input === undefined) return null;

  // TRƯỜNG HỢP A: Nếu Excel trả về Số (như ô O7 trong hình 1)
  if (typeof input === 'number') {
    console.log(`📍 Chuyển Serial Excel: ${input} sang Date`);
    const jsDate = excelSerialToDate(input);
    return formatDateToMySQL(jsDate);
  }

  // TRƯỜNG HỢP B: Nếu thư viện đọc file đã tự convert sang Date Object
  if (input instanceof Date) {
    console.log(`📍 Định dạng Date Object: ${input}`);
    return formatDateToMySQL(input);
  }

  // TRƯỜNG HỢP C: Nếu là Text (như ô O73 trong hình 2) -> Dùng lại hàm cũ của bạn
  if (typeof input === 'string') {
    // Gọi lại hàm convertDateToMySQL bạn đã viết ở câu trước
    // (Lưu ý: Đảm bảo hàm đó trả về string YYYY-MM-DD)
    return convertDateToMySQL(input);
  }

  return null;
}

module.exports = {
  importExcelTKB,
};
```

## File: src/controllers/TKBController.js
```javascript
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const tkbServices = require("../services/tkbServices");

const getImportTKBSite = async (req, res) => {
  res.render("tkb.themTKB.ejs");
};

const getTKBChinhThucSite = async (req, res) => {
  res.render("tkb.thoiKhoaBieuChinhThuc.ejs");
};

const getDataTKBChinhThuc = async (req, res) => {
  const { Khoa, Dot, Ki, Nam, HeDaoTao } = req.body;
  let connection;

  const baseSelect = `
    SELECT 
      id,
      course_id,
      course_name,
      major,
      lecturer,
      start_date,
      end_date,
      ll_total,
      student_quantity,
      student_bonus,
      bonus_time,
      qc,
      dot,
      ki_hoc,
      nam_hoc,
      note,
      he_dao_tao
    FROM course_schedule_details
  `;

  try {
    connection = await createPoolConnection();
    let query = "";
    let queryParams = [];

    if (Khoa === "ALL") {
      query = `${baseSelect} 
        WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?`;
      queryParams = [Dot, Ki, Nam];

    } else if (Khoa === "Khac") {
      const [khoaArray] = await connection.query(
        `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`
      );
      const khoaList = khoaArray.map(row => row.MaPhongBan);

      query = `${baseSelect} 
        WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?
          AND major NOT IN (${khoaList.map(() => "?").join(", ")})`;
      queryParams = [Dot, Ki, Nam, ...khoaList];

    } else {
      query = `${baseSelect} 
        WHERE major = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ?`;
      queryParams = [Khoa, Dot, Ki, Nam];
    }

    // Thêm filter hệ đào tạo nếu không phải ALL
    if (HeDaoTao && HeDaoTao !== "ALL") {
      query += ` AND he_dao_tao = ?`;
      queryParams.push(HeDaoTao);
    }

    const [results] = await connection.execute(query, queryParams);
    res.json(results);

  } catch (error) {
    console.error("Lỗi trong hàm getDataTKBChinhThuc:", error);
    res.status(500).json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release();
  }
};

const getHeDaoTaoTexts = async (oldHeDaoTaoId, newHeDaoTaoId) => {
  try {
    const [[oldRow]] = await pool.query(
      'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
      [oldHeDaoTaoId]
    );

    const [[newRow]] = await pool.query(
      'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
      [newHeDaoTaoId]
    );

    return {
      oldHeDaoTao: oldRow?.he_dao_tao || "",
      newHeDaoTao: newRow?.he_dao_tao || ""
    };
  } catch (error) {
    console.error("Lỗi getHeDaoTaoTexts:", error);
    return { oldHeDaoTao: "", newHeDaoTao: "" };
  }
};


const getBonusTimeForHeDaoTao = async (
  oldHeDaoTaoId,
  newHeDaoTaoId,
  bonus_time
) => {

  const { oldHeDaoTao, newHeDaoTao } =
    await getHeDaoTaoTexts(oldHeDaoTaoId, newHeDaoTaoId);

  let tmp = 1;

  // 🔹 Xác định hệ số ngoài giờ cũ
  if (oldHeDaoTao.includes("ĐH") && bonus_time == 1.5) {
    tmp = 1.5;
  }

  if (oldHeDaoTao.includes("CH") && bonus_time == 2.25) {
    tmp = 1.5;
  }

  if (oldHeDaoTao.includes("NCS") && bonus_time == 3) {
    tmp = 1.5;
  }

  // 🔹 Tính lại theo hệ đào tạo mới
  if (newHeDaoTao.includes("ĐH")) return 1 * tmp;
  if (newHeDaoTao.includes("CH")) return 1.5 * tmp;
  if (newHeDaoTao.includes("NCS")) return 2.0 * tmp;

  return bonus_time; // fallback
};


const updateRowTKB = async (req, res) => {
  let { id, field, value, oldValue, data } = req.body;

  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (field === "student_quantity") {
      let student_bonus = 0;

      // 🛠 Kiểm tra giá trị nhập vào có phải số không
      if (isNaN(value) || value < 0) {
        return res
          .status(400)
          .json({ message: "Số lượng sinh viên không hợp lệ." });
      }

      const bonusRules = await tkbServices.getBonusRules();

      student_bonus = tkbServices.calculateStudentBonus(value, bonusRules);

      const qc = student_bonus * data.bonus_time * data.ll_total;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET student_quantity = ?, student_bonus = ?, qc = ? 
        WHERE id = ?`;
      const updateValues = [value, student_bonus, qc, id];

      await connection.query(updateQuery, updateValues);
    } else if (field === "bonus_time") {
      value = parseFloat(value.replace(",", "."));

      if (isNaN(value) || value < 0) {
        return res.status(400).json({ message: "Hệ số ngoài giờ không hợp lệ" });
      }

      const qc = data.student_bonus * value * data.ll_total;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET bonus_time = ?, qc = ? 
        WHERE id = ?`;
      const updateValues = [value, qc, id];

      await connection.query(updateQuery, updateValues);
    } else if (field === "ll_total") {
      value = parseFloat(value.replace(",", "."));

      if (isNaN(value) || value < 0) {
        return res
          .status(400)
          .json({ message: "Số tiết lên lớp không hợp lệ" });
      }

      const qc = data.student_bonus * data.bonus_time * value;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET ll_total = ?, qc = ? 
        WHERE id = ?`;
      const updateValues = [value, qc, id];

      await connection.query(updateQuery, updateValues);
    } else if (field === "qc") {
      value = parseFloat(value.replace(",", "."));

      if (isNaN(value) || value < 0) {
        return res
          .status(400)
          .json({ message: "Số tiết quy chuẩn không hợp lệ" });
      }

      const updateQuery = `
        UPDATE course_schedule_details SET qc = ? 
        WHERE id = ?`;
      const updateValues = [value, id];

      await connection.query(updateQuery, updateValues);
    } else if (field === "he_dao_tao") {

      data.bonus_time = await getBonusTimeForHeDaoTao(oldValue, value, data.bonus_time);

      const qc = data.student_bonus * data.bonus_time * data.ll_total;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET he_dao_tao = ?, bonus_time = ?, qc = ? 
        WHERE id = ?`;
      const updateValues = [value, data.bonus_time, qc, id];

      await connection.query(updateQuery, updateValues);
    }
    else if (field === "note") {

      if (typeof value !== "string") {
        return res.status(400).json({ message: "Ghi chú không hợp lệ" });
      }

      const updateQuery = `
        UPDATE course_schedule_details 
        SET note = ?
        WHERE id = ?`;

      const updateValues = [value, id];

      await connection.query(updateQuery, updateValues);
    }
    else {
      if (field === "start_date" || field === "end_date") {
        value = formatDateForDB(value);
      }

      const updateQuery = `UPDATE course_schedule_details SET ${field} = ? WHERE id = ?`;
      const updateValues = [value, id];

      await connection.query(updateQuery, updateValues);
    }

    // 🛠 Lấy lại dữ liệu sau khi cập nhật
    const [updatedRow] = await connection.query(
      `SELECT
        id,
        course_id,
        course_name,
        major,
        lecturer,
        start_date,
        end_date,
        ll_code,
        ll_total,
        student_quantity,
        student_bonus,
        bonus_time,
        qc,
        dot,
        ki_hoc,
        nam_hoc,
        note,
        he_dao_tao
      FROM course_schedule_details 
        WHERE id = ?`,
      [id]
    );

    return res.json(updatedRow[0]); // ✅ Trả về toàn bộ dòng mới cập nhật
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      return res.status(409).json({ message: "Dữ liệu cập nhật bị trùng lặp với một bản ghi đã tồn tại trong bảng thời khóa biểu." });
    }
    console.error("Lỗi khi cập nhật dòng dữ liệu:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi cập nhật dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

function formatDateForDB(dateStr) {
  if (!dateStr) return null; // Trả về null nếu không có giá trị

  const parts = dateStr.split("/"); // Tách ngày, tháng, năm

  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0"); // Lấy ngày
    const month = parts[1].padStart(2, "0"); // Lấy tháng
    const year = parts[2]; // Lấy năm

    return `${year}-${month}-${day}`; // Trả về định dạng yyyy-mm-dd
  }

  return null; // Trả về null nếu sai định dạng
}

// hàm xóa 1 dòng
const deleteRow = async (req, res) => {
  const { id } = req.query; // Lấy ID từ URL

  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra xem id có hợp lệ không
    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    // Chuẩn bị truy vấn DELETE
    const deleteQuery = `DELETE FROM course_schedule_details WHERE id = ?`;

    // Thực thi truy vấn
    await connection.query(deleteQuery, [id]);

    // Trả về phản hồi thành công
    return res.json({ message: "Dòng dữ liệu đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa dòng dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const themTKBVaoQCDK = async (req, res) => {
  const { major, dot, ki_hoc, nam_hoc } = req.body;

  let connection,
    maPhongBanFalse = [],
    tkbData = [];

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Lấy dữ liệu bên bảng course_schedule_details
    let getDataTKBQuery = `
    SELECT
      id AS ID,
      major AS Khoa,
      ll_code AS SoTietCTDT,
      ll_total AS LL,
      student_quantity AS SoSinhVien,
      student_bonus AS HeSoLopDong,
      bonus_time AS HeSoT7CN,
      course_id AS MaBoMon,
      lecturer AS GiaoVien,
      credit_hours AS SoTinChi,
      course_name AS LopHocPhan,
      course_code AS MaHocPhan,
      start_date AS NgayBatDau,
      end_date AS NgayKetThuc,
      qc AS QuyChuan,
      he_dao_tao AS HeDaoTao
    FROM course_schedule_details
    WHERE dot = ? and ki_hoc = ? and nam_hoc = ? and da_luu = 0
  `;

    const getDataTKBParams = [dot, ki_hoc, nam_hoc];

    if (major !== "ALL") {
      getDataTKBQuery += " and major = ?";
      getDataTKBParams.push(major);
    }

    const [results] = await connection.query(getDataTKBQuery, getDataTKBParams);
    tkbData = results;

    // Nếu không có dữ liệu thì không cần insert
    if (tkbData.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Không có dữ liệu hợp lệ để chèn" });
    }

    let insertValues = [];

    if (major === "ALL") {
      // Nếu Khoa === "ALL", chỉ lấy MaBoMon thuộc các phòng ban hợp lệ
      const [MaPhongBanList] = await connection.query(
        `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`
      );

      const validMaPhongBanSet = new Set(
        MaPhongBanList.map((row) => row.MaPhongBan)
      );

      // Lọc dữ liệu hợp lệ & lưu các mã phòng ban không hợp lệ
      tkbData.forEach((row) => {
        if (validMaPhongBanSet.has(row.Khoa)) {
          insertValues.push([
            row.Khoa,
            dot,
            ki_hoc,
            nam_hoc,
            row.SoTietCTDT,
            row.LL,
            row.SoSinhVien,
            row.HeSoLopDong,
            row.HeSoT7CN,
            row.MaBoMon,
            row.GiaoVien,
            row.SoTinChi,
            row.LopHocPhan,
            row.MaHocPhan,
            row.NgayBatDau || null,
            row.NgayKetThuc || null,
            row.QuyChuan,
            row.HeDaoTao || null,
          ]);
        } else {
          maPhongBanFalse.push(row.ID);
        }
      });
    } else {
      // Chuyển dữ liệu về dạng mảng 2D cho MySQL
      insertValues = tkbData.map((row) => [
        row.Khoa, // major
        dot, // dot
        ki_hoc, // ki
        nam_hoc, // nam
        row.SoTietCTDT, // ll_code
        row.LL, // ll_total
        row.SoSinhVien, // student_quantity
        row.HeSoLopDong, // student_bonus
        row.HeSoT7CN, // bonus_time
        row.MaBoMon, // course_id
        row.GiaoVien, // lecturer
        row.SoTinChi, // credit_hours
        row.LopHocPhan, // course_name
        row.MaHocPhan, // course_code
        row.NgayBatDau || null, // start_date
        row.NgayKetThuc || null, // end_date
        row.QuyChuan, // bonus_total
        row.HeDaoTao || null, // he_dao_tao
      ]);
    }

    // Nếu không có dữ liệu hợp lệ sau khi lọc, dừng lại
    if (insertValues.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Không có dữ liệu hợp lệ để chèn" });
    }

    // Câu lệnh INSERT
    const insertQuery = `
      INSERT INTO tam (Khoa, dot, ki, nam, SoTietCTDT, LL, SoSinhVien, HeSoLopDong, HeSoT7CN, MaBoMon, 
      GiaoVien, SoTinChi, LopHocPhan, MaHocPhan, NgayBatDau, NgayKetThuc, QuyChuan, he_dao_tao) 
      VALUES ?
    `;

    // Thực hiện INSERT
    await connection.query(insertQuery, [insertValues]);

    // Cập nhật trường da_luu = 1 cho những dòng đã được lưu
    let updateQuery = `UPDATE course_schedule_details 
      SET da_luu = 1 
      WHERE dot = ? and ki_hoc = ? and nam_hoc = ?
    `;
    const updateValues = [dot, ki_hoc, nam_hoc];

    // Nếu lưu all
    if (major === "ALL") {

      // Nếu có khoa không trùng với csdl
      if (maPhongBanFalse.length != 0) {
        const idsToExclude = maPhongBanFalse.join(", ");
        updateQuery += ` AND id NOT IN (${idsToExclude})`;

        await connection.query(updateQuery, updateValues);

        return res.status(200).json({
          status: "warning",
          message: "Thêm dữ liệu thành công nhưng Những dòng không trùng khoa với CSDL sẽ không được chuyển",
        });

      }
    } else {
      updateQuery += " AND major = ?";
      updateValues.push(major);
    }

    await connection.query(updateQuery, updateValues);

    // // ✅ Thêm xử lý cập nhật trạng thái thẻ năm học (tương tự ban hành)
    // try {
    //   // Đặt tất cả trạng thái về 0
    //   await connection.query(`UPDATE namhoc SET trangthai = ?`, [0]);
    //   await connection.query(`UPDATE ki SET trangthai = ?`, [0]);
    //   await connection.query(`UPDATE dot SET trangthai = ?`, [0]);

    //   // Chỉ kích hoạt năm/kỳ/đợt được chọn
    //   await connection.query(`UPDATE namhoc SET trangthai = ? WHERE NamHoc = ?`, [1, nam_hoc]);
    //   await connection.query(`UPDATE ki SET trangthai = ? WHERE value = ?`, [1, ki_hoc]);
    //   await connection.query(`UPDATE dot SET trangthai = ? WHERE value = ?`, [1, dot]);

    //   console.log(`✅ Đã cập nhật trạng thái: Năm ${nam_hoc}, Kỳ ${ki_hoc}, Đợt ${dot}`);
    // } catch (statusError) {
    //   console.error("⚠️ Lỗi cập nhật trạng thái thẻ năm học:", statusError);
    //   // Không throw error để không làm gián đoạn quy trình chính
    // }

    return res.status(201).json({
      status: "success",
      message: "Thêm dữ liệu vào quy chuẩn dự kiến thành công"
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      const dupMatch = error.message.match(/Duplicate entry '(.+)' for key '(.+)'/);
      const dupValue = dupMatch ? dupMatch[1] : "không xác định";
      const dupKey = dupMatch ? dupMatch[2] : "unknown_key";

      return res.status(409).json({
        success: false,
        message: `Dữ liệu bị trùng lặp trong bảng tạm. Giá trị "${dupValue}" trùng với khóa unique ("${dupKey}"). Vui lòng kiểm tra lại.`,
        errorCode: "DUPLICATE_ENTRY",
      });
    }

    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({
      status: "error",
      message: "Có lỗi xảy ra khi cập nhật dữ liệu"
    });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const addNewRowTKB = async (req, res) => {
  const data = req.body;

  // Ghép các thông tin kỳ học từ frontend
  const dot = data.dot;
  const ki_hoc = data.ki_hoc;
  const nam_hoc = data.nam_hoc;

  data.course_name = `Môn học mới ${Date.now()}`; // Tên lớp học phần mặc định, có thể thay đổi sau


  try {
    // Tạo câu truy vấn INSERT
    const insertQuery = `
      INSERT INTO course_schedule_details 
      (course_name, course_code, student_quantity, student_bonus, lecturer, major, ll_total, 
       bonus_time, ll_code, start_date, end_date, he_dao_tao, dot, ki_hoc, nam_hoc, qc) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Giá trị cần chèn vào database
    const insertValues = [
      data.course_name || `Môn học mới ${Date.now()}`,
      data.course_code || "",
      data.student_quantity || 0,
      data.student_bonus || 0,
      data.lecturer || "",
      data.major,
      data.ll_total || 0,
      data.bonus_time || 1,
      data.ll_code || 0,
      data.start_date || null,
      data.end_date || null,
      data.he_dao_tao || "Đại học (Đóng học phí)",
      dot,
      ki_hoc,
      nam_hoc,
      0,
    ];

    // Thực hiện chèn dữ liệu vào database
    const [result] = await pool.query(insertQuery, insertValues);
    const newId = result.insertId; // Lấy ID của dòng vừa thêm

    // Trả về dữ liệu đầy đủ của dòng mới
    res.status(200).json({
      message: "Dòng đã được thêm thành công",
      data: { id: newId, ...req.body }, // Gửi lại dữ liệu đã thêm
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      return res.status(409).json({ error: "Lớp học phần bị trùng lặp với một bản ghi đã tồn tại." });
    }
    console.error("Lỗi thêm dữ liệu:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi thêm dữ liệu" });
  }
};

const deleteTKB = async (req, res) => {
  const { major, dot, ki_hoc, nam_hoc } = req.query;

  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    let sql =
      "DELETE FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ?";
    let params = [dot, ki_hoc, nam_hoc];

    if (major !== "ALL") {
      sql += " AND major = ?";
      params.push(major);
    }

    // Thực hiện xóa dữ liệu
    const [result] = await connection.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(200).json({ message: "Không có dữ liệu để xóa" });
    }

    res.status(200).json({ message: "Xóa thành công" });
  } catch (error) {
    console.error("Lỗi xóa dữ liệu:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi xóa dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Xuất file excel

const exportMultipleWorksheets = async (req, res) => {
  const { major, dot, ki_hoc, nam_hoc } = req.query;
  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Nếu `major = "ALL"`, lấy danh sách tất cả các ngành
    let majors = [major];
    if (major === "ALL") {
      const [majorRows] = await connection.query(
        "SELECT DISTINCT major FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ?",
        [dot, ki_hoc, nam_hoc]
      );
      majors = majorRows.map((row) => row.major);
    }

    // **📌 Tạo workbook**
    const wb = XLSX.utils.book_new();

    for (const m of majors) {
      // Truy vấn lấy dữ liệu theo từng major
      let query =
        `SELECT 
        id,
        credit_hours,
        course_name,
        lecturer,
        student_quantity,
        ll_total,
        bonus_time,
        student_bonus,
        start_date,
        end_date,
        he_dao_tao,
        qc 
        FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ? AND major = ?`;
      let params = [dot, ki_hoc, nam_hoc, m];

      const [rows] = await connection.query(query, params);
      if (rows.length === 0) continue; // Bỏ qua nếu không có dữ liệu

      // Định nghĩa tiêu đề cột
      const headers = [
        "STT",
        "Số TC",
        "Lớp học phần",
        "Giáo viên",
        //"Số tiết CTĐT",
        "Lên lớp",
        "Số SV",
        "Hệ số lớp đông",
        "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
        "Ngày BĐ",
        "Ngày KT",
        "Hệ đào tạo",
        "QC",
      ];

      // **📌 Dữ liệu Excel**
      const excelData = rows.map((item, index) => [
        index + 1, // STT
        item.credit_hours,
        item.course_name,
        item.lecturer,
        item.ll_total,
        item.student_quantity,
        item.student_bonus,
        item.bonus_time,
        formatDate(item.start_date),
        formatDate(item.end_date),
        item.he_dao_tao,
        item.qc,
      ]);

      // **📌 Tạo worksheet**
      const ws = XLSX.utils.aoa_to_sheet([
        [`BẢNG THỐNG KÊ KHỐI LƯỢNG GIẢNG DẠY - ${m}`], // Tiêu đề sheet
        [], // Dòng trống
        headers, // Dòng tiêu đề cột
        ...excelData, // Dữ liệu
      ]);

      // **📌 Căn giữa và làm đậm dòng tiêu đề**
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      ];
      ws["A1"].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center", vertical: "center" },
      };

      // **📌 Thêm sheet vào workbook**
      XLSX.utils.book_append_sheet(wb, ws, m);
    }

    // **📌 Lưu file Excel**
    const fileName = `TKB_${dot}_${ki_hoc}_${nam_hoc}.xlsx`;
    const filePath = path.join(__dirname, "../../uploads", fileName);
    XLSX.writeFile(wb, filePath);

    // **📌 Gửi file về client**
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Lỗi tải file:", err);
        res.status(500).json({ error: "Lỗi khi tải file" });
      }
      fs.unlinkSync(filePath); // Xóa file sau khi tải
    });
  } catch (error) {
    console.error("Lỗi xuất file Excel:", error);
    res.status(500).json({ error: "Lỗi server khi xuất file Excel" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const exportSingleWorksheets = async (req, res) => {
  const { major, dot, ki_hoc, nam_hoc } = req.query;
  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Nếu `major = "ALL"`, lấy danh sách tất cả các ngành
    let majors = [major];
    if (major === "ALL") {
      const [majorRows] = await connection.query(
        "SELECT DISTINCT major FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ?",
        [dot, ki_hoc, nam_hoc]
      );
      majors = majorRows.map((row) => row.major);
    }

    // **📌 Tiêu đề cột**
    const headers = [
      "STT",
      "Số TC",
      "Lớp học phần",
      "Giáo viên",
      //"Số tiết CTĐT",
      "Lên lớp",
      "Số SV",
      "Hệ số lớp đông",
      "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
      "Ngày BĐ",
      "Ngày KT",
      "Hệ đào tạo",
      "QC",
    ];

    // **📌 Tạo workbook và worksheet**
    const wb = XLSX.utils.book_new();
    let wsData = [["BẢNG THỐNG KÊ KHỐI LƯỢNG GIẢNG DẠY"], [], headers]; // Tiêu đề chính + dòng trống + tiêu đề cột

    let stt = 1; // Biến đếm STT tổng

    for (const m of majors) {
      // Truy vấn lấy dữ liệu theo từng major
      let query =
        `SELECT 
        id,
        credit_hours,
        student_quantity,
        course_name,
        lecturer,
        ll_total,
        bonus_time,
        student_bonus,
        start_date,
        end_date,
        he_dao_tao,
        qc
        FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ? AND major = ?`;
      let params = [dot, ki_hoc, nam_hoc, m];

      const [rows] = await connection.query(query, params);

      if (rows.length === 0) continue; // Bỏ qua nếu không có dữ liệu

      // **📌 Thêm dòng tiêu đề ngành**
      wsData.push([`Học phần thuộc khoa ${m}`]);

      // **📌 Thêm dữ liệu ngành**
      const excelData = rows.map((item) => [
        stt++, // STT liên tục
        item.credit_hours,
        item.course_name,
        item.lecturer,
        item.ll_total,
        item.student_quantity,
        item.student_bonus,
        item.bonus_time,
        formatDate(item.start_date),
        formatDate(item.end_date),
        item.he_dao_tao,
        item.qc,
      ]);

      wsData = [...wsData, ...excelData]; // Thêm dữ liệu và 1 dòng trống
    }

    // **📌 Tạo worksheet**
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // **📌 Căn giữa và làm đậm dòng tiêu đề**
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, // Merge tiêu đề chính
    ];
    ws["A1"].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "center", vertical: "center" },
    };

    // **📌 Lưu file Excel**
    const fileName = `TKB_${dot}_${ki_hoc}_${nam_hoc}.xlsx`;
    const filePath = path.join(__dirname, "../../uploads", fileName);
    XLSX.utils.book_append_sheet(wb, ws, "TKB");
    XLSX.writeFile(wb, filePath);

    // **📌 Gửi file về client**
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Lỗi tải file:", err);
        res.status(500).json({ error: "Lỗi khi tải file" });
      }
      fs.unlinkSync(filePath); // Xóa file sau khi tải
    });
  } catch (error) {
    console.error("Lỗi xuất file Excel:", error);
    res.status(500).json({ error: "Lỗi server khi xuất file Excel" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return date; // nếu không phải ngày hợp lệ thì trả raw

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}


const checkDataTKBExist = async (req, res) => {
  const { dot, ki, nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT MAX(tt) AS last_tt FROM room_timetable WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [dot, ki, nam]);

    // Kết quả trả về từ cơ sở dữ liệu
    const lastTTValue = results[0].last_tt; // Lấy giá trị lớn nhất của tt

    const exist = lastTTValue != null; // True nếu tồn tại, False nếu không tồn tại

    if (exist) {
      return res.status(200).json({
        message: "Dữ liệu đã tồn tại trong cơ sở dữ liệu",
        exists: true,
        lastTTValue: lastTTValue,
      });
    } else {
      return res.status(200).json({
        message: "Dữ liệu không tồn tại trong cơ sở dữ liệu",
        exists: false,
        lastTTValue: 0, // Trả về -1 nếu không tồn tại
      });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const getKhoaList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT MaPhongBan FROM phongban where isKhoa = 1";
    const [result] = await connection.query(query);
    res.json({
      success: true,
      MaPhongBan: result,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const checkDataQCDK = async (req, res) => {
  const { major, dot, ki_hoc, nam_hoc } = req.query;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT EXISTS(SELECT 1 FROM tam WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?) AS exist;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [major, dot, ki_hoc, nam_hoc]);

    // Kết quả trả về từ cơ sở dữ liệu
    const exist = results[0].exist === 1; // True nếu tồn tại, False nếu không tồn tại

    // Lấy dữ liệu bên bảng course_schedule_details
    let getDataTKBQuery = `
        SELECT
          id AS ID,
          major AS Khoa,
          ll_code AS SoTietCTDT,
          ll_total AS LL,
          student_quantity AS SoSinhVien,
          student_bonus AS HeSoLopDong,
          bonus_time AS HeSoT7CN,
          course_id AS MaBoMon,
          lecturer AS GiaoVien,
          credit_hours AS SoTinChi,
          course_name AS LopHocPhan,
          course_code AS MaHocPhan,
          start_date AS NgayBatDau,
          end_date AS NgayKetThuc,
          qc AS QuyChuan
        FROM course_schedule_details
        WHERE dot = ? and ki_hoc = ? and nam_hoc = ? AND da_luu != 1
      `;

    const getDataTKBParams = [dot, ki_hoc, nam_hoc];

    if (major !== "ALL") {
      getDataTKBQuery += " AND major = ?";
      getDataTKBParams.push(major);
    }

    const [tkbData] = await connection.query(getDataTKBQuery, getDataTKBParams);

    // Nếu không có dữ liệu thì không cần insert
    if (tkbData.length === 0) {
      return res.status(200).json({
        message: "Không có dữ liệu hợp lệ để chèn",
        exist: true,
        valid: false,
      });
    }

    if (exist) {
      return res.status(200).json({
        message: "Dữ liệu đã tồn tại trong cơ sở dữ liệu",
        exists: true,
        valid: true,
      });
    } else {
      return res.status(200).json({
        message: "Dữ liệu không tồn tại trong cơ sở dữ liệu",
        exists: false,
        valid: true,
      });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getImportTKBSite,
  getTKBChinhThucSite,
  getDataTKBChinhThuc,
  updateRowTKB,
  deleteRow,
  themTKBVaoQCDK,
  addNewRowTKB,
  deleteTKB,
  exportMultipleWorksheets,
  exportSingleWorksheets,
  checkDataTKBExist,
  getKhoaList,
  checkDataQCDK,
};
```
## File: src/queries/hopdongQueries.js
```javascript
const DON_GIA_EXPR = (tableAlias, khoaCol) => `
COALESCE(
  (
    SELECT cfg.SoTien
    FROM tienluong cfg
    WHERE 
      (cfg.he_dao_tao IS NULL OR cfg.he_dao_tao = ${tableAlias}.he_dao_tao)
      AND (cfg.HocVi IS NULL OR cfg.HocVi = gv.HocVi)
      -- ✅ CHỨC DANH
      AND (
        cfg.chuc_danh_id = 1
        OR cfg.chuc_danh_id = gv.chuc_danh
      )

      -- ✅ HSL
      AND (
        CAST(REPLACE(gv.HSL, ',', '.') AS DECIMAL(4,2)) >= cfg.HSL
      )
    ORDER BY 
      cfg.do_uu_tien DESC,
      cfg.SoTien DESC,
      cfg.HSL DESC
    LIMIT 1
  ),
  0
)
`;


const COL_DON_GIA = `COALESCE(bang_gia.don_gia, 0)`;

const CTE_DO_AN = `
DoAnHopDongDuKien AS (
  SELECT
    gv.id_Gvm,
    gv.HoTen AS GiangVien,
    gv.GioiTinh,
    gv.Email,
    gv.NgaySinh,
    gv.CCCD,
    gv.NoiCapCCCD,
    gv.MaSoThue,
    gv.HocVi,
    gv.ChucVu,
    gv.HSL,
    gv.DienThoai,
    gv.STK,
    gv.NganHang,
    gv.MaPhongBan,
    Combined.MaPhongBan AS MaKhoaMonHoc,
    Combined.he_dao_tao,
    gv.isQuanDoi,
    gv.isNghiHuu,
    NgayBatDau,
    NgayKetThuc,

    /* ================== SỐ TIẾT ================== */
    CASE 
      WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
      WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
      ELSE std.so_tiet_2
    END AS SoTiet,

    Dot,
    ki AS KiHoc,
    NamHoc,
    gv.NgayCapCCCD,
    gv.DiaChi,
    gv.BangTotNghiep, 
    gv.NoiCongTac,
    gv.BangTotNghiepLoai,
    gv.MonGiangDayChinh,
    Combined.DaoTaoDuyet,
    Combined.TaiChinhDuyet,

    /* ================== ĐƠN GIÁ ================== */
    \${DON_GIA_EXPR('Combined', 'MaPhongBan')} AS TienMoiGiang,

    /* ================== THÀNH TIỀN ================== */
    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * \${DON_GIA_EXPR('Combined', 'MaPhongBan')} AS ThanhTien,

    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * \${DON_GIA_EXPR('Combined', 'MaPhongBan')} * 0.1 AS Thue,

    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * \${DON_GIA_EXPR('Combined', 'MaPhongBan')} * 0.9 AS ThucNhan

  FROM (
    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV1' AS Nguon,
      DaoTaoDuyet,
      TaiChinhDuyet,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien1 IS NOT NULL
      AND (GiangVien1 NOT LIKE '%-%' 
           OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')

    UNION ALL

    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV2' AS Nguon,
      DaoTaoDuyet,
      TaiChinhDuyet,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien2 IS NOT NULL 
      AND GiangVien2 != 'không'
      AND (GiangVien2 NOT LIKE '%-%' 
           OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
  ) AS Combined
  JOIN gvmoi gv ON Combined.GiangVien = gv.HoTen
  JOIN sotietdoan std ON Combined.he_dao_tao = std.he_dao_tao
  WHERE Combined.NamHoc = ?
)
\`;


const CTE_DAI_HOC = \`
DaiHocHopDongDuKien AS (
    SELECT
        NgayBatDau,
        NgayKetThuc,
        gv.id_Gvm,
        gv.GioiTinh,
        gv.HoTen,
        gv.NgaySinh,
        gv.CCCD,
        gv.NoiCapCCCD,
        gv.Email,
        gv.MaSoThue,
        gv.HocVi,
        gv.ChucVu,
        gv.HSL,
        gv.DienThoai,
        gv.STK,
        gv.NganHang,
        gv.MaPhongBan,
        qc.Khoa AS MaKhoaMonHoc,
        qc.QuyChuan AS SoTiet,
        qc.he_dao_tao,
        gv.isQuanDoi,
        gv.isNghiHuu,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
        gv.NoiCongTac,
        gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        qc.DaoTaoDuyet,
        qc.TaiChinhDuyet,
        \${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,

        \${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan AS ThanhTien,
        \${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.1 AS Thue,
        \${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.9 AS ThucNhan
    FROM 
        quychuan qc
    JOIN 
        gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
    WHERE
        qc.MoiGiang = 1 AND qc.NamHoc = ? AND qc.he_dao_tao in (select id from he_dao_tao where cap_do <= 2)
    )
\`;

const CTE_SAU_DAI_HOC = \`
SoTietSauDaiHoc AS (
        SELECT
            qc.NgayBatDau,
            qc.NgayKetThuc,
            gv.id_Gvm,
            gv.GioiTinh,
            gv.HoTen,
            gv.NgaySinh,
            gv.CCCD,
            gv.NoiCapCCCD,
            gv.Email,
            gv.MaSoThue,
            gv.HocVi,
            gv.ChucVu,
            gv.HSL,
            gv.DienThoai,
            gv.STK,
            gv.NganHang,
            gv.MaPhongBan,
            qc.Khoa AS MaKhoaMonHoc,
            ROUND(
                qc.QuyChuan * CASE 
                    WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                    ELSE 1 
                END, 2
            ) AS SoTiet,
            qc.he_dao_tao,
            gv.isQuanDoi,
            gv.isNghiHuu,
            qc.NamHoc,
            qc.KiHoc,
            qc.Dot,
            gv.NgayCapCCCD,
            gv.DiaChi,
            gv.BangTotNghiep, 
            gv.NoiCongTac,
            gv.BangTotNghiepLoai,
            gv.MonGiangDayChinh,
            qc.DaoTaoDuyet,
            qc.TaiChinhDuyet,
            \${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang
        FROM 
            quychuan qc
        JOIN 
            gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
        WHERE
            qc.NamHoc = ? AND qc.he_dao_tao not in (select id from he_dao_tao where cap_do <= 2)
    ),
    SauDaiHocHopDongDuKien AS (
        SELECT
            *,
            TienMoiGiang * SoTiet AS ThanhTien,
            TienMoiGiang * SoTiet * 0.1 AS Thue,
            TienMoiGiang * SoTiet * 0.9 AS ThucNhan
        FROM SoTietSauDaiHoc
    )
\`;

// Union tất cả lại
const CTE_TABLE_ALL = \`
tableALL AS (SELECT
        Dot,
        KiHoc,
        NamHoc,
        'DoAn' AS LoaiHopDong,
        id_Gvm,
        GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        DaoTaoDuyet,
        TaiChinhDuyet,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        DoAnHopDongDuKien
    UNION ALL
    SELECT 
        Dot,
        KiHoc,
        NamHoc,
        'DaiHoc' AS LoaiHopDong,
        id_Gvm,
        HoTen AS GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        DaoTaoDuyet,
        TaiChinhDuyet,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        DaiHocHopDongDuKien
    UNION ALL
    SELECT 
        Dot,
        KiHoc,
        NamHoc,
        'SauDaiHoc' AS LoaiHopDong,
        id_Gvm,
        HoTen AS GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        DaoTaoDuyet,
        TaiChinhDuyet,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        SauDaiHocHopDongDuKien),
    TongSoTietGV AS (
        SELECT 
            GiangVien, 
            SUM(SoTiet) AS TongSoTiet
        FROM 
            tableALL
        GROUP BY 
            GiangVien
    )
\`;

module.exports = { CTE_DO_AN, CTE_DAI_HOC, CTE_SAU_DAI_HOC, CTE_TABLE_ALL, DON_GIA_EXPR };
```
