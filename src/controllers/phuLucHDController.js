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
const getExportPhuLucGiangVienMoiPath = async (
  req,
  connection,
  dot,
  ki,
  namHoc,
  loaiHopDong,
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
    summarySheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);

    const titleRow2 = summarySheet.addRow(["Phụ lục"]);
    titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

    const titleRow3 = summarySheet.addRow([`Hợp đồng số:    /HĐ-ĐT `]);
    titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow3.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

    const titleRow4 = summarySheet.addRow([
      `Kèm theo biên bản nghiệm thu Hợp đồng số:     /HĐ-ĐT `,
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
        const soTien = tinhSoTien(item, soTiet, tienLuongList); // Tính toán soTien
        const truThue = soTien * 0.1; // Trừ Thuế = 10% của Số Tiền
        const thucNhan = soTien - truThue; // Thực Nhận = Số Tiền - Trừ Thuế
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
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
          (item.SoTiet || 0).toLocaleString("vi-VN").replace(/\./g, ","),
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
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
    }

    // Thêm hàng tổng cộng vào cuối bảng
    const totalRow = summarySheet.addRow([
      "Tổng cộng",
      "",
      "",
      "",
      totalSoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
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

      // const titleRow4 = worksheet.addRow([
      //   `Kèm theo biên bản nghiệm thu Hợp đồng số:     /HĐ-ĐT ${formattedEarliestDate}`,
      // ]);
      // titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
      // titleRow4.alignment = { horizontal: "center", vertical: "middle" };
      // worksheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);

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
        const soTien = tinhSoTien(item, soTiet, tienLuongList); // Tính toán soTien
        const truThue = soTien * 0.1; // Trừ Thuế = 10% của Số Tiền
        const thucNhan = soTien - truThue; // Thực Nhận = Số Tiền - Trừ Thuế
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        const hocKyLaMa = convertToRoman(item.HocKy);
        // Viết tắt Học vị
        const hocViVietTat =
          hocVi === "Tiến sĩ" ? "TS" : hocVi === "Thạc sĩ" ? "ThS" : hocVi;
        const row = worksheet.addRow([
          index + 1, // STT
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          (item.SoTiet || 0).toLocaleString("vi-VN").replace(/\./g, ","),
          thoiGianThucHien,
          hocKyLaMa, // Sử dụng số La Mã cho Học kỳ
          item.DiaChi,
          hocViVietTat, // Sử dụng viết tắt cho Học vị
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
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
      });

      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
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

      // Tìm ngày bắt đầu sớm nhất từ dữ liệu giảng viên
      const earliestDate_2 = giangVienData.reduce((minDate, item) => {
        const currentStartDate = new Date(item.NgayBatDau);
        return currentStartDate < minDate ? currentStartDate : minDate;
      }, new Date(giangVienData[0].NgayBatDau));

      // Định dạng ngày bắt đầu sớm nhất thành chuỗi
      const formattedEarliestDate_2 = formatVietnameseDate(earliestDate_2);

      // const titleRow3_2 = worksheet2.addRow([
      //   `Hợp đồng số:    /HĐ-ĐT ${formattedEarliestDate_2}`,
      // ]);
      // titleRow3_2.font = { name: "Times New Roman", bold: true, size: 16 };
      // titleRow3_2.alignment = { horizontal: "center", vertical: "middle" };
      // worksheet2.mergeCells(`A${titleRow3_2.number}:L${titleRow3_2.number}`);

      const titleRow4_2 = worksheet2.addRow([
        `Kèm theo biên bản nghiệm thu Hợp đồng số:     /HĐ-ĐT ${formattedEarliestDate_2}`,
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
        const soTien = tinhSoTien(item, soTiet, tienLuongList);
        const truThue = soTien * 0.1;
        const thucNhan = soTien - truThue;
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;
        const hocKyLaMa = convertToRoman(item.HocKy);
        const hocViVietTat =
          hocVi === "Tiến sĩ" ? "TS" : hocVi === "Thạc sĩ" ? "ThS" : hocVi;

        const row = worksheet2.addRow([
          index + 1,
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          (item.SoTiet || 0).toLocaleString("vi-VN").replace(/\./g, ","),
          thoiGianThucHien,
          hocKyLaMa,
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
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
      });

      // Thêm hàng tổng cộng cho sheet 2
      const totalRow2 = worksheet2.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet2.toLocaleString("vi-VN").replace(/\./g, ","),
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
    let fileName = `PhuLuc_GiangVien_Moi_Dot${dot}_Ki${ki}_${namHoc}`;
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

    console.log("data = ", data);

    if (data.length === 0) {
      return res.send(
        `<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/phuLucHD';</script>`
      );
    }

    const filePaths = await getExportPhuLucGiangVienMoiPath(
      req,
      connection,
      dot,
      ki,
      namHoc,
      loaiHopDong,
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

    res.render("phuLucHD.ejs", {
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
