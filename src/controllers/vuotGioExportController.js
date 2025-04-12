const express = require("express");
const ExcelJS = require("exceljs");
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const path = require("path");

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
const exportVuotGio = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const { namHoc, khoa, teacherName } = req.query;  // Dùng teacherName thay cho giangVien

    // Kiểm tra các tham số đầu vào
    if (!namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin năm học",
      });
    }

    const sanitizeFileName = (namHoc) => {
      return namHoc.replace(/__/g, "_"); // Thay thế hai dấu gạch dưới thành một dấu gạch dưới
  };
  
  const sanitizedNamHoc = sanitizeFileName(namHoc);
  
    const sanitizedKhoa = khoa === "ALL" ? null : sanitizeFileName(khoa);

    // Các truy vấn SQL
    let queryGiangDay = `
      SELECT DISTINCT
        TenHocPhan AS TenHocPhan, 
        SoTC, 
        Lop, 
        QuyChuan, 
        LenLop, 
        HocKy, 
        NamHoc AS Nam, 
        Khoa, 
        GiangVien,
       he_dao_tao
      FROM giangday
      WHERE NamHoc = ? AND (Khoa = ? OR ? IS NULL) AND (GiangVien = ? OR ? IS NULL) AND id_User != 1
    `;

    let queryLopNgoaiQuyChuan = `
      SELECT DISTINCT
        TenHocPhan AS TenHocPhan, 
        SoTC, 
        Lop, 
        QuyChuan, 
        LenLop, 
        HocKy, 
        NamHoc AS Nam, 
        Khoa, 
        GiangVien,
        he_dao_tao 
      FROM lopngoaiquychuan
      WHERE NamHoc = ? AND (Khoa = ? OR ? IS NULL) AND (GiangVien = ? OR ? IS NULL) 
    `;

    let queryGiuaky = `
      SELECT DISTINCT
        TenHocPhan AS TenHocPhanGK, 
        NamHoc AS Nam, 
        Khoa, 
        GiangVien, 
        HinhThucKTGiuaKy, 
        SoDe, 
        SoTietKT, 
        SoSV, 
        Lop AS LopGK,
        HocKy,
        he_dao_tao
      FROM giuaky
      WHERE NamHoc = ? AND (Khoa = ? OR ? IS NULL) AND (GiangVien = ? OR ? IS NULL) 
    `;

    let queryExportDoAnTotNghiep = `
      SELECT DISTINCT
        NamHoc AS Nam, 
        GiangVien,
        MaPhongBan AS Khoa, 
        SinhVien, 
        KhoaDaoTao, 
        SoNguoi, 
        SoTiet, 
        isHDChinh
      FROM exportdoantotnghiep 
      WHERE NamHoc = ? AND (MaPhongBan = ? OR ? IS NULL) AND (GiangVien = ? OR ? IS NULL) AND isMoiGiang != 1
    `;

    let queryNhanVien = `
      SELECT DISTINCT
        TenNhanVien AS GiangVien, 
        MaPhongBan AS Khoa, 
        HSL,
        NgaySinh, 
        HocVi, 
        ChucVu,
        PhanTramMienGiam, 
        MonGiangDayChinh,
        ChucVu
      FROM nhanvien
      WHERE (MaPhongBan = ? OR ? IS NULL) AND (TenNhanVien = ? OR ? IS NULL) 
    `;
    let queryBoMon = `
    SELECT MaBoMon, TenBoMon 
    FROM bomon
  `;
  
  const [resultsBoMon] = await connection.query(queryBoMon);

  let querySoTietDinhMuc = `
    SELECT GiangDay, NCKH, VuotGio
    FROM sotietdinhmuc
   
  `;

  const [resultsSoTietDinhMuc] = await connection.query(querySoTietDinhMuc);
    
  let queryDetaiDuan = `
  SELECT 
    NamHoc, 
    CapDeTai, 
    TenDeTai, 
    ChuNhiem, 
    ThuKy, 
    DanhSachThanhVien, 
    NgayNghiemThu
  FROM detaiduan
WHERE NamHoc = ? 
AND (
  ChuNhiem = ?
  OR ThuKy = ? 
  OR DanhSachThanhVien LIKE ? 
  OR ? IS NULL
)
`;
let queryBaiBaoKhoa = `
  SELECT 
    TenBaiBao, 
    LoaiTapChi, 
    ChiSoTapChi, 
    TacGia, 
    TacGiaChiuTrachNhiem, 
    DanhSachThanhVien 
  FROM baibaokhoahoc
  WHERE NamHoc = ? 
  AND (
    TacGia = ? 
    OR TacGiaChiuTrachNhiem = ? 
    OR DanhSachThanhVien LIKE ?
    OR ? IS NULL
  )
`;

let queryBangSangCheVaGiaiThuong = `
  SELECT 
    TenBangSangCheVaGiaiThuong, 
    TacGia, 
    SoQDCongNhan, 
    NgayQDCongNhan, 
    DanhSachThanhVien 
  FROM bangsangchevagiaithuong
  WHERE NamHoc = ? 
  AND (
    TacGia = ? 
    OR DanhSachThanhVien LIKE ?
    OR ? IS NULL
  )
`;
let querySachVaGiaoTrinh = `
  SELECT 
    TenSachVaGiaoTrinh, 
    TacGia, 
    SoXuatBan, 
    SoTrang,  
    DanhSachThanhVien,
    DongChuBien 
  FROM sachvagiaotrinh
  WHERE NamHoc = ? 
  AND (
    TacGia = ? 
    OR DanhSachThanhVien LIKE ?
    OR DongChuBien = ?
    OR ? IS NULL
  )
`;
let queryNCKHVaHuanLuyen = `
  SELECT 
    TenDeTai, 
    SoQDGiaoNhiemVu, 
    KetQuaCapKhoa, 
    KetQuaCapHocVien,  
    DanhSachThanhVien,
    NgayQDGiaoNhiemVu ,
    DanhSachThanhVien
  FROM nckhvahuanluyendoituyen
  WHERE NamHoc = ? 
   AND (
     DanhSachThanhVien LIKE ?
    OR ? IS NULL
  )
`;
let queryXayDungCongTacDaoTao = `
  SELECT 
    TenChuongTrinh, 
    SoTC, 
    SoQDGiaoNhiemVu, 
    NgayQDGiaoNhiemVu,  
    HinhThucXayDung,
    DanhSachThanhVien 
  FROM xaydungctdt
  WHERE NamHoc = ? 
   AND (
     DanhSachThanhVien LIKE ?
    OR ? IS NULL
  )
`;
let queryBienSoanGiaoTrinhBaiGiang = `
  SELECT 
    TenGiaoTrinhBaiGiang, 
    TacGia, 
    SoTC, 
    SoQDGiaoNhiemVu,  
    DanhSachThanhVien,
    NgayQDGiaoNhiemVu
  FROM biensoangiaotrinhbaigiang
  WHERE NamHoc = ? 
  AND (
    TacGia = ? 
    OR DanhSachThanhVien LIKE ? 
    OR ? IS NULL
  )
`;
    // Thực thi các truy vấn với tham số teacherName (giảng viên)
     const [resultsGiangDay] = await connection.query(queryGiangDay, [namHoc, sanitizedKhoa, sanitizedKhoa, teacherName || null, teacherName || null]);
    const [resultsLopNgoaiQuyChuan] = await connection.query(queryLopNgoaiQuyChuan, [namHoc, sanitizedKhoa, sanitizedKhoa, teacherName || null, teacherName || null]);
    const [resultsGiuaky] = await connection.query(queryGiuaky, [namHoc, sanitizedKhoa, sanitizedKhoa, teacherName || null, teacherName || null]);
    const [resultsExportDoAnTotNghiep] = await connection.query(queryExportDoAnTotNghiep, [namHoc, sanitizedKhoa, sanitizedKhoa, teacherName || null, teacherName || null]);
    const [resultsNhanVien] = await connection.query(queryNhanVien, [sanitizedKhoa, sanitizedKhoa, teacherName || null, teacherName || null]);
    const [resultsDetaiDuan] = await connection.query(queryDetaiDuan, [
      namHoc, 
      teacherName || null, 
      teacherName || null, 
      `%${teacherName}%`, 
      teacherName || null
    ]);

    const [resultsBaiBaoKhoa] = await connection.query(queryBaiBaoKhoa, [
      namHoc, 
      teacherName || null, 
      teacherName || null, 
      `%${teacherName}%`, 
      teacherName || null
    ]);
    const [resultsBangSangCheVaGiaiThuong] = await connection.query(queryBangSangCheVaGiaiThuong, [
      namHoc, 
      teacherName || null, 
      `%${teacherName}%`, 
      teacherName || null
    ]);
    
    const [resultsSachVaGiaoTrinh] = await connection.query(querySachVaGiaoTrinh, [
      namHoc, 
      teacherName || null, 
      teacherName || null,
      `%${teacherName}%`, 
      teacherName || null
    ]);

    const [resultsNCKHVaHuanLuyen] = await connection.query(queryNCKHVaHuanLuyen, [
      namHoc,
      `%${teacherName}%`, 
      teacherName || null
    ]);
    const [resultsXayDungCongTacDaoTao] = await connection.query(queryXayDungCongTacDaoTao, [
      namHoc,
      `%${teacherName}%`, 
      teacherName || null
    ]);
    const [resultsBienSoanGiaoTrinhBaiGiang] = await connection.query(queryBienSoanGiaoTrinhBaiGiang, [
      namHoc, 
      teacherName || null, 
      `%${teacherName}%`, 
      teacherName || null
    ]);

    // .
        // Kiểm tra kết quả truy vấn
    if (
      resultsGiangDay.length === 0 &&
      resultsLopNgoaiQuyChuan.length === 0 &&
      resultsGiuaky.length === 0 &&
      resultsExportDoAnTotNghiep.length === 0 &&
      resultsDetaiDuan.length === 0 &&
      resultsBaiBaoKhoa.length === 0 &&
      resultsBangSangCheVaGiaiThuong.length === 0 &&
      resultsSachVaGiaoTrinh.length === 0 &&
      resultsNCKHVaHuanLuyen.length === 0 &&
      resultsXayDungCongTacDaoTao.length === 0 &&
      resultsBienSoanGiaoTrinhBaiGiang.length === 0
    ) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/vuotGioExport';</script>"
      );
    }

    // Kết hợp dữ liệu từ các bảng
    const combinedResults = [...resultsGiangDay, ...resultsLopNgoaiQuyChuan];

    // Nếu không có giảng viên chọn, lấy danh sách tất cả giảng viên trong khoa
    // Lấy danh sách giảng viên từ Chủ nhiệm, Thư ký và Danh sách thành viên
