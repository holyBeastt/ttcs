const TABLE_CHUNG = "nckh_chung";
const TABLE_SO_TIET = "nckh_so_tiet";

/**
 * Điều kiện chung: năm học + trạng thái phê duyệt.
 * Không chứa logic lọc khoa.
 */
const buildApprovedWhere = (namHoc) => {
  const where = `
    c.nam_hoc = ?
    AND (c.khoa_duyet = 1 OR c.khoa_id IS NULL)
    AND c.vien_nc_duyet = 1
  `;
  const params = [namHoc];
  return { where, params };
};

// ──────────────────────────────────────────────
// 1. Thống kê theo Giảng viên
// ──────────────────────────────────────────────

const listLecturerSummary = async (connection, { namHoc, khoaId = "ALL", keyword = "" }) => {
  const { where, params } = buildApprovedWhere(namHoc);
  const normalizedKeyword = String(keyword || "").trim();
  const safeKhoaId = String(khoaId || "ALL").trim();

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
    INNER JOIN phongban pb ON pb.id = nv.phongban_id
    WHERE ${where}
  `;

  if (safeKhoaId !== "ALL") {
    query += " AND nv.phongban_id = ?";
    params.push(Number(safeKhoaId));
  }

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

// ──────────────────────────────────────────────
// 2. Chi tiết công trình của 1 Giảng viên
//    Không lọc theo khoa — hiển thị toàn bộ.
// ──────────────────────────────────────────────

const listLecturerRecords = async (connection, { lecturerId, namHoc }) => {
  const { where, params } = buildApprovedWhere(namHoc);

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

// ──────────────────────────────────────────────
// 3. Thống kê theo Khoa (tổng hợp)
// ──────────────────────────────────────────────

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
    INNER JOIN phongban pb ON pb.id = nv.phongban_id
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

// ──────────────────────────────────────────────
// 4. Danh sách công trình theo Khoa
// ──────────────────────────────────────────────

const listFacultyRecords = async (connection, { namHoc, khoaId }) => {
  const { where, params } = buildApprovedWhere(namHoc);
  const safeKhoaId = Number(khoaId);

  // Lọc công trình có ít nhất 1 giảng viên thuộc khoa này tham gia
  const query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      COALESCE(SUM(CASE WHEN nv.phongban_id = ? THEN st.so_tiet ELSE 0 END), 0) AS tong_so_tiet,
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
    WHERE ${where}
      AND EXISTS (
        SELECT 1 FROM ${TABLE_SO_TIET} st_sub
        INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
        WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
      )
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

  const [rows] = await connection.execute(query, [safeKhoaId, ...params, safeKhoaId]);
  return rows;
};

// ──────────────────────────────────────────────
// 5. Thống kê Học viện — Tổng quan
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// 6. Danh sách công trình Học viện
// ──────────────────────────────────────────────

const listInstituteRecords = async (connection, { namHoc, khoaId = "ALL", loaiNckh = "ALL" }) => {
  const { where, params } = buildApprovedWhere(namHoc);
  const safeKhoaId = String(khoaId || "ALL");

  // --- Xử lý lọc theo khoa ---
  let selectTongSoTiet;
  let khoaWhere = "";

  if (safeKhoaId !== "ALL") {
    const numKhoaId = Number(safeKhoaId);

    // Chỉ tính tiết của giảng viên thuộc khoa đang lọc
    selectTongSoTiet = `COALESCE(SUM(CASE WHEN nv.phongban_id = ? THEN st.so_tiet ELSE 0 END), 0)`;

    khoaWhere = ` AND EXISTS (
      SELECT 1 FROM ${TABLE_SO_TIET} st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
    )`;

    // Thêm tham số: 1 cho SUM CASE, 1 cho EXISTS
    params.unshift(numKhoaId); // cho SUM CASE (đặt trước WHERE params)
    // Lưu ý: params hiện tại = [numKhoaId, namHoc]
    // Sau WHERE sẽ push thêm numKhoaId cho EXISTS
  } else {
    selectTongSoTiet = "c.tong_so_tiet";
  }

  let query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh AS loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      ${selectTongSoTiet} AS tong_so_tiet,
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
    WHERE ${where}${khoaWhere}
  `;

  if (safeKhoaId !== "ALL") {
    params.push(Number(safeKhoaId)); // cho EXISTS
  }

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