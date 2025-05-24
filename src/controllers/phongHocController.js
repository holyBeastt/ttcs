const createConnection = require("../config/databasePool");

const phongHocController = {
  showPhongHoc: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      
      // Sửa query để lấy từ bảng toanha thay vì distinct từ phonghoc
      const toaNhaQuery = "SELECT TenToaNha FROM toanha ORDER BY TenToaNha ASC";
      const [toaNha] = await connection.query(toaNhaQuery);

      // Tạo danh sách ca học cố định
      const periods = [
        { start: 1, end: 3, display: "Ca 1-3 (07:00-09:30)" },
        { start: 4, end: 6, display: "Ca 4-6 (09:35-12:00)" },
        { start: 7, end: 9, display: "Ca 7-9 (12:30-14:55)" },
        { start: 10, end: 12, display: "Ca 10-12 (15:05-17:30)" },
        { start: 13, end: 16, display: "Ca 13-16 (18:00-20:30)" }
      ];

      res.render("phonghoc", {
        toaNha: toaNha,
        periods: periods
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      res.status(500).send("Lỗi hệ thống");
    } finally {
      if (connection) connection.release();
    }
  },

  getPhongTrong: async (req, res) => {
    const { toaNha, ngay, ca } = req.query;
    let connection;
    
    try {
      connection = await createConnection();
      
      // Sửa query để sử dụng TenToaNha
      const phongQuery = "SELECT phong FROM phonghoc WHERE toanha = ?";
      const [tatCaPhong] = await connection.query(phongQuery, [toaNha]);

      // Sửa query để sử dụng TenToaNha trong điều kiện LIKE
      let phongDaSuDung = [];
      if (ca === "ALL") {
        // Lấy tất cả các ca trong ngày
        const phongSuDungQueryAll = `
          SELECT 
            SUBSTRING_INDEX(classroom, '-', 1) as phong,
            course_name as monhoc,
            lecturer as gv,
            ll_total as slsv,
            period_start,
            period_end
          FROM course_schedule_details 
          WHERE classroom LIKE ?
            AND ? BETWEEN start_date AND end_date
            AND day_of_week = WEEKDAY(?) + 2
        `;
        [phongDaSuDung] = await connection.query(phongSuDungQueryAll, [
          `%-${toaNha}`,
          ngay,
          ngay
        ]);
        console.log('Ngày được chọn:', ngay);
        console.log('Ca được chọn: Cả ngày');
      } else {
        const [start, end] = ca.split('-');
        const phongSuDungQuery = `
          SELECT DISTINCT 
            SUBSTRING_INDEX(classroom, '-', 1) as phong,
            course_name as monhoc,
            lecturer as gv,
            ll_total as slsv,
            period_start,
            period_end
          FROM course_schedule_details 
          WHERE classroom LIKE ?
            AND ? BETWEEN start_date AND end_date
            AND day_of_week = WEEKDAY(?) + 2
            AND NOT (period_end < ? OR period_start > ?)
          GROUP BY SUBSTRING_INDEX(classroom, '-', 1), course_name, lecturer, ll_total, period_start, period_end
        `;
        [phongDaSuDung] = await connection.query(phongSuDungQuery, [
          `%-${toaNha}`,
          ngay,
          ngay,
          parseInt(start),
          parseInt(end)
        ]);
        console.log('Ngày được chọn:', ngay);
        console.log('Ca được chọn:', start, '-', end);
      }
      console.log('Phòng đã sử dụng:', phongDaSuDung);

      // Lọc ra phòng trống
      const phongTrong = tatCaPhong.filter(p => 
        !phongDaSuDung.some(used => used.phong === p.phong)
      );

      res.json({
        success: true,
        phongTrong: phongTrong,
        phongDaSuDung: phongDaSuDung
      });

    } catch (error) {
      console.error("Lỗi khi lấy danh sách phòng:", error);
      res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    } finally {
      if (connection) connection.release();
    }
  }
};

// Hàm hỗ trợ format thời gian
function formatTime(period) {
  const timeMap = {
    1: "07:00", 2: "07:50", 3: "08:40", 4: "09:35",
    5: "10:25", 6: "11:15", 7: "12:30", 8: "13:20",
    9: "14:10", 10: "15:05", 11: "15:55", 12: "16:45",
    13: "18:00", 14: "18:50", 15: "19:40", 16: "20:30"
  };
  return timeMap[period] || period;
}

module.exports = phongHocController;
