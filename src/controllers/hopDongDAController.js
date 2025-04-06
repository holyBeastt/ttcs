const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");
require("dotenv").config(); // Load biến môi trường

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
// Controller xuất nhiều hợp đồng
const exportMultipleContracts = async (req, res) => {
  let connection;
  try {
    const { dot, namHoc, khoa, teacherName, loaiHopDong } = req.query;

    if (!dot || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    connection = await createPoolConnection();
    let query = `
SELECT 
  ed.CCCD,
  ed.DienThoai,
  ed.Email,
  ed.MaSoThue,
  ed.GiangVien as 'HoTen',
  ed.NgaySinh,
  ed.NgayCapCCCD,
  ed.GioiTinh,
  ed.STK,
  ed.HocVi,
  ed.ChucVu,
  ed.HSL,
  ed.NoiCapCCCD,
  ed.DiaChi ,
  ed.NganHang,
  ed.NoiCongTac,
  ed.Dot,
  ed.KhoaDaoTao,
  MIN(ed.NgayBatDau) AS NgayBatDau,
  MAX(ed.NgayKetThuc) AS NgayKetThuc,
  SUM(ed.SoTiet) AS SoTiet,
  ed.NamHoc,
  gv.MaPhongBan
FROM
  gvmoi gv
JOIN 
  exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
WHERE 
  ed.Dot = ?  AND ed.NamHoc = ?
GROUP BY 
  ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
  ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac, ed.STK,ed.GioiTinh,
  ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan,ed.NgayCapCCCD
`;

    let params = [dot, namHoc];

    // Xử lý trường hợp có khoa
    if (khoa && khoa !== "ALL") {
      query = `
  SELECT 
    ed.CCCD,
    ed.DienThoai,
    ed.Email,
    ed.MaSoThue,
    ed.GiangVien as 'HoTen',
    ed.NgaySinh,
    ed.GioiTinh,
    ed.HocVi,
    ed.NgayCapCCCD,
    ed.ChucVu,
    ed.STK,
    ed.HSL,
    ed.NoiCapCCCD,
    ed.DiaChi ,
    ed.NganHang,
    ed.NoiCongTac,
    ed.Dot,
    ed.KhoaDaoTao,
    MIN(ed.NgayBatDau) AS NgayBatDau,
    MAX(ed.NgayKetThuc) AS NgayKetThuc,
    SUM(ed.SoTiet) AS SoTiet,
    ed.NamHoc,
    gv.MaPhongBan
  FROM 
    gvmoi gv
  JOIN 
    exportdoantotnghiep ed ON gv.CCCD = ed.CCCD -- Merge qua cột CCCD
  WHERE 
    ed.Dot = ?  AND ed.NamHoc = ? AND gv.MaPhongBan LIKE ?
  GROUP BY 
    ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
    ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac, ed.STK,ed.GioiTinh,
    ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan,ed.NgayCapCCCD
  `;
      params = [dot, namHoc, `%${khoa}%`];
    }

    // Xử lý trường hợp có teacherName
    if (teacherName) {
      query = `
  SELECT 
    ed.CCCD,
    ed.DienThoai,
    ed.Email,
    ed.MaSoThue,
    ed.GiangVien as 'HoTen',
    ed.NgaySinh,
    ed.NgayCapCCCD,
    ed.GioiTinh,
    ed.HocVi,
    ed.ChucVu,
    ed.HSL,
    ed.NoiCapCCCD,
    ed.DiaChi ,
    ed.STK,
    ed.NganHang,
    ed.NoiCongTac,
    ed.Dot,
    ed.KhoaDaoTao,
    MIN(ed.NgayBatDau) AS NgayBatDau,
    MAX(ed.NgayKetThuc) AS NgayKetThuc,
    SUM(ed.SoTiet) AS SoTiet,
    ed.NamHoc,
  gv.MaPhongBan
  FROM 
    gvmoi gv
  JOIN 
    exportdoantotnghiep ed ON gv.CCCD = ed.CCCD -- Merge qua cột CCCD
  WHERE 
    ed.Dot = ? AND ed.NamHoc = ? AND gv.HoTen LIKE ?
  GROUP BY 
    ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
    ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac,ed.STK, ed.GioiTinh,
    ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan,ed.NgayCapCCCD
  `;
      params = [dot, namHoc, `%${teacherName}%`];
    }
    const [teachers] = await connection.execute(query, params);

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/hopDongDA';</script>"
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

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      const soTiet = teacher.SoTiet || 0;

      if (teacher.HocVi === "Tiến sĩ") {
        mucTien = 120000; // Mức tiền cho tiến sĩ
      } else if (teacher.HocVi === "Thạc sĩ") {
        mucTien = 60000; // Mức tiền cho thạc sĩ
      } else if (teacher.HocVi === "Giáo sư") {
        mucTien = 120000; // Mức tiền cho giáo sư
      } else {
        mucTien = 0; // Nếu không phải thạc sĩ, tiến sĩ hoặc giáo sư
      }
      const gioiTinh = teacher.GioiTinh; // Đảm bảo rằng bạn đang lấy giá trị đúng

      let danhXung;

      // Giả sử bạn có biến gioiTinh chứa giá trị giới tính
      if (gioiTinh === "Nam") {
        danhXung = "Ông";
      } else if (gioiTinh === "Nữ") {
        danhXung = "Bà";
      } else {
        danhXung = ""; // Hoặc có thể gán một giá trị mặc định khác
      }
      const maPhongBan = teacher.MaPhongBan; // Đảm bảo rằng bạn đang lấy giá trị đúng

      let tenNganh;

      const phongBan = phongBanList.find(
        (item) =>
          item.MaPhongBan.trim().toUpperCase() ==
          maPhongBan.trim().toUpperCase()
      );

      if (phongBan) {
        tenNganh = phongBan.TenPhongBan; // Lấy từ object tìm được
      } else {
        tenNganh = "Không xác định";
      }

      const tienText = soTiet * 100000;
      const tienThueText = Math.round(tienText * 0.1);
      const tienThucNhanText = tienText - tienThueText;
      const thoiGianThucHien = formatDateRange(
        teacher.NgayBatDau,
        teacher.NgayKetThuc
      );

      const tienText1 = soTiet * mucTien; // Tính tổng tiền
      const tienThueText1 = Math.round(tienText1 * 0.1);
      const tienThucNhanText1 = tienText1 - tienThueText1;

      const data = {
        Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
        Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
        Danh_xưng: danhXung,
        Họ_và_tên: teacher.HoTen,
        CCCD: teacher.CCCD,
        Ngày_cấp: formatDate1(teacher.NgayCapCCCD),
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
        Đợt: teacher.Dot,
        Năm_học: teacher.NamHoc, // Thêm trường NamHocs
        Thời_gian_thực_hiện: thoiGianThucHien, // Thêm trường Thời_gian_thực_hiện
        Mức_Tiền: mucTien.toLocaleString("vi-VN"), // Thêm mức tiền vào dữ liệu
        Tiền_text1: tienText1.toLocaleString("vi-VN"),
        Bằng_chữ_số_tiền1: numberToWords(tienText1),
        Tiền_thuế_Text1: tienThueText1.toLocaleString("vi-VN"),
        Tiền_thực_nhận_Text1: tienThucNhanText1.toLocaleString("vi-VN"),
        Bằng_chữ_của_thực_nhận1: numberToWords(tienThucNhanText1),
        Nơi_công_tác: teacher.NoiCongTac, // Thêm trường Nơi công tác
        Khóa: teacher.KhoaDaoTao,
        Ngành: tenNganh,
      };
      // Chọn template dựa trên loại hợp đồng
      let templateFileName;
      switch (loaiHopDong) {
        case "Hệ học phí":
          templateFileName = "HopDongHP.docx";
          break;
        case "Mật mã":
          templateFileName = "HopDongMM.docx";
          break;
        case "Đồ án":
          templateFileName = "HopDongDA.docx";
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

      const fileName = `HopDong_${teacher.HoTen}.docx`;
      fs.writeFileSync(path.join(tempDir, fileName), buf);
    }

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const zipFileName = `HopDong_Dot${dot}_${namHoc}_${khoa || "all"}.zip`;
    const zipPath = path.join(tempDir, zipFileName);
    const output = fs.createWriteStream(zipPath);

    archive.pipe(output);
    archive.directory(tempDir, false);

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    res.download(zipPath, zipFileName, (err) => {
      if (err) {
        console.error("Error sending zip file:", err);
        return;
      }

      setTimeout(() => {
        try {
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
              const filePath = path.join(tempDir, file);
              fs.unlinkSync(filePath);
            }
            fs.rmdirSync(tempDir);
          }
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

const gethopDongDASite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `SELECT HoTen, MaPhongBan FROM gvmoi`;

    const [gvmoiList] = await connection.query(query);

    res.render("hopDongDA.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getExportAdditionalDoAnGvmSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("exportAdditionalDoAnGvm", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const exportAdditionalDoAnGvm = async (req, res) => {
  let connection;
  try {
    const { dot, namHoc, khoa, teacherName } = req.query;

    connection = await createPoolConnection();

    if (!dot || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Lấy dữ liệu tiền lương
    const tienLuongList = await getTienLuongList(connection);

    if (!tienLuongList || tienLuongList.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy tiền lương phù hợp với giảng viên'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const teachers = await getExportData(
      connection,
      dot,
      namHoc,
      khoa,
      teacherName,
      phongBanList
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const phuLucData = await getAppendixData(
      connection,
      dot,
      namHoc,
      khoa,
      teacherName
    );

    if (phuLucData.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
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

    const contractFiles = [];

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      const teacherZipName = `${teacher.HoTen}.zip`;
      const teacherZipPath = path.join(tempDir, teacherZipName);
      const teacherArchive = archiver("zip", { zlib: { level: 9 } });
      const output = fs.createWriteStream(teacherZipPath);
      teacherArchive.pipe(output);

      // Tạo file hợp đồng
      const filePathContract = await generateDoAnContract(
        teacher,
        tempDir,
        phongBanList
      );

      // Lấy file tài liệu bổ sung
      const filePathAdditional = await generateAdditionalFile(teacher, tempDir);
      // Lấy file phụ lục
      const phuLucTeacher = phuLucData.filter(
        (item) => item.GiangVien.trim() == teacher.HoTen.trim()
      );
      const filePathAppendix = await generateAppendixContract(
        tienLuongList,
        phuLucTeacher,
        tempDir
      );

      if (
        !fs.existsSync(filePathContract) ||
        fs.statSync(filePathContract).size === 0
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathContract}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAdditional &&
        (!fs.existsSync(filePathAdditional) ||
          fs.statSync(filePathAdditional).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAdditional}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAppendix &&
        (!fs.existsSync(filePathAppendix) ||
          fs.statSync(filePathAppendix).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAppendix}`);
        continue; // Bỏ qua file bị lỗi
      }

      if (filePathContract) {
        teacherArchive.file(filePathContract, {
          name: path.basename(filePathContract),
        });
      }
      if (filePathAdditional) {
        teacherArchive.file(filePathAdditional, {
          name: path.basename(filePathAdditional),
        });
      }
      if (filePathAppendix) {
        teacherArchive.file(filePathAppendix, {
          name: path.basename(filePathAppendix),
        });
      }

      await teacherArchive.finalize();
      contractFiles.push(teacherZipPath);
    }

    // Tạo file ZIP tổng hợp chứa tất cả file ZIP của giảng viên
    const zipFileName = `HopDong_Dot${dot}_${namHoc}_${khoa || "all"}.zip`;
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

  const documentFile = files.find((f) =>
    allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
  );

  if (!documentFile) return null; // Không tìm thấy file hợp lệ

  const oldFilePath = path.join(teacherFolderPath, documentFile);
  const newFileName = `BoSung_${teacher.HoTen}${path.extname(documentFile)}`;
  const newFilePath = path.join(teacherFolderPath, newFileName);

  // Đổi tên file
  fs.renameSync(oldFilePath, newFilePath);

  return newFilePath;
};

const generateDoAnContract = async (teacher, tempDir, phongBanList) => {
  try {
    const soTiet = teacher.SoTiet || 0;

    if (teacher.HocVi === "Tiến sĩ") {
      mucTien = 120000; // Mức tiền cho tiến sĩ
    } else if (teacher.HocVi === "Thạc sĩ") {
      mucTien = 60000; // Mức tiền cho thạc sĩ
    } else if (teacher.HocVi === "Giáo sư") {
      mucTien = 120000; // Mức tiền cho giáo sư
    } else {
      mucTien = 0; // Nếu không phải thạc sĩ, tiến sĩ hoặc giáo sư
    }
    const gioiTinh = teacher.GioiTinh; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let danhXung;

    // Giả sử bạn có biến gioiTinh chứa giá trị giới tính
    if (gioiTinh === "Nam") {
      danhXung = "Ông";
    } else if (gioiTinh === "Nữ") {
      danhXung = "Bà";
    } else {
      danhXung = ""; // Hoặc có thể gán một giá trị mặc định khác
    }
    const maPhongBan = teacher.MaPhongBan; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let tenNganh;

    const phongBan = phongBanList.find(
      (item) =>
        item.MaPhongBan.trim().toUpperCase() == maPhongBan.trim().toUpperCase()
    );

    if (phongBan) {
      tenNganh = phongBan.TenPhongBan; // Lấy từ object tìm được
    } else {
      tenNganh = "Không xác định";
    }

    const tienText = soTiet * 100000;
    const tienThueText = Math.round(tienText * 0.1);
    const tienThucNhanText = tienText - tienThueText;
    const thoiGianThucHien = formatDateRange(
      teacher.NgayBatDau,
      teacher.NgayKetThuc
    );

    const tienText1 = soTiet * mucTien; // Tính tổng tiền
    const tienThueText1 = Math.round(tienText1 * 0.1);
    const tienThucNhanText1 = tienText1 - tienThueText1;

    const data = {
      Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
      Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
      Danh_xưng: danhXung,
      Họ_và_tên: teacher.HoTen,
      CCCD: teacher.CCCD,
      Ngày_cấp: formatDate1(teacher.NgayCapCCCD),
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
      Đợt: teacher.Dot,
      Năm_học: teacher.NamHoc, // Thêm trường NamHocs
      Thời_gian_thực_hiện: thoiGianThucHien, // Thêm trường Thời_gian_thực_hiện
      Mức_Tiền: mucTien.toLocaleString("vi-VN"), // Thêm mức tiền vào dữ liệu
      Tiền_text1: tienText1.toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền1: numberToWords(tienText1),
      Tiền_thuế_Text1: tienThueText1.toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text1: tienThucNhanText1.toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận1: numberToWords(tienThucNhanText1),
      Nơi_công_tác: teacher.NoiCongTac, // Thêm trường Nơi công tác
      Khóa: teacher.KhoaDaoTao,
      Ngành: tenNganh,
    };
    // Chọn template dựa trên loại hợp đồng
    let templateFileName = "HopDongDA.docx";

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

    const fileName = `HopDong_${teacher.HoTen}.docx`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, buf);

    return filePath; // Trả về đường dẫn file để dùng sau này

    // const fileName = `HopDong_${teacher.HoTen}.docx`;
    // fs.writeFileSync(path.join(tempDir, fileName), buf);
  } catch (error) {
    console.log(error);
  }
};

const getExportData = async (
  connection,
  dot,
  namHoc,
  khoa,
  teacherName,
  phongBanList
) => {
  try {
    let query = `
    SELECT 
      ed.CCCD,
      ed.DienThoai,
      ed.Email,
      ed.MaSoThue,
      ed.GiangVien as 'HoTen',
      ed.NgaySinh,
      ed.NgayCapCCCD,
      ed.GioiTinh,
      ed.STK,
      ed.HocVi,
      ed.ChucVu,
      ed.HSL,
      ed.NoiCapCCCD,
      ed.DiaChi ,
      ed.NganHang,
      ed.NoiCongTac,
      ed.Dot,
      ed.KhoaDaoTao,
      MIN(ed.NgayBatDau) AS NgayBatDau,
      MAX(ed.NgayKetThuc) AS NgayKetThuc,
      SUM(ed.SoTiet) AS SoTiet,
      ed.NamHoc,
      gv.MaPhongBan,
      gv.MonGiangDayChinh as MaBoMon
    FROM
      gvmoi gv
    JOIN 
      exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
    WHERE 
      ed.Dot = ?  AND ed.NamHoc = ?
    GROUP BY 
      ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
      ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac, ed.STK,ed.GioiTinh,
      ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan, ed.NgayCapCCCD, gv.MonGiangDayChinh
    `;

    let params = [dot, namHoc];

    // Xử lý trường hợp có khoa
    if (khoa && khoa !== "ALL") {
      query = `
      SELECT 
        ed.CCCD,
        ed.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien as 'HoTen',
        ed.NgaySinh,
        ed.GioiTinh,
        ed.HocVi,
        ed.NgayCapCCCD,
        ed.ChucVu,
        ed.STK,
        ed.HSL,
        ed.NoiCapCCCD,
        ed.DiaChi ,
        ed.NganHang,
        ed.NoiCongTac,
        ed.Dot,
        ed.KhoaDaoTao,
        MIN(ed.NgayBatDau) AS NgayBatDau,
        MAX(ed.NgayKetThuc) AS NgayKetThuc,
        SUM(ed.SoTiet) AS SoTiet,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh as MaBoMon
      FROM 
        gvmoi gv
      JOIN 
        exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
      WHERE 
        ed.Dot = ?  AND ed.NamHoc = ? AND gv.MaPhongBan LIKE ?
      GROUP BY 
        ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
        ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac, ed.STK,ed.GioiTinh,
        ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan, ed.NgayCapCCCD, gv.MonGiangDayChinh
      `;
      params = [dot, namHoc, `%${khoa}%`];
    }

    // Xử lý trường hợp có teacherName
    if (teacherName) {
      query = `
      SELECT 
        ed.CCCD,
        ed.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien as 'HoTen',
        ed.NgaySinh,
        ed.NgayCapCCCD,
        ed.GioiTinh,
        ed.HocVi,
        ed.ChucVu,
        ed.HSL,
        ed.NoiCapCCCD,
        ed.DiaChi ,
        ed.STK,
        ed.NganHang,
        ed.NoiCongTac,
        ed.Dot,
        ed.KhoaDaoTao,
        MIN(ed.NgayBatDau) AS NgayBatDau,
        MAX(ed.NgayKetThuc) AS NgayKetThuc,
        SUM(ed.SoTiet) AS SoTiet,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh as MaBoMon
      FROM 
        gvmoi gv
      JOIN 
        exportdoantotnghiep ed ON gv.CCCD = ed.CCCD -- Merge qua cột CCCD
      WHERE 
        ed.Dot = ? AND ed.NamHoc = ? AND gv.HoTen LIKE ?
      GROUP BY 
        ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
        ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac,ed.STK, ed.GioiTinh,
        ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan, ed.NgayCapCCCD, gv.MonGiangDayChinh
      `;
      params = [dot, namHoc, `%${teacherName}%`];
    }

    const [teachers] = await connection.execute(query, params);

    return teachers;
  } catch (error) {
    console.log(error);
  }
};

// Phần phụ lục hợp đồng
const getAppendixData = async (connection, dot, namHoc, khoa, teacherName) => {
  try {
    let query = `
      SELECT DISTINCT
          gv.HoTen AS GiangVien,
          edt.TenDeTai,
          edt.SinhVien,
          edt.SoTiet,
          edt.NgayBatDau,
          edt.NgayKetThuc,
          gv.HocVi,
          gv.HSL,
          gv.DiaChi
      FROM exportdoantotnghiep edt
      JOIN gvmoi gv ON edt.GiangVien = gv.HoTen
      WHERE edt.Dot = ? AND edt.NamHoc = ? AND edt.isMoiGiang = 1
    `;

    let params = [dot, namHoc];

    if (khoa && khoa !== "ALL") {
      query += `AND edt.MaPhongBan = ?`;
      params.push(khoa);
    }

    if (teacherName) {
      query += ` AND gv.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    const [data] = await connection.execute(query, params);

    return data;
  } catch (error) {
    console.log(error);
  }
};

const generateAppendixContract = async (tienLuongList, data, tempDir) => {
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

    // Thêm tiêu đề
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
      "Đơn vị tính: Đồng",
      "",
      "",
    ]);
    titleRow5.font = { name: "Times New Roman", bold: true, size: 14 };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`K${titleRow5.number}:M${titleRow5.number}`);

    // Thiết lập tiêu đề cột
    const summaryHeader = [
      "STT",
      "Họ tên giảng viên",
      "Tên đồ án ",
      "Sinh viên thực hiện",
      "Số tiết",
      "Thời gian thực hiện",
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
    headerRow.font = { name: "Times New Roman", bold: true };
    summarySheet.getColumn(10).numFmt = "#,##0"; // Thành tiền

    summarySheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
    summarySheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
    summarySheet.getColumn(13).numFmt = "#,##0"; // Còn lại

    // Định dạng cột
    summarySheet.getColumn(1).width = 5; // STT
    summarySheet.getColumn(2).width = 18; // Họ tên giảng viên
    summarySheet.getColumn(3).width = 20; // Tên đồ án
    summarySheet.getColumn(4).width = 14; // Sinh viên thực hiện
    summarySheet.getColumn(5).width = 10; // Số tiết
    summarySheet.getColumn(6).width = 18; // Thời gian thực hiện
    summarySheet.getColumn(7).width = 18; // Địa chỉ
    summarySheet.getColumn(8).width = 6; // Học vị
    summarySheet.getColumn(9).width = 7; // Hệ số lương
    summarySheet.getColumn(10).width = 12; // Mức thanh toán
    summarySheet.getColumn(11).width = 15; // Thành tiền
    summarySheet.getColumn(12).width = 15; // Trừ thuế TNCN 10%
    summarySheet.getColumn(13).width = 15; // Còn lại

    // Thêm dữ liệu vào sheet tổng hợp
    let stt = 1;
    let totalSoTiet = 0;
    let totalSoTien = 0;
    let totalTruThue = 0;
    let totalThucNhan = 0;

    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      giangVienData.forEach((item) => {
        const soTien = item.SoTiet * 100000; // Giả sử mức thanh toán là 100000
        const truThue = soTien * 0.1; // Trừ thuế TNCN 10%
        const conLai = soTien - truThue; // Còn lại

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
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet,
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          //   convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL,
          100000, // Mức thanh toán
          soTien, // Định dạng số tiền
          truThue, // Định dạng số tiền
          conLai, // Định dạng số tiền
        ]);

        // Cập nhật các tổng cộng
        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += conLai;

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
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5.font = { name: "Times New Roman", bold: true, size: 14 };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`K${titleRow5.number}:M${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
        "STT", // Thêm tiêu đề STT
        "Họ tên giảng viên",
        "Tên đồ án",
        "Sinh viên thực hiện",
        "Số tiết",
        "Thời gian thực hiện",
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
      worksheet.getColumn(10).numFmt = "#,##0"; // Thành tiền

      worksheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
      worksheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
      worksheet.getColumn(13).numFmt = "#,##0"; // Còn lại

      worksheet.pageSetup = {
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

      // Căn chỉnh độ rộng cột
      // Định dạng cột
      worksheet.getColumn(1).width = 5; // STT
      worksheet.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet.getColumn(3).width = 20; // Tên đồ án
      worksheet.getColumn(4).width = 14; // Sinh viên thực hiện
      worksheet.getColumn(5).width = 10; // Số tiết
      worksheet.getColumn(6).width = 18; // Thời gian thực hiện
      worksheet.getColumn(7).width = 18; // Địa chỉ
      worksheet.getColumn(8).width = 6; // Học vị
      worksheet.getColumn(9).width = 7; // Hệ số lương
      worksheet.getColumn(10).width = 12; // Mức thanh toán
      worksheet.getColumn(11).width = 15; // Thành tiền
      worksheet.getColumn(12).width = 15; // Trừ thuế TNCN 10%
      worksheet.getColumn(13).width = 15; // Còn lại

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
        const mucThanhToan = 100000;
        const soTien = item.SoTiet * mucThanhToan;
        const truThue = soTien * 0.1;
        const thucNhan = soTien - truThue;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        // const hocKyLaMa = convertToRoman(item.HocKy);
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
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet,
          thoiGianThucHien,
          item.DiaChi,
          hocViVietTat, // Sử dụng viết tắt cho Học vị
          item.HSL,
          mucThanhToan,
          soTien,
          truThue,
          thucNhan,
        ]);
        row.font = { name: "Times New Roman", size: 13 };
        row.getCell(11).numFmt = "#,##0"; // Còn lại

        row.getCell(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
        row.getCell(13).numFmt = "#,##0"; // Còn lại

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
            // case 7: // Học kỳ
            //   cell.font = { name: "Times New Roman", size: 13 };
            //   break;
            case 7: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 8: // Học vị
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 9: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 10: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 11: // Thành tiền
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 12: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 13: // Còn lại
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
        // "",
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
    let fileName = `PhuLuc_${data[0].GiangVien}`;

    fileName += ".xlsx";

    // Lưu file vào thư mục tạm
    const filePath = path.join(tempDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    return filePath; // Trả về đường dẫn file để nén vào ZIP
  } catch (error) {
    console.error("Error exporting data:", error);
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

module.exports = {
  exportMultipleContracts,
  gethopDongDASite,
  getExportAdditionalDoAnGvmSite,
  exportAdditionalDoAnGvm,
};
