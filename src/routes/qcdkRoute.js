const express = require("express");
const router = express.Router();
const qcdk = require("../controllers/moiGiangQCDKController"); // Import hàm xử lý từ controller
const role = require("../controllers/middlewares"); // Check role

// render site quy chuẩn dự kiến
router.get('/tableTam', (req, res) => {
  res.render('tableTam'); 
});

// router.get("/tableTam", (req, res) => {
//   // Gọi middleware kiểm tra quyền
//   const hasPermission = role.checkRolesRenderSiteQCDK(req);
//   // Kiểm tra kết quả và render trang phù hợp
//   if (hasPermission) {
//     res.render("tableTam"); // Render trang cho người có quyền
//   } else {
//     res.render("tableTam2"); // Render trang mặc định nếu không có quyền
//   }
// });


// render bảng theo khoa đợt kì năm
router.post("/qcdk", (req, res) => qcdk.getTableTam(req, res));

// xóa toàn bộ bảng theo khoa đợt kì năm
router.post("/xoa-qcdk", (req, res) => {
  qcdk.deleteTableTam(req, res)
});

// cập nhật lại toàn bộ bảng theo khoa đợt kì năm
router.post("/update-qcdk", (req, res) => {
  qcdk.updateTableTam(req, res)
});

// cập nhật 1 dòng
router.put("/update-row/:id", async (req, res) => {
  qcdk.updateRow(req, res)
});

// xóa 1 dòng
router.delete("/delete-row/:id", async (req, res) => {
  qcdk.deleteRow(req, res);
});

// thêm 1 dòng
router.post("/add-row", async (req, res) => {
  qcdk.addNewRow(req, res);
});

module.exports = router;
