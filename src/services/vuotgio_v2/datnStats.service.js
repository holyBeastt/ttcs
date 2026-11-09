/**
 * VUOT GIO V2 - Đồ án / Luận án tính vượt giờ Service
 * Date: 2026-11-09
 */

"use strict";

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/datnStats.repo");

const withConnection = async (callback) => {
    const connection = await createPoolConnection();
    try {
        return await callback(connection);
    } finally {
        if (connection) connection.release();
    }
};

const loadPhongBanMap = async (connection) => {
    const pbMap = new Map();
    try {
        const [pbRows] = await connection.query("SELECT MaPhongBan, TenPhongBan FROM phongban");
        (pbRows || []).forEach((r) => {
            if (r.MaPhongBan) {
                const code = r.MaPhongBan.trim();
                const name = (r.TenPhongBan || "").trim();
                pbMap.set(code, name);
                pbMap.set(code.toUpperCase(), name);
            }
        });
    } catch (e) {
        console.error("[datnStats.service] Error loading phongban:", e);
    }
    return pbMap;
};

const getKhoaDisplayName = (facCode, pbMap) => {
    if (!facCode) return "Không xác định";
    const code = facCode.trim();
    const deptFullName = pbMap.get(code) || pbMap.get(code.toUpperCase()) || code;
    const hasDept = pbMap.has(code) || pbMap.has(code.toUpperCase());
    return hasDept && deptFullName.toUpperCase() !== code.toUpperCase()
        ? `${deptFullName} (${code})`
        : (deptFullName || code);
};

const resolveFacultyCode = (row, pbMap) => {
    let code = (row.MaPhongBan || row.Khoa || row.khoa || "").trim();

    // Nếu code là tên phòng ban có trong pbMap (case-insensitive)
    if (code) {
        for (const [c, name] of pbMap.entries()) {
            if (name.toLowerCase() === code.toLowerCase()) {
                return c;
            }
        }
    }

    // Nếu code không có trong pbMap, kiểm tra tiền tố mã SV / lớp
    const isKnownDept = code && (pbMap.has(code) || pbMap.has(code.toUpperCase()));
    if (!isKnownDept) {
        const prefix = (code || row.MaSV || row.KhoaDaoTao || row.KhoaSV || "").toUpperCase().trim();
        if (prefix.startsWith("AT")) code = "ATTT";
        else if (prefix.startsWith("CT")) code = "CNTT";
        else if (prefix.startsWith("DT")) code = "ĐTVM";
    }

    return code || "Không xác định";
};

const resolveFacultyName = (row, pbMap) => {
    const explicitNganh = (row.Nganh || row.nganh || "").trim();
    if (explicitNganh && explicitNganh !== "-") {
        const mappedFromCode = pbMap.get(explicitNganh) || pbMap.get(explicitNganh.toUpperCase());
        if (mappedFromCode) {
            return mappedFromCode;
        }
        return explicitNganh;
    }
    const code = resolveFacultyCode(row, pbMap);
    if (code && code !== "Không xác định") {
        const name = pbMap.get(code) || pbMap.get(code.toUpperCase());
        if (name) return name;
        return code;
    }
    return "";
};

const getFilters = async () => withConnection(async (connection) => {
    return await repo.buildDistinctFilterValues(connection);
});

/**
 * 1. Tổng hợp theo Giảng viên (Phân nhóm theo từng Giảng viên kèm danh sách sinh viên)
 */
