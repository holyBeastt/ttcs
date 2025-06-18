const createPoolConnection = require("../config/databasePool");

const getSoHopDongPage = async (req, res) => {
  try {
    // Render the contract numbers page
    res.render('hopdong.soHopDongMoiGiang.ejs', {
      title: 'Quản lý Số Hợp Đồng',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering so hop dong page:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getHopDongList = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    // Hỗ trợ cả param nam hoặc namHoc từ client
    let { dot, ki, namHoc: nh, nam, khoa, heDaoTao, teacherName } = req.query;
    const namHoc = nh || nam;

    // Bắt buộc
    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }
    // Quyền khoa
    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    // Build query giống exportMultipleContracts, bỏ điều kiện he_dao_tao mặc định
    let query = `
      SELECT
        hd.id_Gvm,
        hd.DienThoai,
        hd.Email,
        hd.MaSoThue,
        hd.DanhXung,
        hd.HoTen,
        hd.NgaySinh,
        hd.HocVi,
        hd.ChucVu,
        hd.HSL,
        hd.CCCD,
        hd.NoiCapCCCD,
        hd.DiaChi,
        hd.STK,
        hd.NganHang,
        MIN(hd.NgayBatDau) AS NgayBatDau,
        MAX(hd.NgayKetThuc) AS NgayKetThuc,
        SUM(hd.SoTiet) AS SoTiet,
        SUM(hd.SoTien) AS SoTien,
        SUM(hd.TruThue) AS TruThue,
        hd.NgayCap,
        SUM(hd.ThucNhan) AS ThucNhan,
        hd.NgayNghiemThu,
        hd.Dot,
        hd.KiHoc,
        hd.NamHoc,
        hd.MaPhongBan,
        hd.MaBoMon,
        hd.NoiCongTac,
        hd.he_dao_tao AS he_dao_tao
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

    // Thêm lọc hệ đào tạo nếu có
    if (heDaoTao && heDaoTao.trim() !== "") {
      query += ` AND hd.he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Lọc khoa nếu cần
    if (khoa && khoa !== "ALL") {
      query += ` AND hd.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
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
        hd.HoTen
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
    console.error("Error in getHopDongList:", error);
    return res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách hợp đồng" });
  } finally {
    if (connection) connection.release();
  }
};

// Setup số hợp đồng tự động tăng dần cho toàn bộ
const setupSoHopDongToanBo22 = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, startingNumber, contractsData } = req.body;

    // Validate input
    if (!dot || !ki || !nam || !startingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học, số bắt đầu'
      });
    }

    // Check if contractsData is provided (new approach)
    if (contractsData && Array.isArray(contractsData) && contractsData.length > 0) {
      // Use the contracts data extracted from the preview table
      console.log('Using contracts data from preview table:', contractsData.length, 'contracts');

      // Bắt đầu transaction
      await connection.beginTransaction(); let updatedCount = 0;
      let failedCount = 0;

      for (const contract of contractsData) {
        try {
          // Extract faculty and training program from groupInfo if available
          let extractedKhoa = '';
          let extractedHeDaoTao = '';

          if (contract.groupInfo) {
            const groupParts = contract.groupInfo.split(' - ');
            extractedKhoa = groupParts[0] || '';
            extractedHeDaoTao = groupParts[1] || '';
          }

          // Validate required fields from contract data
          if (!contract.HoTen || !contract.newSoHopDong || !contract.newSoThanhLy) {
            console.warn('Missing required fields in contract data:', contract);
            failedCount++;
            continue;
          }

          // Build UPDATE query with precise conditions: he_dao_tao, HoTen, id_Gvm
          let updateQuery = `
            UPDATE hopdonggvmoi 
            SET SoHopDong = ?, SoThanhLyHopDong = ? 
            WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND HoTen = ?
          `;
          let updateParams = [
            contract.newSoHopDong,
            contract.newSoThanhLy,
            dot,
            ki,
            nam,
            contract.HoTen
          ];

          // Add he_dao_tao condition if available in contract data or extracted from groupInfo
          const heDaoTaoToUse = contract.he_dao_tao || extractedHeDaoTao;
          if (heDaoTaoToUse && heDaoTaoToUse.trim() !== '' && heDaoTaoToUse !== 'Không xác định') {
            updateQuery += ` AND he_dao_tao = ?`;
            updateParams.push(heDaoTaoToUse);
          }

          // Add id_Gvm condition if available - this is the most precise identifier
          if (contract.id_Gvm) {
            updateQuery += ` AND id_Gvm = ?`;
            updateParams.push(contract.id_Gvm);
          }

          // Execute the update
          const [updateResult] = await connection.execute(updateQuery, updateParams);

          if (updateResult.affectedRows > 0) {
            updatedCount += updateResult.affectedRows;
            console.log(`Updated ${updateResult.affectedRows} records for teacher: ${contract.HoTen}, he_dao_tao: ${heDaoTaoToUse || 'N/A'}, id_Gvm: ${contract.id_Gvm || 'N/A'}`);
          } else {
            console.warn(`No records updated for teacher: ${contract.HoTen}, he_dao_tao: ${heDaoTaoToUse || 'N/A'}, id_Gvm: ${contract.id_Gvm || 'N/A'}`);
            failedCount++;
          }

        } catch (error) {
          console.error('Error updating contract for:', contract.HoTen, error);
          failedCount++;
          // Continue with other contracts even if one fails
        }
      }

      await connection.commit(); res.json({
        success: true,
        message: `Đã cập nhật số hợp đồng mời giảng thành công`,
        updatedCount,
        failedCount,
        totalProcessed: contractsData.length
      });

    } else {
      // Fallback to original approach if no contractsData provided
      console.log('No contracts data provided, using original database query approach');

      // Build query để lấy danh sách hợp đồng cần cập nhật, nhóm theo khoa và hệ đào tạo
      let query = `
        SELECT MaHopDong, id_Gvm, HoTen, MaPhongBan, he_dao_tao
        FROM hopdonggvmoi 
        WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?
      `;
      let params = [dot, ki, nam];

      if (khoa && khoa !== 'ALL') {
        query += ` AND MaPhongBan = ?`;
        params.push(khoa);
      }
      if (heDaoTao) {
        query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
      }

      // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên để đảm bảo số tăng dần theo từng nhóm
      query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

      const [rows] = await connection.execute(query, params);

      if (rows.length === 0) {
        return res.json({ success: false, message: 'Không tìm thấy hợp đồng nào phù hợp điều kiện' });
      }

      // Bắt đầu transaction
      await connection.beginTransaction();

      // Nhóm dữ liệu theo khoa và hệ đào tạo
      const groupedData = {};
      rows.forEach(row => {
        const key = `${row.MaPhongBan}_${row.he_dao_tao || 'null'}`;
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(row);
      });

      let currentNumber = parseInt(startingNumber);
      let updatedCount = 0;

      // Xử lý từng nhóm khoa-hệ đào tạo
      for (const groupKey in groupedData) {
        const group = groupedData[groupKey];

        for (const row of group) {
          // Validate row has required fields
          if (!row.MaHopDong) {
            console.error('Row missing MaHopDong field:', row);
            throw new Error('Database row missing required MaHopDong field');
          }

          const soHopDong = `${String(currentNumber).padStart(3, '0')}/HĐ-ĐT`;

          const updateQuery = `UPDATE hopdonggvmoi SET SoHopDong = ? WHERE MaHopDong = ?`;
          await connection.execute(updateQuery, [soHopDong, row.MaHopDong]);

          currentNumber++;
          updatedCount++;
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Đã cập nhật số hợp đồng mời giảng thành công`,
        updatedCount
      });
    }

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error setting up so hop dong toan bo:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số hợp đồng: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const setupSoHopDongToanBo = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, contractsData } = req.body;

    // Validate required input
    if (!dot || !ki || !nam) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học'
      });
    }

    // Require contract data to proceed
    if (!contractsData || !Array.isArray(contractsData) || contractsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu hợp đồng để cập nhật'
      });
    }

    // Begin transaction
    await connection.beginTransaction();
    let updatedCount = 0;
    let failedCount = 0;

    for (const contract of contractsData) {
      try {
        // Extract training program if provided
        let extractedHeDaoTao = '';
        if (contract.groupInfo) {
          const [, heDao] = contract.groupInfo.split(' - ');
          extractedHeDaoTao = heDao || '';
        }

        // Validate required fields
        if (!contract.HoTen || !contract.newSoHopDong || !contract.newSoThanhLy) {
          console.warn('Missing required fields in contract data:', contract);
          failedCount++;
          continue;
        }

        // Build update query
        let updateQuery = `
          UPDATE hopdonggvmoi
          SET SoHopDong = ?, SoThanhLyHopDong = ?
          WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND HoTen = ?
        `;
        const params = [
          contract.newSoHopDong,
          contract.newSoThanhLy,
          dot,
          ki,
          nam,
          contract.HoTen
        ];

        // Conditionally add he_dao_tao
        const heDaoTaoToUse = contract.he_dao_tao || extractedHeDaoTao;
        if (heDaoTaoToUse && heDaoTaoToUse.trim() && heDaoTaoToUse !== 'Không xác định') {
          updateQuery += ' AND he_dao_tao = ?';
          params.push(heDaoTaoToUse);
        }

        // Conditionally add id_Gvm
        if (contract.id_Gvm) {
          updateQuery += ' AND id_Gvm = ?';
          params.push(contract.id_Gvm);
        }

        const [result] = await connection.execute(updateQuery, params);
        if (result.affectedRows > 0) {
          updatedCount += result.affectedRows;
        } else {
          failedCount++;
        }

      } catch (error) {
        console.error('Error updating contract for:', contract.HoTen, error);
        failedCount++;
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Đã cập nhật số hợp đồng mời giảng thành công',
      updatedCount,
      failedCount,
      totalProcessed: contractsData.length
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
    const { dot, ki, nam, khoa, heDaoTao, startingNumber } = req.body;

    connection = await createPoolConnection();

    // Build query với điều kiện WHERE đúng vị trí
    let whereConditions = 'WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?';
    const params = [dot, ki, nam];

    // Thêm điều kiện hệ đào tạo vào subquery
    if (heDaoTao && heDaoTao.trim() !== '') {
      whereConditions += ' AND he_dao_tao = ?';
      params.push(heDaoTao);
    }

    // Thêm điều kiện khoa vào subquery
    if (khoa && khoa !== 'ALL') {
      whereConditions += ' AND MaPhongBan = ?';
      params.push(khoa);
    }

    let query = `
      SELECT
        hd.id_Gvm,
        hd.HoTen,
        hd.SoHopDong,
        hd.SoThanhLyHopDong,
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
      GROUP BY hd.CCCD, hd.id_Gvm, hd.HoTen
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

    // Khởi số bắt đầu 1 lần duy nhất, rồi tăng dần liên tục
    let num = parseInt(startingNumber || 1, 10);
    const result = {};

    Object.keys(grouped).sort().forEach(he => {
      result[he] = {};
      Object.keys(grouped[he]).sort().forEach(khoaKey => {
        result[he][khoaKey] = grouped[he][khoaKey].map(item => {
          const str = String(num++).padStart(3, '0');
          return {
            ...item,
            newSoHopDong: `${str}/HĐ-ĐT`,
            newSoThanhLy: `${str}/HĐNT-ĐT`
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
      title: 'Số đồ án',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering so hop dong do an page:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Lấy data của số hợp đồng đồ án
const getHopDongDoAnList = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    // Hỗ trợ cả param nam hoặc namHoc từ client
    let { dot, ki, namHoc: nh, nam, khoa, heDaoTao, teacherName } = req.query;
    const namHoc = nh || nam;

    // Bắt buộc
    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }
    // Quyền khoa
    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    // Build query cho đồ án từ bảng exportdoantotnghiep
    const whereClauses = [
      'ed.Dot = ?',
      'ed.ki = ?',
      'ed.NamHoc = ?'
    ];
    const params = [dot, ki, namHoc];

    // Thêm filter hệ đào tạo nếu có
    if (heDaoTao && heDaoTao.trim() !== '') {
      whereClauses.push('ed.he_dao_tao = ?');
      params.push(heDaoTao.trim());
    }

    // Thêm filter khoa nếu không phải "ALL"
    if (khoa && khoa !== 'ALL') {
      whereClauses.push('gv.MaPhongBan LIKE ?');
      params.push(`%${khoa}%`);
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
    const { dot, ki, nam, khoa, heDaoTao, startingNumber } = req.body;

    connection = await createPoolConnection();

    // --- Chỉ bắt buộc Dot, ki, NamHoc ---
    const whereClauses = [
      'ed.Dot = ?',
      'ed.ki = ?',
      'ed.NamHoc = ?'
    ];
    const params = [dot, ki, nam];

    // --- Thêm filter he_dao_tao nếu có ---
    if (heDaoTao && heDaoTao.trim() !== '') {
      whereClauses.push('ed.he_dao_tao = ?');
      params.push(heDaoTao.trim());
    }

    // --- Thêm filter khoa nếu không phải "ALL" ---
    if (khoa && khoa !== 'ALL') {
      whereClauses.push('gv.MaPhongBan LIKE ?');
      params.push(`%${khoa}%`);
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

    // Gán số hợp đồng liên tục
    let num = parseInt(startingNumber || '1', 10);
    const result = {};

    Object.keys(grouped).sort().forEach(he => {
      result[he] = {};
      Object.keys(grouped[he]).sort().forEach(khoaKey => {
        result[he][khoaKey] = grouped[he][khoaKey].map(item => {
          const str = String(num++).padStart(3, '0');
          return {
            ...item,
            newSoHopDong: `${str}/HĐ-ĐT`,
            newSoThanhLy: `${str}/HĐNT-ĐT`
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

// Setup số hợp đồng đồ án tự động tăng dần
const setupSoHopDongDoAn22 = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, startingNumber, contractsData } = req.body;

    // Validate input
    if (!dot || !ki || !nam || !startingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học, số bắt đầu'
      });
    }

    // Check if contractsData is provided (new approach)
    if (contractsData && Array.isArray(contractsData) && contractsData.length > 0) {
      // Use the contracts data extracted from the preview table
      await connection.beginTransaction();
      let updatedCount = 0;
      let failedCount = 0;

      for (const contract of contractsData) {
        try {
          // Extract faculty and training program from groupInfo if available
          let extractedKhoa = '';
          let extractedHeDaoTao = '';

          if (contract.groupInfo) {
            const groupParts = contract.groupInfo.split(' - ');
            extractedKhoa = groupParts[0] || '';
            extractedHeDaoTao = groupParts[1] || '';
          }// Validate required fields from contract data
          if (!contract.HoTen || !contract.newSoHopDong || !contract.newSoThanhLy) {
            failedCount++;
            continue;
          }

          // Validate CCCD is not undefined
          if (!contract.CCCD) {
            failedCount++;
            continue;
          }

          // Build UPDATE query for exportdoantotnghiep table with precise conditions
          let updateQuery = `
            UPDATE exportdoantotnghiep 
            SET SoHopDong = ?, SoThanhLyHopDong = ? 
            WHERE Dot = ? AND ki = ? AND NamHoc = ? AND CCCD = ?
          `;
          let updateParams = [
            contract.newSoHopDong || null,
            contract.newSoThanhLy || null,
            dot || null,
            ki || null,
            nam || null,
            contract.CCCD || null
          ];          // Add he_dao_tao condition if available in contract data or extracted from groupInfo
          const heDaoTaoToUse = contract.he_dao_tao || extractedHeDaoTao;
          if (heDaoTaoToUse && heDaoTaoToUse.trim() !== '' && heDaoTaoToUse !== 'Không xác định') {
            updateQuery += ` AND he_dao_tao = ?`;
            updateParams.push(heDaoTaoToUse || null);
          }
          // Check for undefined values in parameters
          const hasUndefined = updateParams.some(param => param === undefined);
          if (hasUndefined) {
            console.error('Found undefined parameter for:', contract.HoTen, updateParams);
            failedCount++;
            continue;
          }

          // Execute the update
          const [updateResult] = await connection.execute(updateQuery, updateParams);

          if (updateResult.affectedRows > 0) {
            updatedCount += updateResult.affectedRows;
            console.log(`Updated ${updateResult.affectedRows} do an records for teacher: ${contract.HoTen}, CCCD: ${contract.CCCD}, he_dao_tao: ${heDaoTaoToUse || 'N/A'}`);
          } else {
            console.warn(`No do an records updated for teacher: ${contract.HoTen}, CCCD: ${contract.CCCD}, he_dao_tao: ${heDaoTaoToUse || 'N/A'}`);
            failedCount++;
          }

        } catch (error) {
          console.error('Error updating do an contract for:', contract.HoTen, error);
          failedCount++;
          // Continue with other contracts even if one fails
        }
      }

      await connection.commit();
      res.json({
        success: true,
        message: `Đã cập nhật số hợp đồng đồ án thành công`,
        updatedCount,
        failedCount,
        totalProcessed: contractsData.length
      });

    } else {
      // Fallback to original approach if no contractsData provided
      console.log('No contracts data provided, using original database query approach for do an');

      // Build query để lấy danh sách hợp đồng đồ án cần cập nhật
      const whereClauses = [
        'ed.Dot = ?',
        'ed.ki = ?',
        'ed.NamHoc = ?'
      ];
      let params = [dot, ki, nam];

      if (khoa && khoa !== 'ALL') {
        whereClauses.push('gv.MaPhongBan = ?');
        params.push(khoa);
      }
      if (heDaoTao) {
        whereClauses.push('ed.he_dao_tao = ?');
        params.push(heDaoTao);
      }

      const whereSQL = 'WHERE ' + whereClauses.join(' AND ');

      let query = `
        SELECT ed.CCCD, ed.he_dao_tao, gv.HoTen, gv.MaPhongBan
        FROM exportdoantotnghiep ed
        JOIN gvmoi gv ON ed.CCCD = gv.CCCD
        ${whereSQL}
        ORDER BY gv.MaPhongBan, ed.he_dao_tao, gv.HoTen
      `;

      const [rows] = await connection.execute(query, params);

      if (rows.length === 0) {
        return res.json({ success: false, message: 'Không tìm thấy hợp đồng đồ án nào phù hợp điều kiện' });
      }

      // Bắt đầu transaction
      await connection.beginTransaction();

      // Nhóm dữ liệu theo khoa và hệ đào tạo
      const groupedData = {};
      rows.forEach(row => {
        const key = `${row.MaPhongBan}_${row.he_dao_tao || 'null'}`;
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(row);
      });

      let currentNumber = parseInt(startingNumber);
      let updatedCount = 0;

      // Xử lý từng nhóm khoa-hệ đào tạo
      for (const groupKey in groupedData) {
        const group = groupedData[groupKey];

        for (const row of group) {
          const soHopDong = `${String(currentNumber).padStart(3, '0')}/HĐ-ĐT`;
          const soThanhLy = `${String(currentNumber).padStart(3, '0')}/TLHĐ-ĐT`;

          const updateQuery = `
            UPDATE exportdoantotnghiep 
            SET SoHopDong = ?, SoThanhLyHopDong = ? 
            WHERE CCCD = ? AND Dot = ? AND ki = ? AND NamHoc = ? AND he_dao_tao = ?
          `;
          await connection.execute(updateQuery, [soHopDong, soThanhLy, row.CCCD, dot, ki, nam, row.he_dao_tao]);

          currentNumber++;
          updatedCount++;
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Đã cập nhật số hợp đồng đồ án thành công`,
        updatedCount
      });
    }

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error setting up so hop dong do an:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số hợp đồng đồ án: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const setupSoHopDongDoAn = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, contractsData } = req.body;

    // Validate required input
    if (!dot || !ki || !nam) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học'
      });
    }

    // Require contract data to proceed
    if (!contractsData || !Array.isArray(contractsData) || contractsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu hợp đồng đồ án để cập nhật'
      });
    }

    // Begin transaction
    await connection.beginTransaction();
    let updatedCount = 0;
    let failedCount = 0;

    for (const contract of contractsData) {
      try {
        // Extract training program if provided
        let extractedHeDaoTao = '';
        if (contract.groupInfo) {
          const [, heDao] = contract.groupInfo.split(' - ');
          extractedHeDaoTao = heDao || '';
        }

        // Validate required fields
        if (!contract.HoTen || !contract.newSoHopDong || !contract.newSoThanhLy) {
          console.warn('Missing required fields in contract data:', contract);
          failedCount++;
          continue;
        }

        // Validate CCCD
        if (!contract.CCCD) {
          console.warn('Missing CCCD in contract data:', contract);
          failedCount++;
          continue;
        }

        // Build update query
        let updateQuery = `
          UPDATE exportdoantotnghiep
          SET SoHopDong = ?, SoThanhLyHopDong = ?
          WHERE Dot = ? AND ki = ? AND NamHoc = ? AND CCCD = ?
        `;
        const params = [
          contract.newSoHopDong,
          contract.newSoThanhLy,
          dot,
          ki,
          nam,
          contract.CCCD
        ];

        // Conditionally add he_dao_tao
        const heDaoTaoToUse = contract.he_dao_tao || extractedHeDaoTao;
        if (heDaoTaoToUse && heDaoTaoToUse.trim() && heDaoTaoToUse !== 'Không xác định') {
          updateQuery += ' AND he_dao_tao = ?';
          params.push(heDaoTaoToUse);
        }

        // Check for undefined params
        if (params.some(p => p === undefined)) {
          console.error('Found undefined parameter for:', contract.HoTen, params);
          failedCount++;
          continue;
        }

        // Execute update
        const [result] = await connection.execute(updateQuery, params);
        if (result.affectedRows > 0) {
          updatedCount += result.affectedRows;
        } else {
          console.warn(`No do an records updated for CCCD: ${contract.CCCD}`);
          failedCount++;
        }

      } catch (error) {
        console.error('Error updating do an contract for:', contract.HoTen, error);
        failedCount++;
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Đã cập nhật số hợp đồng đồ án thành công',
      updatedCount,
      failedCount,
      totalProcessed: contractsData.length
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error setting up so hop dong do an:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số hợp đồng đồ án: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getSoHopDongPage,
  getHopDongList,
  setupSoHopDongToanBo,
  previewSoHopDongMoiGiang,

  getSoHopDongDoAnPage,
  previewSoHopDongDoAn,
  getHopDongDoAnList,
  setupSoHopDongDoAn
};
