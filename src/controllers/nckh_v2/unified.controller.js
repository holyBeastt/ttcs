/**
 * NCKH V2 - Unified Controller
 * Controller hợp nhất cho tất cả loại NCKH với bảng nckh_chung
 * Date: 2026-01-22 (Refactored)
 */

const nckhService = require("../../services/nckhV2Service");
const nckhMappers = require("../../mappers/nckhMappers");
const LogService = require("../../services/logService");

// =====================================================
// FACTORY FUNCTION - Tạo controller cho một loại NCKH
// =====================================================

/**
 * Tạo controller đầy đủ cho một loại NCKH
 * @param {string} loaiNCKH - Loại NCKH (DETAI_DUAN, BAIBAO, ...)
 * @returns {Object} Controller object với save, getTable, edit, delete
 */
const createController = (loaiNCKH) => {
    const handler = nckhMappers.getHandler(loaiNCKH);

    return {
        /**
         * Lưu bản ghi mới
         */
        save: async (req, res) => {
            const userId = req.session?.userId || 1;
            const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

            try {
                // 1. Validate input
                if (handler.validateInput) {
                    handler.validateInput(req.body);
                }

                // 2. Map form data sang format DB
                const recordData = handler.mapFormToRecord
                    ? handler.mapFormToRecord(req.body)
                    : req.body;

                // 3. Lấy số tiết chuẩn
                const T = await nckhService.getSoTietChuanV2(loaiNCKH, recordData.phanLoai);

                // 4. Tính số tiết
                const tongSoNguoi = recordData.tongSoTacGia || 1;
                const { tacGiaChinh: tietTacGia, thanhVien: tietThanhVien } =
                    nckhMappers.calculateHours(
                        loaiNCKH,
                        T,
                        tongSoNguoi,
                        recordData.soDongTacGia || 1,
                        recordData.soNamThucHien || 1,
                        nckhService // Inject service cho công thức tính
                    );

                // 5. Format tác giả với số tiết
                let formattedTacGia = recordData.tacGiaChinh;
                if (recordData.tacGiaChinh) {
                    const { name, unit } = nckhService.extractNameAndUnit(recordData.tacGiaChinh);
                    if (unit) {
                        formattedTacGia = `${name} (${unit} - ${nckhService.formatHours(tietTacGia)})`;
                    } else {
                        const khoa = await nckhService.getKhoaByName(name);
                        formattedTacGia = khoa
                            ? `${name} (${khoa} - ${nckhService.formatHours(tietTacGia)})`
                            : `${name} (${nckhService.formatHours(tietTacGia)})`;
                    }
                }

                // 6. Format thành viên với số tiết
                let formattedThanhVien = null;
                if (recordData.danhSachThanhVien) {
                    const members = recordData.danhSachThanhVien.split(',').map(m => m.trim()).filter(m => m);
                    if (members.length > 0) {
                        formattedThanhVien = await nckhService.formatMembersWithHours(members, tietThanhVien);
                    }
                }

                // 7. Lưu vào DB
                const result = await nckhService.saveRecord(loaiNCKH, {
                    ...recordData,
                    tacGiaChinh: formattedTacGia,
                    danhSachThanhVien: formattedThanhVien,
                    createdBy: userName
                });

                // 8. Ghi log
                try {
                    await LogService.logChange(
                        userId,
                        userName,
                        'Thêm thông tin NCKH V2',
                        `Thêm ${handler.displayName}: "${recordData.tenCongTrinh}"`
                    );
                } catch (logError) {
                    console.error("Lỗi khi ghi log:", logError);
                }

                res.status(200).json({
                    success: true,
                    message: `Thêm ${handler.displayName} thành công!`,
                    id: result.insertId
                });
            } catch (error) {
                console.error(`Lỗi khi lưu ${loaiNCKH}:`, error);
                res.status(500).json({
                    success: false,
                    message: error.message || `Có lỗi xảy ra khi thêm ${handler.displayName}.`
                });
            }
        },

        /**
         * Lấy danh sách bản ghi
         */
        getTable: async (req, res) => {
            const { NamHoc, Khoa } = req.params;
            console.log(`[V2 Unified] Lấy dữ liệu ${loaiNCKH} - Năm: ${NamHoc}, Khoa: ${Khoa}`);

            try {
                // Lấy records từ service
                const records = await nckhService.getRecords(loaiNCKH, NamHoc, Khoa);

                // Map sang format hiển thị (để giữ compatibility với frontend cũ)
                const displayRecords = handler.mapRecordToDisplay
                    ? records.map(r => handler.mapRecordToDisplay(r))
                    : records;

                console.log(`[V2 Unified] Found ${displayRecords.length} records`);
                res.json(displayRecords);
            } catch (error) {
                console.error(`Lỗi khi lấy dữ liệu ${loaiNCKH}:`, error);
                res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
            }
        },

        /**
         * Cập nhật bản ghi
         */
        edit: async (req, res) => {
            const { ID } = req.params;
            const userId = req.session?.userId || 1;
            const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

            if (!ID) {
                return res.status(400).json({ message: "Thiếu ID cần cập nhật." });
            }

            try {
                // Lấy dữ liệu cũ
                const oldData = await nckhService.getRecordById(ID);
                if (!oldData) {
                    return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
                }

                // Map dữ liệu từ request
                const updateData = {
                    phanLoai: req.body.PhanLoai || req.body.phanLoai,
                    tenCongTrinh: req.body.TenCongTrinh || req.body.tenCongTrinh,
                    maSo: req.body.MaSo || req.body.maSo,
                    tacGiaChinh: req.body.TacGiaChinh || req.body.tacGiaChinh,
                    danhSachThanhVien: req.body.DanhSachThanhVien || req.body.danhSachThanhVien,
                    tongSoTacGia: req.body.TongSoTacGia || req.body.tongSoTacGia || 0,
                    tongSoThanhVien: req.body.TongSoThanhVien || req.body.tongSoThanhVien || 0,
                    ngayNghiemThu: req.body.NgayNghiemThu || req.body.ngayNghiemThu,
                    ngayQuyetDinh: req.body.NgayQuyetDinh || req.body.ngayQuyetDinh,
                    ketQua: req.body.KetQua || req.body.ketQua,
                    khoa: req.body.Khoa || req.body.khoa,
                    soNamThucHien: req.body.SoNamThucHien || req.body.soNamThucHien || 1,
                    soDongTacGia: req.body.SoDongTacGia || req.body.soDongTacGia || 1,
                    daoTaoDuyet: req.body.DaoTaoDuyet !== undefined ? req.body.DaoTaoDuyet : req.body.daoTaoDuyet
                };

                // Cập nhật
                const result = await nckhService.updateRecord(ID, updateData);

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
                }

                // Ghi log nếu có thay đổi duyệt
                if (oldData.DaoTaoDuyet !== updateData.daoTaoDuyet) {
                    try {
                        const action = updateData.daoTaoDuyet === 1 ? 'Duyệt' : 'Bỏ duyệt';
                        await LogService.logChange(
                            userId,
                            userName,
                            `${action} NCKH V2`,
                            `${action} ${handler.displayName} ID: ${ID}`
                        );
                    } catch (logError) {
                        console.error("Lỗi khi ghi log:", logError);
                    }
                }

                res.status(200).json({
                    success: true,
                    message: "Cập nhật thành công!"
                });
            } catch (error) {
                console.error(`Lỗi khi cập nhật ${loaiNCKH} ID ${ID}:`, error);
                res.status(500).json({
                    success: false,
                    message: error.message || "Có lỗi xảy ra khi cập nhật."
                });
            }
        },

        /**
         * Xóa bản ghi
         */
        delete: async (req, res) => {
            const { ID } = req.params;
            const userId = req.session?.userId || 1;
            const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

            if (!ID) {
                return res.status(400).json({ message: "Thiếu ID cần xóa." });
            }

            try {
                // Lấy dữ liệu cũ để kiểm tra
                const oldData = await nckhService.getRecordById(ID);
                if (!oldData) {
                    return res.status(404).json({ message: "Không tìm thấy bản ghi." });
                }

                // Không cho xóa nếu đã duyệt
                if (oldData.DaoTaoDuyet === 1) {
                    return res.status(403).json({
                        success: false,
                        message: "Không thể xóa bản ghi đã được duyệt."
                    });
                }

                // Thực hiện xóa
                await nckhService.deleteRecord(ID);

                // Ghi log
                try {
                    await LogService.logChange(
                        userId,
                        userName,
                        'Xóa thông tin NCKH V2',
                        `Xóa ${handler.displayName}: "${oldData.TenCongTrinh}" (ID: ${ID})`
                    );
                } catch (logError) {
                    console.error("Lỗi khi ghi log:", logError);
                }

                res.status(200).json({
                    success: true,
                    message: "Xóa thành công!"
                });
            } catch (error) {
                console.error(`Lỗi khi xóa ${loaiNCKH} ID ${ID}:`, error);
                res.status(500).json({
                    success: false,
                    message: error.message || "Có lỗi xảy ra khi xóa."
                });
            }
        }
    };
};

