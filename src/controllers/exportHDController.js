const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");
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
    // Truy vấn bảng tienluong để lấy mức tiền
    const tienLuongQuery = `SELECT HocVi, he_dao_tao, SoTien FROM tienluong`;
    const [tienLuongList] = await connection.execute(tienLuongQuery);

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

    let params = [dot, ki, namHoc, loaiHopDong];

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
      params = [dot, ki, namHoc, `%${khoa}%`, loaiHopDong];
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

      params = [dot, ki, namHoc, `%${teacherName}%`, loaiHopDong];
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
      const soTiet = teacher.SoTiet || 0;

      // Gán giá trị mặc định "Thạc sĩ" nếu cột học vị trống
      teacher.HocVi = teacher.HocVi || "Thạc sĩ";

      const tienLuong = tienLuongList.find(
        (item) =>
          item.HocVi === teacher.HocVi && item.he_dao_tao === loaiHopDong
      );

      if (!tienLuong) {
        return res
          .status(404)
          .send(
            "<script>alert('Không tìm thấy mức tiền phù hợp cho giảng viên(Hãy nhập đầy đủ)'); window.location.href='/exportHD';</script>"
          );
      }

      // Tính toán số tiền
      const tienText = tienLuong.SoTien * soTiet;
      const tienThueText = Math.round(tienText * 0.1);
      const tienThucNhanText = tienText - tienThueText;
      const thoiGianThucHien = formatDateRange(
        teacher.NgayBatDau,
        teacher.NgayKetThuc
      );

      // Cập nhật lại số tiền vào bảng hopdonggvmoi
      await updateSoTienThucNhan(
        connection,
        teacher.id_Gvm,
        dot,
        ki,
        namHoc,
        tienThueText,
        tienThucNhanText
      );

      // Ghi dữ liệu cho thống kê chuyển khoản
      summaryData.push({
        HoTen: teacher.HoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienThucNhanText,
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
        Bằng_chữ_số_tiền: numberToWords(tienText),
        Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
        Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
        Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
        Kỳ: convertToRoman(teacher.KiHoc),
        Năm_học: teacher.NamHoc,
        Thời_gian_thực_hiện: thoiGianThucHien,
        Mức_tiền: tienLuong.SoTien.toLocaleString("vi-VN"),
        Nơi_công_tác: teacher.NoiCongTac,
        Cơ_sở_đào_tạo: teacher.CoSoDaoTao
      };
      // Chọn template dựa trên loại hợp đồng
      let templateFileName;
      switch (loaiHopDong) {
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

    console.log("Tạo file thống kê chuyển khoản sau thuế thành công");

    // Tạo file thống kê chuyển khoản trước thuế
    const noiDung2 = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc}`;
    const summaryDoc2 = createTransferDetailDocument(summaryData2, noiDung2, "trước thuế");
    const summaryBuf2 = await Packer.toBuffer(summaryDoc2);
    const summaryName2 = `GiangDay_Daihoc_Thongke_chuyenkhoan_truocthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName2), summaryBuf2);

    console.log("Tạo file thống kê chuyển khoản trước thuế thành công");

    // Tạo file Excel báo cáo thuế
    const taxReportData = summaryData.map((item, index) => {
      // Tính toán chính xác: nếu ThucNhan là tiền sau thuế (90%), thì tiền trước thuế = ThucNhan / 0.9
      const tienTruocThue = Math.round(item.ThucNhan / 0.9);
      const thuePhaiTra = tienTruocThue - item.ThucNhan; // = 10% của tiền trước thuế

      return {
        stt: index + 1,
        contractNumber: item.SoHopDong,
        executor: item.HoTen,
        expenseDescription: `Hợp đồng giao khoán công việc`,
        idNumber: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.CCCD || '',
        issueDate: formatDateForExcel(teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NgayCap),
        issuePlace: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NoiCapCCCD || '',
        idAddress: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.DiaChi || '',
        phoneNumber: item.DienThoai,
        taxCode: item.MaSoThue,
        amount: tienTruocThue, // Tổng tiền trước thuế
        taxDeducted: thuePhaiTra, // Thuế 10%
        netAmount: item.ThucNhan // Tiền sau thuế
      };
    });

    const taxReportWorkbook = createTaxReportWorkbook(taxReportData);
    const taxReportName = `GiangDay_Daihoc_BangKeTongHopThue.xlsx`;
    await taxReportWorkbook.xlsx.writeFile(path.join(tempDir, taxReportName));

    console.log("Tạo file bảng kê tổng hợp thuế thành công");

    console.log("Bắt đầu tạo file ZIP...");

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
    console.log(`Found ${files.length} files to archive:`, files);

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

    console.log("ZIP file created successfully, starting download...");

    console.log("ZIP file created successfully, starting download...");

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

    let params = [dot, ki, namHoc, loaiHopDong];

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
      params = [dot, ki, namHoc, `%${khoa}%`, loaiHopDong];
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

      params = [dot, ki, namHoc, `%${teacherName}%`, loaiHopDong];
    }

    const [teachers] = await connection.execute(query, params);

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/hd-gvm/additional-file-site';</script>"
      );
    }

    // Lấy danh sách tiền lương
    const tienLuongList = await getTienLuongList(connection);

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

        // Tạo file hợp đồng
        const filePathContract = await generateContractForTeacher(
          teacher,
          loaiHopDong,
          tienLuongList,
          tempDir
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
            loaiHopDong,
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
  tienLuongList,
  tempDir
) => {
  const soTiet = teacher.SoTiet || 0;

  // Assign default value "Thạc sĩ" if HocVi is empty
  teacher.HocVi = teacher.HocVi || "Thạc sĩ";

  const tienLuong = tienLuongList.find(
    (item) => item.HocVi === teacher.HocVi && item.he_dao_tao === loaiHopDong
  );

  if (!tienLuong) {
    throw new Error(
      `Không tìm thấy mức tiền phù hợp cho giảng viên: ${teacher.HoTen}`
    );
  }

  const tienText = tienLuong.SoTien * soTiet;
  const tienThueText = Math.round(tienText * 0.1);
  const tienThucNhanText = tienText - tienThueText;
  const thoiGianThucHien = formatDateRange(
    teacher.NgayBatDau,
    teacher.NgayKetThuc
  );

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
    Mức_tiền: tienLuong.SoTien.toLocaleString("vi-VN"),
    Nơi_công_tác: teacher.NoiCongTac,
    Số_hợp_đồng: teacher.SoHopDong || "",
    Số_thanh_lý: teacher.SoThanhLyHopDong || "",
    Cơ_sở_đào_tạo: teacher.CoSoDaoTao,
  };

  let templateFileName;
  switch (loaiHopDong) {
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
      throw new Error("Loại hợp đồng không hợp lệ.");
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
  loaiHopDong
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

    let params = [dot, ki, namHoc, loaiHopDong];

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
        const truThue = soTien * 0.1; // Trừ Thuế = 10% của Số Tiền
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
  console.log("filepath = ", oldFilePath);

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

    res.render("hopdong.fileBoSungDownload.ejs", {
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
    hd.SoTien,
    hd.TruThue,
    hd.NgayCap,
    hd.ThucNhan,
    hd.NgayNghiemThu,
    hd.Dot,
    hd.KiHoc,
    hd.NamHoc,
    hd.MaPhongBan,
    hd.MaBoMon,
    hd.NoiCongTac
  FROM
    hopdonggvmoi hd
  JOIN
    gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
  WHERE
    hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.he_dao_tao = ?
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
    hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac`;

    let params = [dot, ki, namHoc, loaiHopDong];

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
      hd.SoTien,
      hd.TruThue,
      hd.NgayCap,
      hd.ThucNhan,
      hd.NgayNghiemThu,
      hd.Dot,
      hd.KiHoc,
      hd.NamHoc,
      hd.MaPhongBan,
      hd.MaBoMon,
      hd.NoiCongTac  
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
    WHERE
                hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.MaPhongBan like ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac`;
      params = [dot, ki, namHoc, `%${khoa}%`, loaiHopDong];
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
      hd.SoTien,
      hd.TruThue,
      hd.NgayCap,
      hd.ThucNhan,
      hd.NgayNghiemThu,
      hd.Dot,
      hd.KiHoc,
      hd.NamHoc,
      hd.MaPhongBan,
      hd.MaBoMon,
      hd.NoiCongTac
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
    WHERE
              hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.HoTen LIKE ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac`;

      params = [dot, ki, namHoc, `%${teacherName}%`, loaiHopDong];
    }

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

      for (const teacher of teachers) {
        const filePathAdditional = await generateAdditionalFile(
          teacher,
          tempDir
        );
        if (filePathAdditional) {
          fileList.push(filePathAdditional);
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
        console.log(`Đã tạo file zip: ${zipPath} (${archive.pointer()} bytes)`);

        let fileName = `file_bo_sung_dot${dot}_ki${ki}_${namHoc}`;

        if (teacherName) {
          fileName += "_" + teacherName + ".zip";
        } else if (khoa != "ALL") {
          fileName += "_" + khoa + ".zip";
        } else {
          fileName += "_ALL" + ".zip";
        }
        // Gửi file zip về client
        res.download(zipPath, `${fileName}`, (err) => {
          if (err) {
            console.error("Lỗi gửi file:", err.message);
            res.status(500).send("Không thể tải file zip.");
          }

          // Xoá file zip sau khi tải nếu muốn
          fs.unlinkSync(zipPath);
        });
      });

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
              createCell((row.SoHopDong || '') + '   /HĐ-ĐT', false, 1950), // Ô Số HĐ với width cố định (tăng 50px)
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

  // Footer: Tổng cộng - sử dụng dataEndRow đã được tính chính xác ở trên
  worksheet.addRow([
    'Tổng cộng:', '', '', '', '', '', '', '', '', '',
    { formula: `SUM(K${dataStartRow}:K${dataEndRow})` },
    { formula: `SUM(L${dataStartRow}:L${dataEndRow})` },
    { formula: `SUM(M${dataStartRow}:M${dataEndRow})` }
  ]);
  const totalRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${totalRow}:J${totalRow}`);
  worksheet.getRow(totalRow).font = { bold: true };
  worksheet.getRow(totalRow).alignment = { horizontal: 'right' };

  // Áp dụng định dạng số có dấu phẩy cho dòng tổng cộng
  ['K', 'L', 'M'].forEach(col => {
    worksheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });

  // Tính tổng số tiền để chuyển thành chữ
  let totalAmount = 0;
  if (records && records.length > 0) {
    totalAmount = records.reduce((sum, record) => {
      const amount = typeof record.amount === 'number' ? record.amount : 0;
      return sum + amount;
    }, 0);
  }

  // Bằng chữ
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
