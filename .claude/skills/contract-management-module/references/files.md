# Files

## File: src/controllers/chinhSuaDoAnController.js
```javascript
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
```

## File: src/controllers/exportHDController.js
```javascript
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");
const gvmServices = require("../services/gvmServices");
require("dotenv").config(); // Load biến môi trường

const phuLucDHController = require("../controllers/phuLucHDController");
const {
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  VerticalAlign,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  TextRun,
  AlignmentType,
} = require("docx");

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Đệ quy xóa thư mục con
        deleteFolderRecursive(curPath);
      } else {
        // Xóa file
        fs.unlinkSync(curPath);
      }
    });
    // Xóa thư mục rỗng
    fs.rmdirSync(folderPath);
  }
}
const convertToRoman = (num) => {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
};

// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  // Làm tròn để tránh lỗi floating-point
  num = Math.round(num);
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const result = capitalizeFirstLetter(words.trim() + " đồng");
  return result;
};

// Hàm chuyển đổi số thập phân thành chữ
const numberWithDecimalToWords = (num) => {
  const [integerPart, decimalPart] = num.toString().split(".");
  const integerWords = numberToWords(parseInt(integerPart, 10));
  let decimalWords = "";

  if (decimalPart) {
    decimalWords =
      "phẩy " +
      decimalPart
        .split("")
        .map((digit) => ones[parseInt(digit)])
        .join(" ");
  }

  return `${integerWords}${decimalWords ? " " + decimalWords : ""}`.trim();
};

// Hàm định dạng ngày/tháng/năm
const formatDate1 = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`; // Định dạng ngày/tháng/năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Hàm định dạng ngày tháng năm
const formatDate = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `ngày ${day} tháng ${month} năm ${year}`; // Định dạng ngày tháng năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
// Tính toán khoảng thời gian thực hiện
const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Định dạng ngày bắt đầu
  const startDay = start.getDate().toString().padStart(2, "0");
  const startMonth = (start.getMonth() + 1).toString().padStart(2, "0");
  const startYear = start.getFullYear();

  // Định dạng ngày kết thúc
  const endDay = end.getDate().toString().padStart(2, "0");
  const endMonth = (end.getMonth() + 1).toString().padStart(2, "0");
  const endYear = end.getFullYear();

  return `Từ ngày ${startDay}/${startMonth}/${startYear} đến ngày ${endDay}/${endMonth}/${endYear}`;
};

/**
 * Hàm chuyển đổi date cho Excel
 * Excel lưu trữ date dưới dạng serial number (số ngày kể từ 1/1/1900)
 * Nhưng ExcelJS có thể nhận Date object hoặc string ISO
 * @param {*} dateValue - Giá trị date từ database (có thể là Date, string YYYY-MM-DD, null, undefined)
 * @returns {string|null} - String định dạng DD/MM/YYYY hoặc null
 */
const formatDateForExcel = (dateValue) => {
  try {
    // Nếu null, undefined hoặc chuỗi rỗng
    if (!dateValue || dateValue === '') {
      return null;
    }

    // Nếu đã là Date object hợp lệ
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là string
    if (typeof dateValue === 'string') {
      // Loại bỏ khoảng trắng
      const trimmed = dateValue.trim();
      if (trimmed === '' || trimmed === '0000-00-00') {
        return null;
      }

      // Xử lý định dạng YYYY-MM-DD từ database
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = trimmed.split('-');
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        // Kiểm tra giá trị hợp lệ
        if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }

        // Trả về string định dạng DD/MM/YYYY
        return `${day}/${month}/${year}`;
      }

      // Fallback cho các định dạng khác
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;

      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là number (timestamp)
    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) return null;
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Các trường hợp khác
    return null;
  } catch (error) {
    console.error('Error in formatDateForExcel:', error);
    return null;
  }
};

const getTemplateFileName = (loaiHopDongId, heDaoTaoData) => {
  const heDaoTao = heDaoTaoData.find(item => item.id == loaiHopDongId);
  if (!heDaoTao) return null;

  const { cap_do, loai_hinh } = heDaoTao;

  // ĐỒ ÁN
  if (loai_hinh === "đồ án") {
    return "HopDongDA.docx";
  }

  // MỜI GIẢNG
  if (loai_hinh === "mời giảng") {
    switch (cap_do) {
      case 1:
        return "HopDongHP.docx";   // Đại học
      case 2:
        return "HopDongMM.docx";   // MM
      case 3:
        return "HopDongCH.docx";  // Cao học
      case 4:
        return "HopDongNCS.docx";  // NCS
      default:
        return null;
    }
  }

  return null;
};

// Controller xuất nhiều hợp đồng
const exportMultipleContracts = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    // Convert loaiHopDong from name to ID if it's a string
    let loaiHopDongId = loaiHopDong;
    if (loaiHopDong && isNaN(loaiHopDong)) {
      // It's a name, convert to ID
      const [heDaoTaoRows] = await connection.query(
        'SELECT id FROM he_dao_tao WHERE he_dao_tao = ?',
        [loaiHopDong]
      );
      if (heDaoTaoRows.length > 0) {
        loaiHopDongId = heDaoTaoRows[0].id;
      } else {
        return res.status(404).send(
          "<script>alert('Không tìm thấy hệ đào tạo'); window.location.href='/exportHD';</script>"
        );
      }
    }
    // Lấy hệ đào tạo
    const heDaoTaoData = await gvmServices.getHeDaoTaoData(req, res);

    let query = `SELECT
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
    hd.SoHopDong,
    hd.SoThanhLyHopDong,
    hd.CoSoDaoTao
  FROM
    hopdonggvmoi hd
  JOIN
    gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
  WHERE
    hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.he_dao_tao = ?
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, hd.NgayNghiemThu, hd.Dot, 
    hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
    hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

    let params = [dot, ki, namHoc, loaiHopDongId];

    // Xử lý các trường hợp khác nhau
    if (khoa && khoa !== "ALL") {
      query = `SELECT
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
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.MaPhongBan like ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;
      params = [dot, ki, namHoc, `%${khoa}%`, loaiHopDongId];
    }
    if (teacherName) {
      query = `SELECT
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
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.HoTen LIKE ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap,
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

      params = [dot, ki, namHoc, `%${teacherName}%`, loaiHopDongId];
    }

    const [teachers] = await connection.execute(query, params);

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/exportHD';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    // Dữ liệu để tạo file thống kê
    const summaryData = [];
    const summaryData2 = [];

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      console.log("Processing teacher:", teacher);
      const soTiet = teacher.SoTiet || 0;

      // Gán giá trị mặc định "Thạc sĩ" nếu cột học vị trống
      teacher.HocVi = teacher.HocVi || "Thạc sĩ";


      // Đảm bảo soTiet là số và làm tròn để tránh lỗi floating-point
      const soTietNumber = typeof soTiet === 'string' ? parseFloat(soTiet) : soTiet;

      // Làm tròn kết quả để tránh lỗi floating-point (27839999.999999996 -> 27840000)
      const tienText = Math.round(teacher.SoTien || 0);

      // Nếu số tiền <= 2 triệu đồng thì không tính thuế
      const tienThueText = Math.round(teacher.TruThue || 0);

      const tienThucNhanText = teacher.ThucNhan;
      const thoiGianThucHien = formatDateRange(
        teacher.NgayBatDau,
        teacher.NgayKetThuc
      );

      // Cập nhật lại số tiền vào bảng hopdonggvmoi
      // await updateSoTienThucNhan(
      //   connection,
      //   teacher.id_Gvm,
      //   dot,
      //   ki,
      //   namHoc,
      //   tienThueText,
      //   tienThucNhanText
      // );

      // Ghi dữ liệu cho thống kê chuyển khoản
      summaryData.push({
        HoTen: teacher.HoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienThucNhanText,
        TongTien: tienText, // Lưu tổng tiền trước thuế để tính toán chính xác
        SoHopDong: teacher.SoHopDong,
      });

      summaryData2.push({
        HoTen: teacher.HoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienText, // Tiền trước thuế
        SoHopDong: teacher.SoHopDong,
      });

      let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      const bangChuSoTien = numberToWords(tienText);
      const bangChuThucNhan = numberToWords(tienThucNhanText);
      const MucTien = teacher.SoTien / teacher.SoTiet;

      const data = {
        Số_hợp_đồng: teacher.SoHopDong || "    ",
        Số_thanh_lý: teacher.SoThanhLyHopDong || "    ",
        Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
        Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
        Danh_xưng: teacher.DanhXung,
        Họ_và_tên: hoTenTrim,
        CCCD: teacher.CCCD,
        Ngày_cấp: formatDate1(teacher.NgayCap),
        Nơi_cấp: teacher.NoiCapCCCD,
        Chức_vụ: teacher.ChucVu,
        Cấp_bậc: teacher.HocVi,
        Hệ_số_lương: Number(teacher.HSL).toFixed(2).replace(".", ","),
        Địa_chỉ_theo_CCCD: teacher.DiaChi,
        Điện_thoại: teacher.DienThoai,
        Mã_số_thuế: teacher.MaSoThue,
        Số_tài_khoản: teacher.STK,
        Email: teacher.Email,
        Tại_ngân_hàng: teacher.NganHang,
        Số_tiết: teacher.SoTiet.toString().replace(".", ","),
        Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
        Tiền_text: tienText.toLocaleString("vi-VN"),
        Bằng_chữ_số_tiền: bangChuSoTien,
        Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
        Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
        Bằng_chữ_của_thực_nhận: bangChuThucNhan,
        Kỳ: convertToRoman(teacher.KiHoc),
        Năm_học: teacher.NamHoc,
        Thời_gian_thực_hiện: thoiGianThucHien,
        Mức_tiền: MucTien.toLocaleString("vi-VN"),
        Nơi_công_tác: teacher.NoiCongTac,
        Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã"
      };

      // Chọn template dựa trên ID hệ đào tạo
      let templateFileName;

      // Map ID to template file
      // const templateMap = {
      //   1: "HopDongHP.docx",      // Đại học (Đóng học phí)
      //   2: "HopDongMM.docx",      // Đại học (Mật mã)
      //   6: "HopDongCH.docx",      // Cao học (Đóng học phí)
      //   4: "HopDongNCS.docx",     // Nghiên cứu sinh (Đóng học phí)
      //   5: "HopDongDA.docx",      // Đồ án
      // };

      // templateFileName = templateMap[loaiHopDongId];

      templateFileName = getTemplateFileName(loaiHopDongId, heDaoTaoData);

      console.log("Template file name:", templateFileName);

      // Fallback to name-based selection if ID mapping not found
      if (!templateFileName) {
        // Try to get he_dao_tao name from database if we only have ID
        let heHopDongName;
        if (!isNaN(loaiHopDong)) {
          const [heDaoTaoRows] = await connection.query(
            'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
            [loaiHopDongId]
          );
          heHopDongName = heDaoTaoRows.length > 0 ? heDaoTaoRows[0].he_dao_tao : loaiHopDong;
        } else {
          heHopDongName = loaiHopDong;
        }

        console.log("Hệ hợp đồng (dựa trên tên):", heHopDongName);

        // Fallback to name-based selection
        switch (heHopDongName) {
          case "Đại học (Đóng học phí)":
            templateFileName = "HopDongHP.docx";
            break;
          case "Đại học (Mật mã)":
            templateFileName = "HopDongMM.docx";
            break;
          case "Đồ án":
            templateFileName = "HopDongDA.docx";
            break;
          case "Nghiên cứu sinh (Đóng học phí)":
            templateFileName = "HopDongNCS.docx";
            break;
          case "Cao học (Đóng học phí)":
            templateFileName = "HopDongCH.docx";
            break;
          default:
            return res.status(400).send("Loại hợp đồng không hợp lệ.");
        }
      }

      const templatePath = path.resolve(
        __dirname,
        "../templates",
        templateFileName
      );
      const content = fs.readFileSync(templatePath, "binary");
      const zip = new PizZip(content);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: "«",
          end: "»",
        },
      });

      doc.render(data);

      const buf = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      const fileName = `HopDong_${hoTenTrim}_${teacher.CCCD}.docx`;
      fs.writeFileSync(path.join(tempDir, fileName), buf);
    }

    // Tạo file thống kê chuyển khoản sau thuế
    const noiDung = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc}`;
    const summaryDoc = createTransferDetailDocument(summaryData, noiDung, "sau thuế");
    const summaryBuf = await Packer.toBuffer(summaryDoc);
    const summaryName = `GiangDay_Daihoc_Thongke_chuyenkhoan_sauthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName), summaryBuf);


    // Tạo file thống kê chuyển khoản trước thuế
    const noiDung2 = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc}`;
    const summaryDoc2 = createTransferDetailDocument(summaryData2, noiDung2, "trước thuế");
    const summaryBuf2 = await Packer.toBuffer(summaryDoc2);
    const summaryName2 = `GiangDay_Daihoc_Thongke_chuyenkhoan_truocthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName2), summaryBuf2);


    // Tạo file Excel báo cáo thuế - lấy dữ liệu trực tiếp từ database
    const taxReportData = teachers.map((teacher, index) => {
      const hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      // Ép kiểu Number để đảm bảo Excel SUM hoạt động đúng
      const amount = Number(teacher.SoTien);
      const taxDeducted = Number(teacher.TruThue);
      const netAmount = Number(teacher.ThucNhan);

      return {
        stt: index + 1,
        contractNumber: teacher.SoHopDong,
        executor: hoTenTrim,
        expenseDescription: `Hợp đồng giao khoán công việc`,
        idNumber: teacher.CCCD || '',
        issueDate: formatDateForExcel(teacher.NgayCap),
        issuePlace: teacher.NoiCapCCCD || '',
        idAddress: teacher.DiaChi || '',
        phoneNumber: teacher.DienThoai,
        taxCode: teacher.MaSoThue,
        amount: amount, // Tổng tiền trước thuế từ DB (đã ép kiểu Number)
        taxDeducted: taxDeducted, // Thuế từ DB (đã ép kiểu Number)
        netAmount: netAmount // Tiền sau thuế từ DB (đã ép kiểu Number)
      };
    });

    const taxReportWorkbook = createTaxReportWorkbook(taxReportData);
    const taxReportName = `GiangDay_Daihoc_BangKeTongHopThue.xlsx`;
    await taxReportWorkbook.xlsx.writeFile(path.join(tempDir, taxReportName));


    // Tạo thư mục cho ZIP file bên ngoài tempDir
    const zipOutputDir = path.join(__dirname, '..', 'public', 'tempZips');
    if (!fs.existsSync(zipOutputDir)) {
      fs.mkdirSync(zipOutputDir, { recursive: true });
    }

    const zipFileName = `HopDong_GiangDay_Dot${dot}_Ki${ki}_${namHoc}_${khoa || "all"}.zip`;
    const zipPath = path.join(zipOutputDir, zipFileName);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    const output = fs.createWriteStream(zipPath);

    archive.pipe(output);

    // Thêm từng file thay vì toàn bộ directory
    const files = fs.readdirSync(tempDir);

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      archive.file(filePath, { name: file });
    });

    await new Promise((resolve, reject) => {
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(err);
      });
      output.on("close", () => {
        console.log("Archive finalized successfully");
        resolve();
      });
      console.log("Finalizing archive...");
      archive.finalize();
    });

    res.download(zipPath, zipFileName, (err) => {
      if (err) {
        console.error("Error sending zip file:", err);
        return;
      }

      console.log("Download completed, starting cleanup...");
      setTimeout(() => {
        try {
          // Xóa các file trong tempDir
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
              const filePath = path.join(tempDir, file);
              fs.unlinkSync(filePath);
            }
            fs.rmdirSync(tempDir);
          }

          // Xóa file ZIP
          if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
          }

          console.log("Cleanup completed successfully");
        } catch (error) {
          console.error("Error cleaning up temporary directory:", error);
        }
      }, 1000);
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};


const updateSoTienThucNhan = async (
  connection,
  idGvm,
  dot,
  kiHoc,
  namHoc,
  truThue,
  thucNhan
) => {
  try {
    const updateQuery = `
      UPDATE hopdonggvmoi
      SET TruThue = ?, ThucNhan = ?
      WHERE id_Gvm = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
    `;
    const [result] = await connection.execute(updateQuery, [
      truThue,
      thucNhan,
      idGvm,
      dot,
      kiHoc,
      namHoc,
    ]);

    if (result.affectedRows === 0) {
      console.warn(
        `Không tìm thấy bản ghi để cập nhật cho giảng viên ${idGvm}`
      );
    } else {
      console.log(`Đã cập nhật TruThue và ThucNhan cho giảng viên ${idGvm}`);
    }
  } catch (err) {
    console.error(`Lỗi khi cập nhật thu nhập cho giảng viên ${idGvm}:`, err);
    throw err;
  }
};

const getExportHDSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("exportHD", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Tải tổng hợp hợp đồng
const exportAdditionalInfoGvm = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    let { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    connection = await createPoolConnection();

    // Convert loaiHopDong from name to ID if it's a string
    let loaiHopDongId = loaiHopDong;
    if (loaiHopDong && isNaN(loaiHopDong)) {
      // It's a name, convert to ID
      const [heDaoTaoRows] = await connection.query(
        'SELECT id FROM he_dao_tao WHERE he_dao_tao = ?',
        [loaiHopDong]
      );
      if (heDaoTaoRows.length > 0) {
        loaiHopDongId = heDaoTaoRows[0].id;
      } else {
        return res.status(404).send(
          "<script>alert('Không tìm thấy hệ đào tạo'); window.location.href='/exportHD';</script>"
        );
      }
    }

    let query = `SELECT
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
    hd.SoHopDong,
    hd.SoThanhLyHopDong,
    hd.CoSoDaoTao
  FROM
    hopdonggvmoi hd
  JOIN
    gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
  WHERE
    hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.he_dao_tao = ?
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, hd.NgayNghiemThu, hd.Dot, 
    hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
    hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

    let params = [dot, ki, namHoc, loaiHopDongId];

    // Xử lý các trường hợp khác nhau
    if (khoa && khoa !== "ALL") {
      query = `SELECT
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
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  -- Giả sử có khóa ngoại giữa hai bảng
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.MaPhongBan like ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap, 
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;
      params = [dot, ki, namHoc, `%${khoa}%`, loaiHopDongId];
    }
    if (teacherName) {
      query = `SELECT
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
      hd.SoHopDong,
      hd.SoThanhLyHopDong,
      hd.CoSoDaoTao
    FROM
      hopdonggvmoi hd
    JOIN
      gvmoi gv ON hd.id_Gvm = gv.id_Gvm  
    WHERE
      hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.HoTen LIKE ? AND hd.he_dao_tao = ?
    GROUP BY
      hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
      hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.NgayCap,
      hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
      hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao`;

      params = [dot, ki, namHoc, `%${teacherName}%`, loaiHopDongId];
    }

    const [teachers] = await connection.execute(query, params);

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/hd-gvm/additional-file-site';</script>"
      );
    }

    const heDaoTaoData = await gvmServices.getHeDaoTaoData(req, res);

    const loaiHopDongText = heDaoTaoData.find(
      (item) => item.id.toString() === loaiHopDong.toString()
    )?.he_dao_tao || "UnknownType";

    // Lấy danh sách phụ lục hợp đồng của giảng viên
    const phuLucData = await getAppendixData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      teacherName,
      loaiHopDong
    );

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const contractFiles = [];
    try {
      for (const teacher of teachers) {
        let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
        const teacherZipName = `${hoTenTrim}_${teacher.CCCD}.zip`;
        const teacherZipPath = path.join(tempDir, teacherZipName);
        const teacherArchive = archiver("zip", { zlib: { level: 9 } });
        const output = fs.createWriteStream(teacherZipPath);
        teacherArchive.pipe(output);

        // Lưu các file cần xóa sau khi nén
        const filesToDelete = [];
        const dirsToDelete = [];

        console.log("Generating contract for teacher:", teacher.HoTen);

        // Tạo file hợp đồng
        const filePathContract = await generateContractForTeacher(
          teacher,
          loaiHopDong,
          tempDir,
          heDaoTaoData,
        );


        // Lấy file tài liệu bổ sung
        const filePathAdditional = await generateAdditionalFile(
          teacher,
          tempDir
        );

        // Lấy file phụ lục
        const phuLucTeacher = phuLucData.filter(
          (item) => item.GiangVien.trim() === teacher.HoTen.trim()
        );

        const filePathAppendix =
          await phuLucDHController.getExportPhuLucGiangVienMoiPath(
            req,
            connection,
            dot,
            ki,
            namHoc,
            loaiHopDongText,
            khoa,
            teacherName,
            phuLucTeacher
          );

        // Kiểm tra các file
        if (
          !fs.existsSync(filePathContract) ||
          fs.statSync(filePathContract).size === 0
        ) {
          console.error(`File bị lỗi hoặc trống: ${filePathContract}`);
          continue;
        }

        if (
          filePathAdditional &&
          (!fs.existsSync(filePathAdditional) ||
            fs.statSync(filePathAdditional).size === 0)
        ) {
          console.error(`File bị lỗi hoặc trống: ${filePathAdditional}`);
          continue;
        }

        if (
          filePathAppendix &&
          (!fs.existsSync(filePathAppendix) ||
            fs.statSync(filePathAppendix).size === 0)
        ) {
          console.error(`File bị lỗi hoặc trống: ${filePathAppendix}`);
          continue;
        }

        // Thêm các file vào archive
        teacherArchive.file(filePathContract, {
          name: path.basename(filePathContract),
        });

        if (filePathAdditional) {
          teacherArchive.file(filePathAdditional, {
            name: path.basename(filePathAdditional),
          });
        }

        if (filePathAppendix) {
          teacherArchive.file(filePathAppendix, {
            name: path.basename(filePathAppendix),
          });

          filesToDelete.push(filePathAppendix);
          const appendixDir = path.dirname(filePathAppendix);
          dirsToDelete.push(appendixDir);
        }

        // Đợi quá trình nén hoàn tất
        await new Promise((resolve, reject) => {
          output.on("close", resolve);
          output.on("error", reject);
          teacherArchive.finalize();
        });

        // Lưu đường dẫn zip
        contractFiles.push(teacherZipPath);

        // Sau khi zip xong mới xóa file
        for (const filePath of filesToDelete) {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Đã xóa file:", filePath);
          }
        }

        for (const dirPath of dirsToDelete) {
          try {
            if (
              fs.existsSync(dirPath) &&
              fs.readdirSync(dirPath).length === 0
            ) {
              fs.rmdirSync(dirPath);
              console.log("Đã xóa thư mục:", dirPath);
            }
          } catch (err) {
            console.log("Không thể xóa thư mục (có thể không rỗng):", dirPath);
          }
        }
      }
    } catch (error) {
      return res
        .status(400)
        .send(
          `<script>alert('${error.message}'); window.location.href='/api/hd-gvm/additional-file-site';</script>`
        );
    }

    // Tạo file ZIP tổng hợp chứa tất cả file ZIP của giảng viên
    let zipFileName = `TongHopHopDong_GiangDay_Dot${dot}_Ki${ki}_${namHoc}_${loaiHopDong}`;

    if (teacherName) {
      zipFileName += `_${teacherName}.zip`;
    } else {
      zipFileName += `_${khoa || "all"}.zip`;
    }
    const zipPath = path.join(tempDir, zipFileName);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);

    // Thêm tất cả các file ZIP của giảng viên vào file ZIP tổng hợp
    contractFiles.forEach((file) => {
      archive.file(file, { name: path.basename(file) });
    });

    //await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    // Kiểm tra file ZIP trước khi gửi
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      console.error("Lỗi: File ZIP bị trống hoặc hỏng");
      return res.status(500).send("Lỗi: Không thể tạo file ZIP.");
    }

    // Gửi file ZIP cuối cùng về cho client
    res.download(zipPath, zipFileName, (err) => {
      if (!err) {
        setTimeout(() => {
          try {
            if (fs.existsSync(tempDir)) {
              fs.readdirSync(tempDir).forEach((file) =>
                fs.unlinkSync(path.join(tempDir, file))
              );
              fs.rmdirSync(tempDir);
            }
          } catch (error) {
            console.error("Error cleaning up temporary directory:", error);
          }
        }, 1000);
      }
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const generateContractForTeacher = async (
  teacher,
  loaiHopDong,
  tempDir,
  heDaoTaoData
) => {
  const soTiet = teacher.SoTiet || 0;

  // Assign default value "Thạc sĩ" if HocVi is empty
  teacher.HocVi = teacher.HocVi || "Thạc sĩ";

  const tienText = teacher.SoTien || 0;
  // Nếu số tiền <= 2 triệu đồng thì không tính thuế
  const tienThueText = teacher.TruThue || 0;
  const tienThucNhanText = teacher.ThucNhan || 0;
  const thoiGianThucHien = formatDateRange(
    teacher.NgayBatDau,
    teacher.NgayKetThuc
  );
  const MucTien = teacher.SoTien / soTiet || 0;

  const data = {
    Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
    Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
    Danh_xưng: teacher.DanhXung,
    Họ_và_tên: teacher.HoTen,
    CCCD: teacher.CCCD,
    Ngày_cấp: formatDate1(teacher.NgayCap),
    Nơi_cấp: teacher.NoiCapCCCD,
    Chức_vụ: teacher.ChucVu,
    Cấp_bậc: teacher.HocVi,
    Hệ_số_lương: Number(teacher.HSL).toFixed(2).replace(".", ","),
    Địa_chỉ_theo_CCCD: teacher.DiaChi,
    Điện_thoại: teacher.DienThoai,
    Mã_số_thuế: teacher.MaSoThue,
    Số_tài_khoản: teacher.STK,
    Email: teacher.Email,
    Tại_ngân_hàng: teacher.NganHang,
    Số_tiết: teacher.SoTiet.toString().replace(".", ","),
    Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
    Tiền_text: tienText.toLocaleString("vi-VN"),
    Bằng_chữ_số_tiền: numberToWords(tienText),
    Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
    Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
    Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
    Kỳ: convertToRoman(teacher.KiHoc),
    Năm_học: teacher.NamHoc,
    Thời_gian_thực_hiện: thoiGianThucHien,
    Mức_tiền: MucTien.toLocaleString("vi-VN"),
    Nơi_công_tác: teacher.NoiCongTac,
    Số_hợp_đồng: teacher.SoHopDong || "",
    Số_thanh_lý: teacher.SoThanhLyHopDong || "",
    Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã",
  };



  let templateFileName;

  templateFileName = getTemplateFileName(loaiHopDong, heDaoTaoData);
  const templatePath = path.resolve(
    __dirname,
    "../templates",
    templateFileName
  );
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "«", end: "»" },
  });

  doc.render(data);

  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
  const fileName = `HopDong_${hoTenTrim}_${teacher.CCCD}.docx`;
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, buf);

  return filePath; // Trả về đường dẫn file để dùng sau này
};

const getAppendixData = async (
  connection,
  dot,
  ki,
  namHoc,
  khoa,
  teacherName,
  loaiHopDongId
) => {
  try {
    let query = `
      WITH 
  phuLucSauDH AS (
      SELECT DISTINCT
          TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) AS GiangVien, 
          qc.TenLop AS Lop, 
          ROUND(qc.QuyChuan * 0.3, 2) AS SoTiet, 
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          gv.HocVi, 
          gv.HSL,
          gv.DienThoai,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,
          qc.he_dao_tao,
          hd.SoHopDong,
          hd.SoThanhLyHopDong
      FROM quychuan qc
      JOIN gvmoi gv 
          ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen 
      LEFT JOIN hopdonggvmoi hd 
          ON gv.id_Gvm = hd.id_Gvm 
          AND qc.Dot = hd.Dot 
          AND qc.KiHoc = hd.KiHoc 
          AND qc.NamHoc = hd.NamHoc
          AND qc.he_dao_tao = hd.he_dao_tao
      WHERE qc.GiaoVienGiangDay LIKE '%,%'
  ),
  phuLucDH AS (
      SELECT DISTINCT
          TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien, 
          qc.TenLop AS Lop, 
          qc.QuyChuan AS SoTiet, 
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          gv.HocVi, 
          gv.HSL,
          gv.DienThoai,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,
          qc.he_dao_tao,
          hd.SoHopDong,
          hd.SoThanhLyHopDong
      FROM quychuan qc
      JOIN gvmoi gv 
          ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) = gv.HoTen
      LEFT JOIN hopdonggvmoi hd 
          ON gv.id_Gvm = hd.id_Gvm 
          AND qc.Dot = hd.Dot 
          AND qc.KiHoc = hd.KiHoc 
          AND qc.NamHoc = hd.NamHoc
          AND qc.he_dao_tao = hd.he_dao_tao
      WHERE qc.MoiGiang = 1 AND qc.GiaoVienGiangDay NOT LIKE '%,%'
  ),
  table_ALL AS (
      SELECT * FROM phuLucSauDH
      UNION
      SELECT * FROM phuLucDH
  )
  
  SELECT * FROM table_ALL WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?  AND he_dao_tao = ?
      `;

    let params = [dot, ki, namHoc, loaiHopDongId];

    if (khoa && khoa !== "ALL") {
      query += ` AND Khoa = ?`;
      params.push(khoa);
    }

    if (teacherName) {
      query += ` AND GiangVien LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    const [phuLucData] = await connection.execute(query, params);

    // Nhóm dữ liệu theo giảng viên
    // const groupedData = phuLucData.reduce((acc, cur) => {
    //   (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
    //   return acc;
    // }, {});

    return phuLucData;
  } catch (error) {
    console.log(error);
  }
};

