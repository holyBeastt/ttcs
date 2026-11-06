"use strict";

const ExcelJS = require("exceljs");
const statsService = require("./kthpStats.service");

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

const formatDetailText = (row) => {
    if (row.loai_kthp === "COI_THI") {
        const parts = [];
        if (row.ngay_thi) parts.push(`Ngày: ${new Date(row.ngay_thi).toLocaleDateString("vi-VN")}`);
        if (row.ca_thi) parts.push(`Ca: ${row.ca_thi}`);
        if (row.phong_thi) parts.push(`Phòng: ${row.phong_thi}`);
        if (row.thoi_gian) parts.push(`TG: ${row.thoi_gian} phút`);
        return parts.join(", ") || "-";
    }
    if (row.loai_kthp === "CHAM_THI") {
        const parts = [];
        if (row.so_bai_phach) parts.push(`${row.so_bai_phach} bài/phách`);
        if (row.vai_tro) parts.push(`Vai trò: ${row.vai_tro}`);
        return parts.join(" - ") || "-";
    }
    if (row.loai_kthp === "RA_DE" || row.loai_kthp === "NGAN_HANG_CAU_HOI") {
        return row.so_luong_de ? `${row.so_luong_de} đề` : "-";
    }
    return "-";
};

const resolveYearLabel = (namHocFrom, namHocTo, namHoc) => {
    const from = String(namHocFrom || namHoc || "").trim();
    const to = String(namHocTo || namHoc || "").trim();
    if (from && to && from !== to) {
        return `TỪ NĂM HỌC ${from} ĐẾN NĂM HỌC ${to}`;
    }
    return `NĂM HỌC ${from || to}`;
};

