// --- HELPER FUNCTION: Tạo SQL Join giá tiền tự động ---
const DON_GIA_EXPR = (tableAlias, khoaCol) => `
COALESCE(
  (
    SELECT cfg.SoTien
    FROM tienluong cfg
    WHERE 
      (cfg.he_dao_tao IS NULL OR cfg.he_dao_tao = ${tableAlias}.he_dao_tao)
      AND (cfg.Khoa = 'ALL' OR cfg.Khoa = ${tableAlias}.${khoaCol})
      AND (cfg.HocVi IS NULL OR cfg.HocVi = gv.HocVi)
      AND CAST(REPLACE(gv.HSL, ',', '.') AS DECIMAL(4,2)) >= cfg.HSL
    ORDER BY cfg.do_uu_tien DESC, cfg.HSL DESC
    LIMIT 1
  ),
  0
)
`;

const COL_DON_GIA = `COALESCE(bang_gia.don_gia, 0)`;


// const CTE_DO_AN = `
// DoAnHopDongDuKien AS (
//   SELECT
//     gv.id_Gvm,
//     gv.HoTen AS GiangVien,
//     gv.GioiTinh,
//     gv.Email,
//     gv.NgaySinh,
//     gv.CCCD,
//     gv.NoiCapCCCD,
//     gv.MaSoThue,
//     gv.HocVi,
//     gv.ChucVu,
//     gv.HSL,
//     gv.DienThoai,
//     gv.STK,
//     gv.NganHang,
//     gv.MaPhongBan,
//     Combined.MaPhongBan AS MaKhoaMonHoc,
//     Combined.he_dao_tao,
//     gv.isQuanDoi,
//     NgayBatDau,
//     NgayKetThuc,
//     CASE 
//       WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
//       WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
//       ELSE std.so_tiet_2
//     END AS SoTiet,
//     Dot,
//     ki AS KiHoc,
//     NamHoc,
//     gv.NgayCapCCCD,
//     gv.DiaChi,
//     gv.BangTotNghiep, 
//     gv.NoiCongTac,
//     gv.BangTotNghiepLoai,
//     gv.MonGiangDayChinh,
//     100000 AS TienMoiGiang,
//     CASE 
//       WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
//       WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
//       ELSE std.so_tiet_2
//     END * 100000 AS ThanhTien,
//     CASE 
//       WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
//       WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
//       ELSE std.so_tiet_2
//     END * 100000 * 0.1 AS Thue,
//     CASE 
//       WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
//       WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
//       ELSE std.so_tiet_2
//     END * 100000 * 0.9 AS ThucNhan

//   FROM (
//     SELECT
//       NgayBatDau,
//       NgayKetThuc,
//       MaPhongBan,
//       he_dao_tao,
//       TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
//       GiangVien2,
//       'GV1' AS Nguon,
//       Dot,
//       ki,
//       NamHoc
//     FROM doantotnghiep
//     WHERE 
//       GiangVien1 IS NOT NULL
//       AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')

//     UNION ALL

//     SELECT
//       NgayBatDau,
//       NgayKetThuc,
//       MaPhongBan,
//       he_dao_tao,
//       TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
//       GiangVien2,
//       'GV2' AS Nguon,
//       Dot,
//       ki,
//       NamHoc
//     FROM doantotnghiep
//     WHERE 
//       GiangVien2 IS NOT NULL 
//       AND GiangVien2 != 'không'
//       AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
//   ) AS Combined
//   JOIN gvmoi gv ON Combined.GiangVien = gv.HoTen
//   JOIN sotietdoan std ON Combined.he_dao_tao = std.he_dao_tao
//   WHERE Combined.NamHoc = ?
// )
// `;

const CTE_DO_AN = `
DoAnHopDongDuKien AS (
  SELECT
    gv.id_Gvm,
    gv.HoTen AS GiangVien,
    gv.GioiTinh,
    gv.Email,
    gv.NgaySinh,
    gv.CCCD,
    gv.NoiCapCCCD,
    gv.MaSoThue,
    gv.HocVi,
    gv.ChucVu,
    gv.HSL,
    gv.DienThoai,
    gv.STK,
    gv.NganHang,
    gv.MaPhongBan,
    Combined.MaPhongBan AS MaKhoaMonHoc,
    Combined.he_dao_tao,
    gv.isQuanDoi,
    gv.isNghiHuu,
    NgayBatDau,
    NgayKetThuc,

    /* ================== SỐ TIẾT ================== */
    CASE 
      WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
      WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
      ELSE std.so_tiet_2
    END AS SoTiet,

    Dot,
    ki AS KiHoc,
    NamHoc,
    gv.NgayCapCCCD,
    gv.DiaChi,
    gv.BangTotNghiep, 
    gv.NoiCongTac,
    gv.BangTotNghiepLoai,
    gv.MonGiangDayChinh,

    /* ================== ĐƠN GIÁ ================== */
    ${DON_GIA_EXPR('Combined', 'MaPhongBan')} AS TienMoiGiang,

    /* ================== THÀNH TIỀN ================== */
    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * ${DON_GIA_EXPR('Combined', 'MaPhongBan')} AS ThanhTien,

    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * ${DON_GIA_EXPR('Combined', 'MaPhongBan')} * 0.1 AS Thue,

    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * ${DON_GIA_EXPR('Combined', 'MaPhongBan')} * 0.9 AS ThucNhan

  FROM (
    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV1' AS Nguon,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien1 IS NOT NULL
      AND (GiangVien1 NOT LIKE '%-%' 
           OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')

    UNION ALL

    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV2' AS Nguon,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien2 IS NOT NULL 
      AND GiangVien2 != 'không'
      AND (GiangVien2 NOT LIKE '%-%' 
           OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
  ) AS Combined
  JOIN gvmoi gv ON Combined.GiangVien = gv.HoTen
  JOIN sotietdoan std ON Combined.he_dao_tao = std.he_dao_tao
  WHERE Combined.NamHoc = ?
)
`;


const CTE_DAI_HOC = `
DaiHocHopDongDuKien AS (
    SELECT
        NgayBatDau,
        NgayKetThuc,
        gv.id_Gvm,
        gv.GioiTinh,
        gv.HoTen,
        gv.NgaySinh,
        gv.CCCD,
        gv.NoiCapCCCD,
        gv.Email,
        gv.MaSoThue,
        gv.HocVi,
        gv.ChucVu,
        gv.HSL,
        gv.DienThoai,
        gv.STK,
        gv.NganHang,
        gv.MaPhongBan,
        qc.Khoa AS MaKhoaMonHoc,
        qc.QuyChuan AS SoTiet,
        qc.he_dao_tao,
        gv.isQuanDoi,
        gv.isNghiHuu,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
        gv.NoiCongTac,
        gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,

        ${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan AS ThanhTien,
        ${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.1 AS Thue,
        ${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.9 AS ThucNhan
    FROM 
        quychuan qc
    JOIN 
        gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
    WHERE
        qc.MoiGiang = 1 AND qc.NamHoc = ? AND qc.he_dao_tao in (select id from he_dao_tao where cap_do = 1)
    )
`;

const CTE_SAU_DAI_HOC = `
SoTietSauDaiHoc AS (
        SELECT
            qc.NgayBatDau,
            qc.NgayKetThuc,
            gv.id_Gvm,
            gv.GioiTinh,
            gv.HoTen,
            gv.NgaySinh,
            gv.CCCD,
            gv.NoiCapCCCD,
            gv.Email,
            gv.MaSoThue,
            gv.HocVi,
            gv.ChucVu,
            gv.HSL,
            gv.DienThoai,
            gv.STK,
            gv.NganHang,
            gv.MaPhongBan,
            qc.Khoa AS MaKhoaMonHoc,
            ROUND(
                qc.QuyChuan * CASE 
                    WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                    ELSE 1 
                END, 2
            ) AS SoTiet,
            qc.he_dao_tao,
            gv.isQuanDoi,
            gv.isNghiHuu,
            qc.NamHoc,
            qc.KiHoc,
            qc.Dot,
            gv.NgayCapCCCD,
            gv.DiaChi,
            gv.BangTotNghiep, 
            gv.NoiCongTac,
            gv.BangTotNghiepLoai,
            gv.MonGiangDayChinh,
            ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang
        FROM 
            quychuan qc
        JOIN 
            gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
        WHERE
            qc.NamHoc = ? AND qc.he_dao_tao not in (select id from he_dao_tao where cap_do = 1)
    ),
    SauDaiHocHopDongDuKien AS (
        SELECT
            *,
            TienMoiGiang * SoTiet AS ThanhTien,
            TienMoiGiang * SoTiet * 0.1 AS Thue,
            TienMoiGiang * SoTiet * 0.9 AS ThucNhan
        FROM SoTietSauDaiHoc
    )
`;

// Union tất cả lại
const CTE_TABLE_ALL = `
tableALL AS (SELECT
        Dot,
        KiHoc,
        NamHoc,
        'DoAn' AS LoaiHopDong,
        id_Gvm,
        GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        DoAnHopDongDuKien
    UNION ALL
    SELECT 
        Dot,
        KiHoc,
        NamHoc,
        'DaiHoc' AS LoaiHopDong,
        id_Gvm,
        HoTen AS GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        DaiHocHopDongDuKien
    UNION ALL
    SELECT 
        Dot,
        KiHoc,
        NamHoc,
        'SauDaiHoc' AS LoaiHopDong,
        id_Gvm,
        HoTen AS GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        SauDaiHocHopDongDuKien),
    TongSoTietGV AS (
        SELECT 
            GiangVien, 
            SUM(SoTiet) AS TongSoTiet
        FROM 
            tableALL
        GROUP BY 
            GiangVien
    )
`;

module.exports = { CTE_DO_AN, CTE_DAI_HOC, CTE_SAU_DAI_HOC, CTE_TABLE_ALL, DON_GIA_EXPR };