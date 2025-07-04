const express = require("express");
const createPoolConnection = require("../config/databasePool");
const ExcelJS = require("exceljs");
const router = express.Router();
const mysql = require("mysql2/promise");
const xlsx = require("xlsx");
const path = require("path"); // Thêm dòng này
const fs = require("fs"); // Thêm dòng này

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]/gi, "_");
}
function convertToRoman(num) {
  const romanNumerals = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
    10: "X",
    11: "XI",
    12: "XII",
    13: "XIII",
    14: "XIV",
    15: "XV",
    16: "XVI",
    17: "XVII",
    18: "XVIII",
    19: "XIX",
    20: "XX",
  };

  return romanNumerals[num] || "Không xác định";
}

const getGvm = async (req, res) => {
  try {
    const gvmLists = await fetchHDGvmData();
    res.json(gvmLists); // Trả về danh sách giảng viên mời
  } catch (error) {
    console.error("Error fetching HD Gvm:", error);
    res.status(500).json({ message: "Internal Server Error" }); // Xử lý lỗi
  }
};

async function fetchHDGvmData() {
  const connection = await pool.getConnection(); // Lấy một connection từ pool

  try {
    const [rows] = await connection.execute("SELECT * FROM hopdonggvmoi");
    return rows;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error; // Xử lý lỗi tùy ý
  } finally {
    connection.release(); // Trả lại connection về pool
  }
}

