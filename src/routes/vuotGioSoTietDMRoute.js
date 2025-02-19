const express = require("express");
const router = express.Router();
const {
    renderSoTietDM,
    updateSoTietDM,
    getSoTietDM
} = require("../controllers/vuotGioSoTietDMController");

router.get("/soTietDM", renderSoTietDM);
router.put("/api/update-dinh-muc", updateSoTietDM);
router.get("/getSoTietDM/:TenNhanVien", getSoTietDM);

module.exports = router;
