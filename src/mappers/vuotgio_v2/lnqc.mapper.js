/**
 * VUOT GIO V2 - LNQC Mapper
 * Chuyển đổi dữ liệu cho module Lớp Ngoài Quy Chuẩn
 */

const base = require("./base.mapper");

/**
 * Map từ Request Body sang Database Entity (v2 schema)
 */
const toEntity = (body) => {
    return {
        course_name: base.pick(body, "course_name", "TenLop", "LopHocPhan") || "",
        course_code: base.pick(body, "course_code", "MaHocPhan") || "",
        credit_hours: base.toInt(base.pick(body, "credit_hours", "SoTinChi"), 0),
        student_quantity: base.toInt(base.pick(body, "student_quantity", "SoSV"), 0),
        student_bonus: base.toDecimal(base.pick(body, "student_bonus", "HeSoLopDong"), 1),
        bonus_time: base.toDecimal(base.pick(body, "bonus_time", "HeSoT7CN"), 1),
        ll_code: base.toDecimal(base.pick(body, "ll_code", "SoTietCTDT"), 0),
        ll_total: base.toDecimal(base.pick(body, "ll_total", "LL"), 0),
        qc: base.toDecimal(base.pick(body, "qc", "QuyChuan", "quy_chuan"), 0),
        lecturer: base.pick(body, "lecturer", "GiangVien", "GiaoVienGiangDay") || "",
        major: base.pick(body, "major", "Khoa", "khoa") || "",
        he_dao_tao: base.pick(body, "he_dao_tao", "HeDaoTao") || "",
        dot: base.toInt(base.pick(body, "dot", "Dot"), 1),
        ki_hoc: base.toInt(base.pick(body, "ki_hoc", "KiHoc", "hoc_ky"), 1),
        nam_hoc: base.pick(body, "nam_hoc", "NamHoc", "nam_hoc") || "",
        note: base.pick(body, "note", "GhiChu", "ghi_chu") || "",
        course_id: base.pick(body, "course_id", "MaBoMon", "ma_bo_mon") || "",
        class_type: "ngoai_quy_chuan",
        da_luu: 0,
        start_date: base.pick(body, "start_date", "NgayBatDau") || null,
        end_date: base.pick(body, "end_date", "NgayKetThuc") || null,
    };
};

/**
 * Map từ Database Row sang DTO cho UI
 */
const toDTO = (row) => {
    if (!row) return null;
    return {
        id: row.id || row.ID,
        tenLop: row.course_name,
        maLop: row.course_code,
        soTinChi: row.credit_hours,
        soSV: row.student_quantity,
        heSoLopDong: row.student_bonus,
        heSoT7CN: row.bonus_time,
        soTietCTDT: row.ll_code,
        ll: row.ll_total,
        quyChuan: row.qc,
        giangVien: row.lecturer,
        khoa: row.major,
        heDaoTao: row.he_dao_tao,
        dot: row.dot,
        ki: row.ki_hoc,
        namHoc: row.nam_hoc,
        ghiChu: row.note,
        maBoMon: row.course_id,
        ngayBatDau: row.start_date,
        ngayKetThuc: row.end_date,
        khoaDuyet: row.khoa_duyet,
        daoTaoDuyet: row.dao_tao_duyet
    };
};

module.exports = {
    toEntity,
    toDTO
};