// Hàm xuất dữ liệu ra Excel với định dạng đẹp hơn
const exportHDGvmToExcel = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách mức tiền từ bảng tienluong
    const tienLuongQuery = `
SELECT 
 he_dao_tao, 
  HocVi, 
  SoTien 
FROM 
  tienluong
`;
    const [tienLuongList] = await connection.execute(tienLuongQuery);

    const { dot, ki, namHoc, loaiHopDong, khoa } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đợt, kỳ hoặc năm học",
      });
    }

    let query = `
    SELECT
      MIN(hd.NgayBatDau) AS NgayBatDau,
      MAX(hd.NgayKetThuc) AS NgayKetThuc,
      hd.KiHoc,
      gv.GioiTinh,
      hd.HoTen,
      hd.NgaySinh,
      gv.MaPhongBan,
      gv.MonGiangDayChinh,
      gv.BangTotNghiepLoai,
      hd.CCCD,
      hd.NoiCapCCCD,
      hd.NgayCap,
      hd.Email,
      hd.MaSoThue,
      hd.HocVi,
      hd.ChucVu,
      hd.HSL,
      hd.DienThoai,
      hd.STK,
      hd.NganHang,
      SUM(hd.SoTiet) AS SoTiet,
      hd.DiaChi,
      hd.he_dao_tao,
      gv.NoiCongTac
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.HoTen = gv.HoTen
    WHERE
      hd.NamHoc = ? AND hd.Dot = ? AND hd.KiHoc = ? AND hd.he_dao_tao = ?`;

    // Chỉ thêm điều kiện MaPhongBan nếu khoa được định nghĩa và không phải là "ALL"
    if (khoa && khoa !== "ALL") {
      query += ` AND gv.MaPhongBan = ?`;
    }

    query += `
    GROUP BY
      hd.HoTen, hd.KiHoc, gv.GioiTinh, hd.NgaySinh, hd.CCCD, hd.NoiCapCCCD, 
      hd.Email, hd.MaSoThue, hd.HocVi, hd.ChucVu, hd.HSL, hd.DienThoai, 
      hd.STK, hd.NganHang, hd.DiaChi, hd.NgayCap, gv.NoiCongTac, gv.MaPhongBan, 
      gv.MonGiangDayChinh, gv.BangTotNghiepLoai, hd.he_dao_tao;
    `;

    // Tạo mảng tham số
    let params = [namHoc, dot, ki, loaiHopDong];

    if (khoa && khoa !== "ALL") {
      params.push(khoa);
    }
    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viêsn phù hợp điều kiện'); window.location.href='/infoHDGvm';</script>"
      );
    }

    // Tạo workbook và worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GiangVienMoi");

    // Định nghĩa các cột và tiêu đề
    worksheet.columns = [
      { header: "STT", key: "stt", width: 5 },
      { header: "Họ và Tên", key: "HoTen", width: 20 },
      { header: "Giới Tính", key: "GioiTinh", width: 12 },
      { header: "Ngày Sinh", key: "NgaySinh", width: 15 },
      { header: "Điện Thoại", key: "DienThoai", width: 15 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Học Vị", key: "HocVi", width: 10 },
      { header: "Chức Vụ", key: "ChucVu", width: 12 },
      { header: "Hệ Số Lương", key: "HSL", width: 10 },
      { header: "Nơi Công Tác", key: "NoiCongTac", width: 20 },
      { header: "Số CCCD", key: "CCCD", width: 15 },
      { header: "Ngày Cấp", key: "NgayCap", width: 15 },
      { header: "Nơi Cấp", key: "NoiCapCCCD", width: 15 },
      // { header: "Địa Chỉ Theo CCCD", key: "DiaChi", width: 20 },
      { header: "Địa Chỉ", key: "DiaChi", width: 20 },
      { header: "Mã Số Thuế", key: "MaSoThue", width: 15 },
      { header: "Số Tài Khoản", key: "STK", width: 15 },
      { header: "Tại Ngân Hàng", key: "NganHang", width: 20 },
      { header: "Khoa", key: "MaPhongBan", width: 20 },
      { header: "Bộ Môn", key: "MonGiangDayChinh", width: 20 },
      { header: "Ngày Ký Hợp Đồng", key: "NgayBatDau", width: 15 }, // Thêm cột Ngày Ký
      { header: "Kỳ", key: "KiHoc", width: 10 },
      { header: "Thời Gian Thực Hiện", key: "ThoiGianThucHien", width: 30 }, // Cập nhật ở đây
      { header: "Số Tiết", key: "SoTiet", width: 10 },
      {
        header: "Số Tiền",
        key: "SoTien",
        width: 15,
        style: { numFmt: "#,##0" },
      },
      { header: "Số Tiền Bằng Chữ", key: "BangChuSoTien", width: 30 },
      {
        header: "Trừ Thuế",
        key: "TruThue",
        width: 15,
        style: { numFmt: "#,##0" },
      },
      { header: "Trừ Thuế Bằng Chữ", key: "BangChuTruThue", width: 30 },
      {
        header: "Thực Nhận",
        key: "ThucNhan",
        width: 15,
        style: { numFmt: "#,##0" },
      },
      { header: "Thực Nhận Bằng Chữ", key: "BangChuThucNhan", width: 30 },
      { header: "Ngày Nghiệm Thu", key: "NgayNghiemThu", width: 15 }, // Thêm cột Ngày Nghiệm Thu
    ];

    function tinhSoTien(row, soTiet) {
      const tienLuong = tienLuongList.find(
        (tl) => tl.he_dao_tao === row.he_dao_tao && tl.HocVi === row.HocVi
      );
      if (tienLuong) {
        return soTiet * tienLuong.SoTien;
      } else {
        return 0;
      }
    }
    // Thêm dữ liệu vào bảng và tính toán các cột mới
    rows.forEach((row, index) => {
      const soTiet = row.SoTiet;
      const soTien = tinhSoTien(row, soTiet); // Tính toán soTien
      const truThue = soTien * 0.1; // Trừ Thuế = 10% của Số Tiền
      const thucNhan = soTien - truThue; // Thực Nhận = Số Tiền - Trừ Thuế
      // ...
      // Sửa lại ngày bắt đầu
      const utcBatDau = new Date(row.NgayBatDau);
      row.NgayBatDau = utcBatDau.toLocaleDateString("vi-VN"); // Chỉ lấy phần ngày

      // Sửa lại ngày kết thúc
      const utcKetThuc = new Date(row.NgayKetThuc);
      row.NgayKetThuc = utcKetThuc.toLocaleDateString("vi-VN"); // Chỉ lấy phần ngày

      // Sửa lại ngày sinh
      const utcSinh = new Date(row.NgaySinh);
      row.NgaySinh = utcSinh.toLocaleDateString("vi-VN"); // Chỉ lấy phần ngày

      const kiLaMa = convertToRoman(row.KiHoc);

      const thoiGianThucHien = `${utcBatDau.toLocaleDateString(
        "vi-VN"
      )} - ${utcKetThuc.toLocaleDateString("vi-VN")}`;

      // het
      worksheet.addRow({
        stt: index + 1, // Thêm số thứ tự

        ...row,
        KiHoc: kiLaMa,
        ThoiGianThucHien: thoiGianThucHien, // Thêm cột Thời Gian Thực Hiện
        SoTien: soTien,
        BangChuSoTien: numberToWords(soTien), // Sử dụng hàm mới
        TruThue: truThue,
        BangChuTruThue: numberToWords(truThue), // Sử dụng hàm mới
        ThucNhan: thucNhan,
        BangChuThucNhan: numberToWords(thucNhan), // Sử dụng hàm mới
        NgayNghiemThu: row.NgayKetThuc,
      });
    });

    // Định dạng tiêu đề (in đậm và căn giữa)
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt kiểu chữ và cỡ chữ cho tiêu đề
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    // Thêm border cho các ô trong bảng
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.font = { name: "Times New Roman", size: 12 }; // Đặt kiểu chữ cho từng ô

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    let fileName = `ThongTinHopDong_${namHoc}_Dot${dot}_Ki${ki}`;
    if (khoa && khoa !== "ALL") {
      fileName += `_${sanitizeFileName(khoa)}`;
    }
    fileName += ".xlsx";

    // Ghi file Excel
    const filePath = path.join(__dirname, "../public/exports", fileName);
    await workbook.xlsx.writeFile(filePath);

    // Gửi file để download
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Error downloading file");
      }
      // Xóa file sau khi đã gửi
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release();
  }
};

