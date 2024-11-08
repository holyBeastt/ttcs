const express = require("express");
const multer = require("multer");
const obj = require("../controllers/importController"); // Import hàm xử lý file từ controller
const obj2 = require("../controllers/getTableDBController"); // Import hàm xử lý file từ controller
const role = require("../controllers/middlewares"); // Check role
const getMainHTML = require("../controllers/homeController");
const { getNamHoc } = require("../controllers/admin");
// const test = require('../controllers/fileController');
const app = express();
const router = express.Router();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
const createConnection = require("../config/databaseAsync");

// Cấu hình multer để lưu file tạm thời trong thư mục 'uploads'
const upload = multer({
  dest: "uploads/", // Đường dẫn thư mục lưu trữ file
});

// render trang import
router.get("/import", role.checkDaotaoRoleThiHanh, getMainHTML.getImport);

// Route POST để xử lý upload file Excel
router.post(
  "/import",
  role.checkDaotaoRoleThiHanh,
  upload.single("excelFile"),
  obj.handleUploadAndRender
);

// Định tuyến cho POST request tới /index / save - data
router.post("/save-data", role.checkDaotaoRoleThiHanh, async (req, res) => {
  try {
    // Gọi hàm xử lý dữ liệu import
    const result = await obj.importTableTam(req.body);

    // Kiểm tra kết quả trả về và phản hồi cho client
    if (result === true) {
      res
        .status(200)
        .json({ success: true, message: "Dữ liệu đã được lưu thành công!" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Lưu dữ liệu thất bại!" });
    }
  } catch (error) {
    console.error("Lỗi server:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi trong quá trình lưu dữ liệu!",
      error,
    });
  }
});

// Định tuyến cho POST request tới /index / save - data
// router.post("/ban-hanh", (req, res) => obj.importTableQC(req.body, res));

// Định tuyến cho POST request tới /index / save - data
router.post("/ban-hanh", role.checkDaotaoRoleThiHanh, async (req, res) => {
  try {
    // Gọi hàm xử lý dữ liệu import
    const result = await obj.importTableQC(req.body);

    // Kiểm tra kết quả trả về và phản hồi cho client
    if (result == true) {
      res.status(200).json({ success: true, message: "Ban hành thành công" });
    } else {
      res.status(500).json({ success: false, message: "Ban hành thất bại" });
    }
  } catch (error) {
    console.error("Lỗi server:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi trong quá trình lưu dữ liệu!",
      error,
    });
  }
});

// kiểm tra tồn tại dữ liệu ban hành
// router.post("/kiem-tra", (req, res) => obj2.getTableTam(req, res));


// Định tuyến cho POST request tới /index / save - data
router.post("/viewtam", role.checkDaotaoRoleThiHanh, async (req, res) => {
  try {
    // Gọi hàm xử lý dữ liệu import
    const result = await obj.importTableQC(req.body);

    // Kiểm tra kết quả trả về và phản hồi cho client
    if (result === true) {
      res
        .status(200)
        .json({ success: true, message: "Dữ liệu đã được lưu thành công!" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Lưu dữ liệu thất bại!" });
    }
  } catch (error) {
    console.error("Lỗi server:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi trong quá trình lưu dữ liệu!",
      error,
    });
  }
});

router.post("/get-table-tam", (req, res) => obj2.getTableTam(req, res));

router.post("/kiem-tra-file", role.checkDaotaoRoleThiHanh, obj.checkFile);

router.post("/xoa-file", role.checkDaotaoRoleThiHanh, obj.deleteFile);

router.post("/submitData2", obj.submitData2);

router.post('/update/:NamHoc/:Ki/:Dot', obj.updateBanHanh);


module.exports = router;
