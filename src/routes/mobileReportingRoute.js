const express = require("express");

const verifyToken = require("../middlewares/jwtMiddleware");
const controller = require("../controllers/mobileReportingController");

const router = express.Router();

// This router is intentionally separate from legacy reporting paths so mobile
// authorization and preview calculations cannot change web behavior.
router.use(verifyToken);

router.get("/nckh/stats/filters", controller.nckhFilters);
router.get("/nckh/stats/giang-vien", controller.nckhLecturerSummary);
router.get("/nckh/stats/giang-vien/:lecturerId/cong-trinh", controller.nckhLecturerRecords);
router.get("/nckh/stats/khoa", controller.nckhFacultySummary);
router.get("/nckh/stats/khoa/:khoaId/cong-trinh", controller.nckhFacultyRecords);

router.get("/vuot-gio/me", controller.workloadMe);
router.get("/vuot-gio/me/snapshot", controller.workloadMeSnapshot);
router.get("/vuot-gio/khoa", controller.workloadFaculty);
router.get("/vuot-gio/khoa/preview", controller.workloadFacultyPreview);

module.exports = router;
