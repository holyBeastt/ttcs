const TABLE = "nckh_chung";

const insert = async (connection, data) => {
  const query = `
    INSERT INTO ${TABLE} (
      ten_cong_trinh,
      loai_nckh,
      phan_loai,
      nam_hoc,
      tong_so_tiet,
      khoa_duyet,
      vien_nc_duyet,
      ngay_nghiem_thu,
      xep_loai,
      ma_so
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai,
    data.namHoc,
    data.tongSoTiet,
    data.khoaDuyet,
    data.vienNcDuyet,
    data.ngayNghiemThu || null,
    data.xepLoai || null,
    data.maSo || null,
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
        ngay_nghiem_thu = ?,
        xep_loai = ?,
        ma_so = ?
    WHERE id = ?
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai,
    data.namHoc,
    data.tongSoTiet,
    data.ngayNghiemThu || null,
    data.xepLoai || null,
    data.maSo || null,
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
    SELECT c.*
    FROM ${TABLE} c
    WHERE c.id = ?
    LIMIT 1
  `;
  const [rows] = await connection.execute(query, [id]);
  return rows[0] || null;
};

const listByType = async (connection, loaiNckh, namHoc, khoaId) => {
  let query = `
    SELECT c.*
    FROM ${TABLE} c
    WHERE c.loai_nckh = ? AND c.nam_hoc = ?
  `;
  const params = [loaiNckh, namHoc];

  if (khoaId !== "ALL") {
    // Lọc: có ít nhất 1 giảng viên thuộc khoa này tham gia
    query += ` AND EXISTS (
      SELECT 1 FROM nckh_so_tiet st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
    )`;
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
      c.khoa_duyet,
      c.vien_nc_duyet,
      c.created_at,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so
    FROM ${TABLE} c
    WHERE c.nam_hoc = ?
  `;
  const params = [namHoc];

  if (khoaId !== "ALL") {
    // Lọc: có ít nhất 1 giảng viên thuộc khoa này tham gia
    query += ` AND EXISTS (
      SELECT 1 FROM nckh_so_tiet st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
    )`;
    params.push(Number(khoaId));
  }

  query += " ORDER BY c.id DESC";

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

const bulkUpdateApprovals = async (connection, updates) => {
  let totalAffected = 0;

  for (const update of updates) {
    const { id, khoaDuyet, vienNcDuyet } = update;

    let query = `UPDATE ${TABLE} SET `;
    const params = [];
    const setParts = [];

    if (khoaDuyet !== undefined) {
      setParts.push("khoa_duyet = ?");
      params.push(khoaDuyet);
    }

    if (vienNcDuyet !== undefined) {
      setParts.push("vien_nc_duyet = ?");
      params.push(vienNcDuyet);
    }

    if (setParts.length === 0) {
      continue;
    }

    query += setParts.join(", ");
    query += " WHERE id = ?";
    params.push(id);

    const [result] = await connection.execute(query, params);
    totalAffected += result.affectedRows;
  }

  return totalAffected;
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
  bulkUpdateApprovals,
};
