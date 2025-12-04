const createPoolConnection = require("../config/databasePool");

const getSoHopDongPage = async (req, res) => {
  try {
    // Render the contract numbers page
    res.render('hopdong.soHopDongMoiGiang.ejs', {
      title: 'Quản lý Số Hợp Đồng - Cơ sở miền bắc',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering so hop dong page:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getSoHopDongDTPHPage = async (req, res) => {
  try {
    // Render the ĐTPH contract numbers page
    res.render('hopdong.soHopDongMgDTPH.ejs', {
      title: 'Quản lý Số Hợp Đồng - Phân hiệu học viện',
      user: req.user || {},
      khoaName: 'ĐTPH'
    });
  } catch (error) {
    console.error('Error rendering so hop dong ĐTPH page:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getHopDongList = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    // Hỗ trợ cả param nam hoặc namHoc từ client, thêm support cho arrays
    let { dot, ki, namHoc: nh, nam, khoa, heDaoTao, khoaList, heDaoTaoList, teacherName } = req.query;
    const namHoc = nh || nam;

    // Bắt buộc
    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    // Parse arrays từ query string nếu cần (support cả old và new format)
    let parsedKhoaList = khoaList || (khoa ? [khoa] : null);
    let parsedHeDaoTaoList = heDaoTaoList || (heDaoTao ? [heDaoTao] : null);
    
    if (typeof parsedKhoaList === 'string') {
      try {
        parsedKhoaList = JSON.parse(parsedKhoaList);
      } catch (e) {
        parsedKhoaList = [parsedKhoaList];
      }
    }
    
    if (typeof parsedHeDaoTaoList === 'string') {
      try {
        parsedHeDaoTaoList = JSON.parse(parsedHeDaoTaoList);
      } catch (e) {
        parsedHeDaoTaoList = [parsedHeDaoTaoList];
      }
    }

    // Quyền khoa - override nếu user là khoa
    if (isKhoa == 1) {
      parsedKhoaList = [req.session.MaPhongBan];
    }

    connection = await createPoolConnection();

    // Build query giống exportMultipleContracts, bỏ điều kiện he_dao_tao mặc định
    let query = `
      SELECT
        hd.id_Gvm,
        MAX(hd.DienThoai) AS DienThoai,
        MAX(hd.Email) AS Email,
        MAX(hd.MaSoThue) AS MaSoThue,
        MAX(hd.DanhXung) AS DanhXung,
        hd.HoTen,
        MAX(hd.NgaySinh) AS NgaySinh,
        MAX(hd.HocVi) AS HocVi,
        MAX(hd.ChucVu) AS ChucVu,
        MAX(hd.HSL) AS HSL,
        hd.CCCD,
        MAX(hd.NoiCapCCCD) AS NoiCapCCCD,
        MAX(hd.DiaChi) AS DiaChi,
        MAX(hd.STK) AS STK,
        MAX(hd.NganHang) AS NganHang,
        MIN(hd.NgayBatDau) AS NgayBatDau,
        MAX(hd.NgayKetThuc) AS NgayKetThuc,
        SUM(hd.SoTiet) AS SoTiet,
        SUM(hd.SoTien) AS SoTien,
        SUM(hd.TruThue) AS TruThue,
        MAX(hd.NgayCap) AS NgayCap,
        SUM(hd.ThucNhan) AS ThucNhan,
        MAX(hd.NgayNghiemThu) AS NgayNghiemThu,
        hd.Dot,
        hd.KiHoc,
        hd.NamHoc,
        hd.MaPhongBan,
        MAX(hd.MaBoMon) AS MaBoMon,
        MAX(hd.NoiCongTac) AS NoiCongTac,
        hd.he_dao_tao AS he_dao_tao,
        MIN(hd.SoHopDong) AS SoHopDong,
        MIN(hd.SoThanhLyHopDong) AS SoThanhLyHopDong,
        MAX(hd.CoSoDaoTao) AS CoSoDaoTao
      FROM
        hopdonggvmoi hd
      JOIN
        gvmoi gv ON hd.id_Gvm = gv.id_Gvm
      WHERE
        hd.Dot = ? AND
        hd.KiHoc = ? AND
        hd.NamHoc = ?
    `;
    const params = [dot, ki, namHoc];

    // Thêm filter hệ đào tạo chỉ khi có giá trị cụ thể
    if (parsedHeDaoTaoList && 
        Array.isArray(parsedHeDaoTaoList) && 
        parsedHeDaoTaoList.length > 0 && 
        !parsedHeDaoTaoList.includes('ALL') &&
        !parsedHeDaoTaoList.includes('') &&
        parsedHeDaoTaoList[0] !== '') {
      const placeholders = parsedHeDaoTaoList.map(() => '?').join(',');
      query += ` AND hd.he_dao_tao IN (${placeholders})`;
      params.push(...parsedHeDaoTaoList);
    }

    // Thêm filter khoa chỉ khi có giá trị cụ thể
    if (parsedKhoaList && 
        Array.isArray(parsedKhoaList) && 
        parsedKhoaList.length > 0 && 
        !parsedKhoaList.includes('ALL') &&
        !parsedKhoaList.includes('') &&
        parsedKhoaList[0] !== '') {
      const placeholders = parsedKhoaList.map(() => '?').join(',');
      query += ` AND hd.MaPhongBan IN (${placeholders})`;
      params.push(...parsedKhoaList);
    }

    // Lọc theo tên giáo viên nếu có
    if (teacherName && teacherName.trim() !== "") {
      query += ` AND hd.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    // GROUP BY đúng y hệt exportMultipleContracts
    query += `
      GROUP BY
        hd.CCCD,
        hd.id_Gvm,
        hd.HoTen,
        hd.Dot,
        hd.KiHoc,
        hd.NamHoc,
        hd.MaPhongBan,
        hd.he_dao_tao
      ORDER BY
        hd.MaPhongBan,
        hd.he_dao_tao,
        hd.HoTen
    `;

    console.log('getHopDongList query:', query);
    console.log('getHopDongList params:', params);
    console.log('parsedKhoaList:', parsedKhoaList);
    console.log('parsedHeDaoTaoList:', parsedHeDaoTaoList);

    const [rows] = await connection.execute(query, params);

    // Hàm nhóm theo he_dao_tao và MaPhongBan
    const grouped = rows.reduce((acc, item) => {
      const he = item.he_dao_tao || 'Không xác định';
      const khoaKey = item.MaPhongBan || 'Khác';

      if (!acc[he]) {
        acc[he] = {};
      }
      if (!acc[he][khoaKey]) {
        acc[he][khoaKey] = [];
      }
      acc[he][khoaKey].push(item);
      return acc;
    }, {});

    return res.json({ success: true, data: grouped });
  } catch (error) {
    console.error("Error in getHopDongList:", error);
    return res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách hợp đồng" });
  } finally {
    if (connection) connection.release();
  }
};

const setupSoHopDongToanBo = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoaList, heDaoTaoList, startingNumber, kiHieuTruocSo, kiHieuSauSo, kiHieuHopDong, kiHieuThanhLy, coSoDaoTao, teacherName } = req.body;

    // Validate required input
    if (!dot || !ki || !nam) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học'
      });
    }

    // Validate ki hieu
    if (!kiHieuHopDong || !kiHieuThanhLy) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu kí hiệu hợp đồng hoặc kí hiệu thanh lý'
      });
    }

    // Parse startingNumber và kí hiệu
    // startingNumber có thể là số thuần hoặc đã format (string)
    let startNum;
    let prefix = kiHieuTruocSo || '';
    let suffix = kiHieuSauSo || '';
    
    if (typeof startingNumber === 'string' && startingNumber.trim() !== '') {
      // Nếu là string, thử parse số từ giữa (format: prefix + số + suffix)
      const numberMatch = startingNumber.match(/(\d+)/);
      if (numberMatch) {
        startNum = parseInt(numberMatch[1], 10);
        // Nếu không có kiHieuTruocSo/sauSo từ request, thử extract từ startingNumber
        if (!kiHieuTruocSo && !kiHieuSauSo) {
          const beforeNumber = startingNumber.substring(0, numberMatch.index);
          const afterNumber = startingNumber.substring(numberMatch.index + numberMatch[0].length);
          prefix = beforeNumber;
          suffix = afterNumber;
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Số bắt đầu không hợp lệ'
        });
      }
    } else {
      startNum = parseInt(startingNumber, 10);
    }

    if (!startNum || startNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Số bắt đầu phải lớn hơn hoặc bằng 1'
      });
    }

    // Default values
    const finalCoSoDaoTao = coSoDaoTao || 'Học viện Kỹ thuật mật mã';
    const parsedKhoaList = khoaList || [];
    const parsedHeDaoTaoList = heDaoTaoList || [];

    // Build query giống preview để lấy danh sách contracts
    let whereConditions = 'WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?';
    const params = [dot, ki, nam];

    // Thêm điều kiện hệ đào tạo
    if (parsedHeDaoTaoList && 
        Array.isArray(parsedHeDaoTaoList) && 
        parsedHeDaoTaoList.length > 0 && 
        !parsedHeDaoTaoList.includes('ALL') &&
        !parsedHeDaoTaoList.includes('') &&
        parsedHeDaoTaoList[0] !== '') {
      const placeholders = parsedHeDaoTaoList.map(() => '?').join(',');
      whereConditions += ` AND hd.he_dao_tao IN (${placeholders})`;
      params.push(...parsedHeDaoTaoList);
    }

    // Thêm điều kiện khoa
    if (parsedKhoaList && 
        Array.isArray(parsedKhoaList) && 
        parsedKhoaList.length > 0 && 
        !parsedKhoaList.includes('ALL') &&
        !parsedKhoaList.includes('') &&
        parsedKhoaList[0] !== '') {
      const placeholders = parsedKhoaList.map(() => '?').join(',');
      whereConditions += ` AND hd.MaPhongBan IN (${placeholders})`;
      params.push(...parsedKhoaList);
    }

    // Thêm filter theo tên giáo viên nếu có
    if (teacherName && teacherName.trim() !== '') {
      whereConditions += ` AND hd.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    // Query giống preview - GROUP BY để lấy 1 record/CCCD
    const query = `
      SELECT
        hd.CCCD,
        hd.id_Gvm,
        hd.HoTen,
        hd.MaPhongBan,
        hd.he_dao_tao
      FROM hopdonggvmoi hd
      JOIN gvmoi gv ON hd.id_Gvm = gv.id_Gvm
      ${whereConditions}
      GROUP BY hd.CCCD, hd.id_Gvm, hd.HoTen, hd.MaPhongBan, hd.he_dao_tao
      ORDER BY hd.MaPhongBan, hd.he_dao_tao, hd.HoTen
    `;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: 'Không tìm thấy hợp đồng nào phù hợp với điều kiện đã chọn'
      });
    }

    // Begin transaction
    await connection.beginTransaction();
    
    // Sử dụng số bắt đầu đã parse và kí hiệu trước/sau số
    let num = startNum;
    
    let updatedCount = 0;
    let failedCount = 0;

    // Sinh số HĐ và UPDATE từng contract
    // Format: [kí hiệu trước số][số 3 chữ số][kí hiệu sau số]
    for (const row of rows) {
      try {
        const formattedNumber = String(num++).padStart(3, '0');
        const str = prefix + formattedNumber + suffix;
        const newSoHopDong = `${str}/${kiHieuHopDong}`;
        const newSoThanhLy = `${str}/${kiHieuThanhLy}`;

        // UPDATE với CCCD chính xác
        const updateQuery = `
          UPDATE hopdonggvmoi 
          SET SoHopDong = ?, SoThanhLyHopDong = ?, CoSoDaoTao = ?
          WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND CCCD = ?
        `;
        const updateParams = [
          newSoHopDong,
          newSoThanhLy,
          finalCoSoDaoTao,
          dot,
          ki,
          nam,
          row.CCCD
        ];

        const [result] = await connection.execute(updateQuery, updateParams);
        
        if (result.affectedRows > 0) {
          updatedCount += result.affectedRows;
        } else {
          console.warn(`No records updated for CCCD: ${row.CCCD}`);
          failedCount++;
        }

      } catch (error) {
        console.error('Error updating contract for:', row.HoTen, error);
        failedCount++;
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Đã cập nhật số hợp đồng mời giảng thành công',
      updatedCount,
      failedCount,
      totalProcessed: rows.length
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error setting up so hop dong toan bo:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số hợp đồng: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const previewSoHopDongMoiGiang = async (req, res) => {
  let connection;
  try {
    const { dot, ki, nam, khoa, heDaoTao, khoaList, heDaoTaoList, startingNumber, kiHieuTruocSo, kiHieuSauSo, kiHieuHopDong, kiHieuThanhLy, coSoDaoTao } = req.body;

    // Support both old single values and new array format
    const parsedKhoaList = khoaList || (khoa ? [khoa] : []);
    const parsedHeDaoTaoList = heDaoTaoList || (heDaoTao ? [heDaoTao] : []);

    // Validate ki hieu
    const finalKiHieuHopDong = kiHieuHopDong || 'HĐ-ĐT';
    const finalKiHieuThanhLy = kiHieuThanhLy || 'HĐNT-ĐT';
    const finalCoSoDaoTao = coSoDaoTao || 'Học viện Kỹ thuật mật mã';
    
    // Parse startingNumber và kí hiệu
    let startNum;
    let prefix = kiHieuTruocSo || '';
    let suffix = kiHieuSauSo || '';
    
    if (typeof startingNumber === 'string' && startingNumber.trim() !== '') {
      // Nếu là string, thử parse số từ giữa (format: prefix + số + suffix)
      const numberMatch = startingNumber.match(/(\d+)/);
      if (numberMatch) {
        startNum = parseInt(numberMatch[1], 10);
        // Nếu không có kiHieuTruocSo/sauSo từ request, thử extract từ startingNumber
        if (!kiHieuTruocSo && !kiHieuSauSo) {
          const beforeNumber = startingNumber.substring(0, numberMatch.index);
          const afterNumber = startingNumber.substring(numberMatch.index + numberMatch[0].length);
          prefix = beforeNumber;
          suffix = afterNumber;
        }
      } else {
        startNum = 1; // Default nếu không parse được
      }
    } else {
      startNum = parseInt(startingNumber, 10) || 1;
    }

    connection = await createPoolConnection();

    // Build query với điều kiện WHERE đúng vị trí
    let whereConditions = 'WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?';
    const params = [dot, ki, nam];

    // Thêm điều kiện hệ đào tạo vào subquery (với mảng)
    if (parsedHeDaoTaoList && 
        Array.isArray(parsedHeDaoTaoList) && 
        parsedHeDaoTaoList.length > 0 && 
        !parsedHeDaoTaoList.includes('ALL') &&
        !parsedHeDaoTaoList.includes('') &&
        parsedHeDaoTaoList[0] !== '') {
      const placeholders = parsedHeDaoTaoList.map(() => '?').join(',');
      whereConditions += ` AND he_dao_tao IN (${placeholders})`;
      params.push(...parsedHeDaoTaoList);
    }

    // Thêm điều kiện khoa vào subquery (với mảng)
    if (parsedKhoaList && 
        Array.isArray(parsedKhoaList) && 
        parsedKhoaList.length > 0 && 
        !parsedKhoaList.includes('ALL') &&
        !parsedKhoaList.includes('') &&
        parsedKhoaList[0] !== '') {
      const placeholders = parsedKhoaList.map(() => '?').join(',');
      whereConditions += ` AND MaPhongBan IN (${placeholders})`;
      params.push(...parsedKhoaList);
    }

    let query = `
      SELECT
        hd.id_Gvm,
        hd.HoTen,
        hd.CCCD,
        MAX(hd.SoHopDong) AS SoHopDong,
        MAX(hd.SoThanhLyHopDong) AS SoThanhLyHopDong,
        hd.Dot,
        hd.KiHoc,
        hd.NamHoc,
        hd.MaPhongBan AS Khoa,
        hd.he_dao_tao AS HeDaoTao
      FROM (
        SELECT *
        FROM hopdonggvmoi
        ${whereConditions}
      ) hd
      JOIN gvmoi gv ON hd.id_Gvm = gv.id_Gvm
      GROUP BY hd.CCCD, hd.id_Gvm, hd.HoTen, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.he_dao_tao
      ORDER BY hd.MaPhongBan, hd.he_dao_tao, hd.HoTen
    `;


    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {},
        message: 'Không tìm thấy hợp đồng nào phù hợp với điều kiện đã chọn'
      });
    }

    // Nhóm theo HeDaoTao và MaPhongBan
    const grouped = rows.reduce((acc, item) => {
      const he = item.HeDaoTao || 'Không xác định';
      const khoaKey = item.Khoa || 'Khác';
      if (!acc[he]) acc[he] = {};
      if (!acc[he][khoaKey]) acc[he][khoaKey] = [];
      acc[he][khoaKey].push(item);
      return acc;
    }, {});

    // Khởi số bắt đầu và tăng dần liên tục
    // Format: [kí hiệu trước số][số 2 chữ số][kí hiệu sau số]
    let num = startNum;
    
    const result = {};

    Object.keys(grouped).sort().forEach(he => {
      result[he] = {};
      Object.keys(grouped[he]).sort().forEach(khoaKey => {
        result[he][khoaKey] = grouped[he][khoaKey].map(item => {
          const formattedNumber = String(num++).padStart(3, '0');
          const str = prefix + formattedNumber + suffix;
          return {
            ...item,
            newSoHopDong: `${str}/${finalKiHieuHopDong}`,
            newSoThanhLy: `${str}/${finalKiHieuThanhLy}`
          };
        });
      });
    });

    return res.json({ success: true, data: result });

  } catch (error) {
    console.error('Error previewing synchronized setup:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xem trước setup đồng bộ: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Lấy site đồ án 
const getSoHopDongDoAnPage = async (req, res) => {
  try {
    // Render the contract numbers page
    res.render('hopdong.soHopDongDoAn.ejs', {
      title: 'Số đồ án - Cơ sở miền bắc',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering so hop dong do an page:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Lấy site đồ án ĐTPH
const getSoHopDongDoAnDTPHPage = async (req, res) => {
  try {
    // Render the ĐTPH thesis contract numbers page
    res.render('hopdong.soHopDongDoAnDTPH.ejs', {
      title: 'Số đồ án - Phân hiệu học viện',
      user: req.user || {},
      khoaName: 'ĐTPH'
    });
  } catch (error) {
    console.error('Error rendering so hop dong do an ĐTPH page:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Lấy data của số hợp đồng đồ án
const getHopDongDoAnList = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    // Hỗ trợ cả param nam hoặc namHoc từ client
    let { dot, ki, namHoc: nh, nam, khoaList, heDaoTaoList, teacherName } = req.query;
    const namHoc = nh || nam;

    // Bắt buộc
    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }
    
    // Parse arrays từ query string nếu cần
    let parsedKhoaList = khoaList;
    let parsedHeDaoTaoList = heDaoTaoList;
    
    if (typeof khoaList === 'string') {
      try {
        parsedKhoaList = JSON.parse(khoaList);
      } catch (e) {
        parsedKhoaList = [khoaList];
      }
    }
    
    if (typeof heDaoTaoList === 'string') {
      try {
        parsedHeDaoTaoList = JSON.parse(heDaoTaoList);
      } catch (e) {
        parsedHeDaoTaoList = [heDaoTaoList];
      }
    }
    
    // Quyền khoa - override khoaList nếu user là khoa
    if (isKhoa == 1) {
      parsedKhoaList = [req.session.MaPhongBan];
    }

    connection = await createPoolConnection();

    // Build query cho đồ án từ bảng exportdoantotnghiep
    const whereClauses = [
      'ed.Dot = ?',
      'ed.ki = ?',
      'ed.NamHoc = ?'
    ];
    const params = [dot, ki, namHoc];

    // Thêm filter hệ đào tạo chỉ khi có giá trị cụ thể (không phải ALL, không empty, không undefined)
    if (parsedHeDaoTaoList && 
        Array.isArray(parsedHeDaoTaoList) && 
        parsedHeDaoTaoList.length > 0 && 
        !parsedHeDaoTaoList.includes('ALL') &&
        !parsedHeDaoTaoList.includes('') &&
        parsedHeDaoTaoList[0] !== '') {
      const placeholders = parsedHeDaoTaoList.map(() => '?').join(',');
      whereClauses.push(`ed.he_dao_tao IN (${placeholders})`);
      params.push(...parsedHeDaoTaoList);
    } else {
      // Skipped he_dao_tao filter - using all
    }

    // Thêm filter khoa chỉ khi có giá trị cụ thể (không phải ALL, không empty, không undefined)
    if (parsedKhoaList && 
        Array.isArray(parsedKhoaList) && 
        parsedKhoaList.length > 0 && 
        !parsedKhoaList.includes('ALL') &&
        !parsedKhoaList.includes('') &&
        parsedKhoaList[0] !== '') {
      const placeholders = parsedKhoaList.map(() => '?').join(',');
      whereClauses.push(`gv.MaPhongBan IN (${placeholders})`);
      params.push(...parsedKhoaList);
    } else {
      // Skipped khoa filter - using all
    }

    // Thêm filter theo tên giáo viên nếu có
    if (teacherName && teacherName.trim() !== '') {
      whereClauses.push('gv.HoTen LIKE ?');
      params.push(`%${teacherName}%`);
    }

    const whereSQL = whereClauses.length
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    let query = `
      SELECT
        ed.CCCD,
        gv.id_Gvm,
        gv.HoTen                          AS HoTen,
        MIN(ed.SoHopDong)                 AS SoHopDong,
        MIN(ed.SoThanhLyHopDong)          AS SoThanhLyHopDong,
        ed.Dot,
        ed.ki,
        ed.NamHoc,
        gv.MaPhongBan                     AS MaPhongBan,
        ed.he_dao_tao                     AS he_dao_tao
      FROM exportdoantotnghiep ed
      JOIN gvmoi gv ON ed.CCCD = gv.CCCD
      ${whereSQL}
      GROUP BY
        ed.CCCD,
        gv.id_Gvm,
        gv.HoTen,
        ed.Dot,
        ed.ki,
        ed.NamHoc,
        gv.MaPhongBan,
        ed.he_dao_tao
      ORDER BY
        gv.MaPhongBan,
        ed.he_dao_tao,
        gv.HoTen
    `;

    const [rows] = await connection.execute(query, params);

    // Hàm nhóm theo he_dao_tao và MaPhongBan
    const grouped = rows.reduce((acc, item) => {
      const he = item.he_dao_tao || 'Không xác định';
      const khoaKey = item.MaPhongBan || 'Khác';

      if (!acc[he]) {
        acc[he] = {};
      }
      if (!acc[he][khoaKey]) {
        acc[he][khoaKey] = [];
      }
      acc[he][khoaKey].push(item);
      return acc;
    }, {});

    return res.json({ success: true, data: grouped });
  } catch (error) {
    console.error("Error in getHopDongDoAnList:", error);
    return res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách hợp đồng đồ án" });
  } finally {
    if (connection) connection.release();
  }
};

// Preview số hợp đồng đồ án
const previewSoHopDongDoAn = async (req, res) => {
  let connection;
  try {
    const { dot, ki, nam, khoaList, heDaoTaoList, startingNumber, kiHieuTruocSo, kiHieuSauSo, kiHieuHopDong, kiHieuThanhLy, coSoDaoTao } = req.body;
    
    // Default kí hiệu
    const finalKiHieuHopDong = kiHieuHopDong || 'HĐ-ĐT';
    const finalKiHieuThanhLy = kiHieuThanhLy || 'HĐNT-ĐT';
    
    // Parse startingNumber và kí hiệu
    let startNum;
    let prefix = kiHieuTruocSo || '';
    let suffix = kiHieuSauSo || '';
    
    if (typeof startingNumber === 'string' && startingNumber.trim() !== '') {
      // Nếu là string, thử parse số từ giữa (format: prefix + số + suffix)
      const numberMatch = startingNumber.match(/(\d+)/);
      if (numberMatch) {
        startNum = parseInt(numberMatch[1], 10);
        // Nếu không có kiHieuTruocSo/sauSo từ request, thử extract từ startingNumber
        if (!kiHieuTruocSo && !kiHieuSauSo) {
          const beforeNumber = startingNumber.substring(0, numberMatch.index);
          const afterNumber = startingNumber.substring(numberMatch.index + numberMatch[0].length);
          prefix = beforeNumber;
          suffix = afterNumber;
        }
      } else {
        startNum = 1; // Default nếu không parse được
      }
    } else {
      startNum = parseInt(startingNumber, 10) || 1;
    }

    connection = await createPoolConnection();

    // --- Chỉ bắt buộc Dot, ki, NamHoc ---
    const whereClauses = [
      'ed.Dot = ?',
      'ed.ki = ?',
      'ed.NamHoc = ?'
    ];
    const params = [dot, ki, nam];

    // --- Thêm filter heDaoTaoList chỉ khi có giá trị cụ thể ---
    if (heDaoTaoList && 
        Array.isArray(heDaoTaoList) && 
        heDaoTaoList.length > 0 && 
        !heDaoTaoList.includes('ALL') &&
        !heDaoTaoList.includes('') &&
        heDaoTaoList[0] !== '') {
      const placeholders = heDaoTaoList.map(() => '?').join(',');
      whereClauses.push(`ed.he_dao_tao IN (${placeholders})`);
      params.push(...heDaoTaoList);
    } else {
      // Preview: Skipped he_dao_tao filter - using all
    }

    // --- Thêm filter khoaList chỉ khi có giá trị cụ thể ---
    if (khoaList && 
        Array.isArray(khoaList) && 
        khoaList.length > 0 && 
        !khoaList.includes('ALL') &&
        !khoaList.includes('') &&
        khoaList[0] !== '') {
      const placeholders = khoaList.map(() => '?').join(',');
      whereClauses.push(`gv.MaPhongBan IN (${placeholders})`);
      params.push(...khoaList);
    } else {
      // Preview: Skipped khoa filter - using all
    }

    const whereSQL = whereClauses.length
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    // --- Truy vấn nhóm + tổng hợp ---
    const query = `
      SELECT
        ed.CCCD,
        gv.id_Gvm,
        gv.HoTen                          AS HoTen,
        MIN(ed.SoHopDong)                 AS SoHopDong,
        MIN(ed.SoThanhLyHopDong)          AS SoThanhLyHopDong,
        ed.Dot,
        ed.ki,
        ed.NamHoc,
        gv.MaPhongBan                     AS Khoa,
        ed.he_dao_tao                     AS HeDaoTao
      FROM exportdoantotnghiep ed
      JOIN gvmoi gv
        ON ed.CCCD = gv.CCCD
      ${whereSQL}
      GROUP BY
        ed.CCCD,
        gv.id_Gvm,
        gv.HoTen,
        ed.Dot,
        ed.ki,
        ed.NamHoc,
        gv.MaPhongBan,
        ed.he_dao_tao
      ORDER BY
        gv.MaPhongBan,
        ed.he_dao_tao,
        gv.HoTen
    `;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {},
        message: 'Không tìm thấy hợp đồng đồ án nào phù hợp với điều kiện đã chọn'
      });
    }

    // Nhóm kết quả theo hệ đào tạo và khoa
    const grouped = rows.reduce((acc, item) => {
      const he = item.HeDaoTao || '';
      const khoaKey = item.Khoa || 'Khác';
      acc[he] = acc[he] || {};
      acc[he][khoaKey] = acc[he][khoaKey] || [];
      acc[he][khoaKey].push(item);
      return acc;
    }, {});

    // Khởi số bắt đầu và tăng dần liên tục
    // Format: [kí hiệu trước số][số 3 chữ số][kí hiệu sau số]
    let num = startNum;
    
    const result = {};

    Object.keys(grouped).sort().forEach(he => {
      result[he] = {};
      Object.keys(grouped[he]).sort().forEach(khoaKey => {
        result[he][khoaKey] = grouped[he][khoaKey].map(item => {
          const formattedNumber = String(num++).padStart(3, '0');
          const str = prefix + formattedNumber + suffix;
          return {
            ...item,
            newSoHopDong: `${str}/${finalKiHieuHopDong}`,
            newSoThanhLy: `${str}/${finalKiHieuThanhLy}`
          };
        });
      });
    });

    return res.json({ success: true, data: result });

  } catch (error) {
    console.error('Error previewing do an synchronized setup:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xem trước setup đồng bộ đồ án: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

const setupSoHopDongDoAn = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoaList, heDaoTaoList, startingNumber, kiHieuTruocSo, kiHieuSauSo, kiHieuHopDong, kiHieuThanhLy, coSoDaoTao, teacherName } = req.body;

    // Validate required input
    if (!dot || !ki || !nam) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học'
      });
    }

    // Validate ki hieu
    if (!kiHieuHopDong || !kiHieuThanhLy) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu kí hiệu hợp đồng hoặc kí hiệu thanh lý'
      });
    }

    // Parse startingNumber và kí hiệu
    // startingNumber có thể là số thuần hoặc đã format (string)
    let startNum;
    let prefix = kiHieuTruocSo || '';
    let suffix = kiHieuSauSo || '';
    
    if (typeof startingNumber === 'string' && startingNumber.trim() !== '') {
      // Nếu là string, thử parse số từ giữa (format: prefix + số + suffix)
      const numberMatch = startingNumber.match(/(\d+)/);
      if (numberMatch) {
        startNum = parseInt(numberMatch[1], 10);
        // Nếu không có kiHieuTruocSo/sauSo từ request, thử extract từ startingNumber
        if (!kiHieuTruocSo && !kiHieuSauSo) {
          const beforeNumber = startingNumber.substring(0, numberMatch.index);
          const afterNumber = startingNumber.substring(numberMatch.index + numberMatch[0].length);
          prefix = beforeNumber;
          suffix = afterNumber;
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Số bắt đầu không hợp lệ'
        });
      }
    } else {
      startNum = parseInt(startingNumber, 10);
    }

    if (!startNum || startNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Số bắt đầu phải lớn hơn hoặc bằng 1'
      });
    }

    // Default values
    const finalCoSoDaoTao = coSoDaoTao || 'Học viện Kỹ thuật mật mã';
    const parsedKhoaList = khoaList || [];
    const parsedHeDaoTaoList = heDaoTaoList || [];

    // Build query giống preview để lấy danh sách contracts
    const whereClauses = [
      'ed.Dot = ?',
      'ed.ki = ?',
      'ed.NamHoc = ?'
    ];
    const params = [dot, ki, nam];

    // Thêm điều kiện hệ đào tạo
    if (parsedHeDaoTaoList && 
        Array.isArray(parsedHeDaoTaoList) && 
        parsedHeDaoTaoList.length > 0 && 
        !parsedHeDaoTaoList.includes('ALL') &&
        !parsedHeDaoTaoList.includes('') &&
        parsedHeDaoTaoList[0] !== '') {
      const placeholders = parsedHeDaoTaoList.map(() => '?').join(',');
      whereClauses.push(`ed.he_dao_tao IN (${placeholders})`);
      params.push(...parsedHeDaoTaoList);
    }

    // Thêm điều kiện khoa
    if (parsedKhoaList && 
        Array.isArray(parsedKhoaList) && 
        parsedKhoaList.length > 0 && 
        !parsedKhoaList.includes('ALL') &&
        !parsedKhoaList.includes('') &&
        parsedKhoaList[0] !== '') {
      const placeholders = parsedKhoaList.map(() => '?').join(',');
      whereClauses.push(`gv.MaPhongBan IN (${placeholders})`);
      params.push(...parsedKhoaList);
    }

    // Thêm filter theo tên giáo viên nếu có
    if (teacherName && teacherName.trim() !== '') {
      whereClauses.push('gv.HoTen LIKE ?');
      params.push(`%${teacherName}%`);
    }

    const whereSQL = whereClauses.length
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    // Query giống preview - GROUP BY để lấy 1 record/CCCD
    const query = `
      SELECT
        ed.CCCD,
        gv.id_Gvm,
        gv.HoTen,
        gv.MaPhongBan,
        ed.he_dao_tao
      FROM exportdoantotnghiep ed
      JOIN gvmoi gv ON ed.CCCD = gv.CCCD
      ${whereSQL}
      GROUP BY
        ed.CCCD,
        gv.id_Gvm,
        gv.HoTen,
        gv.MaPhongBan,
        ed.he_dao_tao
      ORDER BY
        gv.MaPhongBan,
        ed.he_dao_tao,
        gv.HoTen
    `;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: 'Không tìm thấy hợp đồng đồ án nào phù hợp với điều kiện đã chọn'
      });
    }

    // Begin transaction
    await connection.beginTransaction();
    
    // Sử dụng số bắt đầu đã parse và kí hiệu trước/sau số
    let num = startNum;
    
    let updatedCount = 0;
    let failedCount = 0;

    // Sinh số HĐ và UPDATE từng contract
    // Format: [kí hiệu trước số][số 3 chữ số][kí hiệu sau số]
    for (const row of rows) {
      try {
        const formattedNumber = String(num++).padStart(3, '0');
        const str = prefix + formattedNumber + suffix;
        const newSoHopDong = `${str}/${kiHieuHopDong}`;
        const newSoThanhLy = `${str}/${kiHieuThanhLy}`;

        // UPDATE với CCCD chính xác
        const updateQuery = `
          UPDATE exportdoantotnghiep
          SET SoHopDong = ?, SoThanhLyHopDong = ?, CoSoDaoTao = ?
          WHERE Dot = ? AND ki = ? AND NamHoc = ? AND CCCD = ?
        `;
        const updateParams = [
          newSoHopDong,
          newSoThanhLy,
          finalCoSoDaoTao,
          dot,
          ki,
          nam,
          row.CCCD
        ];

        const [result] = await connection.execute(updateQuery, updateParams);
        
        if (result.affectedRows > 0) {
          updatedCount += result.affectedRows;
        } else {
          console.warn(`No do an records updated for CCCD: ${row.CCCD}`);
          failedCount++;
        }

      } catch (error) {
        console.error('Error updating do an contract for:', row.HoTen, error);
        failedCount++;
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Đã cập nhật số hợp đồng đồ án thành công',
      updatedCount,
      failedCount,
      totalProcessed: rows.length
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error setting up so hop dong do an:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số hợp đồng đồ án: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Lấy danh sách khoa cho multi-select
const getKhoaList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT MaPhongBan, TenPhongBan FROM phongban WHERE isKhoa = 1 ORDER BY MaPhongBan";
    const [result] = await connection.query(query);
    console.log('getKhoaList result:', result);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error getting khoa list:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách khoa"
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getSoHopDongPage,
  getSoHopDongDTPHPage,
  getHopDongList,
  setupSoHopDongToanBo,
  previewSoHopDongMoiGiang,

  getSoHopDongDoAnPage,
  getSoHopDongDoAnDTPHPage,
  previewSoHopDongDoAn,
  getHopDongDoAnList,
  setupSoHopDongDoAn,
  getKhoaList
};
