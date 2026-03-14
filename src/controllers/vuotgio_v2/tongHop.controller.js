/**
 * VUOT GIO V2 - Tổng Hợp Controller
 * Tổng hợp số tiết vượt giờ theo Giảng viên và Khoa
 * Tích hợp NCKH V2 API - KHÔNG có logic bảo lưu NCKH
 * Date: 2026-01-29
 */

const createPoolConnection = require("../../config/databasePool");
const nckhV2Service = require("../../services/nckhV2Service");

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Lấy số tiết NCKH từ API V2 Internal (sử dụng hàm có sẵn)
 * @param {string} NamHoc 
 * @param {string} Khoa - null hoặc 'ALL' để lấy tất cả
 * @returns {Array} Danh sách {TenNhanVien, tongSoTiet}
 */
const getNCKHDataInternal = async (NamHoc, Khoa, connection) => {
    try {
        // Sử dụng hàm có sẵn trong nckhV2Service
        const khoaFilter = Khoa && Khoa !== 'ALL' ? Khoa : 'ALL';
        const records = await nckhV2Service.getAllRecords(NamHoc, khoaFilter);
        
        // Chỉ lấy những bản ghi đã duyệt đủ 2 cấp
        const approvedRecords = records.filter(record => record.DaoTaoDuyet === 1 && record.KhoaDuyet === 1);
        
        // Tính số tiết cho từng giảng viên
        const teacherHoursMap = new Map();

        for (const record of approvedRecords) {
            // Xử lý TacGiaChinh
            if (record.TacGiaChinh) {
                const { name, hours } = extractNameAndHoursFromNCKH(record.TacGiaChinh);
                if (name && hours > 0) {
                    const current = teacherHoursMap.get(name) || 0;
                    teacherHoursMap.set(name, current + hours);
                }
            }

            // Xử lý DanhSachThanhVien
            if (record.DanhSachThanhVien) {
                const members = record.DanhSachThanhVien.split(',').map(m => m.trim());
                for (const member of members) {
                    const { name, hours } = extractNameAndHoursFromNCKH(member);
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
        
    } catch (error) {
        console.error('[getNCKHDataInternal] Error:', error);
        return []; // Trả về mảng rỗng nếu có lỗi
    }
};

/**
 * Trích xuất tên và số tiết từ chuỗi NCKH format "Tên (Khoa - Số tiết)" hoặc "Tên (Số tiết)"
 * Sử dụng extractNameAndUnit của nckhV2Service và extract riêng số tiết
 * @param {string} str 
 * @returns {{name: string, hours: number}}
 */
const extractNameAndHoursFromNCKH = (str) => {
    if (!str || typeof str !== 'string') return { name: '', hours: 0 };

    // Sử dụng extractNameAndUnit từ nckhV2Service
    const { name } = nckhV2Service.extractNameAndUnit(str);
    
    // Extract số tiết từ chuỗi (số cuối cùng trong ngoặc)
    const hoursMatch = str.match(/([\d.]+)\s*(?:tiết|h|giờ)?\s*\)$/i);
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

        // -------------------------------------------------------
        // Điều kiện WHERE theo khoa cho từng bảng (tên cột khác nhau)
        // -------------------------------------------------------
        const gdKhoa   = isAllKhoa ? '' : 'AND Khoa = ?';        // giangday
        const lnqcKhoa = isAllKhoa ? '' : 'AND Khoa = ?';        // lopngoaiquychuan
        const kthpKhoa = isAllKhoa ? '' : 'AND khoa = ?';        // ketthuchocphan
        const daKhoa   = isAllKhoa ? '' : 'AND MaPhongBan = ?';  // exportdoantotnghiep

        // -------------------------------------------------------
        // 1 JOIN query duy nhất (JOIN theo id_User — chỉ CB cơ hữu):
        //   all_users : UNION id_User từ 4 bảng (lọc NULL = loại GV mời)
        //   INNER JOIN nhanvien → TenNhanVien, PhanTramMienGiam, MaPhongBan
        //   LEFT JOIN subquery tổng hợp từng bảng (GROUP BY id_User)
        // -------------------------------------------------------
        const mainQuery = `
            SELECT
                nv.TenNhanVien                      AS GiangVien,
                COALESCE(nv.MaPhongBan, '')         AS maKhoa,
                COALESCE(nv.PhanTramMienGiam, 0)    AS phanTramMienGiam,
                COALESCE(gd.soTietGiangDay,  0)     AS soTietGiangDay,
                COALESCE(lnqc.soTietNgoaiQC, 0)     AS soTietNgoaiQC,
                COALESCE(kthp.soTietKTHP,    0)     AS soTietKTHP,
                COALESCE(da.soTietDoAn,      0)     AS soTietDoAn
            FROM (
                SELECT id_User FROM giangday
                    WHERE NamHoc = ? AND id_User IS NOT NULL ${gdKhoa}
                UNION
                SELECT id_User FROM lopngoaiquychuan
                    WHERE NamHoc = ? AND KhoaDuyet = 1 AND id_User IS NOT NULL ${lnqcKhoa}
                UNION
                SELECT id_User FROM ketthuchocphan
                    WHERE namhoc = ? AND khoaduyet = 1 AND id_User IS NOT NULL ${kthpKhoa}
                UNION
                SELECT id_User FROM exportdoantotnghiep
                    WHERE NamHoc = ? AND isMoiGiang = 0 AND id_User IS NOT NULL ${daKhoa}
            ) all_users
            JOIN nhanvien nv ON nv.id_User = all_users.id_User
            LEFT JOIN (
                SELECT id_User, SUM(QuyChuan) AS soTietGiangDay
                FROM giangday
                WHERE NamHoc = ? AND id_User IS NOT NULL ${gdKhoa}
                GROUP BY id_User
            ) gd   ON gd.id_User = nv.id_User
            LEFT JOIN (
                SELECT id_User, SUM(QuyChuan) AS soTietNgoaiQC
                FROM lopngoaiquychuan
                WHERE NamHoc = ? AND KhoaDuyet = 1 AND id_User IS NOT NULL ${lnqcKhoa}
                GROUP BY id_User
            ) lnqc ON lnqc.id_User = nv.id_User
            LEFT JOIN (
                SELECT id_User, SUM(sotietqc) AS soTietKTHP
                FROM ketthuchocphan
                WHERE namhoc = ? AND khoaduyet = 1 AND id_User IS NOT NULL ${kthpKhoa}
                GROUP BY id_User
            ) kthp ON kthp.id_User = nv.id_User
            LEFT JOIN (
                SELECT id_User, SUM(SoTiet) AS soTietDoAn
                FROM exportdoantotnghiep
                WHERE NamHoc = ? AND isMoiGiang = 0 AND id_User IS NOT NULL ${daKhoa}
                GROUP BY id_User
            ) da   ON da.id_User = nv.id_User
        `;

        // Build params — thứ tự khớp với ? trong query:
        //   UNION : 4 × (namHoc [+ khoa])
        //   JOIN  : 4 × (namHoc [+ khoa])
        const mainParams = [];
        const push = (n) => { mainParams.push(n); if (!isAllKhoa) mainParams.push(khoa); };
        push(namHoc); // UNION giangday
        push(namHoc); // UNION lopngoaiquychuan
        push(namHoc); // UNION ketthuchocphan
        push(namHoc); // UNION exportdoantotnghiep
        push(namHoc); // JOIN gd
        push(namHoc); // JOIN lnqc
        push(namHoc); // JOIN kthp
        push(namHoc); // JOIN da

        const [rows] = await connection.execute(mainQuery, mainParams);

        // 2. NCKH vẫn lấy riêng — dữ liệu lưu dạng chuỗi text, cần parse ở JS
        const nckhData = await getNCKHDataInternal(namHoc, isAllKhoa ? null : khoa, connection);
        const nckhMap  = new Map(nckhData.map(r => [r.TenNhanVien, r.tongSoTiet]));

        // 3. Định mức (bảng tra cứu toàn cục — 1 hàng duy nhất)
        const [dinhMucRows] = await connection.execute(
            `SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1`
        );
        const dinhMuc         = dinhMucRows[0];
        const dinhMucGiangDay = dinhMuc?.GiangDay || 280;
        const dinhMucNCKH     = dinhMuc?.NCKH     || 280;

        // 4. Tính vượt giờ — dữ liệu đã được DB tổng hợp sẵn
        const result = rows.map(r => {
            const soTietGiangDay   = parseFloat(r.soTietGiangDay)  || 0;
            const soTietNgoaiQC    = parseFloat(r.soTietNgoaiQC)   || 0;
            const soTietKTHP       = parseFloat(r.soTietKTHP)      || 0;
            const soTietDoAn       = parseFloat(r.soTietDoAn)      || 0;
            const soTietNCKH       = parseFloat(nckhMap.get(r.GiangVien)) || 0;
            const phanTramMienGiam = parseFloat(r.phanTramMienGiam) || 0;

            // Thực hiện = chỉ NgoaiQC + KTHP + DoAn (GiangDay KHÔNG tính vào)
            const soTietThucHien   = soTietNgoaiQC + soTietKTHP + soTietDoAn;
            // Định mức phải giảng (sau miễn giảm) — dùng cho cả giảng dạy và NCKH
            const soTietDinhMuc    = dinhMucGiangDay * (100 - phanTramMienGiam) / 100;

            // GiangDay dùng để bù NCKH nếu thiếu; định mức NCKH = định mức phải giảng của từng GV
            const soTietThieuNCKH_raw  = Math.max(0, soTietDinhMuc - soTietNCKH);
            const nckhBuTuGiangDay     = Math.min(soTietGiangDay, soTietThieuNCKH_raw);
            const soTietThieuNCKH      = Math.max(0, soTietThieuNCKH_raw - nckhBuTuGiangDay);

            const soTietVuotGio    = Math.max(0, soTietThucHien - soTietDinhMuc - soTietThieuNCKH);

            return {
                giangVien:            r.GiangVien,
                maKhoa:               r.maKhoa,
                soTietGiangDay:       parseFloat(soTietGiangDay.toFixed(2)),
                soTietNgoaiQC:        parseFloat(soTietNgoaiQC.toFixed(2)),
                soTietKTHP:           parseFloat(soTietKTHP.toFixed(2)),
                soTietDoAn:           parseFloat(soTietDoAn.toFixed(2)),
                soTietThucHien:       parseFloat(soTietThucHien.toFixed(2)),
                soTietNCKH:           parseFloat(soTietNCKH.toFixed(2)),
                dinhMucNCKH,
                nckhBuTuGiangDay:     parseFloat(nckhBuTuGiangDay.toFixed(2)),
                soTietThieuNCKH:      parseFloat(soTietThieuNCKH.toFixed(2)),
                dinhMucGiangDay,
                soTietDinhMuc:        parseFloat(soTietDinhMuc.toFixed(2)),
                phanTramMienGiam,
                soTietVuotGio:        parseFloat(soTietVuotGio.toFixed(2))
            };
        });

        // // Sắp xếp theo khoa
        result.sort((a, b) => a.maKhoa.localeCompare(b.maKhoa, 'vi'));

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

        // Thực hiện = chỉ NgoaiQC + KTHP + DoAn (GiangDay KHÔNG tính vào)
        const soTietThucHien = value.soTietNgoaiQC + value.soTietKTHP + value.soTietDoAn;

        // Định mức phải giảng (sau miễn giảm) — dùng cho cả giảng dạy và NCKH
        const soTietDinhMuc = dinhMucGiangDay * (100 - phanTramMienGiam) / 100;

        // GiangDay dùng để bù NCKH nếu thiếu; định mức NCKH = định mức phải giảng của từng GV
        const soTietThieuNCKH_raw = Math.max(0, soTietDinhMuc - value.soTietNCKH);
        const nckhBuTuGiangDay    = Math.min(value.soTietGiangDay, soTietThieuNCKH_raw);
        const soTietThieuNCKH     = Math.max(0, soTietThieuNCKH_raw - nckhBuTuGiangDay);

        // Số tiết vượt giờ cuối cùng
        const soTietVuotGio = Math.max(0, soTietThucHien - soTietDinhMuc - soTietThieuNCKH);

        result.push({
            giangVien,
            maKhoa,
            soTietGiangDay:   parseFloat(value.soTietGiangDay.toFixed(2)),
            soTietNgoaiQC:    parseFloat(value.soTietNgoaiQC.toFixed(2)),
            soTietKTHP:       parseFloat(value.soTietKTHP.toFixed(2)),
            soTietDoAn:       parseFloat(value.soTietDoAn.toFixed(2)),
            soTietThucHien:   parseFloat(soTietThucHien.toFixed(2)),
            soTietNCKH:       parseFloat(value.soTietNCKH.toFixed(2)),
            dinhMucNCKH,
            nckhBuTuGiangDay: parseFloat(nckhBuTuGiangDay.toFixed(2)),
            soTietThieuNCKH:  parseFloat(soTietThieuNCKH.toFixed(2)),
            dinhMucGiangDay,
            soTietDinhMuc:    parseFloat(soTietDinhMuc.toFixed(2)),
            phanTramMienGiam,
            soTietVuotGio:    parseFloat(soTietVuotGio.toFixed(2))
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

    // Query lớp ngoài quy chuẩn (chỉ tính những bản ghi đã duyệt: KhoaDuyet = 1)
    const [lopNgoaiQC] = await connection.execute(`
        SELECT SUM(QuyChuan) as total FROM lopngoaiquychuan WHERE NamHoc = ? AND Khoa = ? AND KhoaDuyet = 1
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

        // 0. Lấy id_User một lần — dùng cho các query bên dưới
        const [nvRow] = await connection.execute(
            `SELECT id_User FROM nhanvien WHERE TenNhanVien = ?`,
            [GiangVien]
        );
        const id_User = nvRow[0]?.id_User || null;

        // 1. Lấy thông tin giảng dạy TKB (giữ nguyên join tên vì giangday chưa FK)
        const [giangDay] = await connection.execute(`
            SELECT * FROM giangday 
            WHERE NamHoc = ? AND GiangVien = ?
            ORDER BY HocKy, TenHocPhan
        `, [namHoc, GiangVien]);

        // 2. Lấy lớp ngoài quy chuẩn (join bằng id_User)
        const [lopNgoaiQC] = id_User
            ? await connection.execute(`
                SELECT * FROM lopngoaiquychuan 
                WHERE NamHoc = ? AND id_User = ?
                ORDER BY KiHoc, MaHocPhan
              `, [namHoc, id_User])
            : [[] ];

        // 3. Lấy KTHP (join bằng id_User)
        const [kthp] = id_User
            ? await connection.execute(`
                SELECT * FROM ketthuchocphan 
                WHERE namhoc = ? AND id_User = ?
                ORDER BY ki, hinhthuc
              `, [namHoc, id_User])
            : [[]];

        // 4. Lấy Đồ án (join bằng id_User)
        const [doAn] = id_User
            ? await connection.execute(`
                SELECT * FROM exportdoantotnghiep 
                WHERE NamHoc = ? AND id_User = ? AND isMoiGiang = 0
              `, [namHoc, id_User])
            : [[]];

        // 5. Lấy NCKH (từ bảng nckh_chung — vẫn dùng tên vì lưu text)
        const [nckh] = await connection.execute(`
            SELECT * FROM nckh_chung 
            WHERE NamHoc = ? AND DaoTaoDuyet = 1 AND KhoaDuyet = 1
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
    extractNameAndHoursFromNCKH,
    calculateVuotGioForAll
};
