const ExcelJS = require('exceljs');

// Hàm tạo mã nhóm tương tự tableQC.ejs
function generateGroupCode(data) {
  const lopHocPhan = data.LopHocPhan || "";
  const kiHoc = data.KiHoc || "";
  const namHoc = data.NamHoc || "";
  const tenLop = data.TenLop || "";

  // Tách năm đầu tiên, loại bỏ khoảng trắng, rồi lấy 2 chữ số cuối
  const namRutGon = namHoc.split("-")[0].trim().slice(-2);

  // Tạo mã nhóm
  return `${lopHocPhan}-${kiHoc}-${namRutGon} (${tenLop})`;
}

// Hàm xuất dữ liệu thông tin giảng dạy ra Excel
const exportTeachingInfoToExcel = async (req, res) => {
  try {
    const { renderData } = req.body;

    if (!renderData || renderData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để xuất file"
      });
    }

    // Định nghĩa header đơn giản
    const headers = [
      "TT",
      "Học phần", 
      "Số TC",
      "GV theo TKB",
      "Mời giảng?",
      "GV giảng dạy",
      "Khoa",
      "Bộ môn",
      "Hệ đào tạo",
      "Số tiết LL",
      "Số tiết QC",
      "Ngày bắt đầu",
      "Ngày kết thúc"
    ];

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
    const colWidths = [5, 30, 6, 25, 12, 25, 10, 15, 15, 10, 10, 15, 15];
    worksheet.columns = headers.map((header, index) => ({
      header,
      key: header,
      width: colWidths[index]
    }));

    // Thêm dữ liệu thô từ teachingInfo2.ejs
    renderData.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1, // TT
        `${item.LopHocPhan} (${item.TenLop})`, // Học phần
        item.SoTinChi || "", // Số TC
        item.GiaoVien || "", // GV theo TKB
        item.MoiGiang ? "Có" : "Không", // Mời giảng?
        item.GiaoVienGiangDay || "", // GV giảng dạy
        item.Khoa || "", // Khoa
        item.BoMon || "", // Bộ môn
        item.he_dao_tao || "", // Hệ đào tạo
        item.LL || "", // Số tiết LL
        item.QuyChuan || "", // Số tiết QC
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
    res.setHeader('Content-Disposition', 'attachment; filename="thong_tin_giang_day.xlsx"');

    // Ghi file và gửi response
    await workbook.xlsx.write(res);
    res.end();

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
