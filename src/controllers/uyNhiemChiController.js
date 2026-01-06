const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const createPoolConnection = require('../config/databasePool');

// Đường dẫn thư mục templates
const TEMPLATES_DIR = path.join(__dirname, '../templates/uy-nhiem-chi');
const GENERATED_DIR = path.join(TEMPLATES_DIR, 'generated');

// Hàm chuyển số thành chữ tiếng Việt
function numberToWords(number) {
    if (number === 0) return "Không đồng";
    
    const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
    const tens = ["", "", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
    const thousands = ["", "nghìn", "triệu", "tỷ"];
    
    function convertHundreds(num) {
        let result = "";
        
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        
        if (hundred > 0) {
            result += ones[hundred] + " trăm";
            if (remainder > 0 && remainder < 10) {
                result += " lẻ";
            }
        }
        
        if (remainder >= 20) {
            const ten = Math.floor(remainder / 10);
            const unit = remainder % 10;
            result += (result ? " " : "") + tens[ten];
            if (unit > 0) {
                if (unit === 1 && ten > 1) {
                    result += " mốt";
                } else if (unit === 5 && ten > 0) {
                    result += " lăm";
                } else {
                    result += " " + ones[unit];
                }
            }
        } else if (remainder >= 10) {
            result += (result ? " " : "") + teens[remainder - 10];
        } else if (remainder > 0) {
            result += (result ? " " : "") + ones[remainder];
        }
        
        return result;
    }
    
    function convertGroup(num) {
        if (num === 0) return "";
        
        let result = "";
        const groups = [];
        let groupIndex = 0;
        
        while (num > 0) {
            const group = num % 1000;
            if (group !== 0) {
                let groupText = convertHundreds(group);
                if (groupIndex > 0) {
                    groupText += " " + thousands[groupIndex];
                }
                groups.unshift(groupText);
            }
            num = Math.floor(num / 1000);
            groupIndex++;
        }
        
        result = groups.join(" ");
        return result;
    }
    
    let result = convertGroup(Math.abs(number));
    
    // Viết hoa chữ cái đầu
    if (result) {
        result = result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
    }
    
    return result;
}

// Hàm format số tiền
function formatCurrency(number) {
  return new Intl.NumberFormat('vi-VN').format(number) + ' đ';
}

// Hàm thay thế placeholder trong worksheet - cải tiến để giữ nguyên format
function replaceTemplateValues(worksheet, replacements) {
  // Duyệt qua tất cả cells trong worksheet
  for (let cellAddress in worksheet) {
    // Bỏ qua các thuộc tính đặc biệt của worksheet
    if (cellAddress[0] === '!') continue;
    
    let cell = worksheet[cellAddress];
    if (cell && cell.v) {
      let cellValue = String(cell.v);
      let hasChanges = false;
      
      // Thay thế tất cả placeholder trong cell
      for (let placeholder in replacements) {
        if (cellValue.includes(placeholder)) {
          console.log(`Found placeholder ${placeholder} in cell ${cellAddress}, replacing with:`, replacements[placeholder]);
          cellValue = cellValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacements[placeholder]);
          hasChanges = true;
        }
      }
      
      // Cập nhật giá trị cell nếu có thay đổi - GIỮ NGUYÊN format gốc
      if (hasChanges) {
        // Chỉ thay đổi giá trị, giữ nguyên tất cả thuộc tính khác
        cell.v = cellValue;
        if (cell.w) cell.w = cellValue;
        // Không thay đổi type, style, format khác
      }
    }
  }
}