const generateAppendixContract = async (
  connection,
  tienLuongList,
  data,
  req,
  res,
  tempDir
) => {
  try {
    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();

    // Nhóm dữ liệu theo giảng viên
    const groupedData = data.reduce((acc, cur) => {
      (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
      return acc;
    }, {});
    const summarySheet = workbook.addWorksheet("Tổng hợp");

    // Thiết lập các thông số cho trang
    summarySheet.pageSetup = {
      paperSize: 9, // Kích thước giấy A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3149,
        right: 0.3149,
        top: 0,
        bottom: 0,
        header: 0.3149,
        footer: 0.3149,
      },
    };

    // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
    const titleRow0 = summarySheet.addRow(["Ban Cơ yếu Chính phủ"]);
    titleRow0.font = { name: "Times New Roman", size: 17 };
    titleRow0.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

    // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
    const titleRow1 = summarySheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
    titleRow1.font = { name: "Times New Roman", bold: true, size: 22 };
    titleRow1.alignment = { vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow1.number}:F${titleRow1.number}`);

    const titleRow2 = summarySheet.addRow(["Phụ lục"]);
    titleRow2.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

    // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
    const titleRow5 = summarySheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Đơn vị tính: Đồng",
      "",
      "",
    ]);
    titleRow5.font = { name: "Times New Roman", bold: true, size: 14 };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

    // Thiết lập tiêu đề cột
    const summaryHeader = [
      "STT",
      "Họ tên giảng viên",
      "Tên học phần",
      "Tên lớp",
      "Số tiết",
      "Thời gian thực hiện",
      "Học kỳ",
      "Địa chỉ",
      "Học vị",
      "Hệ số lương",
      "Mức thanh toán",
      "Thành tiền",
      "Trừ thuế TNCN 10%",
      "Còn lại",
    ];

    const headerRow = summarySheet.addRow(summaryHeader);
    headerRow.font = { name: "Times New Roman", bold: true };

    // Định dạng cột
    summarySheet.getColumn(1).width = 5; // STT
    summarySheet.getColumn(2).width = 18; // Họ tên giảng viên
    summarySheet.getColumn(3).width = 14; // Tên học phần
    summarySheet.getColumn(4).width = 14; // Tên lớp
    summarySheet.getColumn(5).width = 10; // Số tiết
    summarySheet.getColumn(6).width = 16; // Thời gian thực hiện
    summarySheet.getColumn(7).width = 6; // Học kỳ
    summarySheet.getColumn(8).width = 16; // Địa chỉ
    summarySheet.getColumn(9).width = 6; // Học vị
    summarySheet.getColumn(10).width = 7; // Hệ số lương
    summarySheet.getColumn(11).width = 12; // Mức thanh toán
    summarySheet.getColumn(12).width = 15; // Thành tiền
    summarySheet.getColumn(13).width = 15; // Trừ thuế TNCN 10%
    summarySheet.getColumn(14).width = 15; // Còn lại

    // Thêm dữ liệu vào sheet tổng hợp
    let stt = 1;
    let totalSoTiet = 0;
    let totalSoTien = 0;
    let totalTruThue = 0;
    let totalThucNhan = 0;

    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      giangVienData.forEach((item) => {
        const soTiet = item.SoTiet;
        const soTien = tinhSoTien(item, soTiet, tienLuongList); // Tính toán soTien
        // Nếu số tiền <= 2 triệu đồng thì không tính thuế
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1; // Trừ Thuế = 10% của Số Tiền (hoặc 0 nếu < 2 triệu)
        const thucNhan = soTien - truThue; // Thực Nhận = Số Tiền - Trừ Thuế
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === item.HocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;

        // Thêm hàng dữ liệu vào sheet tổng hợp
        const summaryRow = summarySheet.addRow([
          stt,
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          item.SoTiet,
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL,
          mucThanhToan, // Mức thanh toán
          soTien.toLocaleString("vi-VN").replace(/\./g, ","), // Định dạng số tiền
          truThue.toLocaleString("vi-VN").replace(/\./g, ","), // Định dạng số tiền
          thucNhan.toLocaleString("vi-VN").replace(/\./g, ","), // Định dạng số tiền
        ]);

        // Cập nhật các tổng cộng
        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;

        // Căn chỉnh cỡ chữ và kiểu chữ cho từng ô trong hàng dữ liệu
        summaryRow.eachCell((cell, colNumber) => {
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13, bold: true };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 15 };
              break;
          }
          cell.alignment = { horizontal: "center", vertical: "middle" }; // Căn giữa
          cell.alignment.wrapText = true; // Bật wrapText cho ô
        });

        stt++; // Tăng số thứ tự
      });
    }

    // Thêm hàng tổng cộng vào cuối bảng

    const totalRow = summarySheet.addRow([
      "Tổng cộng",
      "",
      "",
      "",
      totalSoTiet,
      "",
      "",
      "",
      "",
      "",
      "",
      totalSoTien.toLocaleString("vi-VN").replace(/\./g, ","),
      totalTruThue.toLocaleString("vi-VN").replace(/\./g, ","),
      totalThucNhan.toLocaleString("vi-VN").replace(/\./g, ","),
    ]);

    totalRow.font = { name: "Times New Roman", bold: true, size: 14 };
    totalRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Gộp ô cho hàng tổng cộng
    summarySheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    // Định dạng các ô trong bảng
    const firstRowOfTable = 6; // Giả sử bảng bắt đầu từ hàng 8
    const lastRowOfTable = totalRow.number; // Hàng tổng cộng

    for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
      const row = summarySheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // Định dạng cho tiêu đề cột
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    // Tạo một sheet cho mỗi giảng viên
    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      const worksheet = workbook.addWorksheet(giangVien);

      worksheet.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0 = worksheet.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0.font = { name: "Times New Roman", size: 17 };
      titleRow0.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1 = worksheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1.font = { name: "Times New Roman", bold: true, size: 22 };
      titleRow1.alignment = { vertical: "middle" };
      worksheet.mergeCells(`A${titleRow1.number}:F${titleRow1.number}`);

      const titleRow2 = worksheet.addRow(["Phụ lục"]);
      titleRow2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

      // Tìm ngày bắt đầu sớm nhất từ dữ liệu giảng viên
      const earliestDate = giangVienData.reduce((minDate, item) => {
        const currentStartDate = new Date(item.NgayBatDau);
        return currentStartDate < minDate ? currentStartDate : minDate;
      }, new Date(giangVienData[0].NgayBatDau));

      // Định dạng ngày bắt đầu sớm nhất thành chuỗi
      const formattedEarliestDate = formatVietnameseDate(earliestDate);

      const titleRow3 = worksheet.addRow([
        `Hợp đồng số:    /HĐ-ĐT ${formattedEarliestDate}`,
      ]);
      titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

      const titleRow4 = worksheet.addRow([
        `Kèm theo biên bản nghiệm thu và thanh lý Hợp đồng số:     /HĐ-ĐT ${formattedEarliestDate}`,
      ]);
      titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow4.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5 = worksheet.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5.font = { name: "Times New Roman", bold: true, size: 14 };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
        "STT", // Thêm tiêu đề STT
        "Họ tên giảng viên",
        "Tên học phần",
        "Tên lớp",
        "Số tiết",
        "Thời gian thực hiện",
        "Học kỳ",
        "Địa Chỉ",
        "Học vị",
        "Hệ số lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow = worksheet.addRow(header);
      headerRow.font = { name: "Times New Roman", bold: true };
      worksheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
      worksheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
      worksheet.getColumn(13).numFmt = "#,##0"; // Còn lại
      worksheet.getColumn(14).numFmt = "#,##0"; // Còn lại

      worksheet.pageSetup = {
        paperSize: 9, // A4 paper size
        orientation: "landscape",
        fitToPage: true, // Fit to page
        fitToWidth: 1, // Fit to width
        fitToHeight: 0, // Do not fit to height
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };

      // Căn chỉnh độ rộng cột
      // Định dạng độ rộng cột, bao gồm cột STT
      worksheet.getColumn(1).width = 5; // STT
      worksheet.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet.getColumn(3).width = 14; // Tên học phần
      worksheet.getColumn(4).width = 14; // Tên lớp
      worksheet.getColumn(5).width = 10; // Số tiết
      worksheet.getColumn(6).width = 16; // Thời gian thực hiện
      worksheet.getColumn(7).width = 6; // Học kỳ
      worksheet.getColumn(8).width = 16; // Địa Chỉ
      worksheet.getColumn(9).width = 6; // Học vị
      worksheet.getColumn(10).width = 7; // Hệ số lương
      worksheet.getColumn(11).width = 12; // Mức thanh toán
      worksheet.getColumn(12).width = 15; // Thành tiền
      worksheet.getColumn(13).width = 15; // Trừ thuế TNCN 10%
      worksheet.getColumn(14).width = 15; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFF00" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      let totalSoTiet = 0;
      let totalSoTien = 0;
      let totalTruThue = 0;
      let totalThucNhan = 0;

      giangVienData.forEach((item, index) => {
        const soTiet = item.SoTiet;
        const soTien = tinhSoTien(item, soTiet, tienLuongList); // Tính toán soTien
        const truThue = soTien * 0.1; // Trừ Thuế = 10% của Số Tiền
        const thucNhan = soTien - truThue; // Thực Nhận = Số Tiền - Trừ Thuế
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === item.HocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        const hocKyLaMa = convertToRoman(item.HocKy);
        // Viết tắt Học vị
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;
        const row = worksheet.addRow([
          index + 1, // STT
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          item.SoTiet,
          thoiGianThucHien,
          hocKyLaMa, // Sử dụng số La Mã cho Học kỳ
          item.DiaChi,
          hocViVietTat, // Sử dụng viết tắt cho Học vị
          item.HSL,
          mucThanhToan,
          soTien,
          truThue,
          thucNhan,
        ]);
        row.font = { name: "Times New Roman", size: 13 };

        row.getCell(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
        row.getCell(13).numFmt = "#,##0"; // Còn lại
        row.getCell(14).numFmt = "#,##0"; // Còn lại

        // Bật wrapText cho các ô dữ liệu và căn giữa
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Chỉnh cỡ chữ cho từng cột
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13, bold: true };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 14 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 15 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 15 };
              break;
          }
        });

        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;
      });

      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet,
        "",
        "",
        "",
        "",
        "",
        "",
        totalSoTien,
        totalTruThue,
        totalThucNhan,
      ]);
      totalRow.font = { name: "Times New Roman", bold: true, size: 14 };
      totalRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Gộp ô cho hàng tổng cộng
      worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      // Thêm hai dòng trống
      worksheet.addRow([]);

      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      const bangChuRow = worksheet.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien)}`,
      ]);
      bangChuRow.font = { name: "Times New Roman", italic: true, size: 17 };
      worksheet.mergeCells(`A${bangChuRow.number}:${bangChuRow.number}`);
      bangChuRow.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 6 trở đi
      const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 7
      const lastRowOfTable = totalRow.number; // Hàng tổng cộng

      for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }
    }

    // Tạo tên file
    let fileName = `PhuLuc_${data?.[0]?.GiangVien || "KhongRo"}`;

    fileName += ".xlsx";

    // Set headers cho response và gửi file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    // Lưu file vào thư mục tạm
    const filePath = path.join(tempDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    return filePath; // Trả về đường dẫn file để nén vào ZIP
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// const generateAdditionalFile = async (teacher, tempDir) => {
//   const teacherFolderPath = path.resolve(
//     __dirname,
//     "..",
//     "..",
//     "Giang_Vien_Moi",
//     teacher.MaPhongBan,
//     teacher.MaBoMon,
//     teacher.HoTen
//   );

//   if (!fs.existsSync(teacherFolderPath)) return null; // Không có thư mục

//   const files = fs.readdirSync(teacherFolderPath);
//   const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",").map(
//     (ext) => ext.toLowerCase()
//   );

//   const documentFile = files.find((f) =>
//     allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
//   );

//   return documentFile ? path.join(teacherFolderPath, documentFile) : null;
// };

const generateAdditionalFile = async (teacher, tempDir) => {
  const teacherFolderPath = path.resolve(
    __dirname,
    "..",
    "..",
    "Giang_Vien_Moi",
    teacher.MaPhongBan,
    teacher.MaBoMon,
    teacher.HoTen
  );

  if (!fs.existsSync(teacherFolderPath)) return null; // Không có thư mục

  const files = fs.readdirSync(teacherFolderPath);
  const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",").map(
    (ext) => ext.toLowerCase()
  );

  // const documentFile = files.find((f) =>
  //   allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
  // );

  const documentFile = files.find((f) => {
    const baseName = path.parse(f).name; // Lấy tên file không có phần mở rộng
    const ext = path.extname(f).toLowerCase().slice(1); // Lấy phần mở rộng không có dấu chấm

    return (
      baseName === `${teacher.MaPhongBan}_${teacher.HoTen}` &&
      allowedExtensions.includes(ext)
    );
  });

  if (!documentFile) return null; // Không tìm thấy file hợp lệ

  const oldFilePath = path.join(teacherFolderPath, documentFile);
  // const newFileName = `BoSung_${teacher.HoTen}${path.extname(documentFile)}`;
  // const newFilePath = path.join(teacherFolderPath, newFileName);

  // Đổi tên file
  //fs.renameSync(oldFilePath, newFilePath);

  return oldFilePath;
};

const getExportAdditionalInfoGvmSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("exportAdditionalInfoGvm", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

function formatVietnameseDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}

function formatDateDMY(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const getTienLuongList = async (connection) => {
  const query = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
  const [tienLuongList] = await connection.execute(query);
  return tienLuongList;
};

function tinhSoTien(row, soTiet, tienLuongList) {
  const tienLuong = tienLuongList.find(
    (tl) => tl.he_dao_tao === row.he_dao_tao && tl.HocVi === row.HocVi
  );
  if (tienLuong) {
    return soTiet * tienLuong.SoTien;
  } else {
    return 0;
  }
}

// Tải danh sách file bổ sung
const getImageDownloadSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("moigiang.phuLucMinhChungGVM.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const exportImageDownloadData = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    let { dot, ki, namHoc, khoa, teacherName, loaiHopDong } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    connection = await createPoolConnection();

    // Convert loaiHopDong from name to ID if it's a string
    let loaiHopDongId = loaiHopDong;
    if (loaiHopDong && isNaN(loaiHopDong)) {
      // It's a name, convert to ID
      const [heDaoTaoRows] = await connection.query(
        'SELECT id FROM he_dao_tao WHERE he_dao_tao = ?',
        [loaiHopDong]
      );
      if (heDaoTaoRows.length > 0) {
        loaiHopDongId = heDaoTaoRows[0].id;
      } else {
        return res.status(404).send(
          "<script>alert('Không tìm thấy hệ đào tạo'); window.location.href='/phu-luc-minh-chung-gvm';</script>"
        );
      }
    }

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
    hd.Dot,
    hd.KiHoc,
    hd.NamHoc,
    hd.MaPhongBan,
    hd.MaBoMon,
    hd.NoiCongTac
  FROM hopdonggvmoi hd
  JOIN gvmoi gv ON hd.id_Gvm = gv.id_Gvm
`;

    const conditions = [];
    const params = [];

    /* điều kiện bắt buộc */
    conditions.push("hd.Dot = ?");
    params.push(dot);

    conditions.push("hd.KiHoc = ?");
    params.push(ki);

    conditions.push("hd.NamHoc = ?");
    params.push(namHoc);

    conditions.push("hd.he_dao_tao = ?");
    params.push(loaiHopDongId);

    /* điều kiện theo khoa */
    if (khoa && khoa !== "ALL") {
      conditions.push("hd.MaPhongBan LIKE ?");
      params.push(`%${khoa}%`);
    }

    /* điều kiện theo tên giảng viên */
    if (teacherName) {
      conditions.push("hd.HoTen LIKE ?");
      params.push(`%${teacherName}%`);
    }

    /* ghép WHERE */
    query += " WHERE " + conditions.join(" AND ");

    /* GROUP BY */
    query += `
  GROUP BY
    hd.HoTen, hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue,
    hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi,
    hd.STK, hd.NganHang,
    hd.Dot, hd.KiHoc, hd.NamHoc,
    hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac
  `;

    const [teachers] = await connection.execute(query, params);


    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/moi-giang/hd-gvm/img-download-site';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      const fileList = [];
      const missingFiles = [];


      for (const teacher of teachers) {
        const filePathAdditional = await generateAdditionalFile(
          teacher,
          tempDir
        );
        if (filePathAdditional) {
          fileList.push(filePathAdditional);
        } else {
          missingFiles.push(teacher.HoTen);
        }

      }

      if (fileList.length === 0) {
        return res
          .status(400)
          .send(
            `<script>alert('Không có tài liệu bổ sung nào.'); window.location.href='/api/moi-giang/hd-gvm/img-download-site';</script>`
          );
      }

      const zipPath = path.resolve(__dirname, "TaiLieuBoSung.zip");
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {

        let fileName = `file_bo_sung_dot${dot}_ki${ki}_${namHoc}`;

        if (teacherName) {
          fileName += "_" + teacherName + ".zip";
        } else if (khoa != "ALL") {
          fileName += "_" + khoa + ".zip";
        } else {
          fileName += "_ALL.zip";
        }

        let warningMsg = "";
        if (missingFiles.length > 0) {
          warningMsg = `\\n⚠ Thiếu file minh chứng của: ${missingFiles.join(", ")}`;
        }

        res.download(zipPath, fileName, (err) => {
          if (err) {
            console.error("Lỗi gửi file:", err.message);
            res.status(500).send("Không thể tải file zip.");
          }

          fs.unlinkSync(zipPath);

          if (warningMsg) {
            console.warn(warningMsg);
          }
        });
      });


      // output.on("close", () => {

      //   let fileName = `file_bo_sung_dot${dot}_ki${ki}_${namHoc}`;

      //   if (teacherName) {
      //     fileName += "_" + teacherName + ".zip";
      //   } else if (khoa != "ALL") {
      //     fileName += "_" + khoa + ".zip";
      //   } else {
      //     fileName += "_ALL" + ".zip";
      //   }
      //   // Gửi file zip về client
      //   res.download(zipPath, `${fileName}`, (err) => {
      //     if (err) {
      //       console.error("Lỗi gửi file:", err.message);
      //       res.status(500).send("Không thể tải file zip.");
      //     }

      //     // Xoá file zip sau khi tải nếu muốn
      //     fs.unlinkSync(zipPath);
      //   });
      // });

      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(output);

      fileList.forEach((filePath) => {
        archive.file(filePath, { name: path.basename(filePath) });
      });

      await archive.finalize();
    } catch (error) {
      console.error("Lỗi:", error.message);
      return res
        .status(400)
        .send(
          `<script>alert('${error.message}'); window.location.href='/api/moi-giang/hd-gvm/img-download-site';</script>`
        );
    }
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

function createTransferDetailDocument(data = [], noiDung = "", truocthue_or_sauthue) {
  // Hàm phụ trợ: tạo ô header
  function createHeaderCell(text, isBold, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || '').split('\n');
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(new TextRun({
        text: line,
        bold: isBold,
        font: "Times New Roman",
        size: 22,
        color: "000000",
      }));
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  }  // Hàm phụ trợ: tạo ô bình thường
  function createCell(text, isBold = false, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || '').split('\n');
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(new TextRun({
        text: line,
        bold: isBold,
        font: "Times New Roman",
        size: 22,
        color: "000000",
      }));
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  }

  // Hàm tính tổng tiền
  function calculateTotal(data) {
    return data.reduce((sum, row) => sum + (row.ThucNhan || 0), 0);
  }

  // Hàm định dạng số tiền theo VNĐ
  function formatVND(amount) {
    return amount.toLocaleString("vi-VN");
  }

  // Hàm tạo bảng chi tiết
  function createDetailTable(data) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("STT", true),
        createHeaderCell("Số HĐ", true, 1950), // Đặt width cố định 1950 twips cho cột Số HĐ (tăng 50px)
        createHeaderCell("Đơn vị thụ hưởng\n(hoặc cá nhân)", true),
        createHeaderCell("SĐT", true),
        createHeaderCell("Mã số thuế", true),
        createHeaderCell("Số tài khoản", true),
        createHeaderCell("Tại ngân hàng", true, 4800), // Đặt width cố định 3600 twips (gấp 3 lần cột Số HĐ)
        createHeaderCell("Số tiền (VNĐ)", true),
      ],
    }); const dataRows = data.length
      ? data.map(
        (row, idx) =>
          new TableRow({
            children: [
              createCell((idx + 1).toString()),
              createCell((row.SoHopDong || '') + '', false, 1950), // Ô Số HĐ với width cố định (tăng 50px)
              createCell(row.HoTen || ""),
              createCell(row.DienThoai || ""),
              createCell(row.MaSoThue || ""),
              createCell(row.STK || ""),
              createCell(row.NganHang || "", false, 4800),
              createCell(row.ThucNhan ? formatVND(row.ThucNhan) : ""),
            ],
          })
      )
      : Array.from({ length: 4 }).map(
        () =>
          new TableRow({
            children: [
              createCell(""), // STT
              createCell("", false, 1950), // Số HĐ với width cố định (tăng 50px)
              createCell(""), // Đơn vị thụ hưởng
              createCell(""), // SĐT
              createCell(""), // Mã số thuế
              createCell(""), // Số tài khoản
              createCell("", false, 4800), // Tại ngân hàng với width cố định
              createCell(""), // Số tiền
            ],
          })
      );

    const totalAmount = calculateTotal(data);
    const formattedTotalAmount = formatVND(totalAmount);

    const totalRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Tổng cộng",
                  bold: true,
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          columnSpan: 7,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({
                text: formattedTotalAmount || '',  // Thay thế null/undefined bằng chuỗi rỗng
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
      ],
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
      rows: [headerRow, ...dataRows, totalRow],
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          font: "Times New Roman",
          size: 22,
          color: "000000",
        },
        paragraph: {
          color: "000000",
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE, // Đặt orientation là landscape
            margin: {
              top: 567, // 1 cm = 567 twips
              right: 567, // 1 cm
              bottom: 567, // 1 cm
              left: 567, // 1 cm
            },
            size: {
              width: 15840, // A4 landscape width (11 inches = 15840 twips)
              height: 12240, // A4 landscape height (8.5 inches = 12240 twips)
            },
          },
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "BAN CƠ YẾU CHÍNH PHỦ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "BẢNG KÊ CHI TIẾT THÔNG TIN CHUYỂN KHOẢN",
                font: "Times New Roman",
                size: 26,
                color: "000000",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Nội dung: `,
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }), new TextRun({
                text: `${noiDung || ''}`,  // Thay thế null/undefined bằng chuỗi rỗng
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
            ],
            spacing: { after: 200 },
          }),
          createDetailTable(data),
          new Paragraph({
            italics: true,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `Ghi chú: Số tiền chuyển khoản là số tiền ${truocthue_or_sauthue}`,
                font: "Times New Roman",
                size: 22,
                color: "000000",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

/**
 * Tạo và trả về Workbook cho bảng kê trừ thuế
 * @param {Array<Object>} records Mảng đối tượng chứa dữ liệu dòng (stt, contractNumber, executor, expenseDescription, idNumber, issueDate, issuePlace, idAddress, taxCode, amount, taxDeducted, netAmount)
 * @returns {ExcelJS.Workbook}
 */
function createTaxReportWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng kê tổng hợp thuế');

  // Banner & tiêu đề
  worksheet.addRow(['BAN CƠ YẾU CHÍNH PHỦ']);
  worksheet.addRow(['HỌC VIỆN KỸ THUẬT MẬT MÃ']);
  worksheet.addRow([]);
  worksheet.addRow(['BẢNG KÊ TỔNG HỢP THUẾ']);
  // worksheet.addRow(['Hợp đồng hướng dẫn đồ án tốt nghiệp']);
  worksheet.addRow([]);

  [1, 2, 4, 5].forEach(rowNum => {
    worksheet.mergeCells(`A${rowNum}:M${rowNum}`);
    worksheet.getRow(rowNum).font = { bold: true, size: rowNum === 4 ? 13 : 11 };
    worksheet.getRow(rowNum).alignment = { horizontal: 'center' };
  });

  // Cột header
  worksheet.addRow(['STT', 'Số HĐ', 'Người thực hiện', 'Nội dung chi tiêu', 'Số CCCD', 'Ngày cấp', 'Nơi cấp', 'Địa chỉ CCCD', 'SĐT', 'Mã số thuế', 'Số tiền', 'Trừ thuế', 'Còn lại']);

  // Cài đặt độ rộng cột vừa đủ với nội dung
  worksheet.columns = [
    { key: 'stt', width: 5 },                    // STT - chỉ cần vừa số
    { key: 'contractNumber', width: 6 },        // Số hợp đồng - vừa với format "123/HĐ-ĐT"
    { key: 'executor', width: 22 },              // Người thực hiện - tên đầy đủ
    { key: 'expenseDescription', width: 28 },    // Nội dung chi tiêu - mô tả dài
    { key: 'idNumber', width: 14 },              // Số CCCD - 12 chữ số + buffer
    { key: 'issueDate', width: 12 },             // Ngày cấp - DD/MM/YYYY
    { key: 'issuePlace', width: 25 },            // Nơi cấp - tên cơ quan
    { key: 'idAddress', width: 40 },             // Địa chỉ CCCD - địa chỉ đầy đủ
    { key: 'phoneNumber', width: 14 },           // SĐT - số điện thoại
    { key: 'taxCode', width: 14 },               // Mã số thuế - 10-13 chữ số
    { key: 'amount', width: 16 },                // Số tiền - định dạng #,##0
    { key: 'taxDeducted', width: 16 },           // Trừ thuế - định dạng #,##0
    { key: 'netAmount', width: 16 }              // Còn lại - định dạng #,##0
  ];

  worksheet.getRow(7).font = { bold: true, size: 11 };
  worksheet.autoFilter = 'A7:M7';
  worksheet.views = [{ state: 'frozen', ySplit: 7 }];

  // Chèn dữ liệu bắt đầu từ hàng 8
  // Đảm bảo dữ liệu được chèn đúng thứ tự cột bằng cách chuyển đổi object thành array
  const dataRows = records.map(record => [
    record.stt,
    record.contractNumber,
    record.executor,
    record.expenseDescription,
    record.idNumber,
    record.issueDate,
    record.issuePlace,
    record.idAddress,
    record.phoneNumber,
    record.taxCode,
    record.amount,
    record.taxDeducted,
    record.netAmount
  ]);

  dataRows.forEach(row => {
    worksheet.addRow(row);
  });

  // Áp dụng định dạng số có dấu phẩy cho các cột tiền tệ
  const dataStartRow = 8;
  const dataEndRow = worksheet.lastRow.number; // Dòng cuối của dữ liệu (không bao gồm tổng cộng)

  // Định dạng cột F (Ngày cấp CCCD) - định dạng ngày DD/MM/YYYY
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const cell = worksheet.getCell(`F${row}`);
    if (cell.value && cell.value instanceof Date) {
      cell.numFmt = 'dd/mm/yyyy';
    }
  }

  // Định dạng cột K (Số tiền), L (Trừ thuế), M (Còn lại)
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    ['K', 'L', 'M'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      if (cell.value && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  // Tính tổng trước khi thêm vào Excel
  let totalAmount = 0;
  let totalTax = 0;
  let totalNet = 0;
  if (records && records.length > 0) {
    records.forEach(record => {
      totalAmount += typeof record.amount === 'number' ? record.amount : 0;
      totalTax += typeof record.taxDeducted === 'number' ? record.taxDeducted : 0;
      totalNet += typeof record.netAmount === 'number' ? record.netAmount : 0;
    });
  }

  // Footer: Tổng cộng - sử dụng giá trị đã tính sẵn thay vì formula
  worksheet.addRow([
    'Tổng cộng:', '', '', '', '', '', '', '', '', '',
    totalAmount,
    totalTax,
    totalNet
  ]);
  const totalRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${totalRow}:J${totalRow}`);
  worksheet.getRow(totalRow).font = { bold: true };
  worksheet.getRow(totalRow).alignment = { horizontal: 'right' };

  // Áp dụng định dạng số có dấu phẩy cho dòng tổng cộng
  ['K', 'L', 'M'].forEach(col => {
    worksheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });

  // Bằng chữ - sử dụng totalAmount đã tính ở trên
  const textRowVal = `Bằng chữ: ${numberToWords(totalAmount)} đồng chẵn.`;
  worksheet.addRow([textRowVal]);
  const textRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${textRow}:M${textRow}`);
  worksheet.getRow(textRow).font = { italic: true, size: 10 };

  // Ngày tháng năm
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', '', '', '', '', '', `Ngày ... tháng ... năm 2025`, '', '', '', '']);
  const dateRow = worksheet.lastRow.number;
  worksheet.mergeCells(`J${dateRow}:M${dateRow}`);
  worksheet.getRow(dateRow).font = { size: 10 };
  worksheet.getRow(dateRow).alignment = { horizontal: 'center' };

  // Ký tên
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', 'Người lập bảng', '', '', '', 'Trưởng phòng Đào tạo', '', '', '', '']);
  const signRow = worksheet.lastRow.number;
  worksheet.getRow(signRow).font = { bold: true, size: 10 };
  worksheet.getRow(signRow).alignment = { horizontal: 'center' };

  return workbook;
}

module.exports = {
  exportMultipleContracts,
  getExportHDSite,
  exportAdditionalInfoGvm,
  getExportAdditionalInfoGvmSite,
  getImageDownloadSite,
  exportImageDownloadData,
};
```

## File: src/controllers/exportPhuLucDAController.js
```javascript
const express = require("express");
const ExcelJS = require("exceljs");
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const path = require("path");

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]/gi, "_");
}

function convertToRoman(num) {
  const romanNumerals = [
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 8, numeral: "VIII" },
    { value: 7, numeral: "VII" },
    { value: 6, numeral: "VI" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 3, numeral: "III" },
    { value: 2, numeral: "II" },
    { value: 1, numeral: "I" },
  ];

  return romanNumerals
    .filter((r) => num >= r.value)
    .map((r) => {
      const times = Math.floor(num / r.value);
      num -= times * r.value;
      return r.numeral.repeat(times);
    })
    .join("");
}
// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return capitalizeFirstLetter(words.trim() + " đồng");
};

function formatVietnameseDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}
function formatDateDMY(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const getExportPhuLucDAPath = async (
  req,
  res,
  connection,
  dot,
  ki,
  namHoc,
  khoa,
  he_dao_tao,
  teacherName,
  data
) => {
  try {
    const isKhoa = req.session.isKhoa;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();

    // Nhóm dữ liệu theo giảng viên
    const groupedData = data.reduce((acc, cur) => {
      (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
      return acc;
    }, {});

    // Tạo một sheet cho mỗi giảng viên
    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      const cccds = [...new Set(giangVienData.map((item) => item.CCCD))];
      // const last4CCCDs = cccds.map((cccd) => cccd.slice(-4)).join(", ");
      const last4CCCDs = cccds
        .map((cccd) => cccd?.slice?.(-4) || "")
        .join(", ");

      const worksheet = workbook.addWorksheet(
        `${giangVien.replace(/\s*\(.*?\)\s*/g, "").trim()} - ${last4CCCDs}`
      );

      worksheet.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0 = worksheet.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1 = worksheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);

      const titleRow2 = worksheet.addRow(["Phụ lục"]);
      titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

      // Tìm ngày bắt đầu sớm nhất từ dữ liệu giảng viên (cho tiêu đề "Hợp đồng số:")
      const earliestDate = giangVienData.reduce((minDate, item) => {
        const currentStartDate = new Date(item.NgayBatDau);
        return currentStartDate < minDate ? currentStartDate : minDate;
      }, new Date(giangVienData[0].NgayBatDau));
      const formattedEarliestDate = formatVietnameseDate(earliestDate);

      // Tìm ngày kết thúc muộn nhất từ dữ liệu giảng viên (cho tiêu đề "Kèm theo biên bản nghiệm thu")
      const latestDate = giangVienData.reduce((maxDate, item) => {
        const currentEndDate = new Date(item.NgayKetThuc);
        return currentEndDate > maxDate ? currentEndDate : maxDate;
      }, new Date(giangVienData[0].NgayKetThuc));
      const formattedLatestDate = formatVietnameseDate(latestDate);

      const soHopDong = giangVienData[0]?.SoHopDong || "";

      // Xử lý soHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
      // Tab 1: Dùng ngày bắt đầu sớm nhất (formattedEarliestDate)
      const contractNumber =
        soHopDong && soHopDong.trim() !== ""
          ? `Hợp đồng số: ${soHopDong} ${formattedEarliestDate}`
          : `Hợp đồng số:      /HĐ-ĐT ${formattedEarliestDate}`;

      const titleRow3 = worksheet.addRow([contractNumber]);
      titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

      // const titleRow4 = worksheet.addRow([
      //   `Kèm theo biên bản nghiệm thu Hợp đồng số:     /HĐ-ĐT ${formattedEarliestDate}`,
      // ]);
      // titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
      // titleRow4.alignment = { horizontal: "center", vertical: "middle" };
      // worksheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5 = worksheet.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`K${titleRow5.number}:M${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
        "STT", // Thêm tiêu đề STT
        "Họ tên giảng viên",
        "Tên đồ án",
        "Sinh viên thực hiện",
        "Số tiết",
        "Thời gian thực hiện",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow = worksheet.addRow(header);
      headerRow.font = { name: "Times New Roman", bold: true };
      // worksheet.getColumn(10).numFmt = "#,##0"; // Thành tiền

      // worksheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
      // worksheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
      // worksheet.getColumn(13).numFmt = "#,##0"; // Còn lại

      worksheet.pageSetup = {
        paperSize: 9, // Kích thước giấy A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };

      // Căn chỉnh độ rộng cột
      // Định dạng cột
      worksheet.getColumn(1).width = 5; // STT
      worksheet.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet.getColumn(3).width = 29; // Tên đồ án
      worksheet.getColumn(4).width = 14; // Sinh viên thực hiện
      worksheet.getColumn(5).width = 10; // Số tiết
      worksheet.getColumn(6).width = 18; // Thời gian thực hiện
      worksheet.getColumn(7).width = 28; // Địa chỉ
      worksheet.getColumn(8).width = 6; // Học vị
      worksheet.getColumn(9).width = 6; // Hệ số lương
      worksheet.getColumn(10).width = 12; // Mức thanh toán
      worksheet.getColumn(11).width = 13; // Thành tiền
      worksheet.getColumn(12).width = 13; // Trừ thuế TNCN 10%
      worksheet.getColumn(13).width = 13; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow.eachCell((cell) => {
        cell.font = { name: "Times New Roman", bold: true, size: 11 }; // Chỉnh cỡ chữ và kiểu chữ

        cell.fill = {
          type: "pattern",
          pattern: "none", // Không màu nền
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      let totalSoTiet = 0;
      let totalSoTien = 0;
      let totalTruThue = 0;
      let totalThucNhan = 0;

      giangVienData.forEach((item, index) => {
        let hoTenTrim = item.GiangVien.replace(/\s*\(.*?\)\s*/g, "").trim();
        const mucThanhToan = Number(item.TienMoiGiang || 0);
        const soTien = Number(item.ThanhTien || 0);
        const truThue = Number(item.TruThue || 0);
        const thucNhan = Number(item.ThucNhan || 0);

        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        // const hocKyLaMa = convertToRoman(item.HocKy);
        // Viết tắt Học vị
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;
        const row = worksheet.addRow([
          index + 1, // STT
          hoTenTrim,
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
          thoiGianThucHien,
          item.DiaChi,
          hocViVietTat, // Sử dụng viết tắt cho Học vị
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
          mucThanhToan.toLocaleString("vi-VN"), // Mức thanh toán
          soTien.toLocaleString("vi-VN"), // Thành tiền
          truThue.toLocaleString("vi-VN"), // Trừ thuế TNCN 10%
          thucNhan.toLocaleString("vi-VN"), // Còn lại
        ]);
        row.font = { name: "Times New Roman", size: 13 };
        // row.getCell(11).numFmt = "#,##0"; // Còn lại

        // row.getCell(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
        // row.getCell(13).numFmt = "#,##0"; // Còn lại

        // Bật wrapText cho các ô dữ liệu và căn giữa
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Chỉnh cỡ chữ cho từng cột
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            // case 7: // Học kỳ
            //   cell.font = { name: "Times New Roman", size: 13 };
            //   break;
            case 7: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 8: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 9: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;
      });

      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
        "",
        // "",
        "",
        "",
        "",
        "",
        totalSoTien.toLocaleString("vi-VN"),
        totalTruThue.toLocaleString("vi-VN"),
        totalThucNhan.toLocaleString("vi-VN"),
      ]);
      totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Gộp ô cho hàng tổng cộng
      worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      // Thêm hai dòng trống
      worksheet.addRow([]);

      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      const bangChuRow = worksheet.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien)}`,
      ]);
      bangChuRow.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet.mergeCells(`A${bangChuRow.number}:${bangChuRow.number}`);
      bangChuRow.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 6 trở đi
      const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 7
      const lastRowOfTable = totalRow.number; // Hàng tổng cộng

      for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }

      const sheetName2 = `${giangVien
        .replace(/\s*\(.*?\)\s*/g, "")
        .trim()} - ${last4CCCDs} (2)`;
      const worksheet2 = workbook.addWorksheet(sheetName2);

      // Thêm tiêu đề cho sheet 2
      worksheet2.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0_2 = worksheet2.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0_2.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow0_2.number}:C${titleRow0_2.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1_2 = worksheet2.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow1_2.number}:C${titleRow1_2.number}`);

      const titleRow2_2 = worksheet2.addRow(["Phụ lục "]);
      titleRow2_2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow2_2.number}:L${titleRow2_2.number}`); // const titleRow3_2 = worksheet2.addRow([
      //   `Hợp đồng số:    /HĐ-ĐT (Bản sao)`,
      // ]);
      // titleRow3_2.font = { name: "Times New Roman", bold: true, size: 16 };
      // titleRow3_2.alignment = { horizontal: "center", vertical: "middle" };
      // worksheet2.mergeCells(`A${titleRow3_2.number}:L${titleRow3_2.number}`);      // Lấy SoThanhLyHopDong từ dữ liệu giảng viên
      const soThanhLyHopDong = giangVienData[0]?.SoThanhLyHopDong || "";

      // Xử lý soThanhLyHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
      const verificationContractNumber =
        soThanhLyHopDong && soThanhLyHopDong.trim() !== ""
          ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${soThanhLyHopDong} ${formattedLatestDate}`
          : `Kèm theo biên bản nghiệm thu Hợp đồng số:             /HĐNT-ĐT ${formattedLatestDate}`;

      const titleRow4_2 = worksheet2.addRow([verificationContractNumber]);
      titleRow4_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow4_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow4_2.number}:M${titleRow4_2.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5_2 = worksheet2.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5_2.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`K${titleRow5_2.number}:M${titleRow5_2.number}`);

      worksheet2.pageSetup = {
        paperSize: 9, // Kích thước giấy A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };
      // Định nghĩa tiêu đề cột cho sheet 2
      const header2 = [
        "STT",
        "Họ tên giảng viên",
        "Tên đồ án",
        "Sinh viên thực hiện",
        "Số tiết",
        "Thời gian thực hiện",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow2 = worksheet2.addRow(header2);
      headerRow2.font = { name: "Times New Roman", bold: true, size: 11 };
      headerRow2.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "none",
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      // Định dạng cột giống sheet 1
      worksheet2.getColumn(1).width = 5; // STT
      worksheet2.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet2.getColumn(3).width = 29; // Tên đồ án
      worksheet2.getColumn(4).width = 14; // Sinh viên thực hiện
      worksheet2.getColumn(5).width = 10; // Số tiết
      worksheet2.getColumn(6).width = 18; // Thời gian thực hiện
      worksheet2.getColumn(7).width = 28; // Địa chỉ
      worksheet2.getColumn(8).width = 6; // Học vị
      worksheet2.getColumn(9).width = 6; // Hệ số lương
      worksheet2.getColumn(10).width = 12; // Mức thanh toán
      worksheet2.getColumn(11).width = 13; // Thành tiền
      worksheet2.getColumn(12).width = 13; // Trừ thuế TNCN 10%
      worksheet2.getColumn(13).width = 13; // Còn lại

      // Định dạng page setup giống sheet 1
      worksheet2.pageSetup = { ...worksheet.pageSetup };

      // Thêm dữ liệu cho sheet 2 giống sheet 1
      let totalSoTiet2 = 0;
      let totalSoTien2 = 0;
      let totalTruThue2 = 0;
      let totalThucNhan2 = 0;

      giangVienData.forEach((item, index) => {
        let hoTenTrim = item.GiangVien.replace(/\s*\(.*?\)\s*/g, "").trim();
        const mucThanhToan = Number(item.TienMoiGiang || 0);
        const soTien = Number(item.ThanhTien || 0);
        const truThue = Number(item.TruThue || 0);
        const thucNhan = Number(item.ThucNhan || 0);
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;

        const row = worksheet2.addRow([
          index + 1,
          hoTenTrim,
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
          thoiGianThucHien,
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
          mucThanhToan.toLocaleString("vi-VN"),
          soTien.toLocaleString("vi-VN"),
          truThue.toLocaleString("vi-VN"),
          thucNhan.toLocaleString("vi-VN"),
        ]);
        row.font = { name: "Times New Roman", size: 13 };
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Thêm định dạng font cho từng cột giống sheet 1
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên đồ án
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Sinh viên thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 8: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 9: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet2 += parseFloat(item.SoTiet);
        totalSoTien2 += soTien;
        totalTruThue2 += truThue;
        totalThucNhan2 += thucNhan;
      });

      // Thêm hàng tổng cộng cho sheet 2
      const totalRow2 = worksheet2.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet2.toLocaleString("vi-VN").replace(/\./g, ","),
        "",
        "",
        "",
        "",
        "",
        totalSoTien2.toLocaleString("vi-VN"),
        totalTruThue2.toLocaleString("vi-VN"),
        totalThucNhan2.toLocaleString("vi-VN"),
      ]);
      totalRow2.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow2.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet2.mergeCells(`A${totalRow2.number}:C${totalRow2.number}`);

      // Thêm hai dòng trống
      worksheet2.addRow([]);

      // Thêm dòng "Bằng chữ" cho sheet 2
      const bangChuRow2 = worksheet2.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien2)}`,
      ]);
      bangChuRow2.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet2.mergeCells(`A${bangChuRow2.number}:${bangChuRow2.number}`);
      bangChuRow2.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 8 đến hàng tổng cộng
      const firstRowOfTable2 = 8;
      const lastRowOfTable2 = totalRow2.number;
      for (let i = firstRowOfTable2; i <= lastRowOfTable2; i++) {
        const row = worksheet2.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }
    }

    // Sau khi tạo xong các sheet giảng viên, tạo sheet Tổng hợp
    const summarySheet = workbook.addWorksheet("Tổng hợp");

    // Thiết lập các thông số cho trang
    summarySheet.pageSetup = {
      paperSize: 9, // Kích thước giấy A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3149,
        right: 0.3149,
        top: 0,
        bottom: 0,
        header: 0.3149,
        footer: 0.3149,
      },
    };

    // Thêm tiêu đề
    summarySheet.addRow([]);
    // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
    const titleRow0 = summarySheet.addRow(["Ban Cơ yếu Chính phủ"]);
    titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
    titleRow0.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

    // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
    const titleRow1 = summarySheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
    titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow1.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);
    const titleRow2 = summarySheet.addRow(["Phụ lục"]);
    titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`); // Lấy SoHopDong từ dữ liệu đầu tiên để hiển thị trong tổng hợp
    const firstSoHopDong = data[0]?.SoHopDong || "";
    const firstSoThanhLyHopDong = data[0]?.SoThanhLyHopDong || "";

    // Xử lý firstSoHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
    const summaryContractNumber =
      firstSoHopDong && firstSoHopDong.trim() !== ""
        ? `Hợp đồng số: ${firstSoHopDong} `
        : `Hợp đồng số:             /HĐ-ĐT `;
    const titleRow3 = summarySheet.addRow([summaryContractNumber]);
    titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow3.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

    // Xử lý firstSoThanhLyHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
    const summaryVerificationNumber =
      firstSoThanhLyHopDong && firstSoThanhLyHopDong.trim() !== ""
        ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${firstSoThanhLyHopDong} `
        : `Kèm theo biên bản nghiệm thu Hợp đồng số:             /HĐNT-ĐT `;

    const titleRow4 = summarySheet.addRow([summaryVerificationNumber]);
    titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow4.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);
    // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
    const titleRow5 = summarySheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Đơn vị tính: Đồng",
      "",
      "",
    ]);
    titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`K${titleRow5.number}:M${titleRow5.number}`);

    // Thiết lập tiêu đề cột
    const summaryHeader = [
      "STT",
      "Họ tên giảng viên",
      "Tên đồ án ",
      "Sinh viên thực hiện",
      "Số tiết",
      "Thời gian thực hiện",
      "Địa chỉ",
      "Học vị",
      "HS lương",
      "Mức thanh toán",
      "Thành tiền",
      "Trừ thuế TNCN 10%",
      "Còn lại",
    ];

    const headerRow = summarySheet.addRow(summaryHeader);
    headerRow.font = { name: "Times New Roman", bold: true };
    headerRow.font = { name: "Times New Roman", bold: true };
    // summarySheet.getColumn(10).numFmt = "#,##0"; // Thành tiền

    // summarySheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
    // summarySheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
    // summarySheet.getColumn(13).numFmt = "#,##0"; // Còn lại

    // Định dạng cột
    summarySheet.getColumn(1).width = 5; // STT
    summarySheet.getColumn(2).width = 18; // Họ tên giảng viên
    summarySheet.getColumn(3).width = 29; // Tên đồ án
    summarySheet.getColumn(4).width = 14; // Sinh viên thực hiệns
    summarySheet.getColumn(5).width = 10; // Số tiết
    summarySheet.getColumn(6).width = 18; // Thời gian thực hiện
    summarySheet.getColumn(7).width = 28; // Địa chỉ
    summarySheet.getColumn(8).width = 6; // Học vị
    summarySheet.getColumn(9).width = 6; // Hệ số lương
    summarySheet.getColumn(10).width = 12; // Mức thanh toán
    summarySheet.getColumn(11).width = 13; // Thành tiền
    summarySheet.getColumn(12).width = 13; // Trừ thuế TNCN 10%
    summarySheet.getColumn(13).width = 13; // Còn lại

    // Thêm dữ liệu vào sheet tổng hợp
    let stt = 1;
    let totalSoTiet = 0;
    let totalSoTien = 0;
    let totalTruThue = 0;
    let totalThucNhan = 0;

    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      giangVienData.forEach((item) => {
        let hoTenTrim = item.GiangVien.replace(/\s*\(.*?\)\s*/g, "").trim();
        const mucThanhToan = Number(item.TienMoiGiang || 0);
        const soTien = Number(item.ThanhTien || 0);
        const truThue = Number(item.TruThue || 0);
        const conLai = Number(item.ThucNhan || 0);

        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;

        // Thêm hàng dữ liệu vào sheet tổng hợp
        const summaryRow = summarySheet.addRow([
          stt,
          hoTenTrim,
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          //   convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
          (mucThanhToan).toLocaleString("vi-VN"), // Mức thanh toán
          soTien.toLocaleString("vi-VN"), // Định dạng số tiền
          truThue.toLocaleString("vi-VN"), // Định dạng số tiền
          conLai.toLocaleString("vi-VN"), // Định dạng số tiền
        ]);

        // Cập nhật các tổng cộng
        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += conLai;

        // Căn chỉnh cỡ chữ và kiểu chữ cho từng ô trong hàng dữ liệu
        summaryRow.eachCell((cell, colNumber) => {
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;

            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
          cell.alignment = { horizontal: "center", vertical: "middle" }; // Căn giữa
          cell.alignment.wrapText = true; // Bật wrapText cho ô
        });

        stt++; // Tăng số thứ tự
      });
    }

    // Thêm hàng tổng cộng vào cuối bảng
    const totalRow = summarySheet.addRow([
      "Tổng cộng",
      "",
      "",
      "",
      totalSoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
      "",
      "",
      "",
      "",
      "",
      totalSoTien.toLocaleString("vi-VN"),
      totalTruThue.toLocaleString("vi-VN"),
      totalThucNhan.toLocaleString("vi-VN"),
    ]);

    totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
    totalRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Gộp ô cho hàng tổng cộng
    summarySheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    // Định dạng các ô trong bảng
    const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 8
    const lastRowOfTable = totalRow.number; // Hàng tổng cộng

    for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
      const row = summarySheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // Định dạng cho tiêu đề cột
    headerRow.eachCell((cell) => {
      cell.font = { name: "Times New Roman", bold: true, size: 11 }; // Chỉnh cỡ chữ và kiểu chữ

      cell.fill = {
        type: "pattern",
        pattern: "none", // Không màu nền
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Tạo tên file
    let fileName = `PhuLuc_DA${dot}_${ki}_${namHoc}`;
    if (khoa && khoa !== "ALL") {
      fileName += `_${sanitizeFileName(khoa)}`;
    }
    if (teacherName) {
      fileName += `_${sanitizeFileName(teacherName)}`;
    }
    fileName += ".xlsx";

    // Tạo đường dẫn đầy đủ tới file
    const filePath = path.join(tempDir, fileName);

    // Ghi workbook vào file
    await workbook.xlsx.writeFile(filePath);

    // Trả về đường dẫn file để dùng tiếp (nén, gửi,...)
    return filePath;
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const doanServices = require("../services/doanServices");

const exportPhuLucDA = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    let { dot, ki, namHoc, loaiHopDong, khoa, teacherName, he_dao_tao } =
      req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đợt, kỳ hoặc năm học",
      });
    }

    const data = await doanServices.getPhuLucDAData(dot, ki, namHoc, khoa, he_dao_tao, teacherName);

    // DEBUG: Kiểm tra dữ liệu ngày từ truy vấn
    // console.log("=== DEBUG PHỤ LỤC ĐỒ ÁN ===");
    // console.log("Query executed:", query);
    // console.log("Params:", params);
    // if (data.length > 0) {
    //   console.log("First record NgayBatDau:", data[0].NgayBatDau);
    //   console.log("First record NgayKetThuc:", data[0].NgayKetThuc);
    //   console.log("All records dates:");
    //   data.forEach((item, idx) => {
    //     console.log(`  [${idx}] ${item.GiangVien}: NgayBatDau=${item.NgayBatDau}, NgayKetThuc=${item.NgayKetThuc}`);
    //   });
    // }
    // console.log("=== END DEBUG ===");

    if (data.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/exportPhuLucDA';</script>"
      );
    }
    const filePaths = await getExportPhuLucDAPath(
      req,
      res,
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
      data
    );

    // Kiểm tra filePaths
    if (!filePaths) {
      console.error("getExportPhuLucGiangVienMoiPath trả về undefined");
      return res.status(500).json({
        success: false,
        message: "Không thể tạo file export",
      });
    }

    // Lấy tên file từ đường dẫn
    const fileName = path.basename(filePaths);

    // Gửi file cho client
    res.download(filePaths, fileName, (err) => {
      if (err) {
        console.error("Lỗi khi gửi file:", err);
        if (!res.headersSent) {
          return res.status(500).send("Lỗi khi gửi file");
        }
      }

      // Xóa file và thư mục sau khi gửi
      setTimeout(() => {
        try {
          if (fs.existsSync(filePaths)) {
            fs.unlinkSync(filePaths); // Xóa file
            console.log("Đã xóa file:", filePaths);

            // Xóa thư mục tạm (nếu rỗng)
            const tempDir = path.dirname(filePaths);
            try {
              fs.rmdirSync(tempDir); // Chỉ xóa được thư mục rỗng
              console.log("Đã xóa thư mục:", tempDir);
            } catch (dirErr) {
              console.log(
                "Không thể xóa thư mục (có thể không rỗng):",
                tempDir
              );
            }
          }
        } catch (cleanupErr) {
          console.error("Lỗi khi xóa file:", cleanupErr);
        }
      }, 100);
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getPhuLucDASite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.phuLucDoAn.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  exportPhuLucDA,
  getExportPhuLucDAPath,
  getPhuLucDASite,
};
```

## File: src/controllers/hopdong.duyetHopDongDoAnController.js
```javascript
const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const { DON_GIA_EXPR } = require('../queries/hopdongQueries');

/**
 * Tạo subquery chung cho dữ liệu đồ án tốt nghiệp
 * Trích xuất giảng viên 1 (12-20 tiết) và giảng viên 2 (8 tiết)
 * @param {string} namHoc - Năm học
 * @param {string} dot - Đợt
 * @param {string} ki - Kỳ
 * @param {string|null} maPhongBan - Mã phòng ban (null hoặc "ALL" = tất cả)
 * @param {string|null} heDaoTao - Hệ đào tạo (null = tất cả)
 * @returns {{ subquery: string, params: Array }} Subquery và params
 */
const buildDoAnBaseQuery = (namHoc, dot, ki, maPhongBan = null, heDaoTao = null) => {
    let params = [];

    // Điều kiện WHERE cho GiangVien1 và GiangVien2
    let whereConditions = `
        NamHoc = ?
        AND Dot = ?
        AND ki = ?
    `;

    // Subquery cho Giảng viên 1 (12 hoặc 20 tiết)
    let gv1Query = `
        SELECT
            NgayBatDau,
            NgayKetThuc,
            MaPhongBan,
            TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
            Dot,
            NamHoc,
            ki,
            TenDeTai,
            SinhVien,
            MaSV,
            khoa_sinh_vien,
            nganh,
            he_dao_tao,
            CASE
                WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 20
                ELSE 12
            END AS SoTiet,
            TaiChinhDuyet
        FROM doantotnghiep
        WHERE GiangVien1 IS NOT NULL
            AND GiangVien1 != ''
            AND (GiangVien1 NOT LIKE '%-%'
                OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
            AND ${whereConditions}
    `;
    params.push(namHoc, dot, ki);

    // Thêm filter phòng ban nếu có
    if (maPhongBan && maPhongBan !== "ALL") {
        gv1Query += ` AND MaPhongBan = ?`;
        params.push(maPhongBan);
    }

    // Thêm filter hệ đào tạo nếu có
    if (heDaoTao) {
        gv1Query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    // Subquery cho Giảng viên 2 (8 tiết)
    let gv2Query = `
        SELECT
            NgayBatDau,
            NgayKetThuc,
            MaPhongBan,
            TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
            Dot,
            NamHoc,
            ki,
            TenDeTai,
            SinhVien,
            MaSV,
            khoa_sinh_vien,
            nganh,
            he_dao_tao,
            8 AS SoTiet,
            TaiChinhDuyet
        FROM doantotnghiep
        WHERE GiangVien2 IS NOT NULL
            AND GiangVien2 != 'không'
            AND GiangVien2 != ''
            AND (GiangVien2 NOT LIKE '%-%'
                OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
            AND ${whereConditions}
    `;
    params.push(namHoc, dot, ki);

    // Thêm filter phòng ban nếu có
    if (maPhongBan && maPhongBan !== "ALL") {
        gv2Query += ` AND MaPhongBan = ?`;
        params.push(maPhongBan);
    }

    // Thêm filter hệ đào tạo nếu có
    if (heDaoTao) {
        gv2Query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    // Kết hợp thành UNION ALL
    const subquery = `(${gv1Query} UNION ALL ${gv2Query}) da`;

    return { subquery, params };
};

/**
 * Lấy định mức số tiết giảng dạy
 * @param {Object} connection - Database connection
 * @returns {Promise<{SoTietDinhMuc, SoTietDinhMucChuaNghiHuu, SoTietDinhMucDaNghiHuu}>}
 */
const getSoTietDinhMuc = async (connection) => {
    const [sotietResult] = await connection.query(
        `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`
    );
    return {
        SoTietDinhMuc: sotietResult[0]?.GiangDay || 0,
        SoTietDinhMucChuaNghiHuu: sotietResult[0]?.GiangDayChuaNghiHuu || sotietResult[0]?.GiangDay || 280,
        SoTietDinhMucDaNghiHuu: sotietResult[0]?.GiangDayDaNghiHuu || 560
    };
};

/**
 * Render site
 */
const getDuyetHopDongPage = (req, res) => {
    try {
        res.render('hopdong.duyetHopDongDoAn.ejs');
    } catch (error) {
        console.error("Error rendering duyet hop dong page:", error);
        res.status(500).send("Internal Server Error");
    }
};


/**
 * Xem theo giảng viên 
 */
const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong, ki } = req.body;
        if (!dot || !namHoc || !loaiHopDong || !ki) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Kỳ, Loại hợp đồng"
            });
        }

        // Sử dụng shared base query
        const { subquery, params } = buildDoAnBaseQuery(namHoc, dot, ki, maPhongBan);

        // Build outer query với các SELECT fields và JOINs
        const query = `
            SELECT
                da.NgayBatDau,
                da.NgayKetThuc,
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
                gv.isNghiHuu,
                da.MaPhongBan AS MaKhoaMonHoc,
                SUM(da.SoTiet) AS SoTiet,
                da.he_dao_tao,
                da.NamHoc,
                da.Dot,
                da.ki,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                GROUP_CONCAT(DISTINCT da.TenDeTai SEPARATOR ', ') AS MonHoc,
                GROUP_CONCAT(DISTINCT da.SinhVien  SEPARATOR ', ') AS Lop,
                GROUP_CONCAT(DISTINCT da.MaSV      SEPARATOR ', ') AS SiSo,
                GROUP_CONCAT(DISTINCT da.khoa_sinh_vien SEPARATOR ', ') AS KhoaSinhVien,
                GROUP_CONCAT(DISTINCT da.nganh SEPARATOR ', ') AS Nganh,
                ${DON_GIA_EXPR('da', 'MaPhongBan')}                       AS TienMoiGiang,
                SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')}         AS ThanhTien,
                SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.1   AS Thue,
                SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.9   AS ThucNhan,
                NULL                          AS SoHopDong,
                'Chưa có hợp đồng'            AS TrangThaiHopDong,
                pb.TenPhongBan,
                1                              AS DaoTaoDuyet,
                MAX(da.TaiChinhDuyet)          AS TaiChinhDuyet
            FROM ${subquery}
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
            LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
            GROUP BY
                gv.id_Gvm, gv.HoTen, da.MaPhongBan, pb.TenPhongBan,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD,
                gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL,
                gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                da.NamHoc, da.Dot, da.ki, da.he_dao_tao,
                gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep,
                gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh,
                da.NgayBatDau, da.NgayKetThuc
        `;

        const [results] = await connection.query(query, params);

        // DEBUG: Log raw database results to check isNghiHuu field
        if (results.length > 0) {
            console.log('[DEBUG CONTROLLER] First result from DB:', {
                HoTen: results[0].HoTen,
                isNghiHuu: results[0].isNghiHuu,
                isNghiHuuType: typeof results[0].isNghiHuu,
                allKeys: Object.keys(results[0])
            });
        }

        // 1) Gom nhóm theo giảng viên với breakdown chương trình
        const groupedByTeacher = results.reduce((acc, cur) => {
            const t = cur.HoTen;
            if (!acc[t]) {
                acc[t] = {
                    teacherInfo: {
                        id_Gvm: cur.id_Gvm,
                        HoTen: cur.HoTen,
                        GioiTinh: cur.GioiTinh,
                        NgaySinh: cur.NgaySinh,
                        CCCD: cur.CCCD,
                        NoiCapCCCD: cur.NoiCapCCCD,
                        Email: cur.Email,
                        MaSoThue: cur.MaSoThue,
                        HocVi: cur.HocVi,
                        ChucVu: cur.ChucVu,
                        HSL: cur.HSL,
                        DienThoai: cur.DienThoai,
                        STK: cur.STK,
                        NganHang: cur.NganHang,
                        MaPhongBan: cur.MaPhongBan,
                        isNghiHuu: cur.isNghiHuu,
                        NgayCapCCCD: cur.NgayCapCCCD,
                        DiaChi: cur.DiaChi,
                        BangTotNghiep: cur.BangTotNghiep,
                        NoiCongTac: cur.NoiCongTac,
                        BangTotNghiepLoai: cur.BangTotNghiepLoai,
                        MonGiangDayChinh: cur.MonGiangDayChinh,
                        NgayBatDau: cur.NgayBatDau,
                        NgayKetThuc: cur.NgayKetThuc,
                        TenPhongBan: cur.TenPhongBan,
                        SoHopDong: cur.SoHopDong,
                        TrangThaiHopDong: cur.TrangThaiHopDong,
                        DaoTaoDuyet: cur.DaoTaoDuyet,
                        TaiChinhDuyet: cur.TaiChinhDuyet,
                        KhoaSinhVien: cur.KhoaSinhVien,
                        Nganh: cur.Nganh
                    },
                    trainingPrograms: [],
                    totalFinancials: {
                        totalSoTiet: 0,
                        totalThanhTien: 0,
                        totalThue: 0,
                        totalThucNhan: 0
                    }
                };
            }
            const prog = {
                id: cur.he_dao_tao,  // ID để preview page sử dụng
                he_dao_tao: cur.he_dao_tao,
                SoTiet: +cur.SoTiet,
                TienMoiGiang: +cur.TienMoiGiang,
                ThanhTien: +cur.ThanhTien,
                Thue: +cur.Thue,
                ThucNhan: +cur.ThucNhan,
                MaKhoaMonHoc: cur.MaKhoaMonHoc,
                MonHoc: cur.MonHoc,
                Lop: cur.Lop,
                SiSo: cur.SiSo
            };
            acc[t].trainingPrograms.push(prog);
            acc[t].totalFinancials.totalSoTiet += prog.SoTiet;
            acc[t].totalFinancials.totalThanhTien += prog.ThanhTien;
            acc[t].totalFinancials.totalThue += prog.Thue;
            acc[t].totalFinancials.totalThucNhan += prog.ThucNhan;
            return acc;
        }, {});

        // 2) Chuyển thành mảng để sort
        const teachersArr = Object.entries(groupedByTeacher).map(([name, data]) => ({
            name,
            ...data,
            totalSoTiet: data.totalFinancials.totalSoTiet,
            maPhongBan: data.teacherInfo.MaPhongBan
        }));

        // 3) MỚI: chỉ sort theo khoa
        teachersArr.sort((a, b) =>
            a.maPhongBan.localeCompare(b.maPhongBan)
        );

        // 4) Chuẩn bị output cho 2 UI
        const simplifiedGroupedByTeacher = {};
        const enhancedGroupedByTeacher = {};
        for (const t of teachersArr) {
            simplifiedGroupedByTeacher[t.name] = [{
                ...t.teacherInfo,
                SoTiet: t.totalFinancials.totalSoTiet,
                ThanhTien: t.totalFinancials.totalThanhTien,
                Thue: t.totalFinancials.totalThue,
                ThucNhan: t.totalFinancials.totalThucNhan,
                trainingPrograms: t.trainingPrograms,
                totalFinancials: t.totalFinancials
            }];
            enhancedGroupedByTeacher[t.name] = {
                teacherInfo: t.teacherInfo,
                trainingPrograms: t.trainingPrograms,
                totalFinancials: t.totalFinancials
            };
        }

        // 5) Lấy SoTietDinhMuc
        const [sotietResult] = await connection.query(`SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560;

        // console.log(enhancedGroupedByTeacher);
        return res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher,
            SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu,
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongData:", error);
        return res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};



/**
 * Approve contracts based on criteria
 */
const approveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong || ki === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kì, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        // Lấy danh sách khoa cần xử lý
        const faculties = [];
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            faculties.push(maPhongBan);
        } else {
            const [rows] = await connection.query(`SELECT MaPhongBan FROM phongban`);
            faculties.push(...rows.map(f => f.MaPhongBan));
        }

        // Kiểm tra duyệt đào tạo cho từng khoa (không xét bản đã lưu DaLuu)
        const unapprovedFaculties = [];
        for (const facultyCode of faculties) {
            const [check] = await connection.query(
                `SELECT DaoTaoDuyet FROM doantotnghiep
                 WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                   AND DaLuu = 0`,
                [facultyCode, namHoc, dot, ki]
            );
            if (check.some(r => r.DaoTaoDuyet != 1)) {
                unapprovedFaculties.push(facultyCode);
            }
        }

        if (unapprovedFaculties.length > 0) {
            return res.status(200).json({
                success: false,
                isNotification: true,
                message: `Các khoa chưa được Đào Tạo duyệt xong: ${unapprovedFaculties.join(', ')}. Vui lòng hoàn thành trước khi duyệt tài chính.`,
                unapprovedFaculties,
                affectedRows: 0
            });
        }

        // Cập nhật duyệt tài chính cho các bản ghi chưa lưu
        let affectedRows = 0;
        for (const facultyCode of faculties) {
            // Double-check bản ghi chưa lưu
            const [checkAll] = await connection.query(
                `SELECT DaoTaoDuyet FROM doantotnghiep
                 WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                   AND DaoTaoDuyet = 1 AND DaLuu = 0`,
                [facultyCode, namHoc, dot, ki]
            );
            if (checkAll.length > 0) {
                // Update with JOIN to filter by isQuanDoi = 0
                // For thesis, need to check both GiangVien1 and GiangVien2
                const [updateResult] = await connection.query(
                    `UPDATE doantotnghiep dt
                     SET dt.TaiChinhDuyet = 1
                     WHERE dt.MaPhongBan = ? AND dt.NamHoc = ? AND dt.Dot = ? AND dt.Ki = ?
                       AND dt.DaoTaoDuyet = 1 AND dt.TaiChinhDuyet != 1
                       AND dt.DaLuu = 0 `,
                    [facultyCode, namHoc, dot, ki]
                );
                affectedRows += updateResult.affectedRows;
            }
        }

        res.json({
            success: true,
            message: `Duyệt thành công`,
            affectedRows
        });

    } catch (error) {
        console.error("Error approving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi duyệt hợp đồng"
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Unapprove contracts based on criteria (reverse of approval)
 */
const unapproveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong || ki === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kì, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        const facultiesToUpdate = [];
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            facultiesToUpdate.push(maPhongBan);
        } else {
            const [faculties] = await connection.query(
                `SELECT DISTINCT MaPhongBan
                 FROM doantotnghiep
                 WHERE NamHoc = ? AND Dot = ? AND Ki = ?
                   AND TaiChinhDuyet = 1 AND DaLuu = 0`,
                [namHoc, dot, ki]
            );
            facultiesToUpdate.push(...faculties.map(f => f.MaPhongBan));
        }

        let affectedRows = 0;
        for (const facultyCode of facultiesToUpdate) {
            // Update with JOIN to filter by isQuanDoi = 0
            const [updateResult] = await connection.query(
                `UPDATE doantotnghiep dt
                 SET dt.TaiChinhDuyet = 0
                 WHERE dt.MaPhongBan = ? AND dt.NamHoc = ? AND dt.Dot = ? AND dt.Ki = ?
                   AND dt.TaiChinhDuyet = 1 AND dt.DaLuu = 0
                   AND (
                     EXISTS (
                       SELECT 1 FROM gvmoi gv 
                       WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien1, '-', 1)) = gv.HoTen 
                         AND gv.isQuanDoi = 0
                     )
                     OR EXISTS (
                       SELECT 1 FROM gvmoi gv 
                       WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien2, '-', 1)) = gv.HoTen 
                         AND gv.isQuanDoi = 0
                     )
                   )`,
                [facultyCode, namHoc, dot, ki]
            );
            affectedRows += updateResult.affectedRows;
        }

        res.json({
            success: true,
            message: `Bỏ duyệt thành công`,
            affectedRows
        });
    } catch (error) {
        console.error("Error unapproving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi bỏ duyệt hợp đồng"
        });
    } finally {
        if (connection) connection.release();
    }
};


/**
 * Get contract approval data grouped by training program (he_dao_tao)
 */
const getDuyetHopDongTheoHeDaoTao = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong, ki } = req.body;

        // Validate required parameters - thêm ki vào validation
        if (!dot || !namHoc || !loaiHopDong || !ki) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }// Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        // Sử dụng shared base query cho main aggregate query
        const { subquery, params } = buildDoAnBaseQuery(namHoc, dot, ki, maPhongBan);

        // Query for "Đồ án" - chỉ lấy he_dao_tao (ID), frontend sẽ mapping lấy tên
        const query = `
            SELECT
                MIN(da.NgayBatDau) AS NgayBatDau,
                MAX(da.NgayKetThuc) AS NgayKetThuc,
                da.he_dao_tao,
                da.NamHoc,
                da.Dot,
                SUM(da.SoTiet) AS SoTiet,
                100000 AS TienMoiGiang,
                SUM(da.SoTiet) * 100000 AS ThanhTien,
                SUM(da.SoTiet) * 100000 * 0.1 AS Thue,
                SUM(da.SoTiet) * 100000 * 0.9 AS ThucNhan,
                1 AS DaoTaoDuyet,
                1 AS TaiChinhDuyet,
                COUNT(DISTINCT da.GiangVien) AS SoGiangVien
            FROM ${subquery}
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
            LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
            GROUP BY da.NamHoc, da.Dot, da.he_dao_tao
            ORDER BY da.he_dao_tao
        `;

        const [results] = await connection.query(query, params);

        // Debug
        console.log('[DEBUG getDuyetHopDongTheoHeDaoTao] Results count:', results.length);
        if (results.length > 0) {
            console.log('[DEBUG getDuyetHopDongTheoHeDaoTao] First result:', {
                he_dao_tao: results[0].he_dao_tao,
                allKeys: Object.keys(results[0])
            });
        }

        // Get detailed teacher information for the "Đại học" training program
        const enhancedResults = [];

        for (const heDaoTao of results) {
            // Sử dụng shared base query với filter heDaoTao
            const { subquery: teacherSubquery, params: baseTeacherParams } = buildDoAnBaseQuery(
                namHoc, dot, ki, maPhongBan, heDaoTao.he_dao_tao
            );

            // Query to get detailed teacher info for this training program
            // Sử dụng subquery thay vì LEFT JOIN để tránh nhân bản rows khi SUM SoTiet
            const teacherQuery = `
                SELECT
                    gv.id_Gvm,
                    da.GiangVien,
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
                    gv.isNghiHuu,
                    pb.TenPhongBan,
                    da.he_dao_tao,
                    
                    SUM(da.SoTiet) AS SoTiet,
                    ${DON_GIA_EXPR('da', 'MaPhongBan')} AS TienMoiGiang,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} AS ThanhTien,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.1 AS Thue,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.9 AS ThucNhan,
                    
                    1 AS DaoTaoDuyet,
                    1 AS TaiChinhDuyet,
                    
                    -- Lấy thông tin đồ án bằng subquery để tránh duplicate rows
                    (SELECT GROUP_CONCAT(DISTINCT TenDeTai SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as MonHoc,
                    (SELECT GROUP_CONCAT(DISTINCT SinhVien SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as Lop,
                    (SELECT GROUP_CONCAT(DISTINCT MaSV SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as SiSo,
                    (SELECT GROUP_CONCAT(DISTINCT khoa_sinh_vien SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as KhoaSinhVien,
                    (SELECT GROUP_CONCAT(DISTINCT nganh SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as Nganh

                FROM ${teacherSubquery}
                JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
                LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
                GROUP BY
                    gv.id_Gvm, da.GiangVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, 
                    gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai, 
                    gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu, pb.TenPhongBan, da.he_dao_tao
                ORDER BY SoTiet DESC, gv.HoTen
            `;

            // params cho subqueries: 5 subqueries x 4 params each = 20 params sau baseTeacherParams
            const hdt = heDaoTao.he_dao_tao;
            const teacherParams = [
                ...baseTeacherParams,
                // Subquery MonHoc
                namHoc, dot, ki, hdt,
                // Subquery Lop
                namHoc, dot, ki, hdt,
                // Subquery SiSo
                namHoc, dot, ki, hdt,
                // Subquery KhoaSinhVien
                namHoc, dot, ki, hdt,
                // Subquery Nganh
                namHoc, dot, ki, hdt
            ];
            const [teacherDetails] = await connection.query(teacherQuery, teacherParams);

            // // DEBUG: Check isNghiHuu and HSL in database results
            // if (teacherDetails.length > 0) {
            //     console.log('[DEBUG CONTROLLER HE DAO TAO] First teacher from DB:', {
            //         teacher: teacherDetails[0].HoTen,
            //         isNghiHuu: teacherDetails[0].isNghiHuu,
            //         isNghiHuuType: typeof teacherDetails[0].isNghiHuu,
            //         HSL: teacherDetails[0].HSL,
            //         HSLType: typeof teacherDetails[0].HSL,
            //         allKeys: Object.keys(teacherDetails[0])
            //     });
            // }

            // Original HSL debug
            if (teacherDetails.length > 0) {
                console.log('Database HSL Debug for first teacher:', {
                    teacher: teacherDetails[0].HoTen,
                    HSL: teacherDetails[0].HSL,
                    HSLType: typeof teacherDetails[0].HSL,
                    HSLNull: teacherDetails[0].HSL === null,
                    HSLUndefined: teacherDetails[0].HSL === undefined
                });
            }

            // Add teacher details to the training program data
            enhancedResults.push({
                ...heDaoTao,
                chiTietGiangVien: teacherDetails
            });
        }

        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560; res.json({
            success: true,
            data: results,
            enhancedData: enhancedResults,  // Include detailed data with teacher information
            SoTietDinhMuc: SoTietDinhMuc,
            message: `Tải dữ liệu thành công. Tìm thấy ${results.length} hệ đào tạo cho đồ án (mặc định: Đại học)`
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongTheoHeDaoTao:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu theo hệ đào tạo",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check contract save status based on filter conditions
 */
const checkContractSaveStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }// Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'"
            });
        }        // Check overall status for thesis contracts
        let statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT DaLuu) as distinctValues, MIN(DaLuu) as minValue, MAX(DaLuu) as maxVal FROM doantotnghiep dt WHERE dt.NamHoc = ? AND dt.Dot = ?";
        let statusParams = [namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND dt.MaPhongBan = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không có dữ liệu";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có DaLuu = 1
            message = "Đã lưu HĐ";
        } else {
            // Có bản ghi chưa đạt điều kiện - lấy chi tiết
            message = "Chưa lưu HĐ";

            let detailQuery = `
                SELECT 
                    dt.ID,
                    dt.MaPhongBan as Khoa,
                    dt.TenDeTai,
                    dt.SinhVien,
                    dt.MaSV,
                    dt.GiangVien1,
                    dt.GiangVien2,
                    dt.DaLuu,
                    dt.NgayBatDau,
                    dt.NgayKetThuc,
                    pb.TenPhongBan as TenKhoa
                FROM doantotnghiep dt
                LEFT JOIN phongban pb ON dt.MaPhongBan = pb.MaPhongBan                WHERE dt.NamHoc = ? 
                  AND dt.Dot = ? 
                  AND (dt.DaLuu IS NULL OR dt.DaLuu <> 1)
            `;
            let detailParams = [namHoc, dot];

            if (maPhongBan && maPhongBan !== "ALL") {
                detailQuery += " AND dt.MaPhongBan = ?";
                detailParams.push(maPhongBan);
            }

            const [detailResults] = await connection.query(detailQuery, detailParams);
            unmetRecords = detailResults;
        } res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractSaveStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái lưu hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check contract financial approval status based on filter conditions
 */
const checkContractFinancialApprovalStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        let statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT TaiChinhDuyet) as distinctValues, MIN(TaiChinhDuyet) as minValue, MAX(TaiChinhDuyet) as maxVal FROM doantotnghiep dt WHERE dt.NamHoc = ? AND dt.Dot = ?";
        let statusParams = [namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND dt.MaPhongBan = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không tìm thấy dữ liệu nào phù hợp với điều kiện lọc";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            message = `Đã duyệt`;
        } else if (statusData.distinctValues === 1 && statusData.minValue === 0) {
            message = `Chưa duyệt`;
        } else {
            // Trường hợp có nhiều giá trị distinct (cả 0 và 1)
            message = `Chưa duyệt`;
        }

        console.log("debug tc duyet do an : " + message);
        res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractFinancialApprovalStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái duyệt tài chính hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDuyetHopDongPage,
    getDuyetHopDongData,
    getDuyetHopDongTheoHeDaoTao,
    approveContracts,
    unapproveContracts,
    checkContractSaveStatus,
    checkContractFinancialApprovalStatus
};
```

## File: src/controllers/hopdong.duyetHopDongMoiGiangController.js
```javascript
const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const { DON_GIA_EXPR } = require('../queries/hopdongQueries');

/**
 * Render site
 */
const getDuyetHopDongPage = (req, res) => {
    try {
        res.render('hopdong.duyetHopDongMoiGiang.ejs');
    } catch (error) {
        console.error("Error rendering duyet hop dong page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Hiển thị theo giảng viên
const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan } = req.body;
        if (!dot || !ki || !namHoc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học"
            });
        }

        /** ------------------------------------------------------------------
         *  Truy vấn vào bảng quychuan, tính theo 2 hệ : Đại học, Sau đại học.
         * 
         * Hệ đại học : 100% số tiết
         * Hệ sau đại học : giảng viên trước dấu phẩy 0,3 sau dấu phẩy nhân 0,7 số tiết
         * 
         * 
         *  ------------------------------------------------------------------ */
        const query = `
        /* HỆ ĐẠI HỌC  */
        WITH DaiHocData AS (
            SELECT
                MIN(qc.NgayBatDau)                              AS NgayBatDau,
                MAX(qc.NgayKetThuc)                              AS NgayKetThuc,
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
                gv.MaPhongBan,          -- Khoa 
                gv.isNghiHuu,
                gv.MaPhongBan           AS MaKhoaMonHoc,        
                qc.he_dao_tao           AS id_he_dao_tao,
                hdt.he_dao_tao          AS ten_he_dao_tao,
                qc.NamHoc,
                qc.KiHoc,
                qc.Dot,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,

                /* ===== TIỀN (DÙNG EXPR – KHÔNG JOIN tienluong) ===== */
                SUM(qc.QuyChuan)                                        AS SoTiet,
                ${DON_GIA_EXPR('qc', 'Khoa')}                           AS TienMoiGiang,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan)        AS ThanhTien,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan) * 0.1  AS Thue,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan) * 0.9  AS ThucNhan,

                pb.TenPhongBan,

                /* Duyệt */
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                /* MATCH GIẢNG VIÊN HỆ ĐH: lấy phần trước ' - ' */
                JOIN gvmoi gv
                    ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                JOIN he_dao_tao hdt
                    ON qc.he_dao_tao = hdt.id
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND hdt.cap_do = 1
                AND gv.isQuanDoi = 0
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            /* Gộp THEO GIẢNG VIÊN + HỆ ĐÀO TẠO (KHÔNG gộp theo khoa học phần) */
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao, hdt.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                qc.NamHoc, qc.KiHoc, qc.Dot, qc.Khoa,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                pb.TenPhongBan
        ),

        /* SAU ĐẠI HỌC */
        SauDaiHocData AS (
            SELECT
                MIN(qc.NgayBatDau)                              AS NgayBatDau,
                MAX(qc.NgayKetThuc)                              AS NgayKetThuc,
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
                gv.isNghiHuu,
                gv.MaPhongBan           AS MaKhoaMonHoc,
                qc.he_dao_tao           AS id_he_dao_tao,
                hdt.he_dao_tao          AS ten_he_dao_tao,
                qc.NamHoc,
                qc.KiHoc,
                qc.Dot,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,

                /* ===== TIỀN (DÙNG EXPR) ===== */
                                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                )                                             AS SoTiet,
                ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) AS ThanhTien,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.1 AS Thue,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.9 AS ThucNhan,

                pb.TenPhongBan,
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                
                JOIN gvmoi gv
                    ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
                JOIN he_dao_tao hdt
                    ON qc.he_dao_tao = hdt.id
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND hdt.cap_do != 1
                AND gv.isQuanDoi = 0
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao, hdt.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                qc.NamHoc, qc.KiHoc, qc.Dot, qc.Khoa,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                pb.TenPhongBan
        )

        /* UNION DATA */
        SELECT * FROM DaiHocData
        UNION ALL
        SELECT * FROM SauDaiHocData
        ORDER BY SoTiet DESC, HoTen, id_he_dao_tao
        `;

        /* tham số truyền vào where */
        const params = [namHoc, dot, ki];
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);
        params.push(namHoc, dot, ki);
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);

        const [results] = await connection.query(query, params);

        /** ------------------------------------------------------------------
         *  2. Tính theo giảng viên
         *  ------------------------------------------------------------------ */
        const groupedByTeacher = results.reduce((acc, cur) => {
            const teacher = cur.HoTen;
            if (!acc[teacher]) {
                acc[teacher] = {
                    teacherInfo: {
                        id_Gvm: cur.id_Gvm,
                        HoTen: cur.HoTen,
                        GioiTinh: cur.GioiTinh,
                        NgaySinh: cur.NgaySinh,
                        CCCD: cur.CCCD,
                        NoiCapCCCD: cur.NoiCapCCCD,
                        NgayCapCCCD: cur.NgayCapCCCD,
                        Email: cur.Email,
                        MaSoThue: cur.MaSoThue,
                        HocVi: cur.HocVi,
                        ChucVu: cur.ChucVu,
                        HSL: cur.HSL,
                        DienThoai: cur.DienThoai,
                        STK: cur.STK,
                        NganHang: cur.NganHang,
                        MaPhongBan: cur.MaPhongBan,
                        DiaChi: cur.DiaChi,
                        BangTotNghiep: cur.BangTotNghiep,
                        NoiCongTac: cur.NoiCongTac,
                        BangTotNghiepLoai: cur.BangTotNghiepLoai,
                        MonGiangDayChinh: cur.MonGiangDayChinh,
                        NgayBatDau: cur.NgayBatDau,
                        NgayKetThuc: cur.NgayKetThuc,
                        TenPhongBan: cur.TenPhongBan,
                        isNghiHuu: cur.isNghiHuu
                    },
                    trainingPrograms: [],
                    totalFinancials: {
                        totalSoTiet: 0,
                        totalThanhTien: 0,
                        totalThue: 0,
                        totalThucNhan: 0
                    }
                };
            }

            /* Gộp theo he_dao_tao (nếu trùng thì cộng dồn) */
            const tpArr = acc[teacher].trainingPrograms;
            const existing = tpArr.find(tp => tp.id === cur.id_he_dao_tao);

            const currProgram = {
                id: cur.id_he_dao_tao,
                tenHe: cur.ten_he_dao_tao,
                SoTiet: parseFloat(cur.SoTiet) || 0,
                TienMoiGiang: parseFloat(cur.TienMoiGiang) || 0,
                ThanhTien: parseFloat(cur.ThanhTien) || 0,
                Thue: parseFloat(cur.Thue) || 0,
                ThucNhan: parseFloat(cur.ThucNhan) || 0,
                MaKhoaMonHoc: cur.MaKhoaMonHoc,
                DaoTaoDuyet: cur.DaoTaoDuyet,
                TaiChinhDuyet: cur.TaiChinhDuyet
            };

            if (existing) {
                /* Cộng dồn trị số nếu đã có hệ này */
                existing.SoTiet += currProgram.SoTiet;
                existing.ThanhTien += currProgram.ThanhTien;
                existing.Thue += currProgram.Thue;
                existing.ThucNhan += currProgram.ThucNhan;
            } else {
                tpArr.push(currProgram);
            }

            /* Cộng dồn tổng */
            acc[teacher].totalFinancials.totalSoTiet += currProgram.SoTiet;
            acc[teacher].totalFinancials.totalThanhTien += currProgram.ThanhTien;
            acc[teacher].totalFinancials.totalThue += currProgram.Thue;
            acc[teacher].totalFinancials.totalThucNhan += currProgram.ThucNhan;

            return acc;
        }, {});

        // Chuyển sang Mảng để sort theo số tiết
        const teachersWithTotals = Object.keys(groupedByTeacher).map(name => ({
            teacherName: name,
            teacherData: groupedByTeacher[name],
            totalSoTiet: groupedByTeacher[name].totalFinancials.totalSoTiet,
            maPhongBan: groupedByTeacher[name].teacherInfo.MaPhongBan
        }));

        // sort theo số tiết
        teachersWithTotals.sort((a, b) => {
            if (a.maPhongBan !== b.maPhongBan) {
                return (a.maPhongBan || '').localeCompare(b.maPhongBan || '', 'vi');
            }
            if (b.totalSoTiet !== a.totalSoTiet) return b.totalSoTiet - a.totalSoTiet;
            return a.teacherName.localeCompare(b.teacherName, 'vi');
        });

        // sau khi sort, chuyển lại từ mảng sang obj
        const simplifiedGroupedByTeacher = teachersWithTotals.reduce((acc, { teacherName, teacherData }) => {
            acc[teacherName] = [{
                ...teacherData.teacherInfo,
                SoTiet: teacherData.totalFinancials.totalSoTiet,
                ThanhTien: teacherData.totalFinancials.totalThanhTien,
                Thue: teacherData.totalFinancials.totalThue,
                ThucNhan: teacherData.totalFinancials.totalThucNhan,
                trainingPrograms: teacherData.trainingPrograms,
                totalFinancials: teacherData.totalFinancials
            }];
            return acc;
        }, {});

        /** ------------------------------------------------------------------
         *  4. SỐ TIẾT ĐỊNH MỨC 2 ĐỐI TƯỢNG NGHỈ HƯU VÀ CHƯA NGHỈ HƯU
         *  ------------------------------------------------------------------ */
        const [sotietResult] = await connection.query(
            `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`
        );
        const SoTietDinhMuc = sotietResult[0]?.GiangDay;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu;

        // TÍNH TỔNG TIỀN
        let totalQC = 0, totalThanhTienAll = 0, totalThueAll = 0, totalThucNhanAll = 0;
        Object.values(groupedByTeacher).forEach(t => {
            totalQC += t.totalFinancials.totalSoTiet;
            totalThanhTienAll += t.totalFinancials.totalThanhTien;
            totalThueAll += t.totalFinancials.totalThue;
            totalThucNhanAll += t.totalFinancials.totalThucNhan;
        });

        // gom thành json 
        res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher: groupedByTeacher,    // full detail
            SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu,
            totalsByTeacher: {
                totalQC,
                totalThanhTienAll,
                totalThueAll,
                totalThucNhanAll
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Duyệt tài chính
 */
const approveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }        // Validation for contract type
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Validation for "Mời giảng" - must select all faculties
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            return res.status(400).json({
                success: false,
                message: "Với hợp đồng mời giảng, chỉ được chọn tất cả khoa, không thể duyệt từng khoa riêng lẻ"
            });
        }        // First, check if all records have DaoTaoDuyet = 1 (following TaiChinhCheckAll pattern)
        let unapprovedFaculties = [];

        // For mời giảng, check all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                const [check] = await connection.query(`
                    SELECT DaoTaoDuyet FROM quychuan 
                    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND DaLuu = 0 
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                // Check if all records in this faculty have DaoTaoDuyet = 1
                const hasUnapprovedDaoTao = check.some(record => record.DaoTaoDuyet != 1);
                if (hasUnapprovedDaoTao) {
                    unapprovedFaculties.push(faculty.MaPhongBan);
                }
            }
        }

        // If there are faculties with unapproved DaoTao, return notification instead of error
        if (unapprovedFaculties.length > 0) {
            return res.status(200).json({
                success: false,
                isNotification: true,
                message: `Hiện tại không thể duyệt vì các khoa sau chưa được đào tạo duyệt hoàn toàn: ${unapprovedFaculties.join(', ')}. Vui lòng đợi đào tạo duyệt xong trước khi tiến hành duyệt tài chính.`,
                unapprovedFaculties: unapprovedFaculties,
                affectedRows: 0
            });
        }        // If all checks pass, update TaiChinhDuyet = 1 for mời giảng
        let affectedRows = 0;

        // Lấy thông tin session để ghi log
        const userId = req.session.userId;
        const tenNhanVien = req.session.TenNhanVien || '';
        const khoa = req.session.MaPhongBan || '';

        // Mảng chứa tất cả log entries
        const logEntries = [];

        // For mời giảng, update all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties and update each that has all DaoTaoDuyet = 1
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                // Double-check this faculty is fully approved by DaoTao
                const [check] = await connection.query(`
                    SELECT DaoTaoDuyet FROM quychuan 
                    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND DaLuu = 0 
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                const allDaoTaoApproved = check.every(record => record.DaoTaoDuyet == 1);

                if (allDaoTaoApproved && check.length > 0) {
                    const [updateResult] = await connection.query(`
                        UPDATE quychuan qc
                        SET qc.TaiChinhDuyet = 1 
                        WHERE qc.Khoa = ? AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? 
                          AND qc.DaoTaoDuyet = 1 AND qc.TaiChinhDuyet != 1 AND qc.DaLuu = 0
                    `, [faculty.MaPhongBan, dot, ki, namHoc]);

                    affectedRows += updateResult.affectedRows;

                    // Ghi log cho từng khoa được cập nhật
                    if (updateResult.affectedRows > 0) {
                        const noiDungThayDoi = `Duyệt tài chính ${updateResult.affectedRows} hợp đồng mời giảng - Khoa: ${faculty.MaPhongBan}, Đợt: ${dot}, Kì: ${ki}, Năm: ${namHoc}`;
                        logEntries.push([
                            userId,
                            tenNhanVien,
                            khoa,
                            'Duyệt hợp đồng mời giảng',
                            noiDungThayDoi,
                            new Date()
                        ]);
                    }
                }
            }
        }

        // Ghi tất cả log entries vào database một lần
        if (logEntries.length > 0) {
            await connection.query(
                `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES ?`,
                [logEntries]
            );
        } const facultyText = ' của tất cả khoa';

        res.json({
            success: true,
            message: `Duyệt thành công`,
            affectedRows: affectedRows
        });

    } catch (error) {
        console.error("Error approving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi duyệt hợp đồng"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Bỏ duyệt tài chính
 */
const unapproveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }

        // Validation for contract type
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Validation for "Mời giảng" - must select all faculties
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            return res.status(400).json({
                success: false,
                message: "Với hợp đồng mời giảng, chỉ được chọn tất cả khoa, không thể bỏ duyệt từng khoa riêng lẻ"
            });
        }

        // Update TaiChinhDuyet = 0 for mời giảng (reverse of approval)
        let affectedRows = 0;

        // Lấy thông tin session để ghi log
        const userId = req.session.userId;
        const tenNhanVien = req.session.TenNhanVien || '';
        const khoa = req.session.MaPhongBan || '';

        // Mảng chứa tất cả log entries
        const logEntries = [];

        // For mời giảng, update all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties and update each that has TaiChinhDuyet = 1
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                const [updateResult] = await connection.query(`
                    UPDATE quychuan qc
                    JOIN gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                    SET qc.TaiChinhDuyet = 0 
                    WHERE qc.Khoa = ? AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.DaLuu = 0
                      AND qc.TaiChinhDuyet = 1
                      AND gv.isQuanDoi = 0
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                affectedRows += updateResult.affectedRows;

                // Ghi log cho từng khoa được cập nhật
                if (updateResult.affectedRows > 0) {
                    const noiDungThayDoi = `Bỏ duyệt tài chính ${updateResult.affectedRows} hợp đồng mời giảng - Khoa: ${faculty.MaPhongBan}, Đợt: ${dot}, Kì: ${ki}, Năm: ${namHoc}`;
                    logEntries.push([
                        userId,
                        tenNhanVien,
                        khoa,
                        'Bỏ duyệt hợp đồng mời giảng',
                        noiDungThayDoi,
                        new Date()
                    ]);
                }
            }
        }

        // Ghi tất cả log entries vào database một lần
        if (logEntries.length > 0) {
            await connection.query(
                `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES ?`,
                [logEntries]
            );
        } const facultyText = ' của tất cả khoa';

        res.json({
            success: true,
            message: `Đã bỏ duyệt thành công hợp đồng`,
        });

    } catch (error) {
        console.error("Error unapproving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi bỏ duyệt hợp đồng"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Hiển thị hợp đồng theo hệ đào tạo
 */
const gvmServices = require("../services/gvmServices")

const getDuyetHopDongTheoHeDaoTao = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học"
            });
        }        // Validate loaiHopDong values

        // Lấy danh sách hệ đào tạo
        const heDaoTaoLists = await gvmServices.getHeMoiGiangData();


        let results = [];          // 👉 Tổng theo hệ đào tạo
        let enhancedResults = [];  // 👉 Chi tiết theo hệ

        for (const heDaoTao of heDaoTaoLists) {
            const he_dao_tao = heDaoTao.id;
            const khoa = 'ALL';

            const { finalQuery, params } = gvmServices.buildDynamicQuery({
                namHoc,
                dot,
                ki,
                he_dao_tao,
                khoa
            });

            const [rows] = await connection.query(finalQuery, params);

            // ✅ TÍNH TỔNG: SỐ TIẾT – THÀNH TIỀN – THỰC NHẬN
            const totals = rows.reduce((acc, gv) => {
                acc.tongSoTiet += parseFloat(gv.SoTiet) || 0;
                acc.tongThanhTien += parseFloat(gv.ThanhTien) || 0;
                acc.tongThucNhan += parseFloat(gv.ThucNhan) || 0;
                return acc;
            }, {
                tongSoTiet: 0,
                tongThanhTien: 0,
                tongThucNhan: 0
            });

            // ✅ MẢNG TỔNG RIÊNG
            results.push({
                heDaoTaoId: heDaoTao.id,
                tenHeDaoTao: heDaoTao.he_dao_tao,
                ...totals
            });

            // ✅ MẢNG CHI TIẾT RIÊNG
            enhancedResults.push({
                ...heDaoTao,
                chiTietGiangVien: rows
            });
        }




        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560;

        // Calculate totals for training program view - Tách riêng ĐTPH và khác
        let totalDTPH = {
            totalSoTietHeDaoTao: 0,
            totalThanhTienHeDaoTao: 0,
            totalThueHeDaoTao: 0,
            totalThucNhanHeDaoTao: 0
        };

        let totalMienBac = {
            totalSoTietHeDaoTao: 0,
            totalThanhTienHeDaoTao: 0,
            totalThueHeDaoTao: 0,
            totalThucNhanHeDaoTao: 0
        };

        // Lấy dữ liệu chi tiết để phân loại theo khoa
        for (const heDaoTao of enhancedResults) {
            // Duyệt qua từng giảng viên trong hệ đào tạo để phân loại theo khoa
            heDaoTao.chiTietGiangVien.forEach(giangVien => {
                const soTiet = parseFloat(giangVien.TongTiet) || 0;
                const thanhTien = parseFloat(giangVien.ThanhTien) || 0;
                const thue = parseFloat(giangVien.Thue) || 0;
                const thucNhan = parseFloat(giangVien.ThucNhan) || 0;

                console.log("tiet = ", soTiet)

                if (giangVien.MaPhongBan === 'ĐTPH') {
                    totalDTPH.totalSoTietHeDaoTao += soTiet;
                    totalDTPH.totalThanhTienHeDaoTao += thanhTien;
                    totalDTPH.totalThueHeDaoTao += thue;
                    totalDTPH.totalThucNhanHeDaoTao += thucNhan;
                } else {
                    totalMienBac.totalSoTietHeDaoTao += soTiet;
                    totalMienBac.totalThanhTienHeDaoTao += thanhTien;
                    totalMienBac.totalThueHeDaoTao += thue;
                    totalMienBac.totalThucNhanHeDaoTao += thucNhan;
                }
            });
        }

        // Debug log to verify structure
        console.log('Enhanced Results Sample:', enhancedResults.length > 0 ? {
            firstItem: {
                id: enhancedResults[0].id,
                tenHe: enhancedResults[0].tenHe,
                hasId: !!enhancedResults[0].id,
                hasTenHe: !!enhancedResults[0].tenHe,
                keys: Object.keys(enhancedResults[0])
            }
        } : 'No data');

        res.json({
            success: true,
            data: results,
            enhancedData: enhancedResults,  // Include detailed data with teacher information
            SoTietDinhMuc: SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu: SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu: SoTietDinhMucDaNghiHuu,
            message: `Tải dữ liệu thành công`,
            // Include calculated totals for training program view - Tách riêng ĐTPH và Miền Bắc
            totalsByHeDaoTao: {
                DTPH: totalDTPH,
                MIEN_BAC: totalMienBac,
                // Giữ lại tổng chung nếu cần
                TONG_CHUNG: {
                    totalSoTietHeDaoTao: totalDTPH.totalSoTietHeDaoTao + totalMienBac.totalSoTietHeDaoTao,
                    totalThanhTienHeDaoTao: totalDTPH.totalThanhTienHeDaoTao + totalMienBac.totalThanhTienHeDaoTao,
                    totalThueHeDaoTao: totalDTPH.totalThueHeDaoTao + totalMienBac.totalThueHeDaoTao,
                    totalThucNhanHeDaoTao: totalDTPH.totalThucNhanHeDaoTao + totalMienBac.totalThucNhanHeDaoTao
                }
            }
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongTheoHeDaoTao:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu theo hệ đào tạo",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check đã lưu
 */
const checkContractSaveStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }        // Validate loaiHopDong values
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }        // Check overall status for mời giảng
        // const statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT DaLuu) as distinctValues, MIN(DaLuu) as minValue, MAX(DaLuu) as maxVal FROM quychuan qc WHERE qc.NamHoc = ? AND qc.Dot = ? AND qc.KiHoc = ?";
        const statusQuery = `
    SELECT COUNT(*) as totalRecords, 
           COUNT(DISTINCT DaLuu) as distinctValues, 
           MIN(DaLuu) as minValue, 
           MAX(DaLuu) as maxVal 
    FROM quychuan qc 
    WHERE qc.NamHoc = ? 
      AND qc.Dot = ? 
      AND qc.KiHoc = ?
      AND qc.MoiGiang = 1`;
        const statusParams = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND qc.Khoa = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không có dữ liệu";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có DaLuu = 1
            message = "Đã lưu HĐ";
        } else {            // Có bản ghi chưa đạt điều kiện - lấy chi tiết
            message = "Chưa lưu HĐ";

            const detailQuery = `
    SELECT 
        qc.ID,
        qc.Khoa,
        qc.MaHocPhan,
        qc.LopHocPhan,
        qc.TenLop,
        qc.GiaoVienGiangDay,
        qc.QuyChuan,
        qc.DaLuu,
        qc.NgayBatDau,
        qc.NgayKetThuc,
        pb.TenPhongBan as TenKhoa
    FROM quychuan qc
    LEFT JOIN phongban pb ON qc.Khoa = pb.MaPhongBan
    WHERE qc.NamHoc = ? 
      AND qc.Dot = ? 
      AND qc.KiHoc = ?
      AND qc.MoiGiang = 1          -- ✅ BỔ SUNG
      AND (qc.DaLuu IS NULL OR qc.DaLuu <> 1)
`;
            const detailParams = [namHoc, dot, ki];

            if (maPhongBan && maPhongBan !== "ALL") {
                detailQuery += " AND qc.Khoa = ?";
                detailParams.push(maPhongBan);
            }

            const [detailResults] = await connection.query(detailQuery, detailParams);
            unmetRecords = detailResults;
        } res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractSaveStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái lưu hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * check đã duyệt
 */
const checkContractFinanceApprovalStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }

        // Validate loaiHopDong values
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Check overall TaiChinhDuyet status for mời giảng
        let statusQuery = `
            SELECT COUNT(*) as totalRecords, 
                   COUNT(DISTINCT TaiChinhDuyet) as distinctValues, 
                   MIN(TaiChinhDuyet) as minValue, 
                   MAX(TaiChinhDuyet) as maxVal 
            FROM quychuan qc 
            WHERE qc.NamHoc = ? 
              AND qc.Dot = ? 
              AND qc.KiHoc = ?
              AND qc.MoiGiang = 1`;

        const statusParams = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND qc.Khoa = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;

        if (statusData.totalRecords === 0) {
            message = "Chưa duyệt";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có TaiChinhDuyet = 1
            message = "Đã duyệt";
        } else {
            // Có bản ghi chưa đạt điều kiện
            message = "Chưa duyệt";
        }

        console.log("debug tc duyet moi giang : " + message);

        res.json({
            success: true,
            message: message
        });

    } catch (error) {
        console.error("❌ Error in checkContractFinanceApprovalStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái duyệt tài chính hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDuyetHopDongPage,
    getDuyetHopDongData,
    getDuyetHopDongTheoHeDaoTao,
    approveContracts,
    unapproveContracts,
    checkContractSaveStatus,
    checkContractFinanceApprovalStatus
};
```

## File: src/controllers/hopdong.previewController.js
```javascript
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

// Configure LibreOffice path for Windows
const LIBREOFFICE_PATH = "D:\\Libre\\program\\soffice.exe";

// Alternative LibreOffice paths to try
const ALTERNATIVE_PATHS = [
  "D:\\Libre\\program\\soffice.exe",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

/**
 * Lazy load and configure libreoffice-convert library
 */
function getLibreOfficeConverter() {
  try {
    const libre = require("libreoffice-convert");

    // Set environment variable for this session
    process.env.LIBREOFFICE_PATH = LIBREOFFICE_PATH;

    // Try to configure the library with custom path
    if (libre.config) {
      libre.config({
        soffice: LIBREOFFICE_PATH,
      });
    }

    return libre;
  } catch (error) {
    console.error(
      "Could not load or configure libreoffice-convert:",
      error.message
    );
    return null;
  }
}

/**
 * Check if LibreOffice is available at the specified path
 */
function checkLibreOfficeAvailability() {
  if (fs.existsSync(LIBREOFFICE_PATH)) {
    return true;
  } else {
    console.warn(`LibreOffice not found at: ${LIBREOFFICE_PATH}`);

    // Try alternative paths
    for (const altPath of ALTERNATIVE_PATHS) {
      if (fs.existsSync(altPath)) {
        return true;
      }
    }

    console.error("LibreOffice not found at any known paths");
    return false;
  }
}

/**
 * Get the first available LibreOffice path
 */
function getAvailableLibreOfficePath() {
  // Check main path first
  if (fs.existsSync(LIBREOFFICE_PATH)) {
    return LIBREOFFICE_PATH;
  }

  // Try alternative paths
  for (const altPath of ALTERNATIVE_PATHS) {
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  }

  return null;
}

/**
 * Alternative PDF conversion using direct LibreOffice command
 */
async function convertToPdfDirect(docxBuffer) {
  const tempDir = path.join(__dirname, "../../public/temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempDocxPath = path.join(tempDir, `temp_${Date.now()}.docx`);

  try {
    // Write DOCX buffer to temp file
    fs.writeFileSync(tempDocxPath, docxBuffer);
    // Try different LibreOffice paths
    const usedPath = getAvailableLibreOfficePath();

    if (!usedPath) {
      throw new Error("LibreOffice executable not found at any known paths");
    }

    // Convert using LibreOffice command line
    const command = `"${usedPath}" --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`;

    await execAsync(command, { timeout: 30000 }); // 30 second timeout

    // Read the generated PDF
    const pdfFilePath = tempDocxPath.replace(".docx", ".pdf");
    if (!fs.existsSync(pdfFilePath)) {
      throw new Error("PDF file was not generated");
    }

    const pdfBuffer = fs.readFileSync(pdfFilePath);

    // Clean up temp files
    if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
    if (fs.existsSync(pdfFilePath)) fs.unlinkSync(pdfFilePath);

    return pdfBuffer;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
    throw error;
  }
}

/**
 * Hàm xử lý API để hiển thị trang preview với dữ liệu từ client
 */
const showPreviewPageAPI = async (req, res) => {
  try {
    const { teacherData, dot, ki, namHoc } = req.body;

    if (!teacherData || !dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc để hiển thị preview",
      });
    }
    const parsedTeacherData = JSON.parse(teacherData);
    const teacherId = parsedTeacherData.GiangVien;

    // Get contract types from teacher data
    let contractTypes = [];
    if (
      parsedTeacherData.hasEnhancedData &&
      parsedTeacherData.trainingPrograms &&
      parsedTeacherData.trainingPrograms.length > 0
    ) {
      contractTypes = parsedTeacherData.trainingPrograms.map((program) => ({
        id: program.id,
        tenHe: program.tenHe,
        TongTiet: parseFloat(program.SoTiet) || 0,
      }));
    } else {
      // Single contract type - fallback (should not happen with new structure)
      contractTypes = [
        {
          id: parsedTeacherData.id_he_dao_tao || null,
          tenHe: parsedTeacherData.ten_he_dao_tao || parsedTeacherData.loaiHopDong || "Mời giảng",
          TongTiet: parseFloat(parsedTeacherData.TongTiet) || 0,
        },
      ];
    }

    // Render the preview page and return HTML
    res.render("hopdong.previewContract.ejs", {
      teacherName: parsedTeacherData.GiangVien || teacherId,
      teacherData: parsedTeacherData,
      contractTypes: contractTypes,
      teacherId: teacherId,
      dot: dot,
      ki: ki,
      namHoc: namHoc,
      loaiHopDong: parsedTeacherData.loaiHopDong || "Mời giảng",
    });
  } catch (error) {
    console.error("Error in showPreviewPageAPI:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hiển thị trang preview: " + error.message,
    });
  }
};

/**
 * Hàm hiển thị trang preview hợp đồng (giữ nguyên cho compatibility)
 */
const showPreviewPage = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { dot, ki, namHoc } = req.query;

    if (!teacherId || !dot || !ki || !namHoc) {
      return res.status(400).render("error", {
        message: "Thiếu thông tin bắt buộc để hiển thị preview",
      });
    }

    // Fallback to database query for direct URL access
    let connection;
    try {
      connection = await createPoolConnection();

      const teacherQuery = `
                SELECT DISTINCT
                    hd.HoTen as id_Gvm,
                    hd.HoTen,
                    hd.HocVi,
                    hd.ChucVu,
                    hd.he_dao_tao
                FROM hopdonggvmoi hd
                WHERE hd.HoTen = ? AND hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?`;

      const [teachers] = await connection.execute(teacherQuery, [
        teacherId,
        dot,
        ki,
        namHoc,
      ]);

      if (!teachers || teachers.length === 0) {
        return res.status(404).render("error", {
          message: "Không tìm thấy thông tin hợp đồng cho giảng viên này",
        });
      }

      const teacherData = teachers[0];

      // Get contract types from database
      const contractTypesQuery = `
                SELECT DISTINCT he_dao_tao, SUM(SoTiet) as TongTiet
                FROM hopdonggvmoi
                WHERE HoTen = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
                GROUP BY he_dao_tao`;

      const [contractTypes] = await connection.execute(contractTypesQuery, [
        teacherId,
        dot,
        ki,
        namHoc,
      ]);

      res.render("hopdong.previewContract.ejs", {
        teacherName: teacherData.HoTen || teacherId,
        teacherData: teacherData,
        contractTypes: contractTypes,
        teacherId: teacherId,
        dot: dot,
        ki: ki,
        namHoc: namHoc,
        loaiHopDong: "Mời giảng",
      });
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    console.error("Error in showPreviewPage:", error);
    res.status(500).render("error", {
      message: "Lỗi khi hiển thị trang preview: " + error.message,
    });
  }
};

/**
 * Hàm tạo preview hợp đồng cho giảng viên theo hệ đào tạo
 */
