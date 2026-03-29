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
            dataRow.eachCell((cell, colNumber) => {
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
              };
              if ([1, 3, 4, 5].includes(colNumber)) {
                cell.alignment = { horizontal: "center", vertical: "middle" };
              } else {
                cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
              }
              if ([4, 5].includes(colNumber)) {
                cell.numFmt = "#,##0.00";
              }
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

  /**
   * Export faculty statistics to Excel.
   * If khoaId is 'ALL', create a sheet for each department.
   */
  async exportFacultyStats(namHoc, khoaId) {
    let connection;
    try {
      connection = await createPoolConnection();
      const workbook = this._createWorkbook();

      const faculties = await this._getFacultiesToExport(connection, khoaId);
      if (!faculties.length) {
        throw new Error("Không tìm thấy đơn vị nào để xuất");
      }

      for (const faculty of faculties) {
        const records = await statsService.getFacultyRecords(namHoc, faculty.id || faculty.khoaId);
        if (faculties.length > 1 && (!records || records.length === 0)) continue;

        const sheetName = this._safeSheetName(faculty.TenPhongBan || faculty.tenPhongBan || "Khoa");
        const worksheet = workbook.addWorksheet(sheetName);

        this._renderHeader(worksheet, `THỐNG KÊ NCKH - KHOA/PHÒNG: ${faculty.TenPhongBan || faculty.tenPhongBan}`, namHoc);
        this._renderResearchTable(worksheet, records, 5);
      }

      if (workbook.worksheets.length === 0) {
        throw new Error("Không có dữ liệu công trình để xuất");
      }

      return workbook;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Export institute statistics to Excel.
   * Sheet 1: All records grouped by Type.
   * Following sheets: Each faculty's records.
   */
  async exportInstituteStats(namHoc) {
    let connection;
    try {
      connection = await createPoolConnection();
      const workbook = this._createWorkbook();

      // 1. Sheet 1: Toàn Học viện
      const instituteRecords = await statsService.getInstituteRecords(namHoc, "ALL", "ALL");
      const overviewSheet = workbook.addWorksheet("Toàn Học viện");
      this._renderHeader(overviewSheet, "THỐNG KÊ TOÀN HỌC VIỆN", namHoc);
      this._renderResearchTable(overviewSheet, instituteRecords, 5, { groupByType: true });

      // 2. Following sheets: Individual Faculties
      const faculties = await statsService.getFilters().then(f => f.khoaList);
      for (const faculty of faculties) {
        const records = await statsService.getFacultyRecords(namHoc, faculty.id);
        if (!records || records.length === 0) continue;

        const sheetName = this._safeSheetName(faculty.TenPhongBan);
        const worksheet = workbook.addWorksheet(sheetName);
        this._renderHeader(worksheet, `CHI TIẾT: ${faculty.TenPhongBan}`, namHoc);
        this._renderResearchTable(worksheet, records, 5);
      }

      return workbook;
    } finally {
      if (connection) connection.release();
    }
  }

  // --- Helpers ---

  _createWorkbook() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NCKH V3 System";
    workbook.created = new Date();
    return workbook;
  }

  _safeSheetName(name) {
    return String(name || "Sheet")
      .replace(/[*?:\\/\[\]]/g, "")
      .substring(0, 31);
  }

  _renderHeader(worksheet, title, namHoc) {
    worksheet.mergeCells("A1:G1");
    const tCell = worksheet.getCell("A1");
    tCell.value = title;
    tCell.font = { size: 14, bold: true };
    tCell.alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:G2");
    const sCell = worksheet.getCell("A2");
    sCell.value = `Năm học: ${namHoc}`;
    sCell.font = { size: 12, italic: true };
    sCell.alignment = { horizontal: "center" };
  }

  _renderResearchTable(worksheet, records, startRow, options = {}) {
    let currentRow = startRow;

    const renderBlock = (rows, title = null) => {
      if (title) {
        worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
        const groupCell = worksheet.getCell(`A${currentRow}`);
        groupCell.value = title;
        groupCell.font = { bold: true };
        groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
        currentRow++;
      }

      const headerRow = worksheet.addRow(["STT", "Loại NCKH", "Phân loại", "Tên công trình", "Tổng tiết", "Tác giả chính", "Thành viên"]);
      headerRow.font = { bold: true };
      headerRow.eachCell(cell => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        cell.alignment = { horizontal: "center" };
      });
      currentRow++;

      rows.forEach((rec, idx) => {
        const dataRow = worksheet.addRow([
          idx + 1,
          rec.loaiNckhLabel,
          rec.phanLoai,
          rec.tenCongTrinh,
          rec.tongSoTietCongTrinh, // Sửa từ tongSoTiet thành tongSoTietCongTrinh
          rec.tacGiaChinh,
          rec.thanhVien
        ]);
        dataRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          if (colNumber === 1 || colNumber === 5) {
            cell.alignment = { horizontal: "center" };
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          }

          if (colNumber === 5) {
            cell.numFmt = "#,##0.00";
          }
        });
        currentRow++;
      });
      worksheet.addRow([]); currentRow++;
    };

    if (options.groupByType) {
      const groups = this._groupRecordsByType(records);
      for (const [label, gRows] of Object.entries(groups)) {
        renderBlock(gRows, label);
      }
    } else {
      renderBlock(records);
    }

    worksheet.columns = [
      { width: 5 }, { width: 20 }, { width: 30 }, { width: 50 }, { width: 15 }, { width: 25 }, { width: 25 }
    ];
  }

  async _getFacultiesToExport(connection, khoaId) {
    const filters = await statsService.getFilters();
    const all = filters.khoaList || [];
    if (String(khoaId || "ALL") === "ALL") return all;
    return all.filter(f => String(f.id) === String(khoaId));
  }

  _groupRecordsByType(records) {
    const groups = {};
    (records || []).forEach((rec) => {
      const label = rec.loaiNckhLabel || "Khác";
      if (!groups[label]) groups[label] = [];
      groups[label].push(rec);
    });
    return groups;
  }
}

module.exports = new ExportService();
