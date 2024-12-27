const express = require("express");
const router = express.Router();
const { getExportXlsx } = require("../controllers/export");

router.get("/", getExportXlsx);

module.exports = router;
