const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const path = require("path");
//const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");

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
    const { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;

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
    gv.NoiCongTac  -- Thêm cột NoiCongTac từ bảng gvmoi
  FROM
    hopdonggvmoi hd
  JOIN
    gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
  WHERE
    hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.HeDaoTao = ?
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
    hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, gv.NoiCongTac`;

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
      gv.NoiCongTac  -- Thêm cột NoiCongTac từ bảng gvmoi
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
    WHERE
                hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.MaPhongBan like ? AND hd.HeDaoTao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, gv.NoiCongTac`;
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
      gv.NoiCongTac  -- Thêm cột NoiCongTac từ bảng gvmoi
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
    WHERE
              hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.HoTen LIKE ? AND hd.HeDaoTao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, gv.NoiCongTac`;

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
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

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
        Danh_xưng: teacher.DanhXung,
        Họ_và_tên: teacher.HoTen,
        CCCD: teacher.CCCD,
        Ngày_cấp: formatDate1(teacher.NgayCap),
        Nơi_cấp: teacher.NoiCapCCCD,
        Chức_vụ: teacher.ChucVu,
        Cấp_bậc: teacher.HocVi,
        Hệ_số_lương: Number(teacher.HSL).toFixed(2),
        Địa_chỉ_theo_CCCD: teacher.DiaChi,
        Điện_thoại: teacher.DienThoai,
        Mã_số_thuế: teacher.MaSoThue,
        Số_tài_khoản: teacher.STK,
        Email: teacher.Email,
        Tại_ngân_hàng: teacher.NganHang,
        Số_tiết: teacher.SoTiet,
        Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
        Tiền_text: tienText.toLocaleString("vi-VN"),
        Bằng_chữ_số_tiền: numberToWords(tienText),
        Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
        Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
        Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
        Kỳ: convertToRoman(teacher.KiHoc), // Thêm trường KiHoc
        Năm_học: teacher.NamHoc, // Thêm trường NamHocs
        Thời_gian_thực_hiện: thoiGianThucHien, // Thêm trường Thời_gian_thực_hiện
        Mức_Tiền: mucTien.toLocaleString("vi-VN"), // Thêm mức tiền vào dữ liệu
        Tiền_text1: tienText1.toLocaleString("vi-VN"),
        Bằng_chữ_số_tiền1: numberToWords(tienText1),
        Tiền_thuế_Text1: tienThueText1.toLocaleString("vi-VN"),
        Tiền_thực_nhận_Text1: tienThucNhanText1.toLocaleString("vi-VN"),
        Bằng_chữ_của_thực_nhận1: numberToWords(tienThucNhanText1),
        Nơi_công_tác: teacher.NoiCongTac, // Thêm trường Nơi công tác
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

    const zipFileName = `HopDong_Dot${dot}_Ki${ki}_${namHoc}_${
      khoa || "all"
    }.zip`;
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

module.exports = {
  exportMultipleContracts,
  getExportHDSite,
};
