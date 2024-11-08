const express = require("express");
const router = express.Router();
const obj = require("../controllers/teachingInfoController"); // Import hàm xử lý file từ controller
const obj2 = require("../controllers/getTableDBController"); // Import hàm xử lý file từ controller
const obj3 = require("../controllers/importController"); // Import hàm xử lý file từ controller

// render site info
router.get("/info", obj.getTeachingInfo1);
router.get("/info2", obj.getTeachingInfo2);
// router.get('/info', (req, res) => {
//   res.render('teachingInfo');
// });

// router.get('/info2', (req, res) => {
//   res.render('teachingInfo2');
// });

// Đổi từ GET sang POST
router.post("/teaching-info", (req, res) => obj.renderInfo(req, res));

router.post("/quy-chuan-chinh-thuc", (req, res) => obj2.getTableQC(req, res));

// gọi hàm lấy dữ liệu tên giảng giảng viên mời
router.get("/index/name-gvm", (req, res) => obj.getNameGV(req, res));

router.get("/index/name-gvm-khoa", (req, res) =>
  obj.getKhoaAndNameGvmOfKhoa(req, res)
);

router.post("/check-teaching", (req, res) => obj3.updateQC(req, res));

router.post("/phong-ban-duyet", (req, res) => obj3.phongBanDuyet(req, res));

router.get("/update-all-info", (req, res) =>
  obj3.updateAllTeachingInfo(req, res)
);

// router.post("/bo-mon", (req, res) => obj.getBoMon(req, res));
router.post("/bo-mon", (req, res) => {
  obj.getBoMon(req, res);
});

router.get("/bo-mon-theo-gv", (req, res) => {
  obj2.getBoMon2(req, res);
});

//Lưu note
router.post("/savenote", obj.SaveNote);
router.post("/donenote", obj.DoneNote);

module.exports = router;