const getLecturerSummary = async (filters = {}) => withConnection(async (connection) => {
    const pbMap = await loadPhongBanMap(connection);
    const rawRows = await repo.getRawDoAnRecords(connection, filters);

    const lecturerMap = new Map();
    const allLecturersSet = new Set();
    let grandTotalHours = 0;
    let grandTotalProjects = 0;

    rawRows.forEach((row) => {
        const facCode = resolveFacultyCode(row, pbMap);
        const facDisplayName = getKhoaDisplayName(facCode, pbMap);
        const facultyName = resolveFacultyName(row, pbMap);
        const teacherName = (row.GiangVien || "Không rõ").trim();
        const hours = parseFloat(row.SoTiet) || 0;

        grandTotalHours += hours;
        grandTotalProjects += 1;
        if (teacherName) allLecturersSet.add(teacherName);

        const teacherKey = `${row.id_User || 0}__${teacherName}`;

        if (!lecturerMap.has(teacherKey)) {
            lecturerMap.set(teacherKey, {
                idUser: row.id_User || null,
                giangVien: teacherName,
                khoa: facCode,
                khoaDisplayName: facDisplayName,
                soDoAn: 0,
                tongSoTiet: 0,
                projects: []
            });
        }

        const teacher = lecturerMap.get(teacherKey);
        teacher.soDoAn += 1;
        teacher.tongSoTiet += hours;
        teacher.projects.push({
            id: row.ID,
            sinhVien: (row.SinhVien || "").trim(),
            maSV: (row.MaSV || "").trim(),
            khoaSV: (row.KhoaSV || row.KhoaDaoTao || "").trim(),
            khoa: facCode,
            khoaTen: facultyName,
            nganh: facultyName,
            tenDeTai: (row.TenDeTai || "").trim(),
            soTiet: hours,
            ngayBatDau: row.NgayBatDau || null,
            ngayKetThuc: row.NgayKetThuc || null,
            isHDChinh: row.isHDChinh === 1,
            loaiHuongDan: row.isHDChinh === 1 ? "HD Chính" : "HD Phụ",
            heDaoTao: row.ten_he_dao_tao || row.he_dao_tao || "",
            dot: row.Dot || "",
            ki: row.Ki || "",
            namHoc: row.NamHoc || ""
        });
    });

    // Sắp xếp sinh viên trong mỗi giảng viên theo LỚP (khoaSV), sau đó theo TÊN SINH VIÊN
    lecturerMap.forEach((teacher) => {
        teacher.projects.sort((a, b) => {
            const classA = a.khoaSV || "";
            const classB = b.khoaSV || "";
            const cmpClass = classA.localeCompare(classB, "vi", { numeric: true });
            if (cmpClass !== 0) return cmpClass;
            return (a.sinhVien || "").localeCompare(b.sinhVien || "", "vi");
        });
    });

    // Sắp xếp giảng viên theo KHOA, trong cùng một khoa sắp xếp theo TÊN GIẢNG VIÊN (A-Z)
    const rows = Array.from(lecturerMap.values())
        .map((t) => ({
            ...t,
            tongSoTiet: parseFloat(t.tongSoTiet.toFixed(2))
        }))
        .sort((a, b) => {
            const khoaA = a.khoaDisplayName || a.khoa || "";
            const khoaB = b.khoaDisplayName || b.khoa || "";
            const cmpKhoa = khoaA.localeCompare(khoaB, "vi");
            if (cmpKhoa !== 0) return cmpKhoa;
            return (a.giangVien || "").localeCompare(b.giangVien || "", "vi");
        });

    return {
        summary: {
            totalTeachers: allLecturersSet.size,
            totalStudents: grandTotalProjects,
            totalProjects: grandTotalProjects,
            totalHours: parseFloat(grandTotalHours.toFixed(2))
        },
        rows
    };
});

/**
 * Chi tiết các đồ án của một Giảng viên
 */
