const express = require("express");
const router = express.Router();
const adminPhongHocController = require("../controllers/adminPhongHocController");

// Routes cho phòng học
router.get("/adminPhongHoc", adminPhongHocController.showPhongHocPage);
router.post("/adminPhongHoc", adminPhongHocController.addPhongHoc);
router.put("/adminPhongHoc/:STT", adminPhongHocController.updatePhongHoc);
router.delete("/adminPhongHoc/:STT", adminPhongHocController.deletePhongHoc);
router.post("/checkPhongExistence", adminPhongHocController.checkPhongExistence);

// Routes cho tòa nhà
router.get("/toaNha", adminPhongHocController.showToaNhaPage);
router.post("/toaNha", adminPhongHocController.addToaNha);
router.put("/toaNha/:id", adminPhongHocController.updateToaNha);
router.delete("/toaNha/:id", adminPhongHocController.deleteToaNha);
router.post("/checkToaNhaExistence", adminPhongHocController.checkToaNhaExistence);

module.exports = router;
