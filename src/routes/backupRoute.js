const express = require("express");
const { upload, backupAndDownload, listBackupFiles, addToDatabase, executeSQLQuery } = require("../controllers/backupController");

const router = express.Router();
router.get("/backup", backupAndDownload);
router.get("/uploadBackup", (req, res) => {
    res.render("adminBackup")});
router.get("/list-backups", listBackupFiles);

// [DEPRECATED] Reset database đã bị vô hiệu hóa
router.post("/reset-database", (req, res) => {
    res.status(410).json({ success: false, message: "⚠️ Chức năng Reset Database đã bị deprecated và không còn khả dụng." });
});
router.post("/addtodatabase", upload.single("file"), addToDatabase);
router.post("/executesql", executeSQLQuery);


// Route phục vụ file backup
// router.get("/download/:filename", getfile);


module.exports = router;
