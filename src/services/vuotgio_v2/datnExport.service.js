/**
 * VUOT GIO V2 - Đồ án / Luận án tính vượt giờ Export Service
 * Date: 2026-11-09
 */

"use strict";

const ExcelJS = require("exceljs");
const statsService = require("./datnStats.service");

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

const applyDataRowStyle = (row) => {
    row.font = { name: FONT_NAME, family: FONT_FAMILY, size: 11 };
    // row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 11 };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
    });
};

const applyTotalRowStyle = (row, bgColor = "FFD9D9D9") => {
    row.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
    row.height = 26;
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 11 };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
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

const buildYearLabel = (namHoc) => {
    if (namHoc && namHoc !== "ALL") {
        return `NĂM HỌC ${namHoc}`;
    }
    return "TẤT CẢ CÁC NĂM HỌC";
};

const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Xuất Excel theo tab
 */
const exportStatsExcel = async ({ tab = "giang-vien", filters = {} }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Học viện";
    workbook.lastModifiedBy = "Học viện";
    workbook.created = new Date();

    const scopeLabel = filters.scope === "PREVIEW" ? "DỰ KIẾN" : "CHÍNH THỨC";
    const yearLabel = buildYearLabel(filters.namHoc);

    if (tab === "giang-vien-detail") {
        // Xuất chi tiết đồ án của một Giảng viên (như Modal Hình 3)
        const worksheet = workbook.addWorksheet("Chi Tiết Hướng Dẫn");
        const data = await statsService.getLecturerRecords(filters);
        const gvName = data.giangVien || filters.lecturerName || filters.name || "";

        worksheet.mergeCells("A1:I1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `CHI TIẾT HƯỚNG DẪN ĐỒ ÁN TỐT NGHIỆP - ${gvName.toUpperCase()} - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 32;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "TT",
            "SINH VIÊN",
            "MÃ SV",
            "KHÓA",
            "KHOA",
            "TÊN ĐỀ TÀI",
            "NGÀY BĐ",
            "NGÀY KT",
            "SỐ TIẾT"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 28;

        worksheet.columns = [
            { width: 8 },
            { width: 26 },
            { width: 14 },
            { width: 12 },
            { width: 24 },
            { width: 45 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
        ];

        let totalHours = 0;
        (data.rows || []).forEach((row, index) => {
            totalHours += row.soTiet || 0;
            const r = worksheet.addRow([
                index + 1,
                row.sinhVien,
                row.maSV,
                row.khoaSV,
                row.khoaTen || row.nganh || row.khoa,
                row.tenDeTai,
                formatDate(row.ngayBatDau),
                formatDate(row.ngayKetThuc),
                row.soTiet
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(6).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalRow = worksheet.addRow([
            "TỔNG SỐ TIẾT:",
            "", "", "", "", "", "", "",
            parseFloat(totalHours.toFixed(2))
        ]);
        worksheet.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    } else if (tab === "khoa-detail") {
        // Xuất chi tiết đồ án của một Khoa
        const worksheet = workbook.addWorksheet("Chi Tiết Khoa");
        const data = await statsService.getDepartmentSummary(filters);
        const targetDept = (data.rows || []).find((d) => d.khoa === filters.khoa) || data.rows[0] || {};
        const deptName = targetDept.khoaDisplayName || targetDept.khoa || filters.khoa || "";

        worksheet.mergeCells("A1:J1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `CHI TIẾT ĐỒ ÁN TỐT NGHIỆP KHOA ${deptName.toUpperCase()} - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 32;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "TT",
            "GIẢNG VIÊN",
            "SINH VIÊN",
            "MÃ SV",
            "KHÓA",
            "KHOA",
            "TÊN ĐỀ TÀI",
            "NGÀY BĐ",
            "NGÀY KT",
            "SỐ TIẾT"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 28;

        worksheet.columns = [
            { width: 8 },
            { width: 24 },
            { width: 24 },
            { width: 14 },
            { width: 12 },
            { width: 22 },
            { width: 45 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
        ];

        let totalHours = 0;
        (targetDept.projects || []).forEach((row, index) => {
            totalHours += row.soTiet || 0;
            const r = worksheet.addRow([
                index + 1,
                row.giangVien,
                row.sinhVien,
                row.maSV,
                row.khoaSV,
                row.khoaTen || row.nganh || row.khoa,
                row.tenDeTai,
                formatDate(row.ngayBatDau),
                formatDate(row.ngayKetThuc),
                row.soTiet
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(7).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalRow = worksheet.addRow([
            "TỔNG SỐ TIẾT:",
            "", "", "", "", "", "", "", "",
            parseFloat(totalHours.toFixed(2))
        ]);
        worksheet.mergeCells(`A${totalRow.number}:I${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    } else if (tab === "khoa") {
        const worksheet = workbook.addWorksheet("Theo Khoa");
        const data = await statsService.getDepartmentSummary(filters);

        worksheet.mergeCells("A1:E1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ ĐỒ ÁN/LUẬN ÁN TÍNH VƯỢT GIỜ THEO KHOA - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 30;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "STT",
            "KHOA / PHÒNG BAN",
            "SỐ GIẢNG VIÊN",
            "SỐ SINH VIÊN",
            "TỔNG SỐ TIẾT"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 25;

        worksheet.columns = [
            { width: 8 },
            { width: 34 },
            { width: 18 },
            { width: 22 },
            { width: 20 },
        ];

        let totalLecturers = 0;
        let totalStudents = 0;
        let totalHours = 0;

        (data.rows || []).forEach((row, index) => {
            totalLecturers += row.soGiangVien || 0;
            totalStudents += row.soSinhVien || row.soDoAn || 0;
            totalHours += row.tongSoTiet || 0;

            const r = worksheet.addRow([
                index + 1,
                row.khoaDisplayName || row.khoa,
                row.soGiangVien,
                row.soSinhVien || row.soDoAn,
                row.tongSoTiet
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalRow = worksheet.addRow([
            "TỔNG CỘNG",
            "",
            data.summary ? data.summary.totalTeachers : totalLecturers,
            data.summary ? data.summary.totalStudents : totalStudents,
            data.summary ? data.summary.totalHours : parseFloat(totalHours.toFixed(2))
        ]);
        worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    } else if (tab === "hoc-vien") {
        const worksheet = workbook.addWorksheet("Toàn Học Viện");
        const data = await statsService.getHocVienSummary(filters);

        worksheet.mergeCells("A1:K1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `CHI TIẾT ĐỒ ÁN/LUẬN ÁN TÍNH VƯỢT GIỜ TOÀN HỌC VIỆN - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 30;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "STT",
            "GIẢNG VIÊN",
            "KHOA",
            "SINH VIÊN",
            "MÃ SINH VIÊN",
            "KHÓA",
            "KHOA",
            "TÊN ĐỀ TÀI",
            "NGÀY BĐ",
            "NGÀY KT",
            "SỐ TIẾT"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 25;

        worksheet.columns = [
            { width: 8 },
            { width: 24 },
            { width: 14 },
            { width: 22 },
            { width: 14 },
            { width: 10 },
            { width: 22 },
            { width: 38 },
            { width: 14 },
            { width: 14 },
            { width: 12 },
        ];

        let totalHours = 0;

        (data.rows || []).forEach((row, index) => {
            totalHours += row.soTiet || 0;

            const r = worksheet.addRow([
                index + 1,
                row.giangVien,
                row.khoa,
                row.sinhVien,
                row.maSV,
                row.khoaSV,
                row.khoaTen || row.nganh || row.khoa,
                row.tenDeTai,
                formatDate(row.ngayBatDau),
                formatDate(row.ngayKetThuc),
                row.soTiet
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(8).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            r.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
        });

        const totalRow = worksheet.addRow([
            "TỔNG CỘNG",
            "", "", "", "", "", "", "", "", "",
            data.summary ? data.summary.totalHours : parseFloat(totalHours.toFixed(2))
        ]);
        worksheet.mergeCells(`A${totalRow.number}:J${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
    } else {
        // Tab theo Giảng viên (Grouped by Lecturer with individual students, matching Hình 2)
        const worksheet = workbook.addWorksheet("Theo Giảng Viên");
        const data = await statsService.getLecturerSummary(filters);

        worksheet.mergeCells("A1:I1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ ĐỒ ÁN/LUẬN ÁN TÍNH VƯỢT GIỜ THEO GIẢNG VIÊN - ${yearLabel} (${scopeLabel})`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, bold: true, size: 14 };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 30;

        worksheet.addRow([]);

        const headerRow = worksheet.addRow([
            "STT",
            "GIẢNG VIÊN",
            "KHOA",
            "SINH VIÊN",
            "KHÓA",
            "TÊN ĐỀ TÀI",
            "SỐ TIẾT",
            "TỔNG SỐ TIẾT",
            "GHI CHÚ"
        ]);
        applyHeaderStyle(headerRow);
        headerRow.height = 25;

        worksheet.columns = [
            { width: 8 },
            { width: 26 },
            { width: 14 },
            { width: 24 },
            { width: 10 },
            { width: 42 },
            { width: 12 },
            { width: 16 },
            { width: 14 }
        ];

        let currentKhoa = null;
        let overallSTT = 1;
        let grandTotalHours = 0;

        (data.rows || []).forEach((teacher) => {
            grandTotalHours += teacher.tongSoTiet || 0;
            const teacherKhoa = teacher.khoa || "KHAC";
            const teacherKhoaName = teacher.khoaDisplayName || teacher.khoa || "Khoa khác";

            // Dòng Group Header theo Khoa
            if (teacherKhoa !== currentKhoa) {
                currentKhoa = teacherKhoa;
                const deptHeaderRow = worksheet.addRow([
                    `KHOA: ${teacherKhoaName.toUpperCase()}`,
                    "", "", "", "", "", "", "", ""
                ]);
                applyHeaderStyle(deptHeaderRow, "FFDCE6F1");
                deptHeaderRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
                deptHeaderRow.height = 25;
                worksheet.mergeCells(`A${deptHeaderRow.number}:I${deptHeaderRow.number}`);
            }

            const projects = teacher.projects || [];
            const count = projects.length || 1;
            const startRow = worksheet.lastRow.number + 1;

            if (!projects.length) {
                const r = worksheet.addRow([
                    overallSTT++,
                    teacher.giangVien,
                    teacher.khoa,
                    "-",
                    "-",
                    "-",
                    0,
                    teacher.tongSoTiet,
                    ""
                ]);
                applyDataRowStyle(r);
                r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
                return;
            }

            // Nhóm sinh viên theo Lớp (khoaSV)
            const classGroups = [];
            projects.forEach((proj) => {
                const cls = (proj.khoaSV || "-").trim();
                const lastGroup = classGroups[classGroups.length - 1];
                if (lastGroup && lastGroup.cls === cls) {
                    lastGroup.count++;
                    lastGroup.items.push(proj);
                } else {
                    classGroups.push({ cls, count: 1, items: [proj] });
                }
            });

            classGroups.forEach((cg) => {
                cg.items.forEach((proj) => {
                    const isFirstTeacher = startRow === worksheet.lastRow.number + 1;
                    const r = worksheet.addRow([
                        isFirstTeacher ? overallSTT++ : "",
                        isFirstTeacher ? teacher.giangVien : "",
                        isFirstTeacher ? teacher.khoa : "",
                        proj.sinhVien || "-",
                        proj.khoaSV || "-",
                        proj.tenDeTai || "-",
                        proj.soTiet || 0,
                        isFirstTeacher ? teacher.tongSoTiet : "",
                        ""
                    ]);
                    applyDataRowStyle(r);
                    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(6).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                    r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
                    r.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
                });
            });

            // Merge cells cho thông tin giảng viên (cột A, B, C, H)
            if (count > 1) {
                const endRow = startRow + count - 1;
                worksheet.mergeCells(`A${startRow}:A${endRow}`);
                worksheet.mergeCells(`B${startRow}:B${endRow}`);
                worksheet.mergeCells(`C${startRow}:C${endRow}`);
                worksheet.mergeCells(`H${startRow}:H${endRow}`);
            }

            // Merge cells cho cột Khóa (cột E) theo từng nhóm lớp
            let curClassRow = startRow;
            classGroups.forEach((cg) => {
                if (cg.count > 1) {
                    worksheet.mergeCells(`E${curClassRow}:E${curClassRow + cg.count - 1}`);
                }
                curClassRow += cg.count;
            });
        });

        // Dòng tổng cộng
        const totalRow = worksheet.addRow([
            "TỔNG CỘNG HỌC VIỆN",
            "", "", "", "", "", "",
            parseFloat(grandTotalHours.toFixed(2)),
            ""
        ]);
        worksheet.mergeCells(`A${totalRow.number}:G${totalRow.number}`);
        applyTotalRowStyle(totalRow);
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    }

    finalizeWorkbook(workbook);
    return await workbook.xlsx.writeBuffer();
};

module.exports = {
    exportStatsExcel
};