class KthpExportService {
    async exportLecturerStats({ namHoc, namHocFrom, namHocTo, khoa = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId = null }) {
        const lecturers = await statsService.getLecturerSummary({
            namHoc,
            namHocFrom,
            namHocTo,
            khoa,
            loaiKthp,
            keyword,
            scope,
            lecturerId,
        });

        if (!lecturers.length) {
            throw new Error("Không có dữ liệu để xuất");
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Học viện Kỹ thuật Mật mã";
        workbook.lastModifiedBy = "Học viện Kỹ thuật Mật mã";
        workbook.created = new Date();

        const scopeLabel = scope === "OFFICIAL" ? "CHÍNH THỨC" : "DỰ KIẾN";
        const yearLabel = resolveYearLabel(namHocFrom, namHocTo, namHoc);

        // Summary sheet
        const summarySheet = workbook.addWorksheet("Tổng hợp cá nhân");
        summarySheet.mergeCells("A1:I1");
        const titleCell = summarySheet.getCell("A1");
        titleCell.value = `THỐNG KÊ COI, CHẤM THI, RA ĐỀ THI (CÁ NHÂN) - ${yearLabel}`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 14, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        summarySheet.mergeCells("A2:I2");
        const subCell = summarySheet.getCell("A2");
        subCell.value = `Chế độ: ${scopeLabel} | Khoa / Đơn vị: ${khoa === "ALL" ? "Tất cả các khoa" : khoa}`;
        subCell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 11, italic: true };
        subCell.alignment = { horizontal: "center", vertical: "middle" };

        summarySheet.addRow([]);

        const summaryHeader = summarySheet.addRow([
            "STT",
            "Mã giảng viên",
            "Họ và tên giảng viên",
            "Khoa / Đơn vị",
            "Số lượt",
            "Tiết QC Coi thi",
            "Tiết QC Ra đề",
            "Tiết QC Chấm thi",
            "Tổng số tiết quy chuẩn",
        ]);
        applyHeaderStyle(summaryHeader, "FFB8CCE4");

        let sumCoi = 0;
        let sumRaDe = 0;
        let sumCham = 0;
        let sumTotal = 0;
        let sumLuot = 0;

        lecturers.forEach((gv, idx) => {
            const r = summarySheet.addRow([
                idx + 1,
                gv.lecturer_id || "-",
                gv.ten_nhan_vien,
                gv.ten_phong_ban || gv.ma_phong_ban || "-",
                Number(gv.cong_viec_count || 0),
                Number(gv.so_tiet_coi_thi || 0),
                Number(gv.so_tiet_ra_de || 0),
                Number(gv.so_tiet_cham_thi || 0),
                Number(gv.tong_so_tiet_qc || 0),
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(9).alignment = { horizontal: "right", vertical: "middle" };

            sumLuot += Number(gv.cong_viec_count || 0);
            sumCoi += Number(gv.so_tiet_coi_thi || 0);
            sumRaDe += Number(gv.so_tiet_ra_de || 0);
            sumCham += Number(gv.so_tiet_cham_thi || 0);
            sumTotal += Number(gv.tong_so_tiet_qc || 0);
        });

        const totalRow = summarySheet.addRow([
            "TỔNG CỘNG",
            "",
            "",
            "",
            sumLuot,
            sumCoi,
            sumRaDe,
            sumCham,
            sumTotal,
        ]);
        summarySheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
        applyTotalRowStyle(totalRow, "FFD9D9D9");
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" };

        summarySheet.columns = [
            { width: 6 },
            { width: 14 },
            { width: 28 },
            { width: 24 },
            { width: 12 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
            { width: 22 },
        ];

        // Detail sheet
        const detailSheet = workbook.addWorksheet("Chi tiết công việc");
        detailSheet.mergeCells("A1:O1");
        const dTitle = detailSheet.getCell("A1");
        dTitle.value = `CHI TIẾT COI, CHẤM THI, RA ĐỀ THI - ${yearLabel} (${scopeLabel})`;
        dTitle.font = { name: FONT_NAME, family: FONT_FAMILY, size: 14, bold: true };
        dTitle.alignment = { horizontal: "center", vertical: "middle" };

        detailSheet.addRow([]);

        const detailHeader = detailSheet.addRow([
            "STT",
            "Năm học",
            "Họ và tên giảng viên",
            "Khoa / Đơn vị",
            "Học kỳ",
            "Loại công việc",
            "Tên học phần",
            "Mã học phần",
            "Lớp học phần",
            "Hệ đào tạo",
            "Hình thức thi",
            "Chi tiết (Ca / Phòng / Số bài / Đề)",
            "Số tín chỉ",
            "Số sinh viên",
            "Số tiết quy chuẩn",
        ]);
        applyHeaderStyle(detailHeader, "FFB8CCE4");

        let detailIndex = 0;
        let detailSumQc = 0;

        for (const gv of lecturers) {
            const records = await statsService.getLecturerRecords({
                lecturerId: gv.lecturer_id,
                namHoc,
                namHocFrom,
                namHocTo,
                loaiKthp,
                scope,
                khoa,
            });

            records.forEach((row) => {
                detailIndex++;
                const qcVal = Number(row.quy_chuan || 0);
                detailSumQc += qcVal;

                const r = detailSheet.addRow([
                    detailIndex,
                    row.nam_hoc || namHoc,
                    gv.ten_nhan_vien,
                    gv.ten_phong_ban || gv.ma_phong_ban || "-",
                    row.hoc_ky ? `Kỳ ${row.hoc_ky}` : "-",
                    row.loai_kthp_label || row.loai_kthp,
                    row.ten_hoc_phan || "-",
                    row.ma_hoc_phan || "-",
                    row.lop_hoc_phan || "-",
                    row.he_dao_tao || "-",
                    row.hinh_thuc_thi || "-",
                    formatDetailText(row),
                    row.so_tc ?? "-",
                    row.so_sv ?? "-",
                    qcVal,
                ]);
                applyDataRowStyle(r);
                r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(13).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(14).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(15).alignment = { horizontal: "right", vertical: "middle" };
            });
        }

        const detailTotalRow = detailSheet.addRow([
            "TỔNG CỘNG",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            detailSumQc,
        ]);
        detailSheet.mergeCells(`A${detailTotalRow.number}:N${detailTotalRow.number}`);
        applyTotalRowStyle(detailTotalRow, "FFD9D9D9");
        detailTotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        detailTotalRow.getCell(15).alignment = { horizontal: "right", vertical: "middle" };

        detailSheet.columns = [
            { width: 6 },
            { width: 14 },
            { width: 24 },
            { width: 22 },
            { width: 10 },
            { width: 18 },
            { width: 28 },
            { width: 14 },
            { width: 18 },
            { width: 16 },
            { width: 16 },
            { width: 32 },
            { width: 12 },
            { width: 12 },
            { width: 18 },
        ];

        finalizeWorkbook(workbook);
        return workbook;
    }

    async exportFacultyStats({ namHoc, namHocFrom, namHocTo, khoaId = "ALL", loaiKthp = "ALL", scope = "OFFICIAL" }) {
        const faculties = await statsService.getFacultySummary({
            namHoc,
            namHocFrom,
            namHocTo,
            khoaId,
            loaiKthp,
            scope,
        });

        if (!faculties.length) {
            throw new Error("Không có dữ liệu để xuất");
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Học viện Kỹ thuật Mật mã";
        workbook.lastModifiedBy = "Học viện Kỹ thuật Mật mã";
        workbook.created = new Date();

        const scopeLabel = scope === "OFFICIAL" ? "CHÍNH THỨC" : "DỰ KIẾN";
        const yearLabel = resolveYearLabel(namHocFrom, namHocTo, namHoc);

        const sheet = workbook.addWorksheet("Thống kê theo khoa");
        sheet.mergeCells("A1:H1");
        const titleCell = sheet.getCell("A1");
        titleCell.value = `THỐNG KÊ COI, CHẤM THI, RA ĐỀ THI THEO KHOA - ${yearLabel}`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 14, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        sheet.mergeCells("A2:H2");
        const subCell = sheet.getCell("A2");
        subCell.value = `Chế độ: ${scopeLabel}`;
        subCell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 11, italic: true };
        subCell.alignment = { horizontal: "center", vertical: "middle" };

        sheet.addRow([]);

        const header = sheet.addRow([
            "STT",
            "Mã Khoa / Đơn vị",
            "Tên Khoa / Đơn vị",
            "Số giảng viên",
            "Tiết QC Coi thi",
            "Tiết QC Ra đề",
            "Tiết QC Chấm thi",
            "Tổng số tiết quy chuẩn",
        ]);
        applyHeaderStyle(header, "FFC5D9F1");

        let totalGv = 0;
        let totalCoi = 0;
        let totalRaDe = 0;
        let totalCham = 0;
        let grandTotal = 0;

        faculties.forEach((f, idx) => {
            const r = sheet.addRow([
                idx + 1,
                f.ma_phong_ban,
                f.ten_phong_ban || f.ma_phong_ban,
                Number(f.gv_count || 0),
                Number(f.so_tiet_coi_thi || 0),
                Number(f.so_tiet_ra_de || 0),
                Number(f.so_tiet_cham_thi || 0),
                Number(f.tong_so_tiet_qc || 0),
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(8).alignment = { horizontal: "right", vertical: "middle" };

            totalGv += Number(f.gv_count || 0);
            totalCoi += Number(f.so_tiet_coi_thi || 0);
            totalRaDe += Number(f.so_tiet_ra_de || 0);
            totalCham += Number(f.so_tiet_cham_thi || 0);
            grandTotal += Number(f.tong_so_tiet_qc || 0);
        });

        const totalRow = sheet.addRow([
            "TỔNG CỘNG",
            "",
            "",
            totalGv,
            totalCoi,
            totalRaDe,
            totalCham,
            grandTotal,
        ]);
        sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
        applyTotalRowStyle(totalRow, "FFD9D9D9");
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };

        sheet.columns = [
            { width: 6 },
            { width: 18 },
            { width: 32 },
            { width: 16 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 22 },
        ];

        // Detail sheet for Faculty records
        const detailSheet = workbook.addWorksheet("Chi tiết theo khoa");
        detailSheet.mergeCells("A1:O1");
        const fdTitle = detailSheet.getCell("A1");
        fdTitle.value = `CHI TIẾT COI, CHẤM THI, RA ĐỀ THI THEO KHOA - ${yearLabel} (${scopeLabel})`;
        fdTitle.font = { name: FONT_NAME, family: FONT_FAMILY, size: 14, bold: true };
        fdTitle.alignment = { horizontal: "center", vertical: "middle" };

        detailSheet.addRow([]);

        const detailHeader = detailSheet.addRow([
            "STT",
            "Năm học",
            "Khoa / Đơn vị",
            "Họ và tên giảng viên",
            "Học kỳ",
            "Loại công việc",
            "Tên học phần",
            "Mã học phần",
            "Lớp học phần",
            "Hệ đào tạo",
            "Hình thức thi",
            "Chi tiết (Ca / Phòng / Số bài / Đề)",
            "Số tín chỉ",
            "Số sinh viên",
            "Số tiết quy chuẩn",
        ]);
        applyHeaderStyle(detailHeader, "FFC5D9F1");

        let fDetailIdx = 0;
        let fSumQc = 0;

        for (const f of faculties) {
            const records = await statsService.getFacultyRecords({
                khoa: f.ma_phong_ban,
                namHoc,
                namHocFrom,
                namHocTo,
                loaiKthp,
                scope,
            });

            records.forEach((row) => {
                fDetailIdx++;
                const qcVal = Number(row.quy_chuan || 0);
                fSumQc += qcVal;

                const r = detailSheet.addRow([
                    fDetailIdx,
                    row.nam_hoc || namHoc,
                    f.ten_phong_ban || f.ma_phong_ban,
                    row.giang_vien || "-",
                    row.hoc_ky ? `Kỳ ${row.hoc_ky}` : "-",
                    row.loai_kthp_label || row.loai_kthp,
                    row.ten_hoc_phan || "-",
                    row.ma_hoc_phan || "-",
                    row.lop_hoc_phan || "-",
                    row.he_dao_tao || "-",
                    row.hinh_thuc_thi || "-",
                    formatDetailText(row),
                    row.so_tc ?? "-",
                    row.so_sv ?? "-",
                    qcVal,
                ]);
                applyDataRowStyle(r);
                r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(13).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(14).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(15).alignment = { horizontal: "right", vertical: "middle" };
            });
        }

        const fDetailTotalRow = detailSheet.addRow([
            "TỔNG CỘNG",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            fSumQc,
        ]);
        detailSheet.mergeCells(`A${fDetailTotalRow.number}:N${fDetailTotalRow.number}`);
        applyTotalRowStyle(fDetailTotalRow, "FFD9D9D9");
        fDetailTotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        fDetailTotalRow.getCell(15).alignment = { horizontal: "right", vertical: "middle" };

        detailSheet.columns = [
            { width: 6 },
            { width: 14 },
            { width: 24 },
            { width: 24 },
            { width: 10 },
            { width: 18 },
            { width: 28 },
            { width: 14 },
            { width: 18 },
            { width: 16 },
            { width: 16 },
            { width: 32 },
            { width: 12 },
            { width: 12 },
            { width: 18 },
        ];

        finalizeWorkbook(workbook);
        return workbook;
    }

    async exportInstituteStats({ namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL" }) {
        const { byType, overview } = await statsService.getInstituteSummary({
            namHoc,
            namHocFrom,
            namHocTo,
            loaiKthp,
            scope,
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Học viện Kỹ thuật Mật mã";
        workbook.lastModifiedBy = "Học viện Kỹ thuật Mật mã";
        workbook.created = new Date();

        const scopeLabel = scope === "OFFICIAL" ? "CHÍNH THỨC" : "DỰ KIẾN";
        const yearLabel = resolveYearLabel(namHocFrom, namHocTo, namHoc);

        const sheet = workbook.addWorksheet("Toàn Học viện");
        sheet.mergeCells("A1:E1");
        const titleCell = sheet.getCell("A1");
        titleCell.value = `THỐNG KÊ COI, CHẤM THI, RA ĐỀ THI TOÀN HỌC VIỆN - ${yearLabel}`;
        titleCell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 14, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        sheet.mergeCells("A2:E2");
        const subCell = sheet.getCell("A2");
        subCell.value = `Chế độ: ${scopeLabel} | Tổng số giảng viên tham gia: ${overview.tong_gv || 0} | Tổng số khoa / đơn vị: ${overview.tong_khoa || 0}`;
        subCell.font = { name: FONT_NAME, family: FONT_FAMILY, size: 11, italic: true };
        subCell.alignment = { horizontal: "center", vertical: "middle" };

        sheet.addRow([]);

        const header = sheet.addRow([
            "STT",
            "Loại công việc",
            "Số giảng viên tham gia",
            "Số lượt thực hiện",
            "Tổng số tiết quy chuẩn",
        ]);
        applyHeaderStyle(header, "FFC5D9F1");

        let sumGv = 0;
        let sumLuot = 0;
        let sumQc = 0;

        byType.forEach((row, idx) => {
            const r = sheet.addRow([
                idx + 1,
                row.loai_kthp_label,
                Number(row.gv_count || 0),
                Number(row.cong_viec_count || 0),
                Number(row.tong_so_tiet_qc || 0),
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            r.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
            r.getCell(5).alignment = { horizontal: "right", vertical: "middle" };

            sumGv += Number(row.gv_count || 0);
            sumLuot += Number(row.cong_viec_count || 0);
            sumQc += Number(row.tong_so_tiet_qc || 0);
        });

        const totalRow = sheet.addRow([
            "TỔNG CỘNG",
            "",
            overview.tong_gv || sumGv,
            sumLuot,
            Number(overview.tong_so_tiet_qc || sumQc),
        ]);
        sheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);
        applyTotalRowStyle(totalRow, "FFD9D9D9");
        totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };

        sheet.columns = [
            { width: 6 },
            { width: 28 },
            { width: 26 },
            { width: 22 },
            { width: 26 },
        ];

        // Sheet 2: Chi tiết toàn Học viện
        const allRecords = await statsService.getInstituteRecords({
            namHoc,
            namHocFrom,
            namHocTo,
            loaiKthp,
            scope,
        });

        if (allRecords && allRecords.length > 0) {
            const detailSheet = workbook.addWorksheet("Chi tiết toàn Học viện");
            detailSheet.mergeCells("A1:O1");
            const iTitle = detailSheet.getCell("A1");
            iTitle.value = `CHI TIẾT COI, CHẤM THI, RA ĐỀ THI TOÀN HỌC VIỆN - ${yearLabel} (${scopeLabel})`;
            iTitle.font = { name: FONT_NAME, family: FONT_FAMILY, size: 14, bold: true };
            iTitle.alignment = { horizontal: "center", vertical: "middle" };

            detailSheet.addRow([]);

            const dHeader = detailSheet.addRow([
                "STT",
                "Năm học",
                "Khoa / Đơn vị",
                "Họ và tên giảng viên",
                "Học kỳ",
                "Loại công việc",
                "Tên học phần",
                "Mã học phần",
                "Lớp học phần",
                "Hệ đào tạo",
                "Hình thức thi",
                "Chi tiết (Ca / Phòng / Số bài / Đề)",
                "Số tín chỉ",
                "Số sinh viên",
                "Số tiết quy chuẩn",
            ]);
            applyHeaderStyle(dHeader, "FFC5D9F1");

            let instQc = 0;
            allRecords.forEach((row, idx) => {
                const qcVal = Number(row.quy_chuan || 0);
                instQc += qcVal;

                const r = detailSheet.addRow([
                    idx + 1,
                    row.nam_hoc || namHoc,
                    row.ten_phong_ban || row.khoa || "-",
                    row.giang_vien || "-",
                    row.hoc_ky ? `Kỳ ${row.hoc_ky}` : "-",
                    row.loai_kthp_label || row.loai_kthp,
                    row.ten_hoc_phan || "-",
                    row.ma_hoc_phan || "-",
                    row.lop_hoc_phan || "-",
                    row.he_dao_tao || "-",
                    row.hinh_thuc_thi || "-",
                    formatDetailText(row),
                    row.so_tc ?? "-",
                    row.so_sv ?? "-",
                    qcVal,
                ]);
                applyDataRowStyle(r);
                r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(13).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(14).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(15).alignment = { horizontal: "right", vertical: "middle" };
            });

            const iTotalRow = detailSheet.addRow([
                "TỔNG CỘNG",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                instQc,
            ]);
            detailSheet.mergeCells(`A${iTotalRow.number}:N${iTotalRow.number}`);
            applyTotalRowStyle(iTotalRow, "FFD9D9D9");
            iTotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            iTotalRow.getCell(15).alignment = { horizontal: "right", vertical: "middle" };

            detailSheet.columns = [
                { width: 6 },
                { width: 14 },
                { width: 24 },
                { width: 24 },
                { width: 10 },
                { width: 18 },
                { width: 28 },
                { width: 14 },
                { width: 18 },
                { width: 16 },
                { width: 16 },
                { width: 32 },
                { width: 12 },
                { width: 12 },
                { width: 18 },
            ];
        }

        finalizeWorkbook(workbook);
        return workbook;
    }
}

module.exports = new KthpExportService();