const giangVienList = new Set([
  ...resultsNhanVien.map(nv => nv.GiangVien.trim()), 
  ...resultsGiangDay.map(gd => gd.GiangVien.trim()), 
  ...resultsLopNgoaiQuyChuan.map(lq => lq.GiangVien.trim()), 
  ...resultsGiuaky.map(gy => gy.GiangVien.trim()), 
  ...resultsExportDoAnTotNghiep.map(ed => ed.GiangVien.trim()), 
  // ...resultsDetaiDuan.flatMap(row => [
  //   row.ChuNhiem.trim(),
  //   row.ThuKy.trim(),
  //   ...row.DanhSachThanhVien.split(',').map(name => name.trim())
  // ])
]);
console.log("abc",resultsNCKHVaHuanLuyen)

    // Loại bỏ các giảng viên trùng lặp
    const uniqueGiangVienList = [...new Set(giangVienList)];

    const workbook = new ExcelJS.Workbook();
    uniqueGiangVienList.forEach((giangVien) => {
      // Ensure giangVien is not empty
      if (!giangVien) {
        return;
      }

      // Lọc dữ liệu cho giảng viên này
      const giangVienInfo = resultsNhanVien.find((nv) => nv.GiangVien.trim() === giangVien.trim());
      const filteredCombinedResults = combinedResults.filter(
        (row) => row.GiangVien === giangVien
      );

      const filteredGiuaKy = resultsGiuaky.filter(
        row => row.GiangVien.trim() === giangVien.trim()
      );

      const filteredExportDoAnTotNghiep = resultsExportDoAnTotNghiep.filter(
        row => row.GiangVien.trim() === giangVien.trim()
      );

    // Hàm tách tên giảng viên khỏi phần thông tin trong ngoặc
const extractTeacherName = (name) => {
  const match = name.trim().match(/^(.*?)(?:\s*\(.*\))?$/);
  return match ? match[1].trim() : name.trim();
};

// Lọc dữ liệu phù hợp với giảng viên này
const filteredDetaiDuan = resultsDetaiDuan.filter(row => {
  const chuNhiem = extractTeacherName(row.ChuNhiem);
  const thuKy = extractTeacherName(row.ThuKy);
  const danhSachThanhVien = row.DanhSachThanhVien.split(',').map(name => extractTeacherName(name));

  return chuNhiem === giangVien || thuKy === giangVien || danhSachThanhVien.includes(giangVien);
});
const filteredBaiBaoKhoa = resultsBaiBaoKhoa.filter(row => {
  const tacGia = extractTeacherName(row.TacGia);
  const tacGiaChiuTrachNhiem = extractTeacherName(row.TacGiaChiuTrachNhiem);
  const danhSachThanhVien = row.DanhSachThanhVien.split(',').map(name => extractTeacherName(name));

  return tacGia === giangVien || tacGiaChiuTrachNhiem === giangVien || danhSachThanhVien.includes(giangVien);
});

const filteredBangSangCheVaGiaiThuong = resultsBangSangCheVaGiaiThuong.filter(row => {
  const tacGia = extractTeacherName(row.TacGia);
  const danhSachThanhVien = row.DanhSachThanhVien.split(',').map(name => extractTeacherName(name));

  return tacGia === giangVien || danhSachThanhVien.includes(giangVien);
});

const filteredSachVaGiaoTrinh = resultsSachVaGiaoTrinh.filter(row => {
  const tacGia = extractTeacherName(row.TacGia);
  const danhSachThanhVien = row.DanhSachThanhVien.split(',').map(name => extractTeacherName(name));
  const DongChuBien = extractTeacherName(row.DongChuBien);

  return tacGia === giangVien || danhSachThanhVien.includes(giangVien) || DongChuBien === giangVien;
});

const filteredNCKHVaHuanLuyen = resultsNCKHVaHuanLuyen.filter(row => {
  const danhSachThanhVien = row.DanhSachThanhVien.split(',').map(name => extractTeacherName(name));

  return danhSachThanhVien.includes(giangVien);
});

const filteredXayDungCongTacDaoTao = resultsXayDungCongTacDaoTao.filter(row => {
  const danhSachThanhVien = row.DanhSachThanhVien.split(',').map(name => extractTeacherName(name));

  return danhSachThanhVien.includes(giangVien);
});

const filteredBienSoanGiaoTrinhBaiGiang = resultsBienSoanGiaoTrinhBaiGiang.filter(row => {
  const tacGia = extractTeacherName(row.TacGia);

  const danhSachThanhVien = row.DanhSachThanhVien.split(',').map(name => extractTeacherName(name));

  return tacGia === giangVien ||danhSachThanhVien.includes(giangVien);
});
console.log("abcs",filteredNCKHVaHuanLuyen)
      // Kiểm tra xem có bất kỳ dữ liệu nào liên quan đến giảng viên này không
      if (
        filteredCombinedResults.length === 0 &&
        filteredGiuaKy.length === 0 &&
        filteredExportDoAnTotNghiep.length === 0 && 
        filteredDetaiDuan.length === 0 &&
        filteredBaiBaoKhoa.length === 0 &&
        filteredBangSangCheVaGiaiThuong.length === 0 &&
        filteredSachVaGiaoTrinh.length === 0 &&
        filteredNCKHVaHuanLuyen.length === 0
      ) {
        // Nếu không có dữ liệu, bỏ qua giảng viên này
        return;
      }
      
      const worksheet = workbook.addWorksheet(giangVien);


  // Tiến hành xử lý và ghi dữ liệu vào worksheet cho giảng viên này

  const filteredGroupedResults = {
    "Kỳ 1": {
      "Đào tạo hệ đóng học phí": filteredCombinedResults.filter(
        (row) => row.HocKy == "1" && row.he_dao_tao === "Đại học (Đóng học phí)"
      ),
      "Đào tạo chuyên ngành Kỹ thuật mật mã": filteredCombinedResults.filter(
        (row) => row.HocKy == "1" && row.he_dao_tao === "Đại học (Mật mã)"
      ),
    },
    "Kỳ 2": {
      "Đào tạo hệ đóng học phí": filteredCombinedResults.filter(
        (row) => row.HocKy == "2" && row.he_dao_tao === "Đại học (Đóng học phí)"
      ),
      "Đào tạo chuyên ngành Kỹ thuật mật mã": filteredCombinedResults.filter(
        (row) => row.HocKy == "2" && row.he_dao_tao === "Đại học (Mật mã)"
      ),
    },
  };

  const filteredGroupedResultsGiuaKy = {
    "Kỳ 1": {
      "Đào tạo hệ đóng học phí": filteredGiuaKy.filter(
        (row) => row.HocKy == "1" && row.he_dao_tao === "Đại học (Đóng học phí)"
      ),
      "Đào tạo chuyên ngành Kỹ thuật mật mã": filteredGiuaKy.filter(
        (row) => row.HocKy == "1" && row.he_dao_tao === "Đại học (Mật mã)"
      ),
    },
    "Kỳ 2": {
      "Đào tạo hệ đóng học phí": filteredGiuaKy.filter(
        (row) => row.HocKy == "2" && row.he_dao_tao === "Đại học (Đóng học phí)"
      ),
      "Đào tạo chuyên ngành Kỹ thuật mật mã": filteredGiuaKy.filter(
        (row) => row.HocKy == "2" && row.he_dao_tao === "Đại học (Mật mã)"
      ),
    },
  };



      worksheet.pageSetup = {
        paperSize: 9, // A4 paper size
        orientation: "portait",
        fitToPage: true, // Fit to page
        fitToWidth: 1, // Fit to width
        fitToHeight: 0, // Do not fit to height
        margins: {
          left: 0.196850393700787,
          right: 0.196850393700787,
          top: 0.393700787401575,
          bottom: 0.393700787401575,
          header: 0.196850393700787,
          footer: 0.196850393700787,
        },
      };
      // Thêm tiêu đề header
      const titleRow1 = worksheet.addRow([
        "HỌC VIỆN KỸ THUẬT MẬT MÃ",
        "",
        "",
        "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      ]);
      titleRow1.font = { name: "Times New Roman", size: 12, bold: true }; // Tăng kích thước phông chữ
      titleRow1.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);
      worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);
      titleRow1.height = 25; // Tăng chiều cao hàng

      const titleRow2 = worksheet.addRow([ `Khoa: ${giangVienInfo?.Khoa}`, "", "", "Độc lập - Tự do - Hạnh phúc"]);
      titleRow2.font = { name: "Times New Roman", size: 12, bold: true, };

      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:C${titleRow2.number}`);
      worksheet.mergeCells(`D${titleRow2.number}:G${titleRow2.number}`);
      titleRow2.height = 25; // Tăng chiều cao hàng


      const giangVienBoMon = resultsBoMon.find(
        (bm) => bm.MaBoMon === giangVienInfo?.MonGiangDayChinh
      );
      
      const titleRow3 = worksheet.addRow([
        `Bộ môn: ${giangVienBoMon ? giangVienBoMon.TenBoMon : "Không xác định"}`,
        "",
        "",
        "Hà Nội, ngày tháng năm " + formatDateDMY(new Date()),
      ]);
      titleRow3.font = { name: "Times New Roman", size: 12 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:C${titleRow3.number}`);
      worksheet.mergeCells(`D${titleRow3.number}:G${titleRow3.number}`);
      titleRow3.height = 25; // Tăng chiều cao hàng

      worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách

      // Thêm tiêu đề cho các phần tiếp theo
      const titleRow4 = worksheet.addRow(["Kê khai"]);
      titleRow4.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow4.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow4.number}:G${titleRow4.number}`);
      titleRow4.height = 25; // Tăng chiều cao hàng

      // After defining sanitizedNamHoc
      const titleRow5 = worksheet.addRow([`Khối lượng thực hiện nhiệm vụ đào tạo, khoa học và công nghệ năm học ${sanitizedNamHoc}`]);
      titleRow5.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow5.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      }; // Bật chế độ tự động xuống dòng
      worksheet.mergeCells(`A${titleRow5.number}:G${titleRow5.number}`);
      titleRow5.height = 25; // Increase row height

      const titleRow7 = worksheet.addRow([
        "(Căn cứ theo Quyết định số 1409/QĐ-HVM ngày 30/12/2021 về việc quy định chế độ làm việc của giảng viên Học viện Kỹ thuật mật mã)",
      ]);
      titleRow7.font = { name: "Times New Roman", size: 12 };
      titleRow7.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.mergeCells(`A${titleRow7.number}:G${titleRow7.number}`);
      titleRow7.height = 55; // Tăng chiều cao hàng

      worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách
      // Thêm dòng thông tin cá nhân
      // Thêm dòng thông tin cá nhân
      const titleRow9 = worksheet.addRow([`Họ và tên: ${giangVien}`, "", "", `Ngày sinh:  ${formatDateDMY(new Date(giangVienInfo?.NgaySinh))}`]);
      titleRow9.font = { name: "Times New Roman", size: 12 };
      titleRow9.alignment = { horizontal: "left", vertical: "middle" };
      worksheet.mergeCells(`A9:C9`); // Gộp ô A9 đến C9

      const titleRow11 = worksheet.addRow([`Học hàm / học vị: ${giangVienInfo?.HocVi}`]); // Tiêu đề cho học hàm / học vị
      titleRow11.font = { name: "Times New Roman", size: 12 };
      titleRow11.alignment = { horizontal: "left", vertical: "middle" };
      worksheet.mergeCells(`A10:C10`); // Gộp ô A10 đến C10

      const titleRow12 = worksheet.addRow([`Chức vụ hiện nay (Đảng, CQ, đoàn thể): ${giangVienInfo?.ChucVu}`]); // Tiêu đề cho chức vụ
      titleRow12.font = { name: "Times New Roman", size: 12 };
      titleRow12.alignment = { horizontal: "left", vertical: "middle" };
      worksheet.mergeCells(`A11:E11`); // Gộp ô A11 đến E11

      const titleRow13 = worksheet.addRow([`Hệ số lương: ${giangVienInfo?.HSL}`]); // Tiêu đề cho hệ số lương
      titleRow13.font = { name: "Times New Roman", size: 12 };
      titleRow13.alignment = { horizontal: "left", vertical: "middle" };
      worksheet.mergeCells(`A12:D12`); // Gộp ô A12 đến D12

      const titleRow14 = worksheet.addRow([
        "Thu nhập (lương thực nhận, không tính phụ cấp học hàm, học vị):",
      ]); // Tiêu đề cho thu nhập
      titleRow14.font = { name: "Times New Roman", size: 12 };
      titleRow14.alignment = { horizontal: "left", vertical: "middle" };
      worksheet.mergeCells(`A13:G13`); // Gộp ô A13 đến G13

      worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách

      // Tiêu đề cho phần giảng dạy
      const titleRow15 = worksheet.addRow([
        "A. GIẢNG DẠY VÀ ĐÁNH GIÁ HỌC PHẦN (không thống kê số giờ đã được thanh toán)",
      ]); // Tiêu đề cho phần giảng dạy
      titleRow15.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow15.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A15:G15`); // Gộp ô A15 đến G15

      const titleRow16 = worksheet.addRow([
        "A.1. Giảng dạy (Căn cứ vào mục 1 và 2 Phụ lục I. QĐ số 1409/QĐ-HVM)",
      ]); // Tiêu đề cho giảng dạy
      titleRow16.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow16.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A16:G16`); // Gộp ô A16 đến G16

      let tableCount = 1; // Biến đếm số bảng
      let totalSoTietTKBAll = 0; // Tổng số tiết TKB cho tất cả các bảng
      let totalSoTietQCAll = 0; // Tổng số tiết quy chuẩn cho tất cả các bảng

      for (const ky in filteredGroupedResults) {
        for (const he in filteredGroupedResults[ky]) {
          // Thêm tiêu đề cho bảng
          const titleRow = worksheet.addRow([`Học ${ky} - ${he}`]);
          titleRow.font = { name: "Times New Roman", size: 12 };
          titleRow.alignment = { horizontal: "left", vertical: "middle" };
          worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`); // Gộp ô cho tiêu đề

          // Thêm tiêu đề cho bảng dữ liệu
          const headerRow = worksheet.addRow([
            "TT",
            "Tên học phần",
            "Số TC (HT)",
            "Lớp học phần",
            "Loại hình đào tạo",
            "Số tiết theo TKB",
            "Số tiết QC",
          ]);
          headerRow.font = { name: "Times New Roman", size: 12, bold: true };
          headerRow.alignment = { horizontal: "center", vertical: "middle" };

          // Điều chỉnh chiều rộng cột
          worksheet.getColumn("A").width = 4.1; // Cột TT
          worksheet.getColumn("B").width = 23.78; // Cột Tên học phần
          worksheet.getColumn("C").width = 13.11; // Cột Số TC (HT)
          worksheet.getColumn("D").width = 18.33; // Cột Lớp học phần
          worksheet.getColumn("E").width = 17.22; // Cột Loại hình đào tạo
          worksheet.getColumn("F").width = 16.89; // Cột Số tiết theo TKB
          worksheet.getColumn("G").width = 10.67; // Cột Số tiết QC
          // Khởi tạo biến đếm cho cột TT
          let index = 1;

          // Khởi tạo các biến tổng cho bảng
          let totalSoTietTKB = 0;
          let totalSoTietQC = 0;

          // Thêm dữ liệu vào bảng
          filteredGroupedResults[ky][he].forEach((row) => {
            const dataRow = worksheet.addRow([
              index++, // Tăng dần cho cột TT
              row.TenHocPhan, // Tên học phần
              row.SoTC, // Số TC
              row.Lop, // Lớp học phần
              he === "Hệ mật mã" ? "Mật Mã" : "", // Nếu là hệ mật mã thì ghi "mật mã", ngược lại để trống
              row.LenLop, // Số
              row.QuyChuan, // Quy chuẩn
            ]);

            // Cộng dồn các giá trị
            totalSoTietTKB += parseFloat(row.LenLop); // Số tiết theo TKB
            totalSoTietQC += parseFloat (row.QuyChuan); // Số tiết quy chuẩn
            // Cộng dồn cho tổng tất cả bảng
            totalSoTietTKBAll += row.LenLop;
            totalSoTietQCAll += row.QuyChuan;
            dataRow.font = { name: "Times New Roman", size: 12 };
            dataRow.alignment = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            };
          });
          // Thêm dòng tổng cộng cho bảng
          const totalRow = worksheet.addRow([
            `Tổng cộng (${tableCount})`, // Cột TT để ghi chú
            "", // Tên học phần
            "",
            "", // Lớp học phần
            "", // Loại hình đào tạo
            parseFloat(totalSoTietTKB).toFixed(2), // Tổng Số tiết theo TKB
            parseFloat(totalSoTietQC).toFixed(2), // Tổng Số tiết quy chuẩn
          ]);
          worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

          // Định dạng dòng tổng cộng
          totalRow.font = { name: "Times New Roman", size: 12 }; // Đặt đậm cho dòng tổng cộng
          totalRow.alignment = { horizontal: "center", vertical: "middle" };
          // Tăng biến đếm bảng lên 1
          tableCount++;
        }
      }
      // Thêm dòng tổng kết cho tất cả các bảng
      const grandTotalRow = worksheet.addRow([
        "Tổng A.1 = (1) + (2) + (3) + (4)", // Ghi chú
        "", // Tên học phần
        "", // Số TC
        "", // Lớp học phần
        "", // Loại hình đào tạo
        parseFloat(totalSoTietTKBAll).toFixed(2), // Tổng số tiết theo TKB cho tất cả các bảng
        parseFloat(totalSoTietQCAll).toFixed(2), // Tổng số tiết quy chuẩn cho tất cả các bảng
      ]);

      // Gộp cột A và B cho dòng tổng kết
      worksheet.mergeCells(`A${grandTotalRow.number}:E${grandTotalRow.number}`);

      // Định dạng dòng tổng kết
      grandTotalRow.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt đậm cho dòng tổng kết
      grandTotalRow.alignment = { horizontal: "center", vertical: "middle" };

      const titleRow17 = worksheet.addRow([
        "A.2.Đánh giá giữa học phần (Căn cứ vào Mục 6.1 Phụ lục I. QĐ số 1409/QĐ-HVM)(Lớp dưới 40 sv được tính 02 đề, lớp từ 41 - 80 được tính 03 đề, lớp trên 80 được tính 04 đề)",
      ]);
      titleRow17.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow17.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.mergeCells(`A${titleRow17.number}:G${titleRow17.number}`);
      titleRow17.height = 40; // Tăng chiều cao hàng

      let tableCount1 = 5; // Biến đếm số bảng
      let totalSoTietKTAll = 0; // Khai báo biến totalSoTietKTAll ở đầu hàm

      for (const ky in filteredGroupedResultsGiuaKy) {
        for (const he in filteredGroupedResultsGiuaKy[ky]) {
          // Thêm tiêu đề cho bảng
          const titleRow = worksheet.addRow([`Học ${ky} - ${he}`]);
          titleRow.font = { name: "Times New Roman", size: 12 };
          titleRow.alignment = { horizontal: "left", vertical: "middle" };
          worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);

          // Thêm tiêu đề cho bảng dữ liệu
          const headerRow = worksheet.addRow([
            "TT",
            "Tên Học Phần",
            "Ra đề/ coi thi/chấm thi giữa học phần",
            "Lớp học phần",
            "Số sinh viên của lớp",
            "Số đề",
            "Số tiết ra đề/ Coi thi/ Chấm thi",
          ]);
          headerRow.font = { name: "Times New Roman", size: 12, bold: true };
          headerRow.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Điều chỉnh chiều rộng cột (nếu cần)
          worksheet.getColumn("A").width = 4.1; // Cột TT
          worksheet.getColumn("B").width = 23.78; // Cột Tên học phần
          worksheet.getColumn("C").width = 13.11; // Cột Số TC (HT)
          worksheet.getColumn("D").width = 18.33; // Cột Lớp học phần
          worksheet.getColumn("E").width = 17.22; // Cột Loại hình đào tạo
          worksheet.getColumn("F").width = 16.89; // Cột Số tiết theo TKB
          worksheet.getColumn("G").width = 10.67; // Cột Số tiết QC
          let index = 1;

          let totalSoTietKT = 0;
          // Nhập dữ liệu tương ứng vào cột
          filteredGroupedResultsGiuaKy[ky][he].forEach((row) => {
            const dataRow = worksheet.addRow([
              index++, // Tăng dần cho cột TT
              row.TenHocPhanGK, // Tên học phần
              row.HinhThucKTGiuaKy, // Ra đề/ coi thi/chấm thi giữa học phần
              row.LopGK, // Lớp học phần
              row.SoSV, // Số sinh viên của lớp
              row.SoDe, // Số đề
              row.SoTietKT, // Số tiết ra đề/ Coi thi/ Chấm thi
            ]);

            totalSoTietKT += parseFloat(row.SoTietKT) ; // Số tiết theo TKB
            totalSoTietKTAll += parseFloat(row.SoTietKT) ; // Cộng dồn vào tổng số tiết cho tất cả các bảng

            // Định dạng dòng dữ liệu
            dataRow.font = { name: "Times New Roman", size: 12 };
            dataRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            dataRow.alignment = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            };

          });
          // Thêm dòng tổng cộng cho bảng
          const totalRow = worksheet.addRow([
            `Tổng cộng (${tableCount1})`, // Cột TT để ghi chú
            "", // Tên học phần
            "",
            "", // Lớp học phần
            "", // Loại hình đào tạo
            "", // Tổng Số tiết theo TKB
            parseFloat(totalSoTietKT), // Tổng Số tiết quy chuẩn
          ]);
          worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

          // Định dạng dòng tổng cộng
          totalRow.font = { name: "Times New Roman", size: 12 }; // Đặt đậm cho dòng tổng cộng
          totalRow.alignment = { horizontal: "center", vertical: "middle" };
          // Tăng biến đếm bảng lên 1
          tableCount1++;
        }
      }
      // Thêm dòng tổng kết cho tất cả các bảng
      const grandTotalRow1 = worksheet.addRow([
        "Tổng A.2 = (5) + (6) + (7) + (8)", // Ghi chú
        "", // Tên học phần
        "", // Số TC
        "", // Lớp học phần
        "", // Loại hình đào tạo
        "", // Tổng số tiết theo TKB cho tất cả các bảng
       parseFloat(totalSoTietKTAll), // Tổng số tiết quy chuẩn cho tất cả các bảng
      ]);

      // Gộp cột A và B cho dòng tổng kết
      worksheet.mergeCells(`A${grandTotalRow1.number}:E${grandTotalRow1.number}`);

      // Định dạng dòng tổng kết
      grandTotalRow1.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt đậm cho dòng tổng kết
      grandTotalRow1.alignment = { horizontal: "center", vertical: "middle" };

      const titleRow18 = worksheet.addRow([
        "A.3.Đánh giá kết thúc học phần (Căn cứ vào Mục 6.2 Phụ lục I. QĐ số 1409/QĐ-HVM)(Dưới 10 sinh viên tính 01 đề, từ 10-41 sv được tính 02 đề, từ 41 - 80 được tính 03 đề, lớp trên 80 được tính 04 đề",
      ]);
      titleRow18.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow18.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      worksheet.mergeCells(`A${titleRow18.number}:G${titleRow18.number}`);
      titleRow18.height = 40; // Tăng chiều cao hàng

      let tableCount2 = 9; // Biến đếm số bảng
      let totalSoTietKTAll1 = 0; // Khai báo biến totalSoTietKTAll ở đầu hàm

      for (const ky in filteredGroupedResultsGiuaKy) {
        for (const he in filteredGroupedResultsGiuaKy[ky]) {
          // Thêm tiêu đề cho bảng
          const titleRow = worksheet.addRow([`Học ${ky} - ${he}`]);
          titleRow.font = { name: "Times New Roman", size: 12 };
          titleRow.alignment = { horizontal: "left", vertical: "middle" };
          worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);

          // Thêm tiêu đề cho bảng dữ liệu
          const headerRow = worksheet.addRow([
            "TT",
            "Tên Học Phần",
            "Ra đề/ coi thi/chấm thi giữa học phần",
            "Lớp học phần",
            "Số sinh viên của lớp",
            "Số đề",
            "Số tiết ra đề/ Coi thi/ Chấm thi",
          ]);
          headerRow.font = { name: "Times New Roman", size: 12, bold: true };
          headerRow.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Điều chỉnh chiều rộng cột (nếu cần)
          worksheet.getColumn("A").width = 4.1; // Cột TT
          worksheet.getColumn("B").width = 23.78; // Cột Tên học phần
          worksheet.getColumn("C").width = 13.11; // Cột Số TC (HT)
          worksheet.getColumn("D").width = 18.33; // Cột Lớp học phần
          worksheet.getColumn("E").width = 17.22; // Cột Loại hình đào tạo
          worksheet.getColumn("F").width = 16.89; // Cột Số tiết theo TKB
          worksheet.getColumn("G").width = 10.67; // Cột Số tiết QC
          let index = 1;

          let totalSoTietKT1 = 0;
          // Nhập dữ liệu tương ứng vào cột
          filteredGroupedResultsGiuaKy[ky][he].forEach((row) => {
            const dataRow = worksheet.addRow([
          
            ]);

            totalSoTietKT1 += parseFloat(row.SoTietKT); // Số tiết theo TKB
            totalSoTietKTAll1 += parseFloat(row.SoTietKT); // Cộng dồn vào tổng số tiết cho tất cả các bảng

            // Định dạng dòng dữ liệu
            dataRow.font = { name: "Times New Roman", size: 12 };
            dataRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            dataRow.alignment = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            };
          });
          // Thêm dòng tổng cộng cho bảng
          const totalRow = worksheet.addRow([
            `Tổng cộng (${tableCount1})`, // Cột TT để ghi chú
            "", // Tên học phần
            "",
            "", // Lớp học phần
            "", // Loại hình đào tạo
            "", // Tổng Số tiết theo TKB
            totalSoTietKT1, // Tổng Số tiết quy chuẩn
          ]);
          worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

          // Định dạng dòng tổng cộng
          totalRow.font = { name: "Times New Roman", size: 12 }; // Đặt đậm cho dòng tổng cộng
          totalRow.alignment = { horizontal: "center", vertical: "middle" };
          // Tăng biến đếm bảng lên 1
          tableCount1++;
        }
      }
      // Thêm dòng tổng kết cho tất cả các bảng
      const grandTotalRow2 = worksheet.addRow([
        "Tổng A.3 = (9) + (10) + (11) + (12)", // Ghi chú
        "", // Tên học phần
        "", // Số TC
        "", // Lớp học phần
        "", // Loại hình đào tạo
        "", // Tổng số tiết theo TKB cho tất cả các bảng
        parseFloat(totalSoTietKTAll1).toFixed(2), // Tổng số tiết quy chuẩn cho tất cả các bảng
      ]);

      // Gộp cột A và B cho dòng tổng kết
      worksheet.mergeCells(`A${grandTotalRow2.number}:E${grandTotalRow2.number}`);

      // Định dạng dòng tổng kết
      grandTotalRow2.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt đậm cho dòng tổng kết
      grandTotalRow2.alignment = { horizontal: "center", vertical: "middle" };

      // Sau khi thêm dòng tổng cho A.1, A.2
      const totalA = parseFloat(totalSoTietTKBAll + totalSoTietKTAll) ; // Tính tổng A

      // Thêm dòng tổng A
      const grandTotalRowA = worksheet.addRow([
        "Tổng A = A.1 + A.2 ", // Ghi chú
        "", // Tên học phần
        "", // Số TC
        "", // Lớp học phần
        "", // Loại hình đào tạo
        parseFloat(totalA), // Tổng số tiết theo TKB cho tất cả các bảng
        parseFloat(totalSoTietQCAll + totalSoTietKTAll) // Tổng số tiết quy chuẩn cho tất cả các bảng
      ]);
      worksheet.mergeCells(`A${grandTotalRowA.number}:E${grandTotalRowA.number}`);
      grandTotalRowA.font = { name: "Times New Roman", size: 12, bold: true };
      grandTotalRowA.alignment = { horizontal: "center", vertical: "middle" };

      const titleRow19 = worksheet.addRow(["B. HƯỚNG DẪN LUẬN ÁN, LUẬN VĂN, ĐỒ ÁN TỐT NGHIỆP (Phụ lục I.3 Quyết định số 1409/QĐ-HVM)"]);
      titleRow19.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow19.alignment = { horizontal: "left", vertical: "center", wrapText: true };
      worksheet.mergeCells(`A${titleRow19.number}:G${titleRow19.number}`);
      titleRow19.height = 40; // Tăng chiều cao hàng

      // Thêm tiêu đề cho bảng dữ liệu
      const headerRowExport = worksheet.addRow(["TT", "Họ tên NCS, Học viên, Sinh viên", "Khóa đào tạo", "Số QĐ Giao Luận án, Luận văn, đồ án", "Số người HD", "HD chính/HD hai", "Số tiết quy đổi"]);
      headerRowExport.font = { name: "Times New Roman", size: 12, bold: true };
      headerRowExport.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      // Điều chỉnh chiều rộng cột
      worksheet.getColumn('A').width = 4.1; // Cột TT
      worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
      worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
      worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
      worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
      worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
      worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC

      // Khởi tạo biến đếm cho cột TT
      let totalSoTietQuyDoi = 0;


      // Thêm dữ liệu từ resultsExportDoAnTotNghiep vào worksheet
      filteredExportDoAnTotNghiep.forEach((row, index) => {
        const dataRowExport = worksheet.addRow([
          index + 1, // Số thứ tự
          row.SinhVien, // Họ tên NCS, Học viên, Sinh viên
          row.KhoaDaoTao, // Khóa đào tạo
          row.GiangVien, // Tên giảng viên
          row.SoNguoi, // Số người HD
          row.isHDChinh ? "HD chính" : "HD hai", // HD chính/HD hai
          row.SoTiet // Số tiết quy đổi
        ]);


        // Cộng dồn số tiết quy đổi
        totalSoTietQuyDoi += parseFloat(row.SoTiet);

        dataRowExport.font = { name: "Times New Roman", size: 12 };
        dataRowExport.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
      // Thêm dòng tổng cho số tiết quy đổi
      const totalRowExport = worksheet.addRow([
        "TỔNG B", // Ghi chú
        "", // Tên học phần
        "", // Khóa đào tạo
        "", // Số QĐ Giao Luận án, Luận văn, đồ án
        "", // Số người HD
        "", // HD chính/HD hai
        parseFloat(totalSoTietQuyDoi).toFixed(2) // Tổng số tiết quy đổi
      ]);

      // Gộp cột A và B cho dòng tổng
      worksheet.mergeCells(`A${totalRowExport.number}:E${totalRowExport.number}`);

      // Định dạng dòng tổng
      totalRowExport.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt đậm cho dòng tổng
      totalRowExport.alignment = { horizontal: "center", vertical: "middle" };

      // Giả sử bạn đã có tổng A và tổng B
      const totalB = totalSoTietQuyDoi; // Tổng B

      // Thêm dòng tổng cho A+B
      const grandTotalRowAB = worksheet.addRow([
        "TỔNG A+B", // Ghi chú
        "", // Tên học phần
        "", // Khóa đào tạo
        "", // Số QĐ Giao Luận án, Luận văn, đồ án
        "", // Số người HD
        "", // HD chính/HD hai
        parseFloat(totalA + totalB).toFixed(2) // Tổng A+B
      ]);

      // Gộp cột A và B cho dòng tổng
      worksheet.mergeCells(`A${grandTotalRowAB.number}:E${grandTotalRowAB.number}`);

      // Định dạng dòng tổng
      grandTotalRowAB.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt đậm cho dòng tổng
      grandTotalRowAB.alignment = { horizontal: "center", vertical: "middle" };


      const titleRow20 = worksheet.addRow(["C. NGHIÊN CỨU KHOA HỌC"]);
      titleRow20.font = { name: "Times New Roman", size: 12, bold: true };
      titleRow20.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      worksheet.mergeCells(`A${titleRow20.number}:G${titleRow20.number}`);
      titleRow20.height = 40; // Tăng chiều cao hàng

      
      const titleRow21 = worksheet.addRow(["C.1 Đề tài, dự án (Phụ lục II.1 Quyết định số 1409/QĐ-HVM)"]);
      titleRow21.font = { name: "Times New Roman", size: 12,  };
      titleRow21.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      worksheet.mergeCells(`A${titleRow21.number}:G${titleRow21.number}`);
      titleRow21.height = 40; // Tăng chiều cao hàng

      const headerRowExport1 = worksheet.addRow(["TT", "Tên đề tài, dự án, mã số đề tài", "Chủ trì/ Thư ký/ thành viên", "Cấp đề tài (Cơ sở, Ban, Nhà nước)", "Ngày nghiệm thu", "Kết quả xếp loại", "Số giờ quy đổi"]);
      headerRowExport1.font = { name: "Times New Roman", size: 12, bold: true };
      headerRowExport1.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      // Điều chỉnh chiều rộng cột
      worksheet.getColumn('A').width = 4.1; // Cột TT
      worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
      worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
      worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
      worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
      worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
      worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC

     // Hàm chuẩn hóa tên giảng viên bằng cách loại bỏ phần sau dấu '(' và xóa khoảng trắng thừa
     const normalizeGiangVienName = (str) => {
      return str.split('(')[0].trim(); // Lấy phần tên trước dấu '(' và loại bỏ khoảng trắng thừa
    };
    

    // ... existing code ...

// ... existing code ...

// Function to normalize and extract the role of the lecturer
const getRoleForLecturer = (row, lecturerName) => {
  const roles = [];
  if (normalizeGiangVienName(row.ChuNhiem) === lecturerName) {
    roles.push("Chủ nhiệm");
  }
  if (normalizeGiangVienName(row.ThuKy) === lecturerName) {
    roles.push("Thư ký");
  }
  if (row.DanhSachThanhVien.split(',').some(name => normalizeGiangVienName(name) === lecturerName)) {
    roles.push("Thành viên");
  }
  return roles.join(", ");
};

// Function to extract hours for the lecturer
const getHoursForLecturer = (row, lecturerName) => {
  const roles = ["ChuNhiem", "ThuKy", "DanhSachThanhVien"];
  for (const role of roles) {
    const roleData = row[role];
    if (roleData && roleData.includes(lecturerName)) {
      const match = roleData.match(/\(([^)]+)\)/);
      if (match) {
        const hoursString = match[1].split('-')[1].trim();
        return parseFloat(hoursString.split(' ')[0]); // Extract the number before "giờ"
      }
    }
  }
  return 0; // Default if no hours found
};

let totalHours = 0; // Initialize total hours

filteredDetaiDuan.forEach((row, index) => {
  const lecturerRole = getRoleForLecturer(row, giangVien);
  const hours = getHoursForLecturer(row, giangVien);
  totalHours += hours; // Accumulate total hours

  const rowData = [
    index + 1, // Số thứ tự (TT)
    row.TenDeTai, // Tên đề tài, dự án, mã số đề tài
    lecturerRole, // Only include roles for the current lecturer
    row.CapDeTai, // Cấp đề tài (Cơ sở, Ban, Nhà nước)
    row.NgayNghiemThu, // Ngày nghiệm thu
    row.KetQuaXepLoai || "Chưa có kết quả", // Kết quả xếp loại (nếu có)
    hours // Số giờ quy đổi for the specific lecturer
  ];
  const dataRow = worksheet.addRow(rowData);

  // Định dạng dòng dữ liệu
  dataRow.font = { name: "Times New Roman", size: 12 };
  dataRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
});

// Add a row for the total hours
const totalRow = worksheet.addRow(["Tổng C.1", "", "", "", "", "", totalHours]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow.number}:F${totalRow.number}`);

// Format the total row
totalRow.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow.getCell(1).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};
totalRow.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow.getCell(7).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};


const titleRow22 = worksheet.addRow(["C.2 Bài báo khoa học(Phụ lục II.3 Quyết định số 1409/QĐ-HVM)"]);
 titleRow22.font = { name: "Times New Roman", size: 12,  };
 titleRow22.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
 worksheet.mergeCells(`A${titleRow22.number}:G${titleRow22.number}`);
 titleRow22.height = 40; // Tăng chiều cao hàng
    
   const headerRowExport2 = worksheet.addRow(["TT", "Tên bài báo", "Loại tạp chí/Hội nghị", "Chỉ số tạp chí/ hội nghị", "Số người", "Tác giả chính/Thành viên", "Số giờ quy đổi"]);
      headerRowExport2.font = { name: "Times New Roman", size: 12, bold: true };
      headerRowExport2.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

   // Điều chỉnh chiều rộng cột
   worksheet.getColumn('A').width = 4.1; // Cột TT
   worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
   worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
   worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
   worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
   worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
   worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC

   // ... existing code ...

// Function to normalize and extract the role of the lecturer
const getRoleForLecturer1 = (row, lecturerName) => {
  const roles = [];
  if (normalizeGiangVienName(row.TacGia) === lecturerName) {
    roles.push("Tác giả");
  }
  if (normalizeGiangVienName(row.TacGiaChiuTrachNhiem) === lecturerName) {
    roles.push("Tác giả chịu trách nhiệm");
  }
  if (row.DanhSachThanhVien.split(',').some(name => normalizeGiangVienName(name) === lecturerName)) {
    roles.push("Thành viên");
  }
  return roles.join(", ");
};

// Function to extract hours for the lecturer
const getHoursForLecturer1 = (row, lecturerName) => {
  const roles = ["TacGia", "TacGiaChiuTrachNhiem", "DanhSachThanhVien"];
  for (const role of roles) {
    const roleData = row[role];
    if (roleData && roleData.includes(lecturerName)) {
      const match = roleData.match(/\(([^)]+)\)/);
      if (match) {
        const hoursString = match[1].split('-')[1].trim();
        return parseFloat(hoursString.split(' ')[0]); // Extract the number before "giờ"
      }
    }
  }
  return 0; // Default if no hours found
};

let totalHours1 = 0; // Initialize total hours

filteredBaiBaoKhoa.forEach((row, index) => {
  const lecturerRole1 = getRoleForLecturer1(row, giangVien);
  const hours1 = getHoursForLecturer1(row, giangVien);
  totalHours1 += hours1; // Accumulate total hours

  // Calculate the total number of people involved
  const totalPeople = 1 + 1 + row.DanhSachThanhVien.split(',').length; // 1 for TacGia, 1 for TacGiaChiuTrachNhiem

  const rowData = [
    index + 1, // Số thứ tự (TT)
    row.TenBaiBao, // Tên bài báo
    row.LoaiTapChi, // Loại tạp chí/Hội nghị
    row.ChiSoTapChi, // Chỉ số tạp chí/ hội nghị
    totalPeople, // Số người
    lecturerRole1, // Only include roles for the current lecturer
    hours1 // Số giờ quy đổi for the specific lecturer
  ];
  const dataRow = worksheet.addRow(rowData);

  // Định dạng dòng dữ liệu
  dataRow.font = { name: "Times New Roman", size: 12 };
  dataRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
});

// Add a row for the total hours
const totalRow2 = worksheet.addRow(["Tổng C.2", "", "", "", "", "", totalHours1]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow2.number}:F${totalRow2.number}`);

