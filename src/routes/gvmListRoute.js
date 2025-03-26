const express = require("express");
const router = express.Router();

const gvmListController = require("../controllers/gvmListController"); // Định nghĩa biến gvmListController

// Đào tạo
router.get("/gvmList", gvmListController.getGvmList);
router.get("/api/gvm", gvmListController.getGvm);
//router.get("/gvm/export-excel", gvmListController.exportGvmToExcel);// router.get("/khoaCNTT", getGvmListCNTT);
// router.get("/api/gvmKhoaCNTT", getGvmCNTT);

// Danh sách chưa duyệt
router.get(
  "/api/gvm/waiting-list/render",
  gvmListController.getWaitingListSite
);

// Danh sách đã duyệt
router.get(
  "/api/gvm/checked-list/render",
  gvmListController.getCheckedListSite
);

// API lấy data của danh sách chờ duyệt
router.get("/api/gvm/waiting-list/data", gvmListController.getWaitingListData);

// API lấy data của danh sách đã duyệt
router.get("/api/gvm/checked-list/data", gvmListController.getCheckedListData);

// API lấy số lượng giảng viên mời chưa duyêt
router.get(
  "/api/gvm/waiting-list/unapproved",
  gvmListController.getWaitingCountUnapproved
);

// Cập nhật duyệt
router.put("/api/gvm/waiting-list/update", gvmListController.updateWaitingList);

module.exports = router;
