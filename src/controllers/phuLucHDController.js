const express = require("express");
const ExcelJS = require("exceljs");
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const path = require("path");

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]/gi, "_");
}

// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "không đồng";

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

      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

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

      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Chuyển chữ cái đầu tiên thành chữ hoa
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

const exportPhuLucGiangVienMoi = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const { dot, ki, namHoc, khoa, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đợt, kỳ hoặc năm học",
      });
    }

    let query = `
      SELECT DISTINCT
          SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS GiangVien, 
          qc.TenLop AS Lop, 
          qc.QuyChuan AS SoTiet, 
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          gv.HocVi, 
          gv.HSL,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi
      FROM quychuan qc
      JOIN gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
      WHERE qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.DaLuu = 1
    `;

    let params = [dot, ki, namHoc];

    if (khoa && khoa !== "ALL") {
      query += ` AND qc.Khoa = ?`;
      params.push(khoa);
    }

    if (teacherName) {
      query += ` AND gv.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    const [data] = await connection.execute(query, params);

    if (data.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/phuLucHD';</script>"
      );
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

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0 = worksheet.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0.font = { name: "Times New Roman", size: 15 };
      titleRow0.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1 = worksheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow1.alignment = { vertical: "middle" };
      worksheet.mergeCells(`A${titleRow1.number}:F${titleRow1.number}`);

      const titleRow2 = worksheet.addRow(["Phụ lục"]);
      titleRow2.font = { name: "Times New Roman", bold: true, size: 14 };
      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:K${titleRow2.number}`);

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
      titleRow3.font = { name: "Times New Roman", bold: true, size: 14 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:K${titleRow3.number}`);

      const titleRow4 = worksheet.addRow([
        `Kèm theo biên bản nghiệm thu và thanh lý Hợp đồng số:     /HĐ-ĐT ${formattedEarliestDate}`,
      ]);
      titleRow4.font = { name: "Times New Roman", bold: true, size: 14 };
      titleRow4.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow4.number}:K${titleRow4.number}`);

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
      titleRow5.font = { name: "Times New Roman", bold: true, size: 10 };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`K${titleRow5.number}:M${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
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
      worksheet.getColumn(10).numFmt = "#,##0"; // Thành tiền
      worksheet.getColumn(11).numFmt = "#,##0"; // Trừ thuế TNCN 10%
      worksheet.getColumn(12).numFmt = "#,##0"; // Còn lại
      worksheet.getColumn(13).numFmt = "#,##0"; // Còn lại

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
      // worksheet.getColumn(1).width = 15; // Họ tên giảng viên
      // worksheet.getColumn(2).width = 20; // Tên học phần
      // worksheet.getColumn(3).width = 15; // Tên lớp
      worksheet.getColumn(1).width = 16; // Họ tên giảng viên
      worksheet.getColumn(2).width = 12; // Tên học phần
      worksheet.getColumn(3).width = 12; // Tên lớp
      worksheet.getColumn(4).width = 10; // Số tiết
      // worksheet.getColumn(5).width = 20; // Thời gian thực hiện
      // worksheet.getColumn(6).width = 10; // Học kỳ
      // worksheet.getColumn(7).width = 20; // Địa Chỉ
      // worksheet.getColumn(8).width = 15; // Học vị
      worksheet.getColumn(5).width = 15; // Thời gian thực hiện
      worksheet.getColumn(6).width = 9; // Học kỳ
      worksheet.getColumn(7).width = 15; // Địa Chỉ
      worksheet.getColumn(8).width = 10; // Học vị
      worksheet.getColumn(9).width = 10; // Hệ số lương
      // worksheet.getColumn(10).width = 15; // Mức thanh toán
      // worksheet.getColumn(11).width = 15; // Thành tiền
      // worksheet.getColumn(12).width = 15; // Trừ thuế TNCN 10%
      // worksheet.getColumn(13).width = 15; // Còn lại
      worksheet.getColumn(10).width = 12; // Mức thanh toán
      worksheet.getColumn(11).width = 14; // Thành tiền
      worksheet.getColumn(12).width = 14; // Trừ thuế TNCN 10%
      worksheet.getColumn(13).width = 14; // Còn lại
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

      giangVienData.forEach((item) => {
        const mucThanhToan = 100000;
        const soTien = item.SoTiet * mucThanhToan;
        const truThue = soTien * 0.1;
        const thucNhan = soTien - truThue;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        const row = worksheet.addRow([
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          item.SoTiet,
          thoiGianThucHien,
          item.HocKy,
          item.DiaChi,
          item.HocVi,
          item.HSL,
          mucThanhToan,
          soTien,
          truThue,
          thucNhan,
        ]);
        row.font = { name: "Times New Roman", size: 12 };

        row.getCell(10).numFmt = "#,##0"; // Thành tiền
        row.getCell(11).numFmt = "#,##0"; // Trừ thuế TNCN 10%
        row.getCell(12).numFmt = "#,##0"; // Còn lại
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
            case 1: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 2: // Tên học phần
              cell.font = { name: "Times New Roman", size: 11 };
              break;
            case 3: // Tên lớp
              cell.font = { name: "Times New Roman", size: 11 };
              break;
            case 4: // Số tiết
              cell.font = { name: "Times New Roman", size: 11 };
              break;
            case 5: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 9 };
              break;
            case 6: // Học kỳ
              cell.font = { name: "Times New Roman", size: 10 };
              break;
            case 7: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 11 };
              break;
            case 8: // Học vị
              cell.font = { name: "Times New Roman", size: 11 };
              break;
            case 9: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 10: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 11: // Thành tiền
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 12: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 13: // Còn lại
              cell.font = { name: "Times New Roman", size: 12 };
              break;
          }
        });

        totalSoTiet += item.SoTiet;
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;
      });

      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
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
      totalRow.font = { name: "Times New Roman", bold: true };
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
      worksheet.addRow([]);

      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      const bangChuRow = worksheet.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien)}`,
      ]);
      bangChuRow.font = { name: "Times New Roman", italic: true, size: 14 };
      worksheet.mergeCells(`A${bangChuRow.number}:${bangChuRow.number}`);
      bangChuRow.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 6 trở đi
      const firstRowOfTable = 7; // Giả sử bảng bắt đầu từ hàng 7
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
    let fileName = `PhuLuc_GiangVien_Moi_Dot${dot}_Ki${ki}_${namHoc}`;
    if (khoa && khoa !== "ALL") {
      fileName += `_${sanitizeFileName(khoa)}`;
    }
    if (teacherName) {
      fileName += `_${sanitizeFileName(teacherName)}`;
    }
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

    // Ghi workbook vào response
    await workbook.xlsx.write(res);

    // Không cần gọi res.end() vì workbook.xlsx.write đã tự động kết thúc response
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
};