// hàm chuyển tiền sang chữ số
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
const getHDGvmData = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    // Lấy dữ liệu từ session
    const isKhoa = req.session.isKhoa;

    // Lấy dữ liệu từ front-end
    const namHoc = req.query.namHoc;
    const dot = req.query.dot;
    const ki = req.query.ki;
    let khoa = req.query.khoa;
    const loaiHopDong = req.query.loaiHopDong;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    let query = `
    SELECT
      MIN(NgayBatDau) AS NgayBatDau,
      MAX(NgayKetThuc) AS NgayKetThuc,
      KiHoc,
      DanhXung,
      HoTen,
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
      SUM(SoTiet) AS SoTiet
    FROM
      hopdonggvmoi
    WHERE
      NamHoc = ? AND Dot = ? AND KiHoc = ? AND he_dao_tao = ?
  `;

    const queryParams = [namHoc, dot, ki, loaiHopDong];

    // Thêm điều kiện lọc theo khoa nếu có
    if (khoa && khoa !== "ALL") {
      query += ` AND MaPhongBan = ?`;
      queryParams.push(khoa);
    }

    query += `
    GROUP BY
      HoTen, KiHoc, DanhXung, NgaySinh, CCCD, NoiCapCCCD, Email,
      MaSoThue, HocVi, ChucVu, HSL, DienThoai, STK, NganHang
  `;

    const [rows] = await connection.execute(query, queryParams);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching HD Gvm data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

