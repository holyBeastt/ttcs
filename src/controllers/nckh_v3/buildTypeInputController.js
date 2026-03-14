const buildTypeInputController = (service, successLabel) => {
  const getUserContext = (req) => ({
    userId: req.session?.userId || 1,
    userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
  });

  const getMetadata = async (req, res) => {
    try {
      const khoaId = req.query.khoaId || "ALL";
      const data = await service.getMetadata(khoaId);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] getMetadata error:", error);
      res.status(500).json({ success: false, message: error.message || "Không thể lấy metadata" });
    }
  };

  const create = async (req, res) => {
    try {
      const result = await service.create(req.body, getUserContext(req));
      res.status(201).json({ success: true, message: `Thêm ${successLabel} thành công`, data: result });
    } catch (error) {
      console.error("[NCKH V3] create error:", error);
      res.status(400).json({ success: false, message: error.message || `Không thể thêm ${successLabel}` });
    }
  };

  const update = async (req, res) => {
    try {
      const result = await service.update(req.params.id, req.body, getUserContext(req));
      res.json({ success: true, message: `Cập nhật ${successLabel} thành công`, data: result });
    } catch (error) {
      console.error("[NCKH V3] update error:", error);
      res.status(400).json({ success: false, message: error.message || `Không thể cập nhật ${successLabel}` });
    }
  };

  const remove = async (req, res) => {
    try {
      const result = await service.remove(req.params.id, getUserContext(req));
      res.json({ success: true, message: `Xóa ${successLabel} thành công`, data: result });
    } catch (error) {
      console.error("[NCKH V3] remove error:", error);
      res.status(400).json({ success: false, message: error.message || `Không thể xóa ${successLabel}` });
    }
  };

  const list = async (req, res) => {
    try {
      const { namHoc, khoaId } = req.params;
      const data = await service.list(namHoc, khoaId);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] list error:", error);
      res.status(500).json({ success: false, message: error.message || `Không thể lấy danh sách ${successLabel}` });
    }
  };

  const detail = async (req, res) => {
    try {
      const data = await service.getById(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Không tìm thấy công trình" });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] detail error:", error);
      res.status(500).json({ success: false, message: error.message || "Không thể lấy chi tiết" });
    }
  };

  return {
    getMetadata,
    create,
    update,
    remove,
    list,
    detail,
  };
};

module.exports = buildTypeInputController;
