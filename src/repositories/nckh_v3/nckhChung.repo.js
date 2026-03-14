const TABLE = "nckh_chung";

const insert = async (connection, data) => {
  const query = `
    INSERT INTO ${TABLE} (
      ten_cong_trinh,
      loai_nckh,
      phan_loai,
      nam_hoc,
      tong_so_tiet,
      khoa_id,
      khoa_duyet,
      vien_nc_duyet
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai,
    data.namHoc,
    data.tongSoTiet,
    data.khoaId,
    data.khoaDuyet,
    data.vienNcDuyet,
  ];

  const [result] = await connection.execute(query, params);
  return result.insertId;
};

const updateById = async (connection, id, data) => {
  const query = `
    UPDATE ${TABLE}
    SET ten_cong_trinh = ?,
        loai_nckh = ?,
        phan_loai = ?,
        nam_hoc = ?,
        tong_so_tiet = ?,
        khoa_id = ?
    WHERE id = ?
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai,
    data.namHoc,
    data.tongSoTiet,
    data.khoaId,
    id,
  ];

  const [result] = await connection.execute(query, params);
  return result.affectedRows;
};

const deleteById = async (connection, id) => {
  const [result] = await connection.execute(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  return result.affectedRows;
};

const findById = async (connection, id) => {
  const query = `
    SELECT c.*, pb.MaPhongBan, pb.TenPhongBan
    FROM ${TABLE} c
    LEFT JOIN phongban pb ON pb.id = c.khoa_id
    WHERE c.id = ?
    LIMIT 1
  `;
  const [rows] = await connection.execute(query, [id]);
  return rows[0] || null;
};

const listByType = async (connection, loaiNckh, namHoc, khoaId) => {
  let query = `
    SELECT c.*, pb.MaPhongBan, pb.TenPhongBan
    FROM ${TABLE} c
    LEFT JOIN phongban pb ON pb.id = c.khoa_id
    WHERE c.loai_nckh = ? AND c.nam_hoc = ?
  `;
  const params = [loaiNckh, namHoc];

  if (khoaId !== "ALL") {
    query += " AND c.khoa_id = ?";
    params.push(Number(khoaId));
  }

  query += " ORDER BY c.id DESC";

  const [rows] = await connection.execute(query, params);
  return rows;
};

const list = async (connection, namHoc, khoaId) =>
  listByType(connection, "DETAI_DUAN", namHoc, khoaId);

const listUnified = async (connection, namHoc, khoaId) => {
  let query = `
    SELECT
      c.id AS id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.khoa_id,
      c.khoa_duyet,
      c.vien_nc_duyet,
      c.created_at,
      pb.MaPhongBan,
      pb.TenPhongBan,
      GROUP_CONCAT(
        CASE
          WHEN st.vai_tro = 'tac_gia' THEN COALESCE(nv.TenNhanVien, st.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS tac_gia_chinh,
      GROUP_CONCAT(
        CASE
          WHEN st.vai_tro = 'thanh_vien' THEN COALESCE(nv.TenNhanVien, st.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS thanh_vien
    FROM ${TABLE} c
    LEFT JOIN phongban pb ON pb.id = c.khoa_id
    LEFT JOIN nckh_so_tiet st ON st.nckh_id = c.id
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE c.nam_hoc = ?
  `;
  const params = [namHoc];

  if (khoaId !== "ALL") {
    query += " AND c.khoa_id = ?";
    params.push(Number(khoaId));
  }

  query += `
    GROUP BY
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.khoa_id,
      c.khoa_duyet,
      c.vien_nc_duyet,
      c.created_at,
      pb.MaPhongBan,
      pb.TenPhongBan
    ORDER BY c.id DESC
  `;

  const [rows] = await connection.execute(query, params);
  return rows;
};

const setKhoaApproval = async (connection, id, khoaDuyet, vienNcDuyetWhenReset = null) => {
  if (vienNcDuyetWhenReset === null) {
    const [result] = await connection.execute(
      `UPDATE ${TABLE} SET khoa_duyet = ? WHERE id = ?`,
      [khoaDuyet, id]
    );
    return result.affectedRows;
  }

  const [result] = await connection.execute(
    `UPDATE ${TABLE} SET khoa_duyet = ?, vien_nc_duyet = ? WHERE id = ?`,
    [khoaDuyet, vienNcDuyetWhenReset, id]
  );
  return result.affectedRows;
};

const setVienApproval = async (connection, id, vienNcDuyet, khoaDuyetWhenReset = null) => {
  if (khoaDuyetWhenReset === null) {
    const [result] = await connection.execute(
      `UPDATE ${TABLE} SET vien_nc_duyet = ? WHERE id = ?`,
      [vienNcDuyet, id]
    );
    return result.affectedRows;
  }

  const [result] = await connection.execute(
    `UPDATE ${TABLE} SET vien_nc_duyet = ?, khoa_duyet = ? WHERE id = ?`,
    [vienNcDuyet, khoaDuyetWhenReset, id]
  );
  return result.affectedRows;
};

module.exports = {
  insert,
  updateById,
  deleteById,
  findById,
  list,
  listByType,
  listUnified,
  setKhoaApproval,
  setVienApproval,
};
