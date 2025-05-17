const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();

const getDoAnHopDongDuKienSite = (req, res) => {
  res.render("doAnHopDongDuKien.ejs");
};

const getInfoDoAnHopDongDuKien = async (req, res) => {
  const Dot = req.body.Dot;
  const ki = req.body.ki;
  const NamHoc = req.body.Nam;
  let MaPhongBan = req.body.Khoa;

  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    if (isKhoa == 1) {
      MaPhongBan = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    let query, values;
    query = `
       WITH DoAnHopDongDuKien AS (
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
        'Đồ án' AS he_dao_tao,
        MIN(Combined.NgayBatDau) AS NgayBatDau,
        MAX(Combined.NgayKetThuc) AS NgayKetThuc,
        SUM(Combined.SoTiet) AS TongTiet,
        dot,
        ki AS KiHoc,
        NamHoc,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
		    gv.NoiCongTac,
		    gv.BangTotNghiepLoai,
		    gv.MonGiangDayChinh
    FROM (
        SELECT
            NgayBatDau,
            NgayKetThuc,
            TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
            Dot,
            ki,
            NamHoc,
            CASE 
                WHEN GiangVien2 = 'không' THEN 25
                ELSE 15
            END AS SoTiet
        FROM 
            doantotnghiep
        WHERE 
            GiangVien1 IS NOT NULL
            AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
        UNION ALL

        SELECT
            NgayBatDau,
            NgayKetThuc,
            TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
            Dot,
            ki,
            NamHoc,
            10 AS SoTiet
        FROM 
            doantotnghiep
        WHERE 
            GiangVien2 IS NOT NULL 
            AND GiangVien2 != 'không'
            AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
    ) AS Combined
    JOIN 
        gvmoi gv ON Combined.GiangVien = gv.HoTen
    WHERE Combined.NamHoc = '${NamHoc}'
    GROUP BY 
      gv.id_Gvm, gv.HoTen, gv.GioiTinh, gv.Email, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.MaSoThue, gv.HocVi, gv.ChucVu,
		  gv.HSL, gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, he_dao_tao, dot, KiHoc, NamHoc, gv.NgayCapCCCD,
      gv.DiaChi, gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh
    ), 
    
   DaiHocHopDongDuKien AS (
    SELECT
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc,
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
        SUM(qc.QuyChuan) AS SoTiet,
        qc.he_dao_tao,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
		    gv.NoiCongTac,
		    gv.BangTotNghiepLoai,
		    gv.MonGiangDayChinh
    FROM 
        quychuan qc
    JOIN 
        gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
    WHERE
        qc.MoiGiang = 1 AND qc.he_dao_tao like '%Đại học%' AND qc.NamHoc = '${NamHoc}'
    GROUP BY
        gv.id_Gvm,
        gv.HoTen,
        qc.KiHoc,
        gv.GioiTinh,
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
        qc.he_dao_tao,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
		    gv.NoiCongTac,
		    gv.BangTotNghiepLoai,
		    gv.MonGiangDayChinh
    ),
   SauDaiHocHopDongDuKien AS (
    SELECT
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc,
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
        SUM(ROUND(
            qc.QuyChuan * CASE 
                WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                ELSE 1 
            END, 2
        )) AS SoTiet,
        qc.he_dao_tao,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
		    gv.NoiCongTac,
		    gv.BangTotNghiepLoai,
		    gv.MonGiangDayChinh
    FROM 
        quychuan qc
    JOIN 
        gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
    WHERE
        qc.he_dao_tao NOT LIKE '%Đại học%' AND qc.NamHoc = '${NamHoc}'
    GROUP BY
        gv.id_Gvm,
        gv.HoTen,
        gv.GioiTinh,
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
        qc.he_dao_tao,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
		    gv.NoiCongTac,
		    gv.BangTotNghiepLoai,
		    gv.MonGiangDayChinh
    ),
    tableALL AS (SELECT
        Dot,
        KiHoc,
        NamHoc,
        'DoAn' AS LoaiHopDong,
        id_Gvm,
        GiangVien,
        he_dao_tao,
        NgayBatDau,
        NgayKetThuc,
        TongTiet,
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
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh
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
        NgayBatDau,
        NgayKetThuc,
        SoTiet AS TongTiet,
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
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh
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
        NgayBatDau,
        NgayKetThuc,
        SoTiet AS TongTiet,
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
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh
    FROM 
        SauDaiHocHopDongDuKien),
    TongSoTietGV AS (
        SELECT 
            GiangVien, 
            SUM(TongTiet) AS TongSoTiet
        FROM 
            tableALL
        GROUP BY 
            GiangVien
    ),
	gv1 AS (
      SELECT 
          SUBSTRING_INDEX(GiangVien1, ' -', 1) AS GiangVien, 
          TenDeTai, 
          SinhVien, 
          MaSV,
          NgayBatDau,
          NgayKetThuc,
          dot,
          ki,
          namhoc,
          MaPhongBan,
          15 AS SoTiet
      FROM doantotnghiep
      WHERE GiangVien1 IS NOT NULL
          AND GiangVien1 != 'không' AND GiangVien2 != 'không' AND GiangVien2 != ''
  ),
  gv2 AS (
      SELECT 
          SUBSTRING_INDEX(GiangVien2, ' -', 1) AS GiangVien, 
          TenDeTai, 
          SinhVien,
          MaSV,
          NgayBatDau,
          NgayKetThuc,
          dot,
          ki,
          namhoc,
          MaPhongBan,
          10 AS SoTiet
      FROM doantotnghiep
      WHERE GiangVien2 IS NOT NULL
          AND GiangVien2 != 'không' 
          AND GiangVien2 != ''
  ),
  two_gv AS (
      SELECT * FROM gv1 
      UNION all
      SELECT * FROM gv2
  ),
  one_gv AS (
      SELECT         
          SUBSTRING_INDEX(GiangVien1, ' -', 1) AS GiangVien, 
          TenDeTai, 
          SinhVien,
          MaSV,
          NgayBatDau,
          NgayKetThuc,
          dot,
          ki,
          namhoc,
          MaPhongBan,
          25 AS SoTiet 
      FROM doantotnghiep 
      WHERE (GiangVien2 = '' OR GiangVien2 = 'không') AND GiangVien1 != ''
  ), 
  gv_doan AS (
    SELECT * FROM one_gv
    UNION ALL
    SELECT * FROM two_gv
  ),
  final AS (
    SELECT 
        gv_doan.GiangVien,
        gv_doan.TenDeTai,
        gv_doan.SinhVien,
        gv_doan.MaSV,
        gv_doan.SoTiet,
        gv_doan.NgayBatDau,
        gv_doan.NgayKetThuc,
        gv_doan.Dot,
        gv_doan.ki,
        gv_doan.NamHoc,
        gv_doan.MaPhongBan AS MaKhoa,
        gvmoi.*,
        tsgv.TongSoTiet AS TongSoTietCaNam
    FROM gv_doan
    JOIN gvmoi ON gv_doan.GiangVien = gvmoi.HoTen
    LEFT JOIN TongSoTietGV tsgv
    ON gv_doan.GiangVien = tsgv.GiangVien
  )

  SELECT id_Gvm, HoTen, TenDeTai, SinhVien, MaSV, NoiCongTac, HocVi, SoTiet, HSL, NgayBatDau, NgayKetThuc, dot, ki, NamHoc, MaPhongBan, TongSoTietCaNam
  FROM final
  WHERE dot = ? AND ki = ? AND namhoc = ?
    `;
    values = [Dot, ki, NamHoc];

    let SoQDList;
    if (MaPhongBan != "ALL") {
      query += ` AND MaKhoa = ? `;
      values.push(MaPhongBan);

      // Lấy số quyết định
      const SoQDquery = `SELECT DISTINCT SoQD from doantotnghiep where SoQD != 'NULL' AND Dot = ? AND ki = ? AND NamHoc = ? AND MaPhongBan = ?`;
      [SoQDList] = await connection.query(SoQDquery, [
        Dot,
        ki,
        NamHoc,
        MaPhongBan,
      ]);
    }

    query += `ORDER BY TongSoTietCaNam DESC`;

    const [result] = await connection.query(query, values); // Dùng destructuring để lấy dữ liệu

    // Nhóm các môn học theo giảng viên
    const groupedByTeacher = result.reduce((acc, current) => {
      const teacher = current.HoTen;
      if (!acc[teacher]) {
        acc[teacher] = [];
      }
      acc[teacher].push(current);
      return acc;
    }, {});

    // Lấy số tiết định mức
    query = `select GiangDay from sotietdinhmuc`;
    const [SoTietDinhMucRow] = await connection.query(query);

    const SoTietDinhMuc = SoTietDinhMucRow[0]?.GiangDay || 0;

    // Trả dữ liệu về client dưới dạng JSON
    res
      .status(200)
      .json({ groupedByTeacher: groupedByTeacher, SoTietDinhMuc, SoQDList });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ database:", error);

    // Trả lỗi về client
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const KhoaCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả
  let connection;

  try {
    const query = `SELECT MaPhongBan FROM phongban where isKhoa = 1`;
    connection = await createPoolConnection();
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const innerQuery = `SELECT KhoaDuyet FROM doantotnghiep WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?`;
      const [check, innerFields] = await connection.query(innerQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
      ]);

      let checkAll = true;
      for (let j = 0; j < check.length; j++) {
        if (check[j].KhoaDuyet == 0) {
          checkAll = false;
          break;
        }
      }
      if (checkAll) {
        kq += MaPhongBan + ",";
      }
    }
  } catch (error) {
    console.error("Error in KhoaCheckAll:", error);
    throw error; // Throw lại lỗi để xử lý ở nơi gọi hàm này
  } finally {
    if (connection) connection.release();
  }

  // Trả về kết quả có dấu phẩy cuối cùng
  return kq;
};

const DaoTaoCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const queryPhongBan = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
  const connection1 = await createPoolConnection();

  try {
    const [results] = await connection1.query(queryPhongBan);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const queryDuyet = `
        SELECT DaoTaoDuyet 
        FROM doantotnghiep 
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?
      `;
      const connection = await createPoolConnection();

      try {
        const [check] = await connection.query(queryDuyet, [
          MaPhongBan,
          NamHoc,
          Dot,
        ]);

        let checkAll = true;
        for (let j = 0; j < check.length; j++) {
          if (check[j].DaoTaoDuyet == 0) {
            checkAll = false;
            break;
          }
        }
        if (checkAll) {
          kq += MaPhongBan + ",";
        }
      } finally {
        connection.release(); // Giải phóng kết nối sau khi truy vấn xong
      }
    }
  } finally {
    connection1.release(); // Giải phóng kết nối sau khi lấy danh sách phòng ban
  }

  return kq;
};

// Mới
const TaiChinhCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const connection = await createPoolConnection();

  try {
    const query = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const checkQuery = `
        SELECT TaiChinhDuyet FROM doantotnghiep 
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?`;
      const [check, checkFields] = await connection.query(checkQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
      ]);

      let checkAll = true;
      for (let j = 0; j < check.length; j++) {
        if (check[j].TaiChinhDuyet == 0) {
          checkAll = false;
          break;
        }
      }
      if (checkAll === true) {
        kq += MaPhongBan + ",";
      }
    }
  } finally {
    if (connection) connection.release();
  }

  return kq;
};

const getCheckAllDoantotnghiep = async (req, res) => {
  const NamHoc = req.body.NamHoc;
  const Dot = req.body.Dot;
  const KhoaCheck = await KhoaCheckAll(req, Dot, NamHoc);
  const DaoTaoCheck = await DaoTaoCheckAll(req, Dot, NamHoc);
  const TaiChinhCheck = await TaiChinhCheckAll(req, Dot, NamHoc);

  return res.status(200).json({
    KhoaCheck: KhoaCheck,
    DaoTaoCheck: DaoTaoCheck,
    TaiChinhCheck: TaiChinhCheck,
  });
};

const getDuplicateUniqueGV = async () => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Hàm chuẩn hóa tên
    const normalizeName = (name) => name.replace(/\s*\(.*?\)\s*/g, "").trim();

    // Lấy dữ liệu giảng viên mời và cơ hữu
    const [gvms] = await connection.query(`SELECT HoTen, CCCD FROM GVMOI`);
    const [nvs] = await connection.query(
      `SELECT TenNhanVien, CCCD FROM NHANVIEN`
    );

    // Gộp và chuẩn hóa danh sách
    const combinedList = [
      ...gvms.map((item) => ({
        HoTen: item.HoTen,
        CCCD: item.CCCD,
        BienChe: "Giảng viên mời",
        HoTenReal: normalizeName(item.HoTen),
      })),
      ...nvs.map((item) => ({
        HoTen: item.TenNhanVien,
        CCCD: item.CCCD,
        BienChe: "Cơ hữu",
        HoTenReal: normalizeName(item.TenNhanVien),
      })),
    ];

    // Đếm số lần xuất hiện của mỗi tên chuẩn hóa
    const nameCount = {};
    combinedList.forEach((item) => {
      const normalizedName = item.HoTenReal;

      if (!nameCount[normalizedName]) {
        nameCount[normalizedName] = { count: 0, items: [] };
      }

      nameCount[normalizedName].count += 1;
      nameCount[normalizedName].items.push(item);
    });

    // Phân loại giảng viên
    const allGV = [];
    const duplicateGV = [];
    const uniqueGV = [];

    Object.values(nameCount).forEach((entry) => {
      allGV.push(...entry.items);
      if (entry.count > 1) {
        duplicateGV.push(...entry.items);
      } else {
        uniqueGV.push(...entry.items);
      }
    });

    // Trả về dữ liệu
    return {
      duplicateGV,
      uniqueGV,
      allGV,
    };
  } catch (error) {
    console.error("Error in getDuplicateUniqueGV:", error);
    throw new Error("Có lỗi xảy ra khi xử lý dữ liệu: " + error.message);
  } finally {
    if (connection) connection.release();
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getInfoDoAnHopDongDuKien,
  getCheckAllDoantotnghiep,
  getDoAnHopDongDuKienSite,
};