// Format the total row
totalRow2.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow2.getCell(1).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};
totalRow2.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow2.getCell(7).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};

// ... existing code ...
   // Thêm các dữ liệu khác (giảng dạy, giữa kỳ, đồ án tốt nghiệp) vào worksheet
      // ... (phần này bạn có thể thêm tương tự như trước)
      const titleRow23 = worksheet.addRow(["C.3 Bằng sáng chế, giải thưởng khoa học trong năm (Phụ lục II.4 Quyết định số 1409/QĐ-HVM)"]);
      titleRow23.font = { name: "Times New Roman", size: 12,  };
      titleRow23.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      worksheet.mergeCells(`A${titleRow23.number}:G${titleRow23.number}`);
      titleRow23.height = 40; // Tăng chiều cao hàng
         
        const headerRowExport3 = worksheet.addRow(["TT", "Tên bằng sáng chế, giải thưởng khoa học trong năm", "Số QĐ công nhận", "Ngày QĐ  công nhận", "Số người", "Tác giả chính/Thành viên", "Số giờ quy đổi"]);
        headerRowExport3.font = { name: "Times New Roman", size: 12, bold: true };
           headerRowExport3.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
     
        // Điều chỉnh chiều rộng cột
        worksheet.getColumn('A').width = 4.1; // Cột TT
        worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
        worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
        worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
        worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
        worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
        worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
     // Function to normalize and extract the role of the lecturer