const getLecturerRecords = async (params = {}) => withConnection(async (connection) => {
    const pbMap = await loadPhongBanMap(connection);
    const rawRows = await repo.getRawDoAnRecords(connection, params);
    const tongSoTiet = rawRows.reduce((sum, r) => sum + (parseFloat(r.SoTiet) || 0), 0);

    const rows = rawRows.map((r, index) => {
        const facCode = resolveFacultyCode(r, pbMap);
        const facultyName = resolveFacultyName(r, pbMap);
        return {
            stt: index + 1,
            id: r.ID,
            sinhVien: (r.SinhVien || "").trim(),
            maSV: (r.MaSV || "").trim(),
            khoaSV: (r.KhoaSV || r.KhoaDaoTao || "").trim(),
            khoa: facCode,
            khoaTen: facultyName,
            nganh: facultyName,
            tenDeTai: (r.TenDeTai || "").trim(),
            soTiet: parseFloat((parseFloat(r.SoTiet) || 0).toFixed(2)),
            ngayBatDau: r.NgayBatDau || null,
            ngayKetThuc: r.NgayKetThuc || null,
            soNguoi: r.SoNguoi || 1,
            isHDChinh: r.isHDChinh === 1,
            loaiHuongDan: r.isHDChinh === 1 ? "HD Chính" : "HD Phụ",
            heDaoTao: r.ten_he_dao_tao || r.he_dao_tao || "",
            dot: r.Dot || "",
            ki: r.Ki || "",
            namHoc: r.NamHoc || ""
        };
    });

    // Sắp xếp theo Lớp (khoaSV), sau đó theo tên sinh viên
    rows.sort((a, b) => {
        const classA = a.khoaSV || "";
        const classB = b.khoaSV || "";
        const cmpClass = classA.localeCompare(classB, "vi", { numeric: true });
        if (cmpClass !== 0) return cmpClass;
        return (a.sinhVien || "").localeCompare(b.sinhVien || "", "vi");
    });

    // Đánh lại STT sau khi sắp xếp
    rows.forEach((r, idx) => {
        r.stt = idx + 1;
    });

    return {
        giangVien: params.lecturerName || params.lecturerId || (rawRows[0] ? rawRows[0].GiangVien : ""),
        tongSoTiet: parseFloat(tongSoTiet.toFixed(2)),
        tongSoDoAn: rawRows.length,
        tongSinhVien: rawRows.length,
        rows
    };
});

/**
 * 2. Tổng hợp theo Khoa / Phòng ban
 */
const getDepartmentSummary = async (filters = {}) => withConnection(async (connection) => {
    const pbMap = await loadPhongBanMap(connection);
    const rawRows = await repo.getRawDoAnRecords(connection, filters);

    const deptMap = new Map();
    let totalHours = 0;
    let totalProjects = 0;
    const allLecturersSet = new Set();

    rawRows.forEach((row) => {
        const deptKey = resolveFacultyCode(row, pbMap);
        const facDisplayName = getKhoaDisplayName(deptKey, pbMap);
        const facultyName = resolveFacultyName(row, pbMap);
        const teacherName = (row.GiangVien || "Không rõ").trim();
        const hours = parseFloat(row.SoTiet) || 0;

        totalHours += hours;
        totalProjects += 1;
        if (teacherName) allLecturersSet.add(teacherName);

        if (!deptMap.has(deptKey)) {
            deptMap.set(deptKey, {
                khoa: deptKey,
                khoaDisplayName: facDisplayName,
                lecturersSet: new Set(),
                soDoAn: 0,
                soSinhVien: 0,
                tongSoTiet: 0,
                projects: []
            });
        }

        const dept = deptMap.get(deptKey);
        if (teacherName) dept.lecturersSet.add(teacherName);
        dept.soDoAn += 1;
        dept.soSinhVien += 1;
        dept.tongSoTiet += hours;
        dept.projects.push({
            id: row.ID,
            giangVien: teacherName,
            sinhVien: (row.SinhVien || "").trim(),
            maSV: (row.MaSV || "").trim(),
            khoaSV: (row.KhoaSV || row.KhoaDaoTao || "").trim(),
            khoa: deptKey,
            khoaTen: facultyName,
            nganh: facultyName,
            tenDeTai: (row.TenDeTai || "").trim(),
            soTiet: parseFloat(hours.toFixed(2)),
            ngayBatDau: row.NgayBatDau || null,
            ngayKetThuc: row.NgayKetThuc || null,
            isHDChinh: row.isHDChinh === 1,
            loaiHuongDan: row.isHDChinh === 1 ? "HD Chính" : "HD Phụ",
            heDaoTao: row.ten_he_dao_tao || row.he_dao_tao || "",
            dot: row.Dot || "",
            ki: row.Ki || "",
            namHoc: row.NamHoc || ""
        });
    });

    // Sắp xếp sinh viên trong mỗi Khoa theo Giảng viên -> Lớp (khoaSV) -> Sinh viên
    deptMap.forEach((dept) => {
        dept.projects.sort((a, b) => {
            const cmpGV = (a.giangVien || "").localeCompare(b.giangVien || "", "vi");
            if (cmpGV !== 0) return cmpGV;
            const classA = a.khoaSV || "";
            const classB = b.khoaSV || "";
            const cmpClass = classA.localeCompare(classB, "vi", { numeric: true });
            if (cmpClass !== 0) return cmpClass;
            return (a.sinhVien || "").localeCompare(b.sinhVien || "", "vi");
        });
    });

    const rows = Array.from(deptMap.values())
        .map((d, index) => ({
            stt: index + 1,
            khoa: d.khoa,
            khoaDisplayName: d.khoaDisplayName,
            soGiangVien: d.lecturersSet.size,
            soDoAn: d.soDoAn,
            soSinhVien: d.soSinhVien,
            tongSoTiet: parseFloat(d.tongSoTiet.toFixed(2)),
            projects: d.projects
        }))
        .sort((a, b) => b.tongSoTiet - a.tongSoTiet || a.khoa.localeCompare(b.khoa, "vi"));

    rows.forEach((r, idx) => {
        r.stt = idx + 1;
    });

    return {
        summary: {
            totalDepartments: rows.length,
            totalTeachers: allLecturersSet.size,
            totalStudents: totalProjects,
            totalProjects,
            totalHours: parseFloat(totalHours.toFixed(2))
        },
        rows
    };
});