// Tạo object cho controller tải ủy nhiệm chi
const taiUyNhiemChiController = {
  // Hiển thị trang tải ủy nhiệm chi
  getTaiUyNhiemChiPage: (req, res) => {
    try {
      res.render('taiUyNhiemChi', {
        title: 'Tải Ủy Nhiệm Chi',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering tai uy nhiem chi page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Hiển thị trang UNC ĐATN (hệ thống)
  getUNCDoAnPage: (req, res) => {
    try {
      res.render('uncDoAn', {
        title: 'UNC ĐATN',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering UNC DoAn page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Xử lý tải file ủy nhiệm chi
  downloadUyNhiemChi: async (req, res) => {
    let connection;
    try {
      const { filters } = req.body || {};
      const { dot, ki, namHoc, khoa, heDaoTao } = filters || {};
      
      // Validate input
      if (!dot || !ki || !namHoc) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đợt, kỳ hoặc năm học'
        });
      }

      // Kết nối database
      connection = await createPoolConnection();

      // Query lấy dữ liệu từ hopdonggvmoi với SoUyNhiem và SoThanhToan
      let query = `
        SELECT 
          hd.HoTen,
          hd.STK,
          hd.NganHang,
          SUM(hd.ThucNhan) as SoTien,
          hd.MaPhongBan,
          hd.he_dao_tao,
          hd.CCCD,
          hd.SoUyNhiem,
          hd.SoThanhToan
        FROM hopdonggvmoi hd
        WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
          AND hd.KhoaDuyet = 1 AND hd.DaoTaoDuyet = 1 AND hd.TaiChinhDuyet = 1
          AND hd.SoUyNhiem IS NOT NULL AND hd.SoThanhToan IS NOT NULL
      `;
      
      const params = [dot, ki, namHoc];

      // Thêm lọc hệ đào tạo nếu có
      if (heDaoTao && heDaoTao.trim() !== "") {
        query += ` AND hd.he_dao_tao = ?`;
        params.push(heDaoTao);
      }

      // Lọc khoa nếu cần
      if (khoa && khoa !== "" && khoa !== "ALL") {
        query += ` AND hd.MaPhongBan = ?`;
        params.push(khoa);
      }

      // Group by CCCD để tổng hợp SoTien cho cùng người
      query += ` GROUP BY hd.CCCD, hd.HoTen, hd.STK, hd.NganHang, hd.MaPhongBan, hd.he_dao_tao, hd.SoUyNhiem, hd.SoThanhToan ORDER BY hd.SoUyNhiem`;

      const [rows] = await connection.execute(query, params);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu phù hợp hoặc chưa tạo số ủy nhiệm chi'
        });
      }

      // Đọc file mẫu
      const templatePath = path.join(TEMPLATES_DIR, 'Mẫu ủy nhiệm chi.xlsx');
      
      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({
          success: false,
          message: 'File mẫu không tồn tại'
        });
      }

      // Kiểm tra file mẫu có đọc được không
      try {
        const templateStats = fs.statSync(templatePath);
        if (templateStats.size === 0) {
          throw new Error('File mẫu rỗng');
        }
        
        // Thử đọc file bằng ExcelJS để kiểm tra tính hợp lệ
        const testWorkbook = new ExcelJS.Workbook();
        await testWorkbook.xlsx.readFile(templatePath);
        if (!testWorkbook.worksheets || testWorkbook.worksheets.length === 0) {
          throw new Error('File mẫu không hợp lệ hoặc không có sheet nào');
        }
        
        console.log('Template file is valid. Sheets:', testWorkbook.worksheets.length);
        
      } catch (templateError) {
        console.error('Template file error:', templateError);
        return res.status(500).json({
          success: false,
          message: 'File mẫu bị lỗi: ' + templateError.message + '. Vui lòng upload file mẫu mới.'
        });
      }

      // Tạo 1 file Excel với mỗi người 1 sheet riêng
      const currentDate = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
      const fileName = `Uy_nhiem_chi_${currentDate}.xlsx`;
      const outputPath = path.join(GENERATED_DIR, fileName);

      // Đảm bảo thư mục generated tồn tại
      if (!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR, { recursive: true });
      }

      try {
        // Sử dụng ExcelJS để giữ nguyên format và hình ảnh
        const templateWorkbook = new ExcelJS.Workbook();
        await templateWorkbook.xlsx.readFile(templatePath);
        
        if (templateWorkbook.worksheets.length === 0) {
          throw new Error('File mẫu không có sheet nào');
        }
        
        const templateWorksheet = templateWorkbook.worksheets[0];
        
        // Tạo workbook mới cho output
        const outputWorkbook = new ExcelJS.Workbook();
        
        // Tạo sheet tổng hợp duy nhất chứa tất cả bản ghi
        const summarySheet = outputWorkbook.addWorksheet('Uy_Nhiem_Chi');
        
        let currentRow = 1; // Bắt đầu từ dòng 1
        
        // Tạo sheet cho từng người, nhưng xếp lần lượt trong cùng một sheet
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          const soUyNhiem = String(row.SoUyNhiem).padStart(3, '0');
          
          // Clone worksheet từ template để giữ nguyên toàn bộ định dạng cho mỗi bản ghi
          const tempWorksheet = new ExcelJS.Workbook();
          await tempWorksheet.xlsx.load(templateWorkbook.xlsx);
          const templateWs = tempWorksheet.worksheets[0];
          
          // Copy toàn bộ cấu trúc từ template worksheet vào vị trí currentRow
          templateWs.eachRow({ includeEmpty: true }, (templateRow, rowNumber) => {
            const targetRowNum = currentRow + rowNumber - 1;
            const newRow = summarySheet.getRow(targetRowNum);
            if (templateRow.height) newRow.height = templateRow.height;
            
            templateRow.eachCell({ includeEmpty: true }, (templateCell, colNumber) => {
              const newCell = newRow.getCell(colNumber);
              
              // Copy value
              if (templateCell.value !== null && templateCell.value !== undefined) {
                newCell.value = templateCell.value;
              }
              
              // Copy style hoàn chỉnh
              if (templateCell.style) {
                newCell.style = JSON.parse(JSON.stringify(templateCell.style));
              }
            });
          });
          
          // Thay thế placeholder cho bản ghi này
          const replacements = {
            '{{so_uy_nhiem}}': soUyNhiem,
            '{{STT}}': row.SoThanhToan || '',
            '{{ho_ten}}': row.HoTen || '',
            '{{stk}}': row.STK || '',
            '{{ngan_hang}}': row.NganHang || '',
            '{{so_tien}}': row.SoTien || '',
            '{{khoa}}': row.TenPhongBan || row.MaPhongBan || '',
            '{{he_dao_tao}}': row.he_dao_tao || ''
          };
          
          // Áp dụng replacements cho vùng vừa copy
          for (let r = currentRow; r < currentRow + templateWs.rowCount; r++) {
            const sheetRow = summarySheet.getRow(r);
            sheetRow.eachCell({ includeEmpty: true }, (cell) => {
              if (cell.value && typeof cell.value === 'string') {
                Object.keys(replacements).forEach(key => {
                  cell.value = cell.value.replace(new RegExp(key, 'g'), replacements[key]);
                });
              }
            });
          }
          
          // Copy merged cells
          if (templateWs.model && templateWs.model.merges) {
            templateWs.model.merges.forEach(merge => {
              try {
                const adjustedMerge = {
                  tl: { c: merge.tl.c, r: merge.tl.r + currentRow - 1 },
                  br: { c: merge.br.c, r: merge.br.r + currentRow - 1 }
                };
                summarySheet.mergeCells(adjustedMerge.tl.r + 1, adjustedMerge.tl.c + 1, adjustedMerge.br.r + 1, adjustedMerge.br.c + 1);
              } catch (e) {
                // Ignore merge errors
              }
            });
          }
          
          // Copy drawings/images với vị trí điều chỉnh
          if (templateWs.drawings) {
            templateWs.drawings.forEach(drawing => {
              try {
                const adjustedRange = {
                  tl: { col: drawing.range.tl.col, row: drawing.range.tl.row + currentRow - 1 },
                  br: drawing.range.br ? { col: drawing.range.br.col, row: drawing.range.br.row + currentRow - 1 } : undefined
                };
                summarySheet.addImage(drawing.image, adjustedRange);
              } catch (e) {
                console.error('Error copying drawing:', e);
              }
            });
          }
          
          // Tăng currentRow để chuẩn bị cho bản ghi tiếp theo (cách nhau 2 dòng)
          currentRow += templateWs.rowCount + 2;
        }
        
        // Ghi file Excel
        await outputWorkbook.xlsx.writeFile(outputPath);
        
        // Kiểm tra file đã được tạo thành công
        const outputStats = fs.statSync(outputPath);
        
        if (outputStats.size === 0) {
          throw new Error('File được tạo nhưng có kích thước 0');
        }
        
        // Trả về file Excel
        res.download(outputPath, fileName, (err) => {
          if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({
              success: false,
              message: 'Lỗi khi tải file'
            });
          } else {
            // Xóa file tạm sau khi download
            setTimeout(() => {
              if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
              }
            }, 5000);
          }
        });
        
      } catch (error) {
        console.error('Error creating Excel file:', error);
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi tạo file Excel: ' + error.message
        });
      }

    } catch (error) {
      console.error('Error in downloadUyNhiemChi:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // Preview tạo số ủy nhiệm chi
  previewUyNhiemChi: async (req, res) => {
    let connection;
    try {
      const { dot, ki, namHoc, khoa, heDaoTao } = req.body;
      
      // Validate input
      if (!dot || !ki || !namHoc) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đợt, kỳ hoặc năm học'
        });
      }

      // Kết nối database
      connection = await createPoolConnection();

      // Query lấy dữ liệu từ hopdonggvmoi với join phongban để lấy tên khoa
      let query = `
        SELECT 
          hd.MaHopDong,
          hd.SoHopDong,
          hd.HoTen,
          hd.STK,
          hd.NganHang,
          hd.SoTien,
          hd.MaPhongBan,
          hd.he_dao_tao,
          hd.CCCD,
          hd.Dot,
          hd.KiHoc,
          hd.NamHoc,
          hd.SoUyNhiem,
          hd.SoThanhToan,
          hd.KhoaDuyet,
          hd.DaoTaoDuyet,
          hd.TaiChinhDuyet,
          pb.TenPhongBan
        FROM hopdonggvmoi hd
        LEFT JOIN phongban pb ON hd.MaPhongBan = pb.MaPhongBan
        WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
          AND hd.KhoaDuyet = 1 AND hd.DaoTaoDuyet = 1 AND hd.TaiChinhDuyet = 1
      `;
      
      const params = [dot, ki, namHoc];

      // Thêm lọc hệ đào tạo nếu có
      if (heDaoTao && heDaoTao.trim() !== "") {
        query += ` AND hd.he_dao_tao = ?`;
        params.push(heDaoTao);
      }

      // Lọc khoa nếu cần
      if (khoa && khoa !== "" && khoa !== "ALL") {
        query += ` AND hd.MaPhongBan = ?`;
        params.push(khoa);
      }

      // Group theo CCCD để tránh duplicate và tổng hợp số tiền
      query += ` 
        GROUP BY hd.CCCD, hd.HoTen, hd.STK, hd.NganHang, hd.MaPhongBan, hd.he_dao_tao, pb.TenPhongBan, hd.MaHopDong, hd.SoHopDong, hd.SoUyNhiem, hd.SoThanhToan, hd.KhoaDuyet, hd.DaoTaoDuyet, hd.TaiChinhDuyet
        ORDER BY hd.he_dao_tao, hd.SoUyNhiem
      `;

      const [rows] = await connection.execute(query, params);

      // Trả về dữ liệu cần thiết cho bảng hiển thị
      const formattedData = rows.map((row, index) => ({
        HoTen: row.HoTen,
        TenPhongBan: row.TenPhongBan,
        MaPhongBan: row.MaPhongBan,
        he_dao_tao: row.he_dao_tao,
        SoUyNhiem: row.SoUyNhiem,
        STK: row.STK,
        NganHang: row.NganHang
      }));

      res.json({
        success: true,
        data: formattedData,
        message: `Tìm thấy ${formattedData.length} bản ghi phù hợp`
      });
    } catch (error) {
      console.error('Error in previewUyNhiemChi:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tải dữ liệu'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // Setup tạo số ủy nhiệm chi
  setupUyNhiemChi: async (req, res) => {
    let connection;
    try {
      console.log('setupUyNhiemChi request body:', req.body);
      const { dot, ki, namHoc, khoa, heDaoTao, startingNumber } = req.body;
      
      // Validate input
      if (!dot || !ki || !namHoc || !startingNumber) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đợt, kỳ, năm học hoặc số bắt đầu'
        });
      }

      // Kết nối database
      connection = await createPoolConnection();
      await connection.beginTransaction();

      // Query lấy dữ liệu từ hopdonggvmoi
      let query = `
        SELECT DISTINCT
          hd.MaHopDong,
          hd.HoTen,
          hd.CCCD,
          hd.he_dao_tao
        FROM hopdonggvmoi hd
        WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
          AND hd.KhoaDuyet = 1 AND hd.DaoTaoDuyet = 1 AND hd.TaiChinhDuyet = 1
      `;
      
      const params = [dot, ki, namHoc];

      // Thêm lọc hệ đào tạo nếu có
      if (heDaoTao && heDaoTao.trim() !== "") {
        query += ` AND hd.he_dao_tao = ?`;
        params.push(heDaoTao);
      }

      // Lọc khoa nếu cần
      if (khoa && khoa !== "" && khoa !== "ALL") {
        query += ` AND hd.MaPhongBan = ?`;
        params.push(khoa);
      }

      // Order theo tên
      query += ` ORDER BY hd.HoTen`;

      const [rows] = await connection.execute(query, params);

      // Group rows theo he_dao_tao
      const groupedByHeDaoTao = {};
      rows.forEach(row => {
        const heDaoTao = row.he_dao_tao || 'Unknown';
        if (!groupedByHeDaoTao[heDaoTao]) {
          groupedByHeDaoTao[heDaoTao] = [];
        }
        groupedByHeDaoTao[heDaoTao].push(row);
      });

      // Lấy danh sách hệ đào tạo và sort
      const heDaoTaoList = Object.keys(groupedByHeDaoTao).sort();

      let updatedCount = 0;
      let currentStartingNumber = parseInt(startingNumber);

      // Gán số ủy nhiệm cho từng hệ
      for (const heDaoTao of heDaoTaoList) {
        const groupRows = groupedByHeDaoTao[heDaoTao];
        
        for (let i = 0; i < groupRows.length; i++) {
          const newSoUyNhiem = currentStartingNumber + i;
          const newSoThanhToan = currentStartingNumber + i;

          // Cập nhật SoUyNhiem và SoThanhToan cho tất cả bản ghi của người này
          let updateQuery = `
            UPDATE hopdonggvmoi 
            SET SoUyNhiem = ?, SoThanhToan = ?
            WHERE CCCD = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
              AND KhoaDuyet = 1 AND DaoTaoDuyet = 1 AND TaiChinhDuyet = 1
          `;

          // Thêm điều kiện lọc cho update
          let updateParams = [newSoUyNhiem, newSoThanhToan, groupRows[i].CCCD, dot, ki, namHoc];
          
          if (heDaoTao && heDaoTao.trim() !== "" && heDaoTao !== 'Unknown') {
            updateQuery += ` AND he_dao_tao = ?`;
            updateParams.push(heDaoTao);
          }

          if (khoa && khoa !== "" && khoa !== "ALL") {
            updateQuery += ` AND MaPhongBan = ?`;
            updateParams.push(khoa);
          }

          await connection.execute(updateQuery, updateParams);
          updatedCount++;
        }

        // Tăng số bắt đầu cho hệ tiếp theo
        currentStartingNumber += groupRows.length;
      }

      // Ghi log
      const logContent = `Admin [${req.session.username || 'Unknown'}] đã tạo số ủy nhiệm chi cho ${updatedCount} giảng viên. Đợt: ${dot}, Kỳ: ${ki}, Năm học: ${namHoc}`;
      const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, NOW())`;
      await connection.execute(logQuery, [req.session.userId || '', req.session.TenNhanVien || '', 'Admin Log', logContent]);

      await connection.commit();

      res.json({
        success: true,
        message: `Đã tạo số ủy nhiệm chi thành công cho ${updatedCount} giảng viên`,
        count: updatedCount
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in setupUyNhiemChi:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo số ủy nhiệm chi'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // ========== UNC NGOÀI - Các hàm xử lý UNC ngoài ==========
  
  // Hiển thị trang UNC ngoài - Giao diện
  getUNCNgoaiGiaoDienPage: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      
      // Lấy STT tiếp theo
      const [nextSttRows] = await connection.execute(`
        SELECT COALESCE(MAX(stt), 0) + 1 as nextStt FROM uncngoai
      `);
      const nextStt = (nextSttRows[0] && nextSttRows[0].nextStt) || 1;
      
      res.render('uncNgoaiGiaoDien', {
        title: 'UNC ngoài - Thêm người thụ hưởng',
        nextStt: nextStt,
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering UNC ngoai giao dien page:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      if (connection) await connection.release();
    }
  },

  // Hiển thị trang UNC ngoài - Xem dữ liệu
  getUNCNgoaiXemDuLieuPage: (req, res) => {
    try {
      res.render('uncNgoaiXemDuLieu', {
        title: 'UNC ngoài - Xem dữ liệu',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering UNC ngoai xem du lieu page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Hiển thị trang UNC ngoài - Import file
  getUNCNgoaiImportFilePage: (req, res) => {
    try {
      res.render('uncNgoaiImportFile', {
        title: 'UNC ngoài - Import file',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering UNC ngoai import file page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Tạo bản ghi UNC ngoài mới (với kiểm tra trùng số tài khoản)
  createUNCNgoaiRecord: async (req, res) => {
    let connection;
    try {
      const { dvnt, stk, nganhang } = req.body;

      if (!dvnt || !stk || !nganhang) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ Đơn vị nhận tiền, Số tài khoản và Ngân hàng'
        });
      }

      connection = await createPoolConnection();

      // Trim số tài khoản từ input
      const trimmedStk = stk.trim().replace(/\s+/g, ' ');

      // Kiểm tra trùng số tài khoản - trim cả khoảng trắng ở database khi so sánh
      const [duplicateRows] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM uncngoai 
        WHERE REPLACE(TRIM(stk), ' ', '') = REPLACE(?, ' ', '')
      `, [trimmedStk]);

      if (duplicateRows[0].count > 0) {
        return res.status(409).json({
          success: false,
          message: 'Số tài khoản đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.'
        });
      }

      // Lấy STT tiếp theo
      const [nextSttRows] = await connection.execute(`
        SELECT COALESCE(MAX(stt), 0) + 1 as nextStt FROM uncngoai
      `);
      const nextStt = (nextSttRows[0] && nextSttRows[0].nextStt) || 1;

      // Thêm bản ghi mới
      await connection.execute(`
        INSERT INTO uncngoai (stt, dvnt, stk, nganhang)
        VALUES (?, ?, ?, ?)
      `, [nextStt, dvnt.trim(), trimmedStk, nganhang.trim()]);

      res.json({
        success: true,
        message: 'Đã thêm bản ghi thành công',
        data: { stt: nextStt }
      });
    } catch (error) {
      console.error('Error in createUNCNgoaiRecord:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo bản ghi: ' + error.message
      });
    } finally {
      if (connection) await connection.release();
    }
  },

  // Lấy danh sách UNC ngoài
  getUNCNgoaiList: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const [rows] = await connection.execute(`
        SELECT stt, dvnt, stk, nganhang
        FROM uncngoai
        ORDER BY stt
      `);

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Error in getUNCNgoaiList:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách'
      });
    } finally {
      if (connection) await connection.release();
    }
  },

  // Cập nhật bản ghi UNC ngoài (với kiểm tra trùng số tài khoản)
  updateUNCNgoaiRecord: async (req, res) => {
    let connection;
    try {
      const { stt, dvnt, stk, nganhang } = req.body;

      if (!stt || !dvnt || !stk || !nganhang) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin'
        });
      }

      connection = await createPoolConnection();

      // Trim số tài khoản từ input
      const trimmedStk = stk.trim().replace(/\s+/g, ' ');

      // Kiểm tra trùng số tài khoản - trim cả khoảng trắng ở database khi so sánh
      // Loại trừ bản ghi hiện tại đang sửa
      const [duplicateRows] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM uncngoai 
        WHERE REPLACE(TRIM(stk), ' ', '') = REPLACE(?, ' ', '')
          AND stt != ?
      `, [trimmedStk, stt]);

      if (duplicateRows[0].count > 0) {
        return res.status(409).json({
          success: false,
          message: 'Số tài khoản đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.'
        });
      }

      // Cập nhật bản ghi
      await connection.execute(`
        UPDATE uncngoai
        SET dvnt = ?, stk = ?, nganhang = ?
        WHERE stt = ?
      `, [dvnt.trim(), trimmedStk, nganhang.trim(), stt]);

      res.json({
        success: true,
        message: 'Đã cập nhật bản ghi thành công'
      });
    } catch (error) {
      console.error('Error in updateUNCNgoaiRecord:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật bản ghi: ' + error.message
      });
    } finally {
      if (connection) await connection.release();
    }
  },

  // Xóa bản ghi UNC ngoài
  deleteUNCNgoaiRecord: async (req, res) => {
    let connection;
    try {
      const { stt } = req.body;

      if (!stt) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin STT'
        });
      }

      connection = await createPoolConnection();
      await connection.execute(`DELETE FROM uncngoai WHERE stt = ?`, [stt]);

      res.json({
        success: true,
        message: 'Đã xóa bản ghi thành công'
      });
    } catch (error) {
      console.error('Error in deleteUNCNgoaiRecord:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa bản ghi: ' + error.message
      });
    } finally {
      if (connection) await connection.release();
    }
  },

  // Lấy thông tin UNC ngoài theo STT hoặc ĐVNT
  getUNCNgoaiInfo: async (req, res) => {
    let connection;
    try {
      const { stt, dvnt } = req.query;

      if (!stt && !dvnt) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin STT hoặc Đơn vị nhận tiền'
        });
      }

      connection = await createPoolConnection();
      
      let query = `SELECT stt, dvnt, stk, nganhang FROM uncngoai WHERE `;
      let params = [];

      if (stt) {
        query += `stt = ?`;
        params.push(stt);
      } else if (dvnt) {
        query += `dvnt = ?`;
        params.push(dvnt.trim());
      }

      const [rows] = await connection.execute(query, params);

      if (rows.length === 0) {
        return res.json({
          success: false,
          message: 'Không tìm thấy thông tin'
        });
      }

      res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      console.error('Error in getUNCNgoaiInfo:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy thông tin: ' + error.message
      });
    } finally {
      if (connection) await connection.release();
    }
  },

  // Các hàm khác cho UNC ngoài (placeholder - cần implement)
  getLatestSotien: async (req, res) => {
    // TODO: Implement
    res.json({ success: true, data: { sotien: null } });
  },

  convertToWords: async (req, res) => {
    try {
      const { amount } = req.body;
      const words = numberToWords(parseInt(amount) || 0);
      res.json({ success: true, words });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  saveUNCNgoaiDetail: async (req, res) => {
    // TODO: Implement
    res.json({ success: true, message: 'Đã lưu thành công' });
  },

  getUNCNgoaiDetailList: async (req, res) => {
    // TODO: Implement
    res.json({ success: true, data: [] });
  },

  getUNCNgoaiDetailListFull: async (req, res) => {
    let connection;
    try {
      const { hedaotao, page = 1, limit = 35 } = req.query;
      
      if (!hedaotao) {
        return res.json({
          success: false,
          message: 'Thiếu tham số hedaotao'
        });
      }

      connection = await createPoolConnection();
      
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 35;
      const offset = (pageNum - 1) * limitNum;
      
      // Query để lấy tổng số bản ghi
      const countQuery = `SELECT COUNT(*) as total FROM uncngoaidetail WHERE hedaotao = ?`;
      const [countResult] = await connection.execute(countQuery, [hedaotao]);
      const total = countResult[0].total;
      
      // Query để lấy dữ liệu với phân trang, sắp xếp mới nhất trước (theo sounc DESC, stt DESC)
      // LIMIT và OFFSET không dùng placeholder vì MySQL2 prepared statement không hỗ trợ tốt
      const query = `
        SELECT sounc, stt, hedaotao, dvnt, stk, nganhang, sotien, noidung, 
               manguonns, niendons, diachi, nguoinhantien, cccd, ngaycap, noicap
        FROM uncngoaidetail 
        WHERE hedaotao = ?
        ORDER BY sounc DESC, stt DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `;
      
      const [rows] = await connection.execute(query, [hedaotao]);

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error in getUNCNgoaiDetailListFull:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách: ' + error.message
      });
    } finally {
      if (connection) await connection.release();
    }
  },

  updateUNCNgoaiDetail: async (req, res) => {
    // TODO: Implement
    res.json({ success: true, message: 'Đã cập nhật thành công' });
  },

  deleteSelectedUNCNgoaiDetail: async (req, res) => {
    // TODO: Implement
    res.json({ success: true, message: 'Đã xóa thành công' });
  },

  exportSelectedUNCNgoaiDetailExcel: async (req, res) => {
    // TODO: Implement
    res.status(500).json({ success: false, message: 'Chưa implement' });
  },

  importUNCNgoaiExcel: async (req, res) => {
    // TODO: Implement
    res.json({ success: true, data: [] });
  },

  saveAllImportedUNCNgoai: async (req, res) => {
    // TODO: Implement
    res.json({ success: true, message: 'Đã lưu thành công' });
  },

  exportUNCNgoaiExcel: async (req, res) => {
    // TODO: Implement
    res.status(500).json({ success: false, message: 'Chưa implement' });
  },

  exportUNCNgoaiExcelFromDB: async (req, res) => {
    // TODO: Implement
    res.status(500).json({ success: false, message: 'Chưa implement' });
  }
};

// Controller xử lý sửa mẫu ủy nhiệm
const suaMauUyNhiemController = {
  // Hiển thị trang sửa mẫu ủy nhiệm
  getSuaMauUyNhiemPage: (req, res) => {
    try {
      res.render('suaMauUyNhiem', {
        title: 'Sửa Mẫu Ủy Nhiệm',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering sua mau uy nhiem page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Tải file mẫu ủy nhiệm
  downloadMauUyNhiem: (req, res) => {
    const fileName = req.params.fileName || 'Mẫu ủy nhiệm chi.xlsx';
    const filePath = path.join(TEMPLATES_DIR, fileName);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).send('Tệp mẫu ủy nhiệm không tìm thấy');
      }

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Lỗi khi tải xuống mẫu ủy nhiệm:', err);
          res.status(500).send('Có lỗi xảy ra khi tải xuống');
        }
      });
    });
  },

  // Upload file mẫu ủy nhiệm mới
  uploadMauUyNhiem: (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Không có tệp nào được gửi!' 
        });
      }

      // Với cấu hình multer mới, file đã được lưu trực tiếp vào thư mục đích
      console.log('File uploaded successfully:', req.file.filename);
      
      res.json({ 
        success: true, 
        message: `File mẫu "${req.file.originalname}" đã được cập nhật thành công!` 
      });
      
    } catch (error) {
      console.error('Error in uploadMauUyNhiem:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Có lỗi xảy ra khi upload file!' 
      });
    }
  },

  // Hiển thị trang mẫu mật mã
  getMauMatMaPage: (req, res) => {
    try {
      res.render('mauMatMa', {
        title: 'Mẫu Mật Mã',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering mau mat ma page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Tải file mẫu mật mã
  downloadMauMatMa: (req, res) => {
    const fileName = req.params.fileName || 'Mẫu mật mã.xlsx';
    const filePath = path.join(TEMPLATES_DIR, fileName);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).send('Tệp mẫu mật mã không tìm thấy');
      }

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Lỗi khi tải xuống mẫu mật mã:', err);
          res.status(500).send('Có lỗi xảy ra khi tải xuống');
        }
      });
    });
  },

  // Upload file mẫu mật mã mới
  uploadMauMatMa: (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Không có tệp nào được gửi!' 
        });
      }

      console.log('File uploaded successfully:', req.file.filename);
      
      res.json({ 
        success: true, 
        message: `File mẫu "${req.file.originalname}" đã được cập nhật thành công!` 
      });
      
    } catch (error) {
      console.error('Error in uploadMauMatMa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Có lỗi xảy ra khi upload file!' 
      });
    }
  }
};

// API để load options cho combo box
const loadOptions = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Load dot options
    const [dotRows] = await connection.execute(`
      SELECT DISTINCT Dot 
      FROM hopdonggvmoi 
      WHERE Dot IS NOT NULL AND Dot != '' 
      ORDER BY Dot
    `);

    // Load ki options
    const [kiRows] = await connection.execute(`
      SELECT DISTINCT KiHoc 
      FROM hopdonggvmoi 
      WHERE KiHoc IS NOT NULL AND KiHoc != '' 
      ORDER BY KiHoc
    `);

    // Load nam hoc options
    const [namHocRows] = await connection.execute(`
      SELECT DISTINCT NamHoc 
      FROM hopdonggvmoi 
      WHERE NamHoc IS NOT NULL AND NamHoc != '' 
      ORDER BY NamHoc DESC
    `);

    // Load khoa options
    const [khoaRows] = await connection.execute(`
      SELECT DISTINCT pb.MaPhongBan, pb.TenPhongBan 
      FROM hopdonggvmoi hd
      LEFT JOIN phongban pb ON hd.MaPhongBan = pb.MaPhongBan
      WHERE hd.MaPhongBan IS NOT NULL AND hd.MaPhongBan != ''
      ORDER BY pb.TenPhongBan
    `);

    // Load he dao tao options
    const [heDaoTaoRows] = await connection.execute(`
      SELECT DISTINCT he_dao_tao 
      FROM hopdonggvmoi 
      WHERE he_dao_tao IS NOT NULL AND he_dao_tao != '' 
      ORDER BY he_dao_tao
    `);

    res.json({
      success: true,
      data: {
        dot: dotRows.map(row => row.Dot),
        ki: kiRows.map(row => row.KiHoc),
        namHoc: namHocRows.map(row => row.NamHoc),
        khoa: khoaRows.map(row => ({ ma: row.MaPhongBan, ten: row.TenPhongBan })),
        heDaoTao: heDaoTaoRows.map(row => row.he_dao_tao)
      }
    });

  } catch (error) {
    console.error('Error in loadOptions:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tải options!'
    });
  } finally {
    if (connection) await connection.end();
  }
};

module.exports = {
  taiUyNhiemChiController: {
    ...taiUyNhiemChiController,
    loadOptions
  },
  suaMauUyNhiemController
};
