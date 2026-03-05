/**
 * VUOT GIO V2 - Tổng Hợp Controller
 * Tổng hợp số tiết vượt giờ theo Giảng viên và Khoa
 * Tích hợp NCKH V2 API - KHÔNG có logic bảo lưu NCKH
 * Date: 2026-01-29
 */

const createPoolConnection = require("../../config/databasePool");

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Lấy số tiết NCKH từ API V2 Internal
 * @param {string} NamHoc 
 * @param {string} Khoa - null hoặc 'ALL' để lấy tất cả
 * @returns {Array} Danh sách {TenNhanVien, tongSoTiet}
 */
const getNCKHDataInternal = async (NamHoc, Khoa, connection) => {
    // Query trực tiếp từ bảng nckh_chung thay vì gọi API
    let query = `
        SELECT * FROM nckh_chung 
        WHERE NamHoc = ? 
        AND DaoTaoDuyet = 1
    `;
    const params = [NamHoc];

    if (Khoa && Khoa !== 'ALL') {
        query += ` AND Khoa = ?`;
        params.push(Khoa);
    }

    const [records] = await connection.execute(query, params);

    // Tính số tiết cho từng giảng viên
    const teacherHoursMap = new Map();

    for (const record of records) {
        // Xử lý TacGiaChinh
        if (record.TacGiaChinh) {
            const { name, hours } = extractNameAndHours(record.TacGiaChinh);
            if (name && hours > 0) {
                const current = teacherHoursMap.get(name) || 0;
                teacherHoursMap.set(name, current + hours);
            }
        }

        // Xử lý DanhSachThanhVien
        if (record.DanhSachThanhVien) {
            const members = record.DanhSachThanhVien.split(',').map(m => m.trim());
            for (const member of members) {
                const { name, hours } = extractNameAndHours(member);
                if (name && hours > 0) {
                    const current = teacherHoursMap.get(name) || 0;
                    teacherHoursMap.set(name, current + hours);
                }
            }
        }
    }

    // Convert to array
    const result = [];
    teacherHoursMap.forEach((tongSoTiet, TenNhanVien) => {
        result.push({ TenNhanVien, tongSoTiet: parseFloat(tongSoTiet.toFixed(2)) });
    });

    return result;
};

/**
 * Trích xuất tên và số tiết từ chuỗi "Tên (Khoa - Số tiết)" hoặc "Tên (Số tiết)"
 * @param {string} str 
 * @returns {{name: string, hours: number}}
 */
const extractNameAndHours = (str) => {
    if (!str || typeof str !== 'string') return { name: '', hours: 0 };

    // Lấy tên (phần trước dấu ngoặc)
    const nameMatch = str.match(/^([^(]+)/);
    const name = nameMatch ? nameMatch[1].trim() : '';

    // Lấy số tiết (số cuối cùng trong ngoặc)
    const hoursMatch = str.match(/([\d.]+)\s*(?:tiết|h|giờ)?\s*\)/i);
    const hours = hoursMatch ? parseFloat(hoursMatch[1]) || 0 : 0;

    return { name, hours };
};

// =====================================================
// TỔNG HỢP THEO GIẢNG VIÊN
// =====================================================

/**
 * API Tổng hợp vượt giờ theo Giảng viên
 * Logic: soTietVuotGio = soTietThucHien - soTietDinhMuc - soTietThieuNCKH
 */
const tongHopTheoGV = async (req, res) => {
    const { namHoc, khoa } = req.query;

    if (!namHoc) {
        return res.status(400).json({
            success: false,
            message: "Thiếu thông tin Năm học"
        });
    }

    console.log(`[VuotGio V2] Tổng hợp theo GV - Năm: ${namHoc}, Khoa: ${khoa || 'ALL'}`);

    let connection;
    try {
        connection = await createPoolConnection();

        const isAllKhoa = !khoa || khoa === 'ALL';

        // 1. Query giảng dạy TKB
        let giangDayQuery = `
            SELECT GiangVien, SUM(QuyChuan) as soTietGiangDay
            FROM giangday 
            WHERE NamHoc = ?
        `;
        const giangDayParams = [namHoc];
        if (!isAllKhoa) {
            giangDayQuery += ` AND Khoa = ?`;
            giangDayParams.push(khoa);
        }
        giangDayQuery += ` GROUP BY GiangVien`;
        const [giangDay] = await connection.execute(giangDayQuery, giangDayParams);

        // 2. Query lớp ngoài quy chuẩn
        let lopNgoaiQCQuery = `
            SELECT GiangVien, SUM(QuyChuan) as soTietNgoaiQC
            FROM lopngoaiquychuan 
            WHERE NamHoc = ?
        `;
        const lopNgoaiQCParams = [namHoc];
        if (!isAllKhoa) {
            lopNgoaiQCQuery += ` AND Khoa = ?`;
            lopNgoaiQCParams.push(khoa);
        }
        lopNgoaiQCQuery += ` GROUP BY GiangVien`;
        const [lopNgoaiQC] = await connection.execute(lopNgoaiQCQuery, lopNgoaiQCParams);

        // 3. Query kết thúc học phần (chỉ tính những bản ghi đã duyệt: khoaduyet = 1)
        let kthpQuery = `
            SELECT giangvien as GiangVien, SUM(sotietqc) as soTietKTHP
            FROM ketthuchocphan 
            WHERE namhoc = ? AND khoaduyet = 1
        `;
        const kthpParams = [namHoc];
        if (!isAllKhoa) {
            kthpQuery += ` AND khoa = ?`;
            kthpParams.push(khoa);
        }
        kthpQuery += ` GROUP BY giangvien`;
        const [kthp] = await connection.execute(kthpQuery, kthpParams);

        // 4. Query đồ án (chỉ tính isMoiGiang = 0)
        let doAnQuery = `
            SELECT GiangVien, SUM(SoTiet) as soTietDoAn
            FROM exportdoantotnghiep 
            WHERE NamHoc = ? AND isMoiGiang = 0
        `;
        const doAnParams = [namHoc];
        if (!isAllKhoa) {
            doAnQuery += ` AND MaPhongBan = ?`;
            doAnParams.push(khoa);
        }
        doAnQuery += ` GROUP BY GiangVien`;
        const [doAn] = await connection.execute(doAnQuery, doAnParams);

        // 5. Lấy NCKH từ bảng nckh_chung (internal call)
        const nckhData = await getNCKHDataInternal(namHoc, isAllKhoa ? null : khoa, connection);

        // 6. Lấy thông tin nhân viên và % miễn giảm
        let nhanVienQuery = `SELECT TenNhanVien, PhanTramMienGiam, MaPhongBan FROM nhanvien WHERE 1=1`;
        const nhanVienParams = [];
        if (!isAllKhoa) {
            nhanVienQuery += ` AND MaPhongBan = ?`;
            nhanVienParams.push(khoa);
        }
        const [nhanVien] = await connection.execute(nhanVienQuery, nhanVienParams);

        // 7. Lấy định mức
        const [dinhMucRows] = await connection.execute(`SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1`);
        const dinhMuc = dinhMucRows[0] || { GiangDay: 280, NCKH: 280 };

        // 8. Tính toán vượt giờ cho từng GV
        const result = calculateVuotGioForAll({
            giangDay,
            lopNgoaiQC,
            kthp,
            doAn,
            nckhData,
            nhanVien,
            dinhMuc
        });

        res.json({
            success: true,
            data: result,
            dinhMuc: {
                giangDay: dinhMuc.GiangDay,
                nckh: dinhMuc.NCKH
            }
        });

    } catch (error) {
        console.error("Lỗi khi tổng hợp vượt giờ theo GV:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi tổng hợp dữ liệu."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Tính vượt giờ cho tất cả giảng viên
 * KHÔNG có logic bảo lưu NCKH
 */
function calculateVuotGioForAll(data) {
    const { giangDay, lopNgoaiQC, kthp, doAn, nckhData, nhanVien, dinhMuc } = data;
    const dinhMucGiangDay = dinhMuc.GiangDay || 280;
    const dinhMucNCKH = dinhMuc.NCKH || 280;

    // Tạo map cho từng GV
    const gvMap = new Map();

    // Helper: Khởi tạo dữ liệu GV nếu chưa có
    const initGV = (name) => {
        if (!gvMap.has(name)) {
            gvMap.set(name, {
                soTietGiangDay: 0,
                soTietNgoaiQC: 0,
                soTietKTHP: 0,
                soTietDoAn: 0,
                soTietNCKH: 0
            });
        }
    };

    // Điền dữ liệu từ giảng dạy TKB
    giangDay.forEach(r => {
        if (r.GiangVien) {
            initGV(r.GiangVien);
            gvMap.get(r.GiangVien).soTietGiangDay = parseFloat(r.soTietGiangDay) || 0;
        }
    });

    // Điền dữ liệu từ lớp ngoài quy chuẩn
    lopNgoaiQC.forEach(r => {
        if (r.GiangVien) {
            initGV(r.GiangVien);
            gvMap.get(r.GiangVien).soTietNgoaiQC = parseFloat(r.soTietNgoaiQC) || 0;
        }
    });

    // Điền dữ liệu từ KTHP
    kthp.forEach(r => {
        if (r.GiangVien) {
            initGV(r.GiangVien);
            gvMap.get(r.GiangVien).soTietKTHP = parseFloat(r.soTietKTHP) || 0;
        }
    });

    // Điền dữ liệu từ Đồ án
    doAn.forEach(r => {
        if (r.GiangVien) {
            initGV(r.GiangVien);
            gvMap.get(r.GiangVien).soTietDoAn = parseFloat(r.soTietDoAn) || 0;
        }
    });

    // Điền dữ liệu NCKH
    nckhData.forEach(r => {
        if (r.TenNhanVien) {
            initGV(r.TenNhanVien);
            gvMap.get(r.TenNhanVien).soTietNCKH = parseFloat(r.tongSoTiet) || 0;
        }
    });

    // Tính vượt giờ (KHÔNG có bảo lưu)
    const result = [];
    gvMap.forEach((value, giangVien) => {
        // Tìm thông tin nhân viên
        const nv = nhanVien.find(n => n.TenNhanVien === giangVien);
        const phanTramMienGiam = parseFloat(nv?.PhanTramMienGiam) || 0;
        const maKhoa = nv?.MaPhongBan || '';

        // Tổng số tiết thực hiện (V2: KHÔNG có giữa kỳ)
        const soTietThucHien = value.soTietGiangDay + value.soTietNgoaiQC +
            value.soTietKTHP + value.soTietDoAn;

        // Định mức sau miễn giảm
        const soTietDinhMuc = dinhMucGiangDay * (100 - phanTramMienGiam) / 100;

        // Số tiết thiếu NCKH (KHÔNG bảo lưu - chỉ trừ nếu thiếu)
        const soTietThieuNCKH = Math.max(0, dinhMucNCKH - value.soTietNCKH);

        // Số tiết vượt giờ cuối cùng
        const soTietVuotGio = Math.max(0, soTietThucHien - soTietDinhMuc - soTietThieuNCKH);

        result.push({
            giangVien,
            maKhoa,
            soTietGiangDay: parseFloat(value.soTietGiangDay.toFixed(2)),
            soTietNgoaiQC: parseFloat(value.soTietNgoaiQC.toFixed(2)),
            soTietKTHP: parseFloat(value.soTietKTHP.toFixed(2)),
            soTietDoAn: parseFloat(value.soTietDoAn.toFixed(2)),
            soTietThucHien: parseFloat(soTietThucHien.toFixed(2)),
            soTietNCKH: parseFloat(value.soTietNCKH.toFixed(2)),
            dinhMucNCKH,
            soTietThieuNCKH: parseFloat(soTietThieuNCKH.toFixed(2)),
            dinhMucGiangDay,
            soTietDinhMuc: parseFloat(soTietDinhMuc.toFixed(2)),
            phanTramMienGiam,
            soTietVuotGio: parseFloat(soTietVuotGio.toFixed(2))
        });
    });

    // Sắp xếp theo tên
    result.sort((a, b) => a.giangVien.localeCompare(b.giangVien, 'vi'));

    return result;
}

// =====================================================
// TỔNG HỢP THEO KHOA
// =====================================================

/**
 * API Tổng hợp vượt giờ theo Khoa
 */
const tongHopTheoKhoa = async (req, res) => {
    const { namHoc } = req.query;

    if (!namHoc) {
        return res.status(400).json({
            success: false,
            message: "Thiếu thông tin Năm học"
        });
    }

    console.log(`[VuotGio V2] Tổng hợp theo Khoa - Năm: ${namHoc}`);

    let connection;
    try {
        connection = await createPoolConnection();

        // Lấy danh sách các Khoa
        const [khoaList] = await connection.execute(`
            SELECT DISTINCT MaPhongBan as Khoa, TenPhongBan 
            FROM phongban 
            WHERE MaPhongBan IS NOT NULL
            ORDER BY MaPhongBan
        `);

        const result = [];

        for (const khoa of khoaList) {
            // Lấy dữ liệu cho từng Khoa
            const khoaData = await getTongHopByKhoaInternal(namHoc, khoa.Khoa, connection);
            
            if (khoaData.tongSoGV > 0) {
                result.push({
                    maKhoa: khoa.Khoa,
                    tenKhoa: khoa.TenPhongBan || khoa.Khoa,
                    ...khoaData
                });
            }
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Lỗi khi tổng hợp vượt giờ theo Khoa:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi tổng hợp dữ liệu."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy tổng hợp cho một Khoa cụ thể (internal)
 */
async function getTongHopByKhoaInternal(namHoc, Khoa, connection) {
    // Query giảng dạy
    const [giangDay] = await connection.execute(`
        SELECT SUM(QuyChuan) as total FROM giangday WHERE NamHoc = ? AND Khoa = ?
    `, [namHoc, Khoa]);

    // Query lớp ngoài quy chuẩn
    const [lopNgoaiQC] = await connection.execute(`
        SELECT SUM(QuyChuan) as total FROM lopngoaiquychuan WHERE NamHoc = ? AND Khoa = ?
    `, [namHoc, Khoa]);

    // Query KTHP
    const [kthp] = await connection.execute(`
        SELECT SUM(sotietqc) as total FROM ketthuchocphan 
        WHERE namhoc = ? AND khoa = ? AND khoaduyet = 1
    `, [namHoc, Khoa]);

    // Query Đồ án
    const [doAn] = await connection.execute(`
        SELECT SUM(SoTiet) as total FROM exportdoantotnghiep 
        WHERE NamHoc = ? AND MaPhongBan = ? AND isMoiGiang = 0
    `, [namHoc, Khoa]);

    // Đếm số GV
    const [gvCount] = await connection.execute(`
        SELECT COUNT(DISTINCT TenNhanVien) as count FROM nhanvien WHERE MaPhongBan = ?
    `, [Khoa]);

    return {
        tongSoGV: gvCount[0]?.count || 0,
        tongSoTietGiangDay: parseFloat(giangDay[0]?.total) || 0,
        tongSoTietNgoaiQC: parseFloat(lopNgoaiQC[0]?.total) || 0,
        tongSoTietKTHP: parseFloat(kthp[0]?.total) || 0,
        tongSoTietDoAn: parseFloat(doAn[0]?.total) || 0,
        tongSoTietThucHien: (parseFloat(giangDay[0]?.total) || 0) +
            (parseFloat(lopNgoaiQC[0]?.total) || 0) +
            (parseFloat(kthp[0]?.total) || 0) +
            (parseFloat(doAn[0]?.total) || 0)
    };
}

// =====================================================
// CHI TIẾT GIẢNG VIÊN
// =====================================================

/**
 * API Lấy chi tiết vượt giờ của một giảng viên
 */
const chiTietGV = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !MaGV) {
        return res.status(400).json({
            success: false,
            message: "Thiếu thông tin Năm học hoặc Giảng viên"
        });
    }

    // Decode URL param
    const GiangVien = decodeURIComponent(MaGV);

    console.log(`[VuotGio V2] Chi tiết GV: ${GiangVien} - Năm: ${namHoc}`);

    let connection;
    try {
        connection = await createPoolConnection();

        // 1. Lấy thông tin giảng dạy TKB
        const [giangDay] = await connection.execute(`
            SELECT * FROM giangday 
            WHERE NamHoc = ? AND GiangVien = ?
            ORDER BY HocKy, TenHocPhan
        `, [namHoc, GiangVien]);

        // 2. Lấy lớp ngoài quy chuẩn
        const [lopNgoaiQC] = await connection.execute(`
            SELECT * FROM lopngoaiquychuan 
            WHERE NamHoc = ? AND GiangVien = ?
            ORDER BY HocKy, TenHocPhan
        `, [namHoc, GiangVien]);

        // 3. Lấy KTHP
        const [kthp] = await connection.execute(`
            SELECT * FROM ketthuchocphan 
            WHERE namhoc = ? AND giangvien = ?
            ORDER BY ki, hinhthuc
        `, [namHoc, GiangVien]);

        // 4. Lấy Đồ án
        const [doAn] = await connection.execute(`
            SELECT * FROM exportdoantotnghiep 
            WHERE NamHoc = ? AND GiangVien = ? AND isMoiGiang = 0
        `, [namHoc, GiangVien]);

        // 5. Lấy NCKH (từ bảng nckh_chung)
        const [nckh] = await connection.execute(`
            SELECT * FROM nckh_chung 
            WHERE NamHoc = ? AND DaoTaoDuyet = 1
            AND (TacGiaChinh LIKE ? OR DanhSachThanhVien LIKE ?)
        `, [namHoc, `%${GiangVien}%`, `%${GiangVien}%`]);

        // 6. Lấy thông tin nhân viên
        const [nhanVien] = await connection.execute(`
            SELECT * FROM nhanvien WHERE TenNhanVien = ?
        `, [GiangVien]);

        res.json({
            success: true,
            data: {
                giangVien: GiangVien,
                thongTinNhanVien: nhanVien[0] || null,
                giangDay,
                lopNgoaiQC,
                kthp,
                doAn,
                nckh
            }
        });

    } catch (error) {
        console.error("Lỗi khi lấy chi tiết GV:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra."
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    tongHopTheoGV,
    tongHopTheoKhoa,
    chiTietGV,
    // Internal functions for other controllers
    getNCKHDataInternal,
    calculateVuotGioForAll
};
