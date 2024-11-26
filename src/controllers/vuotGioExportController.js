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
        const query = `
            SELECT * FROM your_table_name
            WHERE namHoc = ? AND khoa = ? AND teacherName = ?
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

        // Thêm tiêu đề cột
        worksheet.columns = [
            { header: "Tên Giảng Viên", key: "teacherName", width: 30 },
            { header: "Khoa", key: "khoa", width: 30 },
            { header: "Năm Học", key: "namHoc", width: 15 },
            // Thêm các cột khác mà bạn cần
        ];

        // Thêm dữ liệu vào worksheet
        results.forEach((row) => {
            worksheet.addRow(row);
        });

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
  