const express = require("express");
const { backupDatabase, getfile, backupAndDownload } = require("../controllers/backupController");

const router = express.Router();
router.get("/backup", backupAndDownload);


// Route phục vụ file backup
// router.get("/download/:filename", getfile);


module.exports = router;
