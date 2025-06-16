const createPoolConnection = require("../config/databasePool");
const ExcelJS = require("exceljs");

const updateDoAn = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    for (const update of updates) {
      const { data, colName, newValue } = update;
      
      const query = `
        UPDATE doan 
        SET ${colName} = ? 
        WHERE Khoa = ? 
        AND Dot = ? 
        AND KiHoc = ? 
        AND NamHoc = ? 
        AND LopHocPhan = ?
        AND he_dao_tao = ?
      `;

      await connection.query(query, [
        newValue,
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan,
        data.he_dao_tao
      ]);
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Cập nhật dữ liệu thành công!"
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật dữ liệu!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const requestDoAnEdit = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    for (const update of updates) {
      const { data, colName, newValue, originalValue } = update;
      
      const checkQuery = `
        SELECT id FROM do_an_edit_requests 
        WHERE khoa = ? 
        AND dot = ? 
        AND ki_hoc = ? 
        AND nam_hoc = ? 
        AND lop_hoc_phan = ?
        AND he_dao_tao = ?
        AND status IS NULL
      `;
      
      const [existingRequests] = await connection.query(checkQuery, [
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan,
        data.he_dao_tao
      ]);

      if (existingRequests.length > 0) {
        const updateQuery = `
          UPDATE do_an_edit_requests 
          SET old_value = ?, 
              new_value = ?,
              created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        await connection.query(updateQuery, [
          originalValue,
          newValue,
          existingRequests[0].id
        ]);
      } else {
        const insertQuery = `
          INSERT INTO do_an_edit_requests 
          (khoa, dot, ki_hoc, nam_hoc, lop_hoc_phan, he_dao_tao, column_name, old_value, new_value)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.query(insertQuery, [
          data.Khoa,
          data.Dot,
          data.KiHoc,
          data.NamHoc,
          data.LopHocPhan,
          data.he_dao_tao,
          colName,
          originalValue,
          newValue
        ]);
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Yêu cầu chỉnh sửa đã được gửi thành công!"
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi gửi yêu cầu chỉnh sửa:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi gửi yêu cầu chỉnh sửa!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getDoAnEditRequests = async (req, res) => {
  const { dot, ki_hoc, nam_hoc, khoa, he_dao_tao } = req.body;
  
  let connection;

  try {
    connection = await createPoolConnection();

    let query = `
      SELECT 
        id,
        khoa,
        dot,
        ki_hoc,
        nam_hoc,
        lop_hoc_phan,
        he_dao_tao,
        column_name,
        old_value,
        new_value,
        khoa_duyet,
        daotao_duyet,
        bgd_duyet,
        status,
        created_at
      FROM do_an_edit_requests 
      WHERE 1=1
    `;
    const queryParams = [];

    if (dot) {
      query += " AND dot = ?";
      queryParams.push(dot);
    }
    if (ki_hoc) {
      query += " AND ki_hoc = ?";
      queryParams.push(ki_hoc);
    }
    if (nam_hoc) {
      query += " AND nam_hoc = ?";
      queryParams.push(nam_hoc);
    }
    if (khoa && khoa !== "ALL") {
      query += " AND khoa = ?";
      queryParams.push(khoa);
    }
    if (he_dao_tao) {
      query += " AND he_dao_tao = ?";
      queryParams.push(he_dao_tao);
    }

    query += " ORDER BY created_at DESC";

    const [requests] = await connection.query(query, queryParams);

    res.json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu chỉnh sửa:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy danh sách yêu cầu chỉnh sửa!",
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const updateDoAnApproval = async (req, res) => {
  const { requestId, approvalType, isApproved } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const updateQuery = `
      UPDATE do_an_edit_requests 
      SET ${approvalType}_duyet = ? 
      WHERE id = ?
    `;
    await connection.query(updateQuery, [isApproved, requestId]);

    const checkQuery = `
      SELECT khoa_duyet, daotao_duyet, bgd_duyet 
      FROM do_an_edit_requests 
      WHERE id = ?
    `;
    const [approvals] = await connection.query(checkQuery, [requestId]);
    
    const allApproved = approvals[0].khoa_duyet && 
                       approvals[0].daotao_duyet && 
                       approvals[0].bgd_duyet;

    await connection.commit();

    res.json({
      success: true,
      allApproved,
      requestId
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi cập nhật trạng thái duyệt:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật trạng thái duyệt!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const applyDoAnEdit = async (req, res) => {
  const { requestId } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const [request] = await connection.query(
      "SELECT * FROM do_an_edit_requests WHERE id = ?",
      [requestId]
    );

    if (!request[0]) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }

    const updateQuery = `
      UPDATE doan 
      SET ${request[0].column_name} = ? 
      WHERE Khoa = ? 
      AND Dot = ? 
      AND KiHoc = ? 
      AND NamHoc = ? 
      AND LopHocPhan = ?
      AND he_dao_tao = ?
    `;

    await connection.query(updateQuery, [
      request[0].new_value,
      request[0].khoa,
      request[0].dot,
      request[0].ki_hoc,
      request[0].nam_hoc,
      request[0].lop_hoc_phan,
      request[0].he_dao_tao
    ]);

    await connection.query(
      "UPDATE do_an_edit_requests SET status = 'Cập nhật thành công' WHERE id = ?",
      [requestId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Chỉnh sửa đã được cập nhật thành công!"
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi cập nhật chỉnh sửa:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật chỉnh sửa!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const exportAdjustedDoAn = async (req, res) => {
  const connection = await createPoolConnection();
  try {
    const { khoa, dot, ki_hoc, nam_hoc, he_dao_tao } = req.body;

    const [rows] = await connection.query(
      `SELECT * FROM do_an_edit_requests 
       WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? 
       ${khoa && khoa !== 'ALL' ? 'AND khoa = ?' : ''}
       ${he_dao_tao ? 'AND he_dao_tao = ?' : ''}`,
      khoa && khoa !== 'ALL' ? [dot, ki_hoc, nam_hoc, khoa, he_dao_tao] : [dot, ki_hoc, nam_hoc, he_dao_tao]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Cấu hình trang
    worksheet.pageSetup.paperSize = 9;
    worksheet.pageSetup.orientation = 'landscape';
    worksheet.pageSetup.fitToPage = true;
    worksheet.pageSetup.fitToWidth = 1;
    worksheet.pageSetup.fitToHeight = 0;
    worksheet.pageSetup.margins = {
      left: 0.3149,
      right: 0.3149,
      top: 0.3149,
      bottom: 0.3149,
      header: 0.3149,
      footer: 0.3149
    };

    // Thêm header
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { bold: true, size: 14, name: 'Times New Roman' };

    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = 'Độc lập – Tự do – Hạnh phúc';
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A2').font = { bold: true, size: 14, name: 'Times New Roman' };

    // Thêm tiêu đề đơn
    worksheet.mergeCells('A4:D4');
    worksheet.getCell('A4').value = 'ĐƠN ĐỀ NGHỊ';
    worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A4').font = { bold: true, size: 14, name: 'Times New Roman' };

    // Thêm dữ liệu
    const headers = [
      'Khoa', 'Đợt', 'Kì', 'Năm', 'Lớp học phần', 'Hệ đào tạo',
      'Giảng viên theo TKB', 'Giảng viên điều chỉnh',
      'Khoa duyệt', 'Đào tạo duyệt', 'BGD duyệt', 'Trạng thái'
    ];

    worksheet.addRow(headers);

    rows.forEach(row => {
      worksheet.addRow([
        row.khoa,
        row.dot,
        row.ki_hoc,
        row.nam_hoc,
        row.lop_hoc_phan,
        row.he_dao_tao,
        row.old_value,
        row.new_value,
        row.khoa_duyet ? 'Đã duyệt' : 'Chưa duyệt',
        row.daotao_duyet ? 'Đã duyệt' : 'Chưa duyệt',
        row.bgd_duyet ? 'Đã duyệt' : 'Chưa duyệt',
        row.status || 'Chưa ban hành'
      ]);
    });

    // Gửi file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=do_an_dieu_chinh.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Lỗi khi xuất file:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xuất file!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getDoAnChinhThuc = async (req, res) => {
  const { Khoa, Dot, Ki, Nam, he_dao_tao } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();

    let query = `
      SELECT 
        ID,
        SinhVien,
        MaSV,
        MaPhongBan,
        TenDeTai,
        GiangVien,
        NgayBatDau,
        NgayKetThuc,
        NamHoc,
        Dot,
        ki,
        he_dao_tao,
        SoNguoi,
        SoTiet,
        HocVi,
        ChucVu
      FROM exportdoantotnghiep 
      WHERE 1=1
    `;
    const queryParams = [];

    if (Khoa && Khoa !== "ALL") {
      query += " AND MaPhongBan = ?";
      queryParams.push(Khoa);
    }
    if (Dot) {
      query += " AND Dot = ?";
      queryParams.push(Dot);
    }
    if (Ki) {
      query += " AND ki = ?";
      queryParams.push(Ki);
    }
    if (Nam) {
      query += " AND NamHoc = ?";
      queryParams.push(Nam);
    }
    if (he_dao_tao) {
      query += " AND he_dao_tao = ?";
      queryParams.push(he_dao_tao);
    }

    const [rows] = await connection.query(query, queryParams);
    res.json(rows);

  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu đồ án:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy dữ liệu đồ án!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  updateDoAn,
  requestDoAnEdit,
  getDoAnEditRequests,
  updateDoAnApproval,
  applyDoAnEdit,
  exportAdjustedDoAn,
  getDoAnChinhThuc
};