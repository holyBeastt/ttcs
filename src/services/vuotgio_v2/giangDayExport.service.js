/**
 * VUOT GIO V2 - Thống Kê Giảng Dạy Quy Chuẩn Export Service
 * Date: 2026-11-09
 */

"use strict";

const ExcelJS = require("exceljs");
const service = require("./giangDay.service");

const FONT_NAME = "Times New Roman";
const FONT_FAMILY = 1;

const applyHeaderStyle = (row, bgColor = "FFE0E0E0") => {
    row.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    });
};

const applyFacultyHeaderStyle = (row, bgColor = "FFDCE6F1") => {
    row.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    });
};

const applyDataRowStyle = (row) => {
    row.font = { name: FONT_NAME, family: FONT_FAMILY, size: 11 };
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 11 };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle" };
    });
};

const applyTotalRowStyle = (row, bgColor = "FFD9D9D9") => {
    row.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    });
};

const finalizeWorkbook = (workbook) => {
    workbook.eachSheet((worksheet) => {
        worksheet.views = [{ showGridLines: true }];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
            row.eachCell({ includeEmpty: true }, (cell) => {
                const cur = cell.font || {};
                cell.font = {
                    name: FONT_NAME,
                    family: FONT_FAMILY,
                    size: cur.size || 11,
                    bold: Boolean(cur.bold),
                    italic: Boolean(cur.italic),
                    color: cur.color,
                };
                if (typeof cell.value === "string") {
                    cell.value = cell.value.normalize("NFC");
                }
            });
        });
    });
};

const exportGiangDayExcel = async (filters = {}, tab = "giang-vien") => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Học viện";
    workbook.lastModifiedBy = "Học viện";
    workbook.created = new Date();

    const result = await service.getStatistics(filters);
    const scopeLabel = filters.scope === "PREVIEW" ? "DỰ KIẾN" : "CHÍNH THỨC";
    const yearLabel = filters.namHoc && filters.namHoc !== "ALL" ? `NĂM HỌC ${filters.namHoc}` : "TẤT CẢ CÁC NĂM HỌC";

    if (tab === "khoa") {
        const worksheet = workbook.addWorksheet("Theo Khoa");
        worksheet.mergeCells("A1:E1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ GIẢNG DẠY QUY CHUẨN THEO KHOA - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 30;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "STT",
            "KHOA / PHÒNG BAN",
            "SỐ GIẢNG VIÊN",
            "SỐ LỚP HỌC PHẦN",
            "TỔNG SỐ TIẾT QC"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 25;

        worksheet.columns = [
            { width: 8 },
            { width: 30 },
            { width: 18 },
            { width: 22 },
            { width: 20 },
        ];

        let totalLecturers = 0;
        let totalCourses = 0;
        let totalHours = 0;

        (result.deptSummary || []).forEach((row, index) => {
            totalLecturers += row.soGiangVien || 0;
            totalCourses += row.soLopHocPhan || 0;
            totalHours += row.tongQuyChuan || 0;

            const r = worksheet.addRow([
                index + 1,
                row.khoa,
                row.soGiangVien,
                row.soLopHocPhan,
                Number(row.tongQuyChuan).toFixed(2)
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
            r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalRow = worksheet.addRow([
            "TỔNG CỘNG",
            "",
            totalLecturers,
            totalCourses,
            parseFloat(totalHours.toFixed(2))
        ]);
        worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    } else if (tab === "hoc-vien") {
        const worksheet = workbook.addWorksheet("Toan Hoc Vien");
        worksheet.mergeCells("A1:K1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `CHI TIẾT LỚP GIẢNG DẠY QUY CHUẨN TOÀN HỌC VIỆN - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 30;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "STT",
            "GIẢNG VIÊN",
            "KHOA",
            "MÔN HỌC",
            "TÊN LỚP",
            "SỐ TC",
            "ĐỢT",
            "KỲ",
            "NĂM HỌC",
            "SỐ TIẾT QC",
            "HỆ ĐÀO TẠO"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 25;

        worksheet.columns = [
            { width: 8 },
            { width: 24 },
            { width: 14 },
            { width: 30 },
            { width: 20 },
            { width: 10 },
            { width: 10 },
            { width: 10 },
            { width: 14 },
            { width: 14 },
            { width: 18 }
        ];

        let totalHours = 0;

        (result.hocVienRows || []).forEach((row, index) => {
            totalHours += row.quyChuan || 0;

            const r = worksheet.addRow([
                index + 1,
                row.giangVien,
                row.khoa,
                row.tenHocPhan,
                row.lop,
                row.soTinChi,
                row.dot,
                row.kiHoc,
                row.namHoc,
                Number(row.quyChuan || 0).toFixed(2),
                row.heDaoTao
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
            r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "left", vertical: "middle" };
            r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalRow = worksheet.addRow([
            "TỔNG CỘNG",
            "", "", "", "", "", "", "", "",
            parseFloat(totalHours.toFixed(2)),
            ""
        ]);
        worksheet.mergeCells(`A${totalRow.number}:I${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    } else {
        // Tab theo Giảng viên (Group theo Khoa)
        const worksheet = workbook.addWorksheet("Theo Giang Vien");
        worksheet.mergeCells("A1:L1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ GIẢNG DẠY QUY CHUẨN - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 30;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "STT",
            "GIẢNG VIÊN",
            "MÔN HỌC",
            "TÊN LỚP",
            "SỐ TC",
            "ĐỢT",
            "KỲ",
            "NĂM HỌC",
            "SỐ TIẾT QC",
            "TỔNG SỐ TIẾT",
            "KHOA",
            "HỆ ĐÀO TẠO"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 25;

        worksheet.columns = [
            { width: 8 },
            { width: 26 },
            { width: 30 },
            { width: 22 },
            { width: 10 },
            { width: 10 },
            { width: 10 },
            { width: 14 },
            { width: 14 },
            { width: 16 },
            { width: 16 },
            { width: 18 }
        ];

        let overallSTT = 1;
        const facultyGroups = result.facultyGroups || [];

        facultyGroups.forEach((faculty) => {
            const facRow = worksheet.addRow([
                `KHOA: ${faculty.khoa || "Không xác định"} (Số GV: ${faculty.totalTeachers} | Tổng số lớp: ${faculty.totalCourses} | Tổng số tiết: ${Number(faculty.totalQuyChuan).toFixed(2)})`,
                "", "", "", "", "", "", "", "", "", "", ""
            ]);
            worksheet.mergeCells(`A${facRow.number}:L${facRow.number}`);
            applyFacultyHeaderStyle(facRow);
            facRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
            facRow.height = 22;

            (faculty.teachers || []).forEach((teacher) => {
                const courseCount = (teacher.courses || []).length;
                const startRowNumber = worksheet.lastRow.number + 1;

                (teacher.courses || []).forEach((course, cIdx) => {
                    const r = worksheet.addRow([
                        cIdx === 0 ? overallSTT : "",
                        cIdx === 0 ? teacher.giangVien : "",
                        course.tenHocPhan || "",
                        course.lop || "",
                        course.soTinChi ?? "",
                        course.dot ?? "",
                        course.kiHoc ?? "",
                        course.namHoc ?? "",
                        Number(course.quyChuan || 0).toFixed(2),
                        cIdx === 0 ? Number(teacher.tongSoTietKy || 0).toFixed(2) : "",
                        cIdx === 0 ? (teacher.khoa || "") : "",
                        course.heDaoTao || ""
                    ]);
                    applyDataRowStyle(r);
                    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
                    r.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
                    r.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
                    r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(12).alignment = { horizontal: "center", vertical: "middle" };
                });

                if (courseCount > 1) {
                    const endRowNumber = startRowNumber + courseCount - 1;
                    worksheet.mergeCells(`A${startRowNumber}:A${endRowNumber}`);
                    worksheet.mergeCells(`B${startRowNumber}:B${endRowNumber}`);
                    worksheet.mergeCells(`J${startRowNumber}:J${endRowNumber}`);
                    worksheet.mergeCells(`K${startRowNumber}:K${endRowNumber}`);
                }

                overallSTT += 1;
            });

            const subtotalRow = worksheet.addRow([
                `TỔNG CỘNG KHOA ${faculty.khoa || ""}`,
                "", "", "", "", "", "", "", "",
                Number(faculty.totalQuyChuan || 0).toFixed(2),
                "", ""
            ]);
            worksheet.mergeCells(`A${subtotalRow.number}:I${subtotalRow.number}`);
            applyTotalRowStyle(subtotalRow, "FFF2F2F2");
            subtotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            subtotalRow.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
        });

        const grandTotalHours = result.summary ? Number(result.summary.totalQuyChuan || 0).toFixed(2) : "0.00";
        const totalRow = worksheet.addRow([
            "TỔNG CỘNG TOÀN HỌC VIỆN",
            "", "", "", "", "", "", "", "",
            grandTotalHours,
            "", ""
        ]);
        worksheet.mergeCells(`A${totalRow.number}:I${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    }

    finalizeWorkbook(workbook);
    return await workbook.xlsx.writeBuffer();
};

module.exports = {
    exportGiangDayExcel
};
