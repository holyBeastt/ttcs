const express = require("express");
const createPoolConnection = require("../config/databasePool");
const LogService = require("../services/logService");

// render site quy định số giờ nckh cho admin dùng thư viện ejs
const getQuyDinhSoGioNCKH = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const [rows] = await connection.execute("SELECT * FROM quydinhsogionckh");

    if (rows.length === 0) {
      return res.status(404).send("Không có dữ liệu");
    }

    res.render("nckhQuyDinhSoGioNCKH.ejs", { data: rows });
  } catch (err) {
    console.error("Lỗi truy vấn:", err);
    res.status(500).send("Lỗi trong quá trình truy vấn dữ liệu");
  } finally {
    if (connection) connection.release();
  }
};

const getDeTaiDuAn = (req, res) => {
  res.render("nckhDeTaiDuAn.ejs");
};
const getBaiBaoKhoaHoc = (req, res) => {
  res.render("nckhBaiBaoKhoaHoc.ejs");
};
const getBangSangCheVaGiaiThuong = (req, res) => {
  res.render("nckhBangSangCheVaGiaiThuong.ejs");
};
const getSachVaGiaoTrinh = (req, res) => {
  res.render("nckhSachVaGiaoTrinh.ejs");
};
const getNckhVaHuanLuyenDoiTuyen = (req, res) => {
  res.render("nckhVaHuanLuyenDoiTuyen.ejs");
};

const getXayDungCTDT = (req, res) => {
  res.render("nckhXayDungCTDT.ejs");
};
const getBienSoanGiaoTrinhBaiGiang = (req, res) => {
  res.render("nckhBienSoanGiaoTrinhBaiGiang.ejs");
};
const getSoTietNCKHBaoLuuSangNam = (req, res) => {
  res.render("nckhSoTietNCKHBaoLuuSangNam.ejs");
};
const getTongHopSoTietNCKH = (req, res) => {
  res.render("nckhTongHopSoTiet.ejs");
};
const getTongHopSoTietNCKHDuKien = (req, res) => {
  res.render("nckhTongHopSoTietDuKien.ejs");
};
const getNhiemVuKhoaHocCongNghe = (req, res) => {
  res.render("nckhNhiemVuKhoaHocCongNghe.ejs");
};

const getTableDeTaiDuAn = async (req, res) => {
  const { NamHoc, Khoa } = req.params;
  console.log(`Lấy dữ liệu bảng detaiduan Năm: ${NamHoc} Khoa: ${Khoa}`);

  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy tất cả dữ liệu của năm học được chọn
    let query = `SELECT * FROM detaiduan WHERE NamHoc = ?`;
    const [results] = await connection.execute(query, [NamHoc]);

    if (Khoa === "ALL") {
      res.json(results);
    } else {
      const filteredResults = [];

      for (let item of results) {
        const namesToCheck = [];

        // Xử lý các trường ChuNhiem và ThuKy
        ["ChuNhiem", "ThuKy"].forEach((key) => {
          if (item[key]) {
            const name = item[key].replace(/\s*\([^)]*\)/g, "").trim();
            namesToCheck.push(name);
          }
        });

        // Xử lý trường DanhSachThanhVien (danh sách các tên, phân tách bằng dấu phẩy)
        if (item["DanhSachThanhVien"]) {
          const members = item["DanhSachThanhVien"].split(",").map((name) =>
            name
              .trim()
              .replace(/\s*\([^)]*\)/g, "")
              .trim()
          );
          namesToCheck.push(...members);
        }

        // Loại bỏ các tên trùng lặp
        const uniqueNames = [...new Set(namesToCheck)];

        // Truy vấn bảng nhanvien để lấy MaPhongBan cho các tên
        if (uniqueNames.length > 0) {
          const placeholders = uniqueNames.map(() => "?").join(", ");
          const nameQuery = `SELECT TenNhanVien, MaPhongBan FROM nhanvien WHERE TenNhanVien IN (${placeholders})`;

          const [employeeResults] = await connection.execute(
            nameQuery,
            uniqueNames
          );

          const departmentCodes = employeeResults.map((emp) => emp.MaPhongBan);

          // Nếu có bất kỳ mã phòng ban nào chứa chuỗi Khoa thì thêm item vào kết quả
          if (departmentCodes.some((code) => code && code.includes(Khoa))) {
            filteredResults.push(item);
          }
        }
      }
      console.log(filteredResults);
      res.json(filteredResults);
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTableDeTaiDuAn:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release();
  }
};

// lấy dữ liệu giảng viên cơ hữu để thêm vào danh sách thành viên
const getTeacher = async (req, res) => {
  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Truy vấn lấy dữ liệu giảng viên từ bảng nhanvien
    const [results] = await connection.execute(
      `SELECT TenNhanVien AS HoTen, MonGiangDayChinh
FROM nhanvien`
    );

    // Trả luôn kết quả vào response (res) ngay trong hàm getTeacher
    res.json(results); // Trả về kết quả trực tiếp từ đây
  } catch (error) {
    console.error("Error while fetching lecturer data:", error);
    // Trả lỗi nếu có bất kỳ vấn đề nào trong truy vấn
    res.status(500).json({
      message: "Lỗi khi lấy dữ liệu giảng viên",
      error: error.message,
    });
  } finally {
    connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

// Hàm tách tên và đơn vị, loại bỏ khoảng trắng thừa
const extractNameAndUnit = (fullName) => {
  if (fullName && fullName.includes(" - ")) {
    const [name, unit] = fullName.split(" - ");
    return { name: name.trim(), unit: unit.trim() };
  }
  return { name: fullName.trim(), unit: "" };
};

const quyDoiSoGioDeTaiDuAn = async (body, MaBang) => {
  const { capDeTai, chuNhiem, thuKy, thanhVien } = body;

  let soGioChuNhiem = 0;
  let soGioThuKy = 0;
  let soGioThanhVien = [];

  try {
    const connection = await createPoolConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM quydinhsogionckh WHERE CapDeTaiDuAn = ? AND MaBang = ?`,
      [capDeTai, MaBang]
    );

    if (rows.length > 0) {
      const data = rows[0];

      if (chuNhiem) {
        soGioChuNhiem = parseFloat(data.ChuNhiem) || 0;
      }

      if (thuKy) {
        soGioThuKy = parseFloat(data.ThuKy) || 0;
      }

      if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
        const gioThanhVien =
          (parseFloat(data.ThanhVien) || 0) / thanhVien.length;
        soGioThanhVien = thanhVien.map(() =>
          gioThanhVien.toFixed(2).replace(",", ".")
        );
      }
    } else {
      throw new Error("Không tìm thấy dữ liệu quy đổi cho cấp đề tài này.");
    }

    connection.release();

    if (chuNhiem) {
      const { name, unit } = extractNameAndUnit(chuNhiem);
      body.chuNhiem = `${name} (${unit} - ${soGioChuNhiem
        .toFixed(2)
        .replace(",", ".")} giờ)`.trim();
    }

    if (thuKy) {
      const { name, unit } = extractNameAndUnit(thuKy);
      body.thuKy = `${name} (${unit} - ${soGioThuKy
        .toFixed(2)
        .replace(",", ".")} giờ)`.trim();
    }

    if (thanhVien && Array.isArray(thanhVien)) {
      body.thanhVien = thanhVien
        .map((member, index) => {
          const { name, unit } = extractNameAndUnit(member);
          return `${name} (${unit} - ${soGioThanhVien[index]} giờ)`.trim();
        })
        .join(", ");
    }

    return body;
  } catch (error) {
    console.error("Lỗi khi quy đổi số giờ:", error);
    throw error;
  }
};

// Thêm đề tài dự án
const saveDeTaiDuAn = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  const data = await quyDoiSoGioDeTaiDuAn(req.body, "detaiduan");
  // Lấy dữ liệu từ body
  const {
    capDeTai,
    namHoc,
    tenDeTai,
    maDeTai,
    chuNhiem,
    thuKy,
    ngayNghiemThu,
    khoa,
    thanhVien, // Đây là một mảng từ client
    ketQua,
  } = data;

  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng detaiduan
    await connection.execute(
      `
INSERT INTO detaiduan (
CapDeTai, NamHoc, TenDeTai, MaSoDeTai, ChuNhiem, ThuKy, NgayNghiemThu, Khoa, DanhSachThanhVien, KetQua 
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        capDeTai,
        namHoc,
        tenDeTai,
        maDeTai,
        chuNhiem,
        thuKy,
        ngayNghiemThu,
        khoa,
        thanhVien,
        ketQua
      ]
    );

    // Ghi log thêm đề tài mới
    try {
      const logMessage = `Thêm đề tài dự án "${tenDeTai}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm đề tài "${tenDeTai}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm đề tài:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }

    // Trả về phản hồi thành công cho client
    console.log("Thêm đề tài dự án thành công");
    res.status(200).json({
      success: true,
      message: "Thêm đề tài, dự án thành công!",
    });
  } catch (error) {
    console.error("Error while saving project data:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm đề tài, dự án.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

const getTableBaiBaoKhoaHoc = async (req, res) => {
  const { NamHoc, Khoa } = req.params;
  console.log(`Lấy dữ liệu bảng baibaokhoahoc Năm: ${NamHoc} Khoa: ${Khoa}`);

  let connection;
  try {
    connection = await createPoolConnection();

    let query = `SELECT * FROM baibaokhoahoc WHERE NamHoc = ?`;
    const [results] = await connection.execute(query, [NamHoc]);

    if (Khoa === "ALL") {
      res.json(results);
    } else {
      const filteredResults = [];

      for (let item of results) {
        const namesToCheck = [];

        // Xử lý các trường TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien
        ["TacGia", "TacGiaChiuTrachNhiem"].forEach((key) => {
          if (item[key]) {
            const name = item[key].replace(/\s*\([^)]*\)/g, "").trim();
            namesToCheck.push(name);
          }
        });

        if (item["DanhSachThanhVien"]) {
          const members = item["DanhSachThanhVien"]
            .split(",")
            .map((name) => name.trim().replace(/\s*\([^)]*\)/g, ""));
          namesToCheck.push(...members);
        }

        const uniqueNames = [...new Set(namesToCheck)];

        // Truy vấn bảng nhanvien để lấy MaPhongBan cho các tên
        const placeholders = uniqueNames.map(() => "?").join(", ");
        const nameQuery = `SELECT TenNhanVien, MaPhongBan FROM nhanvien WHERE TenNhanVien IN (${placeholders})`;

        const [employeeResults] =
          uniqueNames.length > 0
            ? await connection.execute(nameQuery, uniqueNames)
            : [[]];

        const departmentCodes = employeeResults.map((emp) => emp.MaPhongBan);

        if (departmentCodes.some((code) => code && code.includes(Khoa))) {
          filteredResults.push(item);
        }
      }

      res.json(filteredResults);
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTableBaiBaoKhoaHoc:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release();
  }
};

const quyDoiSoGioBaiBaoKhoaHoc = async (body, MaBang) => {
  const { loaiTapChi, tacGia, tacGiaCtn, danhSachThanhVien } = body;

  let SoGio = 0; // Số giờ lấy từ cơ sở dữ liệu
  let SoGioTacGia = 0;
  let SoGioTacGiaCtn = 0;
  let SoGioThanhVien = [];
  let connection;

  // Hàm định dạng số giờ: làm tròn đến 2 chữ số thập phân và đảm bảo sử dụng dấu chấm
  const formatHours = (num) => num.toFixed(2).replace(/,/g, ".");

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Truy vấn số giờ từ cơ sở dữ liệu
    const [rows] = await connection.execute(
      `SELECT SoGio FROM quydinhsogionckh WHERE LoaiTapChi = ? AND MaBang = ?`,
      [loaiTapChi, MaBang]
    );

    if (rows.length > 0) {
      // Chuyển giá trị lấy về thành chuỗi, thay dấu phẩy bằng dấu chấm, sau đó parseFloat
      SoGio = parseFloat(String(rows[0].SoGio).replace(/,/g, ".")) || 0;
    } else {
      throw new Error("Không tìm thấy thông tin số giờ cho loại tạp chí này.");
    }

    // Xử lý quy đổi số giờ dựa trên các trường hợp:
    // Trường hợp chỉ có tác giả chính
    if (tacGia && !tacGiaCtn && !danhSachThanhVien) {
      SoGioTacGia = SoGio;
    }
    // Trường hợp có tác giả chính, tác giả chịu trách nhiệm và thành viên
    else if (
      tacGia &&
      tacGiaCtn &&
      danhSachThanhVien &&
      Array.isArray(danhSachThanhVien) &&
      danhSachThanhVien.length > 0
    ) {
      let totalParticipants = 2 + danhSachThanhVien.length; // Tác giả chính + tác giả chịu trách nhiệm + các thành viên

      SoGioTacGia = SoGio * 0.2;
      SoGioTacGiaCtn = SoGio * 0.2;

      let SoGioPerMember = (SoGio * 0.6) / totalParticipants;
      SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);

      // Cộng thêm phần chia cho các thành viên cho tác giả chính và tác giả chịu trách nhiệm
      SoGioTacGia += SoGioPerMember;
      SoGioTacGiaCtn += SoGioPerMember;
    }
    // Trường hợp có tác giả chính và thành viên, không có tác giả chịu trách nhiệm
    else if (
      tacGia &&
      !tacGiaCtn &&
      danhSachThanhVien &&
      Array.isArray(danhSachThanhVien) &&
      danhSachThanhVien.length > 0
    ) {
      SoGioTacGia = SoGio * 0.4;
      let SoGioPerMember = (SoGio * 0.6) / (danhSachThanhVien.length + 1);

      SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);
      SoGioTacGia += SoGioPerMember;
    }

    // Làm tròn số giờ đến 2 chữ số sau dấu phẩy (dưới dạng số)
    SoGioTacGia = parseFloat(SoGioTacGia.toFixed(2));
    SoGioTacGiaCtn = parseFloat(SoGioTacGiaCtn.toFixed(2));
    SoGioThanhVien = SoGioThanhVien.map((soGio) =>
      parseFloat(soGio.toFixed(2))
    );

    // Tách và format thông tin của tác giả chính
    if (tacGia) {
      const { name, unit } = extractNameAndUnit(tacGia);
      body.tacGia = `${name} (${unit} - ${formatHours(
        SoGioTacGia
      )} giờ)`.trim();
    }

    // Tách và format thông tin của tác giả chịu trách nhiệm
    if (tacGiaCtn) {
      const { name, unit } = extractNameAndUnit(tacGiaCtn);
      body.tacGiaCtn = `${name} (${unit} - ${formatHours(
        SoGioTacGiaCtn
      )} giờ)`.trim();
    }

    // Tách và format thông tin của các thành viên
    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
      body.thanhVien = danhSachThanhVien
        .map((member, index) => {
          const { name, unit } = extractNameAndUnit(member);
          return `${name} (${unit} - ${formatHours(
            SoGioThanhVien[index]
          )} giờ)`.trim();
        })
        .join(", ");
    }

    return body;
  } catch (error) {
    console.error("Lỗi khi quy đổi số giờ bài báo khoa học:", error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Thêm bài báo khoa học
const saveBaiBaoKhoaHoc = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  // Lấy dữ liệu từ body
  const {
    namHoc,
    tenBaiBao,
    loaiTapChi,
    chiSoTapChi,
    tacGia,
    tacGiaCtn,
    thanhVien, // Đây là một mảng từ client
    khoa,
  } = req.body;

  // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
  const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

  // Gọi hàm quy đổi số giờ cho bài báo khoa học
  const body = {
    loaiTapChi,
    tacGia,
    tacGiaCtn,
    danhSachThanhVien: thanhVien, // Sử dụng danh sách thành viên dưới dạng mảng
  };

  const updatedBody = await quyDoiSoGioBaiBaoKhoaHoc(body, "baibaokhoahoc"); // Gọi hàm quy đổi
  console.log(updatedBody);
  // Cập nhật lại thông tin từ hàm quy đổi vào body
  const {
    tacGia: tacGiaUpdated,
    tacGiaCtn: tacGiaCtnUpdated,
    thanhVien: thanhVienUpdated,
  } = updatedBody;

  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng baibaokhoahoc
    await connection.execute(
      `
INSERT INTO baibaokhoahoc (
NamHoc, TenBaiBao, LoaiTapChi, ChiSoTapChi, TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien, Khoa
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        namHoc,
        tenBaiBao,
        loaiTapChi,
        chiSoTapChi,
        tacGiaUpdated, // Thông tin tác giả chính đã quy đổi
        tacGiaCtnUpdated, // Thông tin tác giả chịu trách nhiệm đã quy đổi
        thanhVienUpdated, // Thông tin thành viên đã quy đổi
        khoa,
      ]
    );

    // Trả về phản hồi thành công cho client
    console.log("Thêm bài báo khoa học thành công");
    
    // Ghi log thêm bài báo mới
    try {
      const logMessage = `Thêm bài báo khoa học "${tenBaiBao}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm bài báo "${tenBaiBao}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm bài báo:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }
    
    res.status(200).json({
      success: true,
      message: "Thêm bài báo khoa học thành công!",
    });
  } catch (error) {
    console.error("Error while saving research paper data:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm bài báo khoa học.",
      error: error.message,
    });
  } finally {
    connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

// Thêm bằng sáng chế và giải thưởng
const saveBangSangCheVaGiaiThuong = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  // Lấy dữ liệu từ body
  const {
    phanLoai, // Phân loại
    namHoc,
    tenBangSangCheVaGiaiThuong, // Tên bằng sáng chế / giải thưởng
    SoQDCongNhan, // Số quyết định công nhận
    NgayQDCongNhan, // Ngày quyết định công nhận
    tacGia,
    thanhVien, // Đây là một mảng từ client
    khoa,
  } = req.body;

  // Gọi hàm quy đổi
  const quyDoiResult = await quyDoiSoGioBangSangCheVaGiaiThuong(
    {
      loaiBangSangChe: phanLoai,
      tacGia,
      danhSachThanhVien: thanhVien,
    },
    "bangsangchevagiaithuong"
  );

  // Lấy kết quả sau khi quy đổi
  const tacGiaFormatted = quyDoiResult.tacGia || "";
  const thanhVienFormatted = quyDoiResult.thanhVien || "";

  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng bangsangchevagiaithuong
    await connection.execute(
      `
INSERT INTO bangsangchevagiaithuong (
PhanLoai, NamHoc, TenBangSangCheVaGiaiThuong, SoQDCongNhan, NgayQDCongNhan, TacGia, DanhSachThanhVien, Khoa
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        phanLoai, // Phân loại
        namHoc,
        tenBangSangCheVaGiaiThuong, // Tên bằng sáng chế / giải thưởng
        SoQDCongNhan, // Số quyết định công nhận
        NgayQDCongNhan, // Ngày quyết định công nhận
        tacGiaFormatted, // Tác giả đã được format
        thanhVienFormatted, // Danh sách thành viên đã được format
        khoa,
      ]
    );

    // Ghi log thêm bằng sáng chế/giải thưởng mới
    try {
      const logMessage = `Thêm bằng sáng chế/giải thưởng "${tenBangSangCheVaGiaiThuong}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm bằng sáng chế/giải thưởng "${tenBangSangCheVaGiaiThuong}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm bằng sáng chế/giải thưởng:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }

    // Trả về phản hồi thành công cho client
    console.log("Thêm bằng sáng chế và giải thưởng thành công");
    res.status(200).json({
      success: true,
      message: "Thêm bằng sáng chế và giải thưởng thành công!",
    });
  } catch (error) {
    console.error("Error while saving research paper data:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm bằng sáng chế và giải thưởng.",
      error: error.message,
    });
  } finally {
    connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

// Lấy bảng đề tài dự án
const getTableBangSangCheVaGiaiThuong = async (req, res) => {
  const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

  console.log("Lấy dữ liệu bảng bangsangchevagiaithuong Năm:", NamHoc);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query;
    const queryParams = [];

    if (Khoa == "ALL") {
      query = `SELECT * FROM bangsangchevagiaithuong WHERE NamHoc = ?`;
      queryParams.push(NamHoc);
    } else {
      query = `SELECT * FROM bangsangchevagiaithuong WHERE NamHoc = ? AND Khoa = ?`;
      queryParams.push(NamHoc, Khoa);
    }

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    // Trả về kết quả dưới dạng JSON
    res.json(results); // results chứa dữ liệu trả về
  } catch (error) {
    console.error("Lỗi trong hàm getDeTaiDuAn:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const quyDoiSoGioBangSangCheVaGiaiThuong = async (body, MaBang) => {
  const { loaiBangSangChe, tacGia, danhSachThanhVien } = body;

  let SoGio = 0;
  let SoGioTacGia = 0;
  let SoGioThanhVien = [];
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Truy vấn số giờ tương ứng với loại bằng sáng chế hoặc giải thưởng từ cơ sở dữ liệu
    const [rows] = await connection.execute(
      `SELECT SoGio FROM quydinhsogionckh WHERE BangSangCheGiaiThuong = ? AND MaBang = ?`,
      [loaiBangSangChe, MaBang]
    );

    // Kiểm tra nếu có dữ liệu trả về và convert giá trị lấy về về định dạng sử dụng dấu chấm
    if (rows.length > 0) {
      SoGio = parseFloat(String(rows[0].SoGio).replace(/,/g, ".")) || 0;
    } else {
      throw new Error(
        "Không tìm thấy thông tin số giờ cho loại bằng sáng chế hoặc giải thưởng này."
      );
    }

    // Nếu có lỗi xảy ra phía dưới, đảm bảo kết nối được đóng lại ở khối finally
    // connection.release();

    // Trường hợp có 1 tác giả chính và không có thành viên
    if (tacGia && !danhSachThanhVien) {
      SoGioTacGia = SoGio;
    }
    // Trường hợp có 1 tác giả chính và có thành viên
    else if (
      tacGia &&
      danhSachThanhVien &&
      Array.isArray(danhSachThanhVien) &&
      danhSachThanhVien.length > 0
    ) {
      let totalParticipants = 1 + danhSachThanhVien.length; // Tổng số người tham gia

      // Tác giả chính nhận 40% số giờ
      SoGioTacGia = parseFloat((SoGio * 0.4).toFixed(2));

      // 60% còn lại chia đều cho tất cả thành viên (kể cả tác giả)
      let SoGioPerMember = parseFloat(
        ((SoGio * 0.6) / totalParticipants).toFixed(2)
      );

      // Gán số giờ cho các thành viên
      SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);

      // Cộng số giờ cho tác giả chính
      SoGioTacGia += SoGioPerMember;
    }

    // Tách và format thông tin của tác giả chính với định dạng số giờ sử dụng dấu chấm
    if (tacGia) {
      const { name, unit } = extractNameAndUnit(tacGia);
      body.tacGia = `${name} (${unit} - ${SoGioTacGia.toFixed(2).replace(
        /,/g,
        "."
      )} giờ)`.trim();
    }

    // Tách và format thông tin của các thành viên với định dạng số giờ sử dụng dấu chấm
    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
      body.thanhVien = danhSachThanhVien
        .map((member, index) => {
          const { name, unit } = extractNameAndUnit(member);
          return `${name} (${unit} - ${SoGioThanhVien[index]
            .toFixed(2)
            .replace(/,/g, ".")} giờ)`.trim();
        })
        .join(", ");
    }

    return body;
  } catch (error) {
    console.error(
      "Lỗi khi quy đổi số giờ bằng sáng chế và giải thưởng:",
      error
    );
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Thêm sách và giáo trình
const saveSachVaGiaoTrinh = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  // Lấy dữ liệu từ body
  const {
    phanLoai,
    namHoc,
    tenSachVaGiaoTrinh, // Tên sách, giáo trình
    soXuatBan, // Số xuất bản
    soTrang, // Số trang
    tacGia,
    dongChuBien,
    thanhVien, // Đây là một mảng từ client
    khoa,
    ketQua,
  } = req.body;
  console.log(req.body);

  // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
  const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

  // Tính toán số giờ quy đổi
  const body = {
    phanLoai,
    tacGia,
    dongChuBien,
    danhSachThanhVien: thanhVien, // Truyền danh sách thành viên từ client
  };

  // Gọi hàm quy đổi
  const quyDoiKetQua = await quyDoiSachVaGiaoTrinh(body, "sachvagiaotrinh");

  // Trích xuất kết quả sau khi quy đổi
  const {
    tacGia: tacGiaFormatted,
    dongChuBien: dongChuBienFormatted,
    thanhVien: thanhVienFormatted,
  } = quyDoiKetQua;
  console.log(quyDoiKetQua);

  // Kết nối với cơ sở dữ liệu
  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng sachvagiaotrinh
    await connection.execute(
      `
INSERT INTO sachvagiaotrinh (
PhanLoai, NamHoc, TenSachVaGiaoTrinh, SoXuatBan, SoTrang, TacGia, DongChuBien, DanhSachThanhVien, Khoa, KetQua
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        phanLoai,
        namHoc,
        tenSachVaGiaoTrinh, // Tên sách, giáo trình
        soXuatBan, // Số xuất bản
        soTrang, // Số trang
        tacGiaFormatted, // Tác giả đã format sau quy đổi
        dongChuBienFormatted, // Tác giả chịu trách nhiệm đã format sau quy đổi
        thanhVienFormatted, // Danh sách thành viên đã format sau quy đổi
        khoa,
        ketQua,
      ]
    );

    // Ghi log thêm sách/giáo trình mới
    try {
      const logMessage = `Thêm sách/giáo trình "${tenSachVaGiaoTrinh}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm sách/giáo trình "${tenSachVaGiaoTrinh}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm sách/giáo trình:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }

    // Trả về phản hồi thành công cho client
    console.log("Thêm sách và giáo trình thành công");
    res.status(200).json({
      success: true,
      message: "Thêm sách và giáo trình thành công!",
    });
  } catch (error) {
    console.error("Error while saving data to sachvagiaotrinh:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm sách và giáo trình.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

const quyDoiSachVaGiaoTrinh = async (body, MaBang) => {
  const { phanLoai, tacGia, dongChuBien, danhSachThanhVien } = body;

  let soGio = 0;
  let soGioTacGia = 0;
  let soGioDongChuBien = 0;
  let soGioThanhVien = [];

  // Hàm định dạng số giờ: ép về chuỗi với 2 số thập phân và đảm bảo sử dụng dấu chấm
  const formatHour = (num) => {
    return num.toFixed(2).replace(",", ".");
  };
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Truy vấn số giờ từ cơ sở dữ liệu
    const [rows] = await connection.execute(
      `SELECT SoGio FROM quydinhsogionckh WHERE SachGiaoTrinh = ? AND MaBang = ?`,
      [phanLoai, MaBang]
    );

    // Kiểm tra nếu có dữ liệu trả về
    if (rows.length > 0) {
      // Nếu SoGio có chứa dấu phẩy, thay thế bằng dấu chấm trước khi ép kiểu
      soGio = parseFloat(String(rows[0].SoGio).replace(",", ".")) || 0;
    } else {
      throw new Error(
        "Không tìm thấy thông tin số giờ cho loại sách/giáo trình này."
      );
    }

    // Trường hợp có 1 tác giả chính và không có đồng chủ biên và thành viên
    if (tacGia && !dongChuBien && !danhSachThanhVien) {
      soGioTacGia = soGio;
    }
    // Trường hợp có 1 tác giả chính, 1 đồng chủ biên và có thành viên
    else if (
      tacGia &&
      dongChuBien &&
      danhSachThanhVien &&
      Array.isArray(danhSachThanhVien) &&
      danhSachThanhVien.length > 0
    ) {
      let totalParticipants = 2 + danhSachThanhVien.length;

      // Tác giả chính và đồng chủ biên nhận mỗi người 20% số giờ ban đầu
      soGioTacGia = parseFloat((soGio * 0.2).toFixed(2));
      soGioDongChuBien = parseFloat((soGio * 0.2).toFixed(2));

      // 60% số giờ còn lại chia đều cho tất cả (bao gồm cả tác giả chính và đồng chủ biên)
      let soGioPerMember = parseFloat(
        ((soGio * 0.6) / totalParticipants).toFixed(2)
      );

      // Gán số giờ cho thành viên
      soGioThanhVien = Array(danhSachThanhVien.length).fill(soGioPerMember);

      // Cộng thêm số giờ từ phần chia đều cho tác giả chính và đồng chủ biên
      soGioTacGia += soGioPerMember;
      soGioDongChuBien += soGioPerMember;
    }
    // Trường hợp có 1 tác giả chính, không có đồng chủ biên nhưng có thành viên
    else if (
      tacGia &&
      !dongChuBien &&
      danhSachThanhVien &&
      Array.isArray(danhSachThanhVien) &&
      danhSachThanhVien.length > 0
    ) {
      soGioTacGia = parseFloat((soGio * 0.4).toFixed(2));

      // 60% số giờ còn lại chia đều cho tất cả (bao gồm cả tác giả chính)
      let soGioPerMember = parseFloat(
        ((soGio * 0.6) / (danhSachThanhVien.length + 1)).toFixed(2)
      );

      // Gán số giờ cho thành viên
      soGioThanhVien = Array(danhSachThanhVien.length).fill(soGioPerMember);

      // Cộng thêm số giờ cho tác giả chính
      soGioTacGia += soGioPerMember;
    }

    // Tách và format thông tin của tác giả chính
    if (tacGia) {
      const { name, unit } = extractNameAndUnit(tacGia);
      body.tacGia = `${name} (${unit} - ${formatHour(soGioTacGia)} giờ)`.trim();
    }

    // Tách và format thông tin của đồng chủ biên
    if (dongChuBien) {
      const { name, unit } = extractNameAndUnit(dongChuBien);
      body.dongChuBien = `${name} (${unit} - ${formatHour(
        soGioDongChuBien
      )} giờ)`.trim();
    }

    // Tách và format thông tin của thành viên
    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
      body.thanhVien = danhSachThanhVien
        .map((member, index) => {
          const { name, unit } = extractNameAndUnit(member);
          return `${name} (${unit} - ${formatHour(
            soGioThanhVien[index]
          )} giờ)`.trim();
        })
        .join(", ");
    }

    return body;
  } catch (error) {
    console.error("Lỗi khi quy đổi số giờ sách và giáo trình:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Lấy bảng sách và giáo trình
// const getTableSachVaGiaoTrinh = async (req, res) => {

//     const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

//     console.log("Lấy dữ liệu bảng sachvagiaotrinh Năm:", NamHoc);

//     let connection;
//     try {
//         connection = await createPoolConnection(); // Lấy kết nối từ pool

//         let query;
//         let queryParams = [];

//         // Truy vấn dữ liệu từ bảng sachvagiaotrinh
//         if (Khoa == "ALL") {
//             query = `SELECT * FROM sachvagiaotrinh WHERE NamHoc = ?`;
//             queryParams.push(NamHoc);
//         } else {
//             query = `SELECT * FROM sachvagiaotrinh WHERE NamHoc = ? AND Khoa = ?`;
//             queryParams.push(NamHoc, Khoa);
//         }

//         // Thực hiện truy vấn
//         const [results] = await connection.execute(query, queryParams);

//         // Trả về kết quả dưới dạng JSON
//         res.json(results); // results chứa dữ liệu trả về
//     } catch (error) {
//         console.error("Lỗi trong hàm getTableSachVaGiaoTrinh:", error);
//         res
//             .status(500)
//             .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
//     } finally {
//         if (connection) connection.release(); // Trả lại kết nối cho pool
//     }
// };
const getTableSachVaGiaoTrinh = async (req, res) => {
  const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter
  console.log(`Lấy dữ liệu bảng sachvagiaotrinh Năm: ${NamHoc} Khoa: ${Khoa}`);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Truy vấn dữ liệu ban đầu từ bảng sachvagiaotrinh
    let query = `SELECT * FROM sachvagiaotrinh WHERE NamHoc = ?`;
    const [results] = await connection.execute(query, [NamHoc]);

    if (Khoa === "ALL") {
      // Nếu Khoa là "ALL", trả về tất cả các kết quả
      res.json(results);
    } else {
      const filteredResults = [];

      // Duyệt qua tất cả các kết quả
      for (let item of results) {
        const namesToCheck = [];

        // Xử lý các trường TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien
        ["TacGia", "DongChuBien"].forEach((key) => {
          if (item[key]) {
            const name = item[key].replace(/\s*\([^)]*\)/g, "").trim();
            namesToCheck.push(name);
          }
        });

        if (item["DanhSachThanhVien"]) {
          const members = item["DanhSachThanhVien"]
            .split(",") // Tách danh sách thành viên
            .map((name) => name.trim().replace(/\s*\([^)]*\)/g, "")); // Loại bỏ phần trong dấu ngoặc
          namesToCheck.push(...members);
        }

        const uniqueNames = [...new Set(namesToCheck)]; // Lọc các tên duy nhất

        // Truy vấn bảng nhanvien để lấy MaPhongBan cho các tên
        const placeholders = uniqueNames.map(() => "?").join(", ");
        const nameQuery = `SELECT TenNhanVien, MaPhongBan FROM nhanvien WHERE TenNhanVien IN (${placeholders})`;

        const [employeeResults] =
          uniqueNames.length > 0
            ? await connection.execute(nameQuery, uniqueNames)
            : [[]]; // Nếu không có tên để kiểm tra, trả về mảng trống

        const departmentCodes = employeeResults.map((emp) => emp.MaPhongBan);

        // Kiểm tra xem mã phòng ban có chứa Khoa hay không
        if (departmentCodes.some((code) => code && code.includes(Khoa))) {
          filteredResults.push(item); // Thêm vào kết quả đã lọc
        }
      }

      // Trả về kết quả đã lọc
      res.json(filteredResults);
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTableSachVaGiaoTrinh:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const saveNckhVaHuanLuyenDoiTuyen = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  // Lấy dữ liệu từ body
  const {
    phanLoai, // Phân loại
    namHoc,
    tenDeTai, // Tên đề tài
    soQDGiaoNhiemVu, // Số quyết định công nhận
    ngayQDGiaoNhiemVu, // Ngày quyết định công nhận
    thanhVien, // Đây là một mảng từ client
    khoa,
    ketQua,
  } = req.body;

  // Gọi hàm quy đổi
  const quyDoiResult = await quyDoiSoGioNckhVaHuanLuyen(
    {
      phanLoai,
      danhSachThanhVien: thanhVien,
    },
    "nckhvahuanluyendoituyen"
  );

  // Lấy kết quả sau khi quy đổi
  const thanhVienFormatted = quyDoiResult.thanhVien || "";

  // console.log(thanhVienFormatted);

  // Xác định cột kết quả dựa vào phanLoai
  let ketQuaCapKhoa = null;
  let ketQuaCapHocVien = null;

  if (phanLoai.toLowerCase().includes("khoa")) {
    ketQuaCapKhoa = ketQua;
  } else if (phanLoai.toLowerCase().includes("học viện")) {
    ketQuaCapHocVien = ketQua;
  } else {
    ketQuaCapHocVien = ketQua; // Mặc định chèn vào KetQuaCapHocVien
  }
  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng NCKH và huấn luyện đội tuyển
    await connection.execute(
      `
INSERT INTO nckhvahuanluyendoituyen (
PhanLoai, NamHoc, TenDeTai, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, DanhSachThanhVien, Khoa, KetQuaCapKhoa, KetQuaCapHocVien 
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        phanLoai, // Phân loại
        namHoc,
        tenDeTai, // Tên đề tài
        soQDGiaoNhiemVu, // Số quyết định công nhận
        ngayQDGiaoNhiemVu, // Ngày quyết định công nhận
        thanhVienFormatted, // Danh sách thành viên đã được format
        khoa,
        ketQuaCapKhoa,
        ketQuaCapHocVien
      ]
    );

    // Ghi log thêm NCKH và huấn luyện đội tuyển mới
    try {
      const logMessage = `Thêm đề tài NCKH/huấn luyện "${tenDeTai}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm đề tài NCKH/huấn luyện "${tenDeTai}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm đề tài NCKH/huấn luyện:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }

    // Trả về phản hồi thành công cho client
    console.log("Thêm NCKH và huấn luyện đội tuyển thành công");
    res.status(200).json({
      success: true,
      message: "Thêm NCKH và huấn luyện đội tuyển thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu NCKH và huấn luyện đội tuyển:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm NCKH và huấn luyện đội tuyển.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const quyDoiSoGioNckhVaHuanLuyen = async (body, MaBang) => {
  const { phanLoai, danhSachThanhVien } = body;

  let totalHours = 0; // Số giờ quy đổi từ cơ sở dữ liệu
  let thanhVienResult = "";

  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Truy vấn số giờ tương ứng với loại NCKH và Huấn luyện từ cơ sở dữ liệu
    const [rows] = await connection.execute(
      `SELECT SoGio FROM quydinhsogionckh WHERE NCKHHuanLuyenDoiTuyen = ? AND MaBang = ?`,
      [phanLoai, MaBang]
    );

    // Kiểm tra nếu có dữ liệu trả về
    if (rows.length > 0) {
      totalHours = parseFloat(rows[0].SoGio.toString().replace(",", ".")) || 0; // Chuyển đổi số giờ
    } else {
      throw new Error(
        "Không tìm thấy thông tin số giờ cho loại NCKH và Huấn luyện này."
      );
    }

    // Tổng số người tham gia (danh sách thành viên)
    const participants = Array.isArray(danhSachThanhVien)
      ? danhSachThanhVien
      : [];

    // Tính số giờ chia đều cho các thành viên, làm tròn đến 2 chữ số
    const hoursPerMember =
      participants.length > 0
        ? parseFloat((totalHours / participants.length).toFixed(2))
        : 0;

    // Xử lý format đầu ra
    participants.forEach((participant, index) => {
      // Tách tên và đơn vị
      let name = participant;
      let unit = "";
      if (participant.includes(" - ")) {
        const split = participant.split(" - ");
        name = split[0].trim();
        unit = split[1].trim();
      }

      // Chuyển đổi số giờ về chuỗi có dấu `.`
      const formattedHours = hoursPerMember.toFixed(2).replace(",", ".");
      const formatted = `${name} (${unit} - ${formattedHours} giờ)`;

      // Gán vào danh sách thành viên
      thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
    });

    // Kết quả cuối cùng
    return {
      thanhVien: thanhVienResult || null,
    };
  } catch (error) {
    console.error("Lỗi khi quy đổi số giờ NCKH và Huấn luyện:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

// Lấy bảng nckh và huấn luyện đội tuyển
// const getTableNckhVaHuanLuyenDoiTuyen = async (req, res) => {

//     const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

//     console.log("Lấy dữ liệu bảng nckhvahuanluyendoituyen Năm:", NamHoc);

//     let connection;
//     try {
//         connection = await createPoolConnection(); // Lấy kết nối từ pool

//         let query;
//         let queryParams = [];

//         // Truy vấn dữ liệu từ bảng nckhvahuanluyendoituyen
//         if (Khoa == "ALL") {
//             query = `SELECT * FROM nckhvahuanluyendoituyen WHERE NamHoc = ?`;
//             queryParams.push(NamHoc);
//         } else {
//             query = `SELECT * FROM nckhvahuanluyendoituyen WHERE NamHoc = ? AND Khoa = ?`;
//             queryParams.push(NamHoc, Khoa);
//         }

//         // Thực hiện truy vấn
//         const [results] = await connection.execute(query, queryParams);

//         // Trả về kết quả dưới dạng JSON
//         res.json(results); // results chứa dữ liệu trả về
//     } catch (error) {
//         console.error("Lỗi trong hàm getTableNckhVaHuanLuyenDoiTuyen:", error);
//         res
//             .status(500)
//             .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
//     } finally {
//         if (connection) connection.release(); // Trả lại kết nối cho pool
//     }
// };
const getTableNckhVaHuanLuyenDoiTuyen = async (req, res) => {
  const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter
  console.log(
    `Lấy dữ liệu bảng nckhvahuanluyendoituyen Năm: ${NamHoc} Khoa: ${Khoa}`
  );

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Truy vấn dữ liệu ban đầu từ bảng nckhvahuanluyendoituyen
    let query = `SELECT * FROM nckhvahuanluyendoituyen WHERE NamHoc = ?`;
    const [results] = await connection.execute(query, [NamHoc]);

    if (Khoa === "ALL") {
      // Nếu Khoa là "ALL", trả về tất cả các kết quả
      res.json(results);
    } else {
      const filteredResults = [];

      // Duyệt qua tất cả các kết quả
      for (let item of results) {
        const namesToCheck = [];

        // Xử lý các trường TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien
        // ['TacGia', 'TacGiaChiuTrachNhiem'].forEach((key) => {
        //     if (item[key]) {
        //         const name = item[key].replace(/\s*\([^)]*\)/g, ''); // Loại bỏ phần trong dấu ngoặc
        //         namesToCheck.push(name);
        //     }
        // });

        if (item["DanhSachThanhVien"]) {
          const members = item["DanhSachThanhVien"]
            .split(",") // Tách danh sách thành viên
            .map((name) => name.trim().replace(/\s*\([^)]*\)/g, "")); // Loại bỏ phần trong dấu ngoặc
          namesToCheck.push(...members);
        }

        const uniqueNames = [...new Set(namesToCheck)]; // Lọc các tên duy nhất

        // Truy vấn bảng nhanvien để lấy MaPhongBan cho các tên
        const placeholders = uniqueNames.map(() => "?").join(", ");
        const nameQuery = `SELECT TenNhanVien, MaPhongBan FROM nhanvien WHERE TenNhanVien IN (${placeholders})`;

        const [employeeResults] =
          uniqueNames.length > 0
            ? await connection.execute(nameQuery, uniqueNames)
            : [[]]; // Nếu không có tên để kiểm tra, trả về mảng trống

        const departmentCodes = employeeResults.map((emp) => emp.MaPhongBan);

        // Kiểm tra xem mã phòng ban có chứa Khoa hay không
        if (departmentCodes.some((code) => code && code.includes(Khoa))) {
          filteredResults.push(item); // Thêm vào kết quả đã lọc
        }
      }

      // Trả về kết quả đã lọc
      res.json(filteredResults);
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTableNckhVaHuanLuyenDoiTuyen:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const saveXayDungCTDT = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  // Lấy dữ liệu từ body
  const {
    phanLoai, // Phân loại
    namHoc,
    tenChuongTrinh, // Tên chương trình
    soQDGiaoNhiemVu, // Số quyết định giao nhiệm vụ
    ngayQDGiaoNhiemVu, // Ngày quyết định giao nhiệm vụ
    soTC,
    thanhVien, // Đây là một mảng từ client
    khoa,
    ketQua
  } = req.body;

  // Gọi hàm quy đổi
  const quyDoiResult = await quyDoiSoGioXayDungChuongTrinhDaoTao(
    {
      phanLoai,
      danhSachThanhVien: thanhVien,
      soTC,
    },
    "xaydungctdt"
  );

  // Lấy kết quả sau khi quy đổi
  const thanhVienFormatted = quyDoiResult.thanhVien || "";

  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng xaydungctdt
    await connection.execute(
      `
INSERT INTO xaydungctdt (
HinhThucXayDung, NamHoc, TenChuongTrinh, SoTC, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, DanhSachThanhVien, Khoa, KetQua
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        phanLoai, // Phân loại
        namHoc,
        tenChuongTrinh, // Tên chương trình
        soTC,
        soQDGiaoNhiemVu, // Số quyết định giao nhiệm vụ
        ngayQDGiaoNhiemVu, // Ngày quyết định giao nhiệm vụ
        thanhVienFormatted, // Danh sách thành viên đã được format
        khoa,
        ketQua
      ]
    );

    // Ghi log thêm xây dựng CTĐT mới
    try {
      const logMessage = `Thêm xây dựng CTĐT "${tenChuongTrinh}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm xây dựng CTĐT "${tenChuongTrinh}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm xây dựng CTĐT:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }
    
    // Trả về phản hồi thành công cho client
    console.log("Thêm xây dựng CTĐT thành công");
    res.status(200).json({
      success: true,
      message: "Thêm xây dựng CTĐT thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu xây dựng CTĐT:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm xây dựng CTĐT.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

const quyDoiSoGioXayDungChuongTrinhDaoTao = async (body, MaBang) => {
  const { phanLoai, danhSachThanhVien, soTC } = body;

  // Kiểm tra và xử lý `soTC`, mặc định là 0 nếu không hợp lệ
  const validSoTC =
    Number.isInteger(parseInt(soTC)) && parseInt(soTC) > 0 ? parseInt(soTC) : 0;

  let totalHours = 0;
  let thanhVienResult = "";
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Truy vấn số giờ từ cơ sở dữ liệu
    const [rows] = await connection.execute(
      `SELECT SoGio FROM quydinhsogionckh WHERE XayDungCTDT = ? AND MaBang = ?`,
      [phanLoai, MaBang]
    );

    // Kiểm tra nếu có dữ liệu trả về
    if (rows.length > 0) {
      // Chuyển đổi giá trị SoGio sang số, thay thế dấu phẩy thành dấu chấm
      totalHours = parseFloat(String(rows[0].SoGio).replace(/,/g, ".")) || 0;
    } else {
      throw new Error(
        "Không tìm thấy thông tin số giờ cho loại công việc này."
      );
    }

    // Nếu loại công việc có số tín chỉ hợp lệ, nhân với số giờ quy đổi (không làm tròn)
    if (validSoTC > 0) {
      totalHours = totalHours * validSoTC;
    }

    // Tổng số người tham gia
    const participants =
      danhSachThanhVien && Array.isArray(danhSachThanhVien)
        ? danhSachThanhVien
        : [];

    // Tính số giờ chia đều cho các thành viên (không làm tròn)
    const hoursPerMember =
      participants.length > 0 ? parseFloat((totalHours / participants.length).toFixed(2)) : 0;


    // Xử lý format đầu ra cho từng thành viên
    participants.forEach((participant) => {
      const { name, unit } = extractNameAndUnit(participant);
      const formatted = `${name} (${unit} - ${hoursPerMember} giờ)`;
      thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
    });

    return {
      thanhVien: thanhVienResult || null,
    };
  } catch (error) {
    console.error("Lỗi khi quy đổi số giờ xây dựng chương trình đào tạo:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};


// Lấy bảng xaydungctdt
const getTableXayDungCTDT = async (req, res) => {
  const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

  console.log("Lấy dữ liệu bảng xaydungctdt Năm:", NamHoc);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query;
    let queryParams;

    if (Khoa == "ALL") {
      query = `SELECT * FROM xaydungctdt WHERE NamHoc = ?`; // Truy vấn dữ liệu từ bảng xaydungctdt
      queryParams = [NamHoc];
    } else {
      query = `SELECT * FROM xaydungctdt WHERE NamHoc = ? AND Khoa = ?`; // Truy vấn dữ liệu từ bảng xaydungctdt
      queryParams = [NamHoc, Khoa];
    }

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    // Trả về kết quả dưới dạng JSON
    res.json(results); // results chứa dữ liệu trả về
  } catch (error) {
    console.error("Lỗi trong hàm getTableXayDungCTDT:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const saveBienSoanGiaoTrinhBaiGiang = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  // Lấy dữ liệu từ body
  const {
    phanLoai, // Phân loại
    namHoc,
    tenGiaoTrinhBaiGiang, // Tên chương trình
    soQDGiaoNhiemVu, // Số quyết định giao nhiệm vụ
    ngayQDGiaoNhiemVu, // Ngày quyết định giao nhiệm vụ
    soTC,
    tacGia,
    thanhVien, // Đây là một mảng từ client
    khoa,
    ketQua,
  } = req.body;

  // Gọi hàm quy đổi
  const quyDoiResult = await quyDoiSoGioBienSoanGiaoTrinhBaiGiang(
    {
      phanLoai,
      danhSachThanhVien: thanhVien,
      soTC,
      tacGia,
    },
    "biensoangiaotrinhbaigiang"
  );

  // Lấy kết quả sau khi quy đổi
  const thanhVienFormatted = quyDoiResult.thanhVien || "";
  const tacGiaFormatted = quyDoiResult.tacGia || "";

  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng biensoangiaotrinhbaigiang
    await connection.execute(
      `
INSERT INTO biensoangiaotrinhbaigiang (
PhanLoai, NamHoc, TenGiaoTrinhBaiGiang, SoTC, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, TacGia, DanhSachThanhVien, Khoa, KetQua
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        phanLoai, // Phân loại
        namHoc,
        tenGiaoTrinhBaiGiang, // Tên chương trình
        soTC,
        soQDGiaoNhiemVu, // Số quyết định giao nhiệm vụ
        ngayQDGiaoNhiemVu, // Ngày quyết định giao nhiệm vụ
        tacGiaFormatted, // Tác giả
        thanhVienFormatted, // Danh sách thành viên đã được format
        khoa,
        ketQua,
      ]
    );

    // Ghi log thêm biên soạn giáo trình/bài giảng mới
    try {
      const logMessage = `Thêm biên soạn giáo trình/bài giảng "${tenGiaoTrinhBaiGiang}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm biên soạn giáo trình/bài giảng "${tenGiaoTrinhBaiGiang}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm biên soạn giáo trình/bài giảng:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }
    
    // Trả về phản hồi thành công cho client
    console.log("Thêm biên soạn giáo trình/bài giảng thành công");
    res.status(200).json({
      success: true,
      message: "Thêm biên soạn giáo trình/bài giảng thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu biên soạn giáo trình/bài giảng:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm biên soạn giáo trình/bài giảng.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const quyDoiSoGioBienSoanGiaoTrinhBaiGiang = async (body, MaBang) => {
  const { phanLoai, soTC, tacGia, danhSachThanhVien } = body;

  let totalHours = 0;
  const soTCInt =
    Number.isInteger(parseInt(soTC, 10)) && parseInt(soTC, 10) > 0
      ? parseInt(soTC, 10)
      : 0;

  let connection;
  try {
    connection = await createPoolConnection();
    const [rows] = await connection.execute(
      `SELECT SoGio FROM quydinhsogionckh WHERE BienSoanGiaoTrinhBaiGiang = ? AND MaBang = ?`,
      [phanLoai, MaBang]
    );

    if (rows.length > 0) {
      totalHours = parseFloat(rows[0].SoGio) || 0;
    } else {
      throw new Error(
        "Không tìm thấy thông tin số giờ cho loại công việc này."
      );
    }

    if (soTCInt > 0) {
      totalHours = parseFloat((totalHours * soTCInt).toFixed(2));
    }

    let soTietTacGia = 0;
    let soTietThanhVien = [];

    if (tacGia && (!danhSachThanhVien || danhSachThanhVien.length === 0)) {
      soTietTacGia = totalHours;
    } else if (
      tacGia &&
      danhSachThanhVien &&
      Array.isArray(danhSachThanhVien) &&
      danhSachThanhVien.length > 0
    ) {
      soTietTacGia = parseFloat((totalHours * 0.4).toFixed(2));
      let totalParticipants = 1 + danhSachThanhVien.length;
      let soTietPerMember = parseFloat(
        ((totalHours * 0.6) / totalParticipants).toFixed(2)
      );
      soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);
      soTietTacGia += soTietPerMember;
    }

    if (tacGia) {
      const { name, unit } = extractNameAndUnit(tacGia);
      body.tacGia = `${name} (${unit} - ${soTietTacGia
        .toFixed(2)
        .replace(",", ".")} giờ)`;
    }

    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
      body.thanhVien = danhSachThanhVien
        .map((member, index) => {
          const { name, unit } = extractNameAndUnit(member);
          return `${name} (${unit} - ${soTietThanhVien[index]
            .toFixed(2)
            .replace(",", ".")} giờ)`.trim();
        })
        .join(", ");
    }

    return body;
  } catch (error) {
    console.error(
      "Lỗi khi quy đổi số giờ biên soạn giáo trình/bài giảng:",
      error
    );
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Lấy bảng biensoangiaotrinhbaigiang
// const getTableBienSoanGiaoTrinhBaiGiang = async (req, res) => {
//     const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

//     console.log("Lấy dữ liệu bảng biensoangiaotrinhbaigiang Năm:", NamHoc);

//     let connection;
//     let query;
//     let queryParams;

//     try {
//         connection = await createPoolConnection(); // Lấy kết nối từ pool

//         if (Khoa == "ALL") {
//             query = `SELECT * FROM biensoangiaotrinhbaigiang WHERE NamHoc = ?`; // Truy vấn dữ liệu từ bảng biensoangiaotrinhbaigiang
//             queryParams = [NamHoc];
//         } else {
//             query = `SELECT * FROM biensoangiaotrinhbaigiang WHERE NamHoc = ? AND Khoa = ?`; // Truy vấn dữ liệu từ bảng biensoangiaotrinhbaigiang
//             queryParams = [NamHoc, Khoa];
//         }

//         // Thực hiện truy vấn
//         const [results] = await connection.execute(query, queryParams);

//         // Trả về kết quả dưới dạng JSON
//         res.json(results); // results chứa dữ liệu trả về
//     } catch (error) {
//         console.error("Lỗi trong hàm getTableBienSoanGiaoTrinhBaiGiang:", error);
//         res
//             .status(500)
//             .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
//     } finally {
//         if (connection) connection.release(); // Trả lại kết nối cho pool
//     }
// };

const getTableBienSoanGiaoTrinhBaiGiang = async (req, res) => {
  const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter
  console.log(
    `Lấy dữ liệu bảng biensoangiaotrinhbaigiang Năm: ${NamHoc} Khoa: ${Khoa}`
  );

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Truy vấn dữ liệu ban đầu từ bảng biensoangiaotrinhbaigiang
    let query = `SELECT * FROM biensoangiaotrinhbaigiang WHERE NamHoc = ?`;
    const [results] = await connection.execute(query, [NamHoc]);

    if (Khoa === "ALL") {
      // Nếu Khoa là "ALL", trả về tất cả các kết quả
      res.json(results);
    } else {
      const filteredResults = [];

      // Duyệt qua tất cả các kết quả
      for (let item of results) {
        const namesToCheck = [];

        // Xử lý các trường TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien
        ["TacGia"].forEach((key) => {
          if (item[key]) {
            const name = item[key].replace(/\s*\([^)]*\)/g, "").trim();
            namesToCheck.push(name);
          }
        });

        if (item["DanhSachThanhVien"]) {
          const members = item["DanhSachThanhVien"]
            .split(",") // Tách danh sách thành viên
            .map((name) => name.trim().replace(/\s*\([^)]*\)/g, "")); // Loại bỏ phần trong dấu ngoặc
          namesToCheck.push(...members);
        }

        const uniqueNames = [...new Set(namesToCheck)]; // Lọc các tên duy nhất

        // Truy vấn bảng nhanvien để lấy MaPhongBan cho các tên
        const placeholders = uniqueNames.map(() => "?").join(", ");
        const nameQuery = `SELECT TenNhanVien, MaPhongBan FROM nhanvien WHERE TenNhanVien IN (${placeholders})`;

        const [employeeResults] =
          uniqueNames.length > 0
            ? await connection.execute(nameQuery, uniqueNames)
            : [[]]; // Nếu không có tên để kiểm tra, trả về mảng trống

        const departmentCodes = employeeResults.map((emp) => emp.MaPhongBan);

        // Kiểm tra xem mã phòng ban có chứa Khoa hay không
        if (departmentCodes.some((code) => code && code.includes(Khoa))) {
          filteredResults.push(item); // Thêm vào kết quả đã lọc
        }
      }

      // Trả về kết quả đã lọc
      res.json(filteredResults);
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTableBienSoanGiaoTrinhBaiGiang:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

// Lấy dữ liệu từ bảng quydinhsogionckh để đổ vào các thẻ seclect tương ứng
const getData = async (req, res) => {
  const { MaBang } = req.params; // Lấy năm học từ URL parameter

  console.log("Lấy dữ liệu bảng quydinhsogionckh where MaBang :", MaBang);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query = "";

    if (MaBang == "detaiduan") {
      query = `SELECT CapDeTaiDuAn FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "baibaokhoahoc") {
      query = `SELECT LoaiTapChi FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "bangsangchevagiaithuong") {
      query = `SELECT BangSangCheGiaiThuong FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "sachvagiaotrinh") {
      query = `SELECT SachGiaoTrinh FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "nckhvahuanluyendoituyen") {
      query = `SELECT NCKHHuanLuyenDoiTuyen FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "xaydungctdt") {
      query = `SELECT XayDungCTDT FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "biensoangiaotrinhbaigiang") {
      query = `SELECT BienSoanGiaoTrinhBaiGiang FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "sotietnckhbaoluusangnam") {
      query = `SELECT SoTietNCKHBaoLuuSangNam FROM quydinhsogionckh WHERE MaBang = ?`;
    } else if (MaBang == "nhiemvukhoahoccongnghe") {
      query = `SELECT NhiemVuKhoaHocCongNghe FROM quydinhsogionckh WHERE MaBang = ?`;
    }
    const queryParams = [MaBang];

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    // Trả về kết quả dưới dạng JSON
    res.json(results); // results chứa dữ liệu trả về
  } catch (error) {
    console.error("Lỗi trong hàm getData:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

function convertDateFormat(dateStr) {
  const date = new Date(dateStr);
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // Không dùng UTC
  const dd = String(date.getDate()).padStart(2, "0"); // Không dùng UTC
  const yyyy = date.getFullYear(); // Không dùng UTC
  return `${yyyy}-${mm}-${dd}`;
}

// const editNckh = async (req, res) => {
//   const { ID, MaBang } = req.params;

//   if (!ID) {
//     return res.status(400).json({ message: "Thiếu ID cần cập nhật." });
//   }

//   if (!req.body || Object.keys(req.body).length === 0) {
//     return res
//       .status(400)
//       .json({ message: "Dữ liệu gửi lên bị thiếu hoặc rỗng." });
//   }

//   let data = {};
//   let updateQuery = "";
//   let queryParams = [];

//   switch (MaBang) {
//     case "detaiduan":
//       data = {
//         CapDeTai: req.body.CapDeTai,
//         TenDeTai: req.body.TenDeTai,
//         MaSoDeTai: req.body.MaSoDeTai,
//         ChuNhiem: req.body.ChuNhiem,
//         ThuKy: req.body.ThuKy,
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         NgayNghiemThu: convertDateFormat(req.body.NgayNghiemThu),
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//         KetQua: req.body.KetQua
//       };

//       updateQuery = `
//                 UPDATE detaiduan 
//                 SET CapDeTai = ?, TenDeTai = ?, MaSoDeTai = ?, ChuNhiem = ?, ThuKy = ?, DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
//                 WHERE ID = ?`;

//       queryParams = [
//         data.CapDeTai,
//         data.TenDeTai,
//         data.MaSoDeTai,
//         data.ChuNhiem,
//         data.ThuKy,
//         data.DanhSachThanhVien,
//         data.NgayNghiemThu,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         data.KetQua,
//         ID,
//       ];
//       break;

//     case "baibaokhoahoc":
//       data = {
//         LoaiTapChi: req.body.LoaiTapChi,
//         TenBaiBao: req.body.TenBaiBao,
//         TacGia: req.body.TacGia,
//         TacGiaChiuTrachNhiem: req.body.TacGiaChiuTrachNhiem,
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//       };

//       updateQuery = `
//                 UPDATE baibaokhoahoc 
//                 SET LoaiTapChi = ?, TenBaiBao = ?, TacGia = ?, TacGiaChiuTrachNhiem = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?
//                 WHERE ID = ?`;

//       queryParams = [
//         data.LoaiTapChi,
//         data.TenBaiBao,
//         data.TacGia,
//         data.TacGiaChiuTrachNhiem,
//         data.DanhSachThanhVien,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         ID,
//       ];
//       break;

//     case "bangsangchevagiaithuong":
//       data = {
//         PhanLoai: req.body.PhanLoai,
//         TenBangSangCheVaGiaiThuong: req.body.TenBangSangCheVaGiaiThuong,
//         NgayQDCongNhan: convertDateFormat(req.body.NgayQDCongNhan),
//         SoQDCongNhan: req.body.SoQDCongNhan,
//         TacGia: req.body.TacGia,
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//       };

//       updateQuery = `
//                 UPDATE bangsangchevagiaithuong 
//                 SET PhanLoai = ?, TenBangSangCheVaGiaiThuong = ?, NgayQDCongNhan = ?, SoQDCongNhan = ?, TacGia = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?
//                 WHERE ID = ?`;

//       queryParams = [
//         data.PhanLoai,
//         data.TenBangSangCheVaGiaiThuong,
//         data.NgayQDCongNhan,
//         data.SoQDCongNhan,
//         data.TacGia,
//         data.DanhSachThanhVien,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         ID,
//       ];
//       break;

//     case "biensoangiaotrinhbaigiang":
//       data = {
//         PhanLoai: req.body.PhanLoai,
//         TenGiaoTrinhBaiGiang: req.body.TenGiaoTrinhBaiGiang,
//         SoTC: req.body.SoTC,
//         SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
//         NgayQDGiaoNhiemVu: convertDateFormat(req.body.NgayQDGiaoNhiemVu),
//         TacGia: req.body.TacGia,
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//         KetQua: req.body.KetQua,
//       };

//       updateQuery = `
//                 UPDATE biensoangiaotrinhbaigiang 
//                 SET PhanLoai = ?, TenGiaoTrinhBaiGiang = ?, SoTC = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, TacGia = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
//                 WHERE ID = ?`;

//       queryParams = [
//         data.PhanLoai,
//         data.TenGiaoTrinhBaiGiang,
//         data.SoTC,
//         data.SoQDGiaoNhiemVu,
//         data.NgayQDGiaoNhiemVu,
//         data.TacGia,
//         data.DanhSachThanhVien,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         data.KetQua,
//         ID,
//       ];
//       break;
//     case "nckhvahuanluyendoituyen":
//       data = {
//         PhanLoai: req.body.PhanLoai,
//         TenDeTai: req.body.TenDeTai,
//         SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
//         NgayQDGiaoNhiemVu: convertDateFormat(req.body.NgayQDGiaoNhiemVu),
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//         KetQua: req.body.KetQua
//       };

//       updateQuery = `
//         UPDATE nckhvahuanluyendoituyen 
//         SET PhanLoai = ?, TenDeTai = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ? 
//         WHERE ID = ?`;

//       queryParams = [
//         data.PhanLoai,
//         data.TenDeTai,
//         data.SoQDGiaoNhiemVu,
//         data.NgayQDGiaoNhiemVu,
//         data.DanhSachThanhVien,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         data.KetQua,
//         ID,
//       ];
//       break;
//     case "sachvagiaotrinh":
//       // Giả sử đây là code cập nhật cho sachvagiaotrinh (đã có sẵn)
//       data = {
//         // Các trường dữ liệu của sachvagiaotrinh, ví dụ:
//         PhanLoai: req.body.PhanLoai,
//         TenSachVaGiaoTrinh: req.body.TenSachVaGiaoTrinh,
//         SoXuatBan: req.body.SoXuatBan,
//         SoTrang: req.body.SoTrang,
//         TacGia: req.body.TacGia,
//         DongChuBien: req.body.DongChuBien,
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//         KetQua: req.body.KetQua,
//       };

//       updateQuery = `
//                   UPDATE sachvagiaotrinh
//                   SET PhanLoai = ?, TenSachVaGiaoTrinh = ?, SoXuatBan = ?, SoTrang = ?, TacGia = ?, DongChuBien = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
//                   WHERE ID = ?`;

//       queryParams = [
//         data.PhanLoai,
//         data.TenSachVaGiaoTrinh,
//         data.SoXuatBan,
//         data.SoTrang,
//         data.TacGia,
//         data.DongChuBien,
//         data.DanhSachThanhVien,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         data.KetQua,
//         ID,
//       ];
//       break;
//     case "xaydungctdt":
//       // Code cập nhật cho bảng xaydungctdt
//       data = {
//         HinhThucXayDung: req.body.HinhThucXayDung,
//         TenChuongTrinh: req.body.TenChuongTrinh,
//         SoTC: req.body.SoTC,
//         SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
//         NgayQDGiaoNhiemVu: convertDateFormat(req.body.NgayQDGiaoNhiemVu),
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//         KetQua: req.body.KetQua,
//       };

//       updateQuery = `
//                   UPDATE xaydungctdt
//                   SET HinhThucXayDung = ?, TenChuongTrinh = ?, SoTC = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
//                   WHERE ID = ?`;

//       queryParams = [
//         data.HinhThucXayDung,
//         data.TenChuongTrinh,
//         data.SoTC,
//         data.SoQDGiaoNhiemVu,
//         data.NgayQDGiaoNhiemVu,
//         data.DanhSachThanhVien,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         data.KetQua,
//         ID,
//       ];
//       break;
//     case "sotietnckhbaoluusangnam":
//       // Code cập nhật cho bảng sotietnckhbaoluusangnam
//       data = {
//         TenNhiemVu: req.body.TenNhiemVu,
//         GiangVien: req.body.GiangVien,
//         TongSoTietNCKHTrongNam: req.body.TongSoTietNCKHTrongNam,
//         SoTietVuotDinhMuc: req.body.SoTietVuotDinhMuc,
//         SoTietBaoLuuSangNamSau: req.body.SoTietBaoLuuSangNamSau,
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//       };

//       updateQuery = `
//                   UPDATE sotietnckhbaoluusangnam
//                   SET TenNhiemVu = ?, GiangVien = ?, TongSoTietNCKHTrongNam = ?, SoTietVuotDinhMuc = ?, SoTietBaoLuuSangNamSau = ?, DaoTaoDuyet = ?, Khoa = ?
//                   WHERE ID = ?`;

//       queryParams = [
//         data.TenNhiemVu,
//         data.GiangVien,
//         data.TongSoTietNCKHTrongNam,
//         data.SoTietVuotDinhMuc,
//         data.SoTietBaoLuuSangNamSau,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         ID,
//       ];
//       break;
//     case "nhiemvukhoahoccongnghe":
//       data = {
//         PhanLoai: req.body.PhanLoai,
//         TenNhiemVu: req.body.TenNhiemVu,
//         MaNhiemVu: req.body.MaNhiemVu,
//         ChuNhiem: req.body.ChuNhiem,
//         ThuKy: req.body.ThuKy,
//         DanhSachThanhVien: req.body.DanhSachThanhVien,
//         NgayNghiemThu: convertDateFormat(req.body.NgayNghiemThu),
//         DaoTaoDuyet: req.body.DaoTaoDuyet,
//         Khoa: req.body.Khoa,
//         KetQua: req.body.KetQua
//       };

//       updateQuery = `
//                   UPDATE nhiemvukhoahoccongnghe 
//                   SET PhanLoai = ?, TenNhiemVu = ?, MaNhiemVu = ?, ChuNhiem = ?, ThuKy = ?, DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
//                   WHERE ID = ?`;

//       queryParams = [
//         data.PhanLoai,
//         data.TenNhiemVu,
//         data.MaNhiemVu,
//         data.ChuNhiem,
//         data.ThuKy,
//         data.DanhSachThanhVien,
//         data.NgayNghiemThu,
//         data.DaoTaoDuyet,
//         data.Khoa,
//         data.KetQua,
//         ID,
//       ];
//       break;
//     default:
//       return res.status(400).json({ message: "Loại bảng không hợp lệ." });
//   }

//   const connection = await createPoolConnection();

//   try {
//     const [result] = await connection.execute(updateQuery, queryParams);

//     if (result.affectedRows === 0) {
//       return res
//         .status(404)
//         .json({ message: "Không tìm thấy bản ghi để cập nhật." });
//     }

//     // console.log(`Cập nhật thành công ID: ${ID} trong bảng ${MaBang} với data : ${queryParams}`);
//     res.status(200).json({
//       success: true,
//       message: "Cập nhật thành công!",
//     });
//   } catch (error) {
//     console.error("Lỗi khi cập nhật:", error);
//     res.status(500).json({
//       message: "Có lỗi xảy ra khi cập nhật.",
//       error: error.message,
//     });
//   } finally {
//     if (connection) connection.release();
//   }
// };

const editNckh = async (req, res) => {
  const { ID, MaBang } = req.params;
  const namHoc = req.body.namHoc; // Default năm học nếu không có
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session

  if (!ID) {
    return res.status(400).json({ message: "Thiếu ID cần cập nhật." });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json({ message: "Dữ liệu gửi lên bị thiếu hoặc rỗng." });
  }

  let data = {};
  let updateQuery = "";
  let queryParams = [];
  let danhSachThanhVien = "";
  let chuNhiem = "";
  let thuKy = "";
  let tacGia = "";
  let tacGiaCtn = "";
  let dongChuBien = "";
  let phanBien = "";
  let uyVien = "";
  let oldData = null;
  
  const connection = await createPoolConnection();
  
  try {
    // Lấy dữ liệu cũ dựa vào MaBang
    const [oldRows] = await connection.execute(`SELECT * FROM ${MaBang} WHERE ID = ?`, [ID]);
    if (oldRows.length > 0) {
      oldData = oldRows[0];
    } else {
      return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
    }
    
    switch (MaBang) {
    case "detaiduan":
      data = {
        CapDeTai: req.body.CapDeTai,
        TenDeTai: req.body.TenDeTai,
        MaSoDeTai: req.body.MaSoDeTai,
        ChuNhiem: req.body.ChuNhiem,
        ThuKy: req.body.ThuKy,
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        NgayNghiemThu: convertDateFormat(req.body.NgayNghiemThu),
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
        KetQua: req.body.KetQua
      };
      danhSachThanhVien = data.DanhSachThanhVien;
      chuNhiem = data.ChuNhiem;
      thuKy = data.ThuKy;

      updateQuery = `
                UPDATE detaiduan 
                SET CapDeTai = ?, TenDeTai = ?, MaSoDeTai = ?, ChuNhiem = ?, ThuKy = ?, DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
                WHERE ID = ?`;

      queryParams = [
        data.CapDeTai,
        data.TenDeTai,
        data.MaSoDeTai,
        data.ChuNhiem,
        data.ThuKy,
        data.DanhSachThanhVien,
        data.NgayNghiemThu,
        data.DaoTaoDuyet,
        data.Khoa,
        data.KetQua,
        ID,
      ];
      break;

    case "baibaokhoahoc":
      data = {
        LoaiTapChi: req.body.LoaiTapChi,
        TenBaiBao: req.body.TenBaiBao,
        TacGia: req.body.TacGia,
        TacGiaChiuTrachNhiem: req.body.TacGiaChiuTrachNhiem,
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
      };
      danhSachThanhVien = data.DanhSachThanhVien;
      tacGia = data.TacGia;
      tacGiaCtn = data.TacGiaChiuTrachNhiem;

      updateQuery = `
                UPDATE baibaokhoahoc 
                SET LoaiTapChi = ?, TenBaiBao = ?, TacGia = ?, TacGiaChiuTrachNhiem = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?
                WHERE ID = ?`;

      queryParams = [
        data.LoaiTapChi,
        data.TenBaiBao,
        data.TacGia,
        data.TacGiaChiuTrachNhiem,
        data.DanhSachThanhVien,
        data.DaoTaoDuyet,
        data.Khoa,
        ID,
      ];
      break;

    case "bangsangchevagiaithuong":
      data = {
        PhanLoai: req.body.PhanLoai,
        TenBangSangCheVaGiaiThuong: req.body.TenBangSangCheVaGiaiThuong,
        NgayQDCongNhan: convertDateFormat(req.body.NgayQDCongNhan),
        SoQDCongNhan: req.body.SoQDCongNhan,
        TacGia: req.body.TacGia,
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
      };
      danhSachThanhVien = data.DanhSachThanhVien;
      tacGia = data.TacGia;

      updateQuery = `
                UPDATE bangsangchevagiaithuong 
                SET PhanLoai = ?, TenBangSangCheVaGiaiThuong = ?, NgayQDCongNhan = ?, SoQDCongNhan = ?, TacGia = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?
                WHERE ID = ?`;

      queryParams = [
        data.PhanLoai,
        data.TenBangSangCheVaGiaiThuong,
        data.NgayQDCongNhan,
        data.SoQDCongNhan,
        data.TacGia,
        data.DanhSachThanhVien,
        data.DaoTaoDuyet,
        data.Khoa,
        ID,
      ];
      break;

    case "biensoangiaotrinhbaigiang":
      data = {
        PhanLoai: req.body.PhanLoai,
        TenGiaoTrinhBaiGiang: req.body.TenGiaoTrinhBaiGiang,
        SoTC: req.body.SoTC,
        SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
        NgayQDGiaoNhiemVu: convertDateFormat(req.body.NgayQDGiaoNhiemVu),
        TacGia: req.body.TacGia,
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
        KetQua: req.body.KetQua,
      };
      danhSachThanhVien = data.DanhSachThanhVien;
      tacGia = data.TacGia;

      updateQuery = `
                UPDATE biensoangiaotrinhbaigiang 
                SET PhanLoai = ?, TenGiaoTrinhBaiGiang = ?, SoTC = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, TacGia = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
                WHERE ID = ?`;

      queryParams = [
        data.PhanLoai,
        data.TenGiaoTrinhBaiGiang,
        data.SoTC,
        data.SoQDGiaoNhiemVu,
        data.NgayQDGiaoNhiemVu,
        data.TacGia,
        data.DanhSachThanhVien,
        data.DaoTaoDuyet,
        data.Khoa,
        data.KetQua,
        ID,
      ];
      break;
    case "nckhvahuanluyendoituyen":
      data = {
        PhanLoai: req.body.PhanLoai,
        TenDeTai: req.body.TenDeTai,
        SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
        NgayQDGiaoNhiemVu: convertDateFormat(req.body.NgayQDGiaoNhiemVu),
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
        KetQua: req.body.KetQua
      };
      danhSachThanhVien = data.DanhSachThanhVien;

      updateQuery = `
        UPDATE nckhvahuanluyendoituyen 
        SET PhanLoai = ?, TenDeTai = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ? 
        WHERE ID = ?`;

      queryParams = [
        data.PhanLoai,
        data.TenDeTai,
        data.SoQDGiaoNhiemVu,
        data.NgayQDGiaoNhiemVu,
        data.DanhSachThanhVien,
        data.DaoTaoDuyet,
        data.Khoa,
        data.KetQua,
        ID,
      ];
      break;
    case "sachvagiaotrinh":
      data = {
        PhanLoai: req.body.PhanLoai,
        TenSachVaGiaoTrinh: req.body.TenSachVaGiaoTrinh,
        SoXuatBan: req.body.SoXuatBan,
        SoTrang: req.body.SoTrang,
        TacGia: req.body.TacGia,
        DongChuBien: req.body.DongChuBien,
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
        KetQua: req.body.KetQua,
      };
      danhSachThanhVien = data.DanhSachThanhVien;
      tacGia = data.TacGia;
      dongChuBien = data.DongChuBien;

      updateQuery = `
                  UPDATE sachvagiaotrinh
                  SET PhanLoai = ?, TenSachVaGiaoTrinh = ?, SoXuatBan = ?, SoTrang = ?, TacGia = ?, DongChuBien = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
                  WHERE ID = ?`;

      queryParams = [
        data.PhanLoai,
        data.TenSachVaGiaoTrinh,
        data.SoXuatBan,
        data.SoTrang,
        data.TacGia,
        data.DongChuBien,
        data.DanhSachThanhVien,
        data.DaoTaoDuyet,
        data.Khoa,
        data.KetQua,
        ID,
      ];
      break;
    case "xaydungctdt":
      data = {
        HinhThucXayDung: req.body.HinhThucXayDung,
        TenChuongTrinh: req.body.TenChuongTrinh,
        SoTC: req.body.SoTC,
        SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
        NgayQDGiaoNhiemVu: convertDateFormat(req.body.NgayQDGiaoNhiemVu),
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
        KetQua: req.body.KetQua,
      };
      danhSachThanhVien = data.DanhSachThanhVien;

      updateQuery = `
                  UPDATE xaydungctdt
                  SET HinhThucXayDung = ?, TenChuongTrinh = ?, SoTC = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
                  WHERE ID = ?`;

      queryParams = [
        data.HinhThucXayDung,
        data.TenChuongTrinh,
        data.SoTC,
        data.SoQDGiaoNhiemVu,
        data.NgayQDGiaoNhiemVu,
        data.DanhSachThanhVien,
        data.DaoTaoDuyet,
        data.Khoa,
        data.KetQua,
        ID,
      ];
      break;
    case "sotietnckhbaoluusangnam":
      data = {
        TenNhiemVu: req.body.TenNhiemVu,
        GiangVien: req.body.GiangVien,
        TongSoTietNCKHTrongNam: req.body.TongSoTietNCKHTrongNam,
        SoTietVuotDinhMuc: req.body.SoTietVuotDinhMuc,
        SoTietBaoLuuSangNamSau: req.body.SoTietBaoLuuSangNamSau,
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
      };

      updateQuery = `
                  UPDATE sotietnckhbaoluusangnam
                  SET TenNhiemVu = ?, GiangVien = ?, TongSoTietNCKHTrongNam = ?, SoTietVuotDinhMuc = ?, SoTietBaoLuuSangNamSau = ?, DaoTaoDuyet = ?, Khoa = ?
                  WHERE ID = ?`;

      queryParams = [
        data.TenNhiemVu,
        data.GiangVien,
        data.TongSoTietNCKHTrongNam,
        data.SoTietVuotDinhMuc,
        data.SoTietBaoLuuSangNamSau,
        data.DaoTaoDuyet,
        data.Khoa,
        ID,
      ];
      break;
    case "nhiemvukhoahoccongnghe":
      data = {
        PhanLoai: req.body.PhanLoai,
        TenNhiemVu: req.body.TenNhiemVu,
        MaNhiemVu: req.body.MaNhiemVu,
        ChuNhiem: req.body.ChuNhiem,
        ThuKy: req.body.ThuKy,
        DanhSachThanhVien: req.body.DanhSachThanhVien,
        NgayNghiemThu: convertDateFormat(req.body.NgayNghiemThu),
        DaoTaoDuyet: req.body.DaoTaoDuyet,
        Khoa: req.body.Khoa,
        KetQua: req.body.KetQua,
        PhanBien: req.body.PhanBien,
        UyVien: req.body.UyVien
      };
      danhSachThanhVien = data.DanhSachThanhVien;
      chuNhiem = data.ChuNhiem;
      phanBien = data.PhanBien;
      thuKy = data.ThuKy;
      uyVien = data.UyVien;

      updateQuery = `
                  UPDATE nhiemvukhoahoccongnghe 
                  SET PhanLoai = ?, TenNhiemVu = ?, MaNhiemVu = ?, ChuNhiem = ?, ThuKy = ?, DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?
                  WHERE ID = ?`;

      queryParams = [
        data.PhanLoai,
        data.TenNhiemVu,
        data.MaNhiemVu,
        data.ChuNhiem,
        data.ThuKy,
        data.DanhSachThanhVien,
        data.NgayNghiemThu,
        data.DaoTaoDuyet,
        data.Khoa,
        data.KetQua,
        ID,
      ];
      break;
    default:
      return res.status(400).json({ message: "Loại bảng không hợp lệ." });
  }

    // Thực hiện câu truy vấn cập nhật bảng gốc
    const [result] = await connection.execute(updateQuery, queryParams);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bản ghi để cập nhật." });
    }

    // Tạo một Set để theo dõi các giảng viên đã được xử lý tránh trùng lặp
    const processedLecturers = new Set();

    // Hàm trích xuất tên giảng viên từ chuỗi có định dạng "Nguyễn Văn A ( KMA - 10 giờ )"
    const extractLecturerName = (str) => {
      if (!str || typeof str !== 'string') return null;
      const tenMatch = str.match(/^([^(]+)/);
      return tenMatch && tenMatch[1] ? tenMatch[1].trim() : null;
    };

    // Hàm xử lý giảng viên và gọi saveSoTietNCKHBaoLuuSangNam
    const processLecturerIfNeeded = async (lecturerName) => {
      if (lecturerName && !processedLecturers.has(lecturerName)) {
        processedLecturers.add(lecturerName);
        try {
          const result = await saveSoTietNCKHBaoLuuSangNam(lecturerName, namHoc);
          console.log(`${lecturerName}: ${result.message}`);
        } catch (err) {
          console.error(`${lecturerName}: ${err.message}`);
        }
      }
    };

    // Xử lý danh sách có nhiều tên (dạng danh sách được phân tách bởi dấu phẩy)
    const processLecturerList = async (list) => {
      if (list && list.trim() !== "") {
        const lecturers = list.split(",").map(item => item.trim());
        for (const lecturer of lecturers) {
          const lecturerName = extractLecturerName(lecturer);
          await processLecturerIfNeeded(lecturerName);
        }
      }
    };

    // Xử lý từng biến

    // 1. Xử lý các biến dạng danh sách (có nhiều tên)
    await processLecturerList(danhSachThanhVien);
    await processLecturerList(phanBien);
    await processLecturerList(uyVien);

    // 2. Xử lý các biến dạng một tên
    await processLecturerIfNeeded(extractLecturerName(chuNhiem));
    await processLecturerIfNeeded(extractLecturerName(thuKy));
    await processLecturerIfNeeded(extractLecturerName(tacGia));
    await processLecturerIfNeeded(extractLecturerName(tacGiaCtn));
    await processLecturerIfNeeded(extractLecturerName(dongChuBien));

    // Ghi log thay đổi vào bảng lichsunhaplieu nếu có thay đổi về DaoTaoDuyet
    if (oldData && oldData.DaoTaoDuyet !== data.DaoTaoDuyet) {
      try {
        // Chuẩn bị nội dung log tương ứng với loại bảng
        let entityName = '';
        let entityType = '';
        
        switch (MaBang) {
          case "detaiduan":
            entityName = data.TenDeTai;
            entityType = "đề tài dự án";
            break;
          case "baibaokhoahoc":
            entityName = data.TenBaiBao;
            entityType = "bài báo khoa học";
            break;
          case "bangsangchevagiaithuong":
            entityName = data.TenBangSangCheVaGiaiThuong;
            entityType = "bằng sáng chế/giải thưởng";
            break;
          case "biensoangiaotrinhbaigiang":
            entityName = data.TenGiaoTrinhBaiGiang;
            entityType = "biên soạn giáo trình/bài giảng";
            break;
          case "nckhvahuanluyendoituyen":
            entityName = data.TenDeTai;
            entityType = "NCKH/huấn luyện đội tuyển";
            break;
          case "sachvagiaotrinh":
            entityName = data.TenSachVaGiaoTrinh;
            entityType = "sách/giáo trình";
            break;
          case "xaydungctdt":
            entityName = data.TenChuongTrinh;
            entityType = "xây dựng CTĐT";
            break;
          case "nhiemvukhoahoccongnghe":
            entityName = data.TenNhiemVu;
            entityType = "nhiệm vụ khoa học công nghệ";
            break;
          default:
            entityName = `ID:${ID}`;
            entityType = MaBang;
            break;
        }
        
        // Gọi LogService để ghi log thay đổi
        await LogService.logNCKHChange(oldData, data, {
          id: userId,
          name: userName
        });
        
        // Ghi log thay đổi vào lichsunhaplieu
        
        console.log(`Đã ghi log thay đổi trạng thái duyệt ${entityType} "${entityName}"`);
      } catch (logError) {
        console.error("Lỗi khi ghi log thay đổi:", logError);
        // Không cần trả về lỗi, vẫn tiếp tục xử lý
      }
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi cập nhật.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};


const saveSoTietNCKHBaoLuuSangNamAfterDelete = async (ID, MaBang, namHoc) => {
  if (!ID || !MaBang) {
    throw new Error("Thiếu thông tin cần thiết (ID hoặc MaBang)!");
  }

  const connection = await createPoolConnection();

  try {
    // Tìm tất cả giảng viên liên quan đến bản ghi đã xóa dựa trên ID và MaBang
    let queryGetInvolvedLecturers = "";
    let queryParams = [ID];

    switch (MaBang) {
      case "detaiduan":
        queryGetInvolvedLecturers = `
          SELECT ChuNhiem, ThuKy, DanhSachThanhVien 
          FROM detaiduan 
          WHERE ID = ?`;
        break;
      case "baibaokhoahoc":
        queryGetInvolvedLecturers = `
          SELECT TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien 
          FROM baibaokhoahoc 
          WHERE ID = ?`;
        break;
      case "bangsangchevagiaithuong":
        queryGetInvolvedLecturers = `
          SELECT TacGia, DanhSachThanhVien 
          FROM bangsangchevagiaithuong 
          WHERE ID = ?`;
        break;
      case "biensoangiaotrinhbaigiang":
        queryGetInvolvedLecturers = `
          SELECT TacGia, DanhSachThanhVien 
          FROM biensoangiaotrinhbaigiang 
          WHERE ID = ?`;
        break;
      case "nckhvahuanluyendoituyen":
        queryGetInvolvedLecturers = `
          SELECT DanhSachThanhVien 
          FROM nckhvahuanluyendoituyen 
          WHERE ID = ?`;
        break;
      case "sachvagiaotrinh":
        queryGetInvolvedLecturers = `
          SELECT TacGia, DongChuBien, DanhSachThanhVien 
          FROM sachvagiaotrinh 
          WHERE ID = ?`;
        break;
      case "xaydungctdt":
        queryGetInvolvedLecturers = `
          SELECT DanhSachThanhVien 
          FROM xaydungctdt 
          WHERE ID = ?`;
        break;
      case "nhiemvukhoahoccongnghe":
        queryGetInvolvedLecturers = `
          SELECT ChuNhiem, ThuKy, PhanBien, UyVien, DanhSachThanhVien 
          FROM nhiemvukhoahoccongnghe 
          WHERE ID = ?`;
        break;
      case "sotietnckhbaoluusangnam":
        // Nếu bảng bị xóa là sotietnckhbaoluusangnam thì không cần cập nhật gì thêm
        return {
          success: true,
          message: "Không cần cập nhật lại bảng sotietnckhbaoluusangnam vì bảng nguồn đã bị xóa.",
        };
      default:
        throw new Error("Loại bảng không hợp lệ!");
    }

    // Lấy thông tin bản ghi trước khi xóa
    const [recordInfo] = await connection.execute(queryGetInvolvedLecturers, queryParams);

    if (recordInfo.length === 0) {
      // Đã không còn bản ghi nào (đã bị xóa)
      // Tiến hành lấy danh sách tất cả giảng viên trong hệ thống để cập nhật lại
      const [allLecturers] = await connection.execute(
        `SELECT DISTINCT TenNhanVien FROM nhanvien WHERE TenNhanVien IS NOT NULL AND TenNhanVien <> ''`
      );

      // Set để theo dõi các giảng viên đã được xử lý
      const processedLecturers = new Set();

      // Trích xuất tên giảng viên từ chuỗi dạng "Nguyễn Văn A ( KMA - 10 giờ )"
      const extractLecturerName = (str) => {
        if (!str || typeof str !== 'string') return null;
        const tenMatch = str.match(/^([^(]+)/);
        return tenMatch && tenMatch[1] ? tenMatch[1].trim() : null;
      };

      // Cập nhật cho tất cả giảng viên
      for (const lecturer of allLecturers) {
        const lecturerName = lecturer.TenNhanVien;
        if (!processedLecturers.has(lecturerName)) {
          processedLecturers.add(lecturerName);
          await updateLecturerNCKH(connection, lecturerName, namHoc);
        }
      }

      return {
        success: true,
        message: "Đã cập nhật lại bảng sotietnckhbaoluusangnam cho tất cả giảng viên.",
      };
    } else {
      // Bản ghi vẫn còn, chúng ta sẽ lấy tất cả tên giảng viên từ bản ghi này
      const record = recordInfo[0];
      const lecturerSet = new Set();

      // Hàm để trích xuất tên giảng viên từ chuỗi
      const extractLecturerName = (str) => {
        if (!str || typeof str !== 'string') return null;
        const tenMatch = str.match(/^([^(]+)/);
        return tenMatch && tenMatch[1] ? tenMatch[1].trim() : null;
      };

      // Hàm để xử lý danh sách giảng viên
      const processLecturerList = (list) => {
        if (list && list.trim() !== "") {
          const lecturers = list.split(",").map(item => item.trim());
          for (const lecturer of lecturers) {
            const lecturerName = extractLecturerName(lecturer);
            if (lecturerName) {
              lecturerSet.add(lecturerName);
            }
          }
        }
      };

      // Xử lý từng trường có thể chứa tên giảng viên
      Object.keys(record).forEach(field => {
        if (field === 'DanhSachThanhVien' || field === 'PhanBien' || field === 'UyVien') {
          processLecturerList(record[field]);
        } else {
          const lecturerName = extractLecturerName(record[field]);
          if (lecturerName) {
            lecturerSet.add(lecturerName);
          }
        }
      });

      // Cập nhật cho từng giảng viên
      for (const lecturerName of lecturerSet) {
        await updateLecturerNCKH(connection, lecturerName, namHoc);
      }

      return {
        success: true,
        message: `Đã cập nhật lại bảng sotietnckhbaoluusangnam cho ${lecturerSet.size} giảng viên liên quan.`,
      };
    }
  } catch (error) {
    console.error("Lỗi khi xử lý số tiết bảo lưu sau khi xóa:", error);
    throw new Error("Có lỗi xảy ra: " + error.message);
  } finally {
    if (connection) connection.release();
  }
};

// Hàm hỗ trợ để cập nhật thông tin NCKH cho một giảng viên
const updateLecturerNCKH = async (connection, tenGiangVien, namHoc) => {
  try {
    // 1. Lấy mã khoa từ bảng nhân viên
    const [rowsNV] = await connection.execute(
      `SELECT MaPhongBan FROM nhanvien WHERE TenNhanVien = ? LIMIT 1`,
      [tenGiangVien]
    );
    if (rowsNV.length === 0) {
      throw new Error(`Không tìm thấy giảng viên "${tenGiangVien}" trong bảng nhanvien`);
    }
    const khoa = rowsNV[0].MaPhongBan;

    const tenNhiemVu = "Số tiết NCKH bảo lưu";

    // 2. Lấy định mức tiết NCKH
    const [rowsSoTietDinhMuc] = await connection.execute(
      `SELECT NCKH FROM sotietdinhmuc LIMIT 1`
    );
    if (rowsSoTietDinhMuc.length === 0) {
      throw new Error("Không tìm thấy dữ liệu trong bảng sotietdinhmuc");
    }
    const soTietDinhMuc = rowsSoTietDinhMuc[0].NCKH;

    // 3. Tổng hợp tiết NCKH
    const dataTongHop = await tongHopSoTietNckhCuaMotGiangVien2(namHoc, tenGiangVien);
    const tongSoTietNCKH = dataTongHop.total;

    // 4. Tính toán tiết vượt định mức và bảo lưu
    const soTietVuotDinhMuc = Math.max(0, tongSoTietNCKH - soTietDinhMuc);
    const soTietBaoLuuSangNamSau = Math.min(soTietVuotDinhMuc, 85);

    // 5. Kiểm tra xem đã tồn tại bản ghi chưa
    const [existingRows] = await connection.execute(
      `SELECT 1 FROM sotietnckhbaoluusangnam 
       WHERE TenNhiemVu = ? AND NamHoc = ? AND GiangVien = ? 
       LIMIT 1`,
      [tenNhiemVu, namHoc, tenGiangVien]
    );

    if (existingRows.length > 0) {
      // Nếu đã tồn tại => UPDATE
      await connection.execute(
        `UPDATE sotietnckhbaoluusangnam
         SET Khoa = ?, 
             SoTietBaoLuuSangNamSau = ?, 
             TongSoTietNCKHTrongNam = ?, 
             SoTietVuotDinhMuc = ?
         WHERE TenNhiemVu = ? AND NamHoc = ? AND GiangVien = ?`,
        [
          khoa,
          soTietBaoLuuSangNamSau,
          tongSoTietNCKH,
          soTietVuotDinhMuc,
          tenNhiemVu,
          namHoc,
          tenGiangVien
        ]
      );
      console.log(`Cập nhật số tiết bảo lưu cho "${tenGiangVien}" thành công!`);
    } else {
      // Nếu chưa tồn tại => INSERT
      await connection.execute(
        `INSERT INTO sotietnckhbaoluusangnam
           (TenNhiemVu, NamHoc, GiangVien, Khoa, SoTietBaoLuuSangNamSau, TongSoTietNCKHTrongNam, SoTietVuotDinhMuc)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          tenNhiemVu,
          namHoc,
          tenGiangVien,
          khoa,
          soTietBaoLuuSangNamSau,
          tongSoTietNCKH,
          soTietVuotDinhMuc,
        ]
      );
      console.log(`Thêm số tiết bảo lưu cho "${tenGiangVien}" thành công!`);
    }
    return true;
  } catch (error) {
    console.error(`Lỗi khi xử lý số tiết bảo lưu cho "${tenGiangVien}":`, error);
    return false;
  }
};

const deleteNckh = async (req, res) => {
  const { ID, MaBang, namHoc } = req.params;
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session

  if (!ID) {
    return res.status(400).json({ message: "Thiếu ID cần xóa." });
  }

  let deleteQuery = "";
  let queryParams = [];
  let entityName = "";

  // Kết nối đến cơ sở dữ liệu
  const connection = await createPoolConnection();
  
  try {
    // Lấy thông tin bản ghi trước khi xóa để ghi log
    let oldData = null;
    const [oldRows] = await connection.execute(`SELECT * FROM ${MaBang} WHERE ID = ?`, [ID]);
    if (oldRows.length > 0) {
      oldData = oldRows[0];
      // Xác định tên thực thể dựa vào loại bảng
      switch (MaBang) {
        case "detaiduan":
          entityName = oldData.TenDeTai;
          break;
        case "baibaokhoahoc":
          entityName = oldData.TenBaiBao;
          break;
        case "bangsangchevagiaithuong":
          entityName = oldData.TenBangSangCheVaGiaiThuong;
          break;
        case "biensoangiaotrinhbaigiang":
          entityName = oldData.TenGiaoTrinhBaiGiang;
          break;
        case "nckhvahuanluyendoituyen":
          entityName = oldData.TenDeTai;
          break;
        case "sachvagiaotrinh":
          entityName = oldData.TenSachVaGiaoTrinh;
          break;
        case "xaydungctdt":
          entityName = oldData.TenChuongTrinh;
          break;
        case "sotietnckhbaoluusangnam":
          entityName = `Số tiết NCKH bảo lưu ID:${ID}`;
          break;
        case "nhiemvukhoahoccongnghe":
          entityName = oldData.TenNhiemVu;
          break;
        default:
          entityName = `ID:${ID}`;
          break;
      }
    }

    // Xác định câu lệnh xóa dựa trên loại bảng (MaBang)
    switch (MaBang) {
      case "detaiduan":
        deleteQuery = `DELETE FROM detaiduan WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "baibaokhoahoc":
        deleteQuery = `DELETE FROM baibaokhoahoc WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "bangsangchevagiaithuong":
        deleteQuery = `DELETE FROM bangsangchevagiaithuong WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "biensoangiaotrinhbaigiang":
        deleteQuery = `DELETE FROM biensoangiaotrinhbaigiang WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "nckhvahuanluyendoituyen":
        deleteQuery = `DELETE FROM nckhvahuanluyendoituyen WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "sachvagiaotrinh":
        deleteQuery = `DELETE FROM sachvagiaotrinh WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "xaydungctdt":
        deleteQuery = `DELETE FROM xaydungctdt WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "sotietnckhbaoluusangnam":
        deleteQuery = `DELETE FROM sotietnckhbaoluusangnam WHERE ID = ?`;
        queryParams = [ID];
        break;
      case "nhiemvukhoahoccongnghe":
        deleteQuery = `DELETE FROM nhiemvukhoahoccongnghe WHERE ID = ?`;
        queryParams = [ID];
        break;
      default:
        return res.status(400).json({ message: "Loại bảng không hợp lệ." });
    }

    const [result] = await connection.execute(deleteQuery, queryParams);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bản ghi để xóa." });
    }

    console.log(`Xóa thành công ID: ${ID} trong bảng ${MaBang}`);

    await saveSoTietNCKHBaoLuuSangNamAfterDelete(ID, MaBang, namHoc);

    // Ghi log xóa thông tin NCKH
    if (oldData && entityName) {
      try {
        let logMessage = '';
        let logType = 'Xóa thông tin NCKH';
        
        // Xác định nội dung log dựa vào loại bảng
        switch (MaBang) {
          case "detaiduan":
            logMessage = `Xóa đề tài dự án "${entityName}"`;
            break;
          case "baibaokhoahoc":
            logMessage = `Xóa bài báo khoa học "${entityName}"`;
            break;
          case "bangsangchevagiaithuong":
            logMessage = `Xóa bằng sáng chế/giải thưởng "${entityName}"`;
            break;
          case "biensoangiaotrinhbaigiang":
            logMessage = `Xóa biên soạn giáo trình/bài giảng "${entityName}"`;
            break;
          case "nckhvahuanluyendoituyen":
            logMessage = `Xóa NCKH/huấn luyện đội tuyển "${entityName}"`;
            break;
          case "sachvagiaotrinh":
            logMessage = `Xóa sách/giáo trình "${entityName}"`;
            break;
          case "xaydungctdt":
            logMessage = `Xóa xây dựng CTĐT "${entityName}"`;
            break;
          case "sotietnckhbaoluusangnam":
            logMessage = `Xóa số tiết NCKH bảo lưu ${entityName}`;
            break;
          case "nhiemvukhoahoccongnghe":
            logMessage = `Xóa nhiệm vụ khoa học công nghệ "${entityName}"`;
            break;
          default:
            logMessage = `Xóa thông tin NCKH ${MaBang} - ${entityName}`;
            break;
        }
        
        await LogService.logChange(
          userId,
          userName,
          logType,
          logMessage
        );
        console.log(`Đã ghi log xóa "${entityName}" từ bảng ${MaBang}`);
      } catch (logError) {
        console.error(`Lỗi khi ghi log xóa thông tin từ bảng ${MaBang}:`, logError);
        // Không cần trả về lỗi, vẫn tiếp tục xử lý
      }
    }

    res.status(200).json({
      success: true,
      message: "Xóa thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi xóa:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi xóa.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

const tongHopSoTietNckhCuaMotGiangVien = async (req, res) => {
  // Nhận NamHoc và TenGiangVien từ req.params và req.body
  const { NamHoc } = req.params;
  const TenGiangVien = req.body.TenGiangVien;

  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Chuẩn bị các truy vấn cho 7 bảng, mỗi truy vấn được gắn kèm tên bảng
    const tableQueries = [
      {
        table: "Đề tài, dự án",
        promise: connection.execute(
          "SELECT ChuNhiem, ThuKy, DanhSachThanhVien FROM detaiduan WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
      {
        table: "Bài báo khoa học",
        promise: connection.execute(
          "SELECT TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien FROM baibaokhoahoc WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
      {
        table: "Bằng sáng chế và giải thưởng",
        promise: connection.execute(
          "SELECT TacGia, DanhSachThanhVien FROM bangsangchevagiaithuong WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
      {
        table: "Hướng dẫn sinh viên NCKH và Huấn luyện đội tuyển",
        promise: connection.execute(
          "SELECT DanhSachThanhVien FROM nckhvahuanluyendoituyen WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
      {
        table: "Sách và giáo trình xuất bản trong nước",
        promise: connection.execute(
          "SELECT TacGia, DongChuBien, DanhSachThanhVien FROM sachvagiaotrinh WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
      {
        table: "Xấy dựng chương trình đào tạo phục vụ học viện",
        promise: connection.execute(
          "SELECT DanhSachThanhVien FROM xaydungctdt WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
      {
        table: "Biên soạn giáo trình bài giảng",
        promise: connection.execute(
          "SELECT TacGia, DanhSachThanhVien FROM biensoangiaotrinhbaigiang WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
      {
        table: "Nhiệm vụ khoa học công nghệ",
        promise: connection.execute(
          "SELECT ChuNhiem, PhanBien, ThuKy, UyVien, DanhSachThanhVien FROM nhiemvukhoahoccongnghe WHERE NamHoc = ? AND DaoTaoDuyet = 1",
          [NamHoc]
        ),
      },
    ];

    // Thực hiện các truy vấn đồng thời
    const queryResults = await Promise.all(
      tableQueries.map((item) => item.promise)
    );

    // Lọc các bảng chưa tên giảng viên
    const filteredResults = tableQueries
      .map((item, index) => {
        // Lấy các bản ghi của bảng hiện tại
        const rows = queryResults[index][0];

        // Lọc các bản ghi có chứa TenGiangVien trong bất kỳ cột nào
        const filteredRows = rows.filter((row) => {
          return Object.values(row).some(
            (value) =>
              value &&
              typeof value === "string" &&
              value
                .trim()
                .toLowerCase()
                .includes(TenGiangVien.trim().toLowerCase())
          );
        });

        // Nếu không có bản ghi nào phù hợp thì trả về null
        if (filteredRows.length === 0) return null;

        // Trả về tất cả các dòng khớp với tên giảng viên
        return {
          Table: item.table,
          rows: filteredRows,
        };
      })
      .filter((item) => item !== null);

    // In ra console kết quả với tên bảng
    // console.log(JSON.stringify(filteredResults, null, 2));

    const result = congTongSoTiet(filteredResults, TenGiangVien);

    console.log(result);

    // Trả về kết quả cho client
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in tongHopSoTietNckhCuaMotGiangVien:", error);
    res
      .status(500)
      .json({ success: false, message: "Không thể truy xuất dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

const tongHopSoTietNckhCuaMotGiangVienDuKien = async (req, res) => {
  // Nhận NamHoc và TenGiangVien từ req.params và req.body
  const { NamHoc } = req.params;
  const TenGiangVien = req.body.TenGiangVien;

  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Chuẩn bị các truy vấn cho 7 bảng, mỗi truy vấn được gắn kèm tên bảng
    const tableQueries = [
      {
        table: "Đề tài, dự án",
        promise: connection.execute(
          "SELECT ChuNhiem, ThuKy, DanhSachThanhVien FROM detaiduan WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Bài báo khoa học",
        promise: connection.execute(
          "SELECT TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien FROM baibaokhoahoc WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Bằng sáng chế và giải thưởng",
        promise: connection.execute(
          "SELECT TacGia, DanhSachThanhVien FROM bangsangchevagiaithuong WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Hướng dẫn sinh viên NCKH và Huấn luyện đội tuyển",
        promise: connection.execute(
          "SELECT DanhSachThanhVien FROM nckhvahuanluyendoituyen WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Sách và giáo trình xuất bản trong nước",
        promise: connection.execute(
          "SELECT TacGia, DongChuBien, DanhSachThanhVien FROM sachvagiaotrinh WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Xấy dựng chương trình đào tạo phục vụ học viện",
        promise: connection.execute(
          "SELECT DanhSachThanhVien FROM xaydungctdt WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Biên soạn giáo trình bài giảng",
        promise: connection.execute(
          "SELECT TacGia, DanhSachThanhVien FROM biensoangiaotrinhbaigiang WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Nhiệm vụ khoa học công nghệ",
        promise: connection.execute(
          "SELECT ChuNhiem, PhanBien, ThuKy, UyVien, DanhSachThanhVien FROM nhiemvukhoahoccongnghe WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
    ];

    // Thực hiện các truy vấn đồng thời
    const queryResults = await Promise.all(
      tableQueries.map((item) => item.promise)
    );

    // Lọc các bảng chưa tên giảng viên
    const filteredResults = tableQueries
      .map((item, index) => {
        // Lấy các bản ghi của bảng hiện tại
        const rows = queryResults[index][0];

        // Lọc các bản ghi có chứa TenGiangVien trong bất kỳ cột nào
        const filteredRows = rows.filter((row) => {
          return Object.values(row).some(
            (value) =>
              value &&
              typeof value === "string" &&
              value
                .trim()
                .toLowerCase()
                .includes(TenGiangVien.trim().toLowerCase())
          );
        });

        // Nếu không có bản ghi nào phù hợp thì trả về null
        if (filteredRows.length === 0) return null;

        // Trả về tất cả các dòng khớp với tên giảng viên
        return {
          Table: item.table,
          rows: filteredRows,
        };
      })
      .filter((item) => item !== null);

    // In ra console kết quả với tên bảng
    // console.log(JSON.stringify(filteredResults, null, 2));

    const result = congTongSoTiet(filteredResults, TenGiangVien);

    console.log(result);

    // Trả về kết quả cho client
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in tongHopSoTietNckhCuaMotGiangVien:", error);
    res
      .status(500)
      .json({ success: false, message: "Không thể truy xuất dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

function congTongSoTiet(filteredResults, TenGiangVien) {
  // Hàm nội bộ: trích xuất số tiết từ chuỗi, hỗ trợ số nguyên và số thập phân
  function extractHours(text) {
    const regex = /\((?:.*?)?(\d+(?:\.\d+)?)\s*(?:giờ|tiết)(?:.*?)?\)/;
    const match = text.match(regex);
    return match && match[1] ? parseFloat(match[1]) : 0;
  }

  const result = { tables: {}, total: 0, name: TenGiangVien };

  filteredResults.forEach((record) => {
    // Lấy tên bảng từ key "Table" (nếu không có, dùng "Unknown Table")
    const tableName = record["Table"] || record["table"] || "Unknown Table";
    let tableTotal = 0;

    // Kiểm tra nếu có trường "rows" chứa danh sách các dòng
    if (Array.isArray(record.rows)) {
      record.rows.forEach((row) => {
        // Duyệt qua từng key trong một dòng dữ liệu
        for (const key in row) {
          if (key.toLowerCase() === "table") continue;

          // Xử lý nếu giá trị là chuỗi không rỗng
          if (typeof row[key] === "string" && row[key].trim() !== "") {
            const value = row[key];

            if (key === "DanhSachThanhVien" || key == "PhanBien" || key == "UyVien") {
              // Tách chuỗi theo dấu phẩy, duyệt từng phần tử
              const members = value.split(",").map((item) => item.trim());
              members.forEach((member) => {
                if (member.includes(TenGiangVien)) {
                  tableTotal += extractHours(member);
                }
              });
            } else {
              // Các key khác: nếu chứa TenGiangVien thì trích xuất số tiết
              if (value.includes(TenGiangVien)) {
                tableTotal += extractHours(value);
              }
            }
          }
        }
      });
    }

    // Lưu số tiết của bảng hiện tại vào đối tượng kết quả
    result.tables[tableName] = tableTotal;
    // Cộng dồn vào tổng số tiết của tất cả các bảng
    result.total += tableTotal;
  });

  return result;
}

const tongHopSoTietNckhCuaMotGiangVien2 = async (NamHoc, TenGiangVien) => {
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Chuẩn bị các truy vấn cho 7 bảng, mỗi truy vấn được gắn kèm tên bảng
    const tableQueries = [
      {
        table: "Đề tài, dự án",
        promise: connection.execute(
          "SELECT ChuNhiem, ThuKy, DanhSachThanhVien FROM detaiduan WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Bài báo khoa học",
        promise: connection.execute(
          "SELECT TacGia, TacGiaChiuTrachNhiem, DanhSachThanhVien FROM baibaokhoahoc WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Bằng sáng chế và giải thưởng",
        promise: connection.execute(
          "SELECT TacGia, DanhSachThanhVien FROM bangsangchevagiaithuong WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Hướng dẫn sinh viên NCKH và Huấn luyện đội tuyển",
        promise: connection.execute(
          "SELECT DanhSachThanhVien FROM nckhvahuanluyendoituyen WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Sách và giáo trình xuất bản trong nước",
        promise: connection.execute(
          "SELECT TacGia, DongChuBien, DanhSachThanhVien FROM sachvagiaotrinh WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Xấy dựng chương trình đào tạo phục vụ học viện",
        promise: connection.execute(
          "SELECT DanhSachThanhVien FROM xaydungctdt WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
      {
        table: "Biên soạn giáo trình bài giảng",
        promise: connection.execute(
          "SELECT TacGia, DanhSachThanhVien FROM biensoangiaotrinhbaigiang WHERE NamHoc = ?",
          [NamHoc]
        ),
      },
    ];

    // Thực hiện các truy vấn đồng thời
    const queryResults = await Promise.all(
      tableQueries.map((item) => item.promise)
    );

    // Lọc các bảng chưa tên giảng viên
    const filteredResults = tableQueries
      .map((item, index) => {
        // Lấy các bản ghi của bảng hiện tại
        const rows = queryResults[index][0];

        // Lọc các bản ghi có chứa TenGiangVien trong bất kỳ cột nào
        const filteredRows = rows.filter((row) => {
          return Object.values(row).some(
            (value) =>
              value &&
              typeof value === "string" &&
              value
                .trim()
                .toLowerCase()
                .includes(TenGiangVien.trim().toLowerCase())
          );
        });

        // Nếu không có bản ghi nào phù hợp thì trả về null
        if (filteredRows.length === 0) return null;

        // Trả về tất cả các dòng khớp với tên giảng viên
        return {
          Table: item.table,
          rows: filteredRows,
        };
      })
      .filter((item) => item !== null);

    // In ra console kết quả với tên bảng
    // console.log(JSON.stringify(filteredResults, null, 2));

    const result = congTongSoTiet(filteredResults, TenGiangVien);

    console.log(result);

    // Trả về kết quả cho client
    return result;
  } catch (error) {
    console.error("Error in tongHopSoTietNckhCuaMotGiangVien:", error);
    res
      .status(500)
      .json({ success: false, message: "Không thể truy xuất dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

// const saveSoTietNCKHBaoLuuSangNam = async (req, res) => {
//   // Lấy dữ liệu từ body
//   const { tenNhiemVu, namHoc, giangVien, khoa } = req.body;

//   // Kiểm tra dữ liệu đầu vào
//   if (!tenNhiemVu || !namHoc || !giangVien || !khoa) {
//     return res
//       .status(400)
//       .json({ message: "Vui lòng cung cấp đầy đủ thông tin!" });
//   }

//   // Tạo kết nối từ pool
//   const connection = await createPoolConnection();

//   try {
//     // 1. Query đến bảng sotietdinhmuc để lấy ra SoTietNCKH
//     // Chú ý: Tên cột được chọn phải khớp với tên cột trong bảng
//     const [rowsSoTietDinhMuc] = await connection.execute(
//       `SELECT NCKH FROM sotietdinhmuc LIMIT 1`
//     );
//     if (rowsSoTietDinhMuc.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "Không tìm thấy dữ liệu trong bảng sotietdinhmuc" });
//     }
//     const soTietDinhMuc = rowsSoTietDinhMuc[0].NCKH;
//     // console.log('Định mức: ', soTietDinhMuc)

//     // 2. Gọi hàm tổng hợp số tiết NCKH của giảng viên
//     const dataTongHop = await tongHopSoTietNckhCuaMotGiangVien2(
//       namHoc,
//       giangVien
//     );
//     // Kiểm tra dữ liệu trả về có hợp lệ không

//     const tongSoTietNCKH = dataTongHop.total;
//     // console.log('Tổng năm: ', tongSoTietNCKH)

//     // 3. Tính toán số tiết vượt định mức
//     const soTietVuotDinhMuc =
//       tongSoTietNCKH - soTietDinhMuc > 0 ? tongSoTietNCKH - soTietDinhMuc : 0;
//     // Nếu số tiết vượt định mức > 0 thì tính, ngược lại gán là 0
//     const soTietBaoLuuSangNamSau =
//       soTietVuotDinhMuc > 0
//         ? soTietVuotDinhMuc >= 85
//           ? 85
//           : soTietVuotDinhMuc
//         : 0;

//     // 4. Lưu dữ liệu vào bảng sotietnckhbaoluusangnam
//     await connection.execute(
//       `INSERT INTO sotietnckhbaoluusangnam 
//          (TenNhiemVu, NamHoc, GiangVien, Khoa, SoTietBaoLuuSangNamSau, TongSoTietNCKHTrongNam, SoTietVuotDinhMuc)
//          VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [
//         tenNhiemVu,
//         namHoc,
//         giangVien,
//         khoa,
//         soTietBaoLuuSangNamSau,
//         tongSoTietNCKH,
//         soTietVuotDinhMuc,
//       ]
//     );

//     console.log("Thêm số tiết bảo lưu thành công");
//     res.status(200).json({
//       success: true,
//       message: "Thêm số tiết bảo lưu thành công!",
//     });
//   } catch (error) {
//     console.error("Lỗi khi lưu số tiết bảo lưu:", error);
//     res.status(500).json({
//       message: "Có lỗi xảy ra thêm khi số tiết bảo lưu.",
//       error: error.message,
//     });
//   } finally {
//     if (connection) connection.release();
//   }
// };

const saveSoTietNCKHBaoLuuSangNam = async (tenGiangVien, namHoc) => {
  if (!tenGiangVien || !namHoc) {
    throw new Error("Vui lòng cung cấp đầy đủ thông tin (tên giảng viên và năm học)!");
  }

  const connection = await createPoolConnection();

  try {
    // 1. Lấy mã khoa từ bảng nhân viên
    const [rowsNV] = await connection.execute(
      `SELECT MaPhongBan FROM nhanvien WHERE TenNhanVien = ? LIMIT 1`,
      [tenGiangVien]
    );
    if (rowsNV.length === 0) {
      throw new Error("Không tìm thấy giảng viên trong bảng nhanvien");
    }
    const khoa = rowsNV[0].MaPhongBan;

    const tenNhiemVu = "Số tiết NCKH bảo lưu";

    // 2. Lấy định mức tiết NCKH
    const [rowsSoTietDinhMuc] = await connection.execute(
      `SELECT NCKH FROM sotietdinhmuc LIMIT 1`
    );
    if (rowsSoTietDinhMuc.length === 0) {
      throw new Error("Không tìm thấy dữ liệu trong bảng sotietdinhmuc");
    }
    const soTietDinhMuc = rowsSoTietDinhMuc[0].NCKH;

    // 3. Tổng hợp tiết NCKH
    const dataTongHop = await tongHopSoTietNckhCuaMotGiangVien2(namHoc, tenGiangVien);
    const tongSoTietNCKH = dataTongHop.total;

    // 4. Tính toán tiết vượt định mức và bảo lưu
    const soTietVuotDinhMuc = Math.max(0, tongSoTietNCKH - soTietDinhMuc);
    const soTietBaoLuuSangNamSau = Math.min(soTietVuotDinhMuc, 85);

    // 5. Kiểm tra xem đã tồn tại bản ghi chưa
    const [existingRows] = await connection.execute(
      `SELECT 1 FROM sotietnckhbaoluusangnam 
       WHERE TenNhiemVu = ? AND NamHoc = ? AND GiangVien = ? 
       LIMIT 1`,
      [tenNhiemVu, namHoc, tenGiangVien]
    );

    if (existingRows.length > 0) {
      // Nếu đã tồn tại => UPDATE
      await connection.execute(
        `UPDATE sotietnckhbaoluusangnam
         SET Khoa = ?, 
             SoTietBaoLuuSangNamSau = ?, 
             TongSoTietNCKHTrongNam = ?, 
             SoTietVuotDinhMuc = ?
         WHERE TenNhiemVu = ? AND NamHoc = ? AND GiangVien = ?`,
        [
          khoa,
          soTietBaoLuuSangNamSau,
          tongSoTietNCKH,
          soTietVuotDinhMuc,
          tenNhiemVu,
          namHoc,
          tenGiangVien
        ]
      );
      return {
        success: true,
        message: "Cập nhật số tiết bảo lưu thành công!",
      };
    } else {
      // Nếu chưa tồn tại => INSERT
      await connection.execute(
        `INSERT INTO sotietnckhbaoluusangnam
           (TenNhiemVu, NamHoc, GiangVien, Khoa, SoTietBaoLuuSangNamSau, TongSoTietNCKHTrongNam, SoTietVuotDinhMuc)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          tenNhiemVu,
          namHoc,
          tenGiangVien,
          khoa,
          soTietBaoLuuSangNamSau,
          tongSoTietNCKH,
          soTietVuotDinhMuc,
        ]
      );
      return {
        success: true,
        message: "Thêm số tiết bảo lưu thành công!",
      };
    }
  } catch (error) {
    console.error("Lỗi khi xử lý số tiết bảo lưu:", error);
    throw new Error("Có lỗi xảy ra: " + error.message);
  } finally {
    if (connection) connection.release();
  }
};


const getDataSoTietNCKHBaoLuuSangNam = async (req, res) => {
  // Lấy dữ liệu từ body
  const { tenNhiemVu, namHoc, giangVien, khoa } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!tenNhiemVu || !namHoc || !giangVien || !khoa) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp đầy đủ thông tin!" });
  }

  // Tạo kết nối từ pool
  const connection = await createPoolConnection();

  try {
    // 1. Query đến bảng sotietdinhmuc để lấy ra SoTietNCKH
    // Chú ý: Tên cột được chọn phải khớp với tên cột trong bảng
    const [rowsSoTietDinhMuc] = await connection.execute(
      `SELECT NCKH FROM sotietdinhmuc LIMIT 1`
    );
    if (rowsSoTietDinhMuc.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy dữ liệu trong bảng sotietdinhmuc" });
    }
    const soTietDinhMuc = rowsSoTietDinhMuc[0].NCKH;
    console.log('Định mức: ', soTietDinhMuc)

    // 2. Gọi hàm tổng hợp số tiết NCKH của giảng viên
    const dataTongHop = await tongHopSoTietNckhCuaMotGiangVien2(
      namHoc,
      giangVien
    );
    // Kiểm tra dữ liệu trả về có hợp lệ không

    const tongSoTietNCKH = dataTongHop.total;
    // console.log('Tổng năm: ', tongSoTietNCKH)

    // 3. Tính toán số tiết vượt định mức
    const soTietVuotDinhMuc =
      tongSoTietNCKH - soTietDinhMuc > 0 ? tongSoTietNCKH - soTietDinhMuc : 0;
    // Nếu số tiết vượt định mức > 0 thì tính, ngược lại gán là 0
    const soTietBaoLuuSangNamSau =
      soTietVuotDinhMuc > 0
        ? soTietVuotDinhMuc >= 85
          ? 85
          : soTietVuotDinhMuc
        : 0;

    const result = {
      name: req.body.giangVien,
      tongSoTietNCKH: tongSoTietNCKH,
      soTietVuotDinhMuc: soTietVuotDinhMuc,
      soTietBaoLuuSangNamSau
    }

    console.log("lấy data số tiết bảo lưu của " + req.body.giangVien);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lưu số tiết bảo lưu:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm số tiết bảo lưu.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

const getTableSoTietNCKHBaoLuuSangNam = async (req, res) => {
  const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

  console.log("Lấy dữ liệu bảng sotietnckhbaoluusangnam Năm:", NamHoc);

  let connection;
  let query;
  let queryParams;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (Khoa == "ALL") {
      query = `SELECT * FROM sotietnckhbaoluusangnam WHERE NamHoc = ?`; // Truy vấn dữ liệu từ bảng biensoangiaotrinhbaigiang
      queryParams = [NamHoc];
    } else {
      query = `SELECT * FROM sotietnckhbaoluusangnam WHERE NamHoc = ? AND Khoa = ?`; // Truy vấn dữ liệu từ bảng biensoangiaotrinhbaigiang
      queryParams = [NamHoc, Khoa];
    }

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    // Trả về kết quả dưới dạng JSON
    res.json(results); // results chứa dữ liệu trả về
  } catch (error) {
    console.error("Lỗi trong hàm getTableSoTietNCKHBaoLuuSangNam :", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const saveNhiemVuKhoaHocCongNghe = async (req, res) => {
  // Lấy thông tin người dùng từ session hoặc request
  const userId = req.session?.userId || 1; // Mặc định là 1 nếu không có
  const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN'; // Lấy tên nhân viên từ session
  
  const data = await quyDoiSoGioNhiemVuKhoaHocCongNghe(req.body, "nhiemvukhoahoccongnghe");
  // Lấy dữ liệu từ body
  const {
    phanLoai,
    namHoc,
    tenNhiemVu,
    maNhiemVu,
    chuNhiem,
    thuKy,
    ngayNghiemThu,
    khoa,
    thanhVien, // Đây là một mảng từ client
    phanBien, // Đây là một mảng từ client
    uyVien, // Đây là một mảng từ client
    ketQua,
  } = data;

  // console.log(data)
  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Chèn dữ liệu vào bảng detaiduan
    await connection.execute(
      `
INSERT INTO nhiemvukhoahoccongnghe (
PhanLoai, NamHoc, TenNhiemVu, MaNhiemVu, ChuNhiem, ThuKy, NgayNghiemThu, Khoa, DanhSachThanhVien, KetQua, PhanBien, UyVien 
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        phanLoai,
        namHoc,
        tenNhiemVu,
        maNhiemVu,
        chuNhiem,
        thuKy,
        ngayNghiemThu,
        khoa,
        thanhVien,
        ketQua,
        phanBien,
        uyVien,
      ]
    );

    // Ghi log thêm nhiệm vụ khoa học công nghệ mới
    try {
      const logMessage = `Thêm nhiệm vụ khoa học công nghệ "${tenNhiemVu}"`;
      await LogService.logChange(
        userId,
        userName,
        'Thêm thông tin NCKH',
        logMessage
      );
      console.log(`Đã ghi log thêm nhiệm vụ khoa học công nghệ "${tenNhiemVu}"`);
    } catch (logError) {
      console.error("Lỗi khi ghi log thêm nhiệm vụ khoa học công nghệ:", logError);
      // Không cần trả về lỗi, vẫn tiếp tục xử lý
    }
    
    // Trả về phản hồi thành công cho client
    console.log("Thêm nhiệm vụ khoa học công nghệ thành công");
    res.status(200).json({
      success: true,
      message: "Thêm nhiệm vụ khoa học công nghệ thành công!",
    });
  } catch (error) {
    console.error("Error while saving project data:", error);
    // Trả về phản hồi lỗi cho client
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm nhiệm vụ khoa học công nghệ.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

const quyDoiSoGioNhiemVuKhoaHocCongNghe = async (body, MaBang) => {
  const { phanLoai, chuNhiem, thuKy, thanhVien, phanBien, uyVien } = body;

  let soGioChuNhiem = 0;
  let soGioThuKy = 0;
  // Sử dụng biến string cho số giờ của thanhVien (và dùng chung cho phanBien, uyVien)
  let soGioThanhVienStr = "";

  try {
    const connection = await createPoolConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM quydinhsogionckh WHERE NhiemVuKhoaHocCongNghe = ? AND MaBang = ?`,
      [phanLoai, MaBang]
    );

    if (rows.length === 0) {
      throw new Error("Không tìm thấy dữ liệu quy đổi cho cấp đề tài này.");
    }
    const data = rows[0];

    // Nếu có dữ liệu cho thanhVien (mảng có phần tử)
    if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
      const soGioValue = parseFloat(data.SoGio) || 0;
      soGioThanhVienStr = soGioValue.toFixed(2).replace(",", ".");
      // Với thành viên, tạo chuỗi gồm các thành viên được nối với nhau
      body.thanhVien = thanhVien
        .map(member => {
          const { name, unit } = extractNameAndUnit(member);
          return `${name} (${unit} - ${soGioThanhVienStr} giờ)`.trim();
        })
        .join(", ");
    } else {
      // Nếu không có dữ liệu cho thanhVien, xử lý cho các vai trò còn lại:

      if (chuNhiem) {
        const { name, unit } = extractNameAndUnit(chuNhiem);
        soGioChuNhiem = parseFloat(data.ChuNhiem) || 0;
        body.chuNhiem = `${name} (${unit} - ${soGioChuNhiem.toFixed(2).replace(",", ".")} giờ)`.trim();
      }
      if (thuKy) {
        const { name, unit } = extractNameAndUnit(thuKy);
        soGioThuKy = parseFloat(data.ThuKy) || 0;
        body.thuKy = `${name} (${unit} - ${soGioThuKy.toFixed(2).replace(",", ".")} giờ)`.trim();
      }
      body.thanhVien = "";

      // Xử lý phanBien, nếu tồn tại và là mảng có phần tử, theo cùng cách xử lý như thanhVien
      if (phanBien && Array.isArray(phanBien) && phanBien.length > 0) {
        const soGioValue = parseFloat(data.PhanBien) || 0;
        const soGioStr = soGioValue.toFixed(2).replace(",", ".");
        body.phanBien = phanBien
          .map(member => {
            const { name, unit } = extractNameAndUnit(member);
            return `${name} (${unit} - ${soGioStr} giờ)`.trim();
          })
          .join(", ");
      } else {
        body.phanBien = "";
      }

      // Xử lý uyVien, nếu tồn tại và là mảng có phần tử, theo cùng cách xử lý như thanhVien
      if (uyVien && Array.isArray(uyVien) && uyVien.length > 0) {
        const soGioValue = parseFloat(data.UyVien) || 0;
        const soGioStr = soGioValue.toFixed(2).replace(",", ".");
        body.uyVien = uyVien
          .map(member => {
            const { name, unit } = extractNameAndUnit(member);
            return `${name} (${unit} - ${soGioStr} giờ)`.trim();
          })
          .join(", ");
      } else {
        body.uyVien = "";
      }
    }

    connection.release();
    return body;
  } catch (error) {
    console.error("Lỗi khi quy đổi số giờ:", error);
    throw error;
  }
};



const getTableNhiemVuKhoaHocCongNghe = async (req, res) => {
  const { NamHoc, Khoa } = req.params;
  console.log(`Lấy dữ liệu bảng nhiemvukhoahoccongnghe Năm: ${NamHoc} Khoa: ${Khoa}`);

  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy tất cả dữ liệu của năm học được chọn
    let query = `SELECT * FROM nhiemvukhoahoccongnghe WHERE NamHoc = ?`;
    const [results] = await connection.execute(query, [NamHoc]);

    if (Khoa === "ALL") {
      res.json(results);
    } else {
      const filteredResults = [];

      for (let item of results) {
        const namesToCheck = [];

        // Xử lý các trường ChuNhiem và ThuKy
        ["ChuNhiem", "ThuKy"].forEach((key) => {
          if (item[key]) {
            const name = item[key].replace(/\s*\([^)]*\)/g, "").trim();
            namesToCheck.push(name);
          }
        });

        // Xử lý trường DanhSachThanhVien (danh sách các tên, phân tách bằng dấu phẩy)
        if (item["DanhSachThanhVien"]) {
          const members = item["DanhSachThanhVien"].split(",").map((name) =>
            name
              .trim()
              .replace(/\s*\([^)]*\)/g, "")
              .trim()
          );
          namesToCheck.push(...members);
        }

        // Loại bỏ các tên trùng lặp
        const uniqueNames = [...new Set(namesToCheck)];

        // Truy vấn bảng nhanvien để lấy MaPhongBan cho các tên
        if (uniqueNames.length > 0) {
          const placeholders = uniqueNames.map(() => "?").join(", ");
          const nameQuery = `SELECT TenNhanVien, MaPhongBan FROM nhanvien WHERE TenNhanVien IN (${placeholders})`;

          const [employeeResults] = await connection.execute(
            nameQuery,
            uniqueNames
          );

          const departmentCodes = employeeResults.map((emp) => emp.MaPhongBan);

          // Nếu có bất kỳ mã phòng ban nào chứa chuỗi Khoa thì thêm item vào kết quả
          if (departmentCodes.some((code) => code && code.includes(Khoa))) {
            filteredResults.push(item);
          }
        }
      }
      // console.log(filteredResults);
      res.json(filteredResults);
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTablenhiemvukhoahoccongnghe:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release();
  }
};




module.exports = {
  getQuyDinhSoGioNCKH,
  getDeTaiDuAn,
  getTableDeTaiDuAn,
  saveDeTaiDuAn,
  getTeacher,
  getBaiBaoKhoaHoc,
  saveBaiBaoKhoaHoc,
  getTableBaiBaoKhoaHoc,
  getBangSangCheVaGiaiThuong,
  saveBangSangCheVaGiaiThuong,
  getTableBangSangCheVaGiaiThuong,
  getSachVaGiaoTrinh,
  saveSachVaGiaoTrinh,
  getTableSachVaGiaoTrinh,
  getNckhVaHuanLuyenDoiTuyen,
  saveNckhVaHuanLuyenDoiTuyen,
  getTableNckhVaHuanLuyenDoiTuyen,
  getXayDungCTDT,
  saveXayDungCTDT,
  getTableXayDungCTDT,
  getBienSoanGiaoTrinhBaiGiang,
  saveBienSoanGiaoTrinhBaiGiang,
  getTableBienSoanGiaoTrinhBaiGiang,
  getSoTietNCKHBaoLuuSangNam,
  saveSoTietNCKHBaoLuuSangNam,
  getTableSoTietNCKHBaoLuuSangNam,
  getDataSoTietNCKHBaoLuuSangNam,
  getTongHopSoTietNCKH,
  getTongHopSoTietNCKHDuKien,
  tongHopSoTietNckhCuaMotGiangVien,
  tongHopSoTietNckhCuaMotGiangVienDuKien,
  getNhiemVuKhoaHocCongNghe,
  getTableNhiemVuKhoaHocCongNghe,
  saveNhiemVuKhoaHocCongNghe,
  getData,
  editNckh,
  deleteNckh,
};