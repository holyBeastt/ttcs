const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();
const doanServices = require("../services/doanServices");

const getDoAnHopDongDuKienSite = (req, res) => {
  res.render("doAnHopDongDuKien.ejs");
};

const { CTE_DO_AN, CTE_DAI_HOC, CTE_SAU_DAI_HOC, CTE_TABLE_ALL } = require('../queries/hopdongQueries');

const getInfoDoAnHopDongDuKien = async (req, res) => {
  const Dot = req.body.Dot;
  const ki = req.body.ki;
  const NamHoc = req.body.Nam;
  let MaPhongBan = req.body.Khoa;
  const heDaoTaoValue = req.body.heDaoTaoValue;

  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    if (isKhoa == 1) {
      MaPhongBan = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    let query, values;
    query = `
WITH 
      ${CTE_DO_AN},
      ${CTE_DAI_HOC},
      ${CTE_SAU_DAI_HOC},
      ${CTE_TABLE_ALL},
gv1 AS (
    SELECT 
        SUBSTRING_INDEX(GiangVien1, ' -', 1) AS GiangVien, 
        TenDeTai, 
        SinhVien, 
        MaSV,
        NgayBatDau,
        NgayKetThuc,
        Dot,
        ki,
        NamHoc,
        MaPhongBan,
        he_dao_tao,
        'GV1' AS Nguon
    FROM doantotnghiep
  WHERE GiangVien1 IS NOT NULL
      AND LOWER(TRIM(GiangVien1)) != 'không'
      AND LOWER(TRIM(GiangVien2)) != 'không'
),
gv2 AS (
    SELECT 
        SUBSTRING_INDEX(GiangVien2, ' -', 1) AS GiangVien, 
        TenDeTai, 
        SinhVien,
        MaSV,
        NgayBatDau,
        NgayKetThuc,
        Dot,
        ki,
        NamHoc,
        MaPhongBan,
        he_dao_tao,
        'GV2' AS Nguon
    FROM doantotnghiep
    WHERE GiangVien2 IS NOT NULL
      AND LOWER(TRIM(GiangVien2)) != 'không'
      AND TRIM(GiangVien2) != ''
),
two_gv AS (
    SELECT * FROM gv1 
    UNION ALL
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
        Dot,
        ki,
        NamHoc,
        MaPhongBan,
        he_dao_tao,
        'ONE' AS Nguon
    FROM doantotnghiep 
    WHERE TRIM(GiangVien2) = 'không' AND GiangVien1 != ''
), 
gv_doan AS (
    SELECT * FROM one_gv
    UNION ALL
    SELECT * FROM two_gv
),
gv_with_tiet AS (
    SELECT 
        gvd.*,
        CASE 
            WHEN gvd.Nguon = 'ONE' THEN std.tong_tiet
            WHEN gvd.Nguon = 'GV1' THEN std.so_tiet_1
            ELSE std.so_tiet_2
        END AS SoTiet
    FROM gv_doan gvd
    JOIN sotietdoan std ON gvd.he_dao_tao = std.he_dao_tao
),
final AS (
    SELECT 
        gv_with_tiet.GiangVien,
        gv_with_tiet.TenDeTai,
        gv_with_tiet.SinhVien,
        gv_with_tiet.MaSV,
        gv_with_tiet.SoTiet,
        gv_with_tiet.NgayBatDau,
        gv_with_tiet.NgayKetThuc,
        gv_with_tiet.Dot,
        gv_with_tiet.ki,
        gv_with_tiet.NamHoc,
        gv_with_tiet.MaPhongBan AS MaKhoa,
        gv_with_tiet.he_dao_tao,
        gvmoi.*,
        tsgv.TongSoTiet AS TongSoTietCaNam
    FROM gv_with_tiet
    JOIN gvmoi ON gv_with_tiet.GiangVien = gvmoi.HoTen
    LEFT JOIN TongSoTietGV tsgv ON gv_with_tiet.GiangVien = tsgv.GiangVien
)

SELECT 
    id_Gvm, HoTen, TenDeTai, SinhVien, MaSV, NoiCongTac, HocVi, SoTiet, HSL, 
    NgayBatDau, NgayKetThuc, Dot, ki, NamHoc, MaPhongBan, TongSoTietCaNam, isQuanDoi
FROM final
WHERE Dot = ? AND ki = ? AND NamHoc = ? AND he_dao_tao = ?
    `;
    values = [NamHoc, NamHoc, NamHoc, Dot, ki, NamHoc, heDaoTaoValue];

    let SoQDList;
    if (MaPhongBan != "ALL") {
      query += ` AND MaKhoa = ? `;
      values.push(MaPhongBan);

      // Lấy số quyết định
      const SoQDquery = `SELECT DISTINCT SoQD from doantotnghiep where SoQD != 'NULL' AND Dot = ? AND ki = ? AND NamHoc = ? AND he_dao_tao = ? AND MaPhongBan = ?`;
      [SoQDList] = await connection.query(SoQDquery, [
        Dot,
        ki,
        NamHoc,
        heDaoTaoValue,
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
    VPCheck: TaiChinhCheck,
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
