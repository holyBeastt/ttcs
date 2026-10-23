const ExcelJS = require("exceljs");
const createPoolConnection = require("../../config/databasePool");
const exportRepo = require("../../repositories/nckh_v3/export.repo");
const statsService = require("./stats.service");
const { STATS_SCOPE } = require("../../config/nckh_v3/statsScope");

class ExportService {
  /**
   * Export lecturer statistics to Excel.
   * Each lecturer gets one flat table and a total of their credited hours.
   */
  async exportLecturerStats(namHoc, khoaId, keyword, scope) {
    let connection;
    try {
      connection = await createPoolConnection();
      
      // 1. Get filtered list of lecturers
      const lecturers = await statsService.getLecturerSummary(namHoc, khoaId, keyword, scope);
      if (!lecturers.length) {
        throw new Error("Không có dữ liệu để xuất");
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "NCKH V3 System";
      workbook.lastModifiedBy = "NCKH V3 System";
      workbook.created = new Date();
      workbook.calcProperties.fullCalcOnLoad = true;

      // 2. Iterate through each lecturer and create a sheet
      for (const lecturer of lecturers) {
        // Sheet name limited to 31 chars and invalid chars replaced
        const safeName = (lecturer.tenNhanVien || "Lecturer")
          .replace(/[*?:\\/\[\]]/g, "")
          .substring(0, 31);
        
        const worksheet = workbook.addWorksheet(safeName);

        // Header info
        worksheet.mergeCells("A1:I1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ CHI TIẾT NGHIÊN CỨU KHOA HỌC - NĂM HỌC ${namHoc}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center" };

        worksheet.mergeCells("A2:I2");
        const lecturerInfoCell = worksheet.getCell("A2");
        lecturerInfoCell.value = `Giảng viên: ${lecturer.tenNhanVien} - Khoa: ${lecturer.lecturerKhoaName || "N/A"}`;
        lecturerInfoCell.font = { size: 12, italic: true };
        lecturerInfoCell.alignment = { horizontal: "center" };

        worksheet.addRow([]); // Blank row

        // Get records for this lecturer
        const records = await statsService.getLecturerRecords(lecturer.lecturerId, namHoc, scope);
        
        const headerRow = worksheet.addRow([
          "STT",
          "Loại NCKH",
          "Phân loại",
          "Tên công trình",
          "Vai trò",
          "Tiết giảng viên",
          "Tổng tiết công trình",
          "Tác giả chính",
          "Thành viên",
        ]);
        headerRow.font = { bold: true };
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        });

        records.forEach((rec, index) => {
          const dataRow = worksheet.addRow([
            index + 1,
            rec.loaiNckhLabel || rec.loaiNckh,
            rec.phanLoai,
            rec.tenCongTrinh,
            rec.vaiTroGiangVien,
            Number(rec.soTietGiangVien || 0),
            Number(rec.tongSoTietCongTrinh || 0),
            rec.tacGiaChinh,
            rec.thanhVien,
          ]);
          dataRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            cell.alignment = {
              horizontal: [1, 6, 7].includes(colNumber) ? "center" : "left",
              vertical: "middle",
              wrapText: true,
            };
            if ([6, 7].includes(colNumber)) cell.numFmt = "#,##0.00";
          });
        });