// classInfoGVMController lấy hàm này
const getHopDongDuKienData = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const MaPhongBan = req.session.MaPhongBan;
    // Lấy dữ liệu từ session
    const isKhoa = req.session.isKhoa;

    // Lấy dữ liệu từ front-end gửi
    const namHoc = req.query.namHoc;
    const dot = req.query.dot;
    let ki = req.query.ki;
    const he_dao_tao = req.query.he_dao_tao;
    let khoa = req.query.khoa;

    // Nếu là khoa thì chỉ lấy dữ liệu khoa đó
    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }
    let params = [];

    let query = `
WITH DoAnHopDongDuKien AS (
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
    NgayBatDau,
    NgayKetThuc,
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
    100000 AS TienMoiGiang,
    CASE 
      WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
      WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
      ELSE std.so_tiet_2
    END * 100000 AS ThanhTien,
    CASE 
      WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
      WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
      ELSE std.so_tiet_2
    END * 100000 * 0.1 AS Thue,
    CASE 
      WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
      WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
      ELSE std.so_tiet_2
    END * 100000 * 0.9 AS ThucNhan

  FROM (
    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV1' AS Nguon,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien1 IS NOT NULL
      AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')

    UNION ALL

    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV2' AS Nguon,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien2 IS NOT NULL 
      AND GiangVien2 != 'không'
      AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
  ) AS Combined
  JOIN gvmoi gv ON Combined.GiangVien = gv.HoTen
  JOIN sotietdoan std ON Combined.he_dao_tao = std.he_dao_tao
  WHERE Combined.NamHoc = '${namHoc}'
),
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
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
		    gv.NoiCongTac,
		    gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        tl.SoTien AS TienMoiGiang,
        tl.SoTien * qc.QuyChuan AS ThanhTien,
        tl.SoTien * qc.QuyChuan * 0.1 AS Thue,
        tl.SoTien * qc.QuyChuan * 0.9 AS ThucNhan
    FROM 
        quychuan qc
    JOIN 
        gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
    LEFT JOIN 
        tienluong tl ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi
    WHERE
        qc.MoiGiang = 1 AND qc.he_dao_tao like '%Đại học%' AND qc.NamHoc = '${namHoc}'
    ),
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
            qc.NamHoc,
            qc.KiHoc,
            qc.Dot,
            gv.NgayCapCCCD,
            gv.DiaChi,
            gv.BangTotNghiep, 
            gv.NoiCongTac,
            gv.BangTotNghiepLoai,
            gv.MonGiangDayChinh,
            tl.SoTien
        FROM 
            quychuan qc
        JOIN 
            gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
        LEFT JOIN 
            tienluong tl ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi
        WHERE
            qc.he_dao_tao NOT LIKE '%Đại học%' AND qc.NamHoc = '${namHoc}'
    ),
    SauDaiHocHopDongDuKien AS (
        SELECT
            NgayBatDau,
            NgayKetThuc,
            id_Gvm,
            GioiTinh,
            HoTen,
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
            SoTiet,
            he_dao_tao,
            NamHoc,
            KiHoc,
            Dot,
            NgayCapCCCD,
            DiaChi,
            BangTotNghiep,
            NoiCongTac,
            BangTotNghiepLoai,
            MonGiangDayChinh,
            SoTien AS TienMoiGiang,
            ROUND(SoTien * SoTiet, 0) AS ThanhTien,
            ROUND(SoTien * SoTiet * 0.1, 0) AS Thue,
            ROUND(SoTien * SoTiet * 0.9, 0) AS ThucNhan
        FROM SoTietSauDaiHoc
    ),
    tableALL AS (SELECT
        Dot,
        KiHoc,
        NamHoc,
        'DoAn' AS LoaiHopDong,
        id_Gvm,
        GiangVien,
        he_dao_tao,
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
    ),`;

    query += `-- Giảng viên có hướng dẫn sinh viên thuộc khoa (ví dụ khoa  là 'CT')
    gv_lien_quan AS (
        SELECT DISTINCT GiangVien
        FROM tableALL
        WHERE tableALL.MaKhoaMonHoc LIKE ?  `;

    params.push(khoa);
    // Nếu không phải là cả năm
    if (ki !== "AllKi") {
      query += " AND dot = ? AND KiHoc = ?";
      params.push(dot, ki);
    }

    query += `)
    SELECT 
        MIN(ta.Dot) AS Dot,
        MIN(ta.KiHoc) AS KiHoc,
        ta.NamHoc,
        ta.id_Gvm,
        ta.GiangVien,
        MIN(ta.he_dao_tao) as he_dao_tao,
        MIN(ta.NgayBatDau) AS NgayBatDau,
        MAX(ta.NgayKetThuc) AS NgayKetThuc,
        SUM(ta.SoTiet) AS TongTiet,
        ta.GioiTinh,
        ta.NgaySinh,
        ta.CCCD,
        ta.NoiCapCCCD,
        ta.Email,
        ta.MaSoThue,
        ta.HocVi,
        ta.ChucVu,
        ta.HSL,
        ta.DienThoai,
        ta.STK,
        ta.NganHang,
        ta.MaPhongBan,
        MIN(ta.MaKhoaMonHoc) AS MaKhoaMonHoc,
        ta.NgayCapCCCD,
        ta.DiaChi,
        ta.BangTotNghiep, 
        ta.NoiCongTac,
        ta.BangTotNghiepLoai,
        ta.MonGiangDayChinh,
        MAX(TienMoiGiang) AS TienMoiGiang,
        SUM(ThanhTien) AS ThanhTien,
        SUM(Thue) AS Thue,
        SUM(ThucNhan) AS ThucNhan,
        tsgv.TongSoTiet
    FROM
        tableALL ta
    LEFT JOIN 
        TongSoTietGV tsgv 
    ON 
        ta.GiangVien = tsgv.GiangVien
    `;

    if (khoa !== "ALL") {
      query += " JOIN gv_lien_quan ON gv_lien_quan.GiangVien = ta.GiangVien";
    }

    query += `
    where namhoc = ?`;
    params.push(namHoc);

    // Kiểm tra nếu ki là "AllKi", không thêm điều kiện lọc theo kỳ
    if (ki !== "AllKi") {
      query += " AND dot = ? AND KiHoc = ?";
      params.push(dot, ki);
    }

    // Kiểm tra nếu ki là "AllKi", không thêm điều kiện lọc theo kỳ
    if (he_dao_tao !== "AllHe") {
      query += " AND he_dao_tao = ?";
      params.push(he_dao_tao);
    }

    // if (khoa !== "ALL") {
    //   query += " AND MaPhongBan =?";
    //   params.push(khoa);
    // }

    query += `
    GROUP BY 
        ta.NamHoc,
        ta.id_Gvm,
        ta.GiangVien,
        ta.GioiTinh,
        ta.NgaySinh,
        ta.CCCD,
        ta.NoiCapCCCD,
        ta.Email,
        ta.MaSoThue,
        ta.HocVi,
        ta.ChucVu,
        ta.HSL,
        ta.DienThoai,
        ta.STK,
        ta.NganHang,
        ta.MaPhongBan,
        ta.NgayCapCCCD,
        ta.DiaChi,
        ta.BangTotNghiep, 
        ta.NoiCongTac,
        ta.BangTotNghiepLoai,
        ta.MonGiangDayChinh,
        tsgv.TongSoTiet`;

    query += ` ORDER BY 
      tsgv.TongSoTiet DESC;`;

    const [rows] = await connection.execute(query, params);

    // Lấy số tiết định mức
    query = `select GiangDay from sotietdinhmuc`;
    const [SoTietDinhMucRow] = await connection.query(query);

    // Lấy tiền mời giảng ứng với mỗi hệ đào tạo

    const SoTietDinhMuc = SoTietDinhMucRow[0]?.GiangDay || 0;
    const result = { dataDuKien: rows, SoTietDinhMuc };
    // Trả dữ liệu về client dưới dạng JSON
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching HD Gvm data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getHopDongDuKien = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    // Lấy danh sách phòng ban để lọc
    const qrPhongBan = `select * from phongban where isKhoa = 1`;
    const [phongBanList] = await connection.query(qrPhongBan);

    res.render("hopDongDuKien.ejs", {
      phongBanList: phongBanList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  exportHDGvmToExcel,
  getHDGvmData,
  getHopDongDuKienData,
  getHopDongDuKien,
};
