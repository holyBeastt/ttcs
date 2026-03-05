/**
 * VUOT GIO V2 - Import Lớp Ngoài Quy Chuẩn Controller
 * Parse file Excel (cùng format TKB) → trả JSON preview → confirm insert vào lopngoaiquychuan
 * Date: 2026-02-10
 */

const XLSX = require("xlsx");
const pool = require("../../config/Pool");
const createPoolConnection = require("../../config/databasePool");
const tkbServices = require("../../services/tkbServices");
const LogService = require("../../services/logService");

// =====================================================
// HELPER FUNCTIONS (reuse từ TKBImportController)
// =====================================================

function getFirstParenthesesContent(str) {
  const match = str.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractPrefix(str) {
  const match = str.match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

function getHeDaoTao(classType, heDaoTaoArr) {
  const prefix = extractPrefix(classType);
  const found = heDaoTaoArr.find(
    r => r.viet_tat.toUpperCase().trim() === prefix.toUpperCase().trim()
  );
  if (!found) {
    return { he_dao_tao: "1", bonus_time: 1 };
  }
  return {
    he_dao_tao: found.gia_tri_so_sanh,
    bonus_time: found.he_so
  };
}

function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const requiredColumns = ['TT', 'Số TC', 'Lớp học phần', 'Giáo Viên'];

  for (let row = 0; row <= Math.min(range.e.r, 10); row++) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: row
    })[0] || [];

    const rowText = rowData.map(cell => (cell || '').toString().trim());
    const matchCount = requiredColumns.filter(col =>
      rowText.some(cell => cell.includes(col))
    ).length;

    if (matchCount >= 3) {
      console.log(`✅ [LopNgoaiQC Import] Tìm thấy header tại dòng ${row + 1}`);
      return row;
    }
  }

  console.warn('⚠️ [LopNgoaiQC Import] Không tìm thấy header, mặc định dòng 4');
  return 3;
}

function convertDateToMySQL(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    const dateObj = new Date(year, month - 1, day);
    if (
      dateObj.getFullYear() === year &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getDate() === day
    ) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }
  return null;
}

function excelSerialToDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

function formatDateToMySQL(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function masterConvert(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return formatDateToMySQL(excelSerialToDate(input));
  if (input instanceof Date) return formatDateToMySQL(input);
  if (typeof input === 'string') return convertDateToMySQL(input);
  return null;
}

// =====================================================
// MAIN FUNCTIONS
// =====================================================

/**
 * Parse file Excel → trả JSON cho frontend preview (KHÔNG insert DB)
 */
const parseExcel = async (req, res) => {
  const { NamHoc, HocKy } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Vui lòng chọn file Excel." });
  }

  try {
    // Lấy dữ liệu cần thiết
    const bonusRules = await tkbServices.getBonusRules();
    const kiTuBatDauArr = await tkbServices.getHeDaoTaoList();
    const majorMap = await tkbServices.getMajorPrefixMap();

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: false,
      raw: false,
      cellText: true,
    });

    let allData = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const headerRowIndex = findHeaderRow(sheet);
      const dataStartIndex = headerRowIndex + 1;

      const headerRow = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: headerRowIndex,
      })[0] || [];

      const validHeaders = headerRow.map((h) => (h || "").toString().trim());

      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: validHeaders,
        range: dataStartIndex,
        defval: "",
        raw: false,
        cellText: true,
      });

      const range = XLSX.utils.decode_range(sheet["!ref"]);

      rawRows.forEach((row, rowIndex) => {
        let realRowNumber = dataStartIndex + rowIndex + 1;
        for (let col = 0; col < validHeaders.length; col++) {
          const colLetter = XLSX.utils.encode_col(col);
          const cellAddress = `${colLetter}${realRowNumber}`;
          const cell = sheet[cellAddress];
          if (cell && cell.w !== undefined) {
            row[validHeaders[col]] = cell.w;
          }
        }
        row.sheet_name = sheetName;
      });

      allData = allData.concat(rawRows);
    });

    if (allData.length === 0) {
      return res.status(400).json({ success: false, message: "File Excel không có dữ liệu." });
    }

    // Merge các cột từ dòng trên
    const columnsToMerge = ["TT", "Mã HP", "Số TC", "Lớp học phần", "Giáo Viên", "Số SV", "ST/ tuần"];
    for (let i = 1; i < allData.length; i++) {
      for (const key of Object.keys(allData[i])) {
        if (columnsToMerge.includes(key) && (allData[i][key] === "" || allData[i][key] === undefined)) {
          allData[i][key] = allData[i - 1][key];
        }
      }
    }

    // Rename columns
    const renameMap = {
      "TT": "tt",
      "Mã HP": "MaHocPhan",
      "Số TC": "SoTC",
      "LL": "LenLop",
      "Số SV": "SoSV",
      "Lớp học phần": "TenHocPhan",
      "Giáo Viên": "GiangVien",
    };

    const renamedData = allData.map((row) => {
      const newRow = {};
      for (const [oldKey, newKey] of Object.entries(renameMap)) {
        newRow[newKey] = row[oldKey] ?? "";
      }

      // Phân loại Khoa
      const courseCode = (newRow.MaHocPhan || "").trim().toUpperCase();
      const firstChar = courseCode.charAt(0);
      newRow.Khoa = majorMap[firstChar] || "";

      // Tính hệ đào tạo
      const classType = getFirstParenthesesContent(newRow.TenHocPhan) || "";
      const { he_dao_tao, bonus_time } = getHeDaoTao(classType, kiTuBatDauArr);
      newRow.he_dao_tao = he_dao_tao;
      newRow.HeSoT7CN = bonus_time;

      // Tính hệ số lớp đông
      newRow.HeSoLopDong = tkbServices.calculateStudentBonus(
        parseInt(newRow.SoSV) || 0,
        bonusRules
      );

      // Tính quy chuẩn
      const lenLop = parseFloat(newRow.LenLop) || 0;
      const heSoT7CN = parseFloat(newRow.HeSoT7CN) || 1;
      const heSoLopDong = parseFloat(newRow.HeSoLopDong) || 1;
      newRow.QuyChuan = lenLop * heSoT7CN * heSoLopDong;

      // Metadata
      newRow.NamHoc = NamHoc || "";
      newRow.HocKy = HocKy || "1";
      newRow.SoTietCTDT = 0;
      newRow.SoTietKT = 0;
      newRow.Lop = "";
      newRow.GhiChu = "";

      return newRow;
    });

    // Lọc bỏ dòng rỗng (không có TenHocPhan và GiangVien)
    const filteredData = renamedData.filter(row =>
      (row.TenHocPhan && row.TenHocPhan.toString().trim() !== "") ||
      (row.GiangVien && row.GiangVien.toString().trim() !== "")
    );

    console.log(`[LopNgoaiQC Import] Parsed ${filteredData.length} rows from Excel`);

    res.status(200).json({
      success: true,
      message: `Đọc file thành công: ${filteredData.length} dòng`,
      data: filteredData
    });

  } catch (err) {
    console.error("[LopNgoaiQC Import] Lỗi khi parse Excel:", err);
    res.status(500).json({ success: false, message: "Lỗi khi xử lý file Excel: " + err.message });
  }
};

