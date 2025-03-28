//const { require } = require("app-root-path");
const express = require("express");
//const connection = require("../config/database");
const createPoolConnection = require("../config/databasePool");

const router = express.Router();

//Lấy danh sách giảng viên mời để show chi tiết

const getClassInfoGvm = async (req, res) => {
  res.render("classInfoGvm.ejs");
};

const getSoTietDoAnTongHopTheoNam = async (NamHoc, MaPhongBan) => {
  let connection;
  try {
    connection = await createPoolConnection();

    let query, values;
    if (MaPhongBan === "ALL") {
      query = `
      WITH gv1 AS (
        SELECT 
            SUBSTRING_INDEX(GiangVien1, ' -', 1) AS GiangVien, 
            TenDeTai, 
            SinhVien, 
            MaSV,
            NgayBatDau,
            NgayKetThuc,
            dot,
            namhoc,
            MaPhongBan,
            15 AS SoTiet
        FROM doantotnghiep
        WHERE GiangVien1 IS NOT NULL
            AND GiangVien1 != 'không' 
            AND GiangVien2 != 'không' 
            AND GiangVien2 != ''  
            AND GiangVien1 NOT LIKE '%Cơ hữu%'
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
            namhoc,
            MaPhongBan,
            10 AS SoTiet
        FROM doantotnghiep
        WHERE GiangVien2 IS NOT NULL
            AND GiangVien2 != 'không' 
            AND GiangVien2 != ''
            AND GiangVien2 NOT LIKE '%Cơ hữu%'
      ),
      two_gv AS (
        SELECT * FROM gv1 
        UNION ALL
        SELECT * FROM gv2
      ),
      one_gv AS (
        SELECT         
            SUBSTRING_INDEX(GiangVien1, ' - ', 1) AS GiangVien, 
            TenDeTai, 
            SinhVien,
            MaSV,
            NgayBatDau,
            NgayKetThuc,
            dot,
            namhoc,
            MaPhongBan,
            25 AS SoTiet 
        FROM doantotnghiep 
        WHERE (GiangVien2 = '' OR GiangVien2 = 'không') 
          AND GiangVien1 != ''
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
            gv_doan.NamHoc,
            gv_doan.MaPhongBan AS MaKhoa,
            gvmoi.*
        FROM gv_doan
        JOIN gvmoi ON gv_doan.GiangVien = gvmoi.HoTen
      )
      SELECT 
        id_Gvm, 
        HoTen, 
        TenDeTai, 
        SinhVien, 
        MaSV, 
        NoiCongTac, 
        HocVi, 
        SoTiet, 
        HSL, 
        NgayBatDau, 
        NgayKetThuc, 
        dot, 
        NamHoc, 
        MaPhongBan
      FROM final
      WHERE dot = ? AND namhoc = ?`;
      values = [Dot, NamHoc];
    } else {
      query = `
      WITH gv1 AS (
        SELECT 
            SUBSTRING_INDEX(GiangVien1, ' - ', 1) AS GiangVien, 
            TenDeTai, 
            SinhVien, 
            MaSV,
            NgayBatDau,
            NgayKetThuc,
            dot,
            namhoc,
            MaPhongBan,
            15 AS SoTiet
        FROM doantotnghiep
        WHERE GiangVien1 IS NOT NULL
            AND GiangVien1 != 'không' 
            AND GiangVien2 != 'không' 
            AND GiangVien2 != ''
      ),
      gv2 AS (
        SELECT 
            SUBSTRING_INDEX(GiangVien2, ' - ', 1) AS GiangVien, 
            TenDeTai, 
            SinhVien,
            MaSV,
            NgayBatDau,
            NgayKetThuc,
            dot,
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
        UNION ALL
        SELECT * FROM gv2
      ),
      one_gv AS (
        SELECT         
            SUBSTRING_INDEX(GiangVien1, ' - ', 1) AS GiangVien, 
            TenDeTai, 
            SinhVien,
            MaSV,
            NgayBatDau,
            NgayKetThuc,
            dot,
            namhoc,
            MaPhongBan,
            25 AS SoTiet 
        FROM doantotnghiep 
        WHERE (GiangVien2 = '' OR GiangVien2 = 'không') 
          AND GiangVien1 != ''
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
            gv_doan.NamHoc,
            gv_doan.MaPhongBan AS MaKhoa,
            gvmoi.*
        FROM gv_doan
        JOIN gvmoi ON gv_doan.GiangVien = gvmoi.HoTen
      )
      SELECT 
        id_Gvm, 
        HoTen, 
        TenDeTai, 
        SinhVien, 
        MaSV, 
        NoiCongTac, 
        HocVi, 
        SoTiet, 
        HSL, 
        NgayBatDau, 
        NgayKetThuc, 
        dot, 
        NamHoc, 
        MaPhongBan
      FROM final
      WHERE namhoc = ? AND MaKhoa = ?`;
      values = [NamHoc, MaPhongBan];
    }

    const [result] = await connection.query(query, values);

    // Nhóm dữ liệu theo giảng viên và tính tổng số tiết
    const grouped = result.reduce((acc, current) => {
      const teacher = current.HoTen;
      if (!acc[teacher]) {
        acc[teacher] = {
          HoTen: teacher,
          SoTiet: 0,
          MaPhongBan: current.MaPhongBan // giả sử mỗi giảng viên chỉ thuộc 1 khoa
        };
      }
      acc[teacher].SoTiet += current.SoTiet;
      return acc;
    }, {});

    // Chuyển kết quả thành mảng các đối tượng
    const finalResult = Object.values(grouped);

    // Trả về mảng kết quả
    return finalResult;
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ database:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};


const getClassInfoGvmData = async (req, res) => {
  const MaPhongBan = req.session.MaPhongBan;
  const isKhoa = req.session.isKhoa;
  const { dot, ki, nam, department, he_dao_tao } = req.body; // Nhận dữ liệu lọc từ client

  let connection; // Khai báo biến connection

  let query = `
  WITH 
 phuLucSauDH AS (
    SELECT DISTINCT
        TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) AS GiangVien, 
        qc.TenLop AS Lop, 
        ROUND( qc.QuyChuan * 0.7, 2 ) AS SoTiet,
        qc.LopHocPhan AS TenHocPhan, 
        qc.KiHoc AS HocKy,
        qc.SoTinChi,
        gv.id_Gvm,
        gv.HocVi, 
        gv.HSL,
        qc.NgayBatDau, 
        qc.NgayKetThuc,
        gv.DiaChi,
        qc.Dot,
        qc.KiHoc,
        qc.NamHoc,
        qc.Khoa,
        qc.he_dao_tao
    FROM quychuan qc
    JOIN gvmoi gv 
        ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
    WHERE qc.GiaoVienGiangDay LIKE '%,%' AND qc.MoiGiang = 1
),
  phuLucDH AS (
      SELECT DISTINCT
          TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien, 
          qc.TenLop AS Lop, 
          qc.QuyChuan AS SoTiet, 
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          qc.SoTinChi,
          gv.id_Gvm,
          gv.HocVi, 
          gv.HSL,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,   
          qc.he_dao_tao
      FROM quychuan qc
      JOIN gvmoi gv 
          ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) = gv.HoTen
      WHERE qc.MoiGiang = 1 AND qc.GiaoVienGiangDay NOT LIKE '%,%'
  ),
  table_ALL AS (
      SELECT * FROM phuLucSauDH
      UNION
      SELECT * FROM phuLucDH
  )

  SELECT * FROM table_ALL WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?
  `;

  // Thêm điều kiện lọc theo hệ đào tạo nếu không phải "ALL"
  if (he_dao_tao !== "ALL") {
    query += ` AND he_dao_tao = ?`;
  }

  // Thêm điều kiện lọc theo khoa
  if (isKhoa == 0) {
    if (department != "ALL") {
      query += ` AND Khoa LIKE '%${department}%'`;
    }
  } else {
    query += ` AND Khoa LIKE '%${MaPhongBan}%'`;
  }

  try {
    connection = await createPoolConnection();
    const queryParams = [dot, ki, nam];
    if (he_dao_tao !== "ALL") {
      queryParams.push(he_dao_tao);
    }

    const [results, fields] = await connection.query(query, queryParams);
    const dataSoTietDoAn = await getSoTietDoAnTongHopTheoNam(nam, MaPhongBan);
    console.log(dataSoTietDoAn);

    // Nhóm các môn học theo giảng viên
    const groupedByTeacher = results.reduce((acc, current) => {
      const teacher = current.GiangVien;
      if (!acc[teacher]) {
        acc[teacher] = [];
      }
      acc[teacher].push(current);
      return acc;
    }, {});

    // console.log(groupedByTeacher)

    // gôp số tiết đồ án
    dataSoTietDoAn.forEach(item => {
      const teacherName = item.HoTen;
      if (groupedByTeacher.hasOwnProperty(teacherName)) {
        // Chèn thêm đối tượng vào cuối mảng của giảng viên tương ứng
        groupedByTeacher[teacherName].push({ soTietDoAn: item.SoTiet });
      }
    });

    // Đảm bảo  mỗi giảng viên có đối tượng với key soTietDoAn, không có số tiết đồ án thì = 0
    Object.keys(groupedByTeacher).forEach(teacher => {
      // Kiểm tra xem trong mảng đã có đối tượng nào chứa key soTietDoAn chưa
      const hasDoAn = groupedByTeacher[teacher].some(subItem => subItem.hasOwnProperty('soTietDoAn'));
      if (!hasDoAn) {
        groupedByTeacher[teacher].push({ soTietDoAn: 0 });
      }
    });

    // Trả về dữ liệu nhóm theo giảng viên dưới dạng JSON
    res.json(groupedByTeacher);
  } catch (error) {
    console.error("Error fetching class info:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};


const getGvm = async (req, res) => {
  let connection; // Khai báo biến connection
  const query2 = `SELECT * FROM gvmoi`; // Sử dụng chữ in hoa cho câu lệnh SQL

  try {
    connection = await pool.getConnection(); // Lấy kết nối từ pool

    const [results2] = await connection.query(query2); // Thực hiện truy vấn

    res.json(results2); // Trả về danh sách giảng viên mời
  } catch (error) {
    console.error("Error fetching GVM list:", error);
    res.status(500).json({ message: "Internal Server Error" }); // Xử lý lỗi
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getClassInfoGvm,
  getGvm,
  getClassInfoGvmData,
};