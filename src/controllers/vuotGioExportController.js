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
const exportVuotGio = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const { namHoc, khoa, teacherName } = req.query;

    // Kiểm tra các tham số đầu vào
    if (!namHoc || !khoa || !teacherName) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin năm học, khoa hoặc tên giảng viên",
      });
    }

    // Truy vấn cơ sở dữ liệu
    let query = `
  SELECT DISTINCT
    SUBSTRING_INDEX(gd.GiangVien, ' - ', 1) AS GiangVien, 
    gd.Lop AS Lop, 
    gd.QuyChuan AS SoTC, 
    gd.TenHocPhan AS TenHocPhan, 
    gd.LenLop AS LenLop  
FROM giangday gd
JOIN nhanvien nv ON gd.GiangVien = nv.TenNhanVien
WHERE gd.NamHoc = ? AND nv.MaPhongBan = ? AND gd.GiangVien = ?
`;
    const [results] = await connection.query(query, [namHoc, khoa, teacherName]);

    // Kiểm tra xem có dữ liệu không
    if (results.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/vuotGioExport';</script>"
      );
    }

    // Tạo file Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dữ liệu vượt giờ");

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
    const titleRow1 = worksheet.addRow(["HỌC VIỆN KỸ THUẬT MẬT MÃ"]);
    titleRow1.font = { name: "Times New Roman", size: 17 };
    titleRow1.alignment = { horizontal: "center", vertical: "middle", bold:true };
    worksheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);


    const titleRow2 = worksheet.addRow(["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
    titleRow2.font = { name: "Times New Roman", size: 17 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);


    const titleRow3 = worksheet.addRow(["Độc lập - Tự do - Hạnh phúc"]);
    titleRow3.font = { name: "Times New Roman", size: 10, bold: true, strike:true };
    titleRow3.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow2.number}:G${titleRow2.number}`);

    const titleRow4 = worksheet.addRow(["Khoa"]);
    titleRow4.font = { name: "Times New Roman", size: 10 };
    titleRow4.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${titleRow2.number}:C${titleRow2.number}`);

    const titleRow5 = worksheet.addRow(["Bộ Môn"]);
    titleRow5.font = { name: "Times New Roman", size: 10, bold: true };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${titleRow3.number}:C${titleRow3.number}`);

    const titleRow6 = worksheet.addRow(["Hà Nội, ngày tháng năm " + formatDateDMY(new Date())]);
    titleRow6.font = { name: "Times New Roman", size: 10 };
    titleRow6.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow3.number}:G${titleRow3.number}`);

    const titleRow7 = worksheet.addRow(["Kê khai"]);
    titleRow7.font = { name: "Times New Roman", size: 12, bold: true };
    titleRow7.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${titleRow1.number}:G${titleRow1.number}`);

    const titleRow8 = worksheet.addRow(["Khối lượng thực hiện nhiệm vụ đào tạo, khoa học và công nghệ năm học"]);
    titleRow8.font = { name: "Times New Roman", size: 10, bold: true };
    titleRow8.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${titleRow1.number}:G${titleRow1.number}`);

    const titleRow9 = worksheet.addRow(["(Căn cứ theo Quyết định số 1409/QĐ-HVM ngày 30/12/2021 về việc quy định chế độ làm việc của giảng viên Học viện Kỹ thuật mật mã)"]);
    titleRow9.font = { name: "Times New Roman", size: 10, bold: true, wrapText: true };
    titleRow9.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);

    const titleRow10 = worksheet.addRow(["Họ và tên:"]);
    titleRow10.font = { name: "Times New Roman", size: 10 };
    titleRow10.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);


    const titleRow11 = worksheet.addRow(["Ngày sinh"]);
    titleRow11.font = { name: "Times New Roman", size: 10 };
    titleRow11.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);

    const titleRow12 = worksheet.addRow(["Học hàm / học vị:"]);
    titleRow12.font = { name: "Times New Roman", size: 10 };
    titleRow12.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);

    const titleRow13 = worksheet.addRow(["Chức vụ hiện nay (Đảng, CQ, đoàn thể):"]);
    titleRow13.font = { name: "Times New Roman", size: 10 };
    titleRow13.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);

    const titleRow14 = worksheet.addRow(["Hệ số lương:"]);
    titleRow14.font = { name: "Times New Roman", size: 10 };
    titleRow14.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);

    const titleRow15 = worksheet.addRow(["Thu nhập (lương thực nhận, không tính phụ cấp học hàm, học vị):"]);
    titleRow15.font = { name: "Times New Roman", size: 10 };
    titleRow15.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);

    const titleRow16 = worksheet.addRow(["A.GIẢNG DẠY VÀ ĐÁNH GIÁ HỌC PHẦN (không thống kê số giờ đã được thanh toán)"]);
    titleRow16.font = { name: "Times New Roman", size: 10, bold: true };
    titleRow16.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);

    const titleRow17 = worksheet.addRow(["A.1.Giảng dạy (Căn cứ vào mục 1 và 2 Phụ lục I. QĐ số 1409/QĐ-HVM)"]);
    titleRow17.font = { name: "Times New Roman", size: 10, bold: true };
    titleRow17.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);


    //    // Thêm tiêu đề cột
    // worksheet.columns = [
    //   { header: 'TT', key: 'tt', width: 5 },
    //   { header: 'Tên học phần', key: 'TenHocPhan', width: 12 },
    //   { header: 'Số TC (HT)', key: 'SoTC', width: 12 },
    //   { header: 'Lớp học phần', key: 'Lop', width: 12 },
    //   { header: 'Loại hình đào tạo', key: 'LoaiHinhDaoTao', width: 12 },
    //   { header: 'Số tiết theo TKB', key: 'LenLop', width: 12 },
    //   { header: 'Số tiết QC', key: 'QuyChuan', width: 12 },
    // ];

    // // Thêm dữ liệu vào worksheet
    // let rowIndex = 17;
    // let ttIndex = 1;
    // results.forEach((row) => {
    //   const newRow = [
    //     ttIndex, // Use the TT index as the first column value
    //     row.TenHocPhan,
    //     row.SoTC,
    //     row.Lop,
    //     row.LoaiHinhDaoTao,
    //     row.LenLop,
    //     row.QuyChuan,
    //   ];
    //   worksheet.addRow(newRow);
    //   ttIndex++; // Increment the TT index for the next row
    //   rowIndex++;
    // });

    // // Thêm data validation cho cột "Loại hình đào tạo"
    // const validationValues = ['Đại học', 'Sau đại học', 'Ngắn hạn']; // Thay thế bằng các loại hình đào tạo thực tế
    // worksheet.getCell(`E17`).dataValidation = {
    //   type: 'list',
    //   allowBlank: true,
    //   formula1: `"${validationValues.join(',')}"`, // Chuyển đổi mảng thành chuỗi phân tách bằng dấu phẩy
    //   showErrorMessage: true,
    //   errorTitle: 'Invalid input',
    //   error: 'Please select a valid type.',
    // };

    // // Áp dụng data validation cho tất cả các ô trong cột "Loại hình đào tạo"
    // for (let i = 17; i < rowIndex; i++) {
    //   worksheet.getCell(`E${i}`).dataValidation = {
    //     type: 'list',
    //     allowBlank: true,
    //     formula1: `"${validationValues.join(',')}"`,
    //     showErrorMessage: true,
    //     errorTitle: 'Invalid input',
    //     error: 'Please select a valid type.',
    //   };
    // }


    // Áp dụng data validation cho tất cả các ô trong cột "Loại hình đào tạo"

    // Xuất file Excel
    const fileName = `vuotGio_${namHoc}_${khoa}_${teacherName}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

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
const getvuotGioExportSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("vuotGioExport.ejs", {
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
  exportVuotGio,
  getvuotGioExportSite,
};
