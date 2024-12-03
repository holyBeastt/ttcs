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
    let queryGiangDay = `
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
    WHERE NamHoc = ? AND Khoa = ? AND GiangVien = ?`;

let queryLopNgoaiQuyChuan = `
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
    WHERE NamHoc = ? AND Khoa = ? AND GiangVien = ?`;

let queryGiuaky = `
    SELECT 
      TenHocPhan AS TenHocPhanGK, 
      NamHoc AS Nam, 
      Khoa, 
      GiangVien, 
      HinhThucKTGiuaKy, 
      SoDe, 
      SoTietKT, 
      SoSV, 
      Lop AS LopGK ,
      HocKy
    FROM 
      giuaky 
    WHERE 
      NamHoc = ? AND Khoa = ? AND GiangVien = ?`;

// Thực hiện các truy vấn
const [resultsGiangDay] = await connection.query(queryGiangDay, [namHoc, khoa, teacherName]);
const [resultsLopNgoaiQuyChuan] = await connection.query(queryLopNgoaiQuyChuan, [namHoc, khoa, teacherName]);
const [resultsGiuaky] = await connection.query(queryGiuaky, [namHoc, khoa, teacherName]);

// Kết hợp dữ liệu từ các bảng
const combinedResults = [...resultsGiangDay, ...resultsLopNgoaiQuyChuan];





    // Kiểm tra xem có dữ liệu không
    if (combinedResults.length === 0 && resultsGiuaky.length === 0) {
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
    const groupedResultsGiuaKy = {
      "Kỳ 1": {
        "Hệ đóng học phí": [],
        "Hệ mật mã": []
      },
      "Kỳ 2": {
        "Hệ đóng học phí": [],
        "Hệ mật mã": []
      }
    };

    combinedResults.forEach(row => {
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
    resultsGiuaky.forEach(row => {
      const className = row.Lop; 
      const isHeDongHocPhi = /^[A-Za-z]\d/.test(className); 
      const isHeMatMa = /^[A-Za-z][A-Za-z]/.test(className); 
    
      if (row.HocKy === 1) {
        if (isHeDongHocPhi) {
          groupedResultsGiuaKy["Kỳ 1"]["Hệ đóng học phí"].push(row);
        } else if (isHeMatMa) {
          groupedResultsGiuaKy["Kỳ 1"]["Hệ mật mã"].push(row);
        }
      } else if (row.HocKy === 2) {
        if (isHeDongHocPhi) {
          groupedResultsGiuaKy["Kỳ 2"]["Hệ đóng học phí"].push(row);
        } else if (isHeMatMa) {
          groupedResultsGiuaKy["Kỳ 2"]["Hệ mật mã"].push(row);
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
    titleRow7.font = { name: "Times New Roman", size: 12 };
    titleRow7.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.mergeCells(`A${titleRow7.number}:G${titleRow7.number}`);
    titleRow7.height = 55; // Tăng chiều cao hàng

    worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách
    // Thêm dòng thông tin cá nhân
    const titleRow9 = worksheet.addRow(["Họ và tên:", "", "", "Ngày sinh:"]); // Cập nhật để có định dạng giống như yêu cầu
    titleRow9.font = { name: "Times New Roman", size: 12 };
    titleRow9.alignment = { horizontal: "left", vertical: "middle" };
    worksheet.mergeCells(`A9:C9`); // Gộp ô A9 đến C9

   

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

    worksheet.addRow([]); // Thêm một hàng trống để tạo khoảng cách

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
    let totalSoTietTKBAll = 0; // Tổng số tiết TKB cho tất cả các bảng
    let totalSoTietQCAll = 0; // Tổng số tiết quy chuẩn cho tất cả các bảng


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
          // Cộng dồn cho tổng tất cả bảng
          totalSoTietTKBAll += row.LenLop;
          totalSoTietQCAll += row.QuyChuan;
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
      totalSoTietTKBAll, // Tổng số tiết theo TKB cho tất cả các bảng
      totalSoTietQCAll // Tổng số tiết quy chuẩn cho tất cả các bảng
    ]);

    // Gộp cột A và B cho dòng tổng kết
    worksheet.mergeCells(`A${grandTotalRow.number}:E${grandTotalRow.number}`);

    // Định dạng dòng tổng kết
    grandTotalRow.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt đậm cho dòng tổng kết
    grandTotalRow.alignment = { horizontal: "center", vertical: "middle" };


    const titleRow17 = worksheet.addRow(["A.2.Đánh giá giữa học phần (Căn cứ vào Mục 6.1 Phụ lục I. QĐ số 1409/QĐ-HVM)(Lớp dưới 40 sv được tính 02 đề, lớp từ 41 - 80 được tính 03 đề, lớp trên 80 được tính 04 đề)"]);
    titleRow17.font = { name: "Times New Roman", size: 12, bold: true };
    titleRow17.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.mergeCells(`A${titleRow17.number}:G${titleRow17.number}`);
    titleRow17.height = 40; // Tăng chiều cao hàng

    let tableCount1 = 5; // Biến đếm số bảng
    let totalSoTietKTAll = 0; // Khai báo biến totalSoTietKTAll ở đầu hàm

    for (const ky in groupedResultsGiuaKy) {
      for (const he in groupedResultsGiuaKy[ky]) {
        // Thêm tiêu đề cho bảng
        const titleRow = worksheet.addRow([`Bảng ${ky} - ${he}`]);
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
          "Số tiết ra đề/ Coi thi/ Chấm thi"
        ]);
        headerRow.font = { name: "Times New Roman", size: 12, bold: true };
        headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

        // Điều chỉnh chiều rộng cột (nếu cần)
        worksheet.getColumn('A').width = 4.1; // Cột TT
        worksheet.getColumn('B').width = 23.78; // Cột Tên học phần
        worksheet.getColumn('C').width = 13.11; // Cột Số TC (HT)
        worksheet.getColumn('D').width = 18.33; // Cột Lớp học phần
        worksheet.getColumn('E').width = 17.22; // Cột Loại hình đào tạo
        worksheet.getColumn('F').width = 16.89; // Cột Số tiết theo TKB
        worksheet.getColumn('G').width = 10.67; // Cột Số tiết QC
        let index = 1;



        let totalSoTietKT = 0;
        // Nhập dữ liệu tương ứng vào cột
        groupedResultsGiuaKy[ky][he].forEach((row) => {
          const dataRow = worksheet.addRow([
            index++, // Tăng dần cho cột TT
            row.TenHocPhanGK, // Tên học phần
            row.HinhThucKTGiuaKy, // Ra đề/ coi thi/chấm thi giữa học phần
            row.LopGK, // Lớp học phần
            row.SoSV, // Số sinh viên của lớp
            row.SoDe, // Số đề
            row.SoTietKT // Số tiết ra đề/ Coi thi/ Chấm thi
          ]);

          totalSoTietKT += row.SoTietKT; // Số tiết theo TKB
          totalSoTietKTAll += row.SoTietKT; // Cộng dồn vào tổng số tiết cho tất cả các bảng


          // Định dạng dòng dữ liệu
          dataRow.font = { name: "Times New Roman", size: 12 };
          dataRow.alignment = { horizontal: "center", vertical: "middle" };
        });
        // Thêm dòng tổng cộng cho bảng
        const totalRow = worksheet.addRow([
          `Tổng cộng (${tableCount1})`, // Cột TT để ghi chú
          "", // Tên học phần
          "",
          "",  // Lớp học phần
          "", // Loại hình đào tạo
          "", // Tổng Số tiết theo TKB
          totalSoTietKT // Tổng Số tiết quy chuẩn
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
      totalSoTietKTAll // Tổng số tiết quy chuẩn cho tất cả các bảng
    ]);

    // Gộp cột A và B cho dòng tổng kết
    worksheet.mergeCells(`A${grandTotalRow1.number}:E${grandTotalRow1.number}`);

    // Định dạng dòng tổng kết
    grandTotalRow1.font = { name: "Times New Roman", size: 12, bold: true }; // Đặt đậm cho dòng tổng kết
    grandTotalRow1.alignment = { horizontal: "center", vertical: "middle" };



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
