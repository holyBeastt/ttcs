const ExcelJS = require('exceljs');

// Hàm xuất dữ liệu đồ án tốt nghiệp ra Excel
const exportDoanToExcel = async (req, res) => {
  try {
    const { renderData } = req.body;

    if (!renderData || renderData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để xuất file"
      });
    }

    // Định nghĩa header cho đồ án tốt nghiệp
    const headers = [
      "TT",
      "Sinh Viên", 
      "Mã SV",
      "Khoa",
      "Tên đề tài",
      "Giảng Viên Hướng Dẫn",
      "Giảng Viên Hướng Dẫn 1",
      "Giảng Viên Hướng Dẫn 2",
      "Ngày bắt đầu",
      "Ngày kết thúc"
    ];

    // Tạo workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Đồ án tốt nghiệp", {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
      },
    });

    // Header bảng
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.alignment = {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Thiết lập độ rộng cột
    const colWidths = [5, 25, 15, 10, 50, 30, 30, 30, 15, 15];
    worksheet.columns = headers.map((header, index) => ({
      header,
      key: header,
      width: colWidths[index]
    }));

    // Thêm dữ liệu từ renderData
    renderData.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1, // TT
        item.SinhVien || "", // Sinh Viên
        item.MaSV || "", // Mã SV
        item.MaPhongBan || "", // Khoa
        item.TenDeTai || "", // Tên đề tài
        item.GiangVienDefault || "", // Giảng Viên Hướng Dẫn
        item.GiangVien1 || "", // Giảng Viên Hướng Dẫn 1
        item.GiangVien2 || "", // Giảng Viên Hướng Dẫn 2
        item.NgayBatDau ? new Date(item.NgayBatDau).toLocaleDateString("vi-VN") : "", // Ngày bắt đầu
        item.NgayKetThuc ? new Date(item.NgayKetThuc).toLocaleDateString("vi-VN") : "" // Ngày kết thúc
      ]);
      
      // Thêm border cho từng ô
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "top",
          wrapText: true,
        };
        cell.font = { size: 11 };
      });
    });

    // Thiết lập chiều cao hàng
    worksheet.getRow(1).height = 30; // Header row
    worksheet.properties.defaultRowHeight = 25; // Data rows

    // Thiết lập header response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="do_an_tot_nghiep.xlsx"');

    // Ghi file và gửi response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error exporting doan data:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xuất file"
    });
  }
};

module.exports = {
  exportDoanToExcel
};
