/**
 * NCKH V2 - Tổng Hợp Số Tiết Dự Kiến Controller
 * Logic tổng hợp số tiết nghiên cứu khoa học dự kiến cho giảng viên
 * Date: 2026-01-20
 * Refactored for unified database schema (nckh_chung)
 */

const createPoolConnection = require("../../config/databasePool");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Trích xuất số tiết từ chuỗi định dạng "Tên (Đơn vị - Số tiết)" hoặc "Tên (Số tiết)"
 * @param {string} str - Chuỗi cần trích xuất (ví dụ: "Nguyễn Văn A (CNTT - 15.50)")
 * @param {string} teacherName - Tên giảng viên cần tìm
 * @returns {number} Số tiết tìm thấy (0 nếu không tìm thấy)
 */
const extractHoursForTeacher = (str, teacherName) => {
    if (!str || typeof str !== 'string') return 0;

    // Normalization
    const normalizedTeacherName = teacherName.trim().toLowerCase();

    // Tách các thành viên bằng dấu phẩy
    const members = str.split(',').map(m => m.trim());

    for (const member of members) {
        // Kiểm tra xem thành viên này có phải là giảng viên đang tìm không
        // Lấy phần tên trước dấu ngoặc đơn
        const nameMatch = member.match(/^([^(]+)/);
        if (nameMatch) {
            const currentName = nameMatch[1].trim().toLowerCase();
            if (currentName === normalizedTeacherName) {
                // Nếu đúng tên, trích xuất số tiết
                // Tìm số trong dấu ngoặc đơn, có thể có hoặc không có đơn vị
                // Các trường hợp: "(CNTT - 10.50)", "(10.50)"

                // Regex tìm số cuối cùng trong ngoặc
                const hoursMatch = member.match(/([\d.]+)\s*(?:tiết|h|giờ)?\s*\)/i);
                if (hoursMatch) {
                    return parseFloat(hoursMatch[1]) || 0;
                }
            }
        }
    }

    return 0;
};

/**
 * Xác định vai trò của giảng viên trong bản ghi
 * @param {Object} record - Bản ghi từ nckh_chung
 * @param {string} teacherName - Tên giảng viên
 * @returns {Array} Danh sách vai trò
 */
const getRolesForTeacher = (record, teacherName) => {
    const roles = [];
    const normalizedName = teacherName.trim().toLowerCase();

    // Kiểm tra trong TacGiaChinh
    if (record.TacGiaChinh) {
        const tacGiaName = record.TacGiaChinh.split('(')[0].trim().toLowerCase();
        if (tacGiaName === normalizedName || record.TacGiaChinh.toLowerCase().includes(normalizedName)) {
            // Xác định tên vai trò dựa vào loại NCKH
            switch (record.LoaiNCKH) {
                case 'DETAI_DUAN':
                    roles.push('Chủ nhiệm');
                    break;
                case 'HOIDONG':
                    roles.push('Thành viên');
                    break;
                case 'HUONGDAN':
                case 'DEXUAT':
                    roles.push('Thành viên');
                    break;
                default:
                    roles.push('Tác giả chính');
            }
        }
    }

    // Kiểm tra trong DanhSachThanhVien
    if (record.DanhSachThanhVien) {
        const members = record.DanhSachThanhVien.split(',');
        for (const member of members) {
            const memberName = member.split('(')[0].trim().toLowerCase();
            if (memberName === normalizedName || member.toLowerCase().includes(normalizedName)) {
                roles.push('Thành viên');
                break;
            }
        }
    }

    return [...new Set(roles)]; // Remove duplicates
};

// =====================================================
// MAIN LOGIC
// =====================================================

/**
 * Render view tổng hợp số tiết dự kiến V2
 */
const getTongHopSoTietDuKienV2 = (req, res) => {
    res.render("nckh.tongHopNCKH_GV.ejs");
};

/**
 * API Tổng hợp số tiết dự kiến cho giảng viên (V2 - Unified)
 * Query từ bảng nckh_chung thay vì 8 bảng riêng
 */
