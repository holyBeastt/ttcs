const createConnection = require("../config/databasePool");
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

// src/controllers/logController.js
const logController = {
  // Phương thức để hiển thị trang log
  showLogTable: async (req, res) => {
    try {
      // Tự động xuất file log khi truy cập trang log (fire-and-forget)
      logController.autoExportLog()
        .then(result => console.log('Auto export log completed:', result))
        .catch(err => console.error('Lỗi tự động xuất file log:', err));
      // Hiển thị trang log
      res.render("log"); // Render trang log.ejs
    } catch (err) {
      console.error("Lỗi khi hiển thị trang log:", err);
      res.status(500).send("Lỗi máy chủ");
    }
  },

  // Phương thức để lấy dữ liệu log
  getLogData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      
      // Lấy tham số phân trang từ query parameters
      const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1
      const limit = parseInt(req.query.limit) || 30; // Số dòng mỗi trang, mặc định là 30
      const offset = (page - 1) * limit; // Vị trí bắt đầu
      
      // Đếm tổng số bản ghi
      const countQuery = "SELECT COUNT(*) as total FROM lichsunhaplieu";
      const [countResult] = await connection.query(countQuery);
      const totalRecords = countResult[0].total;
      const totalPages = Math.ceil(totalRecords / limit);
      
      // Lấy dữ liệu với phân trang
      const query = "SELECT * FROM lichsunhaplieu ORDER BY MaLichSuNhap DESC LIMIT ? OFFSET ?";
      const [result] = await connection.query(query, [limit, offset]);
      const lichsunhaplieu = result;

      // Trả về dữ liệu dưới dạng JSON
      res.json({
        data: lichsunhaplieu,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalRecords: totalRecords,
          limit: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
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
      console.log("Đang truy vấn dữ liệu log từ cơ sở dữ liệu...");
      // Thay đổi thứ tự sắp xếp theo MaLichSuNhap
      const query = "SELECT * FROM lichsunhaplieu ORDER BY MaLichSuNhap";
      const [allResults] = await connection.query(query);
      console.log(`Đã tìm thấy ${allResults.length} bản ghi log`);

      if (allResults.length === 0) {
        console.log("Không có dữ liệu log để xuất");
        return { success: false, error: "Không có dữ liệu log để xuất" };
      }

      // Tạo thư mục logs
      const logDir = path.resolve(__dirname, '..', '..', 'logs');
      console.log("Thư mục logs (đường dẫn tuyệt đối):", logDir);
      
      try {
        if (!fs.existsSync(logDir)) {
          console.log("Thư mục logs chưa tồn tại, đang tạo mới...");
          fs.mkdirSync(logDir, { recursive: true });
          console.log("Đã tạo thư mục logs:", logDir);
        } else {
          console.log("Thư mục logs đã tồn tại:", logDir);
          // Kiểm tra quyền ghi vào thư mục
          try {
            fs.accessSync(logDir, fs.constants.W_OK);
            console.log("Có quyền ghi vào thư mục logs");
          } catch (err) {
            console.error("Không có quyền ghi vào thư mục logs:", err);
            // Thử tạo thư mục logs trong thư mục public
            const publicLogDir = path.resolve(__dirname, '..', 'public', 'logs');
            console.log("Thử tạo thư mục logs trong public:", publicLogDir);
            if (!fs.existsSync(publicLogDir)) {
              fs.mkdirSync(publicLogDir, { recursive: true });
            }
            // Sử dụng thư mục logs trong public thay thế
            logDir = publicLogDir;
          }
        }
      } catch (err) {
        console.error("Lỗi khi tạo thư mục logs:", err);
        // Thử tạo trong thư mục public
        const publicLogDir = path.resolve(__dirname, '..', 'public', 'logs');
        console.log("Thử tạo thư mục logs trong public:", publicLogDir);
        if (!fs.existsSync(publicLogDir)) {
          fs.mkdirSync(publicLogDir, { recursive: true });
        }
        // Sử dụng thư mục logs trong public thay thế
        logDir = publicLogDir;
      }
      
      const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
      const createdFiles = [];
      
      // Nhóm dữ liệu log theo tháng và năm
      const logsByMonthYear = {};
      
      allResults.forEach(logEntry => {
        const logDate = new Date(logEntry.ThoiGianThayDoi);
        const logMonth = logDate.getMonth() + 1; // 1-12
        const logYear = logDate.getFullYear();
        const key = `${logMonth}_${logYear}`;
        
        if (!logsByMonthYear[key]) {
          logsByMonthYear[key] = [];
        }
        
        logsByMonthYear[key].push(logEntry);
      });
      
      console.log(`Đã phân loại log thành ${Object.keys(logsByMonthYear).length} nhóm theo tháng/năm`);
      
      // Tạo file log cho từng tháng/năm
      for (const [key, logs] of Object.entries(logsByMonthYear)) {
        const [monthNum, year] = key.split('_');
        const month = parseInt(monthNum);
        const monthName = monthNames[month - 1];
        const fileName = `Log_${monthName}_${year}.docx`;
        const filePath = path.join(logDir, fileName);
        
        console.log(`Đang tạo file log cho tháng ${monthName}/${year} với ${logs.length} bản ghi...`);
        
        // Kiểm tra và xóa file log cũ nếu đã tồn tại
        try {
          if (fs.existsSync(filePath)) {
            console.log(`File log cũ ${fileName} đã tồn tại, đang xóa...`);
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`Lỗi khi xóa file log cũ ${fileName}:`, err);
        }
        
        // Tạo tài liệu Word
        const doc = new Document({
          sections: [
            {
              children: [
                // Tiêu đề
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Bảng Lịch Sử Nhập Liệu (${monthName}/${year})`,
                      font: "Times New Roman",
                      size: 36, // Font size 18pt (36 half-points)
                      bold: true,
                    }),
                  ],
                  alignment: AlignmentType.CENTER, // Căn giữa
                  spacing: { after: 200 },
                }),
                // Dữ liệu log dưới dạng văn bản - đã sắp xếp theo MaLichSuNhap
                ...logs.map((item) => new Paragraph({
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
        try {
          const buffer = await Packer.toBuffer(doc);
          fs.writeFileSync(filePath, buffer);
          console.log(`Đã xuất log thành công vào file: ${filePath}`);
          createdFiles.push(filePath);
        } catch (err) {
          console.error(`Lỗi khi ghi file ${fileName}:`, err);
        }
      }
      
      return { success: true, files: createdFiles };
    } catch (err) {
      console.error('Lỗi khi xuất log ra file Word:', err);
      return { success: false, error: err.message };
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để lấy danh sách file log
  getLogFiles: async (req, res) => {
    try {
      // Nếu có yêu cầu tạo file log mới
      if (req.query.export === 'true') {
        console.log("Yêu cầu xuất file log mới...");
        const result = await logController.autoExportLog();
        console.log("Kết quả xuất log:", result);
        
        if (!result.success) {
          // Nếu không có dữ liệu log, bỏ qua mà không lỗi
          if (result.error !== 'Không có dữ liệu log để xuất') {
            return res.status(500).json({ 
              success: false, 
              message: 'Không thể tạo file log', 
              error: result.error 
            });
          }
          console.log('Không có dữ liệu log để xuất, bỏ qua tạo file mới');
        }
      }
      
      // Sử dụng cùng đường dẫn với hàm autoExportLog
      const logDir = path.resolve(__dirname, '..', '..', 'logs');
      console.log("Đường dẫn thư mục logs:", logDir);
      
      // Nếu thư mục logs không tồn tại hoặc không có quyền truy cập, thử thư mục logs trong public
      let usePublicDir = false;
      if (!fs.existsSync(logDir)) {
        console.log("Thư mục logs không tồn tại, thử kiểm tra trong public...");
        usePublicDir = true;
      } else {
        try {
          fs.accessSync(logDir, fs.constants.R_OK | fs.constants.W_OK);
        } catch (err) {
          console.log("Không có quyền truy cập thư mục logs, thử kiểm tra trong public...");
          usePublicDir = true;
        }
      }
      
      const publicLogDir = path.resolve(__dirname, '..', 'public', 'logs');
      const finalLogDir = usePublicDir ? publicLogDir : logDir;
      
      console.log("Thư mục logs cuối cùng:", finalLogDir);
      
      // Đảm bảo thư mục tồn tại
      if (!fs.existsSync(finalLogDir)) {
        console.log("Tạo thư mục logs...");
        fs.mkdirSync(finalLogDir, { recursive: true });
      }
      
      let files = [];
      try {
        files = fs.readdirSync(finalLogDir)
          .filter(file => file.startsWith('Log_') && file.endsWith('.docx'))
          .map(file => {
            const filePath = path.join(finalLogDir, file);
            const stats = fs.statSync(filePath);
            
            // Phân tích tên file để lấy thông tin tháng/năm
            const fileNameParts = file.replace('.docx', '').split('_');
            const monthCode = fileNameParts[1]; // T1, T2, etc.
            const year = fileNameParts[2]; // 2025, etc.
            
            // Lấy thông tin thời gian tạo file
            return {
              name: file,
              path: filePath,
              size: stats.size,
              createdAt: stats.mtime,
              month: monthCode,
              year: year
            };
          })
          // Sắp xếp theo tháng/năm giảm dần (mới nhất trước)
          .sort((a, b) => {
            if (a.year !== b.year) {
              return parseInt(b.year) - parseInt(a.year);
            }
            
            // Chuyển đổi T1, T2 thành số
            const monthA = parseInt(a.month.substring(1));
            const monthB = parseInt(b.month.substring(1));
            return monthB - monthA;
          });
        
        console.log(`Đã tìm thấy ${files.length} file log`);
      } catch (err) {
        console.error("Lỗi khi đọc thư mục logs:", err);
      }

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
      
      // Kiểm tra trong thư mục logs
      const logDir = path.resolve(__dirname, '..', '..', 'logs');
      let filePath = path.join(logDir, fileName);
      
      // Nếu không tìm thấy trong thư mục logs, kiểm tra trong thư mục public/logs
      if (!fs.existsSync(filePath)) {
        const publicLogDir = path.resolve(__dirname, '..', 'public', 'logs');
        filePath = path.join(publicLogDir, fileName);
      }
      
      console.log("Đường dẫn file log cần tải:", filePath);
      
      if (fs.existsSync(filePath)) {
        console.log("Đang tải file log:", filePath);
        return res.download(filePath);
      } else {
        console.log("File không tồn tại:", filePath);
        return res.status(404).send('File không tồn tại');
      }
    } catch (err) {
      console.error('Lỗi khi tải file log:', err);
      res.status(500).send('Lỗi máy chủ');
    }
  }
};

module.exports = logController;