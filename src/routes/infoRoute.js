const express = require("express");
const router = express.Router();

const obj = require("../controllers/teachingInfoController"); //
const obj2 = require("../controllers/getTableDBController"); //
const obj3 = require("../controllers/importController"); //

// render site info và info2
router.get("/info", obj.getTeachingInfo1);
router.get("/info2", obj.getTeachingInfo2);

// thông tin đầy đủ của bảng quy chuẩn
router.post("/thong-tin-giang-day", (req, res) => obj.renderInfo(req, res));

// thông tin bảng quy chuẩn dùng cho site quy chuẩn chính thức
router.post("/quy-chuan-chinh-thuc", (req, res) => obj2.getTableQC(req, res));

// thông tin giảng viên cơ hữu trong trường
router.get("/gv-cohuu", (req, res) => obj.getNameGV(req, res));

// thông tin giảng viên mời trong trường
router.get("/gv-moi", (req, res) => obj.getKhoaAndNameGvmOfKhoa(req, res));

// cập nhật khi duyệt
router.post("/check-teaching", (req, res) => obj3.updateQC(req, res));

// route dùng cho phần điền tên giảng viên và bộ môn
router.post("/update-name", (req, res) => obj3.capNhatTen_BoMon(req, res));

// chèn tất cả ngày bắt đầu, ngày kết thúc
router.post("/updateDateAll", (req, res) => obj3.updateDateAll(req, res));

// check duyệt của cac phòng ban
router.post("/phong-ban-duyet", (req, res) => obj3.phongBanDuyet(req, res));

// cập nhật tất cả dữ liệu
router.get("/update-all-info", (req, res) =>
  obj3.updateAllTeachingInfo(req, res)
);

// lấy tất cả dữ liệu bộ môn
router.post("/bo-mon", (req, res) => {
  obj.getBoMon(req, res);
});

// Lấy dữ liệu phòng ban
router.get("/api/get-khoa-list", obj.getKhoaList);

// lấy dữ liệu bộ môn của giảng viên mời
router.get("/bo-mon-theo-gv", (req, res) => {
  obj2.getBoMon2(req, res);
});

// phần note
router.post("/savenote", obj.SaveNote);
router.post("/donenote", obj.DoneNote);

module.exports = router;