const previewContract = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const { teacherId, heHopDong, dot, ki, namHoc, teacherData } = req.body;

    // LOG: Request data
    console.log('[Preview API] Request received:', {
      teacherId,
      heHopDong,
      heHopDongType: typeof heHopDong,
      dot,
      ki,
      namHoc,
      hasTeacherData: !!teacherData,
      teacherDataLength: teacherData ? teacherData.length : 0
    });

    if (!teacherId || !heHopDong || !dot || !ki || !namHoc) {
      console.error('[Preview API] Missing required fields:', {
        teacherId: !!teacherId,
        heHopDong: !!heHopDong,
        dot: !!dot,
        ki: !!ki,
        namHoc: !!namHoc
      });
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // heHopDong now can be either ID (number/string) or name (for backward compatibility)
    let heHopDongId = heHopDong;
    let heHopDongName = heHopDong;

    console.log('[Preview API] Processing heHopDong:', {
      raw: heHopDong,
      type: typeof heHopDong,
      isNaN: isNaN(heHopDong)
    });

    // Check if heHopDong is a number (ID) or string (name)
    if (!isNaN(heHopDong)) {
      // It's an ID, query to get name
      console.log('[Preview API] Querying he_dao_tao by ID:', heHopDong);
      const [heDaoTaoRows] = await connection.query(
        'SELECT id, he_dao_tao FROM he_dao_tao WHERE id = ?',
        [heHopDong]
      );

      console.log('[Preview API] Query result:', {
        found: heDaoTaoRows.length > 0,
        data: heDaoTaoRows[0]
      });

      if (heDaoTaoRows.length > 0) {
        heHopDongId = heDaoTaoRows[0].id;
        heHopDongName = heDaoTaoRows[0].he_dao_tao;
      } else {
        console.error('[Preview API] He dao tao not found for ID:', heHopDong);
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hệ đào tạo",
        });
      }
    } else {
      // It's a name (backward compatibility), query to get ID
      console.log('[Preview API] Querying he_dao_tao by name:', heHopDong);
      const [heDaoTaoRows] = await connection.query(
        'SELECT id, he_dao_tao FROM he_dao_tao WHERE he_dao_tao = ?',
        [heHopDong]
      );

      console.log('[Preview API] Query result:', {
        found: heDaoTaoRows.length > 0,
        data: heDaoTaoRows[0]
      });

      if (heDaoTaoRows.length > 0) {
        heHopDongId = heDaoTaoRows[0].id;
        heHopDongName = heDaoTaoRows[0].he_dao_tao;
      }
    }

    let teacher;

    // Use provided teacherData if available, otherwise query database
    if (teacherData) {
      console.log('[Preview API] Using provided teacherData');
      try {
        teacher = JSON.parse(teacherData);
        console.log('[Preview API] Teacher parsed:', {
          name: teacher.GiangVien || teacher.HoTen,
          hasEnhancedData: teacher.hasEnhancedData,
          programsCount: teacher.trainingPrograms ? teacher.trainingPrograms.length : 0
        });
      } catch (parseError) {
        console.error('[Preview API] Failed to parse teacherData:', parseError);
        return res.status(400).json({
          success: false,
          message: "Dữ liệu giảng viên không hợp lệ",
        });
      }
    } else {
      // Fallback to database query
      console.log('[Preview API] Querying teacher from database:', {
        teacherId,
        heHopDongId,
        dot,
        ki,
        namHoc
      });
      const teacherQuery = `
                SELECT 
                    hd.HoTen as id_Gvm,
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
                    hd.SoTien,
                    hd.TruThue,
                    hd.NgayCap,
                    hd.ThucNhan,
                    hd.NgayNghiemThu,
                    hd.Dot,
                    hd.KiHoc,
                    hd.NamHoc,
                    hd.MaPhongBan,
                    hd.MaBoMon,
                    hd.NoiCongTac,
                    hd.he_dao_tao
                FROM hopdonggvmoi hd
                JOIN gvmoi gv ON hd.id_Gvm = gv.id_Gvm
                WHERE hd.HoTen = ? AND hd.he_dao_tao = ? AND hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
                GROUP BY 
                    hd.HoTen, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
                    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
                    hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac, hd.he_dao_tao`;

      const [teachers] = await connection.execute(teacherQuery, [
        teacherId,
        heHopDongName,  // Use name (hopdonggvmoi.he_dao_tao stores the name, not ID)
        dot,
        ki,
        namHoc,
      ]);

      console.log('[Preview API] Teacher query result:', {
        found: teachers && teachers.length > 0,
        count: teachers ? teachers.length : 0
      });

      if (!teachers || teachers.length === 0) {
        console.error('[Preview API] Teacher not found in database');
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin hợp đồng cho giảng viên này",
        });
      }

      teacher = teachers[0];
    } // Calculate financial data based on heHopDong
    let soTiet, tienText, tienThueText, tienThucNhanText, tienMoiGiang;

    if (teacher.hasEnhancedData && teacher.trainingPrograms) {
      // Find specific training program data by ID
      const programData = teacher.trainingPrograms.find(
        (p) => p.id === heHopDongId || p.id === parseInt(heHopDongId)
      );
      if (programData) {
        soTiet = programData.SoTiet;
        tienText = programData.ThanhTien;
        tienThueText = programData.Thue;
        tienThucNhanText = programData.ThucNhan;
        tienMoiGiang = programData.TienMoiGiang;
      } else {
        // Use total data if specific program not found
        soTiet = teacher.TongTiet || 0;
        tienText = teacher.ThanhTien || 0;
        tienThueText = teacher.Thue || 0;
        tienThucNhanText = teacher.ThucNhan || 0;
        tienMoiGiang = teacher.TienMoiGiang || 0;
      }
    } else {
      // Use teacher's total data
      soTiet = teacher.TongTiet || teacher.SoTiet || 0;
      tienText = teacher.ThanhTien || 0;
      tienThueText = teacher.Thue || 0;
      tienThucNhanText = teacher.ThucNhan || 0;
      tienMoiGiang = teacher.TienMoiGiang || 0;

      // If no financial data in teacher object, calculate from tienluong table
      if (!tienText && connection) {
        const tienLuongQuery = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
        const [tienLuongList] = await connection.execute(tienLuongQuery);

        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === heHopDongId && tl.HocVi === teacher.HocVi
        );

        if (tienLuong) {
          tienMoiGiang = tienLuong.SoTien;
          tienText = soTiet * tienLuong.SoTien;
          // Nếu số tiền <= 2 triệu đồng thì không tính thuế
          tienThueText = tienText < 2000000 ? 0 : tienText * 0.1;
          tienThucNhanText = tienText - tienThueText;
        }
      }
    }

    // Prepare data for template
    const data = {
      Số_hợp_đồng: "       ",
      Số_thanh_lý: "       ",
      Ngày_bắt_đầu: formatDateVietnamese(teacher.NgayBatDau),
      Ngày_kết_thúc: formatDateVietnamese(teacher.NgayKetThuc),
      Danh_xưng: teacher.GioiTinh === "Nam" ? "Ông" : "Bà",
      Họ_và_tên: teacher.GiangVien || teacher.HoTen,
      CCCD: teacher.CCCD || "",
      Ngày_cấp: formatDate1(teacher.NgayCapCCCD),
      Nơi_cấp: teacher.NoiCapCCCD || "",
      Chức_vụ: teacher.ChucVu || "",
      Cấp_bậc: teacher.HocVi || "",
      Hệ_số_lương: teacher.HSL
        ? Number(teacher.HSL).toFixed(2).replace(".", ",")
        : "1,00",
      Địa_chỉ_theo_CCCD: teacher.DiaChi || "",
      Điện_thoại: teacher.DienThoai || "",
      Mã_số_thuế: teacher.MaSoThue || "",
      Số_tài_khoản: teacher.STK || "",
      Email: teacher.Email || "",
      Tại_ngân_hàng: teacher.NganHang || "",
      Số_tiết: soTiet.toString().replace(".", ","),
      Ngày_kí_hợp_đồng: formatDate(new Date()),
      Tiền_text: tienText.toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền: numberToWords(tienText),
      Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
      Đợt: dot,
      Kỳ: convertToRoman(parseInt(ki)),
      Năm_học: namHoc,
      Thời_gian_thực_hiện: formatDateRange(
        teacher.NgayBatDau,
        teacher.NgayKetThuc
      ),
      Ngày_nghiệm_thu: formatDate(teacher.NgayNghiemThu),
      Mức_tiền: tienMoiGiang.toLocaleString("vi-VN"),
      Nơi_công_tác: teacher.NoiCongTac || "",
      Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã",
      Khóa: teacher.KhoaSinhVien,
      Ngành: teacher.Nganh,
    };

    // Choose template based on contract type name pattern matching
    let templateFileName;

    console.log('[Preview API] Selecting template for:', {
      heHopDongId,
      heHopDongName
    });

    // Pattern matching based on contract name
    const nameLower = heHopDongName.toLowerCase();

    if (nameLower.includes("đồ án")) {
      // Đồ án
      if (nameLower.includes("cao học")) {
        templateFileName = "HopDongDACaoHoc.docx";
      } else {
        templateFileName = "HopDongDA.docx";
      }
    } else if (nameLower.includes("mật mã")) {
      // Các hệ có chứa "mật mã"
      templateFileName = "HopDongMM.docx";
    } else if (nameLower.includes("cao học")) {
      // Cao học
      templateFileName = "HopDongCH.docx";
    } else if (nameLower.includes("nghiên cứu sinh")) {
      // Nghiên cứu sinh
      templateFileName = "HopDongNCS.docx";
    } else if (nameLower.includes("đóng học phí") || nameLower.includes("đại học")) {
      // Đại học hoặc đóng học phí
      templateFileName = "HopDongHP.docx";
    } else {
      // Default fallback
      console.warn('[Preview API] No pattern matched, using default template HP');
      templateFileName = "HopDongHP.docx";
    }

    console.log('[Preview API] Pattern matched template:', {
      pattern: nameLower,
      selectedTemplate: templateFileName
    });

    const templatePath = path.resolve(
      __dirname,
      "../templates",
      templateFileName
    );

    console.log('[Preview API] Template selected:', {
      fileName: templateFileName,
      path: templatePath,
      exists: fs.existsSync(templatePath)
    });

    if (!fs.existsSync(templatePath)) {
      console.error('[Preview API] Template not found:', templatePath);
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy template: ${templateFileName}`,
      });
    }

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "«",
        end: "»",
      },
    });

    try {
      doc.render(data);
    } catch (renderError) {
      console.error("Error rendering document:", renderError);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi tạo document từ template.",
      });
    }
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    }); // Convert DOCX to PDF using libreoffice-convert with fallback
    try {
      let pdfBuffer;

      try {
        // Lazy load libreoffice-convert library
        const libre = getLibreOfficeConverter();

        if (!libre) {
          throw new Error("libreoffice-convert library not available");
        }

        // Suppress console output during library conversion
        const originalConsole = suppressConsole();

        try {
          // First try using libreoffice-convert library
          pdfBuffer = await new Promise((resolve, reject) => {
            libre.convert(buf, ".pdf", undefined, (err, done) => {
              if (err) {
                reject(err);
              } else {
                resolve(done);
              }
            });
          });

          // Restore console
          restoreConsole(originalConsole);
        } catch (libraryError) {
          // Restore console before handling error
          restoreConsole(originalConsole);
          throw libraryError;
        }
      } catch (libraryError) {
        // Fallback to direct LibreOffice command
        pdfBuffer = await convertToPdfDirect(buf);
      }

      // Create safe filename for Vietnamese characters
      const baseFileName = `Preview_${teacher.HoTen}_${heHopDong}.pdf`;
      const safeFileName = baseFileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^\w\s.-]/g, "") // Remove special characters
        .replace(/\s+/g, "_"); // Replace spaces with underscores

      res.setHeader("Content-Type", "application/pdf");
      // Use both filename and filename* for better compatibility
      const encodedFileName = encodeURIComponent(baseFileName);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
      );
      res.send(pdfBuffer);
    } catch (conversionError) {
      console.error("Error converting to PDF:", conversionError);
      return res.status(500).json({
        success: false,
        message:
          "Lỗi khi chuyển đổi hợp đồng sang PDF: " + conversionError.message,
      });
    }
  } catch (error) {
    console.error("Error in previewContract:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo preview hợp đồng: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Hàm hiển thị trang preview hợp đồng hợp nhất (sử dụng file duy nhất)
 */
const showUnifiedPreviewPage = async (req, res) => {
  try {
    // Support both URL params and POST body
    let teacherId, dot, ki, namHoc, teacherData;

    if (req.method === "GET") {
      // Direct URL access
      teacherId = req.params.teacherId;
      ({ dot, ki, namHoc } = req.query);
    } else {
      // POST from duyet page
      ({ teacherData, dot, ki, namHoc } = req.body);
      if (teacherData) {
        const parsedData = JSON.parse(teacherData);
        teacherId = parsedData.GiangVien || parsedData.HoTen;
      }
    }

    if (!teacherId || !dot || !ki || !namHoc) {
      return res.status(400).render("error", {
        message: "Thiếu thông tin bắt buộc để hiển thị preview",
      });
    }

    let teacher = null;
    let contractTypes = [];

    // Use provided teacherData if available, otherwise query database
    if (teacherData) {
      teacher = JSON.parse(teacherData);

      // Get contract types from enhanced data
      if (
        teacher.hasEnhancedData &&
        teacher.trainingPrograms &&
        teacher.trainingPrograms.length > 0
      ) {
        contractTypes = teacher.trainingPrograms.map((program) => ({
          he_dao_tao: program.he_dao_tao,
          TongTiet: program.SoTiet,
        }));
      } else {
        contractTypes = [
          {
            he_dao_tao: teacher.loaiHopDong || "Mời giảng",
            TongTiet: teacher.TongTiet || 0,
          },
        ];
      }
    } else {
      // Fallback to database query for direct URL access
      let connection;
      try {
        connection = await createPoolConnection();

        const teacherQuery = `
                    SELECT DISTINCT
                        hd.HoTen as GiangVien,
                        hd.HoTen,
                        hd.HocVi,
                        hd.ChucVu,
                        hd.he_dao_tao
                    FROM hopdonggvmoi hd
                    WHERE hd.HoTen = ? AND hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?`;

        const [teachers] = await connection.execute(teacherQuery, [
          teacherId,
          dot,
          ki,
          namHoc,
        ]);

        if (!teachers || teachers.length === 0) {
          return res.status(404).render("error", {
            message: "Không tìm thấy thông tin hợp đồng cho giảng viên này",
          });
        }

        teacher = teachers[0];

        // Get contract types from database
        const contractTypesQuery = `
                    SELECT DISTINCT he_dao_tao, SUM(SoTiet) as TongTiet
                    FROM hopdonggvmoi
                    WHERE HoTen = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
                    GROUP BY he_dao_tao`;

        const [dbContractTypes] = await connection.execute(contractTypesQuery, [
          teacherId,
          dot,
          ki,
          namHoc,
        ]);
        contractTypes = dbContractTypes;
      } finally {
        if (connection) connection.release();
      }
    }

    // Render unified preview page
    res.render("hopdong.preview.ejs", {
      teacher: teacher,
      teacherName: teacher ? teacher.GiangVien || teacher.HoTen : teacherId,
      teacherData: teacher || {},
      contractTypes: contractTypes,
      params: {
        teacherId: teacherId,
        dot: dot,
        ki: ki,
        namHoc: namHoc,
      },
      // Fallback variables for compatibility
      teacherId: teacherId,
      dot: dot,
      ki: ki,
      namHoc: namHoc,
      loaiHopDong: teacher ? teacher.loaiHopDong || "Mời giảng" : "Mời giảng",
    });
  } catch (error) {
    console.error("Error in showUnifiedPreviewPage:", error);
    res.status(500).render("error", {
      message: "Lỗi khi hiển thị trang preview: " + error.message,
    });
  }
};

/**
 * Temporarily suppress console output during LibreOffice conversion
 */
function suppressConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  // Override console methods with empty functions
  console.log = () => { };
  console.error = () => { };
  console.warn = () => { };
  console.info = () => { };

  return originalConsole;
}

/**
 * Restore console output
 */
function restoreConsole(originalConsole) {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
}

// Các hàm utility được sao chép từ exportHDController
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateVietnamese(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}

function formatDate1(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function convertToRoman(num) {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (let i = 0; i < romanNumerals.length; i++) {
    while (num >= romanNumerals[i].value) {
      result += romanNumerals[i].numeral;
      num -= romanNumerals[i].value;
    }
  }
  return result;
}

function numberToWords(num) {
  if (num === 0) return "không đồng";

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const scales = ["", "nghìn", "triệu", "tỷ"];

  function convertGroup(n) {
    let result = "";

    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const tensDigit = Math.floor(remainder / 10);
    const onesDigit = remainder % 10;

    if (hundreds > 0) {
      result += ones[hundreds] + " trăm";
      if (remainder > 0) result += " ";
    }

    if (tensDigit > 1) {
      result += tens[tensDigit];
      if (onesDigit > 0) {
        result += " " + ones[onesDigit];
      }
    } else if (tensDigit === 1) {
      result += "mười";
      if (onesDigit > 0) {
        result += " " + ones[onesDigit];
      }
    } else if (onesDigit > 0) {
      if (hundreds > 0) result += "lẻ ";
      result += ones[onesDigit];
    }

    return result.trim();
  }

  let result = "";
  let scaleIndex = 0;

  while (num > 0) {
    const group = num % 1000;
    if (group > 0) {
      const groupWords = convertGroup(group);
      if (scaleIndex > 0) {
        result = groupWords + " " + scales[scaleIndex] + " " + result;
      } else {
        result = groupWords;
      }
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  // return result.trim() + " đồng";
  const final = result.trim() + " đồng";
  return final.charAt(0).toUpperCase() + final.slice(1);
}

module.exports = {
  previewContract,
  showPreviewPage,
  showPreviewPageAPI,
  showUnifiedPreviewPage,
};
```

## File: src/controllers/hopdong.soHopDongController.js
```javascript
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

        // UPDATE với CCCD và he_dao_tao (để phân biệt khi 1 người dạy nhiều hệ)
        const updateQuery = `
          UPDATE hopdonggvmoi 
          SET SoHopDong = ?, SoThanhLyHopDong = ?, CoSoDaoTao = ?
          WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND CCCD = ? AND he_dao_tao = ?
        `;
        const updateParams = [
          newSoHopDong,
          newSoThanhLy,
          finalCoSoDaoTao,
          dot,
          ki,
          nam,
          row.CCCD,
          row.he_dao_tao
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

    // Nhóm theo Khoa và HeDaoTao (đồng bộ với ORDER BY của execute)
    const grouped = rows.reduce((acc, item) => {
      const khoaKey = item.Khoa || 'Khác';
      const he = item.HeDaoTao || 'Không xác định';
      if (!acc[khoaKey]) acc[khoaKey] = {};
      if (!acc[khoaKey][he]) acc[khoaKey][he] = [];
      acc[khoaKey][he].push(item);
      return acc;
    }, {});

    // Khởi số bắt đầu và tăng dần liên tục
    // Format: [kí hiệu trước số][số 3 chữ số][kí hiệu sau số]
    let num = startNum;
    
    const result = {};

    // Sort theo Khoa trước, sau đó Hệ (giống execute)
    Object.keys(grouped).sort().forEach(khoaKey => {
      result[khoaKey] = {};
      Object.keys(grouped[khoaKey]).sort().forEach(he => {
        result[khoaKey][he] = grouped[khoaKey][he].map(item => {
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
```

## File: src/controllers/hopDongDAController.js
```javascript
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");
require("dotenv").config(); // Load biến môi trường
const exportPhuLucDAController = require("../controllers/exportPhuLucDAController");
const gvmServices = require("../services/gvmServices");

// Import các thư viện cần thiết để tạo file Word
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  VerticalAlign,
  WidthType,
  BorderStyle,
  PageOrientation,
} = require("docx");

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Đệ quy xóa thư mục con
        deleteFolderRecursive(curPath);
      } else {
        // Xóa file
        fs.unlinkSync(curPath);
      }
    });
    // Xóa thư mục rỗng
    fs.rmdirSync(folderPath);
  }
}
const convertToRoman = (num) => {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
};

// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return capitalizeFirstLetter(words.trim() + " đồng");
};

// Hàm chuyển đổi số thập phân thành chữ
const numberWithDecimalToWords = (num) => {
  const [integerPart, decimalPart] = num.toString().split(".");
  const integerWords = numberToWords(parseInt(integerPart, 10));
  let decimalWords = "";

  if (decimalPart) {
    decimalWords =
      "phẩy " +
      decimalPart
        .split("")
        .map((digit) => ones[parseInt(digit)])
        .join(" ");
  }

  return `${integerWords}${decimalWords ? " " + decimalWords : ""}`.trim();
};

// Hàm định dạng ngày/tháng/năm
const formatDate1 = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`; // Định dạng ngày/tháng/năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Hàm định dạng ngày tháng năm
const formatDate = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `ngày ${day} tháng ${month} năm ${year}`; // Định dạng ngày tháng năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
// Tính toán khoảng thời gian thực hiện
const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Định dạng ngày bắt đầu
  const startDay = start.getDate().toString().padStart(2, "0");
  const startMonth = (start.getMonth() + 1).toString().padStart(2, "0");
  const startYear = start.getFullYear();

  // Định dạng ngày kết thúc
  const endDay = end.getDate().toString().padStart(2, "0");
  const endMonth = (end.getMonth() + 1).toString().padStart(2, "0");
  const endYear = end.getFullYear();

  return `Từ ngày ${startDay}/${startMonth}/${startYear} đến ngày ${endDay}/${endMonth}/${endYear}`;
};

/**
 * Hàm chuyển đổi date cho Excel
 * Excel lưu trữ date dưới dạng serial number (số ngày kể từ 1/1/1900)
 * Nhưng ExcelJS có thể nhận Date object hoặc string ISO
 * @param {*} dateValue - Giá trị date từ database (có thể là Date, string YYYY-MM-DD, null, undefined)
 * @returns {string|null} - String định dạng DD/MM/YYYY hoặc null
 */
const formatDateForExcel = (dateValue) => {
  try {
    // Nếu null, undefined hoặc chuỗi rỗng
    if (!dateValue || dateValue === '') {
      return null;
    }

    // Nếu đã là Date object hợp lệ
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là string
    if (typeof dateValue === 'string') {
      // Loại bỏ khoảng trắng
      const trimmed = dateValue.trim();
      if (trimmed === '' || trimmed === '0000-00-00') {
        return null;
      }

      // Xử lý định dạng YYYY-MM-DD từ database
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = trimmed.split('-');
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        // Kiểm tra giá trị hợp lệ
        if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }

        // Trả về string định dạng DD/MM/YYYY
        return `${day}/${month}/${year}`;
      }

      // Fallback cho các định dạng khác
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;

      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là number (timestamp)
    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) return null;
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Các trường hợp khác
    return null;
  } catch (error) {
    console.error('Error in formatDateForExcel:', error);
    return null;
  }
};

// Controller xuất nhiều hợp đồng
const exportMultipleContracts = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/hopDongDA';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Dữ liệu để tạo file thống kê chuyển khoản
    const summaryData = [];
    const summaryData2 = [];

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // const heDaoTaoData = await gvmServices.getHeDaoTaoData();

    // Lấy thông tin hệ đào tạo từ ID
    const [[heDaoTaoInfo]] = await connection.query(
      "SELECT he_dao_tao, loai_hinh FROM he_dao_tao WHERE id = ?",
      [he_dao_tao]
    );
    const tenHeDaoTao = heDaoTaoInfo?.he_dao_tao || "";
    const loaiHinh = heDaoTaoInfo?.loai_hinh || "";

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      const tienText = teacher.ThanhTien || 0;
      const tienThueText = teacher.TruThue || 0;
      const tienThucNhanText = teacher.ThucNhan || 0;

      let hoTen = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      // Ghi dữ liệu cho thống kê chuyển khoản
      summaryData.push({
        HoTen: hoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienThucNhanText,
        TongTien: tienText,
        TruThue: tienThueText,
        SoHopDong: teacher.SoHopDong,
      });

      summaryData2.push({
        HoTen: hoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienText,
        SoHopDong: teacher.SoHopDong,
      });

      // ✅ REFACTORED: Sử dụng generateDoAnContract thay vì duplicate code
      try {
        const filePath = await generateDoAnContract(teacher, tempDir, phongBanList);
        if (!filePath) {
          console.error(`Failed to generate contract for ${hoTen}`);
        }
      } catch (error) {
        console.error(`Error generating contract for ${hoTen}:`, error);
      }
    }

    // Tạo file thống kê chuyển khoản
    const noiDung = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc} - ${tenHeDaoTao}`;
    const summaryDoc = createTransferDetailDocument(
      summaryData,
      noiDung,
      "sau thuế"
    );
    const summaryBuf = await Packer.toBuffer(summaryDoc);
    const summaryName = `ĐATN_${tenHeDaoTao}_Thongke_chuyenkhoan_sauthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName), summaryBuf);

    console.log("Tạo file thống kê chuyển khoản sau thuế thành công");

    // Tạo file thống kê chuyển khoản trước thuế
    const summaryDoc2 = createTransferDetailDocument(
      summaryData2,
      noiDung,
      "trước thuế"
    );
    const summaryBuf2 = await Packer.toBuffer(summaryDoc2);
    const summaryName2 = `ĐATN_${tenHeDaoTao}_Thongke_chuyenkhoan_truocthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName2), summaryBuf2);

    console.log("Tạo file thống kê chuyển khoản trước thuế thành công");

    // Tạo file Excel báo cáo thuế
    const taxReportData = summaryData.map((item, index) => {
      // Sử dụng TongTien nếu có, nếu không thì tính ngược từ ThucNhan
      const tienTruocThue = item.TongTien || 0;
      // Nếu số tiền <= 2 triệu thì không có thuế
      const thuePhaiTra = item.TruThue || 0;

      return {
        stt: index + 1,
        contractNumber: item.SoHopDong,
        executor: item.HoTen,
        expenseDescription: `Hợp đồng giao khoán công việc`,
        idNumber: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.CCCD || '',
        issueDate: formatDateForExcel(teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NgayCapCCCD),
        issuePlace: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NoiCapCCCD || '',
        idAddress: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.DiaChi || '',
        phoneNumber: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.DienThoai || '',
        taxCode: item.MaSoThue,
        amount: Number(tienTruocThue), // Tổng tiền trước thuế
        taxDeducted: Number(thuePhaiTra), // Thuế 10%
        netAmount: Number(item.ThucNhan) // Tiền sau thuế
      };
    });

    const taxReportWorkbook = createTaxReportWorkbook(taxReportData);
    const taxReportName = `ĐATN_Daihoc_BangKeTongHopThue.xlsx`;
    await taxReportWorkbook.xlsx.writeFile(path.join(tempDir, taxReportName));

    console.log("Tạo file bảng kê tổng hợp thuế thành công");

    // === Phần fix: lưu ZIP ra ngoài tempDir ===
    const zipOutputDir = path.join(__dirname, "..", "public", "tempZips");
    fs.mkdirSync(zipOutputDir, { recursive: true });

    const zipName = `HopDong_${tenHeDaoTao}_Dot${dot}_${namHoc}_${khoa || "all"
      }.zip`;
    const zipPath = path.join(zipOutputDir, zipName);

    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);
    archive.directory(tempDir, false);

    await new Promise((resolve, reject) => {
      archive.on("error", reject);
      output.on("close", resolve);
      archive.finalize();
    });

    // Gửi file và XÓA sau khi tải
    res.download(zipPath, zipName, (err) => {
      if (err) {
        console.error("Error sending zip file:", err);
        return;
      }
      // Dọn dẹp tempDir và file ZIP
      setTimeout(() => {
        // Xóa các file trong tempDir
        if (fs.existsSync(tempDir)) {
          fs.readdirSync(tempDir).forEach((f) => {
            fs.unlinkSync(path.join(tempDir, f));
          });
          fs.rmdirSync(tempDir);
        }
        // Xóa file ZIP
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
      }, 1000);
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const gethopDongDASite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `SELECT HoTen, MaPhongBan FROM gvmoi`;

    const [gvmoiList] = await connection.query(query);

    res.render("hopDongDA.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getExportAdditionalDoAnGvmSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.taiTongHopHopDong.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const doanServices = require("../services/doanServices");

const exportAdditionalDoAnGvm = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    if (!dot || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Lấy dữ liệu tiền lương
    const tienLuongList = await getTienLuongList(connection);

    if (!tienLuongList || tienLuongList.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy tiền lương phù hợp với giảng viên'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const phuLucData = await doanServices.getPhuLucDAData(dot, ki, namHoc, khoa, he_dao_tao, teacherName);

    if (phuLucData.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const contractFiles = [];

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
      const teacherZipName = `${hoTenTrim}_${teacher.CCCD}.zip`;
      const teacherZipPath = path.join(tempDir, teacherZipName);
      const teacherArchive = archiver("zip", { zlib: { level: 9 } });
      const output = fs.createWriteStream(teacherZipPath);
      teacherArchive.pipe(output);

      // Lưu các file cần xóa sau khi nén
      const filesToDelete = [];
      const dirsToDelete = [];

      // Tạo file hợp đồng
      const filePathContract = await generateDoAnContract(
        teacher,
        tempDir,
        phongBanList
      );

      // Lấy file tài liệu bổ sung
      const filePathAdditional = await generateAdditionalFile(teacher, tempDir);
      // Lấy file phụ lục
      const phuLucTeacher = phuLucData.filter(
        (item) => item.GiangVien.trim() == teacher.HoTen.trim()
      );

      const filePathAppendix =
        await exportPhuLucDAController.getExportPhuLucDAPath(
          req,
          res,
          connection,
          dot,
          ki,
          namHoc,
          khoa,
          he_dao_tao,
          teacherName,
          phuLucTeacher
        );

      if (
        !fs.existsSync(filePathContract) ||
        fs.statSync(filePathContract).size === 0
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathContract}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAdditional &&
        (!fs.existsSync(filePathAdditional) ||
          fs.statSync(filePathAdditional).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAdditional}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAppendix &&
        (!fs.existsSync(filePathAppendix) ||
          fs.statSync(filePathAppendix).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAppendix}`);
        continue; // Bỏ qua file bị lỗi
      }

      if (filePathContract) {
        teacherArchive.file(filePathContract, {
          name: path.basename(filePathContract),
        });
      }
      if (filePathAdditional) {
        teacherArchive.file(filePathAdditional, {
          name: path.basename(filePathAdditional),
        });
      }
      if (filePathAppendix) {
        teacherArchive.file(filePathAppendix, {
          name: path.basename(filePathAppendix),
        });

        filesToDelete.push(filePathAppendix);
        const appendixDir = path.dirname(filePathAppendix);
        dirsToDelete.push(appendixDir);
      }

      await teacherArchive.finalize();
      contractFiles.push(teacherZipPath);

      // Sau khi zip xong mới xóa file
      for (const filePath of filesToDelete) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Đã xóa file:", filePath);
        }
      }

      for (const dirPath of dirsToDelete) {
        try {
          if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
            fs.rmdirSync(dirPath);
            console.log("Đã xóa thư mục:", dirPath);
          }
        } catch (err) {
          console.log("Không thể xóa thư mục (có thể không rỗng):", dirPath);
        }
      }
    }

    // Tạo file ZIP tổng hợp chứa tất cả file ZIP của giảng viên
    let zipFileName = `TongHopHopDong_DoAn_Dot${dot}_Ki${ki}_${namHoc}_DoAn`;
    if (teacherName) {
      zipFileName += `_${teacherName}.zip`;
    } else {
      zipFileName += `_${khoa || "all"}.zip`;
    }
    const zipPath = path.join(tempDir, zipFileName);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);

    // Thêm tất cả các file ZIP của giảng viên vào file ZIP tổng hợp
    contractFiles.forEach((file) => {
      archive.file(file, { name: path.basename(file) });
    });

    //await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    // Kiểm tra file ZIP trước khi gửi
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      console.error("Lỗi: File ZIP bị trống hoặc hỏng");
      return res.status(500).send("Lỗi: Không thể tạo file ZIP.");
    }

    // Gửi file ZIP cuối cùng về cho client
    res.download(zipPath, zipFileName, (err) => {
      if (!err) {
        setTimeout(() => {
          try {
            if (fs.existsSync(tempDir)) {
              fs.readdirSync(tempDir).forEach((file) =>
                fs.unlinkSync(path.join(tempDir, file))
              );
              fs.rmdirSync(tempDir);
            }
          } catch (error) {
            console.error("Error cleaning up temporary directory:", error);
          }
        }, 1000);
      }
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const generateAdditionalFile = async (teacher, tempDir) => {
  const teacherFolderPath = path.resolve(
    __dirname,
    "..",
    "..",
    "Giang_Vien_Moi",
    teacher.MaPhongBan,
    teacher.MaBoMon,
    teacher.HoTen
  );

  if (!fs.existsSync(teacherFolderPath)) return null; // Không có thư mục

  const files = fs.readdirSync(teacherFolderPath);
  const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",").map(
    (ext) => ext.toLowerCase()
  );

  // const documentFile = files.find((f) =>
  //   allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
  // );

  const documentFile = files.find((f) => {
    const baseName = path.parse(f).name; // Lấy tên file không có phần mở rộng
    const ext = path.extname(f).toLowerCase().slice(1); // Lấy phần mở rộng không có dấu chấm
    return (
      baseName === `${teacher.MaPhongBan}_${teacher.HoTen}` &&
      allowedExtensions.includes(ext)
    );
  });

  if (!documentFile) return null; // Không tìm thấy file hợp lệ

  const oldFilePath = path.join(teacherFolderPath, documentFile);
  // const newFileName = `BoSung_${teacher.HoTen}${path.extname(documentFile)}`;
  // const newFilePath = path.join(teacherFolderPath, newFileName);

  // // Đổi tên file
  // fs.renameSync(oldFilePath, newFilePath);

  return oldFilePath;
};

const generateDoAnContract = async (teacher, tempDir, phongBanList) => {
  try {
    const soTiet = teacher.SoTiet || 0;

    const mucTien = teacher.TienMoiGiang || 0;
    const gioiTinh = teacher.GioiTinh; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let danhXung;

    // Giả sử bạn có biến gioiTinh chứa giá trị giới tính
    if (gioiTinh === "Nam") {
      danhXung = "Ông";
    } else if (gioiTinh === "Nữ") {
      danhXung = "Bà";
    } else {
      danhXung = ""; // Hoặc có thể gán một giá trị mặc định khác
    }
    const maPhongBan = teacher.MaPhongBan; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let tenNganh;

    const phongBan = phongBanList.find(
      (item) =>
        item.MaPhongBan.trim().toUpperCase() == maPhongBan.trim().toUpperCase()
    );

    if (phongBan) {
      tenNganh = phongBan.TenPhongBan; // Lấy từ object tìm được
    } else {
      tenNganh = "Không xác định";
    }

    const ThanhTien = teacher.ThanhTien || 0; // Tính tổng tiền
    // Nếu số tiền <= 2 triệu đồng thì không tính thuế
    const tienThueText = teacher.TruThue || 0;
    const tienThucNhanText = teacher.ThucNhan || 0;
    const thoiGianThucHien = formatDateRange(
      teacher.NgayBatDau,
      teacher.NgayKetThuc
    );

    let hoTen = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

    const data = {
      Số_hợp_đồng: teacher.SoHopDong || "",
      Số_thanh_lý: teacher.SoThanhLyHopDong || "",
      Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
      Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
      Danh_xưng: danhXung,
      Họ_và_tên: hoTen,
      CCCD: teacher.CCCD,
      Ngày_cấp: formatDate1(teacher.NgayCapCCCD),
      Nơi_cấp: teacher.NoiCapCCCD,
      Chức_vụ: teacher.ChucVu,
      Cấp_bậc: teacher.HocVi,
      Hệ_số_lương: Number(teacher.HSL).toFixed(2).replace(".", ","),
      Địa_chỉ_theo_CCCD: teacher.DiaChi,
      Điện_thoại: teacher.DienThoai,
      Mã_số_thuế: teacher.MaSoThue,
      Số_tài_khoản: teacher.STK,
      Email: teacher.Email,
      Tại_ngân_hàng: teacher.NganHang,
      Số_tiết: teacher.SoTiet.toString().replace(".", ","),
      Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
      // ✅ Sử dụng giá trị từ database
      Tiền_text: Number(ThanhTien).toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền: numberToWords(ThanhTien),
      Tiền_thuế_Text: Number(tienThueText).toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text: Number(tienThucNhanText).toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
      Đợt: teacher.Dot,
      Năm_học: teacher.NamHoc,
      Thời_gian_thực_hiện: thoiGianThucHien,
      Mức_tiền: Number(mucTien).toLocaleString("vi-VN"),
      // ✅ Các field với suffix "1" cũng dùng giá trị từ DB
      Tiền_text1: Number(ThanhTien).toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền1: numberToWords(ThanhTien),
      Tiền_thuế_Text1: Number(tienThueText).toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text1: Number(tienThucNhanText).toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận1: numberToWords(tienThucNhanText),
      Nơi_công_tác: teacher.NoiCongTac,
      Khóa: teacher.KhoaSinhVien || teacher.KhoaDaoTao || "",
      Ngành: teacher.Nganh || tenNganh || "",
      Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã",
    };
    // Chọn template dựa trên loại hợp đồng
    let templateFileName = "HopDongDA.docx";

    const templatePath = path.resolve(
      __dirname,
      "../templates",
      templateFileName
    );

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "«",
        end: "»",
      },
    });

    doc.render(data);

    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

    const fileName = `HopDong_${hoTenTrim}_${teacher.CCCD}.docx`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, buf);

    return filePath; // Trả về đường dẫn file để dùng sau này

    // const fileName = `HopDong_${teacher.HoTen}.docx`;
    // fs.writeFileSync(path.join(tempDir, fileName), buf);
  } catch (error) {
    console.log(error);
  }
};

const getExportData = async (
  connection,
  dot,
  ki,
  namHoc,
  khoa,
  he_dao_tao,
  teacherName
) => {
  try {
    let query = `
      SELECT 
        ed.CCCD,
        gv.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien AS HoTen,
        ed.NgaySinh,
        ed.NgayCapCCCD,
        ed.GioiTinh,
        ed.STK,
        ed.HocVi,
        ed.ChucVu,
        ed.HSL,
        ed.NoiCapCCCD,
        ed.DiaChi,
        ed.NganHang,
        ed.NoiCongTac,
        ed.Dot,
        ed.ki,
        GROUP_CONCAT(DISTINCT ed.khoa_sinh_vien SEPARATOR ', ') AS KhoaSinhVien,
        GROUP_CONCAT(DISTINCT ed.nganh SEPARATOR ', ') AS Nganh,
        MIN(ed.NgayBatDau) AS NgayBatDau,
        MAX(ed.NgayKetThuc) AS NgayKetThuc,
        SUM(ed.SoTiet) AS SoTiet,
        MAX(ed.TienMoiGiang) AS TienMoiGiang,
        SUM(ed.ThanhTien) AS ThanhTien,
        SUM(ed.TruThue) AS TruThue,
        SUM(ed.ThucNhan) AS ThucNhan,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh AS MaBoMon,
        ed.SoHopDong,
        ed.SoThanhLyHopDong,
        ed.CoSoDaoTao
      FROM gvmoi gv
      JOIN exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
      WHERE 
        ed.Dot = ?
        AND ed.ki = ?
        AND ed.NamHoc = ?
        AND ed.he_dao_tao = ?
        AND gv.isQuanDoi != 1
    `;

    const params = [dot, ki, namHoc, he_dao_tao];

    // 👉 nối theo khoa
    if (khoa && khoa !== "ALL") {
      query += ` AND gv.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
    }

    // 👉 nối theo tên giảng viên
    if (teacherName) {
      query += ` AND gv.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    // GROUP BY cố định
    query += `
      GROUP BY 
        ed.CCCD,
        gv.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien,
        ed.NgaySinh,
        ed.NgayCapCCCD,
        ed.GioiTinh,
        ed.STK,
        ed.HocVi,
        ed.ChucVu,
        ed.HSL,
        ed.NoiCapCCCD,
        ed.DiaChi,
        ed.NganHang,
        ed.NoiCongTac,
        ed.Dot,
        ed.ki,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh,
        ed.SoHopDong,
        ed.SoThanhLyHopDong,
        ed.CoSoDaoTao
    `;

    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getTienLuongList = async (connection) => {
  const query = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
  const [tienLuongList] = await connection.execute(query);
  return tienLuongList;
};

const getBosungDownloadSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi where id_Gvm != 1`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.phuLucMinhChungGvm.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const exportBoSungDownloadData = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Lấy dữ liệu tiền lương
    const tienLuongList = await getTienLuongList(connection);

    if (!tienLuongList || tienLuongList.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy tiền lương phù hợp với giảng viên'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>"
      );
    }

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileList = [];

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      // Lấy file tài liệu bổ sung
      const filePathAdditional = await generateAdditionalFile(teacher, tempDir);

      if (filePathAdditional) {
        fileList.push(filePathAdditional);
      }
    }

    if (fileList.length === 0) {
      return res
        .status(400)
        .send(
          `<script>alert('Không có tài liệu bổ sung nào.'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>`
        );
    }

    const zipPath = path.resolve(__dirname, "TaiLieuBoSung.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      let fileName = `file_bo_sung_dot${dot}_${ki}_${namHoc}`;

      if (teacherName) {
        fileName += "_" + teacherName + ".zip";
      } else if (khoa != "ALL") {
        fileName += "_" + khoa + ".zip";
      } else {
        fileName += "_ALL" + ".zip";
      }
      // Gửi file zip về client
      res.download(zipPath, `${fileName}`, (err) => {
        if (err) {
          console.error("Lỗi gửi file:", err.message);
          res.status(500).send("Không thể tải file zip.");
        }

        // Xoá file zip sau khi tải nếu muốn
        fs.unlinkSync(zipPath);
      });
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);

    fileList.forEach((filePath) => {
      archive.file(filePath, { name: path.basename(filePath) });
    });

    await archive.finalize();
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Hàm tạo file thống kê chuyển khoản
function createTransferDetailDocument(
  data = [],
  noiDung = "",
  truocthue_or_sauthue
) {
  // Hàm phụ trợ: tạo ô header
  function createHeaderCell(text, isBold, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || "").split("\n");
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(
        new TextRun({
          text: line,
          bold: isBold,
          font: "Times New Roman",
          size: 22,
          color: "000000",
        })
      );
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  } // Hàm phụ trợ: tạo ô bình thường
  function createCell(text, isBold = false, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || "").split("\n");
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(
        new TextRun({
          text: line,
          bold: isBold,
          font: "Times New Roman",
          size: 22,
          color: "000000",
        })
      );
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  }

  // Hàm tính tổng tiền
  // function calculateTotal(data) {
  //   return data.reduce((sum, row) => sum + (row.ThucNhan || 0), 0);
  // }

  function calculateTotal(data) {
    return data.reduce((sum, row) => {
      const value = Number(row.ThucNhan || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  }

  // Hàm định dạng số tiền theo VNĐ
  function formatVND(amount) {
    return Number(amount).toLocaleString("vi-VN");
  }

  // Hàm tạo bảng chi tiết
  function createDetailTable(data) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("STT", true),
        createHeaderCell("Số HĐ", true, 1950), // Đặt width cố định 1950 twips cho cột Số HĐ (tăng 50px)
        createHeaderCell("Đơn vị thụ hưởng\n(hoặc cá nhân)", true),
        createHeaderCell("SĐT", true),
        createHeaderCell("Mã số thuế", true),
        createHeaderCell("Số tài khoản", true),
        createHeaderCell("Tại ngân hàng", true, 4800), // Đặt width cố định 4800 twips cho cột Tại ngân hàng
        createHeaderCell("Số tiền (VNĐ)", true),
      ],
    });
    const dataRows = data.length
      ? data.map(
        (row, idx) =>
          new TableRow({
            children: [
              createCell((idx + 1).toString()),
              createCell((row.SoHopDong || "") + "  /HĐ-ĐT", false, 1950), // Ô Số HĐ với width cố định (tăng 50px)
              createCell(row.HoTen || ""),
              createCell(row.DienThoai || ""),
              createCell(row.MaSoThue || ""),
              createCell(row.STK || ""),
              createCell(row.NganHang || "", false, 4800), // Ô Tại ngân hàng với width cố định
              createCell(row.ThucNhan ? formatVND(row.ThucNhan) : ""),
            ],
          })
      )
      : Array.from({ length: 4 }).map(
        () =>
          new TableRow({
            children: [
              createCell(""), // STT
              createCell("", false, 1950), // Số HĐ với width cố định (tăng 50px)
              createCell(""), // Đơn vị thụ hưởng
              createCell(""), // SĐT
              createCell(""), // Mã số thuế
              createCell(""), // Số tài khoản
              createCell("", false, 4800), // Tại ngân hàng với width cố định
              createCell(""), // Số tiền
            ],
          })
      );

    const totalAmount = calculateTotal(data);
    const formattedTotalAmount = formatVND(totalAmount);

    const totalRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Tổng cộng",
                  bold: true,
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          columnSpan: 7,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: formattedTotalAmount || "", // Thay thế null/undefined bằng chuỗi rỗng
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
      ],
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
      rows: [headerRow, ...dataRows, totalRow],
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          font: "Times New Roman",
          size: 22,
          color: "000000",
        },
        paragraph: {
          color: "000000",
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE, // Đặt orientation là landscape
            margin: {
              top: 567, // 1 cm = 567 twips
              right: 567, // 1 cm
              bottom: 567, // 1 cm
              left: 567, // 1 cm
            },
            size: {
              width: 15840, // A4 landscape width (11 inches = 15840 twips)
              height: 12240, // A4 landscape height (8.5 inches = 12240 twips)
            },
          },
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "BAN CƠ YẾU CHÍNH PHỦ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "BẢNG KÊ CHI TIẾT THÔNG TIN CHUYỂN KHOẢN",
                font: "Times New Roman",
                size: 26,
                color: "000000",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Nội dung: `,
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
              new TextRun({
                text: `${noiDung || ""}`, // Thay thế null/undefined bằng chuỗi rỗng
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
            ],
            spacing: { after: 200 },
          }),
          createDetailTable(data),
          new Paragraph({
            italics: true,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `Ghi chú: Số tiền chuyển khoản là số tiền ${truocthue_or_sauthue}`,
                font: "Times New Roman",
                size: 22,
                color: "000000",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

/**
 * Tạo và trả về Workbook cho bảng kê trừ thuế
 * @param {Array<Object>} records Mảng đối tượng chứa dữ liệu dòng (stt, contractNumber, executor, expenseDescription, idNumber, issueDate, issuePlace, idAddress, taxCode, amount, taxDeducted, netAmount)
 * @returns {ExcelJS.Workbook}
 */
function createTaxReportWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng kê tổng hợp thuế');

  // Banner & tiêu đề
  worksheet.addRow(['BAN CƠ YẾU CHÍNH PHỦ']);
  worksheet.addRow(['HỌC VIỆN KỸ THUẬT MẬT MÃ']);
  worksheet.addRow([]);
  worksheet.addRow(['BẢNG KÊ TỔNG HỢP THUẾ']);
  worksheet.addRow(['Hợp đồng hướng dẫn đồ án tốt nghiệp']);
  worksheet.addRow([]);

  [1, 2, 4, 5].forEach(rowNum => {
    worksheet.mergeCells(`A${rowNum}:M${rowNum}`);
    worksheet.getRow(rowNum).font = { bold: true, size: rowNum === 4 ? 13 : 11 };
    worksheet.getRow(rowNum).alignment = { horizontal: 'center' };
  });

  // Cột header
  worksheet.addRow(['STT', 'Số HĐ', 'Người thực hiện', 'Nội dung chi tiêu', 'Số CCCD', 'Ngày cấp', 'Nơi cấp', 'Địa chỉ CCCD', 'SĐT', 'Mã số thuế', 'Số tiền', 'Trừ thuế', 'Còn lại']);

  // Cài đặt độ rộng cột vừa đủ với nội dung
  worksheet.columns = [
    { key: 'stt', width: 5 },                    // STT - chỉ cần vừa số
    { key: 'contractNumber', width: 6 },        // Số hợp đồng - vừa với format "123/HĐ-ĐT"
    { key: 'executor', width: 22 },              // Người thực hiện - tên đầy đủ
    { key: 'expenseDescription', width: 28 },    // Nội dung chi tiêu - mô tả dài
    { key: 'idNumber', width: 14 },              // Số CCCD - 12 chữ số + buffer
    { key: 'issueDate', width: 12 },             // Ngày cấp - DD/MM/YYYY
    { key: 'issuePlace', width: 25 },            // Nơi cấp - tên cơ quan
    { key: 'idAddress', width: 40 },             // Địa chỉ CCCD - địa chỉ đầy đủ
    { key: 'phoneNumber', width: 14 },           // SĐT - số điện thoại
    { key: 'taxCode', width: 14 },               // Mã số thuế - 10-13 chữ số
    { key: 'amount', width: 16 },                // Số tiền - định dạng #,##0
    { key: 'taxDeducted', width: 16 },           // Trừ thuế - định dạng #,##0
    { key: 'netAmount', width: 16 }              // Còn lại - định dạng #,##0
  ];

  worksheet.getRow(7).font = { bold: true, size: 11 };
  worksheet.autoFilter = 'A7:M7';
  worksheet.views = [{ state: 'frozen', ySplit: 7 }];

  // Chèn dữ liệu bắt đầu từ hàng 8
  // Đảm bảo dữ liệu được chèn đúng thứ tự cột bằng cách chuyển đổi object thành array
  const dataRows = records.map(record => [
    record.stt,
    record.contractNumber,
    record.executor,
    record.expenseDescription,
    record.idNumber,
    record.issueDate,
    record.issuePlace,
    record.idAddress,
    record.phoneNumber,
    record.taxCode,
    record.amount,
    record.taxDeducted,
    record.netAmount
  ]);

  dataRows.forEach(row => {
    worksheet.addRow(row);
  });

  // Áp dụng định dạng số có dấu phẩy cho các cột tiền tệ
  const dataStartRow = 8;
  const dataEndRow = worksheet.lastRow.number; // Dòng cuối của dữ liệu (không bao gồm tổng cộng)

  // Định dạng cột F (Ngày cấp CCCD) - định dạng ngày DD/MM/YYYY
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const cell = worksheet.getCell(`F${row}`);
    if (cell.value && cell.value instanceof Date) {
      cell.numFmt = 'dd/mm/yyyy';
    }
  }

  // Định dạng cột K (Số tiền), L (Trừ thuế), M (Còn lại)
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    ['K', 'L', 'M'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      if (cell.value && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  // Footer: Tổng cộng - sử dụng dataEndRow đã được tính chính xác ở trên
  worksheet.addRow([
    'Tổng cộng:', '', '', '', '', '', '', '', '', '',
    { formula: `SUM(K${dataStartRow}:K${dataEndRow})` },
    { formula: `SUM(L${dataStartRow}:L${dataEndRow})` },
    { formula: `SUM(M${dataStartRow}:M${dataEndRow})` }
  ]);
  const totalRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${totalRow}:J${totalRow}`);
  worksheet.getRow(totalRow).font = { bold: true };
  worksheet.getRow(totalRow).alignment = { horizontal: 'right' };

  // Áp dụng định dạng số có dấu phẩy cho dòng tổng cộng
  ['K', 'L', 'M'].forEach(col => {
    worksheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });

  // Tính tổng số tiền để chuyển thành chữ
  let totalAmount = 0;
  if (records && records.length > 0) {
    totalAmount = records.reduce((sum, record) => {
      const amount = typeof record.amount === 'number' ? record.amount : 0;
      return sum + amount;
    }, 0);
  }

  // Bằng chữ
  const textRowVal = `Bằng chữ: ${numberToWords(totalAmount)} đồng chẵn.`;
  worksheet.addRow([textRowVal]);
  const textRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${textRow}:M${textRow}`);
  worksheet.getRow(textRow).font = { italic: true, size: 10 };

  // Ngày tháng năm
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', '', '', '', '', '', `Ngày ... tháng ... năm 2025`, '', '', '', '']);
  const dateRow = worksheet.lastRow.number;
  worksheet.mergeCells(`J${dateRow}:M${dateRow}`);
  worksheet.getRow(dateRow).font = { size: 10 };
  worksheet.getRow(dateRow).alignment = { horizontal: 'center' };

  // Ký tên
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', 'Người lập bảng', '', '', '', 'Trưởng phòng Đào tạo', '', '', '', '']);
  const signRow = worksheet.lastRow.number;
  worksheet.getRow(signRow).font = { bold: true, size: 10 };
  worksheet.getRow(signRow).alignment = { horizontal: 'center' };

  return workbook;
}

module.exports = {
  exportMultipleContracts,
  gethopDongDASite,
  getExportAdditionalDoAnGvmSite,
  exportAdditionalDoAnGvm,
  getBosungDownloadSite,
  exportBoSungDownloadData,
};
```

## File: src/controllers/phuLucHDController.js
```javascript
const express = require("express");
const ExcelJS = require("exceljs");
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const path = require("path");
const gvmService = require("../services/gvmServices");

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]/gi, "_");
}

function convertToRoman(num) {
  const romanNumerals = [
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 8, numeral: "VIII" },
    { value: 7, numeral: "VII" },
    { value: 6, numeral: "VI" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 3, numeral: "III" },
    { value: 2, numeral: "II" },
    { value: 1, numeral: "I" },
  ];

  return romanNumerals
    .filter((r) => num >= r.value)
    .map((r) => {
      const times = Math.floor(num / r.value);
      num -= times * r.value;
      return r.numeral.repeat(times);
    })
    .join("");
}
// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return capitalizeFirstLetter(words.trim() + " đồng");
};

function formatVietnameseDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}
function formatDateDMY(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
const getTienLuongList = async (connection) => {
  const query = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
  const [tienLuongList] = await connection.execute(query);
  return tienLuongList;
};

const getExportPhuLucGiangVienMoiPath = async (
  req,
  connection,
  dot,
  ki,
  namHoc,
  loaiHopDongText,
  khoa,
  teacherName,
  data
) => {
  try {
    // Lấy dữ liệu từ session
    const isKhoa = req.session.isKhoa;

    const tienLuongList = await getTienLuongList(connection);

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();

    // Nhóm dữ liệu theo giảng viên
    const groupedData = data.reduce((acc, cur) => {
      (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
      return acc;
    }, {});
    const summarySheet = workbook.addWorksheet("Tổng hợp");

    // Thiết lập các thông số cho trang
    summarySheet.pageSetup = {
      paperSize: 9, // Kích thước giấy A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3149,
        right: 0.3149,
        top: 0,
        bottom: 0,
        header: 0.3149,
        footer: 0.3149,
      },
    };
    summarySheet.addRow([]); // Thêm một hàng trống ở đầu sheet
    // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
    const titleRow0 = summarySheet.addRow(["Ban Cơ yếu Chính phủ"]);
    titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
    titleRow0.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

    // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
    const titleRow1 = summarySheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
    titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow1.alignment = { vertical: "middle", horizontal: "center" };
    summarySheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`); const titleRow2 = summarySheet.addRow(["Phụ lục"]);
    titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

    // Lấy SoHopDong và SoThanhLyHopDong từ dữ liệu đầu tiên để hiển thị trong tổng hợp
    const firstSoHopDong = data[0]?.SoHopDong || '';
    const firstSoThanhLyHopDong = data[0]?.SoThanhLyHopDong || '';

    // Xử lý firstSoHopDong: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
    const summaryContractNumber = firstSoHopDong && firstSoHopDong.trim() !== ''
      ? `Hợp đồng số: ${firstSoHopDong} `
      : `Hợp đồng số:           /HĐ-ĐT `;

    const titleRow3 = summarySheet.addRow([summaryContractNumber]);
    titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow3.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

    // Xử lý firstSoThanhLyHopDong: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
    const summaryVerificationNumber = firstSoThanhLyHopDong && firstSoThanhLyHopDong.trim() !== ''
      ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${firstSoThanhLyHopDong} `
      : `Kèm theo biên bản nghiệm thu Hợp đồng số:           /HĐNT-ĐT `;

    const titleRow4 = summarySheet.addRow([
      summaryVerificationNumber,
    ]);
    titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow4.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);
    // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
    const titleRow5 = summarySheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Đơn vị tính: Đồng",
      "",
      "",
    ]);
    titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

    // Thiết lập tiêu đề cột
    const summaryHeader = [
      "STT",
      "Họ tên giảng viên",
      "Tên học phần",
      "Tên lớp",
      "Số tiết",
      "Thời gian thực hiện",
      "Học kỳ",
      "Địa chỉ",
      "Học vị",
      "HS lương",
      "Mức thanh toán",
      "Thành tiền",
      "Trừ thuế TNCN 10%",
      "Còn lại",
    ];

    const headerRow = summarySheet.addRow(summaryHeader);
    headerRow.font = { name: "Times New Roman", bold: true };

    // Định dạng cột
    summarySheet.getColumn(1).width = 5; // STT
    summarySheet.getColumn(2).width = 18; // Họ tên giảng viên
    summarySheet.getColumn(3).width = 30; // Tên học phần
    summarySheet.getColumn(4).width = 14; // Tên lớp
    summarySheet.getColumn(5).width = 10; // Số tiết
    summarySheet.getColumn(6).width = 17; // Thời gian thực hiện
    summarySheet.getColumn(7).width = 6; // Học kỳ
    summarySheet.getColumn(8).width = 29; // Địa chỉ
    summarySheet.getColumn(9).width = 6; // Học vị
    summarySheet.getColumn(10).width = 6; // Hệ số lương
    summarySheet.getColumn(11).width = 12; // Mức thanh toán
    summarySheet.getColumn(12).width = 14; // Thành tiền
    summarySheet.getColumn(13).width = 14; // Trừ thuế TNCN 10%
    summarySheet.getColumn(14).width = 14; // Còn lại

    // Thêm dữ liệu vào sheet tổng hợp
    let stt = 1;
    let totalSoTiet = 0;
    let totalSoTien = 0;
    let totalTruThue = 0;
    let totalThucNhan = 0;

    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      giangVienData.forEach((item) => {
        const soTiet = item.SoTiet;
        const hocVi = item.HocVi || "Thạc sĩ"; // Default to "Thạc sĩ" if HocVi is empty

        // Tìm mức tiền lương dựa trên he_dao_tao và HocVi
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;

        // Tính toán số tiền, thuế, thực nhận
        const soTien = soTiet * mucThanhToan;
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1;
        const thucNhan = soTien - truThue;
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;        // Thêm hàng dữ liệu vào sheet tổng hợp
        const summaryRow = summarySheet.addRow([
          stt,
          item.GiangVien,
          item.TenHocPhan,
          item.Lop,
          (item.SoTiet || 0).toLocaleString("vi-VN"),
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN"),
          mucThanhToan.toLocaleString("vi-VN"), // Mức thanh toán
          soTien.toLocaleString("vi-VN"), // Định dạng số tiền
          truThue.toLocaleString("vi-VN"), // Định dạng số tiền
          thucNhan.toLocaleString("vi-VN"), // Định dạng số tiền
        ]);

        // Cập nhật các tổng cộng
        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;

        // Căn chỉnh cỡ chữ và kiểu chữ cho từng ô trong hàng dữ liệu
        summaryRow.eachCell((cell, colNumber) => {
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
          cell.alignment = { horizontal: "center", vertical: "middle" }; // Căn giữa
          cell.alignment.wrapText = true; // Bật wrapText cho ô
        });

        stt++; // Tăng số thứ tự
      });
    }    // Thêm hàng tổng cộng vào cuối bảng
    const totalRow = summarySheet.addRow([
      "Tổng cộng",
      "",
      "",
      "",
      totalSoTiet.toLocaleString("vi-VN"),
      "",
      "",
      "",
      "",
      "",
      "",
      totalSoTien.toLocaleString("vi-VN"),
      totalTruThue.toLocaleString("vi-VN"),
      totalThucNhan.toLocaleString("vi-VN"),
    ]);

    totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
    totalRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Gộp ô cho hàng tổng cộng
    summarySheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    // Định dạng các ô trong bảng
    const firstRowOfTable = 6; // Giả sử bảng bắt đầu từ hàng 8
    const lastRowOfTable = totalRow.number; // Hàng tổng cộng

    for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
      const row = summarySheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }
    // Định dạng cho tiêu đề cột
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "none", // Không màu nền
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    // Tạo một sheet cho mỗi giảng viên
    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      const worksheet = workbook.addWorksheet(giangVien);

      worksheet.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0 = worksheet.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1 = worksheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);

      const titleRow2 = worksheet.addRow(["Phụ lục"]);
      titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);      // Tìm ngày bắt đầu sớm nhất từ dữ liệu giảng viên
      const earliestDate = giangVienData.reduce((minDate, item) => {
        const currentStartDate = new Date(item.NgayBatDau);
        return currentStartDate < minDate ? currentStartDate : minDate;
      }, new Date(giangVienData[0].NgayBatDau));

      // Định dạng ngày bắt đầu sớm nhất thành chuỗi
      const formattedEarliestDate = formatVietnameseDate(earliestDate);      // Lấy SoHopDong từ dữ liệu giảng viên (vì tất cả có cùng CCCD nên SoHopDong giống nhau)
      const soHopDong = giangVienData[0]?.SoHopDong || '';
      const soThanhLyHopDong = giangVienData[0]?.SoThanhLyHopDong || '';

      // Xử lý soHopDong: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
      const contractNumber = soHopDong && soHopDong.trim() !== ''
        ? `Hợp đồng số: ${soHopDong} ${formattedEarliestDate}`
        : `Hợp đồng số:           /HĐ-ĐT ${formattedEarliestDate}`;

      const titleRow3 = worksheet.addRow([
        contractNumber,
      ]);
      titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5 = worksheet.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`L${titleRow5.number}:N${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
        "STT", // Thêm tiêu đề STT
        "Họ tên giảng viên",
        "Tên học phần",
        "Tên lớp",
        "Số tiết",
        "Thời gian thực hiện",
        "Học kỳ",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow = worksheet.addRow(header);
      headerRow.font = { name: "Times New Roman", bold: true };

      worksheet.pageSetup = {
        paperSize: 9, // A4 paper size
        orientation: "landscape",
        fitToPage: true, // Fit to page
        fitToWidth: 1, // Fit to width
        fitToHeight: 0, // Do not fit to height
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };

      // Căn chỉnh độ rộng cột
      // Định dạng độ rộng cột, bao gồm cột STT
      worksheet.getColumn(1).width = 5; // STT
      worksheet.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet.getColumn(3).width = 30; // Tên học phần
      worksheet.getColumn(4).width = 14; // Tên lớp
      worksheet.getColumn(5).width = 10; // Số tiết
      worksheet.getColumn(6).width = 17; // Thời gian thực hiện
      worksheet.getColumn(7).width = 6; // Học kỳ
      worksheet.getColumn(8).width = 29; // Địa Chỉ
      worksheet.getColumn(9).width = 6; // Học vị
      worksheet.getColumn(10).width = 6; // Hệ số lương
      worksheet.getColumn(11).width = 12; // Mức thanh toán
      worksheet.getColumn(12).width = 14; // Thành tiền
      worksheet.getColumn(13).width = 14; // Trừ thuế TNCN 10%
      worksheet.getColumn(14).width = 14; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "none", // Không màu nền
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      let totalSoTiet = 0;
      let totalSoTien = 0;
      let totalTruThue = 0;
      let totalThucNhan = 0;

      giangVienData.forEach((item, index) => {
        const soTiet = item.SoTiet;
        const hocVi = item.HocVi || "Thạc sĩ"; // Default to "Thạc sĩ" if HocVi is empty

        // Tìm mức tiền lương dựa trên he_dao_tao và HocVi
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;

        // Tính toán số tiền, thuế, thực nhận
        const soTien = soTiet * mucThanhToan;
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1;
        const thucNhan = soTien - truThue;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        const hocKyLaMa = convertToRoman(item.HocKy);
        // Viết tắt Học vị
        const hocViVietTat =
          hocVi === "Tiến sĩ" ? "TS" : hocVi === "Thạc sĩ" ? "ThS" : hocVi; const row = worksheet.addRow([
            index + 1, // STT
            item.GiangVien,
            item.TenHocPhan,
            item.Lop,
            (item.SoTiet || 0).toLocaleString("vi-VN"),
            thoiGianThucHien,
            hocKyLaMa, // Sử dụng số La Mã cho Học kỳ
            item.DiaChi,
            hocViVietTat, // Sử dụng viết tắt cho Học vị
            item.HSL.toLocaleString("vi-VN"),
            mucThanhToan.toLocaleString("vi-VN"), // Mức thanh toán
            soTien.toLocaleString("vi-VN"), // Định dạng số tiền
            truThue.toLocaleString("vi-VN"),
            thucNhan.toLocaleString("vi-VN"),
          ]);
        row.font = { name: "Times New Roman", size: 13 };

        // Bật wrapText cho các ô dữ liệu và căn giữa
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Chỉnh cỡ chữ cho từng cột
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;
      });      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet.toLocaleString("vi-VN"),
        "",
        "",
        "",
        "",
        "",
        "",
        totalSoTien.toLocaleString("vi-VN"),
        totalTruThue.toLocaleString("vi-VN"),
        totalThucNhan.toLocaleString("vi-VN"),
      ]);
      totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Gộp ô cho hàng tổng cộng
      worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      // Thêm hai dòng trống
      worksheet.addRow([]);
      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      const bangChuRow = worksheet.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien)}`,
      ]);
      bangChuRow.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet.mergeCells(`A${bangChuRow.number}:${bangChuRow.number}`);
      bangChuRow.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 6 trở đi
      const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 7
      const lastRowOfTable = totalRow.number; // Hàng tổng cộng

      for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }

      // Thêm sheet 2 cho mỗi giảng viên
      const worksheet2 = workbook.addWorksheet(`${giangVien} (2)`);

      worksheet2.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0_2 = worksheet2.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0_2.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow0_2.number}:C${titleRow0_2.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1_2 = worksheet2.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1_2.alignment = { vertical: "middle", horizontal: "center" };
      worksheet2.mergeCells(`A${titleRow1_2.number}:C${titleRow1_2.number}`);

      const titleRow2_2 = worksheet2.addRow(["Phụ lục"]);
      titleRow2_2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow2_2.number}:L${titleRow2_2.number}`);

      // Tìm ngày kết thúc muộn nhất từ dữ liệu giảng viên (cho biên bản nghiệm thu)
      const latestEndDate = giangVienData.reduce((maxDate, item) => {
        const currentEndDate = new Date(item.NgayKetThuc);
        return currentEndDate > maxDate ? currentEndDate : maxDate;
      }, new Date(giangVienData[0].NgayKetThuc));

      // Định dạng ngày kết thúc muộn nhất thành chuỗi
      const formattedLatestEndDate = formatVietnameseDate(latestEndDate);

      // Lấy SoThanhLyHopDong từ dữ liệu giảng viên
      const soHopDong_2 = giangVienData[0]?.SoHopDong || '';
      const soThanhLyHopDong_2 = giangVienData[0]?.SoThanhLyHopDong || '';

      // Xử lý soThanhLyHopDong_2: nếu null, undefined, hoặc rỗng thì để trống với kí hiệu hardcode, ngược lại hiển thị trực tiếp từ DB
      const contractNumberWithVerification = soThanhLyHopDong_2 && soThanhLyHopDong_2.trim() !== ''
        ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${soThanhLyHopDong_2} ${formattedLatestEndDate}`
        : `Kèm theo biên bản nghiệm thu Hợp đồng số:           /HĐNT-ĐT ${formattedLatestEndDate}`;

      const titleRow4_2 = worksheet2.addRow([
        contractNumberWithVerification,
      ]);
      titleRow4_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow4_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow4_2.number}:M${titleRow4_2.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5_2 = worksheet2.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5_2.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`L${titleRow5_2.number}:N${titleRow5_2.number}`);

      // Định nghĩa tiêu đề cột cho sheet 2
      const header2 = [
        "STT",
        "Họ tên giảng viên",
        "Tên học phần",
        "Tên lớp",
        "Số tiết",
        "Thời gian thực hiện",
        "Học kỳ",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow2 = worksheet2.addRow(header2);
      headerRow2.font = { name: "Times New Roman", bold: true };

      worksheet2.pageSetup = { ...worksheet.pageSetup };

      // Định dạng cột giống sheet 1
      worksheet2.getColumn(1).width = 5; // STT
      worksheet2.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet2.getColumn(3).width = 30; // Tên học phần
      worksheet2.getColumn(4).width = 14; // Tên lớp
      worksheet2.getColumn(5).width = 10; // Số tiết
      worksheet2.getColumn(6).width = 17; // Thời gian thực hiện
      worksheet2.getColumn(7).width = 6; // Học kỳ
      worksheet2.getColumn(8).width = 29; // Địa chỉ
      worksheet2.getColumn(9).width = 6; // Học vị
      worksheet2.getColumn(10).width = 6; // Hệ số lương
      worksheet2.getColumn(11).width = 12; // Mức thanh toán
      worksheet2.getColumn(12).width = 14; // Thành tiền
      worksheet2.getColumn(13).width = 14; // Trừ thuế TNCN 10%
      worksheet2.getColumn(14).width = 14; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow2.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "none", // Không màu nền
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      // Thêm dữ liệu cho sheet 2 giống sheet 1
      let totalSoTiet2 = 0;
      let totalSoTien2 = 0;
      let totalTruThue2 = 0;
      let totalThucNhan2 = 0;

      giangVienData.forEach((item, index) => {
        const soTiet = item.SoTiet;
        const hocVi = item.HocVi || "Thạc sĩ";

        // Tìm mức tiền lương dựa trên he_dao_tao và HocVi
        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === item.he_dao_tao && tl.HocVi === hocVi
        );
        const mucThanhToan = tienLuong ? tienLuong.SoTien : 0;

        // Tính toán số tiền, thuế, thực nhận
        const soTien = soTiet * mucThanhToan;
        const truThue = soTien < 2000000 ? 0 : soTien * 0.1;
        const thucNhan = soTien - truThue;
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;
        const hocKyLaMa = convertToRoman(item.HocKy);
        const hocViVietTat =
          hocVi === "Tiến sĩ" ? "TS" : hocVi === "Thạc sĩ" ? "ThS" : hocVi; const row = worksheet2.addRow([
            index + 1,
            item.GiangVien,
            item.TenHocPhan,
            item.Lop,
            (item.SoTiet || 0).toLocaleString("vi-VN"),
            thoiGianThucHien,
            hocKyLaMa,
            item.DiaChi,
            hocViVietTat,
            item.HSL.toLocaleString("vi-VN"),
            mucThanhToan.toLocaleString("vi-VN"),
            soTien.toLocaleString("vi-VN"),
            truThue.toLocaleString("vi-VN"),
            thucNhan.toLocaleString("vi-VN"),
          ]);
        row.font = { name: "Times New Roman", size: 13 };
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          // Định dạng font cho từng cột giống sheet 1
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 14: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet2 += parseFloat(item.SoTiet);
        totalSoTien2 += soTien;
        totalTruThue2 += truThue;
        totalThucNhan2 += thucNhan;
      });      // Thêm hàng tổng cộng cho sheet 2
      const totalRow2 = worksheet2.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet2.toLocaleString("vi-VN"),
        "",
        "",
        "",
        "",
        "",
        "",
        totalSoTien2.toLocaleString("vi-VN"),
        totalTruThue2.toLocaleString("vi-VN"),
        totalThucNhan2.toLocaleString("vi-VN"),
      ]);
      totalRow2.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow2.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet2.mergeCells(`A${totalRow2.number}:C${totalRow2.number}`);

      // Thêm hai dòng trống
      worksheet2.addRow([]);

      // Thêm dòng "Bằng chữ" cho sheet 2
      const bangChuRow2 = worksheet2.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien2)}`,
      ]);
      bangChuRow2.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet2.mergeCells(`A${bangChuRow2.number}:${bangChuRow2.number}`);
      bangChuRow2.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 8 đến hàng tổng cộng
      const firstRowOfTable2 = 8;
      const lastRowOfTable2 = totalRow2.number;
      for (let i = firstRowOfTable2; i <= lastRowOfTable2; i++) {
        const row = worksheet2.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    // Tạo tên file
    let fileName = `PhuLuc_GiangDay_${loaiHopDongText}_Dot${dot}_Ki${ki}_${namHoc}`;
    if (khoa && khoa !== "ALL") {
      fileName += `_${sanitizeFileName(khoa)}`;
    }
    if (teacherName) {
      fileName += `_${sanitizeFileName(teacherName)}`;
    }
    fileName += ".xlsx";

    // Tạo đường dẫn đầy đủ tới file
    const filePath = path.join(tempDir, fileName);

    // Ghi workbook vào file
    await workbook.xlsx.writeFile(filePath);

    // Trả về đường dẫn file để dùng tiếp (nén, gửi,...)
    return filePath;
  } catch (error) {
    console.error("Error exporting data file path:", error);
  }
};

const exportPhuLucGiangVienMoi = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    let { dot, ki, namHoc, loaiHopDong, khoa, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đợt, kỳ hoặc năm học",
      });
    } let query = `
      WITH 
    phuLucSauDH AS (
        SELECT DISTINCT
            TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) AS GiangVien, 
            qc.TenLop AS Lop, 
            ROUND(qc.QuyChuan * 0.7, 2) AS SoTiet, 
            qc.LopHocPhan AS TenHocPhan, 
            qc.KiHoc AS HocKy,
            gv.HocVi, 
            gv.HSL,
            gv.CCCD,
            qc.NgayBatDau, 
            qc.NgayKetThuc,
            gv.DiaChi,
            qc.Dot,
            qc.KiHoc,
            qc.NamHoc,
            qc.Khoa,
            qc.he_dao_tao,
            gv.MaPhongBan
        FROM quychuan qc
        JOIN gvmoi gv 
            ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen 
        WHERE qc.GiaoVienGiangDay LIKE '%,%'
    ),
    phuLucDH AS (
        SELECT DISTINCT
            TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien, 
            qc.TenLop AS Lop, 
            qc.QuyChuan AS SoTiet, 
            qc.LopHocPhan AS TenHocPhan, 
            qc.KiHoc AS HocKy,
            gv.HocVi, 
            gv.HSL,
            gv.CCCD,
            qc.NgayBatDau, 
            qc.NgayKetThuc,
            gv.DiaChi,
            qc.Dot,
            qc.KiHoc,
            qc.NamHoc,
            qc.Khoa,
            qc.he_dao_tao,
            gv.MaPhongBan
        FROM quychuan qc
        JOIN gvmoi gv 
            ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) = gv.HoTen
        WHERE qc.MoiGiang = 1 AND qc.GiaoVienGiangDay NOT LIKE '%,%'
    ),
    table_ALL AS (
        SELECT * FROM phuLucSauDH
        UNION
        SELECT * FROM phuLucDH
    ),
    hopDongInfo AS (
        SELECT 
            CCCD, 
            he_dao_tao,
            Dot,
            KiHoc,
            NamHoc,
            MaPhongBan,
            MAX(SoHopDong) as SoHopDong, 
            MAX(SoThanhLyHopDong) as SoThanhLyHopDong
        FROM hopdonggvmoi
        WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND he_dao_tao = ?
        GROUP BY CCCD, he_dao_tao, Dot, KiHoc, NamHoc, MaPhongBan
    )    
    SELECT DISTINCT t.*, hd.SoHopDong, hd.SoThanhLyHopDong 
    FROM table_ALL t
    LEFT JOIN hopDongInfo hd ON t.CCCD = hd.CCCD 
        AND t.Dot = hd.Dot 
        AND t.KiHoc = hd.KiHoc 
        AND t.NamHoc = hd.NamHoc
        AND t.he_dao_tao = hd.he_dao_tao
        AND t.MaPhongBan = hd.MaPhongBan
    WHERE t.Dot = ? AND t.KiHoc = ? AND t.NamHoc = ? AND t.he_dao_tao = ?
    `;

    let params = [dot, ki, namHoc, loaiHopDong, dot, ki, namHoc, loaiHopDong]; if (khoa && khoa !== "ALL") {
      query += ` AND t.MaPhongBan = ?`;
      params.push(khoa);
    }

    if (teacherName) {
      query += ` AND t.GiangVien LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    const [data] = await connection.execute(query, params);

    if (data.length === 0) {
      return res.send(
        `<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/phuLucHD';</script>`
      );
    }

    const heDaoTaoData = await gvmService.getHeMoiGiangData(req, res);

    const loaiHopDongText = heDaoTaoData.find(
      (item) => item.id.toString() === loaiHopDong.toString()
    )?.he_dao_tao || "UnknownType";

    const filePaths = await getExportPhuLucGiangVienMoiPath(
      req,
      connection,
      dot,
      ki,
      namHoc,
      loaiHopDongText,
      khoa,
      teacherName,
      data
    );

    // Kiểm tra filePaths
    if (!filePaths) {
      console.error("getExportPhuLucGiangVienMoiPath trả về undefined");
      return res.status(500).json({
        success: false,
        message: "Không thể tạo file export",
      });
    }

    // Lấy tên file từ đường dẫn
    const fileName = path.basename(filePaths);

    // Gửi file cho client
    res.download(filePaths, fileName, (err) => {
      if (err) {
        console.error("Lỗi khi gửi file:", err);
        if (!res.headersSent) {
          return res.status(500).send("Lỗi khi gửi file");
        }
      }

      // Xóa file và thư mục sau khi gửi
      setTimeout(() => {
        try {
          if (fs.existsSync(filePaths)) {
            fs.unlinkSync(filePaths); // Xóa file
            console.log("Đã xóa file:", filePaths);

            // Xóa thư mục tạm (nếu rỗng)
            const tempDir = path.dirname(filePaths);
            try {
              fs.rmdirSync(tempDir); // Chỉ xóa được thư mục rỗng
              console.log("Đã xóa thư mục:", tempDir);
            } catch (dirErr) {
              console.log(
                "Không thể xóa thư mục (có thể không rỗng):",
                tempDir
              );
            }
          }
        } catch (cleanupErr) {
          console.error("Lỗi khi xóa file:", cleanupErr);
        }
      }, 100);
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getPhuLucHDSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("moigiang.phuLucHopDongGVM.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  exportPhuLucGiangVienMoi,
  getPhuLucHDSite,
  getExportPhuLucGiangVienMoiPath,
};
```

## File: src/controllers/suaHDController.js
```javascript
const path = require('path');
const fs = require('fs');

// Controller xử lý yêu cầu tải tệp
exports.downloadFile = (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '..', 'templates', fileName); // Đường dẫn đến thư mục templates

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Tệp không tìm thấy');
        }

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Lỗi khi tải xuống:', err);
                res.status(500).send('Có lỗi xảy ra khi tải xuống');
            }
        });
    });
};

// Controller xử lý yêu cầu upload và ghi đè tệp
exports.uploadFile = (req, res) => {
    console.log("Bắt đầu xử lý upload file...");
    console.log("Thông tin file nhận được:", req.file);

    if (!req.file) {
        console.error("Không có tệp nào được gửi!");
        return res.status(400).send('Không có tệp nào được gửi!');
    }

    const filePath = path.join(__dirname, '..', 'templates', req.file.originalname); // Đường dẫn lưu tệp
    const tempPath = req.file.path; // Đường dẫn file tạm

    console.log("Đường dẫn file tạm:", tempPath);
    console.log("Đường dẫn file đích:", filePath);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error("Tên tệp tải lên không trùng với tên tệp đã tồn tại!");
            fs.unlink(tempPath, () => {});
            return res.status(400).send('Tên tệp tải lên không trùng với tên tệp đã tồn tại!');
        }

        // Nếu tệp đã tồn tại, xóa tệp cũ trước khi ghi đè
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error("Lỗi khi xóa tệp cũ:", err);
                fs.unlink(tempPath, () => {}); // Xóa file tạm nếu có lỗi
                return res.status(500).send('Có lỗi xảy ra khi xóa tệp cũ!');
            }

            // Di chuyển file mới vào thư mục templates
            fs.rename(tempPath, filePath, (err) => {
                if (err) {
                    console.error("Lỗi khi ghi đè tệp:", err);
                    fs.unlink(tempPath, () => {}); // Xóa file tạm nếu có lỗi
                    return res.status(500).send('Có lỗi xảy ra khi ghi đè tệp!');
                }

                console.log("Tệp đã được tải lên và ghi đè thành công!");
                res.json({ message: 'Tệp đã được tải lên và ghi đè thành công' });
            });
        });
    });
};
```

## File: src/controllers/uyNhiemChiController.js
```javascript
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const createPoolConnection = require('../config/databasePool');

// Đường dẫn thư mục templates
const TEMPLATES_DIR = path.join(__dirname, '../templates/uy-nhiem-chi');
const GENERATED_DIR = path.join(TEMPLATES_DIR, 'generated');

// Hàm chuyển số thành chữ tiếng Việt
function numberToWords(number) {
    if (number === 0) return "Không đồng";
    
    const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
    const tens = ["", "", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
    const thousands = ["", "nghìn", "triệu", "tỷ"];
    
    function convertHundreds(num) {
        let result = "";
        
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        
        if (hundred > 0) {
            result += ones[hundred] + " trăm";
            if (remainder > 0 && remainder < 10) {
                result += " lẻ";
            }
        }
        
        if (remainder >= 20) {
            const ten = Math.floor(remainder / 10);
            const unit = remainder % 10;
            result += (result ? " " : "") + tens[ten];
            if (unit > 0) {
                if (unit === 1 && ten > 1) {
                    result += " mốt";
                } else if (unit === 5 && ten > 0) {
                    result += " lăm";
                } else {
                    result += " " + ones[unit];
                }
            }
        } else if (remainder >= 10) {
            result += (result ? " " : "") + teens[remainder - 10];
        } else if (remainder > 0) {
            result += (result ? " " : "") + ones[remainder];
        }
        
        return result;
    }
    
    function convertGroup(num) {
        if (num === 0) return "";
        
        let result = "";
        const groups = [];
        let groupIndex = 0;
        
        while (num > 0) {
            const group = num % 1000;
            if (group !== 0) {
                let groupText = convertHundreds(group);
                if (groupIndex > 0) {
                    groupText += " " + thousands[groupIndex];
                }
                groups.unshift(groupText);
            }
            num = Math.floor(num / 1000);
            groupIndex++;
        }
        
        result = groups.join(" ");
        return result;
    }
    
    let result = convertGroup(Math.abs(number));
    
    // Viết hoa chữ cái đầu
    if (result) {
        result = result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
    }
    
    return result;
}

// Hàm format số tiền
function formatCurrency(number) {
  return new Intl.NumberFormat('vi-VN').format(number) + ' đ';
}

// Hàm thay thế placeholder trong worksheet - cải tiến để giữ nguyên format
function replaceTemplateValues(worksheet, replacements) {
  // Duyệt qua tất cả cells trong worksheet
  for (let cellAddress in worksheet) {
    // Bỏ qua các thuộc tính đặc biệt của worksheet
    if (cellAddress[0] === '!') continue;
    
    let cell = worksheet[cellAddress];
    if (cell && cell.v) {
      let cellValue = String(cell.v);
      let hasChanges = false;
      
      // Thay thế tất cả placeholder trong cell
      for (let placeholder in replacements) {
        if (cellValue.includes(placeholder)) {
          console.log(`Found placeholder ${placeholder} in cell ${cellAddress}, replacing with:`, replacements[placeholder]);
          cellValue = cellValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacements[placeholder]);
          hasChanges = true;
        }
      }
      
      // Cập nhật giá trị cell nếu có thay đổi - GIỮ NGUYÊN format gốc
      if (hasChanges) {
        // Chỉ thay đổi giá trị, giữ nguyên tất cả thuộc tính khác
        cell.v = cellValue;
        if (cell.w) cell.w = cellValue;
        // Không thay đổi type, style, format khác
      }
    }
  }
}

// Tạo object cho controller tải ủy nhiệm chi
const taiUyNhiemChiController = {
  // Hiển thị trang tải ủy nhiệm chi
  getTaiUyNhiemChiPage: (req, res) => {
    try {
      res.render('taiUyNhiemChi', {
        title: 'Tải Ủy Nhiệm Chi',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering tai uy nhiem chi page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Xử lý tải file ủy nhiệm chi
  downloadUyNhiemChi: async (req, res) => {
    let connection;
    try {
      const { filters } = req.body || {};
      const { dot, ki, namHoc, khoa, heDaoTao } = filters || {};
      
      // Validate input
      if (!dot || !ki || !namHoc) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đợt, kỳ hoặc năm học'
        });
      }

      // Kết nối database
      connection = await createPoolConnection();

      // Query lấy dữ liệu từ hopdonggvmoi với SoUyNhiem và SoThanhToan
      let query = `
        SELECT 
          hd.HoTen,
          hd.STK,
          hd.NganHang,
          SUM(hd.ThucNhan) as SoTien,
          hd.MaPhongBan,
          hd.he_dao_tao,
          hd.CCCD,
          hd.SoUyNhiem,
          hd.SoThanhToan
        FROM hopdonggvmoi hd
        WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
          AND hd.KhoaDuyet = 1 AND hd.DaoTaoDuyet = 1 AND hd.TaiChinhDuyet = 1
          AND hd.SoUyNhiem IS NOT NULL AND hd.SoThanhToan IS NOT NULL
      `;
      
      const params = [dot, ki, namHoc];

      // Thêm lọc hệ đào tạo nếu có
      if (heDaoTao && heDaoTao.trim() !== "") {
        query += ` AND hd.he_dao_tao = ?`;
        params.push(heDaoTao);
      }

      // Lọc khoa nếu cần
      if (khoa && khoa !== "" && khoa !== "ALL") {
        query += ` AND hd.MaPhongBan = ?`;
        params.push(khoa);
      }

      // Group by CCCD để tổng hợp SoTien cho cùng người
      query += ` GROUP BY hd.CCCD, hd.HoTen, hd.STK, hd.NganHang, hd.MaPhongBan, hd.he_dao_tao, hd.SoUyNhiem, hd.SoThanhToan ORDER BY hd.SoUyNhiem`;

      const [rows] = await connection.execute(query, params);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu phù hợp hoặc chưa tạo số ủy nhiệm chi'
        });
      }

      // Đọc file mẫu
      const templatePath = path.join(TEMPLATES_DIR, 'Mẫu ủy nhiệm chi.xlsx');
      
      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({
          success: false,
          message: 'File mẫu không tồn tại'
        });
      }

      // Kiểm tra file mẫu có đọc được không
      try {
        const templateStats = fs.statSync(templatePath);
        if (templateStats.size === 0) {
          throw new Error('File mẫu rỗng');
        }
        
        // Thử đọc file bằng ExcelJS để kiểm tra tính hợp lệ
        const testWorkbook = new ExcelJS.Workbook();
        await testWorkbook.xlsx.readFile(templatePath);
        if (!testWorkbook.worksheets || testWorkbook.worksheets.length === 0) {
          throw new Error('File mẫu không hợp lệ hoặc không có sheet nào');
        }
        
        console.log('Template file is valid. Sheets:', testWorkbook.worksheets.length);
        
      } catch (templateError) {
        console.error('Template file error:', templateError);
        return res.status(500).json({
          success: false,
          message: 'File mẫu bị lỗi: ' + templateError.message + '. Vui lòng upload file mẫu mới.'
        });
      }

      // Tạo 1 file Excel với mỗi người 1 sheet riêng
      const currentDate = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
      const fileName = `Uy_nhiem_chi_${currentDate}.xlsx`;
      const outputPath = path.join(GENERATED_DIR, fileName);

      // Đảm bảo thư mục generated tồn tại
      if (!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR, { recursive: true });
      }

      try {
        // Sử dụng ExcelJS để giữ nguyên format và hình ảnh
        const templateWorkbook = new ExcelJS.Workbook();
        await templateWorkbook.xlsx.readFile(templatePath);
        
        if (templateWorkbook.worksheets.length === 0) {
          throw new Error('File mẫu không có sheet nào');
        }
        
        const templateWorksheet = templateWorkbook.worksheets[0];
        
        // Tạo workbook mới cho output
        const outputWorkbook = new ExcelJS.Workbook();
        
        // Tạo sheet cho từng người
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          const soUyNhiem = String(row.SoUyNhiem).padStart(3, '0');
          const sheetName = `${soUyNhiem}_${row.HoTen.replace(/\s+/g, '_')}_${row.CCCD}`;
          
          // Clone worksheet từ template để giữ nguyên toàn bộ định dạng
          const newWorksheet = outputWorkbook.addWorksheet(sheetName);
          
          // Copy toàn bộ cấu trúc từ template worksheet
          templateWorksheet.eachRow({ includeEmpty: true }, (templateRow, rowNumber) => {
            const newRow = newWorksheet.getRow(rowNumber);
            if (templateRow.height) newRow.height = templateRow.height;
            
            templateRow.eachCell({ includeEmpty: true }, (templateCell, colNumber) => {
              const newCell = newRow.getCell(colNumber);
              
              // Copy value
              if (templateCell.value !== null && templateCell.value !== undefined) {
                newCell.value = templateCell.value;
              }
              
              // Copy style hoàn chỉnh
              if (templateCell.style) {
                newCell.style = JSON.parse(JSON.stringify(templateCell.style));
              }
            });
          });
          
          // Copy column properties
          templateWorksheet.columns.forEach((col, colIndex) => {
            const newCol = newWorksheet.getColumn(colIndex + 1);
            if (col.width !== undefined) newCol.width = col.width;
            if (col.hidden !== undefined) newCol.hidden = col.hidden;
          });
          
          // Copy drawings/images
          if (templateWorksheet.drawings) {
            templateWorksheet.drawings.forEach(drawing => {
              try {
                newWorksheet.addImage(drawing.image, {
                  tl: drawing.range.tl,
                  br: drawing.range.br || drawing.range.tl
                });
              } catch (e) {
                console.error('Error copying drawing:', e);
              }
            });
          }
          if (templateWorksheet.model && templateWorksheet.model.merges) {
            templateWorksheet.model.merges.forEach(merge => {
              try {
                newWorksheet.mergeCells(merge);
              } catch (e) {
                // Ignore merge errors
              }
            });
          }
          
          // Copy page setup
          if (templateWorksheet.pageSetup) {
            newWorksheet.pageSetup = JSON.parse(JSON.stringify(templateWorksheet.pageSetup));
          }
          
          // Merged cells đã được copy tự động khi copy worksheet
          // Không cần merge lại để tránh lỗi "Cannot merge already merged cells"
          
          
          // Thay thế placeholder
          const replacements = {
            '{{so_uy_nhiem}}': soUyNhiem,
            '{{STT}}': row.SoThanhToan || '',
            '{{ho_ten}}': row.HoTen || '',
            '{{STK}}': row.STK || '',
            '{{Ngan_hang}}': row.NganHang || '',
            '{{Tien_chu}}': row.SoTien ? numberToWords(row.SoTien) : '',
            '{{tien_so}}': row.SoTien ? formatCurrency(row.SoTien) : ''
          };
          
          // Thay thế placeholder trong sheet
          newWorksheet.eachRow({ includeEmpty: true }, (worksheetRow, rowNumber) => {
            worksheetRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              if (cell.value && typeof cell.value === 'string') {
                let cellValue = cell.value;
                let hasReplacement = false;
                
                for (let placeholder in replacements) {
                  if (cellValue.includes(placeholder)) {
                    cellValue = cellValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacements[placeholder]);
                    hasReplacement = true;
                  }
                }
                
                if (hasReplacement) {
                  cell.value = cellValue;
                }
              }
            });
          });
          
        }
        
        // Ghi file Excel
        await outputWorkbook.xlsx.writeFile(outputPath);
        
        // Kiểm tra file đã được tạo thành công
        const outputStats = fs.statSync(outputPath);
        
        if (outputStats.size === 0) {
          throw new Error('File được tạo nhưng có kích thước 0');
        }
        
        // Trả về file Excel
        res.download(outputPath, fileName, (err) => {
          if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({
              success: false,
              message: 'Lỗi khi tải file'
            });
          } else {
            // Xóa file tạm sau khi download
            setTimeout(() => {
              if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
              }
            }, 5000);
          }
        });
        
      } catch (error) {
        console.error('Error creating Excel file:', error);
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi tạo file Excel: ' + error.message
        });
      }

    } catch (error) {
      console.error('Error in downloadUyNhiemChi:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // Preview tạo số ủy nhiệm chi
  previewUyNhiemChi: async (req, res) => {
    let connection;
    try {
      const { dot, ki, namHoc, khoa, heDaoTao } = req.body;
      
      // Validate input
      if (!dot || !ki || !namHoc) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đợt, kỳ hoặc năm học'
        });
      }

      // Kết nối database
      connection = await createPoolConnection();

      // Query lấy dữ liệu từ hopdonggvmoi với join phongban để lấy tên khoa
      let query = `
        SELECT 
          hd.MaHopDong,
          hd.SoHopDong,
          hd.HoTen,
          hd.STK,
          hd.NganHang,
          hd.SoTien,
          hd.MaPhongBan,
          hd.he_dao_tao,
          hd.CCCD,
          hd.Dot,
          hd.KiHoc,
          hd.NamHoc,
          hd.SoUyNhiem,
          hd.SoThanhToan,
          hd.KhoaDuyet,
          hd.DaoTaoDuyet,
          hd.TaiChinhDuyet,
          pb.TenPhongBan
        FROM hopdonggvmoi hd
        LEFT JOIN phongban pb ON hd.MaPhongBan = pb.MaPhongBan
        WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
          AND hd.KhoaDuyet = 1 AND hd.DaoTaoDuyet = 1 AND hd.TaiChinhDuyet = 1
      `;
      
      const params = [dot, ki, namHoc];

      // Thêm lọc hệ đào tạo nếu có
      if (heDaoTao && heDaoTao.trim() !== "") {
        query += ` AND hd.he_dao_tao = ?`;
        params.push(heDaoTao);
      }

      // Lọc khoa nếu cần
      if (khoa && khoa !== "" && khoa !== "ALL") {
        query += ` AND hd.MaPhongBan = ?`;
        params.push(khoa);
      }

      // Group theo CCCD để tránh duplicate và tổng hợp số tiền
      query += ` 
        GROUP BY hd.CCCD, hd.HoTen, hd.STK, hd.NganHang, hd.MaPhongBan, hd.he_dao_tao, pb.TenPhongBan, hd.MaHopDong, hd.SoHopDong, hd.SoUyNhiem, hd.SoThanhToan, hd.KhoaDuyet, hd.DaoTaoDuyet, hd.TaiChinhDuyet
        ORDER BY hd.he_dao_tao, hd.SoUyNhiem
      `;

      const [rows] = await connection.execute(query, params);

      // Trả về dữ liệu cần thiết cho bảng hiển thị
      const formattedData = rows.map((row, index) => ({
        HoTen: row.HoTen,
        TenPhongBan: row.TenPhongBan,
        MaPhongBan: row.MaPhongBan,
        he_dao_tao: row.he_dao_tao,
        SoUyNhiem: row.SoUyNhiem,
        STK: row.STK,
        NganHang: row.NganHang
      }));

      res.json({
        success: true,
        data: formattedData,
        message: `Tìm thấy ${formattedData.length} bản ghi phù hợp`
      });
    } catch (error) {
      console.error('Error in previewUyNhiemChi:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tải dữ liệu'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // Setup tạo số ủy nhiệm chi
  setupUyNhiemChi: async (req, res) => {
    let connection;
    try {
      console.log('setupUyNhiemChi request body:', req.body);
      const { dot, ki, namHoc, khoa, heDaoTao, startingNumber } = req.body;
      
      // Validate input
      if (!dot || !ki || !namHoc || !startingNumber) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin đợt, kỳ, năm học hoặc số bắt đầu'
        });
      }

      // Kết nối database
      connection = await createPoolConnection();
      await connection.beginTransaction();

      // Query lấy dữ liệu từ hopdonggvmoi
      let query = `
        SELECT DISTINCT
          hd.MaHopDong,
          hd.HoTen,
          hd.CCCD,
          hd.he_dao_tao
        FROM hopdonggvmoi hd
        WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
          AND hd.KhoaDuyet = 1 AND hd.DaoTaoDuyet = 1 AND hd.TaiChinhDuyet = 1
      `;
      
      const params = [dot, ki, namHoc];

      // Thêm lọc hệ đào tạo nếu có
      if (heDaoTao && heDaoTao.trim() !== "") {
        query += ` AND hd.he_dao_tao = ?`;
        params.push(heDaoTao);
      }

      // Lọc khoa nếu cần
      if (khoa && khoa !== "" && khoa !== "ALL") {
        query += ` AND hd.MaPhongBan = ?`;
        params.push(khoa);
      }

      // Order theo tên
      query += ` ORDER BY hd.HoTen`;

      const [rows] = await connection.execute(query, params);

      // Group rows theo he_dao_tao
      const groupedByHeDaoTao = {};
      rows.forEach(row => {
        const heDaoTao = row.he_dao_tao || 'Unknown';
        if (!groupedByHeDaoTao[heDaoTao]) {
          groupedByHeDaoTao[heDaoTao] = [];
        }
        groupedByHeDaoTao[heDaoTao].push(row);
      });

      // Lấy danh sách hệ đào tạo và sort
      const heDaoTaoList = Object.keys(groupedByHeDaoTao).sort();

      let updatedCount = 0;
      let currentStartingNumber = parseInt(startingNumber);

      // Gán số ủy nhiệm cho từng hệ
      for (const heDaoTao of heDaoTaoList) {
        const groupRows = groupedByHeDaoTao[heDaoTao];
        
        for (let i = 0; i < groupRows.length; i++) {
          const newSoUyNhiem = currentStartingNumber + i;
          const newSoThanhToan = currentStartingNumber + i;

          // Cập nhật SoUyNhiem và SoThanhToan cho tất cả bản ghi của người này
          let updateQuery = `
            UPDATE hopdonggvmoi 
            SET SoUyNhiem = ?, SoThanhToan = ?
            WHERE CCCD = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
              AND KhoaDuyet = 1 AND DaoTaoDuyet = 1 AND TaiChinhDuyet = 1
          `;

          // Thêm điều kiện lọc cho update
          let updateParams = [newSoUyNhiem, newSoThanhToan, groupRows[i].CCCD, dot, ki, namHoc];
          
          if (heDaoTao && heDaoTao.trim() !== "" && heDaoTao !== 'Unknown') {
            updateQuery += ` AND he_dao_tao = ?`;
            updateParams.push(heDaoTao);
          }

          if (khoa && khoa !== "" && khoa !== "ALL") {
            updateQuery += ` AND MaPhongBan = ?`;
            updateParams.push(khoa);
          }

          await connection.execute(updateQuery, updateParams);
          updatedCount++;
        }

        // Tăng số bắt đầu cho hệ tiếp theo
        currentStartingNumber += groupRows.length;
      }

      // Ghi log
      const logContent = `Admin [${req.session.username || 'Unknown'}] đã tạo số ủy nhiệm chi cho ${updatedCount} giảng viên. Đợt: ${dot}, Kỳ: ${ki}, Năm học: ${namHoc}`;
      const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, NOW())`;
      await connection.execute(logQuery, [req.session.userId || '', req.session.TenNhanVien || '', 'Admin Log', logContent]);

      await connection.commit();

      res.json({
        success: true,
        message: `Đã tạo số ủy nhiệm chi thành công cho ${updatedCount} giảng viên`,
        count: updatedCount
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in setupUyNhiemChi:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo số ủy nhiệm chi'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // Trang UNC ĐATN (hệ thống)
  getUNCDoAnPage: (req, res) => {
    try {
      res.render('uncDatn', {
        title: 'UNC ĐATN',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering UNC ĐATN page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // UNC ngoài - Thêm người thụ hưởng - Import file
  getUNCNgoaiImportFilePage: (req, res) => {
    try {
      res.render('uncNgoaiImportFile', {
        title: 'UNC ngoài - Import file',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering UNC ngoài Import file page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // UNC ngoài - Thêm người thụ hưởng - Giao diện
  getUNCNgoaiGiaoDienPage: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();

      // Lấy STT tiếp theo để hiển thị trên form
      // Dùng MAX(stt) để lấy số thứ tự cao nhất trong bảng
      const [rows] = await connection.execute(`
        SELECT IFNULL(MAX(stt), 0) + 1 AS nextStt
        FROM uncngoai
      `);

      const nextStt = rows && rows.length > 0 && rows[0].nextStt ? rows[0].nextStt : 1;

      res.render('uncNgoaiGiaoDien', {
        title: 'UNC ngoài - Giao diện',
        user: req.user || {},
        nextStt
      });
    } catch (error) {
      console.error('Error rendering UNC ngoài Giao diện page:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // UNC ngoài - Xem dữ liệu
  getUNCNgoaiXemDuLieuPage: (req, res) => {
    try {
      res.render('uncNgoaiXemDuLieu', {
        title: 'UNC ngoài - Xem dữ liệu',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering UNC ngoài Xem dữ liệu page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // API lấy thông tin từ bảng uncngoai theo STT hoặc ĐVNT
  getUNCNgoaiInfo: async (req, res) => {
    let connection;
    try {
      const stt = req.query.stt ? parseInt(req.query.stt) : null;
      const dvnt = req.query.dvnt ? req.query.dvnt.trim() : null;

      if (!stt && !dvnt) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập STT hoặc Đơn vị nhận tiền'
        });
      }

      connection = await createPoolConnection();
      let query, params;

      if (stt && stt > 0) {
        query = `SELECT stt, dvnt, stk, nganhang FROM uncngoai WHERE stt = ?`;
        params = [stt];
      } else if (dvnt) {
        query = `SELECT stt, dvnt, stk, nganhang FROM uncngoai WHERE TRIM(dvnt) = ? LIMIT 1`;
        params = [dvnt];
      } else {
        return res.status(400).json({
          success: false,
          message: 'STT hoặc Đơn vị nhận tiền không hợp lệ'
        });
      }

      const [rows] = await connection.execute(query, params);

      if (rows.length === 0) {
        return res.json({
          success: false,
          message: stt ? 'Không tìm thấy thông tin với STT này' : 'Không tìm thấy thông tin với Đơn vị nhận tiền này'
        });
      }

      return res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      console.error('Error in getUNCNgoaiInfo:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin UNC ngoài'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API lấy số tiền mới nhất từ uncngoaidetail
  getLatestSotien: async (req, res) => {
    let connection;
    try {
      const stt = parseInt(req.query.stt);
      const hedaotao = req.query.hedaotao;

      if (!stt || stt <= 0 || !hedaotao) {
        return res.status(400).json({
          success: false,
          message: 'STT hoặc Hệ đào tạo không hợp lệ'
        });
      }

      connection = await createPoolConnection();
      const [rows] = await connection.execute(
        `SELECT sotien FROM uncngoaidetail 
         WHERE stt = ? AND hedaotao = ? 
         ORDER BY ngaynhap DESC, sounc DESC 
         LIMIT 1`,
        [stt, hedaotao]
      );

      if (rows.length === 0) {
        return res.json({
          success: false,
          message: 'Không tìm thấy số tiền'
        });
      }

      return res.json({
        success: true,
        data: { sotien: rows[0].sotien }
      });
    } catch (error) {
      console.error('Error in getLatestSotien:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy số tiền'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API chuyển số tiền sang chữ
  convertToWords: (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.json({
          success: true,
          words: ''
        });
      }

      const words = numberToWords(parseInt(amount));
      return res.json({
        success: true,
        words
      });
    } catch (error) {
      console.error('Error in convertToWords:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi chuyển đổi số tiền'
      });
    }
  },

  // API lưu vào bảng uncngoaidetail
  saveUNCNgoaiDetail: async (req, res) => {
    let connection;
    try {
      const {
        hedaotao,
        stt,
        dvnt,
        stk,
        nganhang,
        sotien,
        noidung,
        manguonns,
        niendons,
        diachi,
        nguoinhantien,
        cccd,
        ngaycap,
        noicap
      } = req.body;

      // Validate các trường bắt buộc
      if (!hedaotao || !stt || !dvnt || !stk || !nganhang || !sotien || !noidung) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
        });
      }

      connection = await createPoolConnection();
      await connection.beginTransaction();

      // Lấy niên độ từ niendons hoặc lấy năm hiện tại
      let nienDo = niendons;
      if (!nienDo) {
        nienDo = new Date().getFullYear().toString();
      }

      // Lấy số UNC tiếp theo theo niên độ và hệ đào tạo
      // sounc được lưu dạng số nhưng hiển thị dạng 001, 002, ...
      const [souncRows] = await connection.execute(`
        SELECT IFNULL(MAX(sounc), 0) AS maxSounc
        FROM uncngoaidetail
        WHERE niendons = ? AND hedaotao = ?
      `, [nienDo, hedaotao]);

      const nextSounc = (souncRows[0].maxSounc || 0) + 1;

      // Format ngày nhập theo YYYY-MM-DD cho MySQL DATE
      const now = new Date();
      const ngaynhap = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Format ngày cấp nếu có (từ YYYY-MM-DD sang DATE)
      let ngaycapFormatted = null;
      if (ngaycap) {
        // Nếu ngày cấp đã là format YYYY-MM-DD thì giữ nguyên, nếu không thì parse
        ngaycapFormatted = ngaycap;
      }

      // Insert vào bảng uncngoaidetail
      const [result] = await connection.execute(
        `INSERT INTO uncngoaidetail (
          stt, hedaotao, dvnt, stk, nganhang, sotien, noidung,
          manguonns, niendons, diachi, nguoinhantien, cccd, ngaycap, noicap, ngaynhap, sounc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(stt),
          hedaotao,
          dvnt,
          stk,
          nganhang,
          parseInt(sotien),
          noidung,
          manguonns || null,
          nienDo,
          diachi || null,
          nguoinhantien || null,
          cccd || null,
          ngaycapFormatted,
          noicap || null,
          ngaynhap,
          nextSounc
        ]
      );

      await connection.commit();

      return res.json({
        success: true,
        message: 'Đã lưu dữ liệu UNC ngoài chi tiết thành công',
        data: {
          sounc: nextSounc,
          ngaynhap
        }
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in saveUNCNgoaiDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lưu dữ liệu UNC ngoài chi tiết'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API lấy danh sách uncngoaidetail để hiển thị trong modal xuất Excel
  getUNCNgoaiDetailList: async (req, res) => {
    let connection;
    try {
      const { hedaotao, niendons } = req.query;

      if (!hedaotao) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin hệ đào tạo'
        });
      }

      connection = await createPoolConnection();
      let query = `SELECT sounc, stt, dvnt, noidung, niendons, ngaynhap FROM uncngoaidetail WHERE hedaotao = ?`;
      const params = [hedaotao];

      if (niendons && niendons.trim() !== '') {
        query += ` AND niendons = ?`;
        params.push(niendons.trim());
      }

      query += ` ORDER BY niendons DESC, sounc ASC`;

      const [rows] = await connection.execute(query, params);

      return res.json({
        success: true,
        data: rows || []
      });
    } catch (error) {
      console.error('Error in getUNCNgoaiDetailList:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách UNC ngoài chi tiết'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API lấy danh sách đầy đủ uncngoaidetail để hiển thị và sửa/xóa
  getUNCNgoaiDetailListFull: async (req, res) => {
    let connection;
    try {
      const { hedaotao } = req.query;

      if (!hedaotao) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin hệ đào tạo'
        });
      }

      connection = await createPoolConnection();
      const query = `SELECT 
        sounc, stt, dvnt, stk, nganhang, sotien, noidung,
        manguonns, niendons, diachi, nguoinhantien, cccd, ngaycap, noicap, ngaynhap
        FROM uncngoaidetail 
        WHERE hedaotao = ? 
        ORDER BY ngaynhap DESC, sounc DESC`;

      const [rows] = await connection.execute(query, [hedaotao]);

      return res.json({
        success: true,
        data: rows || []
      });
    } catch (error) {
      console.error('Error in getUNCNgoaiDetailListFull:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách UNC ngoài chi tiết'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API cập nhật một bản ghi uncngoaidetail
  updateUNCNgoaiDetail: async (req, res) => {
    let connection;
    try {
      const {
        sounc,
        stt,
        hedaotao,
        dvnt,
        stk,
        nganhang,
        sotien,
        noidung,
        manguonns,
        niendons,
        diachi,
        nguoinhantien,
        cccd,
        ngaycap,
        noicap
      } = req.body;

      // Validate các trường bắt buộc
      if (!sounc || !stt || !hedaotao || !dvnt || !stk || !nganhang || !sotien || !noidung) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
        });
      }

      connection = await createPoolConnection();
      await connection.beginTransaction();

      // Format ngày cấp nếu có
      let ngaycapFormatted = null;
      if (ngaycap) {
        ngaycapFormatted = ngaycap;
      }

      // Update bản ghi
      const [result] = await connection.execute(
        `UPDATE uncngoaidetail SET 
          dvnt = ?, stk = ?, nganhang = ?, sotien = ?, noidung = ?,
          manguonns = ?, niendons = ?, diachi = ?, nguoinhantien = ?, 
          cccd = ?, ngaycap = ?, noicap = ?
         WHERE sounc = ? AND stt = ? AND hedaotao = ?`,
        [
          dvnt,
          stk,
          nganhang,
          parseInt(sotien),
          noidung,
          manguonns || null,
          niendons || null,
          diachi || null,
          nguoinhantien || null,
          cccd || null,
          ngaycapFormatted,
          noicap || null,
          parseInt(sounc),
          parseInt(stt),
          hedaotao
        ]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi để cập nhật'
        });
      }

      await connection.commit();

      return res.json({
        success: true,
        message: 'Đã cập nhật bản ghi thành công'
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in updateUNCNgoaiDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật bản ghi: ' + error.message
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API xóa các bản ghi được chọn
  deleteSelectedUNCNgoaiDetail: async (req, res) => {
    let connection;
    try {
      const { ids, hedaotao } = req.body;

      console.log('Delete request:', { ids, hedaotao });

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có bản ghi nào được chọn để xóa'
        });
      }

      connection = await createPoolConnection();
      await connection.beginTransaction();

      let deletedCount = 0;
      for (const idObj of ids) {
        const { sounc, stt, niendons } = idObj;
        
        if (!sounc || !stt) {
          console.log('Skipping invalid record:', idObj);
          continue;
        }

        let query, params;
        // Xử lý cả trường hợp niendons = null hoặc undefined
        if (niendons !== null && niendons !== undefined && niendons !== '') {
          query = `DELETE FROM uncngoaidetail WHERE sounc = ? AND stt = ? AND (niendons = ? OR (niendons IS NULL AND ? IS NULL))`;
          params = [sounc, stt, niendons, niendons];
        } else {
          query = `DELETE FROM uncngoaidetail WHERE sounc = ? AND stt = ?`;
          params = [sounc, stt];
        }
        
        console.log('Executing delete:', { query, params });
        const [result] = await connection.execute(query, params);
        deletedCount += result.affectedRows;
      }

      await connection.commit();

      return res.json({
        success: true,
        message: `Đã xóa thành công ${deletedCount} bản ghi`,
        count: deletedCount
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in deleteSelectedUNCNgoaiDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa các bản ghi: ' + error.message
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API xuất Excel từ template với dữ liệu từ uncngoaidetail - viết lại theo cách UNC mời giảng
  exportSelectedUNCNgoaiDetailExcel: async (req, res) => {
    let connection;
    try {
      const { hedaotao, ids, taiKhoanThanhToan } = req.body;

      if (!hedaotao || !ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin hệ đào tạo hoặc danh sách bản ghi'
        });
      }

      connection = await createPoolConnection();

      // Lấy dữ liệu từ uncngoaidetail theo danh sách ids
      const placeholders = ids.map(() => '(sounc = ? AND stt = ? AND (niendons = ? OR (niendons IS NULL AND ? IS NULL)))').join(' OR ');
      const params = [];
      ids.forEach(id => {
        params.push(id.sounc, id.stt, id.niendons || null, id.niendons || null);
      });

      const [rows] = await connection.execute(
        `SELECT * FROM uncngoaidetail WHERE hedaotao = ? AND (${placeholders}) ORDER BY niendons, sounc`,
        [hedaotao, ...params]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không có dữ liệu để xuất'
        });
      }

      // Chọn template file dựa trên hedaotao
      let templateFileName;
      if (hedaotao === 'Đóng học phí') {
        templateFileName = 'Mẫu ủy nhiệm chi.xlsx';
      } else if (hedaotao === 'Mật mã') {
        templateFileName = 'Mẫu Ủy Nhiệm Chi Mật Mã.xlsx';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Hệ đào tạo không hợp lệ'
        });
      }

      const templatePath = path.join(TEMPLATES_DIR, templateFileName);

      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({
          success: false,
          message: `File mẫu "${templateFileName}" không tồn tại`
        });
      }

      // Kiểm tra file mẫu có đọc được không (giống UNC mời giảng)
      try {
        const templateStats = fs.statSync(templatePath);
        if (templateStats.size === 0) {
          throw new Error('File mẫu rỗng');
        }
        
        const testWorkbook = new ExcelJS.Workbook();
        await testWorkbook.xlsx.readFile(templatePath);
        if (!testWorkbook.worksheets || testWorkbook.worksheets.length === 0) {
          throw new Error('File mẫu không hợp lệ hoặc không có sheet nào');
        }
        
        console.log('Template file is valid. Sheets:', testWorkbook.worksheets.length);
        
      } catch (templateError) {
        console.error('Template file error:', templateError);
        return res.status(500).json({
          success: false,
          message: 'File mẫu bị lỗi: ' + templateError.message + '. Vui lòng upload file mẫu mới.'
        });
      }

      // Sử dụng ExcelJS để giữ nguyên format và hình ảnh (giống UNC mời giảng)
      const templateWorkbook = new ExcelJS.Workbook();
      await templateWorkbook.xlsx.readFile(templatePath);
      
      if (templateWorkbook.worksheets.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'File mẫu không có sheet nào'
        });
      }
      
      const templateWorksheet = templateWorkbook.worksheets[0];
      
      // Tạo workbook mới cho output
      const outputWorkbook = new ExcelJS.Workbook();

      // Tạo sheet cho từng bản ghi
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const sounc = String(row.sounc).padStart(3, '0');
        const sheetName = sounc; // Tên sheet là sounc
        
        // Clone worksheet từ template để giữ nguyên toàn bộ định dạng
        const newWorksheet = outputWorkbook.addWorksheet(sheetName);
        
        // Copy toàn bộ cấu trúc từ template worksheet
        templateWorksheet.eachRow({ includeEmpty: true }, (templateRow, rowNumber) => {
          const newRow = newWorksheet.getRow(rowNumber);
          if (templateRow.height) newRow.height = templateRow.height;
          
          templateRow.eachCell({ includeEmpty: true }, (templateCell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            
            // Copy value
            if (templateCell.value !== null && templateCell.value !== undefined) {
              newCell.value = templateCell.value;
            }
            
            // Copy style hoàn chỉnh
            if (templateCell.style) {
              newCell.style = JSON.parse(JSON.stringify(templateCell.style));
            }
          });
        });
        
        // Copy column properties
        templateWorksheet.columns.forEach((col, colIndex) => {
          const newCol = newWorksheet.getColumn(colIndex + 1);
          if (col.width !== undefined) newCol.width = col.width;
          if (col.hidden !== undefined) newCol.hidden = col.hidden;
        });
        
        // Copy drawings/images
        if (templateWorksheet.drawings) {
          templateWorksheet.drawings.forEach(drawing => {
            try {
              newWorksheet.addImage(drawing.image, {
                tl: drawing.range.tl,
                br: drawing.range.br || drawing.range.tl
              });
            } catch (e) {
              console.error('Error copying drawing:', e);
            }
          });
        }
        
        // Copy merged cells
        if (templateWorksheet.model && templateWorksheet.model.merges) {
          templateWorksheet.model.merges.forEach(merge => {
            try {
              newWorksheet.mergeCells(merge);
            } catch (e) {
              // Ignore merge errors
            }
          });
        }
        
        // Copy page setup
        if (templateWorksheet.pageSetup) {
          newWorksheet.pageSetup = JSON.parse(JSON.stringify(templateWorksheet.pageSetup));
        }
        
        // Thay thế placeholder với dữ liệu từ uncngoaidetail
        // Debug: log giá trị để kiểm tra
        console.log(`Processing row ${index + 1}: sotien=${row.sotien}, diachi=${row.diachi}`);
        
        const replacements = {
          '{{so_uy_nhiem}}': sounc,
          '{{STT}}': row.stt || '',
          '{{ho_ten}}': row.dvnt || '',
          '{{don_vi_nhan}}': row.dvnt || '',
          '{{STK}}': row.stk || '',
          '{{tai_khoan}}': row.stk || '',
          '{{tai_khoan_thanh_toan}}': taiKhoanThanhToan || '',
          '{{Ngan_hang}}': row.nganhang || '',
          '{{kho_bac}}': row.nganhang || '',
          '{{Tien_chu}}': (row.sotien && row.sotien > 0) ? numberToWords(parseInt(row.sotien)) : '',
          '{{tien_chu}}': (row.sotien && row.sotien > 0) ? numberToWords(parseInt(row.sotien)) : '',
          '{{tien_so}}': (row.sotien && row.sotien > 0) ? formatCurrency(parseInt(row.sotien)) : '',
          '{{so_tien}}': (row.sotien && row.sotien > 0) ? formatCurrency(parseInt(row.sotien)) : '',
          '{{noidung}}': row.noidung || '',
          '{{noi_dung}}': row.noidung || '',
          '{{noi_dung_thanh_toan}}': row.noidung || '',
          '{{manguonns}}': row.manguonns || '',
          '{{nguon_ns}}': row.manguonns || '',
          '{{niendons}}': row.niendons || '',
          '{{nien_do}}': row.niendons || '',
          '{{diachi}}': row.diachi || '',
          '{{dia_chi}}': row.diachi || '',
          '{{nguoinhantien}}': row.nguoinhantien || '',
          '{{nguoi_nhan_tien}}': row.nguoinhantien || '',
          '{{cccd}}': row.cccd || '',
          '{{CCCD}}': row.cccd || '',
          '{{ngaycap}}': row.ngaycap ? new Date(row.ngaycap).toLocaleDateString('vi-VN') : '',
          '{{ngay_cap}}': row.ngaycap ? new Date(row.ngaycap).toLocaleDateString('vi-VN') : '',
          '{{noicap}}': row.noicap || '',
          '{{noi_cap}}': row.noicap || '',
          '{{ngaynhap}}': row.ngaynhap ? new Date(row.ngaynhap).toLocaleDateString('vi-VN') : '',
          '{{ngay_nhap}}': row.ngaynhap ? new Date(row.ngaynhap).toLocaleDateString('vi-VN') : ''
        };
        
        // Thay thế placeholder trong sheet
        newWorksheet.eachRow({ includeEmpty: true }, (worksheetRow, rowNumber) => {
          worksheetRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (cell.value && typeof cell.value === 'string') {
              let cellValue = cell.value;
              let hasReplacement = false;
              
              for (let placeholder in replacements) {
                if (cellValue.includes(placeholder)) {
                  const replacementValue = replacements[placeholder];
                  console.log(`Replacing ${placeholder} with: ${replacementValue}`);
                  
                  // Nếu là placeholder số tiền, giữ nguyên định dạng số (không in đậm)
                  if (placeholder === '{{so_tien}}' || placeholder === '{{tien_so}}') {
                    // Thay thế placeholder nhưng giữ nguyên style của cell
                    cellValue = cellValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacementValue);
                    hasReplacement = true;
                    // Xóa định dạng in đậm nếu có
                    if (cell.font && cell.font.bold) {
                      cell.font = { ...cell.font, bold: false };
                    }
                  } else {
                    cellValue = cellValue.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacementValue);
                    hasReplacement = true;
                  }
                }
              }
              
              if (hasReplacement) {
                cell.value = cellValue;
              }
            }
          });
        });
      }

      // Ghi file Excel vào thư mục generated (giống UNC mời giảng)
      const currentDate = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
      const safeHedaoTao = hedaotao
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
        .replace(/[^\w\s.-]/g, '') // Loại bỏ ký tự đặc biệt
        .replace(/\s+/g, '_'); // Thay khoảng trắng bằng dấu gạch dưới
      
      const fileName = `UNC_ngoai_${safeHedaoTao}_${new Date().getTime()}.xlsx`;
      const outputPath = path.join(GENERATED_DIR, fileName);

      // Đảm bảo thư mục generated tồn tại
      if (!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR, { recursive: true });
      }

      // Ghi file Excel
      await outputWorkbook.xlsx.writeFile(outputPath);
      
      // Kiểm tra file đã được tạo thành công
      const outputStats = fs.statSync(outputPath);
      
      if (outputStats.size === 0) {
        throw new Error('File được tạo nhưng có kích thước 0');
      }

      // Trả về file Excel
      res.download(outputPath, fileName, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          // Chỉ gửi JSON response nếu chưa gửi headers
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Lỗi khi tải file'
            });
          }
        } else {
          console.log('File downloaded successfully:', fileName);
          // Xóa file tạm sau khi download
          setTimeout(() => {
            try {
              if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
                console.log('Temporary file deleted:', outputPath);
              }
            } catch (deleteError) {
              console.error('Error deleting temporary file:', deleteError);
            }
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Error in exportSelectedUNCNgoaiDetailExcel:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi server khi xuất file Excel: ' + error.message
        });
      }
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API tạo bản ghi UNC ngoài (thêm người thụ hưởng thủ công)
  createUNCNgoaiRecord: async (req, res) => {
    let connection;
    try {
      // Đặt tên biến và cột không dấu để đồng bộ với frontend và database
      let { dvnt, stk, nganhang } = req.body || {};

      if (!dvnt || !stk || !nganhang) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ Đơn vị nhận tiền, Số tài khoản và Ngân hàng'
        });
      }

      // Trim 2 đầu của các trường
      dvnt = String(dvnt).trim();
      stk = String(stk).trim();
      nganhang = String(nganhang).trim();

      // Validate lại sau khi trim
      if (!dvnt || !stk || !nganhang) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ Đơn vị nhận tiền, Số tài khoản và Ngân hàng'
        });
      }

      connection = await createPoolConnection();

      // Kiểm tra xem số tài khoản đã tồn tại chưa (sau khi trim)
      const [existingStk] = await connection.execute(
        `SELECT stt, dvnt, stk, nganhang 
         FROM uncngoai 
         WHERE TRIM(stk) = ?`,
        [stk]
      );

      if (existingStk.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Số tài khoản đã tồn tại với id ${existingStk[0].stt}`
        });
      }

      // Kiểm tra xem người thụ hưởng đã tồn tại chưa (cả 3 cột đều trùng)
      const [existing] = await connection.execute(
        `SELECT stt, dvnt, stk, nganhang 
         FROM uncngoai 
         WHERE TRIM(dvnt) = ? AND TRIM(stk) = ? AND TRIM(nganhang) = ?`,
        [dvnt, stk, nganhang]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Người thụ hưởng đã tồn tại với id ${existing[0].stt}`
        });
      }

      // Lấy STT tiếp theo từ bảng
      const [sttRows] = await connection.execute(`
        SELECT IFNULL(MAX(stt), 0) + 1 AS nextStt
        FROM uncngoai
      `);
      const newStt = sttRows && sttRows.length > 0 && sttRows[0].nextStt ? sttRows[0].nextStt : 1;

      // Insert kèm STT vào bảng
      const [result] = await connection.execute(
        `INSERT INTO uncngoai (stt, dvnt, stk, nganhang) VALUES (?, ?, ?, ?)`,
        [newStt, dvnt, stk, nganhang]
      );

      return res.json({
        success: true,
        message: 'Đã lưu dòng UNC ngoài thành công',
        data: {
          stt: newStt,
          dvnt,
          stk,
          nganhang
        }
      });
    } catch (error) {
      console.error('Error in createUNCNgoaiRecord:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lưu dữ liệu UNC ngoài'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API lấy danh sách UNC ngoài
  getUNCNgoaiList: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const [rows] = await connection.execute(
        `SELECT stt, dvnt, stk, nganhang FROM uncngoai ORDER BY stt`
      );

      return res.json({
        success: true,
        data: rows || []
      });
    } catch (error) {
      console.error('Error in getUNCNgoaiList:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi tải danh sách UNC ngoài'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API cập nhật một bản ghi UNC ngoài
  updateUNCNgoaiRecord: async (req, res) => {
    let connection;
    try {
      const { stt, dvnt, stk, nganhang } = req.body || {};

      if (!stt || !dvnt || !stk || !nganhang) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu STT hoặc thông tin Đơn vị nhận tiền, Số tài khoản, Ngân hàng'
        });
      }

      connection = await createPoolConnection();
      const [result] = await connection.execute(
        `UPDATE uncngoai SET dvnt = ?, stk = ?, nganhang = ? WHERE stt = ?`,
        [dvnt, stk, nganhang, stt]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi để cập nhật'
        });
      }

      return res.json({
        success: true,
        message: 'Đã cập nhật dòng UNC ngoài thành công'
      });
    } catch (error) {
      console.error('Error in updateUNCNgoaiRecord:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật dữ liệu UNC ngoài'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API xóa một bản ghi UNC ngoài
  deleteUNCNgoaiRecord: async (req, res) => {
    let connection;
    try {
      const { stt } = req.body || {};

      if (!stt) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu STT cần xóa'
        });
      }

      connection = await createPoolConnection();
      const [result] = await connection.execute(
        `DELETE FROM uncngoai WHERE stt = ?`,
        [stt]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi để xóa'
        });
      }

      return res.json({
        success: true,
        message: 'Đã xóa dòng UNC ngoài thành công'
      });
    } catch (error) {
      console.error('Error in deleteUNCNgoaiRecord:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa dữ liệu UNC ngoài'
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API import file Excel cho UNC ngoài
  importUNCNgoaiExcel: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file Excel'
        });
      }

      // Đọc file Excel từ buffer
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Chuyển sheet thành mảng 2D
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'File Excel không có dữ liệu'
        });
      }

      // Tìm dòng tiêu đề
      let headerRowIndex = -1;
      let sttColIndex = -1;
      let tenKhachHangColIndex = -1;
      let soTaiKhoanColIndex = -1;
      let tenNganHangColIndex = -1;

      // Tìm dòng có chứa các tiêu đề cần thiết
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].map(cell => String(cell || '').trim());
        
        // Tìm các cột tiêu đề
        const sttIdx = row.findIndex(cell => 
          cell.toLowerCase().includes('stt') || 
          cell.toLowerCase() === 'số thứ tự'
        );
        const tenKhIdx = row.findIndex(cell => 
          cell.toLowerCase().includes('tên khách hàng') ||
          cell.toLowerCase().includes('ten khach hang') ||
          cell.toLowerCase().includes('đơn vị nhận tiền') ||
          cell.toLowerCase().includes('don vi nhan tien')
        );
        const stkIdx = row.findIndex(cell => 
          cell.toLowerCase().includes('số tài khoản') ||
          cell.toLowerCase().includes('so tai khoan') ||
          cell.toLowerCase().includes('stk')
        );
        const tenNhIdx = row.findIndex(cell => 
          cell.toLowerCase().includes('tên ngân hàng') ||
          cell.toLowerCase().includes('ten ngan hang') ||
          cell.toLowerCase().includes('ngân hàng') ||
          cell.toLowerCase().includes('ngan hang')
        );

        if (sttIdx !== -1 && tenKhIdx !== -1 && stkIdx !== -1 && tenNhIdx !== -1) {
          headerRowIndex = i;
          sttColIndex = sttIdx;
          tenKhachHangColIndex = tenKhIdx;
          soTaiKhoanColIndex = stkIdx;
          tenNganHangColIndex = tenNhIdx;
          break;
        }
      }

      if (headerRowIndex === -1) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy dòng tiêu đề chứa: STT, Tên khách hàng, Số tài khoản, Tên ngân hàng'
        });
      }

      // Đọc dữ liệu từ dòng sau tiêu đề
      const dataRows = rows.slice(headerRowIndex + 1);
      const importedData = [];

      dataRows.forEach((row, index) => {
        // Chuyển row thành mảng và lấy giá trị
        const rowArray = Array.isArray(row) ? row : [];
        
        const stt = rowArray[sttColIndex] ? String(rowArray[sttColIndex]).trim() : '';
        const tenKhachHang = rowArray[tenKhachHangColIndex] ? String(rowArray[tenKhachHangColIndex]).trim() : '';
        const soTaiKhoan = rowArray[soTaiKhoanColIndex] ? String(rowArray[soTaiKhoanColIndex]).trim() : '';
        const tenNganHang = rowArray[tenNganHangColIndex] ? String(rowArray[tenNganHangColIndex]).trim() : '';

        // Bỏ qua dòng trống
        if (!stt && !tenKhachHang && !soTaiKhoan && !tenNganHang) {
          return;
        }

        importedData.push({
          stt: stt ? parseInt(stt) || stt : '',
          tenkhachhang: tenKhachHang,
          sotaikhoan: soTaiKhoan,
          tennganhang: tenNganHang
        });
      });

      if (importedData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu hợp lệ trong file Excel'
        });
      }

      // Lấy STT lớn nhất hiện tại trong CSDL để tính STT sẽ được gán
      let connection;
      try {
        connection = await createPoolConnection();
        const [maxSttRows] = await connection.execute(`
          SELECT IFNULL(MAX(stt), 0) AS maxStt
          FROM uncngoai
        `);
        const maxStt = maxSttRows && maxSttRows.length > 0 && maxSttRows[0].maxStt ? maxSttRows[0].maxStt : 0;

        // Gán STT thật sẽ được lưu vào CSDL cho từng dòng
        importedData.forEach((row, index) => {
          row.stt = maxStt + index + 1;
        });
      } catch (dbError) {
        console.error('Error getting max STT:', dbError);
        // Nếu lỗi, vẫn trả về dữ liệu nhưng không có STT thật
      } finally {
        if (connection) {
          await connection.release();
        }
      }

      return res.json({
        success: true,
        message: `Đã import ${importedData.length} dòng dữ liệu`,
        data: importedData
      });
    } catch (error) {
      console.error('Error in importUNCNgoaiExcel:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi import file Excel: ' + error.message
      });
    }
  },

  // API lưu tất cả dữ liệu import vào CSDL
  saveAllImportedUNCNgoai: async (req, res) => {
    let connection;
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu để lưu'
        });
      }

      connection = await createPoolConnection();
      await connection.beginTransaction();

      // Lấy STT lớn nhất hiện tại trong CSDL
      const [maxSttRows] = await connection.execute(`
        SELECT IFNULL(MAX(stt), 0) AS maxStt
        FROM uncngoai
      `);
      let currentStt = maxSttRows && maxSttRows.length > 0 && maxSttRows[0].maxStt ? maxSttRows[0].maxStt : 0;

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of data) {
        try {
          const { tenkhachhang, sotaikhoan, tennganhang } = row;

          // Validate các trường bắt buộc (không validate STT vì sẽ tự động tăng)
          if (!tenkhachhang || !sotaikhoan || !tennganhang) {
            errorCount++;
            errors.push(`Dòng ${successCount + errorCount + 1}: Thiếu thông tin bắt buộc (Tên khách hàng, Số tài khoản, Tên ngân hàng)`);
            continue;
          }

          // Tự động tăng STT
          currentStt += 1;

          // Insert mới với STT tự động
          await connection.execute(
            `INSERT INTO uncngoai (stt, dvnt, stk, nganhang) VALUES (?, ?, ?, ?)`,
            [currentStt, tenkhachhang, sotaikhoan, tennganhang]
          );

          successCount++;
        } catch (rowError) {
          errorCount++;
          errors.push(`Dòng ${successCount + errorCount}: ${rowError.message}`);
        }
      }

      await connection.commit();

      return res.json({
        success: true,
        message: `Đã lưu ${successCount} dòng thành công${errorCount > 0 ? `, ${errorCount} dòng lỗi` : ''}`,
        successCount,
        errorCount,
        errors: errorCount > 0 ? errors : undefined
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in saveAllImportedUNCNgoai:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lưu dữ liệu: ' + error.message
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  },

  // API xuất file Excel cho UNC ngoài
  exportUNCNgoaiExcel: async (req, res) => {
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu để xuất'
        });
      }

      // Tạo workbook mới
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('UNC ngoài');

      // Định nghĩa cột
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 10 },
        { header: 'Tên khách hàng', key: 'tenkhachhang', width: 40 },
        { header: 'Số tài khoản', key: 'sotaikhoan', width: 20 },
        { header: 'Tên ngân hàng', key: 'tennganhang', width: 30 }
      ];

      // Style cho header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Thêm dữ liệu
      data.forEach(row => {
        worksheet.addRow({
          stt: row.stt || '',
          tenkhachhang: row.tenkhachhang || '',
          sotaikhoan: row.sotaikhoan || '',
          tennganhang: row.tennganhang || ''
        });
      });

      // Căn giữa cột STT
      worksheet.getColumn('stt').alignment = { horizontal: 'center' };

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=UNC_ngoai_${new Date().getTime()}.xlsx`);

      // Ghi file vào response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error in exportUNCNgoaiExcel:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi xuất file Excel: ' + error.message
      });
    }
  },

  // API xuất file Excel từ CSDL bảng uncngoai
  exportUNCNgoaiExcelFromDB: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();

      // Lấy tất cả dữ liệu từ bảng uncngoai
      const [rows] = await connection.execute(
        `SELECT stt, dvnt AS tenkhachhang, stk AS sotaikhoan, nganhang AS tennganhang 
         FROM uncngoai 
         ORDER BY stt`
      );

      if (!rows || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu trong CSDL để xuất'
        });
      }

      // Tạo workbook mới
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('UNC ngoài');

      // Định nghĩa cột
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 10 },
        { header: 'Tên khách hàng', key: 'tenkhachhang', width: 40 },
        { header: 'Số tài khoản', key: 'sotaikhoan', width: 20 },
        { header: 'Tên ngân hàng', key: 'tennganhang', width: 30 }
      ];

      // Style cho header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Thêm dữ liệu từ CSDL
      rows.forEach(row => {
        worksheet.addRow({
          stt: row.stt || '',
          tenkhachhang: row.tenkhachhang || '',
          sotaikhoan: row.sotaikhoan || '',
          tennganhang: row.tennganhang || ''
        });
      });

      // Căn giữa cột STT
      worksheet.getColumn('stt').alignment = { horizontal: 'center' };

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=UNC_ngoai_${new Date().getTime()}.xlsx`);

      // Ghi file vào response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error in exportUNCNgoaiExcelFromDB:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi xuất file Excel: ' + error.message
      });
    } finally {
      if (connection) {
        await connection.release();
      }
    }
  }
};

// Controller xử lý sửa mẫu ủy nhiệm
const suaMauUyNhiemController = {
  // Hiển thị trang sửa mẫu ủy nhiệm
  getSuaMauUyNhiemPage: (req, res) => {
    try {
      res.render('suaMauUyNhiem', {
        title: 'Sửa Mẫu Ủy Nhiệm',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering sua mau uy nhiem page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Tải file mẫu ủy nhiệm
  downloadMauUyNhiem: (req, res) => {
    const fileName = req.params.fileName || 'Mẫu ủy nhiệm chi.xlsx';
    const filePath = path.join(TEMPLATES_DIR, fileName);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).send('Tệp mẫu ủy nhiệm không tìm thấy');
      }

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Lỗi khi tải xuống mẫu ủy nhiệm:', err);
          res.status(500).send('Có lỗi xảy ra khi tải xuống');
        }
      });
    });
  },

  // Upload file mẫu ủy nhiệm mới
  uploadMauUyNhiem: (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Không có tệp nào được gửi!' 
        });
      }

      // Với cấu hình multer mới, file đã được lưu trực tiếp vào thư mục đích
      console.log('File uploaded successfully:', req.file.filename);
      
      res.json({ 
        success: true, 
        message: `File mẫu "${req.file.originalname}" đã được cập nhật thành công!` 
      });
      
    } catch (error) {
      console.error('Error in uploadMauUyNhiem:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Có lỗi xảy ra khi upload file!' 
      });
    }
  },

  // Trang Mẫu mật mã
  getMauMatMaPage: (req, res) => {
    try {
      res.render('mauMatMaUyNhiem', {
        title: 'Mẫu mật mã Ủy nhiệm chi',
        user: req.user || {}
      });
    } catch (error) {
      console.error('Error rendering Mẫu mật mã page:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // Tải file mẫu ủy nhiệm mật mã
  downloadMauMatMa: (req, res) => {
    const fileName = req.params.fileName || 'Mẫu Ủy Nhiệm Chi Mật Mã.xlsx';
    const filePath = path.join(TEMPLATES_DIR, fileName);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).send('Tệp mẫu ủy nhiệm mật mã không tìm thấy');
      }

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Lỗi khi tải xuống mẫu ủy nhiệm mật mã:', err);
          res.status(500).send('Có lỗi xảy ra khi tải xuống');
        }
      });
    });
  },

  // Upload file mẫu ủy nhiệm mật mã mới
  uploadMauMatMa: (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Không có tệp nào được gửi!' 
        });
      }

      console.log('Mẫu mật mã uploaded successfully:', req.file.filename);
      
      res.json({ 
        success: true, 
        message: `File mẫu mật mã "${req.file.originalname}" đã được cập nhật thành công!` 
      });
      
    } catch (error) {
      console.error('Error in uploadMauMatMa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Có lỗi xảy ra khi upload file mẫu mật mã!' 
      });
    }
  }
};

// API để load options cho combo box
const loadOptions = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Load dot options
    const [dotRows] = await connection.execute(`
      SELECT DISTINCT Dot 
      FROM hopdonggvmoi 
      WHERE Dot IS NOT NULL AND Dot != '' 
      ORDER BY Dot
    `);

    // Load ki options
    const [kiRows] = await connection.execute(`
      SELECT DISTINCT KiHoc 
      FROM hopdonggvmoi 
      WHERE KiHoc IS NOT NULL AND KiHoc != '' 
      ORDER BY KiHoc
    `);

    // Load nam hoc options
    const [namHocRows] = await connection.execute(`
      SELECT DISTINCT NamHoc 
      FROM hopdonggvmoi 
      WHERE NamHoc IS NOT NULL AND NamHoc != '' 
      ORDER BY NamHoc DESC
    `);

    // Load khoa options
    const [khoaRows] = await connection.execute(`
      SELECT DISTINCT pb.MaPhongBan, pb.TenPhongBan 
      FROM hopdonggvmoi hd
      LEFT JOIN phongban pb ON hd.MaPhongBan = pb.MaPhongBan
      WHERE hd.MaPhongBan IS NOT NULL AND hd.MaPhongBan != ''
      ORDER BY pb.TenPhongBan
    `);

    // Load he dao tao options
    const [heDaoTaoRows] = await connection.execute(`
      SELECT DISTINCT he_dao_tao 
      FROM hopdonggvmoi 
      WHERE he_dao_tao IS NOT NULL AND he_dao_tao != '' 
      ORDER BY he_dao_tao
    `);

    res.json({
      success: true,
      data: {
        dot: dotRows.map(row => row.Dot),
        ki: kiRows.map(row => row.KiHoc),
        namHoc: namHocRows.map(row => row.NamHoc),
        khoa: khoaRows.map(row => ({ ma: row.MaPhongBan, ten: row.TenPhongBan })),
        heDaoTao: heDaoTaoRows.map(row => row.he_dao_tao)
      }
    });

  } catch (error) {
    console.error('Error in loadOptions:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tải options!'
    });
  } finally {
    if (connection) await connection.end();
  }
};

module.exports = {
  taiUyNhiemChiController: {
    ...taiUyNhiemChiController,
    loadOptions
  },
  suaMauUyNhiemController
};
```

## File: src/queries/hopdongQueries.js
```javascript
const DON_GIA_EXPR = (tableAlias, khoaCol) => `
COALESCE(
  (
    SELECT cfg.SoTien
    FROM tienluong cfg
    WHERE 
      (cfg.he_dao_tao IS NULL OR cfg.he_dao_tao = ${tableAlias}.he_dao_tao)
      AND (cfg.HocVi IS NULL OR cfg.HocVi = gv.HocVi)
      -- ✅ CHỨC DANH
      AND (
        cfg.chuc_danh_id = 1
        OR cfg.chuc_danh_id = gv.chuc_danh
      )

      -- ✅ HSL
      AND (
        CAST(REPLACE(gv.HSL, ',', '.') AS DECIMAL(4,2)) >= cfg.HSL
      )
    ORDER BY 
      cfg.do_uu_tien DESC,
      cfg.SoTien DESC,
      cfg.HSL DESC
    LIMIT 1
  ),
  0
)
`;


const COL_DON_GIA = `COALESCE(bang_gia.don_gia, 0)`;

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
    Combined.DaoTaoDuyet,
    Combined.TaiChinhDuyet,

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
      DaoTaoDuyet,
      TaiChinhDuyet,
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
      DaoTaoDuyet,
      TaiChinhDuyet,
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
        qc.DaoTaoDuyet,
        qc.TaiChinhDuyet,
        ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,

        ${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan AS ThanhTien,
        ${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.1 AS Thue,
        ${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.9 AS ThucNhan
    FROM 
        quychuan qc
    JOIN 
        gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
    WHERE
        qc.MoiGiang = 1 AND qc.NamHoc = ? AND qc.he_dao_tao in (select id from he_dao_tao where cap_do <= 2)
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
            qc.DaoTaoDuyet,
            qc.TaiChinhDuyet,
            ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang
        FROM 
            quychuan qc
        JOIN 
            gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
        WHERE
            qc.NamHoc = ? AND qc.he_dao_tao not in (select id from he_dao_tao where cap_do <= 2)
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
        DaoTaoDuyet,
        TaiChinhDuyet,
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
        DaoTaoDuyet,
        TaiChinhDuyet,
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
        DaoTaoDuyet,
        TaiChinhDuyet,
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
```