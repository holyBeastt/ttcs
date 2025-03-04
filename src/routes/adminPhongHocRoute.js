const express = require("express");
const router = express.Router();
const adminPhongHocController = require("../controllers/adminPhongHocController");

router.get("/adminPhongHoc", adminPhongHocController.showPhongHocPage);
router.post("/adminPhongHoc", adminPhongHocController.addPhongHoc);
router.put("/adminPhongHoc/:STT", adminPhongHocController.updatePhongHoc);
router.delete("/adminPhongHoc/:STT", adminPhongHocController.deletePhongHoc);
router.post("/checkPhongExistence", adminPhongHocController.checkPhongExistence);

module.exports = router;
