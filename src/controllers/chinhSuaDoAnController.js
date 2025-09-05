const createPoolConnection = require("../config/databasePool");
const ExcelJS = require("exceljs");

// Hàm ghi log thay đổi thông tin đồ án
const logDoAnChanges = async (connection, oldData, newData, req) => {
  try {
    let changeMessage = '';
    const loaiThongTin = 'Thay đổi thông tin đồ án';
    const userId = req.session?.userId || req.session?.userInfo?.ID || req.user?.id || 1;
    const tenNhanVien = req.session?.TenNhanVien || req.session?.userInfo?.TenNhanVien || req.user?.TenNhanVien || 'Unknown';
    const khoa = req.session?.MaPhongBan || req.session?.userInfo?.MaPhongBan || req.user?.MaPhongBan || req.session?.Khoa || req.user?.Khoa || 'Unknown';
    // Kiểm tra cột GiangVien1
    if (String(oldData.GiangVien1 || '') !== String(newData.GiangVien1 || '')) {
      changeMessage = changeMessage + `Giảng Viên 1 cho đồ án "${newData.TenDeTai}": từ "${oldData.GiangVien1 || ''}" thành "${newData.GiangVien1 || ''}". `;
    }

    // Kiểm tra cột GiangVien2
    if (String(oldData.GiangVien2 || '') !== String(newData.GiangVien2 || '')) {
      changeMessage = changeMessage + `Giảng Viên 2 cho đồ án "${newData.TenDeTai}": từ "${oldData.GiangVien2 || ''}" thành "${newData.GiangVien2 || ''}". `;
    }

    // Kiểm tra trạng thái duyệt khoa
    console.log(`🔍 Checking KhoaDuyet: old=${oldData.KhoaDuyet} (${typeof oldData.KhoaDuyet}) vs new=${newData.KhoaDuyet} (${typeof newData.KhoaDuyet})`);
    if (Number(oldData.KhoaDuyet) !== Number(newData.KhoaDuyet)) {
      console.log(`✅ KhoaDuyet changed!`);
      if (Number(oldData.KhoaDuyet) === 0 && Number(newData.KhoaDuyet) === 1) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.KhoaDuyet) === 1 && Number(newData.KhoaDuyet) === 0) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }

    // Kiểm tra trạng thái duyệt đào tạo
    console.log(`🔍 Checking DaoTaoDuyet: old=${oldData.DaoTaoDuyet} (${typeof oldData.DaoTaoDuyet}) vs new=${newData.DaoTaoDuyet} (${typeof newData.DaoTaoDuyet})`);
    if (Number(oldData.DaoTaoDuyet) !== Number(newData.DaoTaoDuyet)) {
      console.log(`✅ DaoTaoDuyet changed!`);
      if (Number(oldData.DaoTaoDuyet) === 0 && Number(newData.DaoTaoDuyet) === 1) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.DaoTaoDuyet) === 1 && Number(newData.DaoTaoDuyet) === 0) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }

    // Kiểm tra trạng thái duyệt tài chính
    console.log(`🔍 Checking TaiChinhDuyet: old=${oldData.TaiChinhDuyet} (${typeof oldData.TaiChinhDuyet}) vs new=${newData.TaiChinhDuyet} (${typeof newData.TaiChinhDuyet})`);
    if (Number(oldData.TaiChinhDuyet) !== Number(newData.TaiChinhDuyet)) {
      console.log(`✅ TaiChinhDuyet changed!`);
      if (Number(oldData.TaiChinhDuyet) === 0 && Number(newData.TaiChinhDuyet) === 1) {
        changeMessage = changeMessage + `Tài chính thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.TaiChinhDuyet) === 1 && Number(newData.TaiChinhDuyet) === 0) {
        changeMessage = changeMessage + `Tài chính thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }
    
    // Kiểm tra ngày bắt đầu - xử lý chuẩn hóa định dạng trước khi so sánh
    let oldStartDate = '';
    let newStartDate = '';
    
    if (oldData.NgayBatDau) {
      const oldStartDateObj = new Date(oldData.NgayBatDau);
      if (!isNaN(oldStartDateObj.getTime())) {
        // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
        oldStartDateObj.setDate(oldStartDateObj.getDate() + 1);
        oldStartDate = oldStartDateObj.toISOString().split('T')[0];
      }
    }
    
    if (newData.NgayBatDau) {
      // Kiểm tra nếu newData.NgayBatDau đã là chuỗi ngày 'YYYY-MM-DD'
      if (typeof newData.NgayBatDau === 'string' && newData.NgayBatDau.match(/^\d{4}-\d{2}-\d{2}$/)) {
        newStartDate = newData.NgayBatDau;
      } else {
        const newStartDateObj = new Date(newData.NgayBatDau);
        if (!isNaN(newStartDateObj.getTime())) {
          // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
          newStartDateObj.setDate(newStartDateObj.getDate() + 1);
          newStartDate = newStartDateObj.toISOString().split('T')[0];
        }
      }
    }
    if (oldStartDate !== newStartDate) {
      changeMessage = changeMessage + `Thay đổi ngày bắt đầu cho đồ án "${newData.TenDeTai}": từ "${oldStartDate}" thành "${newStartDate}". `;
    }
    
    // Kiểm tra ngày kết thúc - xử lý chuẩn hóa định dạng trước khi so sánh
    let oldEndDate = '';
    let newEndDate = '';
    
    if (oldData.NgayKetThuc) {
      const oldEndDateObj = new Date(oldData.NgayKetThuc);
      if (!isNaN(oldEndDateObj.getTime())) {
        // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
        oldEndDateObj.setDate(oldEndDateObj.getDate() + 1);
        oldEndDate = oldEndDateObj.toISOString().split('T')[0];
      }
    }
    
    if (newData.NgayKetThuc) {
      // Kiểm tra nếu newData.NgayKetThuc đã là chuỗi ngày 'YYYY-MM-DD'
      if (typeof newData.NgayKetThuc === 'string' && newData.NgayKetThuc.match(/^\d{4}-\d{2}-\d{2}$/)) {
        newEndDate = newData.NgayKetThuc;
      } else {
        const newEndDateObj = new Date(newData.NgayKetThuc);
        if (!isNaN(newEndDateObj.getTime())) {
          // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
          newEndDateObj.setDate(newEndDateObj.getDate() + 1);
          newEndDate = newEndDateObj.toISOString().split('T')[0];
        }
      }
    }
    
    if (oldEndDate !== newEndDate) {
      changeMessage = changeMessage + `Thay đổi ngày kết thúc cho đồ án "${newData.TenDeTai}": từ "${oldEndDate}" thành "${newEndDate}". `;
    }

    // Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
    console.log(`📝 Final changeMessage: "${changeMessage}"`);
    if (changeMessage !== '') {
      console.log(`💾 Writing log to database...`);
      const insertQuery = `
        INSERT INTO lichsunhaplieu 
        (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      await connection.query(insertQuery, [
        userId,
        tenNhanVien,
        khoa,
        loaiThongTin,
        changeMessage
      ]);

      console.log(`✅ Log written successfully!`);
      return true;
    } else {
      console.log(`❌ No changes detected, no log written.`);
    }

    return false;
  } catch (error) {
    console.error("Lỗi khi ghi log thay đổi:", error);
    return false;
  }
};

const updateDoAn = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    for (const update of updates) {
      const { data, colName, newValue } = update;
      
      // Lấy dữ liệu hiện tại trước khi cập nhật để so sánh
      const [currentDataRows] = await connection.query(
        `SELECT * FROM doantotnghiep WHERE MaPhongBan = ? AND Dot = ? AND ki = ? AND NamHoc = ? AND TenDeTai = ? AND he_dao_tao = ? LIMIT 1`,
        [
          data.Khoa,
          data.Dot,
          data.KiHoc,
          data.NamHoc,
          data.LopHocPhan,
          data.he_dao_tao
        ]
      );
      
      if (currentDataRows.length === 0) {
        continue; // Bỏ qua nếu không tìm thấy bản ghi
      }
      
      const oldData = currentDataRows[0];
      
      // Tạo bản sao của dữ liệu cũ để cập nhật giá trị mới
      const newData = {...oldData};
      newData[colName] = newValue;
      
      // Cập nhật dữ liệu
      const query = `
        UPDATE doantotnghiep 
        SET ${colName} = ? 
        WHERE MaPhongBan = ? 
        AND Dot = ? 
        AND ki = ? 
        AND NamHoc = ? 
        AND TenDeTai = ?
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
      
      // Ghi log thay đổi
      await logDoAnChanges(connection, oldData, newData, req);
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
      
      // Kiểm tra xem có yêu cầu chỉnh sửa nào đang chờ duyệt cho cùng một lớp học phần không
      const checkQuery = `
        SELECT id, new_value 
        FROM do_an_edit_requests 
        WHERE khoa = ? 
        AND dot = ? 
        AND ki_hoc = ? 
        AND nam_hoc = ? 
        AND lop_hoc_phan = ?
        AND he_dao_tao = ?
        AND status IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const [existingRequests] = await connection.query(checkQuery, [
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan,
        data.he_dao_tao
      ]);

      // Nếu có yêu cầu đang chờ duyệt, cập nhật yêu cầu đó
      if (existingRequests.length > 0) {
        // Kiểm tra xem giá trị mới có khác với giá trị đã yêu cầu trước đó không
        if (existingRequests[0].new_value !== newValue) {
          const updateQuery = `
            UPDATE do_an_edit_requests 
            SET old_value = ?, 
                new_value = ?,
                created_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          
          await connection.query(updateQuery, [
            existingRequests[0].new_value, // Lấy giá trị mới của lần chỉnh sửa trước làm giá trị cũ
            newValue,
            existingRequests[0].id
          ]);
        }
      } else {
        // Nếu không có yêu cầu đang chờ duyệt, tạo yêu cầu mới
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
  const { requestId, type, approved } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    // Chuyển đổi type thành tên cột trong database
    const approvalColumn = `${type}_duyet`;

    // Lấy thông tin yêu cầu chỉnh sửa
    const [requestInfo] = await connection.query(
      "SELECT * FROM do_an_edit_requests WHERE id = ?",
      [requestId]
    );
    
    if (!requestInfo || requestInfo.length === 0) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }
    
    // Update the approval status
    const updateQuery = `
      UPDATE do_an_edit_requests 
      SET ${approvalColumn} = ? 
      WHERE id = ?
    `;
    
    await connection.query(updateQuery, [approved, requestId]);

    // Check if all approvals are granted
    const checkQuery = `
      SELECT khoa_duyet, daotao_duyet, bgd_duyet 
      FROM do_an_edit_requests 
      WHERE id = ?
    `;
    
    const [approvals] = await connection.query(checkQuery, [requestId]);
    
    if (!approvals || approvals.length === 0) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }

    const allApproved = approvals[0].khoa_duyet && 
                       approvals[0].daotao_duyet && 
                       approvals[0].bgd_duyet;
    
    // Lấy thông tin đồ án từ database để ghi log
    const [doAnInfo] = await connection.query(
      `SELECT * FROM doantotnghiep 
       WHERE MaPhongBan = ? AND Dot = ? AND ki = ? AND NamHoc = ? AND TenDeTai = ? AND he_dao_tao = ? LIMIT 1`,
      [
        requestInfo[0].khoa,
        requestInfo[0].dot,
        requestInfo[0].ki_hoc,
        requestInfo[0].nam_hoc,
        requestInfo[0].lop_hoc_phan,
        requestInfo[0].he_dao_tao
      ]
    );
    
    if (doAnInfo && doAnInfo.length > 0) {
      // Tạo dữ liệu cũ và mới cho việc ghi log
      const oldData = {...doAnInfo[0]};
      const newData = {...doAnInfo[0]};
      
      // Đặt giá trị duyệt theo loại
      if (type === 'khoa') {
        oldData.KhoaDuyet = approved ? 0 : 1;
        newData.KhoaDuyet = approved ? 1 : 0;
      } else if (type === 'daotao') {
        oldData.DaoTaoDuyet = approved ? 0 : 1;
        newData.DaoTaoDuyet = approved ? 1 : 0;
      } else if (type === 'bgd') {
        // Thay thế tên cột nếu cần
        oldData.TaiChinhDuyet = approved ? 0 : 1;
        newData.TaiChinhDuyet = approved ? 1 : 0;
      }
      
      // Ghi log thay đổi
      await logDoAnChanges(connection, oldData, newData, req);
    }

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

    // Sử dụng hàm updateRequest để cập nhật dữ liệu và ghi log
    await updateRequest(requestId, req);

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

    worksheet.mergeCells('A5:D5');
    worksheet.getCell('A5').value = '(V/v: thay đổi tên giáo viên hướng dẫn đồ án học kỳ ' + ki_hoc + ' năm học ' + nam_hoc + ')';
    worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A5').font = { italic: true, size: 14, name: 'Times New Roman' };

    // Thêm phần kính gửi
    worksheet.mergeCells('A7:D7');
    worksheet.getCell('A7').value = 'Kính gửi: Phòng Đào Tạo';
    worksheet.getCell('A7').font = { size: 14, name: 'Times New Roman' };
    worksheet.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };

    // Thêm nội dung đơn
    worksheet.mergeCells('A9:D9');
    worksheet.getCell('A9').value = 'Theo kế hoạch giảng dạy học kỳ ' + ki_hoc + ' năm học ' + nam_hoc + 
      ', Khoa ' + khoa + ' có mời một số giảng viên tham gia hướng dẫn đồ án cho Khoa và đã có thời khóa biểu phát hành.';
    worksheet.getCell('A9').alignment = { wrapText: true, vertical: 'middle' };
    worksheet.getCell('A9').font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(9).height = 50;

    worksheet.mergeCells('A10:D10');
    worksheet.getCell('A10').value = 'Tuy nhiên, trong quá trình thực hiện hướng dẫn, một số giáo viên vì lí do riêng không thể thực hiện đúng theo thời khóa biểu nên khoa xin phép được điều chỉnh lại tên các giáo viên hướng dẫn trên thời khóa biếu như sau:';
    worksheet.getCell('A10').alignment = { wrapText: true, vertical: 'middle' };
    worksheet.getCell('A10').font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(10).height = 50;

    // Thêm khoảng trống
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Thêm header cho bảng dữ liệu
    const headerRow = worksheet.addRow(['STT', 'Tên đề tài', 'Giảng viên theo TKB', 'Giảng viên điều chỉnh']);
    headerRow.height = 40;

    // Định dạng header
    headerRow.eachCell(cell => {
      cell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true
      };
      cell.font = { 
        bold: true, 
        size: 12,
        name: 'Times New Roman'
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Thêm dữ liệu
    rows.forEach((row, index) => {
      const dataRow = worksheet.addRow([
        index + 1,
        row.lop_hoc_phan,
        row.old_value,
        row.new_value
      ]);

      // Định dạng từng ô trong hàng dữ liệu
      dataRow.eachCell(cell => {
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
        cell.font = { 
          size: 12,
          name: 'Times New Roman'
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Tính toán chiều cao hàng dựa trên nội dung
      const maxLines = Math.max(
        Math.ceil((row.lop_hoc_phan?.length || 0) / 40),
        Math.ceil((row.old_value?.length || 0) / 30),
        Math.ceil((row.new_value?.length || 0) / 30)
      );
      
      dataRow.height = Math.max(40, maxLines * 20);
    });

    // Định dạng độ rộng cột
    worksheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 8;
      } else if (index === 1) {
        column.width = 50;
      } else {
        column.width = 35;
      }
    });

    // Thêm viền cho toàn bộ bảng
    const lastRow = worksheet.lastRow;
    const lastCol = worksheet.lastColumn;
    
    for (let i = 13; i <= lastRow.number; i++) {
      for (let j = 1; j <= lastCol.number; j++) {
        const cell = worksheet.getCell(i, j);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          ...cell.alignment,
          wrapText: true
        };
      }
    }

    worksheet.addRow([]);
    
    // Thêm phần kết thúc
    worksheet.mergeCells('A' + (lastRow.number + 2) + ':D' + (lastRow.number + 2));
    worksheet.getCell('A' + (lastRow.number + 2)).value = 'Kính đề nghị Phòng Đào tạo xem xét.';
    worksheet.getCell('A' + (lastRow.number + 2)).alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getCell('A' + (lastRow.number + 2)).font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(lastRow.number + 2).height = 20;

    worksheet.mergeCells('A' + (lastRow.number + 3) + ':D' + (lastRow.number + 3));
    worksheet.getCell('A' + (lastRow.number + 3)).value = 'Trân trọng cảm ơn!';
    worksheet.getCell('A' + (lastRow.number + 3)).alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getCell('A' + (lastRow.number + 3)).font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(lastRow.number + 3).height = 20;

    worksheet.mergeCells('A' + (lastRow.number + 4) + ':D' + (lastRow.number + 4));
    worksheet.getCell('A' + (lastRow.number + 4)).value = 'Hà Nội, ngày    tháng    năm   ';
    worksheet.getCell('A' + (lastRow.number + 4)).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell('A' + (lastRow.number + 4)).font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(lastRow.number + 4).height = 20;

    // Tạo buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers cho response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=do_an_dieu_chinh.xlsx');

    // Gửi file
    res.send(buffer);

  } catch (error) {
    console.error('Error in exportAdjustedDoAn:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xuất file Excel' 
    });
  } finally {
    connection.release();
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
        GiangVien1,
        GiangVien2,
        NgayBatDau,
        NgayKetThuc,
        NamHoc,
        Dot,
        ki,
        GiangVienDefault,
        he_dao_tao
        
     FROM doantotnghiep 
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
    const data = rows.map(row => ({
      ...row,
      GiangVienDefault: [row.GiangVien1, row.GiangVien2].filter(Boolean).join(', ')
    }));
    res.json(data);

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

const updateRequest = async (requestId, req) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy thông tin của request từ bảng do_an_edit_requests
    const [request] = await connection.query(
      "SELECT * FROM do_an_edit_requests WHERE id = ?",
      [requestId]
    );

    if (!request[0]) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }

    // Lấy dữ liệu hiện tại của đồ án từ bảng doantotnghiep
    const [currentDoAn] = await connection.query(
      `SELECT * FROM doantotnghiep 
       WHERE MaPhongBan = ? 
       AND Dot = ? 
       AND ki = ? 
       AND NamHoc = ? 
       AND TenDeTai = ?
       AND he_dao_tao = ?
       LIMIT 1`,
      [
        request[0].khoa,
        request[0].dot,
        request[0].ki_hoc,
        request[0].nam_hoc,
        request[0].lop_hoc_phan,
        request[0].he_dao_tao
      ]
    );

    if (!currentDoAn || currentDoAn.length === 0) {
      throw new Error("Không tìm thấy đồ án tương ứng");
    }

    // Tạo bản sao của dữ liệu cũ và mới để ghi log
    const oldData = { ...currentDoAn[0] };
    const newData = { ...currentDoAn[0] };
    
    // Cập nhật giá trị mới cho trường cần thay đổi
    if (request[0].column_name === 'GiangVien1') {
      newData.GiangVien1 = request[0].new_value;
    } else if (request[0].column_name === 'GiangVien2') {
      newData.GiangVien2 = request[0].new_value;
    }

    // Cập nhật thực tế vào bảng doantotnghiep
    const updateQuery = `
      UPDATE doantotnghiep 
      SET ${request[0].column_name} = ? 
      WHERE MaPhongBan = ? 
      AND Dot = ? 
      AND ki = ? 
      AND NamHoc = ? 
      AND TenDeTai = ?
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

    // Ghi log thay đổi vào bảng lichsunhaplieu
    const changeMessage = `Giảng viên hướng dẫn cho đồ án "${request[0].lop_hoc_phan}": từ "${request[0].old_value}" thành "${request[0].new_value}".`;
    
    const userId = req?.session?.userId || req?.session?.userInfo?.ID || req?.user?.id || 1;
    const tenNhanVien = req?.session?.TenNhanVien || req?.session?.userInfo?.TenNhanVien || req?.user?.TenNhanVien || 'Unknown';
    const khoa = req?.session?.MaPhongBan || req?.session?.userInfo?.MaPhongBan || req?.user?.MaPhongBan || req?.session?.Khoa || req?.user?.Khoa || 'Unknown';
    
    const logQuery = `
      INSERT INTO lichsunhaplieu 
      (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    await connection.query(logQuery, [
      userId,
      tenNhanVien,
      khoa,
      'Thay đổi thông tin đồ án',
      changeMessage
    ]);

    // Cập nhật trạng thái trong bảng do_an_edit_requests
    await connection.query(
      "UPDATE do_an_edit_requests SET status = 'Cập nhật thành công' WHERE id = ?",
      [requestId]
    );

    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật yêu cầu:", error);
    return false;
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
  getDoAnChinhThuc,
  updateRequest,
  logDoAnChanges
};