const createPoolConnection = require("../../config/databasePool");
const giangDayRepo = require("../../repositories/vuotgioDuKien/giangDay.repo");

const getGiangDayQuyChuan = async (namHoc, khoaId, dot, kiHoc) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const rows = await giangDayRepo.getGiangDayQuyChuan(connection, namHoc, khoaId, dot, kiHoc);
        
        const groupedMap = new Map();
        rows.forEach((row) => {
            const gv = row.GiaoVienGiangDay || row.GiaoVien || '';
            const teacherKey = gv;
            if (!groupedMap.has(teacherKey)) {
                groupedMap.set(teacherKey, {
                    giangVien: gv,
                    khoa: row.Khoa,
                    tongSoTietKy: 0,
                    courses: [],
                });
            }

            const courseQuyChuan = parseFloat(row.QuyChuan) || 0;
            const teacher = groupedMap.get(teacherKey);
            teacher.tongSoTietKy += courseQuyChuan;
            teacher.courses.push({
                tenHocPhan: row.LopHocPhan,
                lop: row.TenLop,
                soTinChi: row.SoTinChi,
                dot: row.Dot,
                kiHoc: row.KiHoc,
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

        return { data: groupedData };
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getGiangDayQuyChuan
};
