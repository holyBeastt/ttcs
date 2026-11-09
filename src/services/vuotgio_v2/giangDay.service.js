/**
 * VUOT GIO V2 - Giảng dạy (TKB) Service
 * Date: 2026-11-09
 */

"use strict";

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/giangDay.repo");

const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

const getFilters = async () => withConnection(null, async (connection) => {
    const filterData = await repo.getFilterOptions(connection);
    return {
        dot: ["ALL", ...(filterData.dotList || [])],
        ki: ["ALL", ...(filterData.kiList || [])],
        namHoc: ["ALL", ...(filterData.namHocList || [])],
        khoa: filterData.khoaList || [],
        heDaoTao: filterData.heDaoTaoList || [],
        ...filterData
    };
});

const getStatistics = async (filters) => withConnection(null, async (connection) => {
    // 1. Tải map tên đầy đủ của Khoa từ bảng phongban
    const pbMap = new Map();
    try {
        const [pbRows] = await connection.query(
            "SELECT MaPhongBan, TenPhongBan FROM phongban"
        );
        (pbRows || []).forEach((r) => {
            if (r.MaPhongBan) {
                const code = r.MaPhongBan.trim();
                const name = (r.TenPhongBan || "").trim();
                pbMap.set(code, name);
                pbMap.set(code.toUpperCase(), name);
            }
        });
    } catch (e) {
        console.error("[giangDay.service] Error loading phongban:", e);
    }

    const rows = await repo.getStatistics(connection, filters);

    // 2. Phân nhóm theo Khoa -> Giảng viên (Tab 1: Theo giảng viên)
    const facultyMap = new Map();
    const allTeachersSet = new Set();
    const hocVienRows = [];

    rows.forEach((row, index) => {
        const facCode = (row.Khoa || "Không xác định").trim();
        const deptFullName = pbMap.get(facCode) || pbMap.get(facCode.toUpperCase()) || facCode;
        const hasDept = pbMap.has(facCode) || pbMap.has(facCode.toUpperCase());
        const facDisplayName = hasDept && deptFullName.toUpperCase() !== facCode.toUpperCase()
            ? `${deptFullName} (${facCode})`
            : (deptFullName || facCode);
        const teacherName = row.GiangVien || "Không rõ";
        const courseQuyChuan = parseFloat(row.QuyChuan) || 0;

        if (row.GiangVien) allTeachersSet.add(row.GiangVien);

        if (!facultyMap.has(facCode)) {
            facultyMap.set(facCode, {
                khoa: facCode,
                maPhongBan: facCode,
                tenPhongBan: deptFullName,
                khoaDisplayName: facDisplayName,
                totalTeachers: 0,
                totalCourses: 0,
                totalQuyChuan: 0,
                teachersMap: new Map()
            });
        }

        const faculty = facultyMap.get(facCode);
        const teacherKey = `${row.id_User || 0}__${teacherName}`;

        if (!faculty.teachersMap.has(teacherKey)) {
            faculty.teachersMap.set(teacherKey, {
                idUser: row.id_User,
                giangVien: teacherName,
                khoa: facCode,
                khoaDisplayName: facDisplayName,
                tongSoTietKy: 0,
                courses: []
            });
        }

        const teacher = faculty.teachersMap.get(teacherKey);
        teacher.tongSoTietKy += courseQuyChuan;
        teacher.courses.push({
            tenHocPhan: row.TenHocPhan,
            lop: row.Lop,
            soTinChi: row.SoTC,
            dot: row.Dot,
            kiHoc: row.HocKy,
            namHoc: row.NamHoc,
            quyChuan: courseQuyChuan,
            khoa: facCode,
            khoaDisplayName: facDisplayName,
            heDaoTao: row.ten_he_dao_tao || row.he_dao_tao
        });

        // Hàng chi tiết cho Tab 3 (Theo học viện)
        hocVienRows.push({
            stt: index + 1,
            giangVien: teacherName,
            khoa: facCode,
            khoaDisplayName: facDisplayName,
            tenHocPhan: row.TenHocPhan || "",
            lop: row.Lop || "",
            soTinChi: row.SoTC ?? "",
            dot: row.Dot ?? "",
            kiHoc: row.HocKy ?? "",
            namHoc: row.NamHoc ?? "",
            quyChuan: parseFloat(courseQuyChuan.toFixed(2)),
            heDaoTao: row.ten_he_dao_tao || row.he_dao_tao || ""
        });
    });

    const flatTeachers = [];
    const facultyGroups = [];
    const deptSummary = [];
    let grandTotalHours = 0;
    let grandTotalCourses = 0;

    facultyMap.forEach((faculty, facCode) => {
        const teachersList = Array.from(faculty.teachersMap.values()).map((t) => ({
            ...t,
            tongSoTietKy: parseFloat(t.tongSoTietKy.toFixed(2))
        }));

        const facCourses = teachersList.reduce((sum, t) => sum + t.courses.length, 0);
        const facHours = teachersList.reduce((sum, t) => sum + t.tongSoTietKy, 0);

        faculty.totalTeachers = teachersList.length;
        faculty.soGiangVien = teachersList.length;
        faculty.totalCourses = facCourses;
        faculty.soLopHocPhan = facCourses;
        faculty.totalQuyChuan = parseFloat(facHours.toFixed(2));
        faculty.tongQuyChuan = parseFloat(facHours.toFixed(2));
        faculty.teachers = teachersList;
        delete faculty.teachersMap;

        facultyGroups.push(faculty);
        teachersList.forEach((t) => flatTeachers.push(t));

        // Tab 2: Tổng hợp theo khoa
        deptSummary.push({
            khoa: facCode,
            maPhongBan: facCode,
            tenPhongBan: faculty.tenPhongBan,
            khoaDisplayName: faculty.khoaDisplayName,
            soGiangVien: teachersList.length,
            totalTeachers: teachersList.length,
            soLopHocPhan: facCourses,
            totalCourses: facCourses,
            tongQuyChuan: parseFloat(facHours.toFixed(2)),
            totalQuyChuan: parseFloat(facHours.toFixed(2)),
            teachers: teachersList
        });

        grandTotalCourses += facCourses;
        grandTotalHours += facHours;
    });

    deptSummary.sort((a, b) => b.tongQuyChuan - a.tongQuyChuan || a.khoa.localeCompare(b.khoa, "vi"));

    return {
        data: flatTeachers,
        facultyGroups,
        deptSummary: deptSummary.map((d, i) => ({ stt: i + 1, ...d })),
        hocVienRows,
        summary: {
            totalFaculties: facultyGroups.length,
            totalTeachers: allTeachersSet.size,
            totalCourses: grandTotalCourses,
            totalQuyChuan: parseFloat(grandTotalHours.toFixed(2))
        }
    };
});

module.exports = {
    getFilters,
    getStatistics
};
