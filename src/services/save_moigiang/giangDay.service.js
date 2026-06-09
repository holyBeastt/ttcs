/**
 * LƯU Ý KIẾN TRÚC QUAN TRỌNG:
 * Service này (và thư mục save_moigiang nói chung) ĐỘC QUYỀN phục vụ 2 nghiệp vụ:
 * 1. Vượt giờ dự kiến (tính toán on-the-fly trên RAM, không lưu DB).
 * 2. Lưu dữ liệu Mời giảng (tính tiền, thuế, insert vào giangday, exportdoantotnghiep, hopdonggvmoi).
 * 
 * 🚫 TUYỆT ĐỐI KHÔNG SỬ DỤNG service này cho luồng "Vượt giờ chính thức" của giảng viên cơ hữu.
 * Luồng chính thức của GV cơ hữu đã được chuyển sang thư mục `vuotgio_v2` (dùng cơ chế Data Lock & Snapshot).
 */
const createPoolConnection = require("../../config/databasePool");
const giangDayRepo = require("../../repositories/vuotgioDuKien/giangDay.repo");

const splitTeachers = (data) => {
    const result = [];
    data.forEach((item) => {
        const teachers = item.GiaoVienGiangDay.split(",").map((teacher) =>
            teacher.trim()
        );
        const originalQC = item.QuyChuan || 100;
        const secondQC = parseFloat((originalQC * 0.7).toFixed(2));
        const firstQC = originalQC - secondQC;

        teachers.forEach((teacher, index) => {
            const newItem = { ...item };
            newItem.GiaoVienGiangDay = `${teacher} (${index + 1})`;

            if (index === 0) {
                newItem.QuyChuan = firstQC;
            } else if (index === 1) {
                newItem.QuyChuan = secondQC;
            } else {
                newItem.QuyChuan = originalQC;
            }

            result.push(newItem);
        });
    });
    return result;
};

const joinData = (dataArray, nhanvienList, gvmList) => {
    const result = [];
    dataArray.forEach((item) => {
        const giaoVienGiangDayArray = item.GiaoVienGiangDay.split(",");
        giaoVienGiangDayArray.forEach((gv) => {
            if (gv.includes("(1)")) {
                const tenGiangVien = gv.trim().split("(")[0].trim();
                const nhanVien = nhanvienList.find(
                    (nv) =>
                        nv.TenNhanVien.toLowerCase().trim() ===
                        tenGiangVien.toLowerCase().trim()
                );

                if (nhanVien) {
                    const newItem = { ...item };
                    Object.keys(nhanVien).forEach((key) => {
                        if (!newItem.hasOwnProperty(key)) {
                            newItem[key] = nhanVien[key];
                        }
                    });
                    newItem.id_Gvm = 1;
                    newItem.GiaoVienGiangDay = `${tenGiangVien}`;
                    newItem.TenGiangVien = tenGiangVien;
                    result.push(newItem);
                } else {
                    console.warn(`Không tìm thấy giảng viên: ${tenGiangVien}`);
                }
            } else {
                const tenGiangVien = gv.trim().split("(")[0].trim();
                if (item.MoiGiang == 1) {
                    const gvmoi = gvmList.find(
                        (gvm) =>
                            gvm.HoTen.toLowerCase().trim() ===
                            tenGiangVien.toLowerCase().trim()
                    );

                    if (gvmoi) {
                        const newItem = { ...item };
                        Object.keys(gvmoi).forEach((key) => {
                            if (!newItem.hasOwnProperty(key)) {
                                newItem[key] = gvmoi[key];
                            }
                        });
                        newItem.id_Gvm = gvmoi.id_Gvm;
                        newItem.id_User = 1;
                        newItem.GiaoVienGiangDay = `${tenGiangVien}`;
                        newItem.TenGiangVien = tenGiangVien;
                        newItem.isHdChinh = 0;
                        result.push(newItem);
                    }
                } else {
                    const nhanVien = nhanvienList.find(
                        (nv) =>
                            nv.TenNhanVien.toLowerCase().trim() ===
                            tenGiangVien.toLowerCase().trim()
                    );

                    if (nhanVien) {
                        const newItem = { ...item };
                        Object.keys(nhanVien).forEach((key) => {
                            if (!newItem.hasOwnProperty(key)) {
                                newItem[key] = nhanVien[key];
                            }
                        });
                        newItem.id_Gvm = 1;
                        newItem.GiaoVienGiangDay = `${tenGiangVien}`;
                        newItem.TenGiangVien = tenGiangVien;
                        result.push(newItem);
                    }
                }
            }
        });
    });
    return result;
};

const processQuyChuanData = (quychuanRows, nvList, gvmList, isMoiGiang = false) => {
    // Phân loại: có dấu phẩy (lớp nhiều GV) và không phẩy (1 GV)
    const dataNhieuGV = quychuanRows.filter(row => row.GiaoVienGiangDay && row.GiaoVienGiangDay.includes(','));
    const dataMotGV = quychuanRows.filter(row => !row.GiaoVienGiangDay || !row.GiaoVienGiangDay.includes(','));

    // Xử lý lớp nhiều GV
    const tachLop = splitTeachers(dataNhieuGV);
    const gopLopNhieuGV = joinData(tachLop, nvList || [], gvmList || []);

    // Xử lý lớp 1 GV
    const gopLopMotGV = [];
    dataMotGV.forEach((row) => {
        const gv = row.GiaoVienGiangDay ? row.GiaoVienGiangDay.split(" - ")[0].trim() : '';
        if (isMoiGiang) {
            const gvmoi = (gvmList || []).find(g => g.HoTen.toLowerCase().trim() === gv.toLowerCase().trim());
            if (gvmoi) {
                const newItem = { ...row };
                Object.keys(gvmoi).forEach((key) => {
                    if (!newItem.hasOwnProperty(key)) {
                        newItem[key] = gvmoi[key];
                    }
                });
                newItem.TenGiangVien = gv;
                gopLopMotGV.push(newItem);
            }
        } else {
            const nhanVien = (nvList || []).find(nv => nv.TenNhanVien.toLowerCase().trim() === gv.toLowerCase().trim());
            if (nhanVien) {
                const newItem = { ...row };
                Object.keys(nhanVien).forEach((key) => {
                    if (!newItem.hasOwnProperty(key)) {
                        newItem[key] = nhanVien[key];
                    }
                });
                newItem.TenGiangVien = gv;
                gopLopMotGV.push(newItem);
            }
        }
    });

    return gopLopMotGV.concat(gopLopNhieuGV);
};
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

            let id_User = item.id_User || 1;
            let id_Gvm = item.id_Gvm || 1;

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

const getGiangDayQuyChuan = async (namHoc, khoaId, dot, kiHoc, isMoiGiang = 0) => {
    let connection;
    try {
        connection = await createPoolConnection();
        
        // Tự query bảng quychuan để thay thế giangDayRepo
        let sql = `
            SELECT *
            FROM quychuan
            WHERE NamHoc = ? AND MoiGiang = ?
        `;
        const params = [namHoc, isMoiGiang];

        if (khoaId && khoaId !== 'ALL') {
            sql += ` AND Khoa = ?`;
            params.push(khoaId);
        }
        
        if (dot && dot !== 'ALL') {
            sql += ` AND Dot = ?`;
            params.push(dot);
        }

        if (kiHoc && kiHoc !== 'ALL') {
            sql += ` AND KiHoc = ?`;
            params.push(kiHoc);
        }

        const [rows] = await connection.execute(sql, params);
        
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
    transformGiangDayData,
    processQuyChuanData,
    splitTeachers,
    joinData
};