        const totalLecturerHours = records.reduce((total, rec) => total + Number(rec.soTietGiangVien || 0), 0);
        const firstDataRow = headerRow.number + 1;
        const lastDataRow = worksheet.rowCount;
        const lecturerHoursCell = {
          formula: records.length ? `SUM(F${firstDataRow}:F${lastDataRow})` : "0",
          result: totalLecturerHours,
        };
        const totalRow = worksheet.addRow(["TỔNG TIẾT CỦA GIẢNG VIÊN", "", "", "", "", lecturerHoursCell, "", "", ""]);
        worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);
        totalRow.font = { bold: true };
        totalRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
          cell.alignment = { horizontal: colNumber === 6 ? "center" : "left", vertical: "middle" };
          if (colNumber === 6) cell.numFmt = "#,##0.00";
        });

        worksheet.views = [{ state: "frozen", ySplit: headerRow.number }];
        worksheet.autoFilter = {
          from: { row: headerRow.number, column: 1 },
          to: { row: Math.max(headerRow.number, totalRow.number - 1), column: 9 },
        };

        // Auto-fit columns
        worksheet.columns = [
          { width: 5 },  // STT
          { width: 22 }, // Loại NCKH
          { width: 24 }, // Phân loại
          { width: 50 }, // Tên công trình
          { width: 22 }, // Vai trò
          { width: 16 }, // Tiết giảng viên
          { width: 20 }, // Tổng tiết công trình
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
  async exportFacultyStats(namHoc, khoaId, scope) {
    let connection;
    try {
      connection = await createPoolConnection();
      const workbook = this._createWorkbook();
      workbook.calcProperties.fullCalcOnLoad = true;

      const faculties = await this._getFacultiesToExport(connection, khoaId);
      if (!faculties.length) {
        throw new Error("Không tìm thấy đơn vị nào để xuất");
      }

      for (const faculty of faculties) {
        const records = await statsService.getFacultyRecords(namHoc, faculty.id || faculty.khoaId, scope);
        if (faculties.length > 1 && (!records || records.length === 0)) continue;

        const sheetName = this._safeSheetName(faculty.TenPhongBan || faculty.tenPhongBan || "Khoa");
        const worksheet = workbook.addWorksheet(sheetName);

        this._renderHeader(worksheet, `THỐNG KÊ NCKH - KHOA/PHÒNG: ${faculty.TenPhongBan || faculty.tenPhongBan}`, namHoc);
        this._renderResearchTable(worksheet, records, 5, {
          groupByType: scope !== STATS_SCOPE.PREVIEW,
          useFormulas: true,
        });
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
   * Only institute-wide sheets are included for both official and preview scopes.
   */
  async exportInstituteStats(namHoc, scope) {
    let connection;
    try {
      connection = await createPoolConnection();
      const workbook = this._createWorkbook();
      workbook.calcProperties.fullCalcOnLoad = true;

      const instituteSummary = await statsService.getInstituteSummary(namHoc, scope);
      const totalSheet = workbook.addWorksheet("Tổng Học viện");
      this._renderInstituteSummary(totalSheet, instituteSummary, namHoc, true);

      // 1. Sheet 1: Toàn Học viện
      const instituteRecords = await statsService.getInstituteRecords(namHoc, "ALL", "ALL", scope);
      const overviewSheet = workbook.addWorksheet("Toàn Học viện");
      this._renderHeader(overviewSheet, "THỐNG KÊ TOÀN HỌC VIỆN", namHoc);
      this._renderResearchTable(overviewSheet, instituteRecords, 5, {
        groupByType: true,
        useFormulas: true,
      });

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

  _renderInstituteSummary(worksheet, summary, namHoc, useFormulas = false) {
    worksheet.mergeCells("A1:C1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "TỔNG HỢP NCKH TOÀN HỌC VIỆN";
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:C2");
    const yearCell = worksheet.getCell("A2");
    yearCell.value = `Năm học: ${namHoc}`;
    yearCell.font = { size: 12, italic: true };
    yearCell.alignment = { horizontal: "center" };

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(["Loại NCKH", "Số công trình", "Tổng số tiết"]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    const byType = summary?.byType || [];
    byType.forEach((row) => {
      const dataRow = worksheet.addRow([
        row.loaiNckhLabel || row.loaiNckh || "N/A",
        Number(row.soCongTrinh || 0),
        Number(row.tongSoTiet || 0),
      ]);
      dataRow.eachCell((cell, columnNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { horizontal: columnNumber === 1 ? "left" : "center", vertical: "middle" };
        if (columnNumber === 2) cell.numFmt = "#,##0";
        if (columnNumber === 3) cell.numFmt = "#,##0.00";
      });
    });

    const overview = summary?.overview || {};
    const firstTypeRow = headerRow.number + 1;
    const lastTypeRow = worksheet.rowCount;
    const totalWorksCell = useFormulas
      ? {
          formula: byType.length ? `SUM(B${firstTypeRow}:B${lastTypeRow})` : "0",
          result: Number(overview.tongCongTrinh || 0),
        }
      : Number(overview.tongCongTrinh || 0);
    const totalHoursCell = useFormulas
      ? {
          formula: byType.length ? `SUM(C${firstTypeRow}:C${lastTypeRow})` : "0",
          result: Number(overview.tongSoTiet || 0),
        }
      : Number(overview.tongSoTiet || 0);
    const totalRow = worksheet.addRow([
      "TỔNG HỌC VIỆN - TẤT CẢ LOẠI NCKH",
      totalWorksCell,
      totalHoursCell,
    ]);
    totalRow.font = { bold: true };
    totalRow.eachCell((cell, columnNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
      cell.alignment = { horizontal: columnNumber === 1 ? "left" : "center", vertical: "middle" };
      if (columnNumber === 2) cell.numFmt = "#,##0";
      if (columnNumber === 3) cell.numFmt = "#,##0.00";
    });

    worksheet.columns = [{ width: 42 }, { width: 20 }, { width: 20 }];
    worksheet.views = [{ state: "frozen", ySplit: headerRow.number }];
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

      const totalHours = rows.reduce((total, rec) => total + Number(rec.tongSoTietCongTrinh || 0), 0);
      const totalHoursCell = options.useFormulas
        ? {
            formula: rows.length ? `SUM(E${headerRow.number + 1}:E${worksheet.rowCount})` : "0",
            result: totalHours,
          }
        : totalHours;
      const totalRow = worksheet.addRow([
        "",
        "",
        "",
        `Tổng nhóm (${rows.length} công trình)`,
        totalHoursCell,
        "",
        "",
      ]);
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNumber) => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
        cell.alignment = { horizontal: colNumber === 5 ? "center" : "left", vertical: "middle" };
        if (colNumber === 5) cell.numFmt = "#,##0.00";
      });
      currentRow++;
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
