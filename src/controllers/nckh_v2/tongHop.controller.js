/**
 * NCKH V2 - Tổng Hợp Số Tiết Dự Kiến Controller
 * Logic tổng hợp số tiết nghiên cứu khoa học dự kiến cho giảng viên
 * Date: 2026-01-19
 */

const createPoolConnection = require("../../config/databasePool");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Trích xuất số tiết từ chuỗi định dạng "Tên (Đơn vị - Số tiết)" hoặc "Tên (Số tiết)"
 * @param {string} str - Chuỗi cần trích xuất (ví dụ: "Nguyễn Văn A (CNTT - 15.5 tiết)")
 * @param {string} teacherName - Tên giảng viên cần tìm
 * @returns {number} Số tiết tìm thấy (0 nếu không tìm thấy)
 */
const extractHoursForTeacher = (str, teacherName) => {
    if (!str || typeof str !== 'string') return 0;

    // Normalization
    const normalizedTeacherName = teacherName.trim().toLowerCase();

    // Split chuỗi (nếu có dấu thập phân , thì replace bằng .)
    // Regex matches: Name (Unit - Hours) or Name (Hours)
    // Ví dụ: "Nguyễn Văn A (CNTT - 10.5 tiết)" hoặc "Nguyễn Văn B (10.5)"

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
                // Các trường hợp: "(CNTT - 10.5 tiết)", "(10.5)"

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

// =====================================================
// MAIN LOGIC
// =====================================================

/**
 * Render view tổng hợp số tiết dự kiến V2
 */
const getTongHopSoTietDuKienV2 = (req, res) => {
    res.render("nckhTongHopSoTietDuKienV2.ejs");
};

/**
 * API Tổng hợp số tiết dự kiến cho giảng viên (V2)
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

    console.log(`[V2] Tổng hợp số tiết dự kiến cho: ${TenGiangVien} - Năm: ${NamHoc}`);

    let connection;
    try {
        connection = await createPoolConnection();

        // Danh sách các bảng NCKH V2 cần query
        // Mỗi bảng cần định nghĩa: tên bảng, tên hiển thị, các cột chứa thông tin giảng viên (vai trò)
        const tables = [
            {
                name: "detaiduan",
                displayName: "Đề tài, dự án",
                roleColumns: [
                    { col: "ChuNhiem", role: "Chủ nhiệm" },
                    { col: "DanhSachThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenDeTai"
            },
            {
                name: "baibaokhoahoc",
                displayName: "Bài báo khoa học",
                roleColumns: [
                    { col: "TacGia", role: "Tác giả" },
                    { col: "TacGiaChiuTrachNhiem", role: "Tác giả chịu trách nhiệm" },
                    { col: "DanhSachThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenBaiBao"
            },
            {
                name: "bangsangchevagiaithuong",
                displayName: "Bằng sáng chế, giải thưởng",
                roleColumns: [
                    { col: "TacGia", role: "Tác giả" },
                    { col: "DanhSachThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenBangSangCheVaGiaiThuong"
            },
            {
                name: "sachvagiaotrinh",
                displayName: "Sách và giáo trình",
                roleColumns: [
                    { col: "TacGia", role: "Tác giả" },
                    { col: "DongChuBien", role: "Đồng chủ biên" },
                    { col: "DanhSachThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenSachVaGiaoTrinh"
            },
            {
                name: "sangkien",
                displayName: "Sáng kiến",
                roleColumns: [
                    { col: "TacGiaChinh", role: "Tác giả chính" },
                    { col: "DanhSachThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenSangKien"
            },
            {
                name: "dexuatnghiencuu",
                displayName: "Đề xuất nghiên cứu",
                roleColumns: [
                    // { col: "TacGiaChinh", role: "Chủ nhiệm / Tác giả chính" }, // Đề xuất nghiên cứu V2 refactor chỉ còn thành viên
                    { col: "DanhSachThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenDeXuat"
            },
            {
                name: "huongdansvnckh",
                displayName: "Hướng dẫn SV NCKH",
                roleColumns: [
                    // { col: "HuongDanChinh", role: "Hướng dẫn chính" }, // Hướng dẫn SV NCKH V2 refactor chỉ còn thành viên
                    { col: "DanhSachThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenDeTai"
            },
            {
                name: "thanhVienHoiDong",
                displayName: "Thành viên hội đồng",
                roleColumns: [
                    { col: "ThanhVien", role: "Thành viên" }
                ],
                nameColumn: "TenDeTai" // Hoặc LoaiHoiDong tuỳ dữ liệu
            }
        ];

        let totalHoursAll = 0;
        const resultTables = {};

        // Duyệt qua từng bảng
        for (const table of tables) {
            let totalHoursTable = 0;
            const records = [];

            // Query lấy dữ liệu của năm học và ĐÃ ĐƯỢC DUYỆT (DaoTaoDuyet = 1)
            // Lưu ý: kiểm tra tên cột DaoTaoDuyet trong DB, thường là DaoTaoDuyet
            const query = `SELECT * FROM ${table.name} WHERE NamHoc = ? AND DaoTaoDuyet = 1`;
            const [rows] = await connection.execute(query, [NamHoc]);

            // Duyệt qua từng bản ghi trong bảng
            for (const row of rows) {
                let hoursForRecord = 0;
                let rolesFound = [];

                // Kiểm tra từng cột vai trò xem giảng viên có tham gia không
                for (const roleConfig of table.roleColumns) {
                    const columnContent = row[roleConfig.col];
                    if (columnContent) {
                        const hours = extractHoursForTeacher(columnContent, TenGiangVien);
                        if (hours > 0) {
                            hoursForRecord += hours;
                            rolesFound.push(roleConfig.role);
                        }
                    }
                }

                // Nếu tìm thấy số tiết > 0 thì ghi nhận
                if (hoursForRecord > 0) {
                    totalHoursTable += hoursForRecord;

                    // Thêm vào danh sách chi tiết
                    // Ưu tiên hiển thị tên đề tài, nếu không có thì lấy loại hội đồng (cho bảng hoidong)
                    const recordName = row[table.nameColumn] || row['LoaiHoiDong'] || `ID: ${row.ID}`;

                    records.push({
                        ...row, // Trả về toàn bộ dữ liệu của hàng
                        ten: recordName,
                        vaiTro: rolesFound.join(", "),
                        soTiet: hoursForRecord,
                        ngayNghiemThu: row.NgayNghiemThu ? nckhService.convertDateFormat(row.NgayNghiemThu) : "",
                        tableName: table.name // Lưu lại tên bảng để frontend xử lý chi tiết
                    });
                }
            }

            // Nếu bảng này có dữ liệu của giảng viên thì thêm vào kết quả trả về
            if (totalHoursTable > 0 || records.length > 0) {
                resultTables[table.displayName] = {
                    totalHours: parseFloat(totalHoursTable.toFixed(2)),
                    records: records
                };
                totalHoursAll += totalHoursTable;
            }
        }

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

module.exports = {
    getTongHopSoTietDuKienV2,
    tongHopSoTietDuKienV2
};
