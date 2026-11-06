const createPoolConnection = require("../../config/databasePool");
const { STATS_SCOPE, normalizeStatsScope } = require("../../config/nckh_v3/statsScope");

/**
 * The 8 NCKH types in official order.
 */
const NCKH_SECTIONS = [
  { index: 1, loaiNckh: "DETAI_DUAN", title: "Đề tài, dự án" },
  { index: 2, loaiNckh: "SANGKIEN", title: "Sáng kiến" },
  { index: 3, loaiNckh: "GIAITHUONG", title: "Giải thưởng KH&CN; Bằng sáng chế, giải pháp hữu ích" },
  { index: 4, loaiNckh: "DEXUAT", title: "Đề xuất nghiên cứu" },
  { index: 5, loaiNckh: "SACHGIAOTRINH", title: "Sách, giáo trình, tài liệu dạy học, tài liệu huấn luyện, điều lệ, điều lệnh" },
  { index: 6, loaiNckh: "BAIBAO", title: "Bài báo, ấn phẩm khoa học" },
  { index: 7, loaiNckh: "HUONGDAN", title: "Hướng dẫn sinh viên nghiên cứu khoa học do Giám đốc Học viện phê duyệt quyết định" },
  { index: 8, loaiNckh: "HOIDONG", title: "Thành viên Hội đồng khoa học các cấp" },
];

/**
 * Fetch all data needed for a single lecturer's NCKH Word report.
 *
 * @param {number|string} lecturerId    - nhanvien.id_User
 * @param {string|Object} namHocParam   - e.g. "2025 - 2026" or { namHocFrom, namHocTo }
 * @param {string}        scope         - "PREVIEW" (all records) or "OFFICIAL" (approved only)
 * @returns {Promise<Object>} structured report data
 */
async function getLecturerReportData(lecturerId, namHocParam, scope = STATS_SCOPE.PREVIEW) {
  const safeLecturerId = Number(lecturerId);
  if (!Number.isFinite(safeLecturerId) || safeLecturerId <= 0) {
    throw new Error("lecturerId không hợp lệ");
  }

  let requestedFrom = "";
  let requestedTo = "";
  if (typeof namHocParam === "object" && namHocParam !== null) {
    requestedFrom = String(namHocParam.namHocFrom || namHocParam.namHoc || "").trim();
    requestedTo = String(namHocParam.namHocTo || requestedFrom).trim();
  } else {
    requestedFrom = String(namHocParam || "").trim();
    requestedTo = requestedFrom;
  }

  if (!requestedFrom) {
    throw new Error("Thiếu năm học");
  }

  const fromYear = Number((requestedFrom.match(/\b(19|20)\d{2}\b/) || [])[0]);
  const toYear = Number((requestedTo.match(/\b(19|20)\d{2}\b/) || [])[0]);
  const hasRange = Number.isInteger(fromYear) && Number.isInteger(toYear) && fromYear !== toYear;

  const isOfficial = normalizeStatsScope(scope) === STATS_SCOPE.OFFICIAL;

  let connection;
  try {
    connection = await createPoolConnection();

    // 1. Lecturer info
    const [lecturerRows] = await connection.execute(
      `SELECT nv.id_User, nv.TenNhanVien, nv.HocVi, nv.MaPhongBan,
              pb.TenPhongBan
       FROM nhanvien nv
       LEFT JOIN phongban pb ON (nv.phongban_id = pb.id OR pb.MaPhongBan = nv.MaPhongBan)
       WHERE nv.id_User = ?
       LIMIT 1`,
      [safeLecturerId]
    );

    if (!lecturerRows.length) {
      throw new Error("Không tìm thấy giảng viên");
    }

    const lecturerRow = lecturerRows[0];
    const lecturer = {
      tenNhanVien: (lecturerRow.TenNhanVien || "").trim(),
      hocVi: (lecturerRow.HocVi || "").trim(),
      maPhongBan: (lecturerRow.MaPhongBan || "").trim(),
      tenPhongBan: (lecturerRow.TenPhongBan || "").trim(),
    };

    // 2. All NCKH records for this lecturer in the given period
    let recordQuery = `
      SELECT
         nc.id              AS nckhId,
         nc.ten_cong_trinh  AS tenCongTrinh,
         nc.loai_nckh       AS loaiNckh,
         nc.phan_loai       AS phanLoai,
         nc.nam_hoc         AS namHoc,
         nc.tong_so_tiet    AS tongSoTiet,
         nc.ngay_nghiem_thu AS ngayNghiemThu,
         nc.xep_loai        AS xepLoai,
         nc.ma_so           AS maSo,
         nc.so_quyet_dinh   AS soQuyetDinh,
         nc.ngay_quyet_dinh AS ngayQuyetDinh,
         nc.cap_nhiem_vu    AS capNhiemVu,
         nc.kinh_phi        AS kinhPhi,
         nc.ten_tap_chi     AS tenTapChi,
         nc.so_bao          AS soBao,
         nc.so_trich_dan    AS soTrichDan,
         nc.co_quan_chu_tri   AS coQuanChuTri,
         nc.co_quan_chu_quan  AS coQuanChuQuan,
         nc.thuoc_nhiem_vu    AS thuocNhiemVu,
         nc.linh_vuc_nghien_cuu AS linhVucNghienCuu,
         nc.kinh_phi_nam_nhat AS kinhPhiNamNhat,
         nc.kinh_phi_nam_hai  AS kinhPhiNamHai,
         nc.kinh_phi_nam_ba   AS kinhPhiNamBa,
         nc.nguon_kinh_phi    AS nguonKinhPhi,
         st.so_tiet         AS soTietGiangVien,
         st.vai_tro         AS vaiTroGiangVien
       FROM nckh_chung nc
       INNER JOIN nckh_so_tiet st ON st.nckh_id = nc.id AND st.nhanvien_id = ?
    `;

    let queryParams;
    if (hasRange) {
      const minYear = Math.min(fromYear, toYear);
      const maxYear = Math.max(fromYear, toYear);
      recordQuery += ` WHERE CAST(SUBSTRING(TRIM(nc.nam_hoc), 1, 4) AS UNSIGNED) BETWEEN ? AND ?`;
      queryParams = [safeLecturerId, minYear, maxYear];
    } else {
      recordQuery += ` WHERE (nc.nam_hoc = ? OR REPLACE(nc.nam_hoc, ' ', '') = REPLACE(?, ' ', ''))`;
      queryParams = [safeLecturerId, requestedFrom, requestedFrom];
    }

    if (isOfficial) {
      recordQuery += ` AND nc.khoa_duyet = 1 AND nc.vien_nc_duyet = 1`;
    }

    recordQuery += ` ORDER BY nc.loai_nckh, nc.id`;

    const [recordRows] = await connection.execute(recordQuery, queryParams);

    // 3. Collect all nckh_ids to fetch participants in one query
    const nckhIds = recordRows.map((r) => r.nckhId);

    let participantsByNckhId = {};
    if (nckhIds.length > 0) {
      const placeholders = nckhIds.map(() => "?").join(",");
      const [participantRows] = await connection.execute(
        `SELECT
           st.nckh_id       AS nckhId,
           st.nhanvien_id   AS nhanvienId,
           st.vai_tro       AS vaiTro,
           st.so_tiet       AS soTiet,
           st.ten_ngoai     AS tenNgoai,
           nv.TenNhanVien   AS tenNhanVien
         FROM nckh_so_tiet st
         LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
         WHERE st.nckh_id IN (${placeholders})
         ORDER BY st.nckh_id, st.id`,
        nckhIds
      );

      for (const p of participantRows) {
        if (!participantsByNckhId[p.nckhId]) {
          participantsByNckhId[p.nckhId] = [];
        }
        participantsByNckhId[p.nckhId].push({
          nhanvienId: p.nhanvienId,
          tenNhanVien: (p.tenNhanVien || p.tenNgoai || "").trim(),
          vaiTro: p.vaiTro,
          soTiet: Number(p.soTiet || 0),
        });
      }
    }

    // 4. Group records by loaiNckh
    const recordsByType = {};
    for (const r of recordRows) {
      if (!recordsByType[r.loaiNckh]) {
        recordsByType[r.loaiNckh] = [];
      }
      recordsByType[r.loaiNckh].push({
        ...r,
        soTietGiangVien: Number(r.soTietGiangVien || 0),
        tongSoTiet: Number(r.tongSoTiet || 0),
        participants: participantsByNckhId[r.nckhId] || [],
      });
    }

    // 5. Build sections array (always 8, even if empty)
    let grandTotal = 0;
    const sections = NCKH_SECTIONS.map((sec) => {
      const records = recordsByType[sec.loaiNckh] || [];
      const subtotal = records.reduce((sum, r) => sum + r.soTietGiangVien, 0);
      grandTotal += subtotal;
      return {
        index: sec.index,
        title: sec.title,
        loaiNckh: sec.loaiNckh,
        records,
        subtotal,
      };
    });

    const namHocDisplay = hasRange ? `${requestedFrom} - ${requestedTo}` : requestedFrom;
    return {
      lecturer,
      namHoc: namHocDisplay,
      namHocFrom: requestedFrom,
      namHocTo: requestedTo,
      sections,
      grandTotal,
      scope,
    };
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { getLecturerReportData };
