/**
 * Payment Generator - Generates payment sheets for bank transfers
 */

const WorkbookFactory = require("../../shared_excel/core/workbook.factory");
const HeaderComponent = require("../components/header.component");
const SummaryComponent = require("../components/summary.component");
const PaymentLayout = require("../layouts/payment.layout");

class PaymentGenerator {
  /**
   * Create payment sheet in existing workbook
   */
  static createPaymentSheet(workbook, { summaries, khoa, namHoc }) {
    const sheetName = WorkbookFactory.sanitizeWorksheetName("Tiền chuyển khoản", "TienChuyenKhoan");
    const worksheet = WorkbookFactory.createWorksheet(workbook, sheetName, {
      frozenRows: 4,
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: {
          left: 0.2,
          right: 0.2,
          top: 0.25,
          bottom: 0.25,
          header: 0.1,
          footer: 0.1,
        },
      }
    });

    // Apply layout
    PaymentLayout.applyLayout(worksheet);

    // Create header
    let currentRow = HeaderComponent.createPaymentHeader(worksheet, { khoa, namHoc });
    
    // Create column headers
    currentRow = HeaderComponent.createPaymentColumnHeaders(worksheet, currentRow);

    // Create payment table
    const result = SummaryComponent.createPaymentSummaryTable(worksheet, summaries, currentRow);

    return {
      sheet: worksheet,
      totalPayment: result.totalPayment
    };
  }

  /**
   * Generate standalone payment workbook
   */
  static generatePaymentWorkbook({ summaries, khoa, namHoc }) {
    const workbook = WorkbookFactory.createWorkbook({
      title: `Payment Report - ${khoa}`,
      subject: `Thanh toán vượt giờ ${namHoc}`
    });

    this.createPaymentSheet(workbook, { summaries, khoa, namHoc });

    return workbook;
  }
}

module.exports = PaymentGenerator;