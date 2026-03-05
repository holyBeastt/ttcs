/**
 * VUOT GIO V2 - Import Lớp Ngoài Quy Chuẩn Controller
 * Refactored: Parse Excel → INSERT vào course_schedule_details (class_type='ngoai_quy_chuan')
 * Date: 2026-03-04
 */

const XLSX = require("xlsx");
const pool = require("../../config/Pool");
const createPoolConnection = require("../../config/databasePool");
const tkbServices = require("../../services/tkbServices");
const LogService = require("../../services/logService");

const CLASS_TYPE = 'ngoai_quy_chuan';

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
 * Trả về dữ liệu với tên cột kiểu course_schedule_details
 */
const parseExcel = async (req, res) => {
  const { NamHoc, HocKy, Dot } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Vui lòng chọn file Excel." });
  }

  try {
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

      // Normalize headers: thay thế line breaks, multiple spaces → single space
      // Đây là bước mà TKB không cần vì TKB insert tất cả sub-rows,
      // nhưng LopNgoaiQC gom nhóm trong JS nên phải đảm bảo renameMap khớp
      const normalizedHeaders = validHeaders.map(h =>
        h.replace(/[\r\n\t]+/g, ' ')         // line breaks → space
         .replace(/\u00a0/g, ' ')             // non-breaking space → space
         .replace(/\s+/g, ' ')               // multiple spaces → single
         .trim()
      );

      console.log(`[LopNgoaiQC Import] Sheet "${sheetName}" headers:`, JSON.stringify(normalizedHeaders));

      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: normalizedHeaders,
        range: dataStartIndex,
        defval: "",
        raw: false,
        cellText: true,
      });

      const range = XLSX.utils.decode_range(sheet["!ref"]);

      rawRows.forEach((row, rowIndex) => {
        let realRowNumber = dataStartIndex + rowIndex + 1;
        for (let col = 0; col < normalizedHeaders.length; col++) {
          const colLetter = XLSX.utils.encode_col(col);
          const cellAddress = `${colLetter}${realRowNumber}`;
          const cell = sheet[cellAddress];
          if (cell && cell.w !== undefined) {
            row[normalizedHeaders[col]] = cell.w;
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

    // =====================================================
    // RENAME COLUMNS (copy từ TKBImportController)
    // =====================================================
    const renameMap = {
      "TT": "tt",
      "Mã HP": "course_code",
      "Số TC": "credit_hours",
      "LL": "ll_total",
      "Số SV": "student_quantity",
      "HS lớp đông": "student_bonus",
      "Ngoài giờ HC": "bonus_time",
      "LL thực": "ll_code_actual",
      "Lớp học phần": "course_name",
      "Hình thức học": "study_format",
      "ST/ tuần": "periods_per_week",
      "Thứ": "day_of_week",
      "Tiết học": "period_range",
      "Phòng học": "classroom",
      "Ngày BĐ": "start_date",
      "Ngày KT": "end_date",
      "Giáo Viên": "lecturer",
    };

    const renamedData = allData.map((row, index) => {
      const newRow = {};
      for (const [oldKey, newKey] of Object.entries(renameMap)) {
        newRow[newKey] = row[oldKey] ?? "";
      }

      // FALLBACK: Nếu lecturer rỗng, thử tìm key chứa "Giáo" hoặc "Viên" trong row
      // Phòng trường hợp header Excel khác ký tự (line break, unicode, casing...)
      if (!newRow.lecturer || newRow.lecturer.toString().trim() === "") {
        for (const key of Object.keys(row)) {
          if (key !== "sheet_name" && /Gi[áa]o|Vi[êe]n|GV/i.test(key)) {
            const val = row[key];
            if (val && val.toString().trim() !== "") {
              console.log(`🔄 [LopNgoaiQC] Fallback lecturer từ key "${key}": "${val}"`);
              newRow.lecturer = val;
              break;
            }
          }
        }
      }

      newRow.sheet_name = row.sheet_name;

      // Convert ngày tháng (giống TKB)
      newRow.start_date = masterConvert(newRow.start_date);
      newRow.end_date = masterConvert(newRow.end_date);

      // Phân loại Khoa (giống TKB)
      const courseCode = (newRow.course_code || "").trim().toUpperCase();
      const firstChar = courseCode.charAt(0);
      newRow.major = majorMap[firstChar] || "";

      if (index === 0) {
        console.log(`📍 [LopNgoaiQC] Row 0 - Keys:`, JSON.stringify(Object.keys(row).filter(k => k !== 'sheet_name')));
        console.log(`📍 [LopNgoaiQC] Row 0 - lecturer: "${newRow.lecturer}", course_name: "${newRow.course_name}"`);
        console.log(`📍 [LopNgoaiQC] Row 0 - Course Code: "${newRow.course_code}", Major: "${newRow.major}"`);
      }

      return newRow;
    });

    // =====================================================
    // XỬ LÝ TỪNG DÒNG (copy logic TKBImportController dòng 270-360)
    // =====================================================
    let preTT = 0;
    let ll_tmp = 0;
    let lastTTValue = 0; // Bắt đầu từ 0 vì chỉ là preview

    for (let i = 0; i < renamedData.length; i++) {
      const row = renamedData[i];

      // 1. Tìm hệ đào tạo (giống TKB)
      const classType = getFirstParenthesesContent(row.course_name) || "";
      const { he_dao_tao, bonus_time } = getHeDaoTao(classType, kiTuBatDauArr);
      row.he_dao_tao = he_dao_tao;
      row.bonus_time = bonus_time;

      // 2. Kiểm tra T7/CN → bonus_time *= 1.5 (giống TKB)
      let tmp = 0;
      const range = (typeof row.period_range === "string")
        ? row.period_range
        : (row.period_range != null ? String(row.period_range) : null);

      if (range && range.includes("->")) {
        const [start, end] = range.split("->").map(Number);
        row.period_start = isNaN(start) ? null : start;
        row.period_end = isNaN(end) ? null : end;
        if (!isNaN(start) && start >= 13) {
          tmp++;
        }
      } else {
        row.period_start = null;
        row.period_end = null;
      }

      const dayOfWeek = String(row.day_of_week || "").trim().toUpperCase();
      if (dayOfWeek == "CN" || dayOfWeek == "7") {
        tmp++;
      }

      if (tmp > 0) {
        row.bonus_time = row.bonus_time * 1.5;
      }

      // 3. Tính hệ số lớp đông (giống TKB)
      row.student_bonus = tkbServices.calculateStudentBonus(
        parseInt(row.student_quantity) || 0,
        bonusRules
      );

      // 4. GÁN LẠI TT TUẦN TỰ (QUAN TRỌNG - giống TKB dòng 324-339)
      // Đây là bước bị thiếu trước đó, giúp TT unique across sheets
      if (i > 0) {
        if (row.tt !== preTT) {
          preTT = row.tt;
          row.tt = ++lastTTValue;
          ll_tmp = row.ll_total || 0;
        } else {
          row.tt = lastTTValue;
        }
      } else {
        preTT = row.tt;
        row.tt = ++lastTTValue;
        ll_tmp = row.ll_total || 0;
      }

      // 5. ll_total chỉ lấy từ dòng đầu tiên của mỗi nhóm (giống TKB)
      row.ll_total = ll_tmp;

      // 6. Tính quy chuẩn (giống TKB)
      row.qc = parseFloat((row.ll_total * row.bonus_time * row.student_bonus).toFixed(2));
    }

    // Lọc bỏ dòng rỗng
    const filteredData = renamedData.filter(row =>
      (row.course_name && row.course_name.toString().trim() !== "") ||
      (row.lecturer && row.lecturer.toString().trim() !== "")
    );

    console.log(`[LopNgoaiQC Import] Parsed ${filteredData.length} raw rows from Excel`);

    // =====================================================
    // GOM NHÓM THEO TT MỚI (giống SQL GROUP BY tt của getDataTKBChinhThuc)
    // TT đã được gán lại tuần tự → unique across sheets
    // =====================================================
    const groupedMap = {};

    for (const row of filteredData) {
      const key = row.tt;
      if (!key && key !== 0) continue;

      if (!groupedMap[key]) {
        groupedMap[key] = { ...row };
      } else {
        // Gom nhóm: MAX/MIN giống SQL GROUP BY trong getDataTKBChinhThuc
        const g = groupedMap[key];
        g.ll_total = Math.max(parseFloat(g.ll_total) || 0, parseFloat(row.ll_total) || 0);
        g.credit_hours = Math.max(parseFloat(g.credit_hours) || 0, parseFloat(row.credit_hours) || 0);
        g.student_quantity = Math.max(parseInt(g.student_quantity) || 0, parseInt(row.student_quantity) || 0);
        g.student_bonus = Math.max(parseFloat(g.student_bonus) || 1, parseFloat(row.student_bonus) || 1);
        g.bonus_time = Math.max(parseFloat(g.bonus_time) || 1, parseFloat(row.bonus_time) || 1);
        g.qc = Math.max(parseFloat(g.qc) || 0, parseFloat(row.qc) || 0);

        // MIN(start_date) - lấy ngày bắt đầu sớm nhất (giống SQL)
        if (row.start_date && (!g.start_date || row.start_date < g.start_date)) {
          g.start_date = row.start_date;
        }
        // MAX(end_date) - lấy ngày kết thúc muộn nhất (giống SQL)
        if (row.end_date && (!g.end_date || row.end_date > g.end_date)) {
          g.end_date = row.end_date;
        }
        // MAX cho các field text quan trọng
        if (row.course_name) g.course_name = row.course_name;
        if (row.course_code) g.course_code = row.course_code;
        if (row.lecturer) g.lecturer = row.lecturer;
        if (row.major) g.major = row.major;
      }
    }

    // =====================================================
    // CLEAN OUTPUT: Chỉ trả về các field cần thiết (giống getTable SELECT)
    // Loại bỏ noise fields: study_format, periods_per_week, day_of_week,
    // period_range, classroom, sheet_name, ll_code_actual, period_start, period_end
    // Đảm bảo thứ tự field trùng với SQL SELECT → dynamic columns hiển thị đúng
    // =====================================================
    // Thứ tự field PHẢI trùng với SQL SELECT trong getTable (lopNgoaiQC.controller.js)
    // Để dynamic columns (Object.keys) hiển thị đúng thứ tự
    const groupedData = Object.values(groupedMap).map(row => ({
      tt: row.tt,
      course_id: (row.course_code || '').toString().trim().match(/^[A-Za-z]+/)?.[0] || '',
      course_name: row.course_name || '',
      course_code: row.course_code || '',
      major: row.major || '',
      lecturer: row.lecturer || '',
      start_date: row.start_date || null,
      end_date: row.end_date || null,
      ll_total: row.ll_total || 0,
      credit_hours: row.credit_hours || 0,
      ll_code: 0,
      student_quantity: row.student_quantity || 0,
      student_bonus: row.student_bonus || 1,
      bonus_time: row.bonus_time || 1,
      qc: row.qc || 0,
      dot: Dot || '1',
      ki_hoc: HocKy || '1',
      nam_hoc: NamHoc || '',
      note: '',
      he_dao_tao: row.he_dao_tao || '',
    }));

    console.log(`[LopNgoaiQC Import] Grouped into ${groupedData.length} unique classes (from ${filteredData.length} sub-rows)`);

    // Debug: log dòng đầu tiên để kiểm tra lecturer
    if (groupedData.length > 0) {
      console.log(`[LopNgoaiQC Import] Sample row[0]:`, JSON.stringify({
        tt: groupedData[0].tt,
        course_name: groupedData[0].course_name,
        lecturer: groupedData[0].lecturer,
        major: groupedData[0].major,
        start_date: groupedData[0].start_date,
        end_date: groupedData[0].end_date,
      }));
    }

    res.status(200).json({
      success: true,
      message: `Đọc file thành công: ${groupedData.length} lớp học phần (gom từ ${filteredData.length} dòng)`,
      data: groupedData
    });

  } catch (err) {
    console.error("[LopNgoaiQC Import] Lỗi khi parse Excel:", err);
    res.status(500).json({ success: false, message: "Lỗi khi xử lý file Excel: " + err.message });
  }
};

/**
 * Confirm import → INSERT batch vào course_schedule_details (nháp)
 */
const confirmImport = async (req, res) => {
  const userId = req.session?.userId || 1;
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
  const records = req.body.records;
  const dot = req.body.dot || 1;
  const ki_hoc = req.body.ki_hoc || 1;
  const nam_hoc = req.body.nam_hoc;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: "Không có dữ liệu để import." });
  }

  let connection;
  try {
    connection = await createPoolConnection();

    // Tìm max tt hiện tại (giống TKBImportController)
    const [maxTTResult] = await connection.query(
      `SELECT MAX(tt) AS maxTT FROM course_schedule_details WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?`,
      [dot, ki_hoc, nam_hoc]
    );
    let lastTT = maxTTResult[0].maxTT || 0;

    // Dữ liệu đã được gom nhóm sẵn ở parseExcel → mỗi dòng = 1 lớp duy nhất → 1 tt mới
    // Debug: log dòng đầu vào để kiểm tra lecturer
    if (records.length > 0) {
      console.log(`[LopNgoaiQC confirmImport] records[0] keys:`, Object.keys(records[0]));
      console.log(`[LopNgoaiQC confirmImport] records[0].lecturer:`, JSON.stringify(records[0].lecturer));
    }

    const values = records.map(row => {
      lastTT++;
      return [
        lastTT,
        row.course_code || '',
        row.credit_hours || 0,
        row.student_quantity || 0,
        row.student_bonus || 1,
        row.bonus_time || 1,
        row.ll_code || 0,
        row.ll_total || 0,
        row.qc || 0,
        row.course_name || '',
        row.lecturer || '',
        row.major || '',
        row.he_dao_tao || '',
        row.course_id || '',
        row.start_date || null,
        row.end_date || null,
        dot,
        ki_hoc,
        nam_hoc || row.nam_hoc || '',
        row.note || '',
        CLASS_TYPE,
        0 // da_luu = 0 (nháp)
      ];
    });

    const insertQuery = `
      INSERT INTO course_schedule_details
      (tt, course_code, credit_hours, student_quantity, student_bonus, bonus_time,
       ll_code, ll_total, qc, course_name, lecturer, major, he_dao_tao, course_id,
       start_date, end_date,
       dot, ki_hoc, nam_hoc, note, class_type, da_luu)
      VALUES ?
    `;

    const [result] = await connection.query(insertQuery, [values]);

    try {
      await LogService.logChange(userId, userName, 'Import lớp ngoài QC (nháp)',
        `Import ${result.affectedRows} dòng từ file Excel`);
    } catch (e) { console.error("Log error:", e); }

    console.log(`[LopNgoaiQC Import] Inserted ${result.affectedRows} rows into course_schedule_details`);

    res.status(200).json({
      success: true,
      message: `Import thành công ${result.affectedRows} dòng vào bảng nháp!`
    });

  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi confirm import:", error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Kiểm tra dữ liệu nháp đã tồn tại chưa
 */
const checkDataExist = async (req, res) => {
  const { nam_hoc, ki_hoc, dot } = req.body;

  let connection;
  try {
    connection = await createPoolConnection();

    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM course_schedule_details WHERE nam_hoc = ? AND ki_hoc = ? AND dot = ? AND class_type = ? AND da_luu = 0`,
      [nam_hoc, ki_hoc || 1, dot || 1, CLASS_TYPE]
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
