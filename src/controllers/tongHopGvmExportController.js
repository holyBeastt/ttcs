const express = require("express");
// const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");
const ExcelJS = require("exceljs");
const router = express.Router();
const mysql = require("mysql2/promise");
const xlsx = require("xlsx");
const path = require("path"); // Thêm dòng này
const fs = require("fs"); // Thêm dòng này
const archiver = require("archiver"); // Add this to handle zip creation
const { exec } = require("child_process"); // Add this line to import exec
const PizZip = require("pizzip"); // Import PizZip
const Docxtemplater = require("docxtemplater"); // Import Docxtemplater
let PDFMerger; // Declare PDFMerger variable

async function loadPDFMerger() {
  if (!PDFMerger) {
    PDFMerger = (await import("pdf-merger-js")).default; // Dynamically import pdf-merger-js
  }
}
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
  function sanitizeFileName(fileName) {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9_\-.]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
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
async function convertWordToPdf(wordFilePath, pdfFilePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(wordFilePath)) {
      return reject(new Error('File Word không tồn tại'));
    }

    const pdfDir = path.dirname(pdfFilePath);
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Sử dụng soffice.exe thay vì soffice
    const command = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe" --headless --convert-to pdf "${wordFilePath}" --outdir "${pdfDir}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Lỗi chuyển đổi:', error);
        console.error('Chi tiết lỗi:', stderr);
        return reject(new Error(`Không thể chuyển đổi file: ${error.message}`));
      }

      const expectedPdfPath = path.join(pdfDir, path.basename(wordFilePath, '.docx') + '.pdf');
      if (fs.existsSync(expectedPdfPath)) {
        if (expectedPdfPath !== pdfFilePath) {
          fs.renameSync(expectedPdfPath, pdfFilePath);
        }
        console.log('Chuyển đổi thành công:', pdfFilePath);
        resolve();
      } else {
        reject(new Error('File PDF không được tạo ra'));
      }
    });
  });   
}
const exportMultipleContracts = async (req, res) => {
    let connection;
    try {
      const { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;
  
      if (!dot || !ki || !namHoc) {
        return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
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
        // Nếu số tiền <= 2 triệu đồng thì không tính thuế
        const tienThueText = tienText <= 2000000 ? 0 : Math.round(tienText * 0.1);
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
          Kỳ: convertToRoman(teacher.KiHoc), // Thêm trường KiHoc
          Năm_học: teacher.NamHoc, // Thêm trường NamHocs
          Thời_gian_thực_hiện: thoiGianThucHien, // Thêm trường Thời_gian_thực_hiện
          Mức_tiền: tienLuong.SoTien.toLocaleString("vi-VN"),
          Nơi_công_tác: teacher.NoiCongTac, // Thêm trường Nơi công tác
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
       // Tạo file Word từ template (giữ nguyên)
       const templatePath = path.resolve(__dirname, "../templates", templateFileName);
       const content = fs.readFileSync(templatePath, "binary");
       const zip = new PizZip(content);
  
       const doc = new Docxtemplater(zip, {
         paragraphLoop: true,
         linebreaks: true,
         delimiters: { start: "«", end: "»" },
       });
  
       doc.render(data);
       const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  
       const fileName = `HopDong_${teacher.HoTen}.docx`;
       const wordFilePath = path.join(tempDir, fileName);
       fs.writeFileSync(wordFilePath, buf);
  
       // Chuyển đổi sang PDF bằng LibreOffice
       const pdfFilePath = wordFilePath.replace(".docx", ".pdf");
       await convertWordToPdf(wordFilePath, pdfFilePath);
     }
  
     // Tạo file ZIP chứa tất cả hợp đồng (giữ nguyên)
     const archive = archiver("zip", { zlib: { level: 9 } });
     const zipFileName = `HopDong_Dot${dot}_Ki${ki}_${namHoc}_${khoa || "all"}.zip`;
     const zipPath = path.join(tempDir, zipFileName);
     const output = fs.createWriteStream(zipPath);
  
     archive.pipe(output);
     fs.readdirSync(tempDir).forEach((file) => {
       const filePath = path.join(tempDir, file);
       if (file.endsWith(".docx") || file.endsWith(".pdf")) {
         archive.file(filePath, { name: file });
       }
     });
  
     await new Promise((resolve, reject) => {
       output.on("close", resolve);
       archive.on("error", reject);
       archive.finalize();
     });
  
     // Trả về file ZIP cho client
     res.download(zipPath, zipFileName, (err) => {
       if (err) {
         console.error("Error sending zip file:", err);
         return;
       }
  
       // Xóa thư mục tạm sau khi gửi file
       setTimeout(() => {
         try {
           if (fs.existsSync(tempDir)) {
             deleteFolderRecursive(tempDir);
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
     if (connection) connection.release();
   }
  };

  // Utility function to delete folders recursively
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

const exportPhuLucGiangVienMoi = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const tienLuongList = await getTienLuongList(connection);

    const { dot, ki, namHoc, loaiHopDong, khoa, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đợt, kỳ hoặc năm học",
      });
    }

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
              qc.NgayBatDau, 
              qc.NgayKetThuc,
              gv.DiaChi,
              qc.Dot,
              qc.KiHoc,
              qc.NamHoc,
              qc.Khoa,
              qc.he_dao_tao
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
              qc.NgayBatDau, 
              qc.NgayKetThuc,
              gv.DiaChi,
              qc.Dot,
              qc.KiHoc,
              qc.NamHoc,
              qc.Khoa,
              qc.he_dao_tao
          FROM quychuan qc
          JOIN gvmoi gv 
              ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) = gv.HoTen
          WHERE qc.MoiGiang = 1 AND qc.GiaoVienGiangDay NOT LIKE '%,%'
      ),
      table_ALL AS (
          SELECT * FROM phuLucSauDH
          UNION
          SELECT * FROM phuLucDH
      )
      SELECT * FROM table_ALL WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?  AND he_dao_tao=?
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

    const [data] = await connection.execute(query, params);

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        message:           "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/exportHD';</script>"
        ,
      });
    }

   

    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();
   // Nhóm dữ liệu theo giảng viên
   const groupedData = data.reduce((acc, cur) => {
    (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
    return acc;
  }, {});
    
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
        // Nếu số tiền <= 2 triệu đồng thì không tính thuế
        const truThue = soTien <= 2000000 ? 0 : soTien * 0.1; // Trừ Thuế = 10% của Số Tiền (hoặc 0 nếu <= 2 triệu)
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

    // Tạo tên file Excel
    let fileName = `PhuLuc_GiangVien_Moi_Dot${dot}_Ki${ki}_${namHoc}`;
    if (khoa && khoa !== "ALL") {
      fileName += `_${sanitizeFileName(khoa)}`;
    }
    if (teacherName) {
      fileName += `_${sanitizeFileName(teacherName)}`;
    }
    const exportsDir = path.join(__dirname, "../../exports");
    const excelFilePath = path.join(exportsDir, `${fileName}.xlsx`);
    const pdfFilePath = path.join(exportsDir, `${fileName}.pdf`);

    // Kiểm tra và tạo thư mục exports nếu chưa tồn tại
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Ghi workbook vào file Excel
    await workbook.xlsx.writeFile(excelFilePath);

    // Chuyển đổi Excel sang PDF bằng LibreOffice
    const command = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe" --headless --convert-to pdf "${excelFilePath}" --outdir "${path.dirname(pdfFilePath)}"`;
    exec(command, async (error) => {
      if (error) {
        console.error("Error converting Excel to PDF:", error);
        return res.status(500).json({
          success: false,
          message: "Error converting Excel to PDF",
        });
      }

      // Kiểm tra xem file PDF đã được tạo thành công chưa
      if (!fs.existsSync(pdfFilePath)) {
        console.error("PDF file not found:", pdfFilePath);
        return res.status(500).json({
          success: false,
          message: "PDF file not found after conversion",
        });
      }

      // Tạo file zip để gửi cả Excel và PDF
      const zipFilePath = path.join(exportsDir, `${fileName}.zip`);
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        // Gửi file zip cho client
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(path.basename(zipFilePath))}"`
        );
        fs.createReadStream(zipFilePath)
          .on("error", (err) => {
            console.error("Error reading zip file:", err);
            res.status(500).json({
              success: false,
              message: "Error reading zip file",
            });
          })
          .pipe(res)
          .on("finish", () => {
            // Xóa file tạm sau khi gửi
            fs.unlinkSync(excelFilePath);
            fs.unlinkSync(pdfFilePath);
            fs.unlinkSync(zipFilePath);
          });
      });

      archive.on("error", (err) => {
        console.error("Error creating zip file:", err);
        res.status(500).json({
          success: false,
          message: "Error creating zip file",
        });
      });

      archive.pipe(output);

      // Thêm file Excel và PDF vào zip
      archive.file(excelFilePath, { name: path.basename(excelFilePath) });
      archive.file(pdfFilePath, { name: path.basename(pdfFilePath) });

      await archive.finalize();
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


const gettongHopGvmExportSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("tongHopGvmExport", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const isValidPdf = async (filePath) => {
  try {
    const PDFDocument = require("pdf-lib").PDFDocument;
    const fileBuffer = fs.readFileSync(filePath);
    await PDFDocument.load(fileBuffer); // Attempt to load the PDF
    return true; // If no error, the PDF is valid
  } catch (error) {
    console.warn(`Invalid PDF file: ${filePath}. Skipping...`);
    return false; // If an error occurs, the PDF is invalid
  }
};

async function generateContractPdf(lecturer, outputPath, query) {
  console.log(`Generating contract PDF for: ${lecturer.HoTen}`);
  const { dot, ki, namHoc, loaiHopDong } = query;

  // Query contracts based on dot, ki, namHoc, and he_dao_tao
  const contractQuery = `
    SELECT *
    FROM hopdonggvmoi
    WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND he_dao_tao = ? AND HoTen = ?
  `;
  const contractParams = [dot, ki, namHoc, loaiHopDong, lecturer.HoTen];

  // Execute the query and generate the contract PDF
  // ...existing logic for generating contract PDF...
}

async function generateAppendixPdf(lecturer, outputPath, query) {
  console.log(`Generating appendix PDF for: ${lecturer.HoTen}`);
  const { dot, ki, namHoc, loaiHopDong } = query;

  // Query appendices based on dot, ki, namHoc, he_dao_tao, and lecturer's name in contracts
  const appendixQuery = `
    SELECT *
    FROM quychuan qc
    JOIN hopdonggvmoi hd ON qc.GiaoVienGiangDay LIKE CONCAT('%', hd.HoTen, '%')
    WHERE qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.he_dao_tao = ? AND hd.HoTen = ?
  `;
  const appendixParams = [dot, ki, namHoc, loaiHopDong, lecturer.HoTen];

  // Execute the query and generate the appendix PDF
  // ...existing logic for generating appendix PDF...
}

const exportAllContractsAndAppendices = async (req, res) => {
    let connection;
    try {
      const { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;
  
      if (!dot || !ki || !namHoc) {
        return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
      }
  
      connection = await createPoolConnection();

    // Fetch data for lecturers
    let lecturerQuery = `
      SELECT DISTINCT HoTen, id_Gvm
      FROM hopdonggvmoi
      WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND he_dao_tao = ?
    `;
    const lecturerParams = [dot, ki, namHoc, loaiHopDong];

    if (khoa && khoa !== "ALL") {
      lecturerQuery += ` AND MaPhongBan LIKE ?`;
      lecturerParams.push(`%${khoa}%`);
    }

    if (teacherName) {
      lecturerQuery += ` AND HoTen LIKE ?`;
      lecturerParams.push(`%${teacherName}%`);
    }

    const [lecturers] = await connection.execute(lecturerQuery, lecturerParams);

    if (!lecturers || lecturers.length === 0) {
      return res.status(404).send(        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/exportHD';</script>"
);
    }

    // Create a temporary directory for combined PDFs
    const tempDir = path.join(__dirname, "..", "public", "temp", Date.now().toString());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await loadPDFMerger(); // Ensure PDFMerger is loaded

    // In your main function where you merge PDFs:
for (const lecturer of lecturers) {
    try {
      const pdfMerger = new PDFMerger();
      let hasValidPdf = false;
  
      // Generate contract PDF
      const contractPdfPath = path.join(tempDir, `HopDong_${sanitizeFileName(lecturer.HoTen)}.pdf`);
      const contractGenerated = await generateContractPdfForLecturer(lecturer, contractPdfPath, req.query);
      
      if (contractGenerated && await isValidPdf(contractPdfPath)) {
        await pdfMerger.add(contractPdfPath);
        hasValidPdf = true;
  
        // Generate appendix PDF only if the contract PDF is valid
        const appendixPdfPath = path.join(tempDir, `PhuLuc_${sanitizeFileName(lecturer.HoTen)}.pdf`);
        const appendixGenerated = await generateAppendixPdfForLecturer(lecturer, appendixPdfPath, req.query);
  
        if (appendixGenerated && await isValidPdf(appendixPdfPath)) {
          await pdfMerger.add(appendixPdfPath);
        } else {
          console.warn(`Appendix PDF not generated or invalid for: ${lecturer.HoTen}`);
        }
      } else {
        console.warn(`Contract PDF not generated or invalid for: ${lecturer.HoTen}`);
      }
  
      if (hasValidPdf) {
        const combinedPdfPath = path.join(tempDir, `TongHop_${sanitizeFileName(lecturer.HoTen)}.pdf`);
        await pdfMerger.save(combinedPdfPath);
      } else {
        console.warn(`No valid PDFs to merge for: ${lecturer.HoTen}`);
      }
    } catch (error) {
      console.error(`Error processing lecturer ${lecturer.HoTen}:`, error);
    }
  }
    // Create a ZIP file containing all combined PDFs
    const zipFileName = `TongHop_Dot${dot}_Ki${ki}_${sanitizeFileName(namHoc)}_${sanitizeFileName(khoa || "all")}.zip`;
    const zipPath = path.join(tempDir, zipFileName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Archive created: ${archive.pointer()} total bytes`);
      
      // Send the ZIP file to the client
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);

      const readStream = fs.createReadStream(zipPath);
      readStream.pipe(res);

      readStream.on('end', () => {
        // Clean up temporary files
        setTimeout(() => {
          try {
            if (fs.existsSync(tempDir)) {
              deleteFolderRecursive(tempDir);
            }
          } catch (error) {
            console.error("Error cleaning up temporary directory:", error);
          }
        }, 1000);
      });

      readStream.on('error', (err) => {
        console.error("Error reading zip file:", err);
        res.status(500).send("Error reading zip file");
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Add files to archive
    fs.readdirSync(tempDir).forEach(file => {
      const filePath = path.join(tempDir, file);
      if (file.endsWith('.pdf')) {
        archive.file(filePath, { name: file });
      }
    });

    await archive.finalize();

  } catch (error) {
    console.error("Error in exportAllContractsAndAppendices:", error);
    if (!res.headersSent) {
      res.status(500).send(`Lỗi khi tạo file tổng hợp: ${error.message}`);
    }
  } finally {
    if (connection) connection.release();
  }
}

async function generateContractPdfForLecturer(lecturer, outputPath, query) {
    console.log(`Generating contract PDF for: ${lecturer.HoTen}`);
    
    // Create a mock response that properly handles the file
    const mockRes = {
      download: (filePath) => {
        return new Promise((resolve, reject) => {
          if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, outputPath);
            resolve();
          } else {
            reject(new Error('File not generated'));
          }
        });
      },
      status: () => mockRes,
      send: () => {}
    };
  
    await exportMultipleContracts(
      { query: { ...query, teacherName: lecturer.HoTen } },
      mockRes
    );
  
    if (!fs.existsSync(outputPath)) {
      console.warn(`Contract PDF not generated for: ${lecturer.HoTen}`);
      return false;
    }
    return true;
  }

async function generateAppendixPdfForLecturer(lecturer, outputPath, query) {
  console.log(`Generating appendix PDF for: ${lecturer.HoTen}`);
  const req = { query: { ...query, teacherName: lecturer.HoTen } };
  const tempFilePath = outputPath.replace(".pdf", "_temp.pdf"); // Temporary file path

  const res = {
    download: (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, tempFilePath); // Rename the file to a temporary path
      }
    },
  };

  await exportPhuLucGiangVienMoi(req, res);

  // Log if the temporary file exists
  if (fs.existsSync(tempFilePath)) {
    console.log(`Appendix PDF generated successfully for: ${lecturer.HoTen}`);
    fs.renameSync(tempFilePath, outputPath); // Rename to the final output path
    return true;
  } else {
    console.warn(`Appendix PDF not generated for: ${lecturer.HoTen}`);
    return false;
  }
}

module.exports = {
  gettongHopGvmExportSite,
  exportMultipleContracts,
  exportPhuLucGiangVienMoi,
  exportAllContractsAndAppendices,
};