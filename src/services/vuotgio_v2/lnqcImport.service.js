/**
 * VUOT GIO V2 - Import Lớp Ngoài Quy Chuẩn Service
 * Parse Excel → INSERT vào course_schedule_details (class_type='ngoai_quy_chuan')
 */

const XLSX = require("xlsx");
const createPoolConnection = require("../../config/databasePool");
const tkbServices = require("../../services/tkbServices");
const LogService = require("../logService");
const repo = require("../../repositories/vuotgio_v2/lnqc.repo");

const CLASS_TYPE = "ngoai_quy_chuan";

function getFirstParenthesesContent(str) {
  const match = String(str || "").match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractPrefix(str) {
  const match = String(str || "").match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

function getHeDaoTao(classType, heDaoTaoArr) {
  const prefix = extractPrefix(classType);
  const found = heDaoTaoArr.find(
    (item) => item.viet_tat.toUpperCase().trim() === prefix.toUpperCase().trim()
  );

  if (!found) {
    return { he_dao_tao: "1", bonus_time: 1 };
  }

  return {
    he_dao_tao: found.gia_tri_so_sanh,
    bonus_time: found.he_so,
  };
}

function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const requiredColumns = ["TT", "Số TC", "Lớp học phần", "Giáo Viên"];

  for (let row = 0; row <= Math.min(range.e.r, 10); row += 1) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: row,
    })[0] || [];

    const rowText = rowData.map((cell) => (cell || "").toString().trim());
    const matchCount = requiredColumns.filter((col) =>
      rowText.some((cell) => cell.includes(col))
    ).length;

    if (matchCount >= 3) {
      console.log(`✅ [LopNgoaiQC Import] Tìm thấy header tại dòng ${row + 1}`);
      return row;
    }
  }

  console.warn("⚠️ [LopNgoaiQC Import] Không tìm thấy header, mặc định dòng 4");
  return 3;
}

function convertDateToMySQL(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/[\/\-.]/);
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
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function formatDateToMySQL(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function masterConvert(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return formatDateToMySQL(excelSerialToDate(input));
  if (input instanceof Date) return formatDateToMySQL(input);
  if (typeof input === "string") return convertDateToMySQL(input);
  return null;
}

const getUserContext = (req) => ({
  userId: req.session?.userId || 1,
  userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
});

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

      const validHeaders = headerRow.map((header) => (header || "").toString().trim());
      const normalizedHeaders = validHeaders.map((header) =>
        header.replace(/[\r\n\t]+/g, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
      );

      console.log(`[LopNgoaiQC Import] Sheet "${sheetName}" headers:`, JSON.stringify(normalizedHeaders));

      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: normalizedHeaders,
        range: dataStartIndex,
        defval: "",
        raw: false,
        cellText: true,
      });

      rawRows.forEach((row, rowIndex) => {
        const realRowNumber = dataStartIndex + rowIndex + 1;
        for (let col = 0; col < normalizedHeaders.length; col += 1) {
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

    const columnsToMerge = ["TT", "Mã HP", "Số TC", "Lớp học phần", "Giáo Viên", "Số SV", "ST/ tuần"];
    for (let i = 1; i < allData.length; i += 1) {
      for (const key of Object.keys(allData[i])) {
        if (columnsToMerge.includes(key) && (allData[i][key] === "" || allData[i][key] === undefined)) {
          allData[i][key] = allData[i - 1][key];
        }
      }
    }

    const renameMap = {
      TT: "tt",
      "Mã HP": "course_code",
      "Số TC": "credit_hours",
      LL: "ll_total",
      "Số SV": "student_quantity",
      "HS lớp đông": "student_bonus",
      "Ngoài giờ HC": "bonus_time",
      "LL thực": "ll_code_actual",
      "Lớp học phần": "course_name",
      "Hình thức học": "study_format",
      "ST/ tuần": "periods_per_week",
      Thứ: "day_of_week",
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
      newRow.start_date = masterConvert(newRow.start_date);
      newRow.end_date = masterConvert(newRow.end_date);

      const courseCode = (newRow.course_code || "").trim().toUpperCase();
      const firstChar = courseCode.charAt(0);
      newRow.major = majorMap[firstChar] || "";

      if (index === 0) {
        console.log(`📍 [LopNgoaiQC] Row 0 - Keys:`, JSON.stringify(Object.keys(row).filter((key) => key !== "sheet_name")));
        console.log(`📍 [LopNgoaiQC] Row 0 - lecturer: "${newRow.lecturer}", course_name: "${newRow.course_name}"`);
        console.log(`📍 [LopNgoaiQC] Row 0 - Course Code: "${newRow.course_code}", Major: "${newRow.major}"`);
      }

      return newRow;
    });

    let preTT = 0;
    let llTmp = 0;
    let lastTTValue = 0;

    for (let i = 0; i < renamedData.length; i += 1) {
      const row = renamedData[i];
      const classType = getFirstParenthesesContent(row.course_name) || "";
      const { he_dao_tao, bonus_time } = getHeDaoTao(classType, kiTuBatDauArr);
      row.he_dao_tao = he_dao_tao;
      row.bonus_time = bonus_time;

      let tmp = 0;
      const range = typeof row.period_range === "string"
        ? row.period_range
        : (row.period_range != null ? String(row.period_range) : null);

      if (range && range.includes("->")) {
        const [start, end] = range.split("->").map(Number);
        row.period_start = Number.isNaN(start) ? null : start;
        row.period_end = Number.isNaN(end) ? null : end;
        if (!Number.isNaN(start) && start >= 13) {
          tmp += 1;
        }
      } else {
        row.period_start = null;
        row.period_end = null;
      }

      const dayOfWeek = String(row.day_of_week || "").trim().toUpperCase();
      if (dayOfWeek === "CN" || dayOfWeek === "7") {
        tmp += 1;
      }

      if (tmp > 0) {
        row.bonus_time = row.bonus_time * 1.5;
      }

      row.student_bonus = tkbServices.calculateStudentBonus(
        parseInt(row.student_quantity, 10) || 0,
        bonusRules
      );

      if (i > 0) {
        if (row.tt !== preTT) {
          preTT = row.tt;
          row.tt = ++lastTTValue;
          llTmp = row.ll_total || 0;
        } else {
          row.tt = lastTTValue;
        }
      } else {
        preTT = row.tt;
        row.tt = ++lastTTValue;
        llTmp = row.ll_total || 0;
      }

      row.ll_total = llTmp;
      row.qc = parseFloat((row.ll_total * row.bonus_time * row.student_bonus).toFixed(2));
    }

    const filteredData = renamedData.filter(
      (row) =>
        (row.course_name && row.course_name.toString().trim() !== "") ||
        (row.lecturer && row.lecturer.toString().trim() !== "")
    );

    console.log(`[LopNgoaiQC Import] Parsed ${filteredData.length} raw rows from Excel`);

    const groupedMap = {};

    for (const row of filteredData) {
      const key = row.tt;
      if (!key && key !== 0) continue;

      if (!groupedMap[key]) {
        groupedMap[key] = { ...row };
      } else {
        const group = groupedMap[key];
        group.ll_total = Math.max(parseFloat(group.ll_total) || 0, parseFloat(row.ll_total) || 0);
        group.credit_hours = Math.max(parseFloat(group.credit_hours) || 0, parseFloat(row.credit_hours) || 0);
        group.student_quantity = Math.max(parseInt(group.student_quantity, 10) || 0, parseInt(row.student_quantity, 10) || 0);
        group.student_bonus = Math.max(parseFloat(group.student_bonus) || 1, parseFloat(row.student_bonus) || 1);
        group.bonus_time = Math.max(parseFloat(group.bonus_time) || 1, parseFloat(row.bonus_time) || 1);
        group.qc = Math.max(parseFloat(group.qc) || 0, parseFloat(row.qc) || 0);

        if (row.start_date && (!group.start_date || row.start_date < group.start_date)) {
          group.start_date = row.start_date;
        }
        if (row.end_date && (!group.end_date || row.end_date > group.end_date)) {
          group.end_date = row.end_date;
        }
        if (row.course_name) group.course_name = row.course_name;
        if (row.course_code) group.course_code = row.course_code;
        if (row.lecturer) group.lecturer = row.lecturer;
        if (row.major) group.major = row.major;
      }
    }

    const groupedData = Object.values(groupedMap).map((row) => ({
      tt: row.tt,
      course_id: (row.course_code || "").toString().trim().match(/^[A-Za-z]+/)?.[0] || "",
      course_name: row.course_name || "",
      course_code: row.course_code || "",
      major: row.major || "",
      lecturer: row.lecturer || "",
      start_date: row.start_date || null,
      end_date: row.end_date || null,
      ll_total: row.ll_total || 0,
      credit_hours: row.credit_hours || 0,
      ll_code: 0,
      student_quantity: row.student_quantity || 0,
      student_bonus: row.student_bonus || 1,
      bonus_time: row.bonus_time || 1,
      qc: row.qc || 0,
      dot: Dot || "1",
      ki_hoc: HocKy || "1",
      nam_hoc: NamHoc || "",
      note: "",
      he_dao_tao: row.he_dao_tao || "",
    }));

    console.log(`[LopNgoaiQC Import] Grouped into ${groupedData.length} unique classes (from ${filteredData.length} sub-rows)`);

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
      data: groupedData,
    });
  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi khi parse Excel:", error);
    res.status(500).json({ success: false, message: "Lỗi khi xử lý file Excel: " + error.message });
  }
};

