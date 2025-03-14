const express = require("express");
const { resetDatabase, upload, backupAndDownload, listBackupFiles, addToDatabase, executeSQLQuery } = require("../controllers/backupController");

const router = express.Router();
router.get("/backup", backupAndDownload);
router.get("/uploadBackup", (req, res) => {
    res.render("adminBackup")});
router.get("/list-backups", listBackupFiles);

router.post("/reset-database", upload.single("file"), resetDatabase);
router.post("/addtodatabase", upload.single("file"), addToDatabase);
router.post("/executesql", executeSQLQuery);


// Route phục vụ file backup
// router.get("/download/:filename", getfile);


module.exports = router;
