/**
 * NCKH V2 - Admin Regulation Controller
 * Controller xử lý các quy định định mức NCKH V2
 */

const nckhService = require("../../services/nckhV2Service");
const LogService = require("../../services/logService");

/**
 * Hiển thị trang quản lý quy định
 */
const getAdminQuyDinhPage = async (req, res) => {
    try {
        const allQuyDinh = await nckhService.getAllQuyDinhSoGio();
        
        // Nhóm dữ liệu theo loại NCKH
        const groupedData = {};
        Object.keys(nckhService.NCKH_TYPES).forEach(type => {
            groupedData[type] = allQuyDinh.filter(q => q.LoaiNCKH === type);
        });

        res.render("nckh.adminQuyDinhSoGio.ejs", { 
            groupedData,
            nckhTypes: nckhService.NCKH_TYPES,
            displayNames: nckhService.NCKH_DISPLAY_NAMES
        });
    } catch (error) {
        console.error("Lỗi khi tải trang quản lý quy định:", error);
        res.status(500).send("Lỗi hệ thống khi tải trang quản lý quy định.");
    }
};

/**
 * Lưu mới hoặc cập nhật quy định
 */
const saveQuyDinhSoGio = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    try {
        const { id, loaiNCKH, phanLoai, soGio, moTa } = req.body;

        if (!loaiNCKH || !phanLoai || soGio === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu dữ liệu bắt buộc." });
        }

        const result = await nckhService.manageQuyDinhSoGio({
            id: id ? parseInt(id) : null,
            loaiNCKH,
            phanLoai,
            soGio: parseFloat(soGio),
            moTa
        });

        // Ghi log
        const action = id ? "Cập nhật" : "Thêm mới";
        try {
            await LogService.logChange(
                userId,
                userName,
                'Quản lý quy định NCKH V2',
                `${action} quy định: ${phanLoai} (${nckhService.NCKH_DISPLAY_NAMES[loaiNCKH] || loaiNCKH})`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: `${action} quy định thành công!`,
            id: result.id
        });
    } catch (error) {
        console.error("Lỗi khi lưu quy định:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi lưu quy định." });
    }
};

/**
 * Bật/Tắt trạng thái hoạt động
 */
const toggleQuyDinhStatus = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (!id || isActive === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin." });
        }

        await nckhService.toggleQuyDinhStatus(parseInt(id), parseInt(isActive));

        // Ghi log
        const statusText = parseInt(isActive) === 1 ? "Bật" : "Tắt";
        try {
            await LogService.logChange(
                userId,
                userName,
                'Quản lý quy định NCKH V2',
                `${statusText} trạng thái quy định ID: ${id}`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({ success: true, message: "Cập nhật trạng thái thành công!" });
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái quy định:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi cập nhật trạng thái." });
    }
};

module.exports = {
    getAdminQuyDinhPage,
    saveQuyDinhSoGio,
    toggleQuyDinhStatus
};