const getRoleForLecturer2 = (row, lecturerName) => {
  const roles = [];
  if (normalizeGiangVienName(row.TacGia) === lecturerName) {
    roles.push("Tác giả");
  }
  
  if (row.DanhSachThanhVien.split(',').some(name => normalizeGiangVienName(name) === lecturerName)) {
    roles.push("Thành viên");
  }
  return roles.join(", ");
};

// Function to extract hours for the lecturer
const getHoursForLecturer2 = (row, lecturerName) => {
  const roles = ["TacGia", "DanhSachThanhVien"];
  for (const role of roles) {
    const roleData = row[role];
    if (roleData && roleData.includes(lecturerName)) {
      const match = roleData.match(/\(([^)]+)\)/);
      if (match) {
        const hoursString = match[1].split('-')[1].trim();
        return parseFloat(hoursString.split(' ')[0]); // Extract the number before "giờ"
      }
    }
  }
  return 0; // Default if no hours found
};
        let totalHoursBangSangChe = 0;

        filteredBangSangCheVaGiaiThuong.forEach((row, index) => {
          const lecturerRole = getRoleForLecturer2(row, giangVien);
          const hours = getHoursForLecturer2(row, giangVien);
          totalHoursBangSangChe += hours;
      
          const rowData = [
            index + 1,
            row.TenBangSangCheVaGiaiThuong,
            row.SoQDCongNhan,
            formatDateDMY(row.NgayQDCongNhan),
            row.DanhSachThanhVien.split(',').length + 1, // Total number of people
            lecturerRole,
            hours
          ];
          const dataRow = worksheet.addRow(rowData);
      
          dataRow.font = { name: "Times New Roman", size: 12 };
          dataRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        });
      
        const totalRowBangSangChe = worksheet.addRow(["Tổng C.3", "", "", "", "", "", totalHoursBangSangChe]);
        worksheet.mergeCells(`A${totalRowBangSangChe.number}:F${totalRowBangSangChe.number}`);
        totalRowBangSangChe.font = { name: "Times New Roman", size: 12, bold: true };
        totalRowBangSangChe.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      
        // ... existing code ...
        const titleRow24 = worksheet.addRow(["C.4 Sách, giáo trình xuất bản trong nước được Hội đồng GSNN tính điểm (Phụ lục II.5 Quyết định số 1409/QĐ-HVM)"]);
        titleRow24.font = { name: "Times New Roman", size: 12,  };
        titleRow24.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        worksheet.mergeCells(`A${titleRow24.number}:G${titleRow24.number}`);
        titleRow24.height = 40; // Tăng chiều cao hàng
           
          const headerRowExport4 = worksheet.addRow(["TT", "Tên sáng ,giáo trình", "Số xuất bản", "Số trang", "Số người", "Tác giả chính/Thành viên", "Số giờ quy đổi"]);
          headerRowExport4.font = { name: "Times New Roman", size: 12, bold: true };
             headerRowExport4.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
       
          // Điều chỉnh chiều rộng cột
          worksheet.getColumn('A').width = 4.1; // Cột TT
          worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
          worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
          worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
          worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
          worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
          worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
       // Function to normalize and extract the role of the lecturer

