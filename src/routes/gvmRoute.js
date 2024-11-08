const express = require('express');
const obj = require('../controllers/getTableDBController'); // Import hàm xử lý file từ controller
const obj2 = require('../controllers/importGvmController');
const router = express.Router();

// Route GET để render trang upload file
router.get('/tableQC', (req, res) => {
  res.render('tableQC'); // render file 'tableQC.ejs' trong thư mục 'views'
});

router.get('/tableTam', (req, res) => {
  res.render('tableTam'); // render file 'tableQC.ejs' trong thư mục 'views'
});

// Route để lấy dữ liệu từ bảng quy chuẩn
router.get('/bang-tam', async (req, res) => {
  try {
    const data = await obj.getTableTam(); // Gọi hàm lấy dữ liệu
    res.json(data); // Trả về dữ liệu dưới dạng JSON
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy dữ liệu.' }); // Trả về lỗi nếu có
  }
});

// Route để lấy dữ liệu từ bảng quy chuẩn
router.get('/bang-qc', async (req, res) => {
  try {
    const data = await obj.getTableQC(); // Gọi hàm lấy dữ liệu
    res.json(data); // Trả về dữ liệu dưới dạng JSON
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy dữ liệu.' }); // Trả về lỗi nếu có
  }
});


// Route POST để cập nhật dữ liệu vào bảng quy chuẩn
router.post('/update-gv-moi', async (req, res) => {
  const dataToUpdate = req.body; // Nhận dữ liệu từ client

  try {
    await obj2.updateTableQC(dataToUpdate); // Gọi hàm cập nhật dữ liệu
    res.status(200).json({ message: 'Cập nhật thành công' }); // Phản hồi thành công
  } catch (error) {
    console.error('Lỗi khi cập nhật dữ liệu:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật dữ liệu.' }); // Trả về lỗi nếu có
  }
});

module.exports = router;
