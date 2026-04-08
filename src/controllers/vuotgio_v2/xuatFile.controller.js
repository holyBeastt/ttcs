/**
 * VUOT GIO V2 - Xuất File Controller
 * Export Excel vượt giờ
 * Date: 2026-01-29
 */

const createPoolConnection = require("../../config/databasePool");
const tongHopController = require("./tongHop.controller");
const ExcelJS = require("exceljs");

// =====================================================
// RENDER & EXPORT
// =====================================================

/**
 * Render trang xuất file
 */
const renderPage = (req, res) => {
    res.render("vuotgio_v2/vuotgio.xuatFile.ejs");
};

/**
 * Export Excel vượt giờ
 */
const exportExcel = async (req, res) => {
    const { namHoc, khoa, giangVien } = req.query;

    if (!namHoc) {
        return res.status(400).json({
            success: false,
            message: "Thiếu thông tin Năm học"
        });
    }

    console.log(`[VuotGio V2] Export Excel - Năm: ${namHoc}, Khoa: ${khoa || 'ALL'}, GV: ${giangVien || 'ALL'}`);

    let connection;
    try {
        connection = await createPoolConnection();

        const isAllKhoa = !khoa || khoa === 'ALL';

        // Lấy dữ liệu tổng hợp
        const data = await getExportData(namHoc, isAllKhoa ? null : khoa, giangVien, connection);

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'VuotGio V2 System';
        workbook.created = new Date();

        // Sheet 1: Tổng hợp vượt giờ
        await createSummarySheet(workbook, data, namHoc, khoa);

        // Sheet 2: Chi tiết giảng dạy
        await createGiangDayDetailSheet(workbook, data.giangDayDetail, namHoc);

        // Sheet 3: Lớp ngoài quy chuẩn
        await createLopNgoaiQCSheet(workbook, data.lopNgoaiQCDetail, namHoc);

        // Sheet 4: Kết thúc học phần
        await createKTHPSheet(workbook, data.kthpDetail, namHoc);

        // Sheet 5: Đồ án
        await createDoAnSheet(workbook, data.doAnDetail, namHoc);

        // Set response headers
        const filename = `VuotGio_${namHoc}_${khoa || 'TatCa'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Lỗi khi export Excel:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi export Excel."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy dữ liệu để export
 */
async function getExportData(NamHoc, Khoa, GiangVien, connection) {
    const isAllKhoa = !Khoa;

    // 1. Lấy tổng hợp vượt giờ
    // Query giảng dạy TKB
    let giangDayQuery = `
        SELECT GiangVien, SUM(QuyChuan) as soTietGiangDay
        FROM giangday WHERE NamHoc = ?
    `;
    const giangDayParams = [NamHoc];
    if (!isAllKhoa) {
        giangDayQuery += ` AND Khoa = ?`;
        giangDayParams.push(Khoa);
    }
    if (GiangVien) {
        giangDayQuery += ` AND GiangVien = ?`;
        giangDayParams.push(GiangVien);
    }
    giangDayQuery += ` GROUP BY GiangVien`;
    const [giangDay] = await connection.execute(giangDayQuery, giangDayParams);

    // Query lớp ngoài quy chuẩn
    let lopNgoaiQCQuery = `
        SELECT giang_vien AS GiangVien, SUM(quy_chuan) as soTietNgoaiQC
        FROM vg_lop_ngoai_quy_chuan WHERE nam_hoc = ?
    `;
    const lopNgoaiQCParams = [NamHoc];
    if (!isAllKhoa) {
        lopNgoaiQCQuery += ` AND khoa = ?`;
        lopNgoaiQCParams.push(Khoa);
    }
    if (GiangVien) {
        lopNgoaiQCQuery += ` AND giang_vien = ?`;
        lopNgoaiQCParams.push(GiangVien);
    }
    lopNgoaiQCQuery += ` GROUP BY giang_vien`;
    const [lopNgoaiQC] = await connection.execute(lopNgoaiQCQuery, lopNgoaiQCParams);

    // Query KTHP
    let kthpQuery = `
        SELECT giang_vien AS GiangVien, SUM(quy_chuan) as soTietKTHP
        FROM vg_coi_cham_ra_de WHERE nam_hoc = ? AND khoa_duyet = 1
    `;
    const kthpParams = [NamHoc];
    if (!isAllKhoa) {
        kthpQuery += ` AND khoa = ?`;
        kthpParams.push(Khoa);
    }
    if (GiangVien) {
        kthpQuery += ` AND giang_vien = ?`;
        kthpParams.push(GiangVien);
    }
    kthpQuery += ` GROUP BY giang_vien`;
    const [kthp] = await connection.execute(kthpQuery, kthpParams);

    // Query đồ án
    let doAnQuery = `
        SELECT GiangVien, SUM(SoTiet) as soTietDoAn
        FROM exportdoantotnghiep WHERE NamHoc = ? AND isMoiGiang = 0
    `;
    const doAnParams = [NamHoc];
    if (!isAllKhoa) {
        doAnQuery += ` AND MaPhongBan = ?`;
        doAnParams.push(Khoa);
    }
    if (GiangVien) {
        doAnQuery += ` AND GiangVien = ?`;
        doAnParams.push(GiangVien);
    }
    doAnQuery += ` GROUP BY GiangVien`;
    const [doAn] = await connection.execute(doAnQuery, doAnParams);

    // Lấy NCKH
    const nckhData = await tongHopController.getNCKHDataInternal(NamHoc, Khoa, connection);

    // Lấy nhân viên
    let nhanVienQuery = `SELECT TenNhanVien, PhanTramMienGiam, MaPhongBan FROM nhanvien WHERE 1=1`;
    const nhanVienParams = [];
    if (!isAllKhoa) {
        nhanVienQuery += ` AND MaPhongBan = ?`;
        nhanVienParams.push(Khoa);
    }
    if (GiangVien) {
        nhanVienQuery += ` AND TenNhanVien = ?`;
        nhanVienParams.push(GiangVien);
    }
    const [nhanVien] = await connection.execute(nhanVienQuery, nhanVienParams);

    // Lấy định mức
    const [dinhMucRows] = await connection.execute(`SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1`);
    const dinhMuc = dinhMucRows[0] || { GiangDay: 280, NCKH: 280 };

    // Tính toán tổng hợp
    const summary = tongHopController.calculateVuotGioForAll({
        giangDay,
        lopNgoaiQC,
        kthp,
        doAn,
        nckhData,
        nhanVien,
        dinhMuc
    });

    // 2. Lấy chi tiết giảng dạy
    let giangDayDetailQuery = `SELECT * FROM giangday WHERE NamHoc = ?`;
    const giangDayDetailParams = [NamHoc];
    if (!isAllKhoa) {
        giangDayDetailQuery += ` AND Khoa = ?`;
        giangDayDetailParams.push(Khoa);
    }
    if (GiangVien) {
        giangDayDetailQuery += ` AND GiangVien = ?`;
        giangDayDetailParams.push(GiangVien);
    }
    giangDayDetailQuery += ` ORDER BY GiangVien, HocKy, TenHocPhan`;
    const [giangDayDetail] = await connection.execute(giangDayDetailQuery, giangDayDetailParams);

    // 3. Lấy chi tiết lớp ngoài quy chuẩn
    let lopNgoaiQCDetailQuery = `SELECT id AS ID, id_user, tt, giang_vien AS GiangVien, hoc_ky AS HocKy, hoc_ky, nam_hoc AS NamHoc, nam_hoc, lop_hoc_phan AS TenHP, lop_hoc_phan AS LopHocPhan, ma_hoc_phan AS MaHP, ma_hoc_phan, so_tin_chi AS SoTC, so_tin_chi, ten_lop AS Lop, ten_lop, so_sv AS SiSo, he_so_lop_dong AS HeSoLopDong, he_so_lop_dong, ll AS SoTiet, ll, quy_chuan AS QuyChuan, quy_chuan, ghi_chu AS GhiChu, ghi_chu, ma_bo_mon AS MaBoMon, ma_bo_mon, so_tiet_ctdt AS SoTietCTDT, so_tiet_ctdt, he_so_t7cn AS HeSoT7CN, he_so_t7cn, giao_vien_giang_day AS GiaoVienGiangDay, giao_vien_giang_day, moi_giang AS MoiGiang, moi_giang, he_dao_tao, khoa_duyet AS KhoaDuyet, dao_tao_duyet AS DaoTaoDuyet, tai_chinh_duyet AS TaiChinhDuyet, ngay_bat_dau AS NgayBatDau, ngay_ket_thuc AS NgayKetThuc, khoa AS Khoa, dot AS Dot, hoan_thanh AS HoanThanh, 0 AS DaLuu FROM vg_lop_ngoai_quy_chuan WHERE nam_hoc = ?`;
    const lopNgoaiQCDetailParams = [NamHoc];
    if (!isAllKhoa) {
        lopNgoaiQCDetailQuery += ` AND khoa = ?`;
        lopNgoaiQCDetailParams.push(Khoa);
    }
    if (GiangVien) {
        lopNgoaiQCDetailQuery += ` AND giang_vien = ?`;
        lopNgoaiQCDetailParams.push(GiangVien);
    }
    lopNgoaiQCDetailQuery += ` ORDER BY giang_vien, hoc_ky, lop_hoc_phan`;
    const [lopNgoaiQCDetail] = await connection.execute(lopNgoaiQCDetailQuery, lopNgoaiQCDetailParams);

    // 4. Lấy chi tiết KTHP
    let kthpDetailQuery = `SELECT id, id_user, giang_vien AS GiangVien, giang_vien, khoa, hoc_ky AS HocKy, hoc_ky, nam_hoc AS NamHoc, nam_hoc, ten_hoc_phan AS TenHP, ten_hoc_phan AS TenHocPhan, ten_hoc_phan, '' AS MaHP, lop_hoc_phan AS Lop, lop_hoc_phan AS LopHocPhan, lop_hoc_phan, doi_tuong AS DoiTuong, doi_tuong, bai_cham_1 AS BaiCham1, bai_cham_1, bai_cham_2 AS BaiCham2, bai_cham_2, tong_so AS SiSo, tong_so AS TongSo, tong_so, hinh_thuc AS LoaiKTHP, hinh_thuc, quy_chuan AS SoTiet, quy_chuan AS SoTietQC, quy_chuan, ghi_chu AS GhiChu, ghi_chu, khoa AS MaKhoa, khoa_duyet AS KhoaDuyet, khoa_duyet, khao_thi_duyet AS KhaoThiDuyet, khao_thi_duyet FROM vg_coi_cham_ra_de WHERE nam_hoc = ? AND khoa_duyet = 1`;
    const kthpDetailParams = [NamHoc];
    if (!isAllKhoa) {
        kthpDetailQuery += ` AND khoa = ?`;
        kthpDetailParams.push(Khoa);
    }
    if (GiangVien) {
        kthpDetailQuery += ` AND giang_vien = ?`;
        kthpDetailParams.push(GiangVien);
    }
    kthpDetailQuery += ` ORDER BY giang_vien, hoc_ky, hinh_thuc`;
    const [kthpDetail] = await connection.execute(kthpDetailQuery, kthpDetailParams);

    // 5. Lấy chi tiết đồ án
    let doAnDetailQuery = `SELECT * FROM exportdoantotnghiep WHERE NamHoc = ? AND isMoiGiang = 0`;
    const doAnDetailParams = [NamHoc];
    if (!isAllKhoa) {
        doAnDetailQuery += ` AND MaPhongBan = ?`;
        doAnDetailParams.push(Khoa);
    }
    if (GiangVien) {
        doAnDetailQuery += ` AND GiangVien = ?`;
        doAnDetailParams.push(GiangVien);
    }
    doAnDetailQuery += ` ORDER BY GiangVien`;
    const [doAnDetail] = await connection.execute(doAnDetailQuery, doAnDetailParams);

    return {
        summary,
        dinhMuc,
        giangDayDetail,
        lopNgoaiQCDetail,
        kthpDetail,
        doAnDetail
    };
}

/**
 * Tạo sheet tổng hợp
 */
async function createSummarySheet(workbook, data, NamHoc, Khoa) {
    const sheet = workbook.addWorksheet('Tổng hợp vượt giờ');

    // Tiêu đề
    sheet.mergeCells('A1:N1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `TỔNG HỢP VƯỢT GIỜ NĂM HỌC ${NamHoc}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Subtititle
    sheet.mergeCells('A2:N2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = Khoa ? `Khoa: ${Khoa}` : 'Tất cả các Khoa';
    subtitleCell.alignment = { horizontal: 'center' };

    // Note về V2
    sheet.mergeCells('A3:N3');
    const noteCell = sheet.getCell('A3');
    noteCell.value = '(VuotGio V2 - Không tính giữa kỳ, không bảo lưu NCKH)';
    noteCell.font = { italic: true, color: { argb: 'FF666666' } };
    noteCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = [
        'STT', 'Giảng viên', 'Khoa',
        'Giảng dạy TKB', 'Lớp ngoài QC', 'KTHP', 'Đồ án',
        'Tổng thực hiện', 'NCKH', 'Định mức NCKH', 'Thiếu NCKH',
        'Định mức GD', '% Miễn giảm', 'Vượt giờ'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Data rows
    data.summary.forEach((row, index) => {
        const dataRow = sheet.addRow([
            index + 1,
            row.giangVien,
            row.maKhoa,
            row.soTietGiangDay,
            row.soTietNgoaiQC,
            row.soTietKTHP,
            row.soTietDoAn,
            row.soTietThucHien,
            row.soTietNCKH,
            row.dinhMucNCKH,
            row.soTietThieuNCKH,
            row.soTietDinhMuc,
            row.phanTramMienGiam,
            row.soTietVuotGio
        ]);

        dataRow.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle' };
        });

        // Highlight vượt giờ > 0
        if (row.soTietVuotGio > 0) {
            dataRow.getCell(14).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD4EDDA' }
            };
        }
    });

    // Tổng cộng
    const totalRow = sheet.addRow([
        '', 'TỔNG CỘNG', '',
        data.summary.reduce((sum, r) => sum + r.soTietGiangDay, 0),
        data.summary.reduce((sum, r) => sum + r.soTietNgoaiQC, 0),
        data.summary.reduce((sum, r) => sum + r.soTietKTHP, 0),
        data.summary.reduce((sum, r) => sum + r.soTietDoAn, 0),
        data.summary.reduce((sum, r) => sum + r.soTietThucHien, 0),
        data.summary.reduce((sum, r) => sum + r.soTietNCKH, 0),
        '', '',
        '', '',
        data.summary.reduce((sum, r) => sum + r.soTietVuotGio, 0)
    ]);
    totalRow.font = { bold: true };
    totalRow.eachCell(cell => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Auto width
    sheet.columns.forEach((column, index) => {
        let maxLength = headers[index].length;
        data.summary.forEach(row => {
            const values = [
                '', row.giangVien, row.maKhoa,
                row.soTietGiangDay, row.soTietNgoaiQC, row.soTietKTHP, row.soTietDoAn,
                row.soTietThucHien, row.soTietNCKH, row.dinhMucNCKH, row.soTietThieuNCKH,
                row.soTietDinhMuc, row.phanTramMienGiam, row.soTietVuotGio
            ];
            const cellValue = values[index]?.toString() || '';
            if (cellValue.length > maxLength) {
                maxLength = cellValue.length;
            }
        });
        column.width = maxLength + 2;
    });
}

/**
 * Tạo sheet chi tiết giảng dạy
 */
async function createGiangDayDetailSheet(workbook, data, NamHoc) {
    const sheet = workbook.addWorksheet('Chi tiết giảng dạy');

    // Tiêu đề
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `CHI TIẾT GIẢNG DẠY - NĂM HỌC ${NamHoc}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = ['STT', 'Giảng viên', 'Học kỳ', 'Tên HP', 'Mã HP', 'Lớp', 'Sĩ số', 'Số tiết', 'Quy chuẩn', 'Khoa'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5B9BD5' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Data
    data.forEach((row, index) => {
        const dataRow = sheet.addRow([
            index + 1,
            row.GiangVien,
            row.HocKy,
            row.TenHP,
            row.MaHP,
            row.MaLop || row.Lop,
            row.SiSo,
            row.SoTiet,
            row.QuyChuan,
            row.Khoa
        ]);
        dataRow.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Auto width
    sheet.columns.forEach((column, index) => {
        column.width = Math.max(headers[index].length + 2, 12);
    });
}

/**
 * Tạo sheet lớp ngoài quy chuẩn
 */
async function createLopNgoaiQCSheet(workbook, data, NamHoc) {
    const sheet = workbook.addWorksheet('Lớp ngoài QC');

    // Tiêu đề
    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `LỚP NGOÀI QUY CHUẨN - NĂM HỌC ${NamHoc}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = ['STT', 'Giảng viên', 'Học kỳ', 'Tên HP', 'Mã HP', 'Số TC', 'Lớp', 'Sĩ số', 'Số tiết', 'Quy chuẩn', 'Ghi chú'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFED7D31' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Data
    data.forEach((row, index) => {
        const dataRow = sheet.addRow([
            index + 1,
            row.GiangVien,
            row.HocKy,
            row.TenHP,
            row.MaHP,
            row.SoTC,
            row.Lop,
            row.SiSo,
            row.SoTiet,
            row.QuyChuan,
            row.GhiChu
        ]);
        dataRow.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Auto width
    sheet.columns.forEach((column, index) => {
        column.width = Math.max(headers[index].length + 2, 12);
    });
}

/**
 * Tạo sheet KTHP
 */
async function createKTHPSheet(workbook, data, NamHoc) {
    const sheet = workbook.addWorksheet('Kết thúc HP');

    // Tiêu đề
    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `KẾT THÚC HỌC PHẦN - NĂM HỌC ${NamHoc}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = ['STT', 'Giảng viên', 'Học kỳ', 'Tên HP', 'Mã HP', 'Lớp', 'Sĩ số', 'Loại KTHP', 'Số tiết', 'Khoa', 'Ghi chú'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF70AD47' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Data
    data.forEach((row, index) => {
        const dataRow = sheet.addRow([
            index + 1,
            row.GiangVien,
            row.HocKy,
            row.TenHP,
            row.MaHP,
            row.Lop,
            row.SiSo,
            row.LoaiKTHP,
            row.SoTiet,
            row.MaKhoa,
            row.GhiChu
        ]);
        dataRow.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Auto width
    sheet.columns.forEach((column, index) => {
        column.width = Math.max(headers[index].length + 2, 12);
    });
}

/**
 * Tạo sheet Đồ án
 */
async function createDoAnSheet(workbook, data, NamHoc) {
    const sheet = workbook.addWorksheet('Đồ án');

    // Tiêu đề
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `HƯỚNG DẪN ĐỒ ÁN TỐT NGHIỆP - NĂM HỌC ${NamHoc}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = ['STT', 'Giảng viên', 'Tên sinh viên', 'Mã SV', 'Tên đồ án', 'Số tiết', 'Khoa', 'Ghi chú'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF7030A0' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Data
    data.forEach((row, index) => {
        const dataRow = sheet.addRow([
            index + 1,
            row.GiangVien,
            row.TenSinhVien || row.HoTen,
            row.MaSV || row.MaSinhVien,
            row.TenDoAn || row.TenDeTai,
            row.SoTiet,
            row.MaPhongBan || row.Khoa,
            row.GhiChu || ''
        ]);
        dataRow.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Auto width
    sheet.columns.forEach((column, index) => {
        column.width = Math.max(headers[index].length + 2, 15);
    });
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    renderPage,
    exportExcel
};
