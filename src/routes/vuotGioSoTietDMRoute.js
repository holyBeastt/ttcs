const express = require("express");
const router = express.Router();
const {
    renderSoTietDM,
    updateSoTietDM
} = require("../controllers/vuotGioSoTietDMController");

router.get("/soTietDM", renderSoTietDM);
router.put("/api/update-dinh-muc", updateSoTietDM);

module.exports = router;
