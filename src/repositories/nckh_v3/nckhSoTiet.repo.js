const TABLE = "nckh_so_tiet";

const bulkInsert = async (connection, nckhId, participants) => {
  if (!participants.length) return;

  const placeholders = participants.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
  const query = `INSERT INTO ${TABLE} (nckh_id, nhanvien_id, ten_ngoai, don_vi_ngoai, vai_tro, so_tiet, nam_thuc_hien) VALUES ${placeholders}`;

  const params = [];
  participants.forEach((item) => {
    params.push(
      nckhId,
      item.nhanvienId ?? null,
      item.tenNgoai ?? null,
      item.donViNgoai ?? null,
      item.vaiTro,
      item.soTiet,
      Number(item.namThucHien || 1)
    );
  });

  await connection.execute(query, params);
};

const deleteByNckhId = async (connection, nckhId) => {
  await connection.execute(`DELETE FROM ${TABLE} WHERE nckh_id = ?`, [nckhId]);
};

const getByNckhId = async (connection, nckhId) => {
  const query = `
    SELECT st.id, st.nhanvien_id, st.ten_ngoai, st.don_vi_ngoai, st.vai_tro, st.so_tiet, st.nam_thuc_hien, nv.TenNhanVien, nv.MaPhongBan
    FROM ${TABLE} st
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE st.nckh_id = ?
    ORDER BY st.nam_thuc_hien ASC, st.id ASC
  `;
  const [rows] = await connection.execute(query, [nckhId]);
  return rows;
};

const getByNckhIds = async (connection, nckhIds) => {
  const ids = Array.isArray(nckhIds)
    ? nckhIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");
  const query = `
    SELECT st.id, st.nckh_id, st.nhanvien_id, st.ten_ngoai, st.don_vi_ngoai, st.vai_tro, st.so_tiet, st.nam_thuc_hien, nv.TenNhanVien, nv.MaPhongBan
    FROM ${TABLE} st
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE st.nckh_id IN (${placeholders})
    ORDER BY st.nckh_id ASC, st.id ASC
  `;

  const [rows] = await connection.execute(query, ids);
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
  getByNckhIds,
  sumHours,
};
