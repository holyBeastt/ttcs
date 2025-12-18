//const { require } = require("app-root-path");
const express = require("express");
const createPoolConnection = require("../config/databasePool");
const HDDK = require("../controllers/infoHDGvmController");
const { query } = require("../config/Pool");

const router = express.Router();

//Lấy danh sách giảng viên mời để show chi tiết
const getClassInfoGvm = async (req, res) => {
  res.render("moigiang.thongKeLopMoiTheoGv.ejs");
};

// fake req, res và gọi hàm getHopDongDuKienData bên infoHDGvmController 
async function callGetHopDongDuKienData(req, res) {

  let { dot, ki, nam, department, he_dao_tao } = req.body; // Nhận dữ liệu lọc từ client
  const MaPhongBan = req.session.MaPhongBan;
  const isKhoa = req.session.isKhoa;

  if (ki == "ALL") {
    ki = "AllKi";
  }
  if (he_dao_tao == "ALL") {
    he_dao_tao = "AllHe";

  }
  // console.log({ dot, ki, nam, department, he_dao_tao })

  // Tạo đối tượng req với các dữ liệu cần thiết
  const reqMock = {
    query: {
      dot: dot,
      ki: ki,
      namHoc: nam,
      khoa: department,
      he_dao_tao
    },
    session: {
      // Giả sử session có các thông tin cần thiết
      isKhoa: isKhoa,
      MaPhongBan: MaPhongBan
    }
  };
  // console.log(khoa, dot, ki, namHoc, MaPhongBan, isKhoa, he_dao_tao);
  // ALL 1 AllKi 2024 - 2025 DAOTAO 0 AllHe

  // Tạo đối tượng res giả để bắt được kết quả
  let responseData; // biến để lưu dữ liệu trả về
  const resMock = {
    // Ghi đè hàm json để lưu kết quả trả về
    json: function (data) {
      responseData = data;
      return this;
    },
    status: function (code) {
      this.statusCode = code;
      return this;
    }
  };

  // Gọi trực tiếp controller với reqMock và resMock
  await HDDK.getHopDongDuKienData(reqMock, resMock);

  // Sau khi controller xử lý xong, trả về dữ liệu đã được json trả ra
  return responseData;
}


const getClassInfoGvmData = async (req, res) => {
  const MaPhongBan = req.session.MaPhongBan;
  const isKhoa = req.session.isKhoa;
  const { dot, ki, nam, department, he_dao_tao } = req.body; // Nhận dữ liệu lọc từ client
  // console.log(req.body)

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
        gv.hoc_vien_duyet,
        qc.NgayBatDau, 
        qc.NgayKetThuc,
        gv.DiaChi,
        qc.Dot,
        qc.KiHoc,
        qc.NamHoc,
        qc.Khoa,
        qc.he_dao_tao,
        gv.isNghiHuu
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
          gv.hoc_vien_duyet,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,   
          qc.he_dao_tao,
          gv.isNghiHuu
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

  SELECT * FROM table_ALL WHERE Dot = ? AND NamHoc = ?
  `;

  // Thêm điều kiện lọc theo hệ đào tạo nếu không phải "ALL"
  if (he_dao_tao !== "0") {
    query += ` AND he_dao_tao = ?`;
  }

  if (ki != "ALL") {
    query += ` AND KiHoc = ?`;
  }

  try {
    connection = await createPoolConnection();
    const queryParams = [dot, nam];
    if (he_dao_tao !== "0") {
      queryParams.push(he_dao_tao);
    }
    if (ki != "ALL") {
      queryParams.push(ki);
    }

    // Thống kê theo từng lớp 
    const [results, fields] = await connection.query(query, queryParams);
    // Lấy tổng tiết dự kiến 
    const tongSoTietTrongNam = await callGetHopDongDuKienData(req, res);
    // console.log("data khi gọi : " + JSON.stringify(tongSoTietTrongNam, null, 2))
    // Nhóm các môn học theo giảng viên, theo Khoa 
    const groupedByTeacher = results.reduce((acc, current) => {
      const teacher = current.GiangVien;

      // Nếu department là ALL thì hiển thị tất cả
      if (department == "ALL") {
        if (!acc[teacher]) {
          acc[teacher] = [];
        }
        acc[teacher].push(current);
      } else {
        // Lọc theo Khoa
        if (current.Khoa == department) {
          if (!acc[teacher]) {
            acc[teacher] = [];
          }
          acc[teacher].push(current);
        }
      }

      return acc;
    }, {});

    // Vòng lặp thứ 2, kiểm tra một giảng viên giảng dạy nhiều khoa 
    if (department != "ALL") {
      results.forEach(current => {
        // Kiểm tra khoa thứ 2 
        if (current.Khoa != department) {
          const teacher = current.GiangVien;
          // Trùng tên, Khoa khác thì thêm luôn
          if (groupedByTeacher[teacher]) {
            groupedByTeacher[teacher].push(current);
          }
        }
      });
    }

    // console.log(groupedByTeacher)
    // Duyệt qua danh sách tongSoTietTrongNam để chèn dữ liệu vào cuối mảng của từng giảng viên
    tongSoTietTrongNam.dataDuKien.forEach((item) => {
      const teacherName = item.GiangVien;

      // Nếu chưa có key của giảng viên trong groupedByTeacher, khởi tạo mảng rỗng.
      if (!groupedByTeacher.hasOwnProperty(teacherName)) {
        groupedByTeacher[teacherName] = [];
      }

      // Kiểm tra xem trong mảng đã có đối tượng với key 'tongSoTietBaoGomDoAn'
      // và giá trị trùng khớp với item.TongSoTiet chưa
      const exists = groupedByTeacher[teacherName].some(subItem =>
        subItem.hasOwnProperty('tongSoTietBaoGomDoAn') && subItem.tongSoTietBaoGomDoAn === item.TongSoTiet
      );

      // Nếu chưa có, mới push đối tượng mới
      if (!exists) {
        groupedByTeacher[teacherName].push({ tongSoTietBaoGomDoAn: item.TongSoTiet });
      }
    });

    // Đảm bảo rằng tất cả các giảng viên đều có thông tin 'tongSoTietBaoGomDoAn'
    // Nếu giảng viên chưa có thông tin này, thêm đối tượng với giá trị mặc định là 0
    Object.keys(groupedByTeacher).forEach(teacher => {
      const hasDoAn = groupedByTeacher[teacher].some(subItem =>
        subItem.hasOwnProperty('tongSoTietBaoGomDoAn')
      );
      if (!hasDoAn) {
        groupedByTeacher[teacher].push({ tongSoTietBaoGomDoAn: 0 });
      }
    });

    // Sort giảm dần 
    const result1 = sortDataByTotalSoTiet(groupedByTeacher);

    // Lấy MaPhongBan của giảng viên 
    const result2 = await getMaPhongBanAndUpdateData(result1);

    // console.log(result2)

    // Lấy thông tin định mức từ kết quả trả về của callGetHopDongDuKienData
    const dinhMuc = {
      normal: tongSoTietTrongNam.SoTietDinhMuc || 300,
      nghiHuu: tongSoTietTrongNam.SoTietDinhMucNghiHuu || 100
    };

    // Trả về dữ liệu nhóm theo giảng viên dưới dạng JSON, kèm theo định mức
    res.json({
      data: result2,
      dinhMuc: dinhMuc
    });
  } catch (error) {
    console.error("Error fetching class info:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getMaPhongBanAndUpdateData = async (data) => {
  let connection;
  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();


    // Lặp qua từng giảng viên trong data
    for (const tenGiangVien in data) {
      if (Object.hasOwnProperty.call(data, tenGiangVien)) {
        // Truy vấn MaPhongBan từ bảng gvmoi dựa trên tên giảng viên
        const query = `SELECT MaPhongBan FROM gvmoi WHERE HoTen = ?`;
        const [results] = await connection.query(query, [tenGiangVien]);

        if (results.length > 0) {
          const maPhongBan = results[0].MaPhongBan;

          // Gắn MaPhongBan vào từng đối tượng trong mảng của giảng viên đó
          data[tenGiangVien].forEach(item => {
            // Chỉ thêm MaPhongBan vào đối tượng có thông tin giảng viên
            if (item.GiangVien) {
              item.MaPhongBan = maPhongBan;
            }
          });
        } else {
          console.log(`Không tìm thấy thông tin phòng ban cho giảng viên: ${tenGiangVien}`);
        }
      }
    }

    return data;
  } catch (error) {
    console.error("Lỗi khi truy vấn MaPhongBan:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

function sortDataByTotalSoTiet(data) {
  // Lấy các cặp [key, value] từ đối tượng
  const entries = Object.entries(data);

  // Sắp xếp mảng entries dựa vào tổng số tiết của phần tử cuối trong mảng value
  entries.sort((a, b) => {
    const totalA = parseFloat(a[1][a[1].length - 1].tongSoTietBaoGomDoAn);
    const totalB = parseFloat(b[1][b[1].length - 1].tongSoTietBaoGomDoAn);
    return totalB - totalA; // giảm dần
  });

  // Chuyển đổi mảng đã sắp xếp về đối tượng với cùng cấu trúc ban đầu
  return Object.fromEntries(entries);
}

// Lấy data của hợp dồng dự kiến 
const getHopDongDuKienData = async (namHoc, dot, ki, he_dao_tao, khoa) => {
  let connection;
  // console.log("param: " + namHoc + dot + ki + he_dao_tao + khoa);
  try {
    connection = await createPoolConnection();
    // const namHoc = req.query.namHoc;
    // const dot = req.query.dot;
    // let ki = req.query.ki;
    // const he_dao_tao = req.query.he_dao_tao;
    // const khoa = req.query.khoa;


    if (he_dao_tao == "Đồ án") {
      ki = 0;
    }

    let query = `WITH DoAnHopDongDuKien AS (
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
        0 AS KiHoc,
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
    WHERE Combined.NamHoc = '${namHoc}'
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
        qc.MoiGiang = 1 AND qc.he_dao_tao like '%Đại học%' AND qc.NamHoc = '${namHoc}'
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
        qc.he_dao_tao NOT LIKE '%Đại học%' AND qc.NamHoc = '${namHoc}'
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
    )
    SELECT 
        MAX(ta.Dot) AS Dot,
        MAX(ta.KiHoc) AS KiHoc,
        ta.NamHoc,
        ta.id_Gvm,
        ta.GiangVien,
        ta.he_dao_tao,
        MIN(ta.NgayBatDau) AS NgayBatDau,
        MAX(ta.NgayKetThuc) AS NgayKetThuc,
        SUM(ta.TongTiet) AS TongTiet,
        ta.GioiTinh,
        ta.NgaySinh,
        ta.CCCD,
        ta.NoiCapCCCD,
        ta.Email,
        ta.MaSoThue,
        ta.HocVi,
        ta.ChucVu,
        ta.HSL,
        ta.DienThoai,
        ta.STK,
        ta.NganHang,
        ta.MaPhongBan,
        ta.NgayCapCCCD,
        ta.DiaChi,
        ta.BangTotNghiep, 
        ta.NoiCongTac,
        ta.BangTotNghiepLoai,
        ta.MonGiangDayChinh,
        tsgv.TongSoTiet
    FROM 
        tableALL ta
    LEFT JOIN 
        TongSoTietGV tsgv 
    ON 
        ta.GiangVien = tsgv.GiangVien
    Where NamHoc = ?`;

    let params = [namHoc];
    let groupByQuery = "";

    // Kiểm tra nếu ki là "AllKi", không thêm điều kiện lọc theo kỳ
    if (ki !== "AllKi" && ki) {
      query += " AND dot = ? AND KiHoc = ?";
      params.push(dot, ki);
    }

    // Kiểm tra nếu ki là "AllKi", không thêm điều kiện lọc theo kỳ
    if (he_dao_tao != "ALL") {
      query += " AND he_dao_tao = ?";
      params.push(he_dao_tao);
    }

    if (khoa !== "ALL" && khoa) {
      query += " AND MaPhongBan =?";
      params.push(khoa);
    }

    query += `
    GROUP BY 
        ta.NamHoc,
        ta.id_Gvm,
        ta.GiangVien,
        ta.he_dao_tao,
        ta.GioiTinh,
        ta.NgaySinh,
        ta.CCCD,
        ta.NoiCapCCCD,
        ta.Email,
        ta.MaSoThue,
        ta.HocVi,
        ta.ChucVu,
        ta.HSL,
        ta.DienThoai,
        ta.STK,
        ta.NganHang,
        ta.MaPhongBan,
        ta.NgayCapCCCD,
        ta.DiaChi,
        ta.BangTotNghiep, 
        ta.NoiCongTac,
        ta.BangTotNghiepLoai,
        ta.MonGiangDayChinh`;

    query += ` ORDER BY 
      tsgv.TongSoTiet DESC;`;

    const [rows] = await connection.execute(query, params);

    // res.json(rows);
    return rows
  } catch (error) {
    console.error("Error fetching HD Gvm data:", error);
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
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