// Function to normalize and extract the role of the lecturer
const getRoleForLecturere3 = (row, lecturerName) => {
  const roles = [];
  if (normalizeGiangVienName(row.TacGia) === lecturerName) {
    roles.push("Tác giả");
  }
  if (normalizeGiangVienName(row.DongChuBien) === lecturerName) {
    roles.push("Đồng chủ biên");
  }
  if (row.DanhSachThanhVien.split(',').some(name => normalizeGiangVienName(name) === lecturerName)) {
    roles.push("Thành viên");
  }
  return roles.join(", ");
};       // Function to extract hours for the lecturer
const getHoursForLecturer3 = (row, lecturerName) => {
  const roles = ["TacGia", "DongChuBien", "DanhSachThanhVien"];
  for (const role of roles) {
    const roleData = row[role];
    if (roleData && roleData.includes(lecturerName)) {
      const match = roleData.match(/\(([^)]+)\)/);
      if (match) {
        const hoursString = match[1].split('-')[1].trim();
        return parseFloat(hoursString.split(' ')[0]); // Extract the number before "giờ"
      }
    }
  }
  return 0; // Default if no hours found
};

let totalHour2 = 0; // Initialize total hours

filteredSachVaGiaoTrinh.forEach((row, index) => {
  const lecturerRole1 = getRoleForLecturere3(row, giangVien);
  const hours1 = getHoursForLecturer3(row, giangVien);
  totalHour2 += hours1; // Accumulate total hours

  // Calculate the total number of people involved
  const totalPeople = 1 + 1 + row.DanhSachThanhVien.split(',').length; // 1 for TacGia, 1 for TacGiaChiuTrachNhiem

  const rowData = [
    index + 1, // Số thứ tự (TT)
    row.TenSachVaGiaoTrinh, // Tên bài báo
    row.SoXuatBan, // Loại tạp chí/Hội nghị
    row.SoTrang, // Chỉ số tạp chí/ hội nghị
    totalPeople, // Số người
    lecturerRole1, // Only include roles for the current lecturer
    hours1 // Số giờ quy đổi for the specific lecturer
  ];
  const dataRow = worksheet.addRow(rowData);

  // Định dạng dòng dữ liệu
  dataRow.font = { name: "Times New Roman", size: 12 };
  dataRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
});

// Add a row for the total hours
const totalRow3 = worksheet.addRow(["Tổng C.4", "", "", "", "", "", totalHour2]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow3.number}:F${totalRow3.number}`);

// Format the total row
totalRow3.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow3.getCell(1).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};
totalRow3.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow3.getCell(7).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};


 // ... existing code ...
 const titleRow25 = worksheet.addRow(["C.5 Hướng dẫn sinh viên NCKH, huấn luyện đội tuyển (Phụ lục II.6 Quyết định số 1409/QĐ-HVM)"]);
 titleRow25.font = { name: "Times New Roman", size: 12,  };
 titleRow25.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
 worksheet.mergeCells(`A${titleRow25.number}:G${titleRow25.number}`);
 titleRow25.height = 40; // Tăng chiều cao hàng
    
   const headerRowExport5 = worksheet.addRow(["TT", "Tên đề tài", "Số QĐ giao nhiệm vụ", "Ngày ký QĐ giao nhiệm vụ", "Kết quả cấp học Khoa", "Kết quả cấp học Học Viện", "Số giờ quy đổi  "]);
   headerRowExport5.font = { name: "Times New Roman", size: 12, bold: true };
      headerRowExport5.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

   // Điều chỉnh chiều rộng cột
   worksheet.getColumn('A').width = 4.1; // Cột TT
   worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
   worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
   worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
   worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
   worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
   worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
// Function to normalize and extract the role of the lecturer

// Function to normalize and extract the role of the lecturer
const getRoleForLecturer5 = (row, lecturerName) => {
const roles = [];
if (row.DanhSachThanhVien.split(',').some(name => normalizeGiangVienName(name) === lecturerName)) {
roles.push("Thành viên");
}
return roles.join(", ");
};       // Function to extract hours for the lecturer
const getHoursForLecturer5 = (row, lecturerName) => {
const roles = ["DanhSachThanhVien"];
for (const role of roles) {
const roleData = row[role];
if (roleData && roleData.includes(lecturerName)) {
const match = roleData.match(/\(([^)]+)\)/);
if (match) {
 const hoursString = match[1].split('-')[1].trim();
 return parseFloat(hoursString.split(' ')[0]); // Extract the number before "giờ"
}
}
}
return 0; // Default if no hours found
};

let totalHour3 = 0; // Initialize total hours

filteredNCKHVaHuanLuyen.forEach((row, index) => {

  const lecturerRole1 = getRoleForLecturer5(row, giangVien);
const hours1 = getHoursForLecturer5(row, giangVien);
totalHour3 += hours1; // Accumulate total hours

// Calculate the total number of people involved
const rowData = [
index + 1, // Số thứ tự (TT)
row.TenDeTai, // Tên bài báo
row.SoQDGiaoNhiemVu, // Loại tạp chí/Hội nghị
formatDateDMY(row.NgayQDGiaoNhiemVu), // Chỉ số tạp chí/ hội nghị
row.KetQuaCapKhoa, // Chỉ số tạp chí/ hội nghị
row.KetQuaCapHocVien, // Số người
hours1 // Số giờ quy đổi for the specific lecturer
];
const dataRow = worksheet.addRow(rowData);

// Định dạng dòng dữ liệu
dataRow.font = { name: "Times New Roman", size: 12 };
dataRow.alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
});

// Add a row for the total hours
const totalRow5 = worksheet.addRow(["Tổng C.5", "", "", "", "", "", totalHour3]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow5.number}:F${totalRow5.number}`);

// Format the total row
totalRow5.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow5.getCell(1).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
totalRow5.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow5.getCell(7).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};

 // ... existing code ...
 const titleRow26 = worksheet.addRow(["C.6 Xây dựng chương trình đào tạo (Phụ lục II.8 Quyết định số 1409/QĐ-HVM)"]);
 titleRow26.font = { name: "Times New Roman", size: 12,  };
 titleRow26.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
 worksheet.mergeCells(`A${titleRow26.number}:G${titleRow26.number}`);
 titleRow26.height = 40; // Tăng chiều cao hàng
    
   const headerRowExport6 = worksheet.addRow(["TT", "Tên chương trình", "Số tín chỉ", "Số QĐ giao nhiệm vụ,Ngày kí quyết định", "Số người", "Hình thức xây dựng", "Số giờ quy đổi  "]);
   headerRowExport6.font = { name: "Times New Roman", size: 12, bold: true };
      headerRowExport6.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

   // Điều chỉnh chiều rộng cột
   worksheet.getColumn('A').width = 4.1; // Cột TT
   worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
   worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
   worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
   worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
   worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
   worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
// Function to normalize and extract the role of the lecturer

// Function to normalize and extract the role of the lecturer
const getRoleForLecturer6 = (row, lecturerName) => {
const roles = [];
if (row.DanhSachThanhVien.split(',').some(name => normalizeGiangVienName(name) === lecturerName)) {
roles.push("Thành viên");
}
return roles.join(", ");
};       // Function to extract hours for the lecturer
const getHoursForLecturer6 = (row, lecturerName) => {
const roles = ["DanhSachThanhVien"];
for (const role of roles) {
const roleData = row[role];
if (roleData && roleData.includes(lecturerName)) {
const match = roleData.match(/\(([^)]+)\)/);
if (match) {
 const hoursString = match[1].split('-')[1].trim();
 return parseFloat(hoursString.split(' ')[0]); // Extract the number before "giờ"
}
}
}
return 0; // Default if no hours found
};

let totalHour4 = 0; // Initialize total hours

filteredXayDungCongTacDaoTao.forEach((row, index) => {

  const lecturerRole1 = getRoleForLecturer6(row, giangVien);
const hours1 = getHoursForLecturer6(row, giangVien);
totalHour4 += hours1; // Accumulate total hours
const totalPeople =  row.DanhSachThanhVien.split(',').length; // 1 for TacGia, 1 for TacGiaChiuTrachNhiem
const combinedColumn = `${row.SoQDGiaoNhiemVu} - ${formatDateDMY(row.NgayKyQD)}`; // Combine SoQDGiaoNhiemVu and NgayKyQD

// Calculate the total number of people involved
const rowData = [
index + 1, // Số thứ tự (TT)
row.TenChuongTrinh, // Tên bài báo
row.SoTC, // Loại tạp chí/Hội nghị
combinedColumn, // Combined SoQDGiaoNhiemVu and NgayKyQD
totalPeople, // Số người
row.HinhThucXayDung, // Chỉ số tạp chí/ hội nghị
hours1 // Số giờ quy đổi for the specific lecturer
];
const dataRow = worksheet.addRow(rowData);

// Định dạng dòng dữ liệu
dataRow.font = { name: "Times New Roman", size: 12 };
dataRow.alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
});

// Add a row for the total hours
const totalRow6 = worksheet.addRow(["Tổng C.6", "", "", "", "", "", totalHour4]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow6.number}:F${totalRow6.number}`);

// Format the total row
totalRow6.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow6.getCell(1).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
totalRow6.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow6.getCell(7).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
// ... existing code ...
const titleRow27 = worksheet.addRow(["C.7 Biên soạn giáo trình, bài giảng (Phụ lục II.9 Quyết định số 1409/QĐ-HVM)"]);
titleRow27.font = { name: "Times New Roman", size: 12,  };
titleRow27.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
worksheet.mergeCells(`A${titleRow27.number}:G${titleRow27.number}`);
titleRow27.height = 40; // Tăng chiều cao hàng
   
  const headerRowExport7 = worksheet.addRow(["TT", "Tên giáo trình , bài giảng ", "Số QĐ giao nhiệm vụ , ngày kí ", "Số tín chỉ ", "Số người", "Số thành viên", "Số giờ quy đổi  "]);
  headerRowExport7.font = { name: "Times New Roman", size: 12, bold: true };
     headerRowExport7.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  // Điều chỉnh chiều rộng cột
  worksheet.getColumn('A').width = 4.1; // Cột TT
  worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
  worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
  worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
  worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
  worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
  worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
// Function to normalize and extract the role of the lecturer

// Function to normalize and extract the role of the lecturer
const getRoleForLecturer7 = (row, lecturerName) => {
const roles = [];
if (row.DanhSachThanhVien.split(',').some(name => normalizeGiangVienName(name) === lecturerName)) {
roles.push("Thành viên");
}
if (normalizeGiangVienName(row.TacGia) === lecturerName) {
  roles.push("Tác giả");
}
return roles.join(", ");
};       // Function to extract hours for the lecturer
const getHoursForLecturer7 = (row, lecturerName) => {
const roles = ["DanhSachThanhVien", "TacGia"];
for (const role of roles) {
const roleData = row[role];
if (roleData && roleData.includes(lecturerName)) {
const match = roleData.match(/\(([^)]+)\)/);
if (match) {
const hoursString = match[1].split('-')[1].trim();
return parseFloat(hoursString.split(' ')[0]); // Extract the number before "giờ"
}
}
}
return 0; // Default if no hours found
};

let totalHour5 = 0; // Initialize total hours

filteredBienSoanGiaoTrinhBaiGiang.forEach((row, index) => {

 const lecturerRole1 = getRoleForLecturer7(row, giangVien);
const hours1 = getHoursForLecturer7(row, giangVien);
totalHour5 += hours1; // Accumulate total hours
const totalPeople = 1 + row.DanhSachThanhVien.split(',').length; // 1 for TacGia, 1 for TacGiaChiuTrachNhiem
const combinedColumn = `${row.SoQDGiaoNhiemVu} - ${formatDateDMY(row.NgayQDGiaoNhiemVu)}`; // Combine SoQDGiaoNhiemVu and NgayKyQD

// Calculate the total number of people involved
const rowData = [
index + 1, // Số thứ tự (TT)
row.TenGiaoTrinhBaiGiang, // Tên bài báo
combinedColumn, // Combined SoQDGiaoNhiemVu and NgayKyQD
row.SoTC, // Loại tạp chí/Hội nghị
totalPeople, // Số người
lecturerRole1, // Chỉ số tạp chí/ hội nghị
hours1 // Số giờ quy đổi for the specific lecturer
];
const dataRow = worksheet.addRow(rowData);

// Định dạng dòng dữ liệu
dataRow.font = { name: "Times New Roman", size: 12 };
dataRow.alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
});

// Add a row for the total hours
const totalRow7 = worksheet.addRow(["Tổng C.7", "", "", "", "", "", totalHour5]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow7.number}:F${totalRow7.number}`);

// Format the total row
totalRow7.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow7.getCell(1).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
totalRow7.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow7.getCell(7).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};

const titleRow28 = worksheet.addRow(["C.8 Hướng dẫn sinh viên nghiên cứu khoa học và huấn luyện đội tuyển"]);
titleRow28.font = { name: "Times New Roman", size: 12,  };
titleRow28.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
worksheet.mergeCells(`A${titleRow28.number}:G${titleRow28.number}`);
titleRow28.height = 40; // Tăng chiều cao hàng
const headerRowExport8 = worksheet.addRow([
  "TT", 
  "Tên đề tài / đội tuyển , bài giảng ", 
  "Số QĐ giao nhiệm vụ , ngày kí ", 
  "", // Placeholder for merged cell
  "Số thành viên hướng dẫn / huấn luyện", 
  "Kết quả bảo vệ /dự thi", 
  "Số giờ quy đổi"
]);
headerRowExport8.font = { name: "Times New Roman", size: 12, bold: true };
headerRowExport8.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

// Merge columns C and D for the "Số QĐ giao nhiệm vụ, ngày kí" header
worksheet.mergeCells(`C${headerRowExport8.number}:D${headerRowExport8.number}`);

// Adjust column widths
worksheet.getColumn('A').width = 4.1; // Cột TT
worksheet.getColumn('B').width = 23.78; // Cột Tên đề tài / đội tuyển , bài giảng
worksheet.getColumn('C').width = 13.11; // Cột Số QĐ giao nhiệm vụ , ngày kí (merged with D)
worksheet.getColumn('E').width = 17.22; // Cột Số thành viên hướng dẫn / huấn luyện
worksheet.getColumn('F').width = 16.89; // Cột Kết quả bảo vệ /dự thi
worksheet.getColumn('G').width = 10.67; // Cột Số giờ quy đổi

      // Bỏ viền từ dòng 15 trở đi
const totalRow8 = worksheet.addRow(["Tổng C.8", "", "", "", "", "", ""]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow8.number}:F${totalRow8.number}`);

// Format the total row
totalRow8.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow8.getCell(1).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
totalRow8.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow8.getCell(7).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};

    const titleRow29 = worksheet.addRow(["C.9 Các nhiệm vụ khoa học và công nghệ khác"]);
    titleRow29.font = { name: "Times New Roman", size: 12,  };
    titleRow29.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    worksheet.mergeCells(`A${titleRow29.number}:G${titleRow29.number}`);
    titleRow29.height = 40; // Tăng chiều cao hàng
       
      const headerRowExport9 = worksheet.addRow(["TT", "Tên nhiệm vụ ", "Số QĐ giao nhiệm vụ , ngày kí ","", "Phân công nhiệm vụ theo quy định","","Số giờ quy đổi  "]);
      headerRowExport9.font = { name: "Times New Roman", size: 12, bold: true };
         headerRowExport9.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    
         worksheet.mergeCells(`C${headerRowExport9.number}:D${headerRowExport9.number}`);
         worksheet.mergeCells(`E${headerRowExport9.number}:F${headerRowExport9.number}`);


      // Điều chỉnh chiều rộng cột
      worksheet.getColumn('A').width = 4.1; // Cột TT
      worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
      worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
      worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
      worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
    // Function to normalize and extract the role of the lecturer

// Add a row for the total hours
const totalRow9 = worksheet.addRow(["Tổng C.9", "", "", "", "", "", ""]);

// Merge cells from A to F for the total row
worksheet.mergeCells(`A${totalRow9.number}:F${totalRow9.number}`);

// Format the total row
totalRow9.getCell(1).font = { name: "Times New Roman", size: 12, bold: true };
totalRow9.getCell(1).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
totalRow9.getCell(7).font = { name: "Times New Roman", size: 12, bold: true };
totalRow9.getCell(7).alignment = {
horizontal: "center",
vertical: "middle",
wrapText: true
};
// Tính tổng C
const totalC = totalHours + totalHours1 + totalHoursBangSangChe + totalHour2 + totalHour3 + totalHour4 + totalHour5;

// Thêm dòng tổng C
const totalRowC = worksheet.addRow([
  "Tổng C = C.1 + C.2 + C.3 + C.4 + C.5 + C.6 + C.7 + C.8 + C.9",
  "",
  "",
  "",
  "",
  "",
  totalC
]);

// Gộp cột A và F cho dòng tổng
worksheet.mergeCells(`A${totalRowC.number}:F${totalRowC.number}`);

// Định dạng dòng tổng
totalRowC.font = { name: "Times New Roman", size: 12, bold: true };
totalRowC.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

// // Tính tổng A + B + C
// const totalABC = totalA + totalB + totalC;

// // Thêm dòng tổng A + B + C
// const grandTotalRowABC = worksheet.addRow([
//   "Tổng A + B + C",
//   "",
//   "",
//   "",
//   "",
//   "",
//   totalABC
// ]);

// // Gộp cột A và F cho dòng tổng
// worksheet.mergeCells(`A${grandTotalRowABC.number}:F${grandTotalRowABC.number}`);

// // Định dạng dòng tổng
// grandTotalRowABC.font = { name: "Times New Roman", size: 12, bold: true };
// grandTotalRowABC.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách
const titleRow30 = worksheet.addRow([" D. TỔNG HỢP KHỐI LƯỢNG ĐÃ THỰC HIỆN: "]);
titleRow30.font = { name: "Times New Roman", size: 12, bold: true };
titleRow30.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
worksheet.mergeCells(`A${titleRow30.number}:G${titleRow30.number}`);
titleRow30.height = 40; // Tăng chiều cao hàng
// Thêm bảng chứa các cột TT, Nội dung công việc, lí do giảm trừ
const headerRow31 = worksheet.addRow(["TT", "Nội dung công việc", "", "", "Số tiết", "Lí do giảm trừ", ""]);
headerRow31.font = { name: "Times New Roman", size: 12, bold: true };
headerRow31.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

worksheet.mergeCells(`B${headerRow31.number}:D${headerRow31.number}`);
worksheet.mergeCells(`F${headerRow31.number}:G${headerRow31.number}`);

// Điều chỉnh chiều rộng cột
worksheet.getColumn('A').width = 4.1; // Cột TT
worksheet.getColumn('B').width = 40; // Cột Nội dung công việc
worksheet.getColumn('E').width = 17.22; // Cột Số tiết
worksheet.getColumn('F').width = 30; // Cột Lí do giảm trừ

const romanNumerals = ["I", "II", "III", "IV", "V"];
const content = [
  "Tổng số tiết thực hiện (A+B)",
  "Số tiết phải giảng",
  "Số tiết chưa hoàn thành NCKH",
  "Số tiết được giảm trừ",
  "Tổng số tiết đề nghị thanh toán vượt giờ (I - II - III + IV)"
];

const values = [
  parseFloat(totalA + totalB).toFixed(2), // Tổng số tiết thực hiện (A+B)
  resultsSoTietDinhMuc[0]?.GiangDay || "", // Số tiết phải giảng  
  totalC > resultsSoTietDinhMuc[0]?.NCKH ? 0 : resultsSoTietDinhMuc[0]?.NCKH - totalC, // Số tiết chưa hoàn thành NCKH
  (resultsSoTietDinhMuc[0]?.GiangDay || 0) * (giangVienInfo?.PhanTramMienGiam || 0) / 100, // Số tiết được giảm trừ
  Math.max(0, parseFloat(totalA + totalB - (resultsSoTietDinhMuc[0]?.GiangDay || 0) + ((resultsSoTietDinhMuc[0]?.GiangDay || 0) * (giangVienInfo?.PhanTramMienGiam || 0) / 100)).toFixed(2)) // Tổng số tiết đề nghị thanh toán vượt giờ (I - II - III + IV)
];

content.forEach((item, index) => {
  const dataRow = worksheet.addRow([romanNumerals[index], item, "", "", values[index], "", ""]);
  dataRow.font = { name: "Times New Roman", size: 12 };
  dataRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  worksheet.mergeCells(`B${dataRow.number}:D${dataRow.number}`);
  worksheet.mergeCells(`F${dataRow.number}:G${dataRow.number}`);
});

worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách

const titleRow31 = worksheet.addRow([" E. TỔNG SỐ TIẾT ĐỀ NGHỊ THANH TOÁN VƯỢT GIỜ"]);
titleRow31.font = { name: "Times New Roman", size: 12, bold: true };
titleRow31.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
worksheet.mergeCells(`A${titleRow31.number}:G${titleRow31.number}`);
titleRow31.height = 40; // Tăng chiều cao hàng
// Thêm bảng mới với các cột TT, Số tiết theo thời khóa biểu, Tổng quy chuẩn t.toán
const titleRow32 = worksheet.addRow(["TT", "Số tiết theo thời khóa biểu", "", "", "", "", "Tổng quy chuẩn t.toán"]);
titleRow32.font = { name: "Times New Roman", size: 12, bold: true };
titleRow32.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

worksheet.mergeCells(`B${titleRow32.number}:F${titleRow32.number}`);

// Điều chỉnh chiều rộng cột
worksheet.getColumn('A').width = 4.1; // Cột TT
worksheet.getColumn('B').width = 30; // Cột Tổng

worksheet.getColumn('G').width = 10; // Cột Tổng quy chuẩn t.toán

// Thêm tiêu đề cho các cột con
const headerRow32 = worksheet.addRow(["", "Tổng", "Chuyên ngành KTMM", "", "", "Hệ đóng học phí", ""]);
headerRow32.font = { name: "Times New Roman", size: 12, bold: true };
headerRow32.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
worksheet.mergeCells(`C${headerRow32.number}:E${headerRow32.number}`);

// Thêm tiêu đề cho các cột con của chuyên ngành KTMM
const subHeaderRow32 = worksheet.addRow(["", "", "Việt Nam", "Lào", "Campuchia", "", ""]);
subHeaderRow32.font = { name: "Times New Roman", size: 12, bold: true };
subHeaderRow32.alignment = { horizontal: "center", vertical: "middle", wrapText: true };



// dataRows.forEach((data, index) => {
//   const dataRow = worksheet.addRow(data);
//   dataRow.font = { name: "Times New Roman", size: 12 };
//   dataRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
// });

// // Thêm dòng tổng cộng
// const totalRow32 = worksheet.addRow(["Tổng cộng", 330, 105, 67, 38, 135, 670]);
// totalRow32.font = { name: "Times New Roman", size: 12, bold: true };
// totalRow32.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
// worksheet.mergeCells(`A${totalRow32.number}:B${totalRow32.number}`);

worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách

const titleRow33 = worksheet.addRow([" F. TỔNG SỐ TIẾT NGHIÊN CỨU KHOA HỌC ĐƯỢC BẢO LƯU (không thanh toán)"]);
titleRow33.font = { name: "Times New Roman", size: 12, bold: true };
titleRow33.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
worksheet.mergeCells(`A${titleRow33.number}:G${titleRow33.number}`);
titleRow33.height = 40; // Tăng chiều cao hàng


const titleRow34 = worksheet.addRow(["TT", "Nội dung bảo lưu", "Tổng số tiết NCKH vượt mức", "", "Tổng số tiết NCKH được bảo lưu", "", ""]);
titleRow34.font = { name: "Times New Roman", size: 12, bold: true };
titleRow34.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

worksheet.mergeCells(`C${titleRow34.number}:D${titleRow34.number}`);
worksheet.mergeCells(`E${titleRow34.number}:G${titleRow34.number}`);

worksheet.getColumn('A').width = 4.1; // Cột TT
worksheet.getColumn('B').width = 16; // Cột Nội dung công việc
worksheet.getColumn('C').width = 17.22; // Cột Số tiết
worksheet.getColumn('E').width = 30; // Cột Lí do giảm trừ

const totalNCKH = resultsSoTietDinhMuc[0]?.NCKH || 0;
const totalNCKHVuotMuc = Math.max(0, totalC - totalNCKH); // Nếu âm sẽ nhận giá trị 0
const totalNCKHBaoLuu = totalNCKHVuotMuc > 0 ? totalNCKHVuotMuc : 0;
let index = 1;
const dataRow34 = worksheet.addRow([
  index++,
  "Nghiên cứu khoa học",
  totalNCKHVuotMuc.toFixed(2),
  "",
  totalNCKHBaoLuu.toFixed(2),
  "",
  ""
]);

dataRow34.font = { name: "Times New Roman", size: 12 };
dataRow34.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
worksheet.mergeCells(`C${dataRow34.number}:D${dataRow34.number}`);

worksheet.mergeCells(`E${dataRow34.number}:G${dataRow34.number}`);

worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách


    for (let rowIndex = 15; rowIndex <= worksheet.lastRow.number; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  

// Thêm phần chữ ký
    worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách

    const signatureRow = worksheet.addRow([
      "P.Chủ Nhiệm Khoa",
      "",
      "",
      "Chủ nhiệm bộ môn",
      "",
      "Người Kê Khai",
     
      ""

    ]);
    signatureRow.font = { name: "Times New Roman", size: 12, bold: true };
    signatureRow.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${signatureRow.number}:C${signatureRow.number}`);
    worksheet.mergeCells(`D${signatureRow.number}:E${signatureRow.number}`);
    worksheet.mergeCells(`F${signatureRow.number}:G${signatureRow.number}`);

    const signatureRow2 = worksheet.addRow([
      "(ký, ghi rõ họ tên)",
      "",
      "",
      "(ký, ghi rõ họ tên)",
      "",
      "(ký, ghi rõ họ tên)",
       
      ""
    ]);
    signatureRow2.font = { name: "Times New Roman", size: 12, italic: true };
    signatureRow2.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${signatureRow2.number}:C${signatureRow2.number}`);
    worksheet.mergeCells(`D${signatureRow2.number}:E${signatureRow2.number}`);
    worksheet.mergeCells(`F${signatureRow2.number}:G${signatureRow2.number}`);






  });

    // Xuất file Excel
    const fileName = `vuotGio_nam${namHoc}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`); // Đảm bảo tên file được bao quanh bởi dấu nháy kép

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xuất dữ liệu",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const getGiangVienList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT TenNhanVien, MaPhongBan 
                    FROM nhanvien 
                    WHERE MaPhongBan IN (
                      SELECT DISTINCT MaPhongBan 
                      FROM role 
                      WHERE isKhoa = 1
                    );`;
    const [results] = await connection.query(query);
    res.json(results);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  exportVuotGio,
  getGiangVienList,
};