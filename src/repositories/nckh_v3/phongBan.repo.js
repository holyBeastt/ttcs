const listKhoa = async (connection) => {
  const query = `
    SELECT id, MaPhongBan, TenPhongBan
    FROM phongban
    WHERE isKhoa = 1
    ORDER BY TenPhongBan ASC
  `;
  const [rows] = await connection.execute(query);
  return rows;
};

const findById = async (connection, id) => {
  const [rows] = await connection.execute(
    "SELECT id, MaPhongBan, TenPhongBan, isKhoa FROM phongban WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  listKhoa,
  findById,
};
