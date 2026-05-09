/**
 * VUOT GIO V2 - KTHP Mapper
 * Chuyển đổi dữ liệu cho module Kết Thúc Học Phần (Coi chấm ra đề)
 */

const base = require("./base.mapper");

/**
 * Map từ Request Body sang Database Entity (v2 schema)
 */
const toEntity = (body) => {
    return {
        giang_vien: base.pick(body, "giang_vien", "giangvien", "hoVaTen") || "",
        khoa: base.pick(body, "khoa", "Khoa") || "",
        hoc_ky: base.toInt(base.pick(body, "hoc_ky", "ki", "HocKy"), 1),
        nam_hoc: base.pick(body, "nam_hoc", "namhoc", "NamHoc") || "",
        hinh_thuc: base.pick(body, "hinh_thuc", "hinhthuc", "HinhThuc", "Type", "loai") || "",
        ten_hoc_phan: base.pick(body, "ten_hoc_phan", "tenhocphan", "TenHocPhan") || "",
        lop_hoc_phan: base.pick(body, "lop_hoc_phan", "lophocphan", "LopHocPhan") || "",
        doi_tuong: base.pick(body, "doi_tuong", "doituong", "DoiTuong") || "",
        bai_cham_1: base.toInt(base.pick(body, "bai_cham_1", "baicham1", "BaiCham1", "soBaiCham1"), 0),
        bai_cham_2: base.toInt(base.pick(body, "bai_cham_2", "baicham2", "BaiCham2", "soBaiCham2"), 0),
        tong_so: base.toInt(base.pick(body, "tong_so", "tongso", "TongSo", "sosv", "soDe", "soCa", "tongSoBai"), 0),
        quy_chuan: base.toDecimal(base.pick(body, "quy_chuan", "sotietqc", "SoTietQC", "soTietQC"), 0),
        ghi_chu: base.pick(body, "ghi_chu", "ghichu", "GhiChu") || "",
        so_tc: base.toInt(base.pick(body, "so_tc", "sotc", "SoTC"), 0),
        so_sv: base.toInt(base.pick(body, "so_sv", "sosv", "SoSV"), 0),
    };
};

/**
 * Map từ Database Row sang DTO (Data Transfer Object) cho UI
 */
const toDTO = (row) => {
    if (!row) return null;
    return {
        id: row.id || row.ID,
        giangVien: row.giang_vien,
        khoa: row.khoa,
        hocKy: row.hoc_ky,
        namHoc: row.nam_hoc,
        hinhThuc: row.hinh_thuc,
        tenHocPhan: row.ten_hoc_phan,
        lopHocPhan: row.lop_hoc_phan,
        doiTuong: row.doi_tuong,
        baiCham1: row.bai_cham_1,
        baiCham2: row.bai_cham_2,
        tongSo: row.tong_so,
        quyChuan: row.quy_chuan,
        khoaDuyet: row.khoa_duyet,
        khaoThiDuyet: row.khao_thi_duyet,
        ghiChu: row.ghi_chu,
        soTinChi: row.so_tc,
        soSinhVien: row.so_sv
    };
};

module.exports = {
    toEntity,
    toDTO
};
