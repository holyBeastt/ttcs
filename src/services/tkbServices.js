const pool = require("../config/Pool");

// Hàm lấy bảng hệ số lớp đông
const getBonusRules = async () => {
  try {
    // Lấy tất cả các mốc, sắp xếp giảm dần theo số lượng (DESC)
    // Để logic tìm kiếm khớp với logic "LIMIT 1" của bạn
    const query = `
      SELECT student_quantity, student_bonus
      FROM he_so_lop_dong
      ORDER BY student_quantity DESC
    `;
    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("Lỗi lấy bảng hệ số:", error);
    return [];
  }
};

// Hàm này nhận vào số lượng SV và mảng rules đã lấy ở bước 1
const calculateStudentBonus = (student_quantity, bonusRules) => {
  // Duyệt qua các mốc đã sắp xếp giảm dần
  for (const rule of bonusRules) {
    if (student_quantity >= rule.student_quantity) {
      // Tìm thấy mốc thỏa mãn đầu tiên (lớn nhất có thể)
      // Tương đương với logic SQL: WHERE <= ? ORDER DESC LIMIT 1
      return rule.student_bonus;
    }
  }

  // Không tìm thấy (nhỏ hơn mốc thấp nhất)
  return 0.0;
};

const getHeDaoTaoList = async () => {
  const [rows] = await pool.query(`
    SELECT viet_tat, gia_tri_so_sanh, he_so
    FROM kitubatdau
  `);
  return rows;
}

const getMajorPrefixMap = async () => {
  const [rows] = await pool.query(
    `SELECT viet_tat, khoa, MaPhongBan
    FROM kitubatdau_khoa
    JOIN phongban ON kitubatdau_khoa.khoa = phongban.id`
  );

  const map = {};
  rows.forEach(r => {
    map[r.viet_tat.trim().toUpperCase()] = r.MaPhongBan;
  });

  return map;
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getBonusRules,
  calculateStudentBonus,
  getHeDaoTaoList,
  getMajorPrefixMap,
};
