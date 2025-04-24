const express = require("express");
const router = express.Router();

const gvmListController = require("../controllers/gvmListController"); // Định nghĩa biến gvmListController

// Đào tạo
router.get("/gvmList", gvmListController.getGvmList);
router.get("/api/gvm", gvmListController.getGvm);
//router.get("/gvm/export-excel", gvmListController.exportGvmToExcel);// router.get("/khoaCNTT", getGvmListCNTT);
// router.get("/api/gvmKhoaCNTT", getGvmCNTT);

// Danh sách đã dừng giảng dạy
router.get(
  "/api/gvm/stopped-teaching-list/site",
  gvmListController.getStoppedTeachingListSite
);

router.get(
  "/api/gvm/stopped-teaching-list/data",
  gvmListController.getStoppedTeachingListData
);

router.put(
  "/api/gvm/stopped-teaching-list/update",
  gvmListController.updateStoppedTeaching
);

// =================================================================
// Danh sách chưa duyệt
router.get(
  "/api/gvm/waiting-list/render",
  gvmListController.getWaitingListSite
);

// API lấy data của danh sách chờ duyệt
router.get(
  "/api/gvm/waiting-list/data",
  gvmListController.getWaitingListToRender
);

// API lấy số lượng giảng viên mời chưa duyêt
router.get(
  "/api/gvm/waiting-list/unapproved",
  gvmListController.getWaitingCountUnapproved
);

// Cập nhật duyệt
router.put("/api/gvm/waiting-list/update", gvmListController.updateWaitingList);

// Export danh sách giảng viên mời
router.post(
  "/api/gvm/waiting-list/export",
  gvmListController.exportWaitingList
);

// Danh sách đã duyệt
router.get(
  "/api/gvm/checked-list/render",
  gvmListController.getCheckedListSite
);

// API lấy data của danh sách đã duyệt
router.get(
  "/api/gvm/checked-list/data",
  gvmListController.getCheckedListToRender
);

// API cập nhật bản đã duyệt
router.put(
  "/api/gvm/checked-list/update",
  gvmListController.unCheckedLecturers
);

router.post(
  "/api/gvm/checked-list/export",
  gvmListController.exportCheckedList
);

module.exports = router;