// =====================================================
// TẠO CONTROLLERS CHO TẤT CẢ LOẠI NCKH
// =====================================================

const controllers = {};
Object.keys(nckhService.NCKH_TYPES).forEach(type => {
    controllers[type] = createController(type);
});

// =====================================================
// API QUY ĐỊNH SỐ GIỜ (CHO DROPDOWN)
// =====================================================

/**
 * Lấy quy định số giờ cho dropdown
 * @param {string} loaiNCKH - Loại NCKH từ URL param
 */
const getQuyDinhSoGio = async (req, res) => {
    const { loaiNCKH } = req.params;

    // Chuyển đổi từ route name sang NCKH type nếu cần
    const type = nckhService.ROUTE_TO_TYPE[loaiNCKH] || loaiNCKH;

    try {
        const results = await nckhService.getQuyDinhSoGioByLoai(type);
        res.json(results);
    } catch (error) {
        console.error(`Lỗi khi lấy quy định số giờ cho ${type}:`, error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu quy định" });
    }
};

// =====================================================
// DELETE UNIFIED (Cho route chung)
// =====================================================

/**
 * Xóa bản ghi (route chung không cần biết loại)
 */
const deleteRecordUnified = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần xóa." });
    }

    try {
        // Lấy dữ liệu cũ để kiểm tra
        const oldData = await nckhService.getRecordById(ID);
        if (!oldData) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi." });
        }

        // Không cho xóa nếu đã duyệt
        if (oldData.DaoTaoDuyet === 1) {
            return res.status(403).json({
                success: false,
                message: "Không thể xóa bản ghi đã được duyệt."
            });
        }

        // Thực hiện xóa
        await nckhService.deleteRecord(ID);

        // Ghi log
        try {
            const displayName = nckhService.NCKH_DISPLAY_NAMES[oldData.LoaiNCKH] || oldData.LoaiNCKH;
            await LogService.logChange(
                userId,
                userName,
                'Xóa thông tin NCKH V2',
                `Xóa ${displayName}: "${oldData.TenCongTrinh}" (ID: ${ID})`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Xóa thành công!"
        });
    } catch (error) {
        console.error(`Lỗi khi xóa ID ${ID}:`, error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi xóa."
        });
    }
};

/**
 * Cập nhật trạng thái duyệt (route chung)
 */
const updateApprovalUnified = async (req, res) => {
    const { ID } = req.params;
    const { DaoTaoDuyet, daoTaoDuyet, field, value } = req.body;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID." });
    }

    // Lấy giá trị duyệt từ nhiều nguồn có thể (backward compatibility)
    let approvalValue = DaoTaoDuyet ?? daoTaoDuyet ?? (field === 'DaoTaoDuyet' ? value : undefined);
    
    if (approvalValue === undefined) {
        return res.status(400).json({ message: "Thiếu trạng thái duyệt." });
    }

    // Convert to number
    approvalValue = parseInt(approvalValue) || 0;

    try {
        // Lấy dữ liệu cũ
        const oldData = await nckhService.getRecordById(ID);
        if (!oldData) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi." });
        }

        // Cập nhật
        await nckhService.updateApprovalStatus(ID, approvalValue);

        // Ghi log
        if (oldData.DaoTaoDuyet !== approvalValue) {
            try {
                const action = approvalValue === 1 ? 'Duyệt' : 'Bỏ duyệt';
                const displayName = nckhService.NCKH_DISPLAY_NAMES[oldData.LoaiNCKH] || oldData.LoaiNCKH;
                await LogService.logChange(
                    userId,
                    userName,
                    `${action} NCKH V2`,
                    `${action} ${displayName}: "${oldData.TenCongTrinh}" (ID: ${ID})`
                );
            } catch (logError) {
                console.error("Lỗi khi ghi log:", logError);
            }
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!"
        });
    } catch (error) {
        console.error(`Lỗi khi cập nhật duyệt ID ${ID}:`, error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra."
        });
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Factory function
    createController,

    // Pre-built controllers cho từng loại
    controllers,

    // Shortcuts cho từng loại
    DETAI_DUAN: controllers.DETAI_DUAN,
    BAIBAO: controllers.BAIBAO,
    SACHGIAOTRINH: controllers.SACHGIAOTRINH,
    GIAITHUONG: controllers.GIAITHUONG,
    SANGKIEN: controllers.SANGKIEN,
    DEXUAT: controllers.DEXUAT,
    HUONGDAN: controllers.HUONGDAN,
    HOIDONG: controllers.HOIDONG,

    // API chung
    getQuyDinhSoGio,
    deleteRecordUnified,
    updateApprovalUnified
};
