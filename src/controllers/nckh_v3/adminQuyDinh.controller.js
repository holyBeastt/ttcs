const LogService = require("../../services/logService");
const quyDinhService = require("../../services/nckh_v3/quyDinh.service");
const { NCKH_TYPE_OPTIONS } = require("../../config/nckh_v3/types");

const nckhTypes = (NCKH_TYPE_OPTIONS || []).reduce((acc, item) => {
  if (!item || !item.loaiNckh) return acc;
  acc[item.loaiNckh] = item.loaiNckh;
  return acc;
}, {});

const displayNames = (NCKH_TYPE_OPTIONS || []).reduce((acc, item) => {
  if (!item || !item.loaiNckh) return acc;
  acc[item.loaiNckh] = item.label || item.loaiNckh;
  return acc;
}, {});

const getUserContext = (req) => ({
  userId: req.session?.userId || 1,
  userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
});

const getAdminQuyDinhPage = async (req, res) => {
  try {
    const allQuyDinh = await quyDinhService.getAllQuyDinhSoGio();

    const groupedData = {};
    Object.keys(nckhTypes).forEach((type) => {
      groupedData[type] = allQuyDinh.filter((item) => String(item.LoaiNCKH || "") === String(type));
    });

    res.render("nckh.adminQuyDinhSoGio.ejs", {
      groupedData,
      nckhTypes,
      displayNames,
    });
  } catch (error) {
    console.error("[NCKH V3] Lỗi tải trang quản lý quy định:", error);
    res.status(500).send("Lỗi hệ thống khi tải trang quản lý quy định NCKH V3.");
  }
};

const saveQuyDinhSoGio = async (req, res) => {
  const user = getUserContext(req);

  try {
    const {
      id,
      loaiNCKH,
      loaiNckh,
      loai_nckh,
      phanLoai,
      phan_loai,
      tenQuyDinh,
      ten_quydinh,
      soGio,
      so_gio,
      soTiet,
      so_tiet,
      moTa,
      mo_ta,
      thuTu,
      thu_tu,
    } = req.body;

    const resolvedLoaiNCKH = loaiNCKH ?? loaiNckh ?? loai_nckh;
    const resolvedPhanLoai = phanLoai ?? phan_loai ?? tenQuyDinh ?? ten_quydinh;
    const resolvedSoGio = soGio ?? so_gio ?? soTiet ?? so_tiet;
    const resolvedMoTa = moTa ?? mo_ta ?? null;
    const resolvedThuTu = thuTu ?? thu_tu;

    if (!resolvedLoaiNCKH || !resolvedPhanLoai || resolvedSoGio === undefined || resolvedSoGio === null) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu bắt buộc." });
    }

    const payload = {
      id: id ? Number(id) : null,
      loaiNCKH: String(resolvedLoaiNCKH).trim(),
      phanLoai: String(resolvedPhanLoai).trim(),
      soGio: Number(resolvedSoGio),
      moTa: resolvedMoTa,
      thuTu: resolvedThuTu !== undefined && resolvedThuTu !== null ? Number(resolvedThuTu) : undefined,
    };

    if (!Number.isInteger(payload.soGio) || payload.soGio < 0) {
      return res.status(400).json({ success: false, message: "Số tiết không hợp lệ." });
    }

    if (payload.thuTu !== undefined && (!Number.isInteger(payload.thuTu) || payload.thuTu < 0)) {
      return res.status(400).json({ success: false, message: "Thứ tự không hợp lệ." });
    }

    const result = await quyDinhService.manageQuyDinhSoGio(payload);
    const action = payload.id ? "Cập nhật" : "Thêm mới";

    try {
      await LogService.logChange(
        user.userId,
        user.userName,
        "Quản lý quy định NCKH V3",
        `${action} quy định: ${payload.phanLoai} (${displayNames[payload.loaiNCKH] || payload.loaiNCKH})`
      );
    } catch (logError) {
      console.error("[NCKH V3] Lỗi ghi log:", logError);
    }

    return res.status(200).json({
      success: true,
      message: `${action} quy định thành công!`,
      id: result.id,
    });
  } catch (error) {
    console.error("[NCKH V3] Lỗi lưu quy định:", error);
    return res.status(500).json({ success: false, message: error.message || "Lỗi hệ thống khi lưu quy định." });
  }
};

const toggleQuyDinhStatus = async (req, res) => {
  const user = getUserContext(req);

  try {
    const { id } = req.params;
    const { isActive, trangThai, trang_thai } = req.body;
    const resolvedStatus = isActive ?? trangThai ?? trang_thai;

    if (!id || resolvedStatus === undefined) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin." });
    }

    await quyDinhService.toggleQuyDinhStatus(Number(id), Number(resolvedStatus));

    try {
      const statusText = Number(resolvedStatus) === 1 ? "Bật" : "Tắt";
      await LogService.logChange(
        user.userId,
        user.userName,
        "Quản lý quy định NCKH V3",
        `${statusText} trạng thái quy định ID: ${id}`
      );
    } catch (logError) {
      console.error("[NCKH V3] Lỗi ghi log:", logError);
    }

    return res.status(200).json({ success: true, message: "Cập nhật trạng thái thành công!" });
  } catch (error) {
    console.error("[NCKH V3] Lỗi cập nhật trạng thái quy định:", error);
    return res.status(500).json({ success: false, message: error.message || "Lỗi hệ thống khi cập nhật trạng thái." });
  }
};

module.exports = {
  getAdminQuyDinhPage,
  saveQuyDinhSoGio,
  toggleQuyDinhStatus,
};
