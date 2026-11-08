const lecturerReportService = require("../../services/nckh_v3/lecturerReport.service");
const lecturerDocxGenerator = require("../../services/nckh_v3/lecturerDocxGenerator");

class LecturerReportController {
  /**
   * Render the Lecturer Report export page.
   * GET /v3/nckh/xuat-bao-cao-ca-nhan
   */
  async renderPage(req, res) {
    try {
      res.render("nckh_v3/report_lecturer.ejs");
    } catch (error) {
      console.error("[NCKH V3] render report_lecturer page error:", error);
      res.status(500).send("Lỗi khi tải trang xuất báo cáo NCKH cá nhân");
    }
  }

  /**
   * Export a single lecturer's NCKH Word report.
   * GET /v3/nckh/bao-cao-ca-nhan/export/:lecturerId?namHocFrom=...&namHocTo=...&scope=...
   */
  async exportDocx(req, res) {
    try {
      const { lecturerId } = req.params;
      const { namHoc, namHocFrom, namHocTo, scope = "PREVIEW" } = req.query;

      if (!lecturerId) {
        return res.status(400).json({ success: false, message: "Thiếu mã giảng viên" });
      }

      const from = String(namHocFrom || namHoc || "").trim();
      const to = String(namHocTo || from).trim();

      if (!from) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
      }

      const reportData = await lecturerReportService.getLecturerReportData(
        lecturerId,
        { namHocFrom: from, namHocTo: to },
        scope
      );
      const buffer = await lecturerDocxGenerator.generateLecturerReport(reportData);

      const lecturerName = reportData.lecturer?.tenNhanVien || "GiangVien";
      const safeName = lecturerName
        .replace(/[*?:\\/\[\]]/g, "")
        .replace(/\s+/g, "_");
      const safePeriod = from === to
        ? from.replace(/\s+/g, "")
        : `${from}_den_${to}`.replace(/\s+/g, "");
      const filename = `ThongKe_NCKH_${safeName}_${safePeriod}.docx`;
      const encodedFilename = encodeURIComponent(filename);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      );

      res.send(buffer);
    } catch (error) {
      console.error("[NCKH V3] export lecturer docx error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || "Lỗi khi xuất file báo cáo Word",
        });
      }
    }
  }
}

module.exports = new LecturerReportController();
