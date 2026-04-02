const recordService = require("../../services/nckh_v3/record.service");

const list = async (req, res) => {
  try {
    const { namHoc, khoaId = "ALL" } = req.query;
    const data = await recordService.list(namHoc, khoaId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] list unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy danh sách" });
  }
};

const detail = async (req, res) => {
  try {
    const data = await recordService.detail(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy công trình" });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] detail unified error:", error);
    res.status(500).json({ success: false, message: error.message || "Không thể lấy chi tiết" });
  }
};

const remove = async (req, res) => {
  try {
    const userContext = {
      userId: req.session?.userId || 1,
      userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
    };
    const result = await recordService.removeRecord(req.params.id, userContext);
    res.json({ success: true, message: "Xóa công trình thành công", data: result });
  } catch (error) {
    console.error("[NCKH V3] remove unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể xóa công trình" });
  }
};

const approveKhoa = async (req, res) => {
  try {
    const data = await recordService.updateKhoaApproval(req.params.id, req.body.khoaDuyet);
    res.json({ success: true, message: "Cập nhật duyệt khoa thành công", data });
  } catch (error) {
    console.error("[NCKH V3] approveKhoa unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể cập nhật duyệt khoa" });
  }
};

const approveVien = async (req, res) => {
  try {
    const data = await recordService.updateVienApproval(req.params.id, req.body.vienNcDuyet);
    res.json({ success: true, message: "Cập nhật duyệt viện thành công", data });
  } catch (error) {
    console.error("[NCKH V3] approveVien unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể cập nhật duyệt viện" });
  }
};

const getFilters = async (_req, res) => {
  try {
    const data = await recordService.getFilters();
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] getFilters unified error:", error);
    res.status(500).json({ success: false, message: error.message || "Không thể lấy bộ lọc" });
  }
};

const bulkApprovals = async (req, res) => {
  try {
    const { updates } = req.body;
    const result = await recordService.updateBulkApprovals(updates);
    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    console.error("[NCKH V3] bulkApprovals error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể cập nhật duyệt" });
  }
};

module.exports = {
  list,
  detail,
  remove,
  approveKhoa,
  approveVien,
  bulkApprovals,
  getFilters,
};
