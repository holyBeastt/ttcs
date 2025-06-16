const express = require("express");
const router = express.Router();
const chinhSuaDoAnController = require("../controllers/chinhSuaDoAnController");
const multer = require('multer');

// Trang chính
router.get("/chinhSuaDoAn", (req, res) => {
  res.render("chinhSuaDoAn", { content: null });
});

// API endpoints
router.post("/get-do-an-chinh-thuc", chinhSuaDoAnController.getDoAnChinhThuc);
router.post("/request-do-an-edit", chinhSuaDoAnController.requestDoAnEdit);
router.post("/get-do-an-edit-requests", chinhSuaDoAnController.getDoAnEditRequests);
router.post("/approve-do-an-edit", chinhSuaDoAnController.updateDoAnApproval);
router.post("/update-do-an-edit", chinhSuaDoAnController.applyDoAnEdit);
router.post("/export-adjusted-do-an", chinhSuaDoAnController.exportAdjustedDoAn);

module.exports = router;