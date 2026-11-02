const statsService = require("../../services/nckh_v3/stats.service");
const { STATS_SCOPE } = require("../../config/nckh_v3/statsScope");

const createStatsController = (scope = STATS_SCOPE.OFFICIAL) => {
  const renderPage = (_req, res) => {
    res.render("nckh_v3/stats_official.ejs", { statsScope: scope });
  };

  const getFilters = async (_req, res) => {
    try {
      const data = await statsService.getFilters();
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] stats filters error:", error);
      res.status(500).json({ success: false, message: error.message || "Không thể lấy bộ lọc" });
    }
  };

  const lecturerSummary = async (req, res) => {
    try {
      const { namHoc, namHocFrom, namHocTo, khoaId = "ALL", keyword = "" } = req.query;
      const data = await statsService.getLecturerSummary(namHoc || namHocFrom, khoaId, keyword, scope, null, { namHocFrom, namHocTo });
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] stats lecturer summary error:", error);
      res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê giảng viên" });
    }
  };

  const lecturerRecords = async (req, res) => {
    try {
      const { namHoc, namHocFrom, namHocTo } = req.query;
      const data = await statsService.getLecturerRecords(req.params.lecturerId, namHoc || namHocFrom, scope, { namHocFrom, namHocTo });
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] stats lecturer records error:", error);
      res.status(400).json({ success: false, message: error.message || "Không thể lấy công trình của giảng viên" });
    }
  };

  const facultySummary = async (req, res) => {
    try {
      const { namHoc, namHocFrom, namHocTo, khoaId = "ALL" } = req.query;
      const data = await statsService.getFacultySummary(namHoc || namHocFrom, khoaId, scope, { namHocFrom, namHocTo });
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] stats faculty summary error:", error);
      res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê khoa" });
    }
  };

  const facultyRecords = async (req, res) => {
    try {
      const { namHoc, namHocFrom, namHocTo } = req.query;
      const data = await statsService.getFacultyRecords(namHoc || namHocFrom, req.params.khoaId, scope, { namHocFrom, namHocTo });
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] stats faculty records error:", error);
      res.status(400).json({ success: false, message: error.message || "Không thể lấy công trình theo khoa" });
    }
  };

  const instituteSummary = async (req, res) => {
    try {
      const { namHoc, namHocFrom, namHocTo } = req.query;
      const data = await statsService.getInstituteSummary(namHoc || namHocFrom, scope, { namHocFrom, namHocTo });
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] stats institute summary error:", error);
      res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê học viện" });
    }
  };

  const instituteRecords = async (req, res) => {
    try {
      const { namHoc, namHocFrom, namHocTo, khoaId = "ALL", type = "ALL" } = req.query;
      const data = await statsService.getInstituteRecords(namHoc || namHocFrom, khoaId, type, scope, { namHocFrom, namHocTo });
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] stats institute records error:", error);
      res.status(400).json({ success: false, message: error.message || "Không thể lấy danh sách công trình học viện" });
    }
  };

  return { renderPage, getFilters, lecturerSummary, lecturerRecords, facultySummary, facultyRecords, instituteSummary, instituteRecords };
};

module.exports = {
  createStatsController,
};
