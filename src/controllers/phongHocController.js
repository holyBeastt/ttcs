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

      // Lấy danh sách phòng đã cho mượn
      let phongMuon = [];
      if (ca === "ALL") {
        const phongMuonQueryAll = `
          SELECT 
            id,
            phong,
            ten_mon,
            giangvien,
            ca_start,
            ca_end
          FROM phong_muon
          WHERE toanha = ? AND ngay = ?
        `;
        [phongMuon] = await connection.query(phongMuonQueryAll, [toaNha, ngay]);
      } else {
        const [start, end] = ca.split('-');
        const phongMuonQuery = `
          SELECT 
            id,
            phong,
            ten_mon,
            giangvien,
            ca_start,
            ca_end
          FROM phong_muon
          WHERE toanha = ? 
            AND ngay = ?
            AND NOT (ca_end < ? OR ca_start > ?)
        `;
        [phongMuon] = await connection.query(phongMuonQuery, [
          toaNha,
          ngay,
          parseInt(start),
          parseInt(end)
        ]);
      }

      if (Array.isArray(phongMuon) && phongMuon.length > 0) {
        const seen = new Set();
        const dedup = [];
        for (const pm of phongMuon) {
          // Normalize values to string/number for stable key
          const key = `${pm.phong}-${pm.ca_start}-${pm.ca_end}`;
          if (!seen.has(key)) {
            seen.add(key);
            dedup.push(pm);
          }
        }
        phongMuon = dedup;
      }

      const classUsed = phongDaSuDung;

      // Map phong_muon rows to the same shape for display
      const mappedPhongMuon = phongMuon.map(pm => ({
        id: pm.id,
        phong: pm.phong,
        ten_mon: pm.ten_mon,
        gv: pm.giangvien,
        slsv: null,
        period_start: pm.ca_start,
        period_end: pm.ca_end,
        ca_start: pm.ca_start,
        ca_end: pm.ca_end
      }));

      // For display, include both class schedule entries and borrow entries
      const allPhongDaSuDungForDisplay = [...classUsed, ...mappedPhongMuon];

      // Lọc ra phòng trống (không có trong phòng đã sử dụng và phòng đã cho mượn)
      const phongTrong = tatCaPhong.filter(p => 
        !allPhongDaSuDungForDisplay.some(used => used.phong === p.phong)
      );

      res.json({
        success: true,
        phongTrong: phongTrong,
        // Return combined used entries for display and borrow entries separately
        phongDaSuDung: allPhongDaSuDungForDisplay,
        phongMuon: phongMuon
      });

    } catch (error) {
      console.error("Lỗi khi lấy danh sách phòng:", error);
      res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    } finally {
      if (connection) connection.release();
    }
  },

  muonPhong: async (req, res) => {
    const { phong, toanha, ngay, ten_mon, giangvien, ca_start, ca_end } = req.body;
    let connection;
    
    try {
      connection = await createConnection();
      
      // Kiểm tra xem phòng đã được cho mượn trong ca này chưa
      const checkQuery = `
        SELECT id FROM phong_muon 
        WHERE phong = ? AND toanha = ? AND ngay = ?
          AND NOT (ca_end < ? OR ca_start > ?)
      `;
      const [existing] = await connection.query(checkQuery, [
        phong,
        toanha,
        ngay,
        parseInt(ca_start),
        parseInt(ca_end)
      ]);

      if (existing.length > 0) {
        return res.json({
          success: false,
          message: "Phòng này đã được cho mượn trong ca này!"
        });
      }

      // Bỏ kiểm tra xung đột với lịch học - cho phép cho mượn cả khi đã có lớp

      // Thêm vào database
      const insertQuery = `
        INSERT INTO phong_muon (phong, toanha, ngay, ca_start, ca_end, ten_mon, giangvien)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await connection.query(insertQuery, [
        phong,
        toanha,
        ngay,
        parseInt(ca_start),
        parseInt(ca_end),
        ten_mon || '',
        giangvien || null
      ]);

      res.json({
        success: true,
        message: "Cho mượn phòng thành công!"
      });

    } catch (error) {
      console.error("Lỗi khi cho mượn phòng:", error);
      res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    } finally {
      if (connection) connection.release();
    }
  },

  // Hủy mượn phòng (xóa bản ghi phong_muon theo id)
  huyMuon: async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    let connection;
    try {
      connection = await createConnection();
      const deleteQuery = `DELETE FROM phong_muon WHERE id = ?`;
      await connection.query(deleteQuery, [id]);
      res.json({ success: true, message: 'Hủy mượn thành công' });
    } catch (error) {
      console.error('Lỗi khi hủy mượn:', error);
      res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
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
