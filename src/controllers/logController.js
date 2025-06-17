const createConnection = require("../config/databasePool");
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

// src/controllers/logController.js
const logController = {
  // Phương thức để hiển thị trang log
  showLogTable: (req, res) => {
    res.render("log"); // Render trang log.ejs
  },

  // Phương thức để lấy dữ liệu log
  getLogData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM lichsunhaplieu ORDER BY MaLichSuNhap DESC";
      const [result] = await connection.query(query);
      const lichsunhaplieu = result;

      // Trả về dữ liệu dưới dạng JSON
      res.json(lichsunhaplieu);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  },

  // Phương thức để lấy dữ liệu năm học
  getNamHocData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM namhoc"; // Giả sử bảng là namhoc
      const [result] = await connection.query(query);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để lấy dữ liệu khoa từ bảng phongban
  getKhoaData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT MaPhongBan FROM phongban"; // Truy vấn từ bảng phongban
      const [result] = await connection.query(query);
      
      // Sử dụng Set để loại bỏ các giá trị trùng lặp
      const uniqueDepartments = new Set();
      result.forEach(item => {
        uniqueDepartments.add(item.MaPhongBan); // Thêm MaPhongBan vào Set
      });

      // Chuyển Set thành mảng để trả về
      const uniqueDepartmentsArray = Array.from(uniqueDepartments).map(department => {
        return { MaPhongBan: department }; // Định dạng lại nếu cần
      });

      res.json(uniqueDepartmentsArray);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để lấy dữ liệu nhân viên
  getNhanVienData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT id_User, MaPhongBan FROM nhanvien"; // Truy vấn từ bảng nhanvien
      const [result] = await connection.query(query);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để lấy dữ liệu LoaiThongTin
  getLoaiThongTinData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT DISTINCT LoaiThongTin FROM lichsunhaplieu ORDER BY LoaiThongTin";
      const [result] = await connection.query(query);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để tự động export log ra file Word
  autoExportLog: async () => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM lichsunhaplieu ORDER BY ThoiGianThayDoi DESC";
      const [result] = await connection.query(query);

      if (result.length === 0) return;

      // Tạo thư mục logs nếu chưa tồn tại
      const logDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Tạo tên file theo tháng/năm hiện tại
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
      const fileName = `Log_${monthNames[month - 1]}_${year}.docx`;
      const filePath = path.join(logDir, fileName);

      // Tạo tài liệu Word
      const doc = new Document({
        sections: [
          {
            children: [
              // Tiêu đề
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Bảng Lịch Sử Nhập Liệu (${monthNames[month - 1]}/${year})`,
                    font: "Times New Roman",
                    size: 36, // Font size 18pt (36 half-points)
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER, // Căn giữa
                spacing: { after: 200 },
              }),
              // Dữ liệu log dưới dạng văn bản
              ...result.map((item, index) => new Paragraph({
                children: [
                  new TextRun({
                    text: `${item.MaLichSuNhap} | ${new Date(item.ThoiGianThayDoi).toLocaleString()} | ${item.id_User} | ${item.TenNhanVien} | ${item.LoaiThongTin} | ${item.NoiDungThayDoi}`,
                    font: "Times New Roman",
                    size: 24, // Font size 12pt (24 half-points)
                  }),
                ],
                spacing: { after: 100 },
              })),
            ],
          },
        ],
      });

      // Ghi file
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
      // console.log(`Đã xuất log thành công vào file: ${filePath}`);
    } catch (err) {
      console.error('Lỗi khi xuất log ra file Word:', err);
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để lấy danh sách file log
  getLogFiles: async (req, res) => {
    try {
      const logDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logDir)) {
        return res.json([]);
      }

      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith('Log_') && file.endsWith('.docx'))
        .map(file => {
          const filePath = path.join(logDir, file);
          return {
            name: file,
            path: filePath,
            size: fs.statSync(filePath).size
          };
        });

      res.json(files);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách file log:', err);
      res.status(500).send('Lỗi máy chủ');
    }
  },

  // Phương thức để tải file log
  downloadLogFile: async (req, res) => {
    try {
      const fileName = req.params.filename;
      const filePath = path.join(__dirname, '../../logs', fileName);
      
      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).send('File không tồn tại');
      }
    } catch (err) {
      console.error('Lỗi khi tải file log:', err);
      res.status(500).send('Lỗi máy chủ');
    }
  }
};

// Tự động chạy export log mỗi 5 phút
setInterval(() => {
  logController.autoExportLog();
}, 100000); // 1s

// Chạy ngay lần đầu khi khởi động
logController.autoExportLog();

module.exports = logController;