"use strict";

const ExcelJS = require("exceljs");
const statsService = require("./kthpStats.service");

const applyHeaderStyle = (row, bgColor = "FFE0E0E0") => {
    row.font = { bold: true, size: 11 };
    row.eachCell((cell) => {
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
    row.eachCell((cell) => {
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle" };
    });
};

const formatDetailText = (row) => {
    if (row.loai_kthp === "COI_THI") {
        const parts = [];
        if (row.ngay_thi) parts.push(`Ngày: ${new Date(row.ngay_thi).toLocaleDateString("vi-VN")}`);
        if (row.ca_thi) parts.push(`Ca: ${row.ca_thi}`);
        if (row.phong_thi) parts.push(`Phòng: ${row.phong_thi}`);
        if (row.thoi_gian) parts.push(`TG: ${row.thoi_gian}p`);
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

class KthpExportService {
    async exportLecturerStats({ namHoc, khoa = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId = null }) {
        const lecturers = await statsService.getLecturerSummary({
            namHoc,
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
        workbook.creator = "Học viện Công nghệ Bưu chính Viễn thông";
        workbook.created = new Date();

        const scopeLabel = scope === "OFFICIAL" ? "CHÍNH THỨC" : "DỰ KIẾN";

        // Summary sheet
        const summarySheet = workbook.addWorksheet("Tổng hợp cá nhân");
        summarySheet.mergeCells("A1:I1");
        const titleCell = summarySheet.getCell("A1");
        titleCell.value = `THỐNG KÊ COI, CHẤM THI, RA ĐỀ THI (CÁ NHÂN) - NĂM HỌC ${namHoc}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center" };

        summarySheet.mergeCells("A2:I2");
        const subCell = summarySheet.getCell("A2");
        subCell.value = `Chế độ: ${scopeLabel} | Khoa: ${khoa === "ALL" ? "Tất cả các khoa" : khoa}`;
        subCell.font = { size: 11, italic: true };
        subCell.alignment = { horizontal: "center" };

        summarySheet.addRow([]);

        const summaryHeader = summarySheet.addRow([
            "STT",
            "Mã GV",
            "Họ và tên giảng viên",
            "Khoa / Đơn vị",
            "Số lượt",
            "Tiết QC Coi thi",
            "Tiết QC Ra đề",
            "Tiết QC Chấm thi",
            "Tổng số tiết QC",
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
                gv.ten_phong_ban || g.ma_phong_ban || "-",
                Number(gv.cong_viec_count || 0),
                Number(gv.so_tiet_coi_thi || 0),
                Number(gv.so_tiet_ra_de || 0),
                Number(gv.so_tiet_cham_thi || 0),
                Number(gv.tong_so_tiet_qc || 0),
            ]);
            applyDataRowStyle(r);
            r.getCell(1).alignment = { horizontal: "center" };
            r.getCell(2).alignment = { horizontal: "center" };
            r.getCell(4).alignment = { horizontal: "center" };
            r.getCell(5).alignment = { horizontal: "right" };
            r.getCell(6).alignment = { horizontal: "right" };
            r.getCell(7).alignment = { horizontal: "right" };
            r.getCell(8).alignment = { horizontal: "right" };
            r.getCell(9).alignment = { horizontal: "right" };

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
        totalRow.font = { bold: true };
        applyHeaderStyle(totalRow, "FFD9D9D9");
        totalRow.getCell(5).alignment = { horizontal: "right" };
        totalRow.getCell(6).alignment = { horizontal: "right" };
        totalRow.getCell(7).alignment = { horizontal: "right" };
        totalRow.getCell(8).alignment = { horizontal: "right" };
        totalRow.getCell(9).alignment = { horizontal: "right" };

        summarySheet.columns = [
            { width: 6 },
            { width: 10 },
            { width: 28 },
            { width: 22 },
            { width: 12 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
            { width: 18 },
        ];

        // Detail sheet
        const detailSheet = workbook.addWorksheet("Chi tiết công việc");
        detailSheet.mergeCells("A1:N1");
        const dTitle = detailSheet.getCell("A1");
        dTitle.value = `CHI TIẾT COI, CHẤM THI, RA ĐỀ THI - NĂM HỌC ${namHoc} (${scopeLabel})`;
        dTitle.font = { size: 14, bold: true };
        dTitle.alignment = { horizontal: "center" };

        detailSheet.addRow([]);

        const detailHeader = detailSheet.addRow([
            "STT",
            "Giảng viên",
            "Khoa",
            "Học kỳ",
            "Loại công việc",
            "Tên học phần",
            "Mã HP",
            "Lớp học phần",
            "Hệ ĐT",
            "Hình thức thi",
            "Chi tiết (Ca/Phòng/Số bài/Đề)",
            "Số TC",
            "Số SV",
            "Số tiết QC",
        ]);
        applyHeaderStyle(detailHeader, "FFB8CCE4");

        let detailIndex = 0;
        for (const gv of lecturers) {
            const records = await statsService.getLecturerRecords({
                lecturerId: gv.lecturer_id,
                namHoc,
                loaiKthp,
                scope,
                khoa,
            });

            records.forEach((row) => {
                detailIndex++;
                const r = detailSheet.addRow([
                    detailIndex,
                    gv.ten_nhan_vien,
                    gv.ma_phong_ban || "-",
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
                    Number(row.quy_chuan || 0),
                ]);
                applyDataRowStyle(r);
                r.getCell(1).alignment = { horizontal: "center" };
                r.getCell(3).alignment = { horizontal: "center" };
                r.getCell(4).alignment = { horizontal: "center" };
                r.getCell(5).alignment = { horizontal: "center" };
                r.getCell(12).alignment = { horizontal: "center" };
                r.getCell(13).alignment = { horizontal: "center" };
                r.getCell(14).alignment = { horizontal: "right" };
            });
        }

        detailSheet.columns = [
            { width: 6 },
            { width: 24 },
            { width: 12 },
            { width: 10 },
            { width: 18 },
            { width: 28 },
            { width: 14 },
            { width: 18 },
            { width: 14 },
            { width: 14 },
            { width: 30 },
            { width: 8 },
            { width: 8 },
            { width: 14 },
        ];

        return workbook;
    }

    async exportFacultyStats({ namHoc, khoaId = "ALL", loaiKthp = "ALL", scope = "OFFICIAL" }) {
        const faculties = await statsService.getFacultySummary({
            namHoc,
            khoaId,
            loaiKthp,
            scope,
        });

        if (!faculties.length) {
            throw new Error("Không có dữ liệu để xuất");
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Học viện Công nghệ Bưu chính Viễn thông";
        workbook.created = new Date();

        const scopeLabel = scope === "OFFICIAL" ? "CHÍNH THỨC" : "DỰ KIẾN";

        const sheet = workbook.addWorksheet("Thống kê theo khoa");
        sheet.mergeCells("A1:H1");
        const titleCell = sheet.getCell("A1");
        titleCell.value = `THỐNG KÊ COI, CHẤM THI, RA ĐỀ THEO KHOA - NĂM HỌC ${namHoc}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center" };

        sheet.mergeCells("A2:H2");
        const subCell = sheet.getCell("A2");
        subCell.value = `Chế độ: ${scopeLabel}`;
        subCell.font = { size: 11, italic: true };
        subCell.alignment = { horizontal: "center" };

        sheet.addRow([]);

        const header = sheet.addRow([
            "STT",
            "Mã Khoa",
            "Tên Khoa / Bộ môn",
            "Số giảng viên",
            "Tiết QC Coi thi",
            "Tiết QC Ra đề",
            "Tiết QC Chấm thi",
            "Tổng số tiết QC",
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
            r.getCell(1).alignment = { horizontal: "center" };
            r.getCell(2).alignment = { horizontal: "center" };
            r.getCell(4).alignment = { horizontal: "right" };
            r.getCell(5).alignment = { horizontal: "right" };
            r.getCell(6).alignment = { horizontal: "right" };
            r.getCell(7).alignment = { horizontal: "right" };
            r.getCell(8).alignment = { horizontal: "right" };

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
        totalRow.font = { bold: true };
        applyHeaderStyle(totalRow, "FFD9D9D9");
        totalRow.getCell(4).alignment = { horizontal: "right" };
        totalRow.getCell(5).alignment = { horizontal: "right" };
        totalRow.getCell(6).alignment = { horizontal: "right" };
        totalRow.getCell(7).alignment = { horizontal: "right" };
        totalRow.getCell(8).alignment = { horizontal: "right" };

        sheet.columns = [
            { width: 6 },
            { width: 12 },
            { width: 30 },
            { width: 16 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 20 },
        ];

        return workbook;
    }

    async exportInstituteStats({ namHoc, loaiKthp = "ALL", scope = "OFFICIAL" }) {
        const { byType, overview } = await statsService.getInstituteSummary({
            namHoc,
            loaiKthp,
            scope,
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Học viện Công nghệ Bưu chính Viễn thông";
        workbook.created = new Date();

        const scopeLabel = scope === "OFFICIAL" ? "CHÍNH THỨC" : "DỰ KIẾN";

        const sheet = workbook.addWorksheet("Toàn học viện");
        sheet.mergeCells("A1:E1");
        const titleCell = sheet.getCell("A1");
        titleCell.value = `THỐNG KÊ COI, CHẤM THI, RA ĐỀ TOÀN HỌC VIỆN - NĂM HỌC ${namHoc}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center" };

        sheet.mergeCells("A2:E2");
        const subCell = sheet.getCell("A2");
        subCell.value = `Chế độ: ${scopeLabel} | Tổng số GV tham gia: ${overview.tong_gv || 0} | Tổng số khoa: ${overview.tong_khoa || 0}`;
        subCell.font = { size: 11, italic: true };
        subCell.alignment = { horizontal: "center" };

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
            r.getCell(1).alignment = { horizontal: "center" };
            r.getCell(3).alignment = { horizontal: "right" };
            r.getCell(4).alignment = { horizontal: "right" };
            r.getCell(5).alignment = { horizontal: "right" };

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
        totalRow.font = { bold: true };
        applyHeaderStyle(totalRow, "FFD9D9D9");
        totalRow.getCell(3).alignment = { horizontal: "right" };
        totalRow.getCell(4).alignment = { horizontal: "right" };
        totalRow.getCell(5).alignment = { horizontal: "right" };

        sheet.columns = [
            { width: 6 },
            { width: 28 },
            { width: 24 },
            { width: 20 },
            { width: 24 },
        ];

        return workbook;
    }
}

module.exports = new KthpExportService();

