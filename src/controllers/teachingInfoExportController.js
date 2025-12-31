const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Hàm format ngày tháng
const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  // Sử dụng các phương thức lấy giá trị theo giờ địa phương
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// Hàm chuyển số sang La Mã
const toRoman = (num) => {
  const romanNumerals = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ];
  let roman = "";
  for (const [letter, value] of romanNumerals) {
    while (num >= value) {
      roman += letter;
      num -= value;
    }
  }
  return roman;
};

// Hàm xuất dữ liệu thông tin giảng dạy ra Excel - Format giống Quy chuẩn chính thức
const exportTeachingInfoToExcel = async (req, res) => {
  try {
    const { renderData } = req.body;

    if (!renderData || renderData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để xuất file"
      });
    }

    // FE đã filter data trước khi gửi, không cần filter lại ở BE
    const filteredData = renderData;

    // 1) Chuẩn bị key và map tiêu đề - BoMon là cột riêng, Khoa dùng để nhóm section
    const orderedKeys = [
      "STT",
      "LopHocPhan",
      "SoTinChi",
      "TenLop",
      "he_dao_tao",
      "GiaoVien",
      "GiaoVienGiangDay",
      "BoMon",          // Bộ môn ăn theo giảng viên
      "MoiGiang",
      "NgayBatDau",
      "NgayKetThuc",
      "LL",
      "QuyChuan",
      "GhiChu",
    ];

    const titleMap = {
      Dot: "Đợt",
      KiHoc: "Kì",
      NamHoc: "Năm",
      LopHocPhan: "Lớp học phần",
      SoTinChi: "Số TC",
      TenLop: "Mã lớp",
      he_dao_tao: "Hệ đào tạo",
      GiaoVien: "Giảng viên theo TKB",
      GiaoVienGiangDay: "Giảng viên giảng dạy",
      BoMon: "Bộ môn",
      MoiGiang: "Mời giảng?",
      NgayBatDau: "Ngày bắt đầu",
      NgayKetThuc: "Ngày kết thúc",
      LL: "Số tiết LL",
      QuyChuan: "Số tiết QC",
      GhiChu: "Ghi chú",
    };

    // Danh sách header hiển thị
    const headers = orderedKeys.map((key) =>
      key === "STT" ? "STT" : titleMap[key] || key
    );
    const totalColumns = headers.length;

    // Tạo workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Thông tin giảng dạy", {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
      },
    });

    // ========================
    // PHẦN HEADER NGOÀI
    // ========================
    // Tính toán vị trí căn giữa dựa trên số cột
    const leftStartCol = 1;
    const leftEndCol = Math.floor(totalColumns / 3); // 1/3 bên trái
    const rightStartCol = Math.floor(totalColumns * 2 / 3); // Bắt đầu từ 2/3
    const rightEndCol = totalColumns; // Đến cuối

    // Row 1: (Trái - Phải)
    let row = worksheet.addRow([]);
    row.getCell(leftStartCol).value = "BAN CƠ YẾU CHÍNH PHỦ".toUpperCase();
    row.getCell(rightStartCol).value = "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM".toUpperCase();
    worksheet.mergeCells(row.number, leftStartCol, row.number, leftEndCol);
    worksheet.mergeCells(row.number, rightStartCol, row.number, rightEndCol);

    // Căn giữa, in đậm
    row.getCell(leftStartCol).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    row.getCell(rightStartCol).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    row.getCell(leftStartCol).font = { bold: true };
    row.getCell(rightStartCol).font = { bold: true };

    // Row 2: (Trái - Phải)
    row = worksheet.addRow([]);
    row.getCell(leftStartCol).value = "HỌC VIỆN KỸ THUẬT MẬT MÃ".toUpperCase();
    row.getCell(rightStartCol).value = "Độc lập - Tự do - Hạnh phúc";

    worksheet.mergeCells(row.number, leftStartCol, row.number, leftEndCol);
    worksheet.mergeCells(row.number, rightStartCol, row.number, rightEndCol);

    // Căn giữa & in đậm
    row.getCell(leftStartCol).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    row.getCell(rightStartCol).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    row.getCell(leftStartCol).font = { bold: true };
    row.getCell(rightStartCol).font = { bold: true };

    // Row 3: (Trái - Phải)
    row = worksheet.addRow([]);
    row.getCell(leftStartCol).value = "Số:          /TB-HVM";
    row.getCell(rightStartCol).value = "Hà Nội, ngày        tháng        năm           ";
    worksheet.mergeCells(row.number, leftStartCol, row.number, leftEndCol);
    worksheet.mergeCells(row.number, rightStartCol, row.number, rightEndCol);
    row.getCell(leftStartCol).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    row.getCell(rightStartCol).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    // Row 4: dòng trống
    row = worksheet.addRow([]);
    worksheet.mergeCells(row.number, 1, row.number, totalColumns);

    // ========================
    // PHẦN THÔNG BÁO
    // ========================

    // Row 5: THÔNG BÁO
    row = worksheet.addRow([]);
    row.getCell(1).value = "THÔNG BÁO".toUpperCase();
    worksheet.mergeCells(row.number, 1, row.number, totalColumns);
    row.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    row.getCell(1).font = { bold: true };

    // Row 6: Số tiết quy chuẩn...
    row = worksheet.addRow([]);
    const dotValue = filteredData[0]?.Dot || filteredData[0]?.dot || "";
    const kiHoc = filteredData[0]?.KiHoc || filteredData[0]?.Ki || "";
    const namHoc = filteredData[0]?.NamHoc || filteredData[0]?.Nam || "";
    row.getCell(
      1
    ).value = `Thông tin giảng dạy thuộc đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc}`;
    worksheet.mergeCells(row.number, 1, row.number, totalColumns);
    row.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    row.getCell(1).font = { bold: true };

    // Row 7: (Cơ sở đào tạo phía Bắc)
    row = worksheet.addRow([]);
    row.getCell(1).value = "(Cơ sở đào tạo phía Bắc)";
    worksheet.mergeCells(row.number, 1, row.number, totalColumns);
    row.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    row.getCell(1).font = { name: "Times New Roman", italic: true };

    // ========================
    // PHẦN CÁC "CĂN CỨ..."
    // ========================
    const canCuuList = [
      "           Căn cứ Thông tư số 20/2020/TT-BGDĐT ngày 27 tháng 7 năm 2020 của Bộ trưởng Bộ Giáo dục và đào tạo ban hành Quy định chế độ làm việc của giảng viên cơ sở giáo dục đại học;",
      "           Căn cứ Quyết định số 1409/QĐ-HVM ngày 30 tháng 12 năm 2021 của Giám đốc Học viện Kỹ thuật mật mã ban hành Quy định chế độ làm việc đối với giảng viên Học viện Kỹ thuật mật mã;",
      `           Căn cứ Thời khóa biểu đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc};`,
      `           Căn cứ kết quả đăng ký các học phần của học viên, sinh viên thuộc đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc};`,
      "           Căn cứ Đề nghị thay đổi giảng viên các lớp học phần của các Khoa.",
      `           Học viện Kỹ thuật mật mã thông báo thông tin giảng dạy thuộc đợt ${dotValue}, học kỳ ${kiHoc}, năm học ${namHoc} (Cơ sở đào tạo phía Bắc) như sau:`,
    ];

    const rowsWithFixedHeight = [0, 1]; // Các dòng x3 chiều cao

    canCuuList.forEach((text, index) => {
      let r = worksheet.addRow([]);
      r.getCell(1).value = text;
      worksheet.mergeCells(r.number, 1, r.number, totalColumns);
      r.getCell(1).alignment = {
        horizontal: "left",
        vertical: "top",
        wrapText: true,
      };
      if (rowsWithFixedHeight.includes(index)) {
        r.height = 45;
      }
    });

    // Thêm 1 row trống trước khi vào bảng
    worksheet.addRow([]);

    // ========================
    // PHẦN HEADER BẢNG
    // ========================
    // Thêm header bảng
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.font = { bold: true };
    });
    // Lưu lại dòng bắt đầu của vùng bảng
    const tableStart = headerRow.number;

    // ========================
    // XỬ LÝ DỮ LIỆU: NHÓM THEO KHOA
    // ========================
    let sttCounter = 1;
    const groupedData = filteredData.reduce((acc, item) => {
      const department = item.Khoa || "Khac";
      if (!acc[department]) acc[department] = [];
      const rowData = orderedKeys.map((key) => {
        if (key === "STT") {
          return `${sttCounter++}`;
        } else if (key === "NgayBatDau" || key === "NgayKetThuc") {
          // Format ngày tháng
          return item[key] ? formatDate(item[key]) : "";
        } else if (key === "MoiGiang") {
          // Chuyển đổi 0/1 thành Có/Không
          return item[key] === 1 ? "Có" : "Không";
        } else if (key === "LL") {
          // Xử lý NULL: nếu NULL hoặc undefined thì set thành 0
          const value = item[key];
          return (value === null || value === undefined || value === "") ? 0 : value;
        } else {
          return item[key] || "";
        }
      });
      acc[department].push(rowData);
      return acc;
    }, {});

    let romanCounter = 1;
    for (const [department, rowsData] of Object.entries(groupedData)) {
      const roman = toRoman(romanCounter++);
      const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
      let dividerRow = worksheet.addRow([dividerText]);
      worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, totalColumns);
      dividerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      dividerRow.font = { bold: true };

      // Thêm viền cho toàn bộ hàng
      for (let col = 1; col <= totalColumns; col++) {
        dividerRow.getCell(col).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }

      // Thêm data rows
      rowsData.forEach((rData) => {
        worksheet.addRow(rData);
      });
    }

    worksheet.addRow([]);

    // Lưu lại dòng kết thúc của vùng bảng (trước phần thông báo cuối)
    const tableEnd = worksheet.lastRow.number;

    // ========================
    // PHẦN ROW CUỐI: THÔNG BÁO KẾT
    // ========================
    row = worksheet.addRow([]);
    row.getCell(1).value =
      "        Nhận được Thông báo này các cơ quan, đơn vị có liên quan chủ động triển khai thực hiện./.";
    worksheet.mergeCells(row.number, 1, row.number, totalColumns);
    row.getCell(1).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };

    row = worksheet.addRow([]); // Dòng trống
    worksheet.mergeCells(row.number, 1, row.number, totalColumns);

    // ==============
    // PHẦN NƠI NHẬN & CHỮ KÝ
    // ==============

    // 1) Dòng "Nơi nhận" (bên trái) & "KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC" (bên phải)
    row = worksheet.addRow([]);
    row.getCell(2).value = "Nơi nhận:";
    worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
    row.getCell(2).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };
    row.getCell(2).font = { bold: true };

    // Bên phải
    row.getCell(7).value = "KT. GIÁM ĐỐC\nPHÓ GIÁM ĐỐC";
    worksheet.mergeCells(row.number, 7, row.number, totalColumns); // G->K
    row.getCell(7).alignment = {
      horizontal: "center",
      vertical: "top",
      wrapText: true,
    };
    row.getCell(7).font = { bold: true };

    // 2) Các dòng gạch đầu dòng bên trái
    const bulletLines = [
      "- Ban Giám đốc (2) (để b/c)",
      "- Phòng KH-TC;",
      "- Các khoa: NM, ATTT, CNTT, ĐTVT,",
      "  TTTH, CB, LLCT, KQS&QĐ...;",
      "- Lưu: VT, ĐT P13.",
    ];
    bulletLines.forEach((text) => {
      row = worksheet.addRow([]);
      // Bên trái
      row.getCell(2).value = text;
      worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
      row.getCell(2).alignment = {
        horizontal: "left",
        vertical: "top",
        wrapText: true,
      };

      // Bên phải để trống, vẫn merge để không bị border
      worksheet.mergeCells(row.number, 7, row.number, totalColumns);
    });

    // 3) Thêm một vài dòng trống (tùy chỉnh) để tạo khoảng cho chữ ký
    for (let i = 0; i < 2; i++) {
      row = worksheet.addRow([]);
      worksheet.mergeCells(row.number, 1, row.number, 6);
      worksheet.mergeCells(row.number, 7, row.number, totalColumns);
    }

    // ========================
    // ĐỊNH DẠNG CHUNG (border, font, wrapText)
    // ========================
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (rowNumber >= tableStart && rowNumber <= tableEnd) {
          // Vùng bảng: áp dụng border và căn giữa theo vertical
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
          cell.alignment = {
            horizontal: cell.alignment?.horizontal || "left",
            vertical: "middle",
            wrapText: true,
          };
        } else {
          // Vùng ngoài bảng: không viền, chỉ thêm wrapText: true
          cell.border = undefined;
          cell.alignment = {
            horizontal: cell.alignment?.horizontal || "left",
            vertical: "top",
            wrapText: true,
          };
        }
        cell.font = {
          name: "Times New Roman",
          size: 13,
          bold: cell.font?.bold || false,
        };
      });
    });

    // ========================
    // ĐỘ RỘNG CỘT
    // ========================
    // Định nghĩa độ rộng cho từng cột (Khoa dùng cho section header, không phải cột)
    const columnWidths = {
      STT: 6,                    // Số thứ tự - nhỏ
      LopHocPhan: 20,            // Lớp học phần - rộng
      SoTinChi: 8,               // Số TC - nhỏ
      TenLop: 12,                // Mã lớp - trung bình
      he_dao_tao: 12,            // Hệ đào tạo - trung bình
      GiaoVien: 25,              // Giảng viên theo TKB - rất rộng
      GiaoVienGiangDay: 25,      // Giảng viên giảng dạy - rất rộng
      BoMon: 15,                 // Bộ môn - ăn theo giảng viên
      MoiGiang: 10,              // Mời giảng? - trung bình
      NgayBatDau: 12,            // Ngày bắt đầu - trung bình
      NgayKetThuc: 12,           // Ngày kết thúc - trung bình
      LL: 8,                     // Số tiết LL
      QuyChuan: 10,              // Số tiết QC
      GhiChu: 15,                // Ghi chú
    };

    // Áp dụng độ rộng cho từng cột
    for (let i = 1; i <= totalColumns; i++) {
      const keyIndex = i - 1;
      const key = orderedKeys[keyIndex];
      if (columnWidths[key]) {
        worksheet.getColumn(i).width = columnWidths[key];
      } else {
        // Nếu không có trong map, đặt mặc định
        worksheet.getColumn(i).width = 12;
      }
    }

    // ========================
    // GHI FILE VÀ TRẢ VỀ CLIENT
    // ========================
    const fileName = `thong_tin_giang_day_${dotValue}_${kiHoc}_${namHoc}.xlsx`;
    const filePath = path.join("./uploads", fileName);

    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Lỗi khi gửi file:", err);
        return res.status(500).send("Không thể tải file");
      }
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Lỗi khi xóa file:", unlinkErr);
        } else {
          console.log("File đã được xóa thành công sau khi gửi.");
        }
      });
    });

  } catch (error) {
    console.error("Error exporting teaching info:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xuất file"
    });
  }
};

module.exports = {
  exportTeachingInfoToExcel
};
