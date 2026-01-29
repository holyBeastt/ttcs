/**
 * NCKH Mappers
 * Validate và transform data cho từng loại NCKH
 * Date: 2026-01-22
 * 
 * Architecture:
 * - validateInput: Validate dữ liệu từ FE form
 * - mapFormToRecord: Transform FE data → DB record
 * - mapRecordToDisplay: Transform DB record → FE display
 */

// =====================================================
// TYPE HANDLERS - Validate & Transform cho từng loại NCKH
// =====================================================

const typeHandlers = {
    // =====================================================
    // ĐỀ TÀI DỰ ÁN
    // =====================================================
    DETAI_DUAN: {
        displayName: 'Đề tài, dự án',
        hourCalculation: 'standard',

        validateInput: (data) => {
            if (!data.phanLoai && !data.capDeTai) {
                throw new Error('Thiếu cấp đề tài');
            }
            if (!data.tacGiaChinh && !data.chuNhiem) {
                throw new Error('Thiếu chủ nhiệm đề tài');
            }
            if (!data.tenCongTrinh && !data.tenDeTai) {
                throw new Error('Thiếu tên đề tài');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.capDeTai || data.phanLoai,
            tenCongTrinh: data.tenDeTai || data.tenCongTrinh,
            maSo: data.maDeTai || data.maSo,
            tacGiaChinh: data.chuNhiem || data.tacGiaChinh,
            danhSachThanhVien: Array.isArray(data.thanhVien) ? data.thanhVien.join(', ') : data.thanhVien,
            tongSoTacGia: parseInt(data.tongSoTacGia) || 0,
            tongSoThanhVien: parseInt(data.tongSoThanhVien) || 0,
            ngayNghiemThu: data.ngayNghiemThu,
            ketQua: data.ketQua,
            khoa: data.khoa,
            soNamThucHien: parseInt(data.soNamThucHien) || 1,
            soDongTacGia: parseInt(data.soDongChuNhiem) || parseInt(data.soDongTacGia) || 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            CapDeTai: record.PhanLoai,
            TenDeTai: record.TenCongTrinh,
            MaSoDeTai: record.MaSo,
            ChuNhiem: record.TacGiaChinh,
            DanhSachThanhVien: record.DanhSachThanhVien,
            NgayNghiemThu: record.NgayNghiemThu,
            KetQua: record.KetQua,
            Khoa: record.Khoa,
            SoNamThucHien: record.SoNamThucHien,
            SoDongChuNhiem: record.SoDongTacGia,
            TongSoTacGia: record.TongSoTacGia,
            TongSoThanhVien: record.TongSoThanhVien,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    },

    // =====================================================
    // BÀI BÁO KHOA HỌC
    // =====================================================
    BAIBAO: {
        displayName: 'Bài báo khoa học',
        hourCalculation: 'standard',

        validateInput: (data) => {
            if (!data.phanLoai && !data.loaiTapChi) {
                throw new Error('Thiếu loại tạp chí');
            }
            if (!data.tacGiaChinh || (Array.isArray(data.tacGiaChinh) && data.tacGiaChinh.length === 0)) {
                throw new Error('Thiếu tác giả');
            }
            if (!data.tenCongTrinh && !data.tenBaiBao) {
                throw new Error('Thiếu tên bài báo');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.loaiTapChi || data.phanLoai,
            tenCongTrinh: data.tenBaiBao || data.tenCongTrinh,
            maSo: data.chiSoTapChi || data.maSoBaiBao || data.maSo,
            tacGiaChinh: Array.isArray(data.tacGiaChinh) ? data.tacGiaChinh.join(', ') : data.tacGiaChinh,
            danhSachThanhVien: Array.isArray(data.thanhVien) ? data.thanhVien.join(', ') : data.thanhVien,
            tongSoTacGia: parseInt(data.tongSoTacGia) || 0,
            tongSoThanhVien: parseInt(data.tongSoThanhVien) || 0,
            ngayNghiemThu: data.ngayNghiemThu,
            khoa: data.khoa,
            soNamThucHien: parseInt(data.soNamThucHien) || 1,
            soDongTacGia: Array.isArray(data.tacGiaChinh) ? data.tacGiaChinh.length : 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            LoaiTapChi: record.PhanLoai,
            TenBaiBao: record.TenCongTrinh,
            MaSoBaiBao: record.MaSo,
            TacGia: record.TacGiaChinh,
            DanhSachThanhVien: record.DanhSachThanhVien,
            NgayNghiemThu: record.NgayNghiemThu,
            Khoa: record.Khoa,
            SoNamThucHien: record.SoNamThucHien,
            TongSoTacGia: record.TongSoTacGia,
            TongSoThanhVien: record.TongSoThanhVien,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    },

    // =====================================================
    // SÁCH GIÁO TRÌNH
    // =====================================================
    SACHGIAOTRINH: {
        displayName: 'Sách và giáo trình',
        hourCalculation: 'standard',

        validateInput: (data) => {
            if (!data.phanLoai) {
                throw new Error('Thiếu loại sách');
            }
            if (!data.tacGiaChinh || (Array.isArray(data.tacGiaChinh) && data.tacGiaChinh.length === 0)) {
                throw new Error('Thiếu tác giả');
            }
            if (!data.tenSachGiaoTrinh) {
                throw new Error('Thiếu tên sách');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.phanLoai,
            tenCongTrinh: data.tenSachGiaoTrinh,
            maSo: data.soXuatBan,
            tacGiaChinh: Array.isArray(data.tacGiaChinh) ? data.tacGiaChinh.join(', ') : data.tacGiaChinh,
            danhSachThanhVien: Array.isArray(data.thanhVien) ? data.thanhVien.join(', ') : data.thanhVien,
            tongSoTacGia: parseInt(data.tongSoTacGia) || 0,
            tongSoThanhVien: parseInt(data.tongSoThanhVien) || 0,
            ngayNghiemThu: data.ngayNghiemThu,
            ketQua: data.ketQua,
            khoa: data.khoa,
            soNamThucHien: parseInt(data.soNamThucHien) || 1,
            soDongTacGia: Array.isArray(data.tacGiaChinh) ? data.tacGiaChinh.length : 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            PhanLoai: record.PhanLoai,
            TenSachGiaoTrinh: record.TenCongTrinh,
            SoXuatBan: record.MaSo,
            TacGiaChinh: record.TacGiaChinh,
            ThanhVien: record.DanhSachThanhVien,
            NgayNghiemThu: record.NgayNghiemThu,
            KetQua: record.KetQua,
            Khoa: record.Khoa,
            SoNamThucHien: record.SoNamThucHien,
            TongSoTacGia: record.TongSoTacGia,
            TongSoThanhVien: record.TongSoThanhVien,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    },

    // =====================================================
    // GIẢI THƯỞNG VÀ BẰNG SÁNG CHẾ
    // =====================================================
    GIAITHUONG: {
        displayName: 'Bằng sáng chế, giải thưởng',
        hourCalculation: 'standard',

        validateInput: (data) => {
            if (!data.phanLoai && !data.loaiGiaiThuong) {
                throw new Error('Thiếu loại giải thưởng');
            }
            if (!data.tacGiaChinh && !data.tacGia) {
                throw new Error('Thiếu tác giả');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.loaiGiaiThuong || data.loaiBangSangCheVaGiaiThuong || data.phanLoai,
            tenCongTrinh: data.tenGiaiThuong || data.tenBangSangCheVaGiaiThuong || data.tenCongTrinh,
            maSo: data.maSoBangSangChe || data.maSo,
            tacGiaChinh: data.tacGia || data.tacGiaChinh,
            danhSachThanhVien: Array.isArray(data.thanhVien) ? data.thanhVien.join(', ') : data.thanhVien,
            tongSoTacGia: parseInt(data.tongSoTacGia) || 0,
            tongSoThanhVien: parseInt(data.tongSoThanhVien) || 0,
            ngayNghiemThu: data.ngayNghiemThu,
            ngayQuyetDinh: data.ngayQuyetDinh,
            khoa: data.khoa,
            soNamThucHien: parseInt(data.soNamThucHien) || 1,
            soDongTacGia: parseInt(data.soDongTacGia) || 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            LoaiBangSangCheVaGiaiThuong: record.PhanLoai,
            TenBangSangCheVaGiaiThuong: record.TenCongTrinh,
            MaSoBangSangChe: record.MaSo,
            TacGia: record.TacGiaChinh,
            DanhSachThanhVien: record.DanhSachThanhVien,
            NgayNghiemThu: record.NgayNghiemThu,
            NgayQuyetDinh: record.NgayQuyetDinh,
            Khoa: record.Khoa,
            SoNamThucHien: record.SoNamThucHien,
            TongSoTacGia: record.TongSoTacGia,
            TongSoThanhVien: record.TongSoThanhVien,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    },

    // =====================================================
    // SÁNG KIẾN
    // =====================================================
    SANGKIEN: {
        displayName: 'Sáng kiến',
        hourCalculation: 'standard',

        validateInput: (data) => {
            if (!data.phanLoai && !data.loaiSangKien) {
                throw new Error('Thiếu loại sáng kiến');
            }
            if (!data.tacGiaChinh) {
                throw new Error('Thiếu tác giả chính');
            }
            if (!data.tenCongTrinh && !data.tenSangKien) {
                throw new Error('Thiếu tên sáng kiến');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.loaiSangKien || data.phanLoai,
            tenCongTrinh: data.tenSangKien || data.tenCongTrinh,
            maSo: null,
            tacGiaChinh: data.tacGiaChinh,
            danhSachThanhVien: Array.isArray(data.thanhVien) ? data.thanhVien.join(', ') : data.thanhVien,
            tongSoTacGia: parseInt(data.tongSoTacGia) || 0,
            tongSoThanhVien: parseInt(data.tongSoThanhVien) || 0,
            ngayNghiemThu: data.ngayNghiemThu,
            ketQua: data.ketQua,
            khoa: data.khoa,
            soNamThucHien: parseInt(data.soNamThucHien) || 1,
            soDongTacGia: 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            LoaiSangKien: record.PhanLoai,
            TenSangKien: record.TenCongTrinh,
            TacGiaChinh: record.TacGiaChinh,
            DanhSachThanhVien: record.DanhSachThanhVien,
            NgayNghiemThu: record.NgayNghiemThu,
            KetQua: record.KetQua,
            Khoa: record.Khoa,
            SoNamThucHien: record.SoNamThucHien,
            TongSoTacGia: record.TongSoTacGia,
            TongSoThanhVien: record.TongSoThanhVien,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    },

    // =====================================================
    // ĐỀ XUẤT NGHIÊN CỨU
    // =====================================================
    DEXUAT: {
        displayName: 'Đề xuất nghiên cứu',
        hourCalculation: 'equal',

        validateInput: (data) => {
            if (!data.phanLoai && !data.capDeXuat) {
                throw new Error('Thiếu cấp đề xuất');
            }
            if (!data.tenCongTrinh && !data.tenDeXuat) {
                throw new Error('Thiếu tên đề xuất');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.capDeXuat || data.phanLoai,
            tenCongTrinh: data.tenDeXuat || data.tenCongTrinh,
            maSo: null,
            tacGiaChinh: data.tacGiaChinh || data.danhSachThanhVien || '',
            danhSachThanhVien: Array.isArray(data.thanhVien) ? data.thanhVien.join(', ') : data.thanhVien,
            tongSoTacGia: parseInt(data.tongSoTacGia) || 0,
            tongSoThanhVien: parseInt(data.tongSoThanhVien) || 0,
            ngayNghiemThu: data.ngayNghiemThu,
            ketQua: data.ketQua,
            khoa: data.khoa,
            soNamThucHien: 1,
            soDongTacGia: 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            CapDeXuat: record.PhanLoai,
            TenDeXuat: record.TenCongTrinh,
            TacGiaChinh: record.TacGiaChinh,
            DanhSachThanhVien: record.DanhSachThanhVien,
            NgayNghiemThu: record.NgayNghiemThu,
            KetQua: record.KetQua,
            Khoa: record.Khoa,
            TongSoTacGia: record.TongSoTacGia,
            TongSoThanhVien: record.TongSoThanhVien,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    },

    // =====================================================
    // HƯỚNG DẪN SV NCKH
    // =====================================================
    HUONGDAN: {
        displayName: 'Hướng dẫn SV NCKH',
        hourCalculation: 'equal',

        validateInput: (data) => {
            if (!data.phanLoai && !data.loaiHuongDan) {
                throw new Error('Thiếu loại hướng dẫn');
            }
            if (!data.tenCongTrinh && !data.tenDeTai) {
                throw new Error('Thiếu tên đề tài');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.loaiHuongDan || data.phanLoai,
            tenCongTrinh: data.tenDeTai || data.tenCongTrinh,
            maSo: null,
            tacGiaChinh: data.huongDanChinh || data.danhSachThanhVien || '',
            danhSachThanhVien: Array.isArray(data.thanhVien) ? data.thanhVien.join(', ') : data.thanhVien,
            tongSoTacGia: parseInt(data.tongSoTacGia) || 0,
            tongSoThanhVien: parseInt(data.tongSoThanhVien) || 0,
            ngayNghiemThu: data.ngayNghiemThu,
            ketQua: data.ketQua,
            khoa: data.khoa,
            soNamThucHien: 1,
            soDongTacGia: 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            LoaiHuongDan: record.PhanLoai,
            TenDeTai: record.TenCongTrinh,
            HuongDanChinh: record.TacGiaChinh,
            DanhSachThanhVien: record.DanhSachThanhVien,
            NgayNghiemThu: record.NgayNghiemThu,
            KetQua: record.KetQua,
            Khoa: record.Khoa,
            TongSoTacGia: record.TongSoTacGia,
            TongSoThanhVien: record.TongSoThanhVien,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    },

    // =====================================================
    // THÀNH VIÊN HỘI ĐỒNG
    // =====================================================
    HOIDONG: {
        displayName: 'Thành viên hội đồng',
        hourCalculation: 'fixed',

        validateInput: (data) => {
            if (!data.phanLoai && !data.loaiHoiDong) {
                throw new Error('Thiếu loại hội đồng');
            }
            if (!data.tacGiaChinh && !data.thanhVien) {
                throw new Error('Thiếu thành viên');
            }
            return true;
        },

        mapFormToRecord: (data) => ({
            phanLoai: data.loaiHoiDong || data.phanLoai,
            tenCongTrinh: data.tenDeTai || data.tenCongTrinh || '',
            maSo: null,
            tacGiaChinh: data.thanhVien || data.tacGiaChinh,
            danhSachThanhVien: null,
            tongSoTacGia: 1,
            tongSoThanhVien: 0,
            ngayNghiemThu: null,
            ketQua: null,
            khoa: data.khoa,
            soNamThucHien: 1,
            soDongTacGia: 1,
            namHoc: data.namHoc
        }),

        mapRecordToDisplay: (record) => ({
            ID: record.ID,
            LoaiHoiDong: record.PhanLoai,
            TenDeTai: record.TenCongTrinh,
            ThanhVien: record.TacGiaChinh,
            Khoa: record.Khoa,
            SoTiet: record.SoDongTacGia,
            KhoaDuyet: record.KhoaDuyet,
            DaoTaoDuyet: record.DaoTaoDuyet,
            NamHoc: record.NamHoc,
            CreatedAt: record.CreatedAt
        })
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Lấy handler cho một loại NCKH
 * @param {string} loaiNCKH - Loại NCKH
 * @returns {Object} Handler object
 */
const getHandler = (loaiNCKH) => {
    const handler = typeHandlers[loaiNCKH];
    if (!handler) {
        throw new Error(`Không tìm thấy handler cho loại NCKH: ${loaiNCKH}`);
    }
    return handler;
};

/**
 * Tính số tiết theo loại NCKH
 * Sử dụng công thức từ nckhV2Service
 * @param {string} loaiNCKH - Loại NCKH
 * @param {number} T - Số tiết chuẩn
 * @param {number} tongSoNguoi - Tổng số người
 * @param {number} soDongTacGia - Số đồng tác giả chính
 * @param {number} soNamThucHien - Số năm thực hiện
 * @param {Object} nckhService - Service chứa công thức tính (injection)
 * @returns {Object} { tacGiaChinh, thanhVien }
 */
const calculateHours = (loaiNCKH, T, tongSoNguoi, soDongTacGia = 1, soNamThucHien = 1, nckhService) => {
    const handler = getHandler(loaiNCKH);

    switch (handler.hourCalculation) {
        case 'standard':
            return nckhService.quyDoiSoTietV2(T, tongSoNguoi, soDongTacGia, soNamThucHien);

        case 'equal':
            const moiNguoi = nckhService.quyDoiSoTietChiaDeu(T, tongSoNguoi, soNamThucHien);
            return { tacGiaChinh: moiNguoi, thanhVien: moiNguoi };

        case 'fixed':
            const tiet = nckhService.quyDoiSoTietCoDinh(T);
            return { tacGiaChinh: tiet, thanhVien: 0 };

        default:
            return nckhService.quyDoiSoTietV2(T, tongSoNguoi, soDongTacGia, soNamThucHien);
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    typeHandlers,
    getHandler,
    calculateHours,

    // Export từng handler riêng nếu cần
    DETAI_DUAN: typeHandlers.DETAI_DUAN,
    BAIBAO: typeHandlers.BAIBAO,
    SACHGIAOTRINH: typeHandlers.SACHGIAOTRINH,
    GIAITHUONG: typeHandlers.GIAITHUONG,
    SANGKIEN: typeHandlers.SANGKIEN,
    DEXUAT: typeHandlers.DEXUAT,
    HUONGDAN: typeHandlers.HUONGDAN,
    HOIDONG: typeHandlers.HOIDONG
};
