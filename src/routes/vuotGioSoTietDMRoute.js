const express = require("express");
const router = express.Router();
const {
    renderSoTietDM,
    getSoTietDM,
    createSoTietDM,
    updateSoTietDM
} = require("../controllers/vuotGioSoTietDMController");

router.get("/soTietDM", renderSoTietDM);
router.get("/api/sotietDM", getSoTietDM);
router.post("/api/sotietDM", createSoTietDM);
router.put("/api/update-dinh-muc/:nam", updateSoTietDM);

module.exports = router;
