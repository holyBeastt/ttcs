const { COLOR, styleCell } = require("../utils/excel-style.utils");
const PaymentCalculator = require("../../department_excel/data/calculator");

const renderPaymentSheet = (workbook, summaries) => {
  const sheet = workbook.addWorksheet("Tiền chuyển khoản", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  sheet.properties.defaultRowHeight = 22;
  sheet.views = [{ state: "frozen", ySplit: 4 }];

  [6, 26, 12, 22, 24, 18].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  const titleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E79" } };
  const subFill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9EAF7" } };
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "A9D08E" } };

  const applyBorder = (cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  };

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "TIỀN CHUYỂN KHOẢN";
  styleCell(sheet.getCell("A1"), { bgColor: titleFill.fgColor.argb, bold: true, fontColor: COLOR.WHITE, fontSize: 14, hAlign: "center" });

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = "Bảng kê thanh toán vượt giờ";
  styleCell(sheet.getCell("A2"), { bgColor: subFill.fgColor.argb, bold: true, hAlign: "center" });

  const headers = ["STT", "Họ tên giảng viên", "Mã phòng ban", "Số tài khoản", "Ngân hàng", "Số tiền chuyển khoản"];
  headers.forEach((label, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = label;
    styleCell(cell, { bgColor: headerFill.fgColor.argb, bold: true, hAlign: "center", wrapText: true });
  });

  let row = 5;
  let total = 0;

  (summaries || []).forEach((summary, index) => {
    const bd = summary.breakdown || PaymentCalculator.computeSdoBreakdown(summary.tableF, summary.thanhToan, summary.luong);
    const amount = bd.thucNhan ?? bd.money?.total ?? PaymentCalculator.calculatePaymentAmount(summary.thanhToan || 0, summary.luong || 0);
    total += amount;
    const values = [
      index + 1,
      summary.giangVien || "",
      summary.maKhoa || summary.khoa || "",
      summary.soTaiKhoan || "",
      summary.nganHang || "",
      amount,
    ];

    values.forEach((value, colIndex) => {
      const cell = sheet.getCell(row, colIndex + 1);
      cell.value = value;
      cell.numFmt = colIndex === 5 ? "#,##0.00" : undefined;
      applyBorder(cell);
      styleCell(cell, {
        hAlign: colIndex === 1 || colIndex === 5 ? "left" : "center",
        fontSize: 11,
      });
    });

    row += 1;
  });

  sheet.mergeCells(`A${row}:E${row}`);
  const totalLabelCell = sheet.getCell(row, 1);
  totalLabelCell.value = "TỔNG CỘNG";
  styleCell(totalLabelCell, { bold: true, bgColor: "EEF3FF", hAlign: "center" });

  const totalCell = sheet.getCell(row, 6);
  totalCell.value = Number(total.toFixed(2));
  totalCell.numFmt = "#,##0.00";
  styleCell(totalCell, { bold: true, bgColor: "EEF3FF", hAlign: "center" });

  for (let col = 1; col <= 6; col += 1) {
    applyBorder(sheet.getCell(row, col));
    sheet.getCell(row, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF3FF" } };
  }

  return sheet;
};

module.exports = {
  renderPaymentSheet,
};