const confirmImport = async (req, res) => {
  const { userId, userName } = getUserContext(req);
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

    let lastTT = await repo.getDraftMaxTT(connection, { dot, kiHoc: ki_hoc, namHoc: nam_hoc });

    if (records.length > 0) {
      console.log(`[LopNgoaiQC confirmImport] records[0] keys:`, Object.keys(records[0]));
      console.log(`[LopNgoaiQC confirmImport] records[0].lecturer:`, JSON.stringify(records[0].lecturer));
    }

    const values = records.map((row) => {
      lastTT += 1;
      return [
        lastTT,
        row.course_code || "",
        row.credit_hours || 0,
        row.student_quantity || 0,
        row.student_bonus || 1,
        row.bonus_time || 1,
        row.ll_code || 0,
        row.ll_total || 0,
        row.qc || 0,
        row.course_name || "",
        row.lecturer || "",
        row.major || "",
        row.he_dao_tao || "",
        row.course_id || "",
        row.start_date || null,
        row.end_date || null,
        dot,
        ki_hoc,
        nam_hoc || row.nam_hoc || "",
        row.note || "",
        CLASS_TYPE,
        0,
      ];
    });

    const [result] = await repo.insertDraft(connection, values);

    try {
      await LogService.logChange(userId, userName, "Import lớp ngoài QC (nháp)", `Import ${result.affectedRows} dòng từ file Excel`);
    } catch (error) {
      console.error("Log error:", error);
    }

    console.log(`[LopNgoaiQC Import] Inserted ${result.affectedRows} rows into course_schedule_details`);

    res.status(200).json({
      success: true,
      message: `Import thành công ${result.affectedRows} dòng vào bảng nháp!`,
    });
  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi confirm import:", error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

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
      count: rows[0].count,
    });
  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi check exist:", error);
    res.status(500).json({ success: false, message: "Lỗi kiểm tra dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  parseExcel,
  confirmImport,
  checkDataExist,
};