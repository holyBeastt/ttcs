const ExcelJS = require("exceljs");
const createPoolConnection = require("../../config/databasePool");
const exportRepo = require("../../repositories/nckh_v3/export.repo");
const statsService = require("./stats.service");
const { STATS_SCOPE } = require("../../config/nckh_v3/statsScope");

const resolveExportYearFilter = (namHoc, options = {}) => {
  const hasRange = Boolean(String(options.namHocFrom || "").trim() || String(options.namHocTo || "").trim());
  const yearRange = hasRange
    ? {
        namHocFrom: String(options.namHocFrom || "").trim(),
        namHocTo: String(options.namHocTo || "").trim(),
      }
    : null;
  const resolved = statsService.resolveNamHocFilter(namHoc, yearRange);
  return {
    ...resolved,
    yearRange,
    label: yearRange ? `Từ ${yearRange.namHocFrom} đến ${yearRange.namHocTo}` : resolved.namHoc,
    hasRange: Boolean(resolved.fromYear && resolved.toYear),
  };
};

class ExportService {
  /**
   * Export lecturer statistics to Excel.
   * Each lecturer gets one sheet grouped by NCKH type and a total of their credited hours.
   */
  async exportLecturerStats(namHoc, khoaId, keyword, scope, options = {}) {
    let connection;
    try {
      connection = await createPoolConnection();
      const yearFilter = resolveExportYearFilter(namHoc, options);
      const lecturerId = String(options.lecturerId || "").trim() || null;
      if (lecturerId && (!Number.isInteger(Number(lecturerId)) || Number(lecturerId) <= 0)) {
        throw new Error("lecturerId không hợp lệ");
      }
      
      // 1. Get filtered list of lecturers
      const lecturers = await statsService.getLecturerSummary(
        yearFilter.namHoc,
        lecturerId ? "ALL" : khoaId,
        lecturerId ? "" : keyword,
        scope,
        lecturerId,
        yearFilter.yearRange
      );
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
        worksheet.mergeCells("A1:J1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ CHI TIẾT NGHIÊN CỨU KHOA HỌC - NĂM HỌC ${yearFilter.label}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center" };

        worksheet.mergeCells("A2:J2");
        const lecturerInfoCell = worksheet.getCell("A2");
        lecturerInfoCell.value = `Giảng viên: ${lecturer.tenNhanVien} - Khoa: ${lecturer.lecturerKhoaName || "N/A"}`;
        lecturerInfoCell.font = { size: 12, italic: true };
        lecturerInfoCell.alignment = { horizontal: "center" };

        worksheet.addRow([]); // Blank row

        // Get records for this lecturer
        const records = await statsService.getLecturerRecords(
          lecturer.lecturerId,
          yearFilter.namHoc,
          scope,
          yearFilter.yearRange
        );
        
        const headerRow = worksheet.addRow([
          "STT",
          "Năm học",
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

        const recordsByType = new Map();
        records.forEach((record) => {
          const typeLabel = record.loaiNckhLabel || record.loaiNckh || "Khác";
          if (!recordsByType.has(typeLabel)) recordsByType.set(typeLabel, []);
          recordsByType.get(typeLabel).push(record);
        });

        const groupSubtotalRows = [];
        let sequence = 0;
        for (const [typeLabel, typeRecords] of recordsByType) {
          const groupHeaderRow = worksheet.addRow([`${typeLabel} (${typeRecords.length} công trình)`, "", "", "", "", "", "", "", "", ""]);
          worksheet.mergeCells(`A${groupHeaderRow.number}:J${groupHeaderRow.number}`);
          for (let column = 1; column <= 10; column += 1) {
            const cell = groupHeaderRow.getCell(column);
            cell.font = { bold: true, color: { argb: "FF1F4E78" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
            cell.alignment = { horizontal: "left", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }
          groupHeaderRow.height = 22;

          const firstGroupDataRow = worksheet.rowCount + 1;
          typeRecords.forEach((rec) => {
            const dataRow = worksheet.addRow([
              ++sequence,
              rec.namHoc,
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
                horizontal: [1, 2, 7, 8].includes(colNumber) ? "center" : "left",
                vertical: "middle",
                wrapText: true,
              };
              if ([7, 8].includes(colNumber)) cell.numFmt = "#,##0.00";
            });
          });

          const lastGroupDataRow = worksheet.rowCount;
          const groupLecturerHours = typeRecords.reduce((total, rec) => total + Number(rec.soTietGiangVien || 0), 0);
          const groupResearchHours = typeRecords.reduce((total, rec) => total + Number(rec.tongSoTietCongTrinh || 0), 0);
          const groupTotalRow = worksheet.addRow([
            `Tổng ${typeLabel}`,
            "",
            "",
            "",
            "",
            "",
            { formula: `SUM(G${firstGroupDataRow}:G${lastGroupDataRow})`, result: groupLecturerHours },
            { formula: `SUM(H${firstGroupDataRow}:H${lastGroupDataRow})`, result: groupResearchHours },
            "",
            "",
          ]);
          worksheet.mergeCells(`A${groupTotalRow.number}:F${groupTotalRow.number}`);
          groupSubtotalRows.push(groupTotalRow.number);
          groupTotalRow.font = { bold: true };
          groupTotalRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F9FF" } };
            cell.alignment = { horizontal: [7, 8].includes(colNumber) ? "center" : "left", vertical: "middle" };
            if ([7, 8].includes(colNumber)) cell.numFmt = "#,##0.00";
          });
        }

        const totalLecturerHours = records.reduce((total, rec) => total + Number(rec.soTietGiangVien || 0), 0);
        const totalResearchHours = records.reduce((total, rec) => total + Number(rec.tongSoTietCongTrinh || 0), 0);
        const lecturerHoursCell = {
          formula: groupSubtotalRows.length ? `SUM(${groupSubtotalRows.map((row) => `G${row}`).join(",")})` : "0",
          result: totalLecturerHours,
        };
        const researchHoursCell = {
          formula: groupSubtotalRows.length ? `SUM(${groupSubtotalRows.map((row) => `H${row}`).join(",")})` : "0",
          result: totalResearchHours,
        };
        const totalRow = worksheet.addRow(["TỔNG TIẾT CỦA GIẢNG VIÊN", "", "", "", "", "", lecturerHoursCell, researchHoursCell, "", ""]);
        worksheet.mergeCells(`A${totalRow.number}:F${totalRow.number}`);
        totalRow.font = { bold: true };
        totalRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
          cell.alignment = { horizontal: colNumber === 7 ? "center" : "left", vertical: "middle" };
          if (colNumber === 7) cell.numFmt = "#,##0.00";
        });

        worksheet.views = [{ state: "frozen", ySplit: headerRow.number }];
        // Auto-fit columns
        worksheet.columns = [
          { width: 5 },  // STT
          { width: 16 }, // Năm học
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
  async exportFacultyStats(namHoc, khoaId, scope, options = {}) {
    let connection;
    try {
      connection = await createPoolConnection();
      const yearFilter = resolveExportYearFilter(namHoc, options);
      const workbook = this._createWorkbook();
      workbook.calcProperties.fullCalcOnLoad = true;

      const faculties = await this._getFacultiesToExport(connection, khoaId);
      if (!faculties.length) {
        throw new Error("Không tìm thấy đơn vị nào để xuất");
      }

      for (const faculty of faculties) {
        const records = await statsService.getFacultyRecords(
          yearFilter.namHoc,
          faculty.id || faculty.khoaId,
          scope,
          yearFilter.yearRange
        );
        if (faculties.length > 1 && (!records || records.length === 0)) continue;

        const sheetName = this._safeSheetName(faculty.TenPhongBan || faculty.tenPhongBan || "Khoa");
        const worksheet = workbook.addWorksheet(sheetName);

        this._renderHeader(
          worksheet,
          `THỐNG KÊ NCKH - KHOA/PHÒNG: ${faculty.TenPhongBan || faculty.tenPhongBan}`,
          yearFilter.label,
          yearFilter.hasRange ? 8 : 7
        );
        this._renderResearchTable(worksheet, records, 5, {
          groupByType: true,
          useFormulas: true,
          includeNamHoc: yearFilter.hasRange,
          includeFacultyTotal: true,
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
  async exportInstituteStats(namHoc, scope, options = {}) {
    let connection;
    try {
      connection = await createPoolConnection();
      const yearFilter = resolveExportYearFilter(namHoc, options);
      const workbook = this._createWorkbook();
      workbook.calcProperties.fullCalcOnLoad = true;

      const instituteSummary = await statsService.getInstituteSummary(yearFilter.namHoc, scope, yearFilter.yearRange);
      const totalSheet = workbook.addWorksheet("Tổng Học viện");
      this._renderInstituteSummary(totalSheet, instituteSummary, yearFilter.label, true);

      // 1. Sheet 1: Toàn Học viện
      const instituteRecords = await statsService.getInstituteRecords(
        yearFilter.namHoc,
        "ALL",
        "ALL",
        scope,
        yearFilter.yearRange
      );
      const overviewSheet = workbook.addWorksheet("Toàn Học viện");
      this._renderHeader(overviewSheet, "THỐNG KÊ TOÀN HỌC VIỆN", yearFilter.label, yearFilter.hasRange ? 8 : 7);
      this._renderResearchTable(overviewSheet, instituteRecords, 5, {
        groupByType: true,
        useFormulas: true,
        includeNamHoc: yearFilter.hasRange,
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

  _renderHeader(worksheet, title, namHoc, columnCount = 7) {
    const endColumn = this._excelColumnName(columnCount);
    worksheet.mergeCells(`A1:${endColumn}1`);
    const tCell = worksheet.getCell("A1");
    tCell.value = title;
    tCell.font = { size: 14, bold: true };
    tCell.alignment = { horizontal: "center" };

    worksheet.mergeCells(`A2:${endColumn}2`);
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

  _excelColumnName(columnNumber) {
    let number = Number(columnNumber);
    let result = "";
    while (number > 0) {
      const remainder = (number - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      number = Math.floor((number - 1) / 26);
    }
    return result || "A";
  }

  _renderResearchTable(worksheet, records, startRow, options = {}) {
    let currentRow = startRow;
    const includeNamHoc = options.includeNamHoc === true;
    const includeFacultyTotal = options.includeFacultyTotal === true;
    const columnCount = includeNamHoc
      ? (includeFacultyTotal ? 9 : 8)
      : (includeFacultyTotal ? 8 : 7);
    const endColumn = this._excelColumnName(columnCount);
    const facultyHoursColumn = includeNamHoc ? 6 : 5;
    const allHoursColumn = includeNamHoc ? 7 : 6;
    const totalHoursColumn = includeNamHoc ? 6 : 5;

    const renderBlock = (rows, title = null) => {
      if (title) {
        worksheet.mergeCells(`A${currentRow}:${endColumn}${currentRow}`);
        const groupCell = worksheet.getCell(`A${currentRow}`);
        groupCell.value = title;
        groupCell.font = { bold: true };
        groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
        currentRow++;
      }

      const headerRow = worksheet.addRow(includeNamHoc
        ? (includeFacultyTotal
          ? ["STT", "Năm học", "Loại NCKH", "Phân loại", "Tên công trình", "Tổng tiết (khoa)", "Tổng tiết (all)", "Tác giả chính", "Thành viên"]
          : ["STT", "Năm học", "Loại NCKH", "Phân loại", "Tên công trình", "Tổng tiết", "Tác giả chính", "Thành viên"])
        : (includeFacultyTotal
          ? ["STT", "Loại NCKH", "Phân loại", "Tên công trình", "Tổng tiết (khoa)", "Tổng tiết (all)", "Tác giả chính", "Thành viên"]
          : ["STT", "Loại NCKH", "Phân loại", "Tên công trình", "Tổng tiết", "Tác giả chính", "Thành viên"]));
      headerRow.font = { bold: true };
      headerRow.eachCell(cell => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        cell.alignment = { horizontal: "center" };
      });
      currentRow++;

      rows.forEach((rec, idx) => {
        const facultyTotal = Number(rec.tongSoTietCongTrinh || 0);
        const allTotal = Number(rec.tongSoTietCongTrinhAll ?? rec.tongSoTietCongTrinh ?? 0);
        const dataRow = worksheet.addRow(includeNamHoc
          ? (includeFacultyTotal
            ? [idx + 1, rec.namHoc, rec.loaiNckhLabel, rec.phanLoai, rec.tenCongTrinh, facultyTotal, allTotal, rec.tacGiaChinh, rec.thanhVien]
            : [idx + 1, rec.namHoc, rec.loaiNckhLabel, rec.phanLoai, rec.tenCongTrinh, rec.tongSoTietCongTrinh, rec.tacGiaChinh, rec.thanhVien])
          : (includeFacultyTotal
            ? [idx + 1, rec.loaiNckhLabel, rec.phanLoai, rec.tenCongTrinh, facultyTotal, allTotal, rec.tacGiaChinh, rec.thanhVien]
            : [idx + 1, rec.loaiNckhLabel, rec.phanLoai, rec.tenCongTrinh, rec.tongSoTietCongTrinh, rec.tacGiaChinh, rec.thanhVien]));
        dataRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          const isHoursColumn = includeFacultyTotal
            ? [facultyHoursColumn, allHoursColumn].includes(colNumber)
            : colNumber === totalHoursColumn;
          if (colNumber === 1 || isHoursColumn) {
            cell.alignment = { horizontal: "center" };
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          }

          if (isHoursColumn) {
            cell.numFmt = "#,##0.00";
          }
        });
        currentRow++;
      });

      const facultyTotal = rows.reduce((total, rec) => total + Number(rec.tongSoTietCongTrinh || 0), 0);
      const allTotal = rows.reduce((total, rec) => total + Number(rec.tongSoTietCongTrinhAll ?? rec.tongSoTietCongTrinh ?? 0), 0);
      const makeTotalCell = (column, result) => options.useFormulas
        ? {
            formula: rows.length ? `SUM(${column}${headerRow.number + 1}:${column}${worksheet.rowCount})` : "0",
            result,
          }
        : result;
      const totalRow = worksheet.addRow(includeNamHoc
        ? (includeFacultyTotal
          ? ["", "", "", "", `Tổng nhóm (${rows.length} công trình)`, makeTotalCell("F", facultyTotal), makeTotalCell("G", allTotal), "", ""]
          : ["", "", "", "", `Tổng nhóm (${rows.length} công trình)`, makeTotalCell("F", facultyTotal), "", ""])
        : (includeFacultyTotal
          ? ["", "", "", `Tổng nhóm (${rows.length} công trình)`, makeTotalCell("E", facultyTotal), makeTotalCell("F", allTotal), "", ""]
          : ["", "", "", `Tổng nhóm (${rows.length} công trình)`, makeTotalCell("E", facultyTotal), "", ""]));
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNumber) => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
        const isHoursColumn = includeFacultyTotal
          ? [facultyHoursColumn, allHoursColumn].includes(colNumber)
          : colNumber === totalHoursColumn;
        cell.alignment = { horizontal: isHoursColumn ? "center" : "left", vertical: "middle" };
        if (isHoursColumn) cell.numFmt = "#,##0.00";
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

    worksheet.columns = includeNamHoc
      ? (includeFacultyTotal
        ? [
            { width: 5 }, { width: 16 }, { width: 20 }, { width: 30 },
            { width: 50 }, { width: 17 }, { width: 17 }, { width: 25 }, { width: 25 },
          ]
        : [
            { width: 5 }, { width: 16 }, { width: 20 }, { width: 30 },
            { width: 50 }, { width: 15 }, { width: 25 }, { width: 25 },
          ])
      : (includeFacultyTotal
        ? [
            { width: 5 }, { width: 20 }, { width: 30 }, { width: 50 },
            { width: 17 }, { width: 17 }, { width: 25 }, { width: 25 },
          ]
        : [
            { width: 5 }, { width: 20 }, { width: 30 }, { width: 50 }, { width: 15 }, { width: 25 }, { width: 25 },
          ]);
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
