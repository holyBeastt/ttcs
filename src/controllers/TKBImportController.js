const XLSX = require("xlsx");
const pool = require("../config/Pool");

const importExcelTKB = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Vui lòng chọn file Excel." });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    let allData = [];

    // Đọc toàn bộ sheet
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        range: 4,
        header: [
          "tt",
          "course_code",
          "credit_hours",
          // "student_quantity",
          "ll_code",
          // "student_bonus",
          // "ll_code_real",
          // "qc",
          "course_name",
          "study_format",
          "periods_per_week",
          "day_of_week",
          "periods",
          "classroom",
          "start_date",
          "end_date",
          "lecturer",
        ],
        raw: false,
        cellDates: true,
      });

      if (data.length > 0) {
        // Gắn tên sheet để biết dòng thuộc sheet nào (nếu cần)
        data.forEach((row) => {
          row.sheet_name = sheetName;
        });

        allData = allData.concat(data);
      }
    });

    if (allData.length === 0) {
      return res.status(400).json({ message: "File Excel không có dữ liệu." });
    }

    // Xử lý ô merge bị trống
    for (let i = 1; i < allData.length; i++) {
      for (const key of Object.keys(allData[i])) {
        if (allData[i][key] === "") {
          allData[i][key] = allData[i - 1][key];
        }
      }
    }

    // Tính tổng tiết
    const tongTietMap = {};
    for (const row of allData) {
      const tietHoc = row["periods"];
      if (tietHoc && tietHoc.includes("->")) {
        const [startTiet, endTiet] = tietHoc.split("->").map(Number);
        const tietBuoi = endTiet - startTiet + 1;
        const startDate = parseDateDDMMYY(row["start_date"]);
        const endDate = parseDateDDMMYY(row["end_date"]);
        const soTuan = Math.ceil(
          (endDate - startDate) / (7 * 24 * 60 * 60 * 1000)
        );
        const tongTiet = soTuan * tietBuoi;
        const lop = row["course_name"];
        tongTietMap[lop] = (tongTietMap[lop] || 0) + tongTiet;
      }
    }

    // Gắn data cần thiết: TongTiet vào từng dòng
    for (const row of allData) {
      row["period_start"] = row["periods"].split("->")[0] || null;
      row["period_end"] = row["periods"].split("->")[1] || null;
      row["ll_total"] = tongTietMap[row["course_name"]] || 0;
    }

    // Tạo mảng values
    const values = allData.map((row) => [
      row["tt"],
      row["course_code"],
      row["credit_hours"],
      row["ll_code"],
      row["ll_total"],
      row["qc"],
      row["course_name"],
      row["study_format"],
      row["periods_per_week"],
      row["day_of_week"],
      row["period_start"],
      row["period_end"],
      row["classroom"],
      formatDateForMySQL(parseDateDDMMYY(row["start_date"])),
      formatDateForMySQL(parseDateDDMMYY(row["end_date"])),
      row["lecturer"],
    ]);

    // Insert batch
    await pool.query(
      `INSERT INTO course_schedule_details (
        TT, course_id, credit_hours, ll_code, ll_total, qc, course_name, study_format, periods_per_week, 
        day_of_week, period_start, period_end, classroom, start_date, end_date, lecturer
      ) VALUES ?`,
      [values]
    );

    res.json({ message: "Đọc file và lưu thành công", data: allData });
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
