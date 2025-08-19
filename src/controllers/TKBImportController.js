const XLSX = require("xlsx");
const pool = require("../config/Pool");

const importExcelTKB = async (req, res) => {
  const semester = JSON.parse(req.body.semester);
  let lastTTValue = JSON.parse(req.body.lastTTValue);

  const { dot, ki, nam } = semester;

  if (!req.file) {
    return res.status(400).json({ message: "Vui lòng chọn file Excel." });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    let allData = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      // Lấy hàng tiêu đề (row 4 trong file Excel)
      const headerRow =
        XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          range: 3, // chỉ đọc hàng thứ 4
        })[0] || [];

      // Lọc header rỗng
      const validHeaders = headerRow.map((h) => (h || "").toString().trim());

      // Đọc dữ liệu từ hàng thứ 5 trở đi
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: validHeaders,
        range: 4,
        defval: "",
        raw: false,
        cellDates: true,
      });

      // Gắn tên sheet vào từng dòng
      data.forEach((row) => {
        row.sheet_name = sheetName;
      });

      allData = allData.concat(data);
    });

    if (allData.length === 0) {
      return res.status(400).json({ message: "File Excel không có dữ liệu." });
    }

    // Xử lý merge: ô trống lấy giá trị từ dòng trên
    for (let i = 1; i < allData.length; i++) {
      for (const key of Object.keys(allData[i])) {
        if (allData[i][key] === "") {
          allData[i][key] = allData[i - 1][key];
        }
      }
    }

    // Map tên cột từ tiếng Việt sang key tiếng Anh
    const renameMap = {
      "TT": "tt",
      "Mã HP": "course_code",
      "Số TC": "credit_hours",
      "LL": "ll_code",
      "Số \nSV": "student_quantity",
      "HS lớp đông": "student_bonus",
      "Ngoài giờ HC": "bonus_time",
      "LL thực": "ll_code_actual",
      "QC": "qc",
      "Lớp học phần": "course_name",
      "Hình thức học": "study_format",
      "ST/ tuần": "periods_per_week",
      "Thứ": "day_of_week",
      "Tiết học": "period_range",
      "Phòng học": "classroom",
      "Ngày BĐ\n(tuần)": "start_date",
      "Ngày KT\n(tuần)": "end_date",
      "Giáo Viên": "lecturer",
    };

    const majorMap = {
      "C": "CNTT",
      "D": "ĐTVM",
      "A": "ATTT",
    }

    const renamedData = allData.map((row) => {
      const newRow = {};
      for (const [oldKey, newKey] of Object.entries(renameMap)) {
        newRow[newKey] = row[oldKey] ?? "";
      }
      newRow.sheet_name = row.sheet_name;

      // Lấy các chữ cái đầu tiên trong sheet_name
      const prefixLetters = (row.sheet_name || "").trim().match(/^[A-Za-zÀ-ỹ]+/g)?.[0] || "";

      if (prefixLetters.length > 1) {
        newRow.major = "CB"; // Khoa Cơ bản
      } else {
        const sheetPrefix = prefixLetters.charAt(0);
        newRow.major = majorMap[sheetPrefix] || "unknown";
      }

      return newRow;
    });

    // Tính tổng tiết cho mỗi lớp học phần
    const tongTietMap = {};
    for (const row of renamedData) {
      if (row.period_range && row.period_range.includes("->")) {
        const [startTiet, endTiet] = row.period_range.split("->").map(Number);
        const tietBuoi = endTiet - startTiet + 1;
        const startDate = parseDateDDMMYY(row.start_date);
        const endDate = parseDateDDMMYY(row.end_date);
        const soTuan = Math.ceil(
          (endDate - startDate) / (7 * 24 * 60 * 60 * 1000)
        );
        const tongTiet = soTuan * tietBuoi;
        tongTietMap[row.course_name] =
          (tongTietMap[row.course_name] || 0) + tongTiet;
      }
    }

    let preTT = 0;

    for (let i = 0; i < renamedData.length; i++) {
      const row = renamedData[i];

      // Thêm period_start, period_end, ll_total vào từng dòng
      if (row.period_range.includes("->")) {
        const [start, end] = row.period_range.split("->");
        row.period_start = start || null;
        row.period_end = end || null;
      } else {
        row.period_start = null;
        row.period_end = null;
      }

      row.ll_total = tongTietMap[row.course_name] || 0;

      // Gán lại tt phục vụ quy chuẩn
      if (i > 0) {
        // Chỉnh sửa tt phục vụ quy chuẩn
        if (row.tt !== preTT) {
          preTT = row.tt;
          row.tt = ++lastTTValue;
        } else {
          // Nếu tt giống với dòng trước, giữ nguyên giá trị
          row.tt = lastTTValue;
        }
      } else {
        // Dòng đầu tiên
        preTT = row.tt;
        row.tt = ++lastTTValue;
      }
    }


    // Chuẩn bị values để insert
    const values = renamedData.map((row) => [
      row.tt,
      row.course_code,
      row.credit_hours,
      row.student_quantity,
      row.student_bonus || 0,
      row.bonus_time || 1, // Nếu không có giá trị thì mặc định là 1
      row.ll_code,
      row.ll_total,
      row.qc,
      row.course_name,
      row.study_format,
      row.periods_per_week,
      row.day_of_week,
      row.period_start,
      row.period_end,
      row.classroom,
      formatDateForMySQL(parseDateDDMMYY(row.start_date)),
      formatDateForMySQL(parseDateDDMMYY(row.end_date)),
      row.lecturer,
      row.major,
      dot,
      ki,
      nam,
    ]);

    // Insert batch
    await pool.query(
      `INSERT INTO course_schedule_details (
        TT, course_id, credit_hours, student_quantity, student_bonus, bonus_time, ll_code, ll_total, qc, course_name, study_format, periods_per_week, 
        day_of_week, period_start, period_end, classroom, start_date, end_date, lecturer, major, dot, ki_hoc, nam_hoc
      ) VALUES ?`,
      [values]
    );

    res.status(200).json({
      success: true,
      message: "Đọc file và lưu thành công",
      data: {} // Nếu có dữ liệu kèm theo
    });
  } catch (err) {
    console.error("Lỗi khi xử lý file Excel:", err);
    res.status(500).json({ message: "Lỗi khi xử lý file Excel." });
  }
};

function parseDateDDMMYY(str) {
  if (!str) return null;
  const [day, month, year] = str.split("/").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day);
}

function formatDateForMySQL(date) {
  if (!(date instanceof Date) || isNaN(date)) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = {
  importExcelTKB,
};
