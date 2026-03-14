const getByIds = async (connection, ids) => {
  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(",");
  const query = `SELECT id_User AS id, id_User, TenNhanVien, MaPhongBan FROM nhanvien WHERE id_User IN (${placeholders})`;
  const [rows] = await connection.execute(query, ids);
  return rows;
};

const listByKhoaId = async (connection, khoaId = "ALL") => {
  let query = `
    SELECT nv.id_User AS id, nv.id_User, nv.TenNhanVien, nv.MaPhongBan, pb.id AS khoa_id, pb.TenPhongBan
    FROM nhanvien nv
    INNER JOIN phongban pb ON pb.MaPhongBan = nv.MaPhongBan
    WHERE pb.isKhoa = 1
  `;
  const params = [];

  if (khoaId !== "ALL") {
    query += " AND pb.id = ?";
    params.push(Number(khoaId));
  }

  query += " ORDER BY nv.TenNhanVien ASC";

  const [rows] = await connection.execute(query, params);
  return rows;
};

module.exports = {
  getByIds,
  listByKhoaId,
};