/**
 * 3. Tổng hợp toàn Học viện (Chi tiết toàn bộ đồ án)
 */
const getHocVienSummary = async (filters = {}) => withConnection(async (connection) => {
    const pbMap = await loadPhongBanMap(connection);
    const rawRows = await repo.getRawDoAnRecords(connection, filters);

    const totalHours = rawRows.reduce((sum, r) => sum + (parseFloat(r.SoTiet) || 0), 0);
    const teachersSet = new Set(rawRows.map((r) => r.GiangVien && r.GiangVien.trim()).filter(Boolean));

    const rows = rawRows.map((r, index) => {
        const facCode = resolveFacultyCode(r, pbMap);
        const facultyName = resolveFacultyName(r, pbMap);
        return {
            stt: index + 1,
            id: r.ID,
            giangVien: (r.GiangVien || "").trim(),
            khoa: facCode,
            khoaDisplayName: getKhoaDisplayName(facCode, pbMap),
            khoaTen: facultyName,
            sinhVien: (r.SinhVien || "").trim(),
            maSV: (r.MaSV || "").trim(),
            khoaSV: (r.KhoaSV || r.KhoaDaoTao || "").trim(),
            nganh: facultyName,
            tenDeTai: (r.TenDeTai || "").trim(),
            soTiet: parseFloat((parseFloat(r.SoTiet) || 0).toFixed(2)),
            ngayBatDau: r.NgayBatDau || null,
            ngayKetThuc: r.NgayKetThuc || null,
            isHDChinh: r.isHDChinh === 1,
            loaiHuongDan: r.isHDChinh === 1 ? "HD Chính" : "HD Phụ",
            heDaoTao: r.ten_he_dao_tao || r.he_dao_tao || "",
            dot: r.Dot || "",
            ki: r.Ki || "",
            namHoc: r.NamHoc || ""
        };
    });

    // Sắp xếp theo Khoa -> Giảng viên -> Lớp (khoaSV) -> Sinh viên
    rows.sort((a, b) => {
        const khoaA = a.khoaDisplayName || a.khoa || "";
        const khoaB = b.khoaDisplayName || b.khoa || "";
        const cmpKhoa = khoaA.localeCompare(khoaB, "vi");
        if (cmpKhoa !== 0) return cmpKhoa;
        const cmpGV = (a.giangVien || "").localeCompare(b.giangVien || "", "vi");
        if (cmpGV !== 0) return cmpGV;
        const classA = a.khoaSV || "";
        const classB = b.khoaSV || "";
        const cmpClass = classA.localeCompare(classB, "vi", { numeric: true });
        if (cmpClass !== 0) return cmpClass;
        return (a.sinhVien || "").localeCompare(b.sinhVien || "", "vi");
    });

    rows.forEach((r, idx) => {
        r.stt = idx + 1;
    });

    return {
        summary: {
            totalTeachers: teachersSet.size,
            totalStudents: rawRows.length,
            totalProjects: rawRows.length,
            totalHours: parseFloat(totalHours.toFixed(2))
        },
        rows
    };
});

module.exports = {
    getFilters,
    getLecturerSummary,
    getLecturerRecords,
    getDepartmentSummary,
    getHocVienSummary
};
