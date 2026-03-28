const ExcelJS = require("exceljs");
const createPoolConnection = require("../../config/databasePool");
const exportRepo = require("../../repositories/nckh_v3/export.repo");
const statsService = require("./stats.service");

class ExportService {
  /**
   * Export lecturer statistics to Excel.
   * Each lecturer will have their own sheet, grouped by research type.
   */
  async exportLecturerStats(namHoc, khoaId, keyword) {
    let connection;
    try {
      connection = await createPoolConnection();
      
      // 1. Get filtered list of lecturers
      const lecturers = await statsService.getLecturerSummary(namHoc, khoaId, keyword);
      if (!lecturers.length) {
        throw new Error("Không có dữ liệu để xuất");
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "NCKH V3 System";
      workbook.lastModifiedBy = "NCKH V3 System";
      workbook.created = new Date();

      // 2. Iterate through each lecturer and create a sheet
      for (const lecturer of lecturers) {
        // Sheet name limited to 31 chars and invalid chars replaced
        const safeName = (lecturer.tenNhanVien || "Lecturer")
          .replace(/[*?:\\/\[\]]/g, "")
          .substring(0, 31);
        
        const worksheet = workbook.addWorksheet(safeName);

        // Header info
        worksheet.mergeCells("A1:G1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ CHI TIẾT NGHIÊN CỨU KHOA HỌC - NĂM HỌC ${namHoc}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center" };

        worksheet.mergeCells("A2:G2");
        const lecturerInfoCell = worksheet.getCell("A2");
        lecturerInfoCell.value = `Giảng viên: ${lecturer.tenNhanVien} - Khoa: ${lecturer.lecturerKhoaName || "N/A"}`;
        lecturerInfoCell.font = { size: 12, italic: true };
        lecturerInfoCell.alignment = { horizontal: "center" };

        worksheet.addRow([]); // Blank row

        // Get records for this lecturer
        const records = await statsService.getLecturerRecords(lecturer.lecturerId, namHoc);
        
        // Group records by type
        const groupedRecords = this._groupRecordsByType(records);

        let currentRow = 5;

        for (const [typeLabel, groupRows] of Object.entries(groupedRecords)) {
          // Group Title Row
          const groupTitleRow = worksheet.addRow([typeLabel]);
          groupTitleRow.font = { bold: true };
          worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
          currentRow++;

          // Table Header
          const headerRow = worksheet.addRow([
            "STT",
            "Tên công trình",
            "Vai trò",
            "Số tiết",
            "Tổng tiết CT",
            "Tác giả chính",
            "Thành viên"
          ]);
          headerRow.font = { bold: true };
          headerRow.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" }
            };
            cell.alignment = { horizontal: "center" };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE0E0E0" }
            };
          });
          currentRow++;

          // Data Rows
          groupRows.forEach((rec, idx) => {
            const dataRow = worksheet.addRow([
              idx + 1,
              rec.tenCongTrinh,
              rec.vaiTroGiangVien,
              rec.soTietGiangVien,
              rec.tongSoTietCongTrinh,
              rec.tacGiaChinh,
              rec.thanhVien
            ]);
            dataRow.eachCell((cell) => {
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
              };
            });
            currentRow++;
          });

          worksheet.addRow([]); // Blank row after group
          currentRow++;
        }

        // Auto-fit columns
        worksheet.columns = [
          { width: 5 },  // STT
          { width: 50 }, // Tên công trình
          { width: 15 }, // Vai trò
          { width: 10 }, // Số tiết
          { width: 15 }, // Tổng tiết CT
          { width: 30 }, // Tác giả chính
          { width: 30 }  // Thành viên
        ];
      }

      return workbook;
    } finally {
      if (connection) connection.release();
    }
  }

  _groupRecordsByType(records) {
    const groups = {};
    records.forEach((rec) => {
      const label = rec.loaiNckhLabel || "Khác";
      if (!groups[label]) groups[label] = [];
      groups[label].push(rec);
    });
    return groups;
  }
}

module.exports = new ExportService();
