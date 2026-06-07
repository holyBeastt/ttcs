const createPoolConnection = require("../../config/databasePool");
const giangDayRepo = require("../../repositories/vuotgioDuKien/giangDay.repo");

const transformGiangDayData = (data, gvmList, daDuyetHetArray, isMoiGiang) => {
    return data
        .filter(
            (item) =>
                item.TaiChinhDuyet != 0 &&
                item.DaLuu == 0 &&
                daDuyetHetArray.includes(item.Khoa)
        )
        .map((item) => {
            const {
                Khoa,
                SoTinChi,
                LopHocPhan,
                GiaoVienGiangDay,
                LL,
                SoTietCTDT,
                HeSoT7CN,
                SoSinhVien,
                HeSoLopDong,
                QuyChuan,
                KiHoc,
                NamHoc,
                TenLop,
                Dot,
                BoMon,
                he_dao_tao,
                isHdChinh,
                DoiTuong,
            } = item;

            const TenHocPhan = LopHocPhan;
            const gv1 = GiaoVienGiangDay ? GiaoVienGiangDay.split(" - ") : [];
            let gv = gv1[0];
            const maHocPhan = item.MaHocPhan || 0;

            let id_User = 1;
            let id_Gvm = 1;

            if (isMoiGiang) {
                if (gvmList) {
                    const found = gvmList.find((giangVien) => giangVien.HoTen === gv);
                    if (found) {
                        id_Gvm = found.id_Gvm;
                    }
                }
            } else {
                id_User = item.id_User;
                id_Gvm = item.id_Gvm;
                if (id_Gvm == 0 || id_Gvm == null || id_Gvm == undefined) {
                    id_Gvm = 1;
                }
            }

            return [
                gv,
                SoTinChi,
                TenHocPhan,
                id_User,
                id_Gvm,
                LL,
                SoTietCTDT,
                HeSoT7CN,
                SoSinhVien,
                HeSoLopDong,
                QuyChuan,
                KiHoc,
                NamHoc,
                maHocPhan,
                TenLop,
                Dot,
                Khoa,
                BoMon,
                he_dao_tao,
                isHdChinh,
                DoiTuong,
            ];
        });
};

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
    getGiangDayQuyChuan,
    transformGiangDayData
};
