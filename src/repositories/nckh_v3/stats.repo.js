const TABLE_CHUNG = "nckh_chung";
const TABLE_SO_TIET = "nckh_so_tiet";

const buildApprovedWhere = ({ namHoc, khoaId = "ALL" }) => {
  let where = `
    c.nam_hoc = ?
    AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
    AND c.vien_nc_duyet = 1
  `;
  const params = [namHoc];

  if (String(khoaId || "ALL") === "UNASSIGNED") {
    where += " AND c.khoa_id IS NULL";
  } else if (String(khoaId || "ALL") !== "ALL") {
    where += " AND c.khoa_id = ?";
    params.push(Number(khoaId));
  }

  return { where, params };
};

const listLecturerSummary = async (connection, { namHoc, khoaId = "ALL", keyword = "" }) => {
  const { where, params } = buildApprovedWhere({ namHoc, khoaId });
  const normalizedKeyword = String(keyword || "").trim();

  let query = `
    SELECT
      nv.id_User AS lecturer_id,
      nv.TenNhanVien,
      nv.MaPhongBan,
      pb.id AS lecturer_khoa_id,
      pb.TenPhongBan AS lecturer_khoa_name,
      COUNT(DISTINCT c.id) AS cong_trinh_count,
      COALESCE(SUM(st.so_tiet), 0) AS tong_so_tiet_giang_vien
    FROM ${TABLE_SO_TIET} st
    INNER JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    LEFT JOIN phongban pb ON pb.MaPhongBan = nv.MaPhongBan
    WHERE ${where}
  `;

  if (normalizedKeyword) {
    query += " AND nv.TenNhanVien LIKE ?";
    params.push(`%${normalizedKeyword}%`);
  }

  query += `
    GROUP BY
      nv.id_User,
      nv.TenNhanVien,
      nv.MaPhongBan,
      pb.id,
      pb.TenPhongBan
    ORDER BY tong_so_tiet_giang_vien DESC, nv.TenNhanVien ASC
  `;

  const [rows] = await connection.execute(query, params);
  return rows;
};

const listLecturerRecords = async (connection, { lecturerId, namHoc, khoaId = "ALL" }) => {
  const { where, params } = buildApprovedWhere({ namHoc, khoaId });

  const query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.khoa_id,
      pb.MaPhongBan,
      pb.TenPhongBan,
      st.so_tiet AS so_tiet_giang_vien,
      st.vai_tro AS vai_tro_giang_vien,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st2.vai_tro = 'tac_gia' THEN COALESCE(nv2.TenNhanVien, st2.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st2.id ASC
        SEPARATOR ', '
      ) AS tac_gia_chinh,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st2.vai_tro = 'thanh_vien' THEN COALESCE(nv2.TenNhanVien, st2.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st2.id ASC
        SEPARATOR ', '
      ) AS thanh_vien
    FROM ${TABLE_SO_TIET} st
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    LEFT JOIN phongban pb ON pb.id = c.khoa_id
    LEFT JOIN ${TABLE_SO_TIET} st2 ON st2.nckh_id = c.id
    LEFT JOIN nhanvien nv2 ON nv2.id_User = st2.nhanvien_id
    WHERE st.nhanvien_id = ? AND ${where}
    GROUP BY
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.khoa_id,
      pb.MaPhongBan,
      pb.TenPhongBan,
      st.so_tiet,
      st.vai_tro
    ORDER BY c.id DESC
  `;

  const [rows] = await connection.execute(query, [Number(lecturerId), ...params]);
  return rows;
};

const listFacultySummary = async (connection, { namHoc }) => {
  const query = `
    SELECT
      pb.id AS khoa_id,
      pb.MaPhongBan,
      pb.TenPhongBan,
      COUNT(DISTINCT st.nckh_id) AS cong_trinh_count,
      COALESCE(SUM(st.so_tiet), 0) AS tong_so_tiet
    FROM ${TABLE_SO_TIET} st
    INNER JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    INNER JOIN phongban pb ON pb.MaPhongBan = nv.MaPhongBan
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    WHERE c.nam_hoc = ?
      AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
      AND c.vien_nc_duyet = 1
    GROUP BY pb.id, pb.MaPhongBan, pb.TenPhongBan
    ORDER BY tong_so_tiet DESC
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows;
};

const listFacultyRecords = async (connection, { namHoc, khoaId }) => {
  let where = `
    c.nam_hoc = ?
    AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
    AND c.vien_nc_duyet = 1
  `;
  const params = [namHoc];

  if (String(khoaId) === "UNASSIGNED") {
    where += " AND c.khoa_id IS NULL";
  } else {
    // Lọc: Hiển thị nếu có ít nhất 1 thành viên của khoa này tham gia (đã phân tiết)
    where += ` AND EXISTS (
      SELECT 1 FROM ${TABLE_SO_TIET} st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      INNER JOIN phongban pb_sub ON pb_sub.MaPhongBan = nv_sub.MaPhongBan
      WHERE st_sub.nckh_id = c.id AND pb_sub.id = ?
    )`;
    params.push(Number(khoaId));
  }

  const query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      -- Tính tổng tiết của các giảng viên thuộc khoa này trong công trình
      ${String(khoaId) === "UNASSIGNED"
      ? "c.tong_so_tiet"
      : `COALESCE(SUM(CASE WHEN pb_gv.id = ${Number(khoaId)} THEN st.so_tiet ELSE 0 END), 0)`
    } AS tong_so_tiet,
      c.khoa_id,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so,
      pb.MaPhongBan,
      pb.TenPhongBan,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'tac_gia' THEN COALESCE(nv.TenNhanVien, st.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS tac_gia_chinh,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'thanh_vien' THEN COALESCE(nv.TenNhanVien, st.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS thanh_vien
    FROM ${TABLE_CHUNG} c
    LEFT JOIN phongban pb ON pb.id = c.khoa_id
    LEFT JOIN ${TABLE_SO_TIET} st ON st.nckh_id = c.id
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    LEFT JOIN phongban pb_gv ON pb_gv.MaPhongBan = nv.MaPhongBan
    WHERE ${where}
    GROUP BY
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.khoa_id,
      pb.MaPhongBan,
      pb.TenPhongBan
    ORDER BY c.id DESC
  `;

  const [rows] = await connection.execute(query, params);
  return rows;
};

const getInstituteOverview = async (connection, { namHoc }) => {
  const query = `
    SELECT
      COUNT(*) AS tong_cong_trinh,
      COALESCE(SUM(c.tong_so_tiet), 0) AS tong_so_tiet
    FROM ${TABLE_CHUNG} c
    WHERE c.nam_hoc = ?
      AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
      AND c.vien_nc_duyet = 1
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows[0] || { tong_cong_trinh: 0, tong_so_tiet: 0 };
};

const countInstituteLecturers = async (connection, { namHoc }) => {
  const query = `
    SELECT COUNT(DISTINCT st.nhanvien_id) AS tong_giang_vien_noi_bo
    FROM ${TABLE_SO_TIET} st
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    WHERE c.nam_hoc = ?
      AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
      AND c.vien_nc_duyet = 1
      AND st.nhanvien_id IS NOT NULL
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows[0] || { tong_giang_vien_noi_bo: 0 };
};

const listInstituteByType = async (connection, { namHoc }) => {
  const query = `
    SELECT
      c.loai_nckh,
      COUNT(*) AS cong_trinh_count,
      COALESCE(SUM(c.tong_so_tiet), 0) AS tong_so_tiet
    FROM ${TABLE_CHUNG} c
    WHERE c.nam_hoc = ?
      AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
      AND c.vien_nc_duyet = 1
    GROUP BY c.loai_nckh
    ORDER BY tong_so_tiet DESC
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows;
};

const listInstituteRecords = async (connection, { namHoc, khoaId = "ALL", loaiNckh = "ALL" }) => {
  let where = `
    c.nam_hoc = ?
    AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
    AND c.vien_nc_duyet = 1
  `;
  const params = [namHoc];

  const safeKhoaId = String(khoaId || "ALL");
  if (safeKhoaId === "UNASSIGNED") {
    where += " AND c.khoa_id IS NULL";
  } else if (safeKhoaId !== "ALL") {
    // SỬA: Dùng logic tham gia (Participation) tương tự summary cấp khoa
    where += ` AND EXISTS (
      SELECT 1 FROM ${TABLE_SO_TIET} st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      INNER JOIN phongban pb_sub ON pb_sub.MaPhongBan = nv_sub.MaPhongBan
      WHERE st_sub.nckh_id = c.id AND pb_sub.id = ?
    )`;
    params.push(Number(safeKhoaId));
  }

  let query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh AS loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      -- Tính tổng tiết: nếu lọc theo khoa thì lấy tiết của khoa, nếu không lấy tổng tiết công trình
      ${String(khoaId || "ALL") === "ALL" || String(khoaId || "ALL") === "UNASSIGNED"
      ? "c.tong_so_tiet"
      : `COALESCE(SUM(CASE WHEN pb_gv.id = ${Number(khoaId)} THEN st.so_tiet ELSE 0 END), 0)`
    } AS tong_so_tiet,
      c.khoa_id,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so,
      pb.MaPhongBan,
      pb.TenPhongBan,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'tac_gia' THEN COALESCE(nv.TenNhanVien, st.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS tac_gia_chinh,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'thanh_vien' THEN COALESCE(nv.TenNhanVien, st.ten_ngoai)
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS thanh_vien
    FROM ${TABLE_CHUNG} c
    LEFT JOIN phongban pb ON pb.id = c.khoa_id
    LEFT JOIN ${TABLE_SO_TIET} st ON st.nckh_id = c.id
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    LEFT JOIN phongban pb_gv ON pb_gv.MaPhongBan = nv.MaPhongBan
    WHERE ${where}
  `;

  if (String(loaiNckh || "ALL") !== "ALL") {
    query += " AND c.loai_nckh = ?";
    params.push(loaiNckh);
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
      pb.MaPhongBan,
      pb.TenPhongBan
    ORDER BY c.id DESC
  `;

  const [rows] = await connection.execute(query, params);
  return rows;
};

module.exports = {
  listLecturerSummary,
  listLecturerRecords,
  listFacultySummary,
  listFacultyRecords,
  getInstituteOverview,
  countInstituteLecturers,
  listInstituteByType,
  listInstituteRecords,
};