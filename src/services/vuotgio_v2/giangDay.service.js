/**
 * VUOT GIO V2 - Giảng dạy (TKB) Service
 */

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
    const dot = await repo.getDistinctValues(connection, "Dot");
    const ki = await repo.getDistinctValues(connection, "HocKy");
    const namHoc = await repo.getDistinctValues(connection, "NamHoc");
    const khoa = await repo.getDistinctValues(connection, "Khoa");
    const heDaoTao = await repo.getDistinctValues(connection, "he_dao_tao");

    return {
        dot: ["ALL", ...dot],
        ki: ["ALL", ...ki],
        namHoc: ["ALL", ...namHoc],
        khoa: ["ALL", ...khoa],
        heDaoTao: ["ALL", ...heDaoTao]
    };
});

const getStatistics = async (filters) => withConnection(null, async (connection) => {
    const rows = await repo.getStatistics(connection, filters);

    const groupedMap = new Map();
    rows.forEach((row) => {
        const teacherKey = `${row.id_User}__${row.GiangVien}`;
        if (!groupedMap.has(teacherKey)) {
            groupedMap.set(teacherKey, {
                idUser: row.id_User,
                giangVien: row.GiangVien,
                khoa: row.Khoa,
                tongSoTietKy: 0,
                courses: [],
            });
        }

        const courseQuyChuan = parseFloat(row.QuyChuan) || 0;
        const teacher = groupedMap.get(teacherKey);
        teacher.tongSoTietKy += courseQuyChuan;
        teacher.courses.push({
            tenHocPhan: row.TenHocPhan,
            lop: row.Lop,
            soTinChi: row.SoTC,
            dot: row.Dot,
            kiHoc: row.HocKy,
            namHoc: row.NamHoc,
            quyChuan: courseQuyChuan,
            khoa: row.Khoa,
            heDaoTao: row.he_dao_tao,
        });
    });

    const groupedData = Array.from(groupedMap.values()).map((teacher) => ({
        ...teacher,
        tongSoTietKy: parseFloat(teacher.tongSoTietKy.toFixed(2)),
    }));

    const totalQuyChuan = groupedData.reduce((sum, teacher) => sum + teacher.tongSoTietKy, 0);

    return {
        data: groupedData,
        summary: {
            totalTeachers: groupedData.length,
            totalCourses: rows.length,
            totalQuyChuan: parseFloat(totalQuyChuan.toFixed(2)),
        }
    };
});

module.exports = {
    getFilters,
    getStatistics
};