const tongHopSoTietDuKienV2 = async (req, res) => {
    const { NamHoc } = req.params;
    const { TenGiangVien } = req.body;

    if (!NamHoc || !TenGiangVien) {
        return res.status(400).json({
            success: false,
            message: "Thiếu thông tin Năm học hoặc Tên giảng viên"
        });
    }

    console.log(`[V2 Unified] Tổng hợp số tiết dự kiến cho: ${TenGiangVien} - Năm: ${NamHoc}`);

    let connection;
    try {
        connection = await createPoolConnection();

        // Query tất cả records đã duyệt từ bảng nckh_chung
        const query = `
            SELECT * FROM nckh_chung 
            WHERE NamHoc = ? 
            AND DaoTaoDuyet = 1
            AND (TacGiaChinh LIKE ? OR DanhSachThanhVien LIKE ?)
        `;

        const searchPattern = `%${TenGiangVien}%`;
        const [allRecords] = await connection.execute(query, [NamHoc, searchPattern, searchPattern]);

        console.log(`[V2 Unified] Found ${allRecords.length} records for ${TenGiangVien}`);

        // Nhóm kết quả theo loại NCKH
        const resultTables = {};
        let totalHoursAll = 0;

        // Duyệt qua từng bản ghi
        for (const record of allRecords) {
            const loaiNCKH = record.LoaiNCKH;
            const displayName = nckhService.NCKH_DISPLAY_NAMES[loaiNCKH] || loaiNCKH;

            // Tính số tiết cho giảng viên này
            let hoursForRecord = 0;

            // Kiểm tra trong TacGiaChinh
            hoursForRecord += extractHoursForTeacher(record.TacGiaChinh, TenGiangVien);

            // Kiểm tra trong DanhSachThanhVien
            hoursForRecord += extractHoursForTeacher(record.DanhSachThanhVien, TenGiangVien);

            if (hoursForRecord > 0) {
                // Khởi tạo nhóm nếu chưa có
                if (!resultTables[displayName]) {
                    resultTables[displayName] = {
                        totalHours: 0,
                        records: []
                    };
                }

                // Xác định vai trò
                const roles = getRolesForTeacher(record, TenGiangVien);

                // Thêm vào kết quả
                resultTables[displayName].records.push({
                    ID: record.ID,
                    LoaiNCKH: record.LoaiNCKH,
                    PhanLoai: record.PhanLoai,
                    ten: record.TenCongTrinh,
                    vaiTro: roles.join(", "),
                    soTiet: hoursForRecord,
                    ngayNghiemThu: record.NgayNghiemThu
                        ? nckhService.convertDateFormat(record.NgayNghiemThu)
                        : "",
                    // Thêm các field để hiển thị chi tiết
                    TacGiaChinh: record.TacGiaChinh,
                    DanhSachThanhVien: record.DanhSachThanhVien,
                    Khoa: record.Khoa,
                    KetQua: record.KetQua
                });

                resultTables[displayName].totalHours += hoursForRecord;
                totalHoursAll += hoursForRecord;
            }
        }

        // Round các giá trị
        Object.keys(resultTables).forEach(key => {
            resultTables[key].totalHours = parseFloat(resultTables[key].totalHours.toFixed(2));
        });

        const responseData = {
            name: TenGiangVien,
            total: parseFloat(totalHoursAll.toFixed(2)),
            tables: resultTables
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error(`Lỗi khi tổng hợp số tiết V2 cho ${TenGiangVien}:`, error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi tổng hợp dữ liệu.",
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// TỔNG HỢP THEO KHOA
// =====================================================

/**
 * Render view tổng hợp số tiết theo Khoa
 */
const getTongHopSoTietTheoKhoa = (req, res) => {
    res.render("nckh.tongHopNCKH_Khoa.ejs");
};

/**
 * Trích xuất tên giảng viên từ chuỗi "Tên (Khoa - Số tiết)" hoặc "Tên (Số tiết)"
 * @param {string} str - Chuỗi chứa thông tin thành viên
 * @returns {Array} Danh sách tên giảng viên
 */
const extractTeacherNames = (str) => {
    if (!str || typeof str !== 'string') return [];
    
    const names = [];
    const members = str.split(',').map(m => m.trim());
    
    for (const member of members) {
        const nameMatch = member.match(/^([^(]+)/);
        if (nameMatch) {
            const name = nameMatch[1].trim();
            if (name) names.push(name);
        }
    }
    
    return names;
};

/**
 * API Tổng hợp số tiết theo Khoa
 * @param {Object} req - Request với params.NamHoc và body.Khoa
 * @param {Object} res - Response
 */
const tongHopSoTietTheoKhoa = async (req, res) => {
    const { NamHoc } = req.params;
    const { Khoa } = req.body;

    if (!NamHoc || !Khoa) {
        return res.status(400).json({
            success: false,
            message: "Thiếu thông tin Năm học hoặc Khoa"
        });
    }

    console.log(`[V2] Tổng hợp số tiết theo Khoa: ${Khoa} - Năm: ${NamHoc}`);

    let connection;
    try {
        connection = await createPoolConnection();

        // Query tất cả records đã duyệt của Khoa từ bảng nckh_chung
        const query = `
            SELECT * FROM nckh_chung 
            WHERE NamHoc = ? 
            AND DaoTaoDuyet = 1
            AND Khoa = ?
        `;

        const [allRecords] = await connection.execute(query, [NamHoc, Khoa]);

        console.log(`[V2] Found ${allRecords.length} records for Khoa ${Khoa}`);

        // Trích xuất danh sách giảng viên unique
        const teacherSet = new Set();
        
        for (const record of allRecords) {
            // Lấy tên từ TacGiaChinh
            const tacGiaNames = extractTeacherNames(record.TacGiaChinh);
            tacGiaNames.forEach(name => teacherSet.add(name));
            
            // Lấy tên từ DanhSachThanhVien
            const thanhVienNames = extractTeacherNames(record.DanhSachThanhVien);
            thanhVienNames.forEach(name => teacherSet.add(name));
        }

        const teacherList = Array.from(teacherSet);
        console.log(`[V2] Found ${teacherList.length} unique teachers in Khoa ${Khoa}`);

        // Tính số tiết cho từng giảng viên
        const teachers = [];
        let grandTotal = 0;

        for (const teacherName of teacherList) {
            // Nhóm kết quả theo loại NCKH cho từng GV
            const resultTables = {};
            let totalHoursForTeacher = 0;

            for (const record of allRecords) {
                const loaiNCKH = record.LoaiNCKH;
                const displayName = nckhService.NCKH_DISPLAY_NAMES[loaiNCKH] || loaiNCKH;

                // Tính số tiết cho giảng viên này từ record này
                let hoursForRecord = 0;
                hoursForRecord += extractHoursForTeacher(record.TacGiaChinh, teacherName);
                hoursForRecord += extractHoursForTeacher(record.DanhSachThanhVien, teacherName);

                if (hoursForRecord > 0) {
                    if (!resultTables[displayName]) {
                        resultTables[displayName] = {
                            totalHours: 0,
                            records: []
                        };
                    }

                    const roles = getRolesForTeacher(record, teacherName);

                    resultTables[displayName].records.push({
                        ID: record.ID,
                        LoaiNCKH: record.LoaiNCKH,
                        PhanLoai: record.PhanLoai,
                        ten: record.TenCongTrinh,
                        vaiTro: roles.join(", "),
                        soTiet: hoursForRecord,
                        ngayNghiemThu: record.NgayNghiemThu
                            ? nckhService.convertDateFormat(record.NgayNghiemThu)
                            : "",
                        TacGiaChinh: record.TacGiaChinh,
                        DanhSachThanhVien: record.DanhSachThanhVien,
                        Khoa: record.Khoa,
                        KetQua: record.KetQua
                    });

                    resultTables[displayName].totalHours += hoursForRecord;
                    totalHoursForTeacher += hoursForRecord;
                }
            }

            // Round các giá trị
            Object.keys(resultTables).forEach(key => {
                resultTables[key].totalHours = parseFloat(resultTables[key].totalHours.toFixed(2));
            });

            if (totalHoursForTeacher > 0) {
                teachers.push({
                    name: teacherName,
                    totalHours: parseFloat(totalHoursForTeacher.toFixed(2)),
                    tables: resultTables
                });
                grandTotal += totalHoursForTeacher;
            }
        }

        // Sắp xếp theo tổng số tiết giảm dần
        teachers.sort((a, b) => b.totalHours - a.totalHours);

        const responseData = {
            khoa: Khoa,
            namHoc: NamHoc,
            grandTotal: parseFloat(grandTotal.toFixed(2)),
            teacherCount: teachers.length,
            teachers: teachers
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error(`Lỗi khi tổng hợp số tiết theo Khoa ${Khoa}:`, error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi tổng hợp dữ liệu.",
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    getTongHopSoTietDuKienV2,
    tongHopSoTietDuKienV2,
    getTongHopSoTietTheoKhoa,
    tongHopSoTietTheoKhoa
};
