const TABLE = "nckh_so_tiet";

const bulkInsert = async (connection, nckhId, participants) => {
  if (!participants.length) return;

  const placeholders = participants.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
  const query = `INSERT INTO ${TABLE} (nckh_id, nhanvien_id, ten_ngoai, don_vi_ngoai, vai_tro, so_tiet) VALUES ${placeholders}`;

  const params = [];
  participants.forEach((item) => {
    params.push(
      nckhId,
      item.nhanvienId ?? null,
      item.tenNgoai ?? null,
      item.donViNgoai ?? null,
      item.vaiTro,
      item.soTiet
    );
  });

  await connection.execute(query, params);
};

const deleteByNckhId = async (connection, nckhId) => {
  await connection.execute(`DELETE FROM ${TABLE} WHERE nckh_id = ?`, [nckhId]);
};

const getByNckhId = async (connection, nckhId) => {
  const query = `
    SELECT st.id, st.nhanvien_id, st.ten_ngoai, st.don_vi_ngoai, st.vai_tro, st.so_tiet, nv.TenNhanVien, nv.MaPhongBan
    FROM ${TABLE} st
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE st.nckh_id = ?
    ORDER BY st.id ASC
  `;
  const [rows] = await connection.execute(query, [nckhId]);
  return rows;
};

const sumHours = async (connection, nckhId) => {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(so_tiet), 0) AS total FROM ${TABLE} WHERE nckh_id = ?`,
    [nckhId]
  );

  return Number(rows[0]?.total || 0);
};

module.exports = {
  bulkInsert,
  deleteByNckhId,
  getByNckhId,
  sumHours,
};
