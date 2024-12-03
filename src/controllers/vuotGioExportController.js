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

    // Sanitize file names after ensuring the parameters are defined
    const sanitizedNamHoc = sanitizeFileName(namHoc);
    const sanitizedKhoa = sanitizeFileName(khoa);
    const sanitizedTeacherName = sanitizeFileName(teacherName);

    // Truy vấn cơ sở dữ liệu
    let query = `
    SELECT 
      TenHocPhan AS TenHocPhan, 
      SoTC, 
      Lop, 
      QuyChuan, 
      LenLop, 
      HocKy, 
      NamHoc AS Nam, 
      Khoa, 
      GiangVien 
    FROM giangday
    WHERE NamHoc = ? AND Khoa = ? AND GiangVien = ?

    UNION ALL

    SELECT 
      TenHocPhan AS TenHocPhan, 
      SoTC, 
      Lop, 
      QuyChuan, 
      LenLop, 
      HocKy, 
      NamHoc AS Nam, 
      Khoa, 
      GiangVien 
    FROM lopngoaiquychuan
    WHERE NamHoc = ? AND Khoa = ? AND GiangVien = ?
    `;

    const [results] = await connection.query(query, [namHoc, khoa, teacherName, namHoc, khoa, teacherName]);

    // Kiểm tra xem có dữ liệu không
    if (results.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/vuotGioExport';</script>"
      );
    }
    // Nhóm dữ liệu theo kỳ và hệ
    const groupedResults = {
      "Kỳ 1": {
        "Hệ đóng học phí": [],
        "Hệ mật mã": []
      },
      "Kỳ 2": {
        "Hệ đóng học phí": [],
        "Hệ mật mã": []
      }
    };

    results.forEach(row => {
      const className = row.Lop; // Giả sử tên lớp được lưu trong thuộc tính 'Lop'
      const isHeDongHocPhi = /^[A-Za-z]\d/.test(className); // Kiểm tra nếu tên lớp bắt đầu bằng chữ cái và sau đó là chữ số
      const isHeMatMa = /^[A-Za-z][A-Za-z]/.test(className); // Kiểm tra nếu tên lớp bắt đầu bằng chữ cái và sau đó là chữ cái khác

      if (row.HocKy === 1) {
        if (isHeDongHocPhi) {
          groupedResults["Kỳ 1"]["Hệ đóng học phí"].push(row);
        } else if (isHeMatMa) {
          groupedResults["Kỳ 1"]["Hệ mật mã"].push(row);
        }
      } else if (row.HocKy === 2) {
        if (isHeDongHocPhi) {
          groupedResults["Kỳ 2"]["Hệ đóng học phí"].push(row);
        } else if (isHeMatMa) {
          groupedResults["Kỳ 2"]["Hệ mật mã"].push(row);
        }
      }
    });
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
    const titleRow1 = worksheet.addRow(["HỌC VIỆN KỸ THUẬT MẬT MÃ", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
    titleRow1.font = { name: "Times New Roman", size: 12, bold: true }; // Tăng kích thước phông chữ
    titleRow1.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);
    worksheet.mergeCells(`D${titleRow1.number}:G${titleRow1.number}`);
    titleRow1.height = 25; // Tăng chiều cao hàng

    const titleRow2 = worksheet.addRow(["Khoa", "", "", "Độc lập - Tự do - Hạnh phúc"]);
    titleRow2.font = { name: "Times New Roman", size: 12, bold: true, };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A${titleRow2.number}:C${titleRow2.number}`);
    worksheet.mergeCells(`D${titleRow2.number}:G${titleRow2.number}`);
    titleRow2.height = 25; // Tăng chiều cao hàng

    const titleRow3 = worksheet.addRow(["Bộ Môn", "", "", "Hà Nội, ngày tháng năm " + formatDateDMY(new Date())]);
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

    const titleRow5 = worksheet.addRow(["Khối lượng thực hiện nhiệm vụ đào tạo, khoa học và công nghệ năm học"]);
    titleRow5.font = { name: "Times New Roman", size: 12, bold: true };
    titleRow5.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; // Bật chế độ tự động xuống dòng
    worksheet.mergeCells(`A${titleRow5.number}:G${titleRow5.number}`);
    titleRow5.height = 25; // Tăng chiều cao hàng

    const titleRow7 = worksheet.addRow(["(Căn cứ theo Quyết định số 1409/QĐ-HVM ngày 30/12/2021 về việc quy định chế độ làm việc của giảng viên Học viện Kỹ thuật mật mã)"]);
    titleRow7.font = { name: "Times New Roman", size: 12};
    titleRow7.alignment = { horizontal: "center", vertical: "middle", wrapText: true  };
    worksheet.mergeCells(`A${titleRow7.number}:G${titleRow7.number}`);
    titleRow7.height = 55; // Tăng chiều cao hàng

    worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách
    // Thêm dòng thông tin cá nhân
    const titleRow9 = worksheet.addRow(["Họ và tên:", "", "", "Ngày sinh:"]); // Cập nhật để có định dạng giống như yêu cầu
    titleRow9.font = { name: "Times New Roman", size: 12 };
    titleRow9.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`A9:C9`); // Gộp ô A9 đến C9

    const titleRow10 = worksheet.addRow(["Ngày sinh"]); // Dòng này có thể không cần thiết nếu đã có trong titleRow10
    titleRow10.font = { name: "Times New Roman", size: 12 };
    titleRow10.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`D9:G9`); // Gộp ô D9 đến G9

    const titleRow11 = worksheet.addRow(["Học hàm / học vị:"]); // Tiêu đề cho học hàm / học vị
    titleRow11.font = { name: "Times New Roman", size: 12 };
    titleRow11.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`A10:C10`); // Gộp ô A10 đến C10

    const titleRow12 = worksheet.addRow(["Chức vụ hiện nay (Đảng, CQ, đoàn thể):"]); // Tiêu đề cho chức vụ
    titleRow12.font = { name: "Times New Roman", size: 12 };
    titleRow12.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`A11:E11`); // Gộp ô A11 đến E11

    const titleRow13 = worksheet.addRow(["Hệ số lương:"]); // Tiêu đề cho hệ số lương
    titleRow13.font = { name: "Times New Roman", size: 12 };
    titleRow13.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`A12:D12`); // Gộp ô A12 đến D12

    const titleRow14 = worksheet.addRow(["Thu nhập (lương thực nhận, không tính phụ cấp học hàm, học vị):"]); // Tiêu đề cho thu nhập
    titleRow14.font = { name: "Times New Roman", size: 12 };
    titleRow14.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`A13:G13`); // Gộp ô A13 đến G13

    // Tiêu đề cho phần giảng dạy
    const titleRow15 = worksheet.addRow(["A. GIẢNG DẠY VÀ ĐÁNH GIÁ HỌC PHẦN (không thống kê số giờ đã được thanh toán)"]); // Tiêu đề cho phần giảng dạy
    titleRow15.font = { name: "Times New Roman", size: 12, bold: true };
    titleRow15.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A15:G15`); // Gộp ô A15 đến G15

    const titleRow16 = worksheet.addRow(["A.1. Giảng dạy (Căn cứ vào mục 1 và 2 Phụ lục I. QĐ số 1409/QĐ-HVM)"]); // Tiêu đề cho giảng dạy
    titleRow16.font = { name: "Times New Roman", size: 12, bold: true };
    titleRow16.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`A16:G16`); // Gộp ô A16 đến G16


    let tableCount = 1; // Biến đếm số bảng


    for (const ky in groupedResults) {
      for (const he in groupedResults[ky]) {
        // Thêm tiêu đề cho bảng
        const titleRow = worksheet.addRow([`Bảng ${ky} - ${he}`]);
        titleRow.font = { name: "Times New Roman", size: 12 };
        titleRow.alignment = { horizontal: "left", vertical: "middle" };
        worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`); // Gộp ô cho tiêu đề



        // Thêm tiêu đề cho bảng dữ liệu
        const headerRow = worksheet.addRow(["TT", "Tên học phần", "Số TC (HT)", "Lớp học phần", "Loại hình đào tạo", "Số tiết theo TKB", "Số tiết QC"]);
        headerRow.font = { name: "Times New Roman", size: 12, bold: true };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };

        // Điều chỉnh chiều rộng cột
        worksheet.getColumn('A').width = 4.1; // Cột TT
        worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
        worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
        worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
        worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
        worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
        worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
        // Khởi tạo biến đếm cho cột TT
        let index = 1;

           // Khởi tạo các biến tổng cho bảng
    let totalSoTietTKB = 0;
    let totalSoTietQC = 0;

        // Thêm dữ liệu vào bảng
        groupedResults[ky][he].forEach((row) => {
          const dataRow = worksheet.addRow([
            index++, // Tăng dần cho cột TT
            row.TenHocPhan, // Tên học phần
            row.SoTC,       // Số TC
            row.Lop,        // Lớp học phần
            he === "Hệ mật mã" ? "Mật Mã" : "", // Nếu là hệ mật mã thì ghi "mật mã", ngược lại để trống
            row.LenLop,     // Số
            row.QuyChuan,   // Quy chuẩn
          ]);

           // Cộng dồn các giá trị
      totalSoTietTKB += row.LenLop; // Số tiết theo TKB
      totalSoTietQC += row.QuyChuan; // Số tiết quy chuẩn

          dataRow.font = { name: "Times New Roman", size: 12 };
          dataRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        });
         // Thêm dòng tổng cộng cho bảng
    const totalRow = worksheet.addRow([
      `Tổng cộng (${tableCount})`, // Cột TT để ghi chú
      "", // Tên học phần
      "",
      "",  // Lớp học phần
      "", // Loại hình đào tạo
      totalSoTietTKB, // Tổng Số tiết theo TKB
      totalSoTietQC // Tổng Số tiết quy chuẩn
    ]);
    worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

    // Định dạng dòng tổng cộng
    totalRow.font = { name: "Times New Roman", size: 12}; // Đặt đậm cho dòng tổng cộng
    totalRow.alignment = { horizontal: "center", vertical: "middle" };
       // Tăng biến đếm bảng lên 1
      tableCount++;

      }
    }


    // Xuất file Excel
    const fileName = `vuotGio_${sanitizedNamHoc}_${sanitizedKhoa}_${sanitizedTeacherName}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
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
    const query = 'SELECT GiangVien, Khoa FROM giangday';
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