/**
 * Confirm import → INSERT batch vào lopngoaiquychuan
 */
const confirmImport = async (req, res) => {
  const userId = req.session?.userId || 1;
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
  const records = req.body.records;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: "Không có dữ liệu để import." });
  }

  let connection;
  try {
    connection = await createPoolConnection();

    const values = records.map(row => [
      row.NamHoc || '',
      row.HocKy || 1,
      row.TenHocPhan || '',
      row.MaHocPhan || '',
      row.SoTC || 0,
      row.Lop || '',
      row.LenLop || 0,
      row.SoSV || 0,
      row.SoTietCTDT || 0,
      row.SoTietKT || 0,
      row.HeSoT7CN || 1,
      row.HeSoLopDong || 1,
      row.QuyChuan || 0,
      row.GhiChu || '',
      row.GiangVien || '',
      row.Khoa || '',
      row.he_dao_tao || '',
      '', // DoiTuong
      '', // HinhThucKTGiuaKy
      0,  // SoDe
      0,  // HoanThanh
      userId
    ]);

    const insertQuery = `
      INSERT INTO lopngoaiquychuan
      (NamHoc, HocKy, TenHocPhan, MaHocPhan, SoTC, Lop, LenLop, SoSV,
       SoTietCTDT, SoTietKT, HeSoT7CN, HeSoLopDong, QuyChuan, GhiChu,
       GiangVien, Khoa, he_dao_tao, DoiTuong, HinhThucKTGiuaKy, SoDe,
       HoanThanh, id_User)
      VALUES ?
    `;

    const [result] = await connection.query(insertQuery, [values]);

    // Ghi log
    try {
      await LogService.logChange(
        userId,
        userName,
        'Import lớp ngoài quy chuẩn',
        `Import ${result.affectedRows} dòng từ file Excel`
      );
    } catch (logError) {
      console.error("Lỗi khi ghi log:", logError);
    }

    console.log(`[LopNgoaiQC Import] Inserted ${result.affectedRows} rows`);

    res.status(200).json({
      success: true,
      message: `Import thành công ${result.affectedRows} dòng!`
    });

  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi khi confirm import:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi import: " + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Kiểm tra dữ liệu đã tồn tại chưa
 */
const checkDataExist = async (req, res) => {
  const { NamHoc, HocKy } = req.body;

  let connection;
  try {
    connection = await createPoolConnection();

    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM lopngoaiquychuan WHERE NamHoc = ? AND HocKy = ?`,
      [NamHoc, HocKy || 1]
    );

    res.json({
      exists: rows[0].count > 0,
      count: rows[0].count
    });

  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi check exist:", error);
    res.status(500).json({ success: false, message: "Lỗi kiểm tra dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  parseExcel,
  confirmImport,
  checkDataExist
};
