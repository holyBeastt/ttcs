require("dotenv").config();
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  HeadingLevel,
} = require("docx");
const XLSX = require("xlsx");

const ExcelJS = require("exceljs");

let tableTam = process.env.DB_TABLE_TAM;

// render bảng
const getTableTam = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;

  console.log("Lấy dữ liệu bảng tạm Khoa Đợt Kì Năm:", Khoa, Dot, Ki, Nam);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query;
    const queryParams = [];

    // Xây dựng truy vấn dựa vào giá trị của Khoa
    if (Khoa !== "ALL") {
      query = `SELECT * FROM tam WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;
      queryParams.push(Khoa, Dot, Ki, Nam);
    } else {
      query = `SELECT * FROM tam WHERE Dot = ? AND Ki = ? AND Nam = ?`;
      queryParams.push(Dot, Ki, Nam);
    }

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    if (results.length == 0) {
      res.status(200).json({
        success: false,
        message: "Không tìm thấy dữ liệu",
      });
    } else {
      // Trả về kết quả dưới dạng JSON
      res.json({
        success: true,
        data: results,
      }); // results chứa dữ liệu trả về
    }
  } catch (error) {
    console.error("Lỗi trong hàm getTableTam:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

// xóa bảng
const deleteTableTam = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body; // Lấy thông tin từ body
  console.log(
    "Xóa thành công dữ liệu bảng tạm khoa, đợt, kì, năm:",
    Khoa,
    Dot,
    Ki,
    Nam
  );

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let query; // Khai báo biến cho câu truy vấn

  let connection; // Khai báo biến kết nối
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (Khoa !== "ALL") {
      // Nếu Khoa khác "ALL"
      query = `DELETE FROM ?? WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;
      const [results] = await connection.query(query, [
        tableTam,
        Khoa,
        Dot,
        Ki,
        Nam,
      ]);

      // Kiểm tra xem có bản ghi nào bị xóa không
      if (results.affectedRows > 0) {
        return res.json({ message: "Xóa thành công dữ liệu." });
      } else {
        return res
          .status(404)
          .json({ message: "Không tìm thấy dữ liệu để xóa." });
      }
    } else {
      // Nếu Khoa là "ALL"
      query = `DELETE FROM ?? WHERE Dot = ? AND Ki = ? AND Nam = ?`;
      const [results] = await connection.query(query, [tableTam, Dot, Ki, Nam]);

      // Kiểm tra xem có bản ghi nào bị xóa không
      if (results.affectedRows > 0) {
        return res.json({
          success: "true",
          message: "Xóa thành công dữ liệu.",
        });
      } else {
        return res.status(404).json({
          success: "false",
          message: "Không tìm thấy dữ liệu để xóa.",
        });
      }
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const quyDoiHeSo = (item) => {
  // Biến để lưu giá trị HeSoLopDong
  let HeSoLopDong = item.HeSoLopDong;

  // Trường hợp tính HeSoLopDong theo số lượng sinh viên
  const SoSinhVien = item.SoSinhVien;

  // Quy đổi HeSoLopDong theo số lượng sinh viên
  if (SoSinhVien <= 40) {
    HeSoLopDong = 1;
  } else if (SoSinhVien > 40 && SoSinhVien <= 50) {
    HeSoLopDong = 1.1;
  } else if (SoSinhVien > 50 && SoSinhVien <= 65) {
    HeSoLopDong = 1.2;
  } else if (SoSinhVien > 65 && SoSinhVien <= 80) {
    HeSoLopDong = 1.3;
  } else if (SoSinhVien > 80 && SoSinhVien <= 100) {
    HeSoLopDong = 1.4;
  } else if (SoSinhVien > 100) {
    HeSoLopDong = 1.5;
  }

  // Tính QuyChuan sau khi gắn giá trị HeSoLopDong
  let QuyChuan = null;
  if (item.LL && item.HeSoT7CN) {
    QuyChuan = Number(item.LL) * Number(HeSoLopDong) * Number(item.HeSoT7CN);
  }

  // Trả về kết quả quy đổi bao gồm cả HeSoLopDong và QuyChuan
  return {
    HeSoLopDong,
    QuyChuan,
  };
};

const updateTableTam = async (req, res) => {
  const data = req.body; // Lấy dữ liệu từ body (mảng các đối tượng dữ liệu cần lưu)
  console.log("Dữ liệu nhận để lưu vào bảng tạm:", data);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection; // Khai báo biến kết nối

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Nếu dữ liệu không tồn tại hoặc không phải là mảng
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ hoặc rỗng." });
    }

    // Vòng lặp qua từng đối tượng dữ liệu trong mảng và gọi hàm quyDoiHeSo để gắn lại hệ số lớp đông
    for (const element of data) {
      const row = element;
      const result = quyDoiHeSo(row); // Gọi hàm quyDoiHeSo để tính toán lại hệ số lớp đông và QuyChuan
      row.HeSoLopDong = result.HeSoLopDong; // Cập nhật lại hệ số lớp đông trong đối tượng
      // row.QuyChuan = result.QuyChuan; // Cập nhật QuyChuan trong đối tượng
      row.QuyChuan = parseFloat(result.QuyChuan).toFixed(2);
    }

    // Khởi tạo mảng chứa các giá trị để thực thi truy vấn INSERT ... ON DUPLICATE KEY UPDATE
    const insertUpdateValues = data.map((row) => [
      row.ID || null,
      row.Khoa || null,
      row.Dot || null,
      row.Ki || null,
      row.Nam || null,
      row.GiaoVien || null,
      row.HeSoLopDong || null,
      row.HeSoT7CN || null,
      row.LL || null,
      row.LopHocPhan || null,
      row.QuyChuan || null,
      row.SoSinhVien || null,
      row.SoTietCTDT || null,
      row.SoTinChi || null,
      row.GhiChu || null,
    ]);

    // Nếu không có dữ liệu hợp lệ, trả về lỗi
    if (insertUpdateValues.length === 0) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ hoặc thiếu dữ liệu hợp lệ để cập nhật.",
      });
    }

    // Truy vấn SQL
    const insertUpdateQuery = `
            INSERT INTO ?? (ID, Khoa, Dot, Ki, Nam, GiaoVien, HeSoLopDong, HeSoT7CN, LL, LopHocPhan, QuyChuan, SoSinhVien, SoTietCTDT, SoTinChi, GhiChu) 
            VALUES ?
            ON DUPLICATE KEY UPDATE
                Khoa = VALUES(Khoa),
                Dot = VALUES(Dot),
                Ki = VALUES(Ki),
                Nam = VALUES(Nam),
                GiaoVien = VALUES(GiaoVien),
                HeSoLopDong = VALUES(HeSoLopDong),
                HeSoT7CN = VALUES(HeSoT7CN),
                LL = VALUES(LL),
                LopHocPhan = VALUES(LopHocPhan),
                QuyChuan = VALUES(QuyChuan),
                SoSinhVien = VALUES(SoSinhVien),
                SoTietCTDT = VALUES(SoTietCTDT),
                SoTinChi = VALUES(SoTinChi),
                GhiChu = VALUES(GhiChu);
        `;

    // Thực thi truy vấn
    await connection.query(insertUpdateQuery, [tableTam, insertUpdateValues]);

    // Trả về phản hồi thành công
    return res.json({
      message: "Cập nhật dữ liệu thành công.",
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi xử lý dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// hàm sửa 1 dòng
const updateRow = async (req, res) => {
  const ID = req.params.id;
  const data = req.body; // Dữ liệu của dòng cần cập nhật
  console.log(`Cập nhật ${ID} trong bảng Tạm`);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection; // Khai báo biến kết nối

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra dữ liệu đầu vào
    if (!data || typeof data !== "object" || !ID) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ hoặc thiếu ID." });
    }

    // Chuẩn bị giá trị cho truy vấn UPDATE
    const updateValues = [
      data.Khoa,
      data.Dot,
      data.Ki,
      data.Nam,
      data.GiaoVien || null,
      data.HeSoLopDong || null,
      data.HeSoT7CN || null,
      data.LL || null,
      data.LopHocPhan || null,
      data.QuyChuan || null,
      data.SoSinhVien || null,
      data.SoTietCTDT || null,
      data.SoTinChi || null,
      data.GhiChu || null,
      ID, // Điều kiện WHERE sử dụng ID
    ];

    const updateQuery = `
            UPDATE ?? 
            SET 
                Khoa = ?, 
                Dot = ?, 
                Ki = ?, 
                Nam = ?, 
                GiaoVien = ?, 
                HeSoLopDong = ?, 
                HeSoT7CN = ?, 
                LL = ?, 
                LopHocPhan = ?, 
                QuyChuan = ?, 
                SoSinhVien = ?, 
                SoTietCTDT = ?, 
                SoTinChi = ?,
                GhiChu = ?
            WHERE ID = ?
        `;

    // Thực thi truy vấn
    await connection.query(updateQuery, [tableTam, ...updateValues]);

    // Trả về phản hồi thành công
    return res.json({ message: "Dòng dữ liệu đã được cập nhật thành công." });
  } catch (error) {
    console.error("Lỗi khi cập nhật dòng dữ liệu:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi cập nhật dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// hàm xóa 1 dòng
const deleteRow = async (req, res) => {
  const { id } = req.params; // Lấy ID từ URL

  console.log(`Xóa ${id} trong bảng Tạm:`);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra xem ID có hợp lệ không
    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    // Chuẩn bị truy vấn DELETE
    const deleteQuery = `DELETE FROM ?? WHERE ID = ?`;

    // Thực thi truy vấn
    await connection.query(deleteQuery, [tableTam, id]);

    // Trả về phản hồi thành công
    return res.json({ message: "Dòng dữ liệu đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa dòng dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// hàm thêm 1 dòng
const addNewRow = async (req, res) => {
  const data = req.body; // Lấy dữ liệu dòng mới từ body
  console.log("Dữ liệu nhận để thêm dòng mới:", data);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection;

  try {
    connection = await createPoolConnection(); // Tạo kết nối mới từ pool

    // Kiểm tra dữ liệu đầu vào
    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ." });
    }

    // Chuẩn bị câu truy vấn INSERT
    const insertValues = [
      data.Khoa,
      data.Dot,
      data.Ki,
      data.Nam,
      data.GiaoVien || null,
      data.HeSoLopDong || null,
      data.HeSoT7CN || null,
      data.LL || null,
      data.LopHocPhan || null,
      data.QuyChuan || null,
      data.SoSinhVien || null,
      data.SoTietCTDT || null,
      data.SoTinChi || null,
    ];

    const insertQuery = `
        INSERT INTO ?? 
        (Khoa, Dot, Ki, Nam, GiaoVien, HeSoLopDong, HeSoT7CN, LL, LopHocPhan, QuyChuan, SoSinhVien, SoTietCTDT, SoTinChi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

    // Thực thi câu truy vấn INSERT
    const [result] = await connection.query(insertQuery, [
      tableTam,
      ...insertValues,
    ]);

    // Trả về phản hồi thành công, bao gồm ID của dòng mới
    res.json({ message: "Dòng đã được thêm thành công", ID: result.insertId });
  } catch (error) {
    console.error("Lỗi khi thêm dòng:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi thêm dòng." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const exportToWord = async (req, res) => {
  const { data, titleMap, orderedKeys } = req.body; // Dữ liệu gửi từ client

  // Định nghĩa ánh xạ Khoa
  const khoaMap = {
    CB: "CB",
    ATTT: "ATTT",
    "QS&GDTC": "KQS&GDTC",
    LLCT: "LLCT",
    TTTH: "TTTH",
    CNTT: "CNTT",
    ĐTVT: "ĐTVT",
    MM: "MM",
  };

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ hoặc rỗng." });
    }

    // Nhóm dữ liệu theo Khoa
    const groupedByKhoa = data.reduce((groups, item) => {
      const khoa = item.Khoa; // Dùng giá trị của Khoa làm key để nhóm
      if (!groups[khoa]) {
        groups[khoa] = []; // Nếu chưa có nhóm cho khoa này, tạo nhóm mới
      }
      groups[khoa].push(item); // Thêm đối tượng vào nhóm tương ứng
      return groups;
    }, {});

    // Tạo tài liệu Word với từng nhóm khoa
    const sections = [];

    // Duyệt qua các nhóm khoa và tạo bảng cho từng khoa
    for (const khoa in groupedByKhoa) {
      const khoaName = khoaMap[khoa] || khoa; // Sử dụng ánh xạ Khoa hoặc giữ nguyên nếu không có ánh xạ

      // Thêm dòng đánh dấu cho Khoa (dòng 1 cột)
      sections.push(
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      text: `Các học phần thuộc Khoa ${khoaName}`,
                      alignment: "center", // Căn giữa dòng
                      bold: true, // In đậm dòng "Khoa"
                    }),
                  ],
                  columnSpan: orderedKeys.length - 1, // Giảm số cột vì bỏ cột Khoa
                }),
              ],
            }),
          ],
        })
      );

      // Tạo bảng cho các học phần trong khoa
      const filteredKeys = orderedKeys.filter((key) => key !== "Khoa"); // Loại bỏ cột "Khoa"
      const tableRows = [
        // Header row (sử dụng titleMap)
        new TableRow({
          children: filteredKeys.map(
            (key) =>
              new TableCell({
                children: [
                  new Paragraph({ text: titleMap[key] || key, bold: true }),
                ],
              })
          ),
        }),
        // Data rows (dùng orderedKeys để sắp xếp thứ tự các cột)
        ...groupedByKhoa[khoa].map(
          (row, index) =>
            new TableRow({
              children: filteredKeys.map((key) => {
                // Nếu là "TT", tạo số thứ tự
                const cellValue = key === "STT" ? `${index + 1}` : row[key];
                return new TableCell({
                  children: [
                    new Paragraph({
                      text: cellValue !== null ? String(cellValue) : "",
                    }),
                  ],
                });
              }),
            })
        ),
      ];

      const table = new Table({
        rows: tableRows,
      });

      // Thêm bảng vào phần tương ứng trong tài liệu
      sections.push(table);
    }

    // Tạo tài liệu Word với tất cả các phần
    const doc = new Document({
      sections: [
        {
          children: sections,
        },
      ],
    });

    // Lưu tài liệu vào buffer
    const buffer = await Packer.toBuffer(doc);

    // Đặt tên file
    const fileName = `exported_data_${new Date().toISOString()}.docx`;

    // Gửi file về client
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (error) {
    console.error("Lỗi khi xuất file docx:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xuất file docx." });
  }
};

// V1
// const exportToExcel = async (req, res) => {
//   const { renderData } = req.body;

//   // console.log(renderData[0]);
//   // Mảng tiêu đề theo thứ tự mong muốn
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//   };

//   // Mảng tiêu đề dựa trên titleMap
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );

//   // Nhóm dữ liệu theo 'Khoa'
//   const groupedData = renderData.reduce((acc, item, index) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];

//     // Tạo hàng dữ liệu theo thứ tự
//     const row = orderedKeys.map((key) =>
//       key === "STT" ? `${acc[department].length + 1}.` : item[key] || ""
//     );
//     acc[department].push(row);

//     return acc;
//   }, {});

//   // Tạo workbook
//   const workbook = XLSX.utils.book_new();

//   // Tạo từng sheet cho từng Khoa
//   Object.entries(groupedData).forEach(([department, rows]) => {
//     const headerTitle = [[`SỐ TIẾT QUY CHUẨN THEO KHOA ${department}`]];
//     const worksheetData = [...headerTitle, [], headers, ...rows];

//     const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

//     // Căn chỉnh độ rộng cột
//     worksheet["!cols"] = headers.map((header) => ({
//       wpx: Math.min(header.length * 10, 150),
//     }));

//     XLSX.utils.book_append_sheet(workbook, worksheet, department);
//   });

//   // Tạo tên file dựa trên Ki và Nam học
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   // Tạo file trong thư mục templates
//   const filePath = path.join("./uploads", fileName);

//   // Ghi file Excel vào filePath
//   XLSX.writeFile(workbook, filePath);

//   // Gửi file về client và xóa file sau khi gửi
//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       res.status(500).send("Không thể tải file");
//     } else {
//       // Xóa file sau khi gửi thành công
//       fs.unlink(filePath, (unlinkErr) => {
//         if (unlinkErr) {
//           console.error("Lỗi khi xóa file:", unlinkErr);
//         } else {
//           console.log("File đã được xóa thành công.");
//         }
//       });
//     }
//   });
// };

// const exportToExcel = async (req, res) => {
//   const { renderData } = req.body;

//   // Mảng tiêu đề theo thứ tự mong muốn
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//   };

//   // Tạo tiêu đề hiển thị cho Excel
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );

//   // Biến đếm STT toàn cục (tăng từ 1 đến hết)
//   let sttCounter = 1;

//   // Nhóm dữ liệu theo 'Khoa', đồng thời gán STT theo sttCounter
//   const groupedData = renderData.reduce((acc, item) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];
//     const row = orderedKeys.map((key) =>
//       key === "STT" ? `${sttCounter++}.` : (item[key] || "")
//     );
//     acc[department].push(row);
//     return acc;
//   }, {});

//   // Hàm chuyển số sang số la mã (Roman numeral)
//   const toRoman = (num) => {
//     const romanNumerals = [
//       ["M", 1000],
//       ["CM", 900],
//       ["D", 500],
//       ["CD", 400],
//       ["C", 100],
//       ["XC", 90],
//       ["L", 50],
//       ["XL", 40],
//       ["X", 10],
//       ["IX", 9],
//       ["V", 5],
//       ["IV", 4],
//       ["I", 1],
//     ];
//     let roman = "";
//     for (const [letter, value] of romanNumerals) {
//       while (num >= value) {
//         roman += letter;
//         num -= value;
//       }
//     }
//     return roman;
//   };

//   // Tạo workbook và worksheet mới bằng ExcelJS
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet("ALL", {
//     pageSetup: {
//       // Thiết lập in theo dạng landscape
//       orientation: "landscape",
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//       paperSize: 9, // 9 tương ứng với A4 trong ExcelJS
//     },
//   });

//   // Chỉ in dòng header (tiêu đề cột) 1 lần sau divider của nhóm đầu tiên
//   let headerPrinted = false;
//   let romanCounter = 1;

//   // Duyệt qua từng nhóm khoa
//   for (const [department, rows] of Object.entries(groupedData)) {
//     // Thêm dòng divider cho từng khoa với số la mã
//     const roman = toRoman(romanCounter++);
//     const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
//     const dividerRow = worksheet.addRow([dividerText]);
//     // Hợp nhất các ô từ cột 1 đến cột cuối
//     worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, headers.length);
//     dividerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     // Làm đậm dòng divider
//     dividerRow.font = { bold: true };

//     // Nếu chưa in header, in dòng header ngay sau divider của nhóm đầu tiên
//     if (!headerPrinted) {
//       const headerRow = worksheet.addRow(headers);
//       headerRow.eachCell((cell) => {
//         cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//         cell.font = { bold: true };
//       });
//       headerPrinted = true;
//     }

//     // Thêm các dòng dữ liệu của khoa
//     rows.forEach((dataRow) => {
//       worksheet.addRow(dataRow);
//     });

//     // Thêm một dòng trống giữa các nhóm (tuỳ chọn)
//     worksheet.addRow([]);
//   }

//   // Áp dụng border và wrapText cho tất cả các ô trong worksheet
//   worksheet.eachRow((row) => {
//     row.eachCell({ includeEmpty: true }, (cell) => {
//       cell.border = {
//         top: { style: "thin", color: { argb: "FF000000" } },
//         left: { style: "thin", color: { argb: "FF000000" } },
//         bottom: { style: "thin", color: { argb: "FF000000" } },
//         right: { style: "thin", color: { argb: "FF000000" } },
//       };
//       cell.alignment = cell.alignment || { horizontal: "left" };
//       cell.alignment.wrapText = true;
//       cell.font = {
//         name: "Cambria",
//         size: 13,
//         bold: cell.font?.bold || false,
//       };
//     });
//   });

//   // Đặt độ rộng cột theo yêu cầu:
//   // - Cột "STT" và "Số TC" (SoTinChi) có độ rộng nhỏ nhất (10 đơn vị)
//   // - Cột "GiaoVien" và "LopHocPhan" mỗi cột chiếm 20% tổng chiều rộng (150 đơn vị)
//   // - Các cột còn lại chia đều phần còn lại
//   const maxTotalWidth = 160; // Tổng chiều rộng tối đa của bảng
//   const colCount = headers.length;
//   const sttIndex = orderedKeys.indexOf("STT");
//   const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
//   const teacherIndex = orderedKeys.indexOf("GiaoVien");
//   const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");

//   const fixedWidthSTT = 5; // Cột STT và Số TC
//   const fixedWidthTeacher = maxTotalWidth * 0.2; // 30 đơn vị
//   const fixedWidthLopHocPhan = maxTotalWidth * 0.2; // 30 đơn vị

//   // Tổng width cố định
//   const fixedTotal =
//     fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan;
//   const remainingColumnsCount = colCount - 4; // trừ STT, SoTinChi, GiaoVien, LopHocPhan
//   const remainingWidthEach =
//     remainingColumnsCount > 0
//       ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
//       : 0;

//   for (let i = 1; i <= colCount; i++) {
//     if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
//       worksheet.getColumn(i).width = fixedWidthSTT;
//     } else if (i - 1 === teacherIndex) {
//       worksheet.getColumn(i).width = fixedWidthTeacher;
//     } else if (i - 1 === lopHocPhanIndex) {
//       worksheet.getColumn(i).width = fixedWidthLopHocPhan;
//     } else {
//       worksheet.getColumn(i).width = remainingWidthEach;
//     }
//   }

//   // Tạo tên file dựa trên Ki và Nam học
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   const filePath = path.join("./uploads", fileName);

//   // Ghi file Excel ra filePath
//   await workbook.xlsx.writeFile(filePath);

//   // Gửi file về client và xóa file sau khi gửi
//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       res.status(500).send("Không thể tải file");
//     } else {
//       fs.unlink(filePath, (unlinkErr) => {
//         if (unlinkErr) {
//           console.error("Lỗi khi xóa file:", unlinkErr);
//         } else {
//           console.log("File đã được xóa thành công.");
//         }
//       });
//     }
//   });
// };

// V2
// const exportToExcel = async (req, res) => {
//   const { renderData } = req.body;

//   // Mảng tiêu đề theo thứ tự mong muốn
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//     "GhiChu"
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//     GhiChu: "Ghi chú"
//   };

//   // Tạo tiêu đề hiển thị cho Excel
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );

//   // Biến đếm STT toàn cục (tăng từ 1 đến hết)
//   let sttCounter = 1;

//   // Nhóm dữ liệu theo 'Khoa', đồng thời gán STT theo sttCounter
//   const groupedData = renderData.reduce((acc, item) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];
//     const row = orderedKeys.map((key) =>
//       key === "STT" ? `${sttCounter++}.` : (item[key] || "")
//     );
//     acc[department].push(row);
//     return acc;
//   }, {});

//   // Hàm chuyển số sang số la mã (Roman numeral)
//   const toRoman = (num) => {
//     const romanNumerals = [
//       ["M", 1000],
//       ["CM", 900],
//       ["D", 500],
//       ["CD", 400],
//       ["C", 100],
//       ["XC", 90],
//       ["L", 50],
//       ["XL", 40],
//       ["X", 10],
//       ["IX", 9],
//       ["V", 5],
//       ["IV", 4],
//       ["I", 1],
//     ];
//     let roman = "";
//     for (const [letter, value] of romanNumerals) {
//       while (num >= value) {
//         roman += letter;
//         num -= value;
//       }
//     }
//     return roman;
//   };

//   // Tạo workbook và worksheet mới bằng ExcelJS
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet("ALL", {
//     pageSetup: {
//       orientation: "landscape",
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//       paperSize: 9, // 9 tương ứng với A4 trong ExcelJS
//     },
//   });

//   // In header đầu tiên ở đầu trang
//   const headerRow = worksheet.addRow(headers);
//   headerRow.eachCell((cell) => {
//     cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     cell.font = { bold: true };
//   });

//   let romanCounter = 1;

//   // Duyệt qua từng nhóm khoa
//   for (const [department, rows] of Object.entries(groupedData)) {
//     // Thêm dòng divider cho từng khoa với số la mã
//     const roman = toRoman(romanCounter++);
//     const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
//     const dividerRow = worksheet.addRow([dividerText]);
//     // Hợp nhất các ô từ cột 1 đến cột cuối
//     worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, headers.length);
//     dividerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     dividerRow.font = { bold: true };

//     // Thêm các dòng dữ liệu của khoa
//     rows.forEach((dataRow) => {
//       worksheet.addRow(dataRow);
//     });

//     // Thêm một dòng trống giữa các nhóm (tuỳ chọn)
//     worksheet.addRow([]);
//   }

//   // Áp dụng border và wrapText cho tất cả các ô trong worksheet
//   worksheet.eachRow((row) => {
//     row.eachCell({ includeEmpty: true }, (cell) => {
//       cell.border = {
//         top: { style: "thin", color: { argb: "FF000000" } },
//         left: { style: "thin", color: { argb: "FF000000" } },
//         bottom: { style: "thin", color: { argb: "FF000000" } },
//         right: { style: "thin", color: { argb: "FF000000" } },
//       };
//       cell.alignment = cell.alignment || { horizontal: "left" };
//       cell.alignment.wrapText = true;
//       cell.font = {
//         name: "Cambria",
//         size: 13,
//         bold: cell.font?.bold || false,
//       };
//     });
//   });

//   // Đặt độ rộng cột theo yêu cầu:
//   // - Cột "STT" và "Số TC" (SoTinChi) có độ rộng cố định
//   // - Cột "GiaoVien" và "LopHocPhan" chiếm 20% tổng chiều rộng
//   // - Các cột còn lại chia đều phần còn lại
//   const maxTotalWidth = 150; // Tổng chiều rộng tối đa của bảng
//   const colCount = headers.length;
//   const sttIndex = orderedKeys.indexOf("STT");
//   const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
//   const teacherIndex = orderedKeys.indexOf("GiaoVien");
//   const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");

//   const fixedWidthSTT = 7; // Cột STT và Số TC
//   const fixedWidthTeacher = maxTotalWidth * 0.2; // 20% tổng width
//   const fixedWidthLopHocPhan = maxTotalWidth * 0.2; // 20% tổng width

//   // Tổng width cố định
//   const fixedTotal =
//     fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan;
//   const remainingColumnsCount = colCount - 4; // trừ STT, SoTinChi, GiaoVien, LopHocPhan
//   const remainingWidthEach =
//     remainingColumnsCount > 0
//       ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
//       : 0;

//   for (let i = 1; i <= colCount; i++) {
//     if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
//       worksheet.getColumn(i).width = fixedWidthSTT;
//     } else if (i - 1 === teacherIndex) {
//       worksheet.getColumn(i).width = fixedWidthTeacher;
//     } else if (i - 1 === lopHocPhanIndex) {
//       worksheet.getColumn(i).width = fixedWidthLopHocPhan;
//     } else {
//       worksheet.getColumn(i).width = remainingWidthEach;
//     }
//   }

//   // Tạo tên file dựa trên Ki và Nam học
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   const filePath = path.join("./uploads", fileName);

//   // Ghi file Excel ra filePath
//   await workbook.xlsx.writeFile(filePath);

//   // Gửi file về client và xóa file sau khi gửi
//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       res.status(500).send("Không thể tải file");
//     } else {
//       fs.unlink(filePath, (unlinkErr) => {
//         if (unlinkErr) {
//           console.error("Lỗi khi xóa file:", unlinkErr);
//         } else {
//           console.log("File đã được xóa thành công.");
//         }
//       });
//     }
//   });
// };

// V3
// const exportToExcel2 = async (req, res) => {
//   const { renderData } = req.body;

//   // 1) Chuẩn bị key và map tiêu đề
//   const orderedKeys = [
//     "STT",
//     "SoTinChi",
//     "LopHocPhan",
//     "GiaoVien",
//     "SoTietCTDT",
//     "SoSinhVien",
//     "LL",
//     "HeSoT7CN",
//     "HeSoLopDong",
//     "QuyChuan",
//     "GhiChu"
//   ];

//   const titleMap = {
//     SoTinChi: "Số TC",
//     LopHocPhan: "Lớp học phần",
//     GiaoVien: "Giáo viên",
//     SoTietCTDT: "Số tiết theo CTĐT",
//     SoSinhVien: "Số SV",
//     LL: "Số tiết lên lớp theo TKB",
//     HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
//     HeSoLopDong: "Hệ số lớp đông",
//     QuyChuan: "QC",
//     GhiChu: "Ghi chú"
//   };

//   // Danh sách header hiển thị
//   const headers = orderedKeys.map((key) =>
//     key === "STT" ? "STT" : titleMap[key] || key
//   );
//   // Tổng số cột
//   const totalColumns = headers.length; // 11 cột

//   // Tạo workbook & worksheet
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet("ALL", {
//     pageSetup: {
//       orientation: "landscape",
//       fitToPage: true,
//       fitToWidth: 1,
//       fitToHeight: 0,
//       paperSize: 9, // A4
//     },
//   });

//   // ========================
//   // PHẦN HEADER NGOÀI
//   // ========================

//   // Row 1: (Trái - Phải)
//   let row = worksheet.addRow([]);
//   row.getCell(1).value = "BAN CƠ YẾU CHÍNH PHỦ";
//   row.getCell(6).value = "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM";
//   worksheet.mergeCells(row.number, 1, row.number, 4);   // A->E
//   worksheet.mergeCells(row.number, 6, row.number, 11);  // F->K
//   // Định dạng căn trái - phải tùy ý
//   row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
//   row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

//   // Row 2: (Trái - Phải)
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "HỌC VIỆN KỸ THUẬT MẬT MÃ";
//   row.getCell(6).value = "Độc lập - Tự do - Hạnh phúc";
//   worksheet.mergeCells(row.number, 1, row.number, 4);
//   worksheet.mergeCells(row.number, 6, row.number, 11);
//   row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
//   row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

//   // Row 3: (Trái - Phải)
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "Số:          /TB-HVM";
//   row.getCell(6).value = "Hà Nội, ngày        tháng 03 năm 2025";
//   worksheet.mergeCells(row.number, 1, row.number, 4);
//   worksheet.mergeCells(row.number, 6, row.number, 11);
//   row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
//   row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

//   // Row 4: dòng trống
//   row = worksheet.addRow([]);
//   worksheet.mergeCells(row.number, 1, row.number, 11);

//   // ========================
//   // PHẦN THÔNG BÁO
//   // ========================

//   // Row 5: THÔNG BÁO
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "THÔNG BÁO";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

//   // Row 6: Số tiết quy chuẩn...
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "Số tiết quy chuẩn các lớp học phần thuộc học kỳ 2, năm học 2024 – 2025";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

//   // Row 7: (Cơ sở đào tạo phía Bắc)
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "(Cơ sở đào tạo phía Bắc)";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

//   // ========================
//   // PHẦN CÁC "CĂN CỨ..."
//   // ========================
//   const canCuuList = [
//     "           Căn cứ Thông tư số 20/2020/TT-BGDĐT ngày 27 tháng 7 năm 2020 của Bộ trưởng Bộ Giáo dục và đào tạo ban hành Quy định chế độ làm việc của giảng viên cơ sở giáo dục đại học;",
//     "           Căn cứ Quyết định số 1409/QĐ-HVM ngày 30 tháng 12 năm 2021 của Giám đốc Học viện Kỹ thuật mật mã ban hành Quy định chế độ làm việc đối với giảng viên Học viện Kỹ thuật mật mã;",
//     "           Căn cứ Thời khóa biểu học kỳ 2, năm học 2024-2025;",
//     "           Căn cứ kết quả đăng ký các học phần của học viên, sinh viên thuộc học kỳ 2, năm 2024 - 2025;",
//     "           Căn cứ Đề nghị thay đổi giảng viên các lớp học phần của các Khoa.",
//     "           Học viện Kỹ thuật mật mã thông báo số tiết quy chuẩn các lớp học phần thuộc học kỳ 2, năm học 2024-2025 (Cơ sở đào tạo phía Bắc) như sau:"
//   ];

//   canCuuList.forEach((text) => {
//     let r = worksheet.addRow([]);
//     r.getCell(1).value = text;
//     worksheet.mergeCells(r.number, 1, r.number, totalColumns);
//     r.getCell(1).alignment = {
//       horizontal: "left",
//       vertical: "top",
//       wrapText: true,
//     };
//   });

//   // Thêm 1 row trống trước khi vào bảng
//   worksheet.addRow([]);

//   // ========================
//   // PHẦN HEADER BẢNG
//   // ========================

//   // Thêm header bảng
//   const headerRow = worksheet.addRow(headers);
//   headerRow.eachCell((cell) => {
//     cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     cell.font = { bold: true };
//   });

//   // ========================
//   // XỬ LÝ DỮ LIỆU: NHÓM THEO KHOA
//   // ========================
//   let sttCounter = 1;
//   const groupedData = renderData.reduce((acc, item) => {
//     const department = item.Khoa || "Khac";
//     if (!acc[department]) acc[department] = [];
//     const rowData = orderedKeys.map((key) =>
//       key === "STT" ? `${sttCounter++}.` : (item[key] || "")
//     );
//     acc[department].push(rowData);
//     return acc;
//   }, {});

//   // Hàm chuyển số sang La Mã
//   const toRoman = (num) => {
//     const romanNumerals = [
//       ["M", 1000],
//       ["CM", 900],
//       ["D", 500],
//       ["CD", 400],
//       ["C", 100],
//       ["XC", 90],
//       ["L", 50],
//       ["XL", 40],
//       ["X", 10],
//       ["IX", 9],
//       ["V", 5],
//       ["IV", 4],
//       ["I", 1],
//     ];
//     let roman = "";
//     for (const [letter, value] of romanNumerals) {
//       while (num >= value) {
//         roman += letter;
//         num -= value;
//       }
//     }
//     return roman;
//   };

//   let romanCounter = 1;
//   for (const [department, rowsData] of Object.entries(groupedData)) {
//     const roman = toRoman(romanCounter++);
//     const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
//     let dividerRow = worksheet.addRow([dividerText]);
//     worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, totalColumns);
//     dividerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
//     dividerRow.font = { bold: true };

//     // Thêm data rows
//     rowsData.forEach((rData) => {
//       worksheet.addRow(rData);
//     });
//     // Row trống sau mỗi nhóm
//     worksheet.addRow([]);
//   }

//   // ========================
//   // PHẦN ROW CUỐI: THÔNG BÁO KẾT
//   // ========================
//   row = worksheet.addRow([]);
//   row.getCell(1).value = "        Nhận được Thông báo này các cơ quan, đơn vị có liên quan chủ động triển khai thực hiện./.";
//   worksheet.mergeCells(row.number, 1, row.number, totalColumns);
//   row.getCell(1).alignment = { horizontal: "left", vertical: "top", wrapText: true };

//   // (Tuỳ chọn) Thêm các row “Nơi nhận”, chữ ký… nếu muốn

//   // ========================
//   // ĐỊNH DẠNG CHUNG (border, font, wrapText)
//   // ========================
//   worksheet.eachRow((rItem) => {
//     rItem.eachCell({ includeEmpty: true }, (cell) => {
//       cell.border = {
//         top: { style: "thin", color: { argb: "FF000000" } },
//         left: { style: "thin", color: { argb: "FF000000" } },
//         bottom: { style: "thin", color: { argb: "FF000000" } },
//         right: { style: "thin", color: { argb: "FF000000" } },
//       };
//       cell.font = {
//         name: "Cambria",
//         size: 13,
//         bold: cell.font?.bold || false,
//       };
//       if (!cell.alignment) {
//         cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
//       } else {
//         cell.alignment.wrapText = true;
//       }
//     });
//   });

//   // ========================
//   // ĐỘ RỘNG CỘT
//   // ========================
//   const maxTotalWidth = 150;
//   const colCount = totalColumns; // 11
//   const sttIndex = orderedKeys.indexOf("STT");
//   const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
//   const teacherIndex = orderedKeys.indexOf("GiaoVien");
//   const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");

//   const fixedWidthSTT = 7; // Cột STT + Số TC
//   const fixedWidthTeacher = maxTotalWidth * 0.2; // 20%
//   const fixedWidthLopHocPhan = maxTotalWidth * 0.2; // 20%

//   const fixedTotal = fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan;
//   const remainingColumnsCount = colCount - 4;
//   const remainingWidthEach =
//     remainingColumnsCount > 0
//       ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
//       : 0;

//   for (let i = 1; i <= colCount; i++) {
//     if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
//       worksheet.getColumn(i).width = fixedWidthSTT;
//     } else if (i - 1 === teacherIndex) {
//       worksheet.getColumn(i).width = fixedWidthTeacher;
//     } else if (i - 1 === lopHocPhanIndex) {
//       worksheet.getColumn(i).width = fixedWidthLopHocPhan;
//     } else {
//       worksheet.getColumn(i).width = remainingWidthEach;
//     }
//   }

//   // ========================
//   // GHI FILE VÀ TRẢ VỀ CLIENT
//   // ========================
//   const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
//   const filePath = path.join("./uploads", fileName);

//   await workbook.xlsx.writeFile(filePath);

//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Lỗi khi gửi file:", err);
//       return res.status(500).send("Không thể tải file");
//     }
//     fs.unlink(filePath, (unlinkErr) => {
//       if (unlinkErr) {
//         console.error("Lỗi khi xóa file:", unlinkErr);
//       } else {
//         console.log("File đã được xóa thành công sau khi gửi.");
//       }
//     });
//   });
// };

// V4
const exportToExcel = async (req, res) => {
  const { renderData } = req.body;

  // 1) Chuẩn bị key và map tiêu đề
  const orderedKeys = [
    "STT",
    "SoTinChi",
    "LopHocPhan",
    "GiaoVien",
    "SoTietCTDT",
    "SoSinhVien",
    "LL",
    "HeSoT7CN",
    "HeSoLopDong",
    "QuyChuan",
    "GhiChu",
  ];

  const titleMap = {
    SoTinChi: "Số TC",
    LopHocPhan: "Lớp học phần",
    GiaoVien: "Giáo Viên",
    SoTietCTDT: "Số tiết theo CTĐT",
    SoSinhVien: "Số SV",
    LL: "Số tiết lên lớp được tính QC",
    HeSoT7CN: "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
    HeSoLopDong: "Hệ số lớp đông",
    QuyChuan: "QC",
    GhiChu: "Ghi chú",
  };

  // Danh sách header hiển thị
  const headers = orderedKeys.map((key) =>
    key === "STT" ? "STT" : titleMap[key] || key
  );
  // Tổng số cột
  const totalColumns = headers.length; // 11 cột

  // Tạo workbook & worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("ALL", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  // ========================
  // PHẦN HEADER NGOÀI
  // ========================

  // Row 1: (Trái - Phải)
  // Row 1: (Trái - Phải)
  let row = worksheet.addRow([]);
  row.getCell(2).value = "BAN CƠ YẾU CHÍNH PHỦ".toUpperCase();
  row.getCell(5).value = "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM".toUpperCase();
  worksheet.mergeCells(row.number, 2, row.number, 3); // B->C
  worksheet.mergeCells(row.number, 5, row.number, 10); // E->J

  // Căn giữa, in đậm
  row.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(5).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  row.getCell(2).font = { bold: true };
  row.getCell(5).font = { bold: true };

  // Row 2: (Trái - Phải)
  row = worksheet.addRow([]);
  row.getCell(2).value = "HỌC VIỆN KỸ THUẬT MẬT MÃ".toUpperCase();
  row.getCell(5).value = "Độc lập - Tự do - Hạnh phúc";

  worksheet.mergeCells(row.number, 2, row.number, 3);
  worksheet.mergeCells(row.number, 5, row.number, 10);

  // Căn giữa & in đậm
  row.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(5).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  row.getCell(2).font = { bold: true };
  row.getCell(5).font = { bold: true };

  // Row 3: (Trái - Phải)
  row = worksheet.addRow([]);
  row.getCell(2).value = "Số:          /TB-HVM";
  row.getCell(5).value = "Hà Nội, ngày        tháng        năm           ";
  worksheet.mergeCells(row.number, 2, row.number, 3);
  worksheet.mergeCells(row.number, 5, row.number, 10);
  row.getCell(2).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(5).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  // Row 4: dòng trống
  row = worksheet.addRow([]);
  worksheet.mergeCells(row.number, 1, row.number, 11);

  // ========================
  // PHẦN THÔNG BÁO
  // ========================

  // Row 5: THÔNG BÁO
  row = worksheet.addRow([]);
  row.getCell(1).value = "THÔNG BÁO".toUpperCase();
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { bold: true };

  // Row 6: Số tiết quy chuẩn...
  row = worksheet.addRow([]);
  row.getCell(
    1
  ).value = `Số tiết quy chuẩn các lớp học phần thuộc học kỳ ${renderData[0].Ki}, năm học ${renderData[0].Nam}`;
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { bold: true };

  // Row 7: (Cơ sở đào tạo phía Bắc)
  row = worksheet.addRow([]);
  row.getCell(1).value = "(Cơ sở đào tạo phía Bắc)";
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  row.getCell(1).font = { name: "Times New Roman", italic: true };

  // ========================
  // PHẦN CÁC "CĂN CỨ..."
  // ========================
  const canCuuList = [
    "           Căn cứ Thông tư số 20/2020/TT-BGDĐT ngày 27 tháng 7 năm 2020 của Bộ trưởng Bộ Giáo dục và đào tạo ban hành Quy định chế độ làm việc của giảng viên cơ sở giáo dục đại học;",
    "           Căn cứ Quyết định số 1409/QĐ-HVM ngày 30 tháng 12 năm 2021 của Giám đốc Học viện Kỹ thuật mật mã ban hành Quy định chế độ làm việc đối với giảng viên Học viện Kỹ thuật mật mã;",
    `           Căn cứ Thời khóa biểu học kỳ ${renderData[0].Ki}, năm học ${renderData[0].Nam};`,
    `           Căn cứ kết quả đăng ký các học phần của học viên, sinh viên thuộc học kỳ ${renderData[0].Ki}, năm ${renderData[0].Nam};`,
    "           Căn cứ Đề nghị thay đổi giảng viên các lớp học phần của các Khoa.",
    `           Học viện Kỹ thuật mật mã thông báo số tiết quy chuẩn các lớp học phần thuộc học kỳ ${renderData[0].Ki}, năm học ${renderData[0].Nam} (Cơ sở đào tạo phía Bắc) như sau:`,
  ];

  const rowsWithFixedHeight = [0, 1]; // Các dòng x3 chiều cao

  canCuuList.forEach((text, index) => {
    let r = worksheet.addRow([]);
    r.getCell(1).value = text;
    worksheet.mergeCells(r.number, 1, r.number, totalColumns);
    r.getCell(1).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };
    if (rowsWithFixedHeight.includes(index)) {
      r.height = 45;
    }
  });

  // Thêm 1 row trống trước khi vào bảng
  worksheet.addRow([]);

  // ========================
  // PHẦN HEADER BẢNG
  // ========================
  // Thêm header bảng
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.font = { bold: true };
  });
  // Lưu lại dòng bắt đầu của vùng bảng
  const tableStart = headerRow.number;

  // ========================
  // XỬ LÝ DỮ LIỆU: NHÓM THEO KHOA
  // ========================
  let sttCounter = 1;
  const groupedData = renderData.reduce((acc, item) => {
    const department = item.Khoa || "Khac";
    if (!acc[department]) acc[department] = [];
    const rowData = orderedKeys.map((key) =>
      key === "STT" ? `${sttCounter++}` : item[key] || ""
    );
    acc[department].push(rowData);
    return acc;
  }, {});

  // Hàm chuyển số sang La Mã
  const toRoman = (num) => {
    const romanNumerals = [
      ["M", 1000],
      ["CM", 900],
      ["D", 500],
      ["CD", 400],
      ["C", 100],
      ["XC", 90],
      ["L", 50],
      ["XL", 40],
      ["X", 10],
      ["IX", 9],
      ["V", 5],
      ["IV", 4],
      ["I", 1],
    ];
    let roman = "";
    for (const [letter, value] of romanNumerals) {
      while (num >= value) {
        roman += letter;
        num -= value;
      }
    }
    return roman;
  };

  let romanCounter = 1;
  for (const [department, rowsData] of Object.entries(groupedData)) {
    const roman = toRoman(romanCounter++);
    const dividerText = `${roman}. Các học phần thuộc Khoa ${department}`;
    let dividerRow = worksheet.addRow([dividerText]);
    worksheet.mergeCells(dividerRow.number, 1, dividerRow.number, totalColumns);
    dividerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    dividerRow.font = { bold: true };

    // Thêm viền cho toàn bộ hàng
    for (let col = 1; col <= totalColumns; col++) {
      dividerRow.getCell(col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }

    // Thêm data rows
    rowsData.forEach((rData) => {
      worksheet.addRow(rData);
    });

    // Row trống sau mỗi nhóm
    // worksheet.addRow([]);
  }

  worksheet.addRow([]);

  // Lưu lại dòng kết thúc của vùng bảng (trước phần thông báo cuối)
  const tableEnd = worksheet.lastRow.number;

  // ========================
  // PHẦN ROW CUỐI: THÔNG BÁO KẾT
  // ========================
  row = worksheet.addRow([]);
  row.getCell(1).value =
    "        Nhận được Thông báo này các cơ quan, đơn vị có liên quan chủ động triển khai thực hiện./.";
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);
  row.getCell(1).alignment = {
    horizontal: "left",
    vertical: "top",
    wrapText: true,
  };

  row = worksheet.addRow([]); // Dòng trống
  worksheet.mergeCells(row.number, 1, row.number, totalColumns);

  // ==============
  // PHẦN NƠI NHẬN & CHỮ KÝ
  // ==============

  // 1) Dòng "Nơi nhận" (bên trái) & "KT. GIÁM ĐỐC / PHÓ GIÁM ĐỐC" (bên phải)
  row = worksheet.addRow([]);
  row.getCell(2).value = "Nơi nhận:";
  worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
  row.getCell(2).alignment = {
    horizontal: "left",
    vertical: "top",
    wrapText: true,
  };
  row.getCell(2).font = { bold: true };

  // Bên phải
  row.getCell(7).value = "KT. GIÁM ĐỐC\nPHÓ GIÁM ĐỐC";
  worksheet.mergeCells(row.number, 7, row.number, totalColumns); // G->K
  row.getCell(7).alignment = {
    horizontal: "center",
    vertical: "top",
    wrapText: true,
  };
  row.getCell(7).font = { bold: true };

  // 2) Các dòng gạch đầu dòng bên trái
  const bulletLines = [
    "- Ban Giám đốc (2) (để b/c)",
    "- Phòng KH-TC;",
    "- Các khoa: NM, ATTT, CNTT, ĐTVT,",
    "  TTTH, CB, LLCT, KQS&QĐ...;",
    "- Lưu: VT, ĐT P13.",
  ];
  bulletLines.forEach((text) => {
    row = worksheet.addRow([]);
    // Bên trái
    row.getCell(2).value = text;
    worksheet.mergeCells(row.number, 2, row.number, 6); // B->F
    row.getCell(2).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };

    // Bên phải để trống, vẫn merge để không bị border
    worksheet.mergeCells(row.number, 7, row.number, totalColumns);
  });

  // 3) Thêm một vài dòng trống (tùy chỉnh) để tạo khoảng cho chữ ký
  for (let i = 0; i < 2; i++) {
    row = worksheet.addRow([]);
    worksheet.mergeCells(row.number, 1, row.number, 6);
    worksheet.mergeCells(row.number, 7, row.number, totalColumns);
  }

  // ========================
  // ĐỊNH DẠNG CHUNG (border, font, wrapText)
  // ========================
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (rowNumber >= tableStart && rowNumber <= tableEnd) {
        // Vùng bảng: áp dụng border và căn giữa theo vertical
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
        cell.alignment = {
          horizontal: cell.alignment?.horizontal || "left",
          vertical: "middle",
          wrapText: true,
        };
      } else {
        // Vùng ngoài bảng: không viền, chỉ thêm wrapText: true
        cell.border = undefined;
        cell.alignment = {
          horizontal: cell.alignment?.horizontal || "left",
          vertical: "top",
          wrapText: true,
        };
      }
      cell.font = {
        name: "Times New Roman",
        size: 13,
        bold: cell.font?.bold || false,
      };
    });
  });

  // ========================
  // ĐỘ RỘNG CỘT
  // ========================
  const maxTotalWidth = 150;
  const colCount = totalColumns; // 11
  const sttIndex = orderedKeys.indexOf("STT");
  const soTinChiIndex = orderedKeys.indexOf("SoTinChi");
  const teacherIndex = orderedKeys.indexOf("GiaoVien");
  const lopHocPhanIndex = orderedKeys.indexOf("LopHocPhan");

  const fixedWidthSTT = 7; // Cột STT + Số TC
  const fixedWidthTeacher = maxTotalWidth * 0.2; // 20%
  const fixedWidthLopHocPhan = maxTotalWidth * 0.3; // 30%

  const fixedTotal =
    fixedWidthSTT * 2 + fixedWidthTeacher + fixedWidthLopHocPhan;
  const remainingColumnsCount = colCount - 4;
  const remainingWidthEach =
    remainingColumnsCount > 0
      ? (maxTotalWidth - fixedTotal) / remainingColumnsCount
      : 0;

  for (let i = 1; i <= colCount; i++) {
    if (i - 1 === sttIndex || i - 1 === soTinChiIndex) {
      worksheet.getColumn(i).width = fixedWidthSTT;
    } else if (i - 1 === teacherIndex) {
      worksheet.getColumn(i).width = fixedWidthTeacher;
    } else if (i - 1 === lopHocPhanIndex) {
      worksheet.getColumn(i).width = fixedWidthLopHocPhan;
    } else {
      worksheet.getColumn(i).width = remainingWidthEach;
    }
  }

  // ========================
  // GHI FILE VÀ TRẢ VỀ CLIENT
  // ========================
  const fileName = `file_quy_chuan_du_kien_hoc_ki_${renderData[0].Ki}_nam_hoc_${renderData[0].Nam}.xlsx`;
  const filePath = path.join("./uploads", fileName);

  await workbook.xlsx.writeFile(filePath);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Lỗi khi gửi file:", err);
      return res.status(500).send("Không thể tải file");
    }
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error("Lỗi khi xóa file:", unlinkErr);
      } else {
        console.log("File đã được xóa thành công sau khi gửi.");
      }
    });
  });
};

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  // Sử dụng các phương thức lấy giá trị theo giờ địa phương
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const exportToExcel_HDDK = async (req, res) => {
  try {
    const { renderData } = req.body;

    if (!renderData || renderData.length === 0) {
      return res.status(400).send("Dữ liệu trống, không thể xuất file Excel");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1", {
      pageSetup: { orientation: "landscape" },
    });

    // Ánh xạ tên cột theo yêu cầu
    const headerMapping = {
      TongTiet: "Số tiết",
      TongSoTiet: "Tổng số tiết",
      NgayBatDau: "Ngày kí HĐ",
      NgayKetThuc: "Ngày thanh lí HĐ",
      GioiTinh: "Danh xưng",
      GiangVien: "Họ tên",
      NgaySinh: "Ngày sinh",
      CCCD: "CCCD",
      NgayCapCCCD: "Ngày cấp CCCD",
      HocVi: "Học vị",
      ChucVu: "Chức vụ",
      DienThoai: "Điện thoại",
      Email: "Email",
      STK: "Số TK",
      NganHang: "Ngân hàng",
      MaSoThue: "Mã số thuế",
      DiaChi: "Địa chỉ",
      NoiCongTac: "Nơi công tác",
      MonGiangDayChinh: "Bộ môn",
    };

    // Tạo danh sách header từ các key của headerMapping
    const headers = Object.keys(headerMapping);

    // Tính toán độ rộng tự động cho từng cột dựa trên header và nội dung
    const rawWidths = headers.map((key) => {
      let maxLen = headerMapping[key].length;
      renderData.forEach((row) => {
        // Nếu là ngày thì chuyển đổi sang chuỗi dạng dd/mm/yyyy để tính độ dài
        let cellValue;
        if ((key === "NgayBatDau" || key === "NgayKetThuc") && row[key]) {
          const date = new Date(row[key]);
          cellValue = `${date.getDate().toString().padStart(2, "0")}/${(
            date.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}/${date.getFullYear()}`;
        } else {
          cellValue =
            row[key] !== null && row[key] !== undefined
              ? row[key].toString()
              : "";
        }
        if (cellValue.length > maxLen) {
          maxLen = cellValue.length;
        }
      });
      return maxLen;
    });

    const totalRawWidth = rawWidths.reduce((sum, w) => sum + w, 0);
    const scale = totalRawWidth > 0 ? 500 / totalRawWidth : 1;

    worksheet.columns = headers.map((key, index) => ({
      header: headerMapping[key],
      key: key,
      width: Math.round(rawWidths[index] * scale * 100) / 100,
    }));

    // Thiết lập style cho dòng header: font Times New Roman, in đậm, màu nền #007bff và màu chữ trắng
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.font = {
        bold: true,
      };
    });

    // Chuyển đổi giá trị của ngày thành Date object và định dạng danh xưng
    const formattedData = renderData.map((row) => {
      const formattedRow = { ...row };
      if (row.NgayBatDau) {
        formattedRow.NgayBatDau = formatDate(row.NgayBatDau);
      }
      if (row.NgayKetThuc) {
        formattedRow.NgayKetThuc = formatDate(row.NgayKetThuc);
      }
      if (row.NgaySinh) {
        formattedRow.NgaySinh = formatDate(row.NgaySinh);
      }
      if (row.NgayCapCCCD) {
        formattedRow.NgayCapCCCD = formatDate(row.NgayCapCCCD);
      }
      formattedRow.GioiTinh = row.GioiTinh === "Nam" ? "Ông" : "Bà";
      return formattedRow;
    });

    // Thêm dữ liệu vào sheet
    formattedData.forEach((data) => {
      worksheet.addRow(data);
    });

    // Căn chỉnh cho tất cả các cell
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        };
      });
    });

    // Định dạng cột ngày: NgayBatDau và NgayKetThuc theo định dạng "dd/mm/yyyy"
    if (worksheet.getColumn("NgayBatDau")) {
      worksheet.getColumn("NgayBatDau").numFmt = "dd/mm/yyyy";
    }
    if (worksheet.getColumn("NgayKetThuc")) {
      worksheet.getColumn("NgayKetThuc").numFmt = "dd/mm/yyyy";
    }

    // Đặt tên file dựa trên dữ liệu mẫu (lưu ý: KiHoc và NamHoc phải có trong renderData[0])
    const fileName = `thong_tin_hop_dong_du_kien_ki_${renderData[0].KiHoc}_nam_hoc_${renderData[0].NamHoc}.xlsx`;
    const filePath = path.join("./uploads", fileName);

    // Ghi file Excel ra file hệ thống
    await workbook.xlsx.writeFile(filePath);

    // Gửi file về client và sau đó xóa file khỏi hệ thống
    res.download(filePath, fileName, async (err) => {
      if (err) {
        console.error("Lỗi khi gửi file:", err);
        return res.status(500).send("Không thể tải file");
      }
      try {
        await fs.promises.unlink(filePath);
        console.log("File đã được xóa thành công sau khi gửi.");
      } catch (unlinkErr) {
        console.error("Lỗi khi xóa file:", unlinkErr);
      }
    });
  } catch (error) {
    console.error("Lỗi khi xuất file Excel:", error);
    res.status(500).send("Lỗi khi xuất file Excel");
  }
};

const editStudentQuanity = async (req, res) => {
  const data = req.body; // Nhận dữ liệu từ body
  // console.log("Dữ liệu nhận để cập nhật:", data); // In ra để kiểm tra

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let connection;

  try {
    connection = await createPoolConnection(); // Tạo kết nối từ pool

    // Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu không hợp lệ hoặc rỗng." });
    }

    // Xây dựng phần CASE trong câu lệnh UPDATE
    let updateCaseStatements = {
      SoSinhVien: [],
      HeSoLopDong: [],
      QuyChuan: [],
    };
    let updateValues = [];
    let idsToUpdate = [];

    data.forEach((item) => {
      const { ID, StudentQuantityUpdate, StudentQuantity, HeSoT7CN, LL } = item; // Lấy HeSoNgoaiGio từ item

      // Kiểm tra nếu ID, StudentQuantityUpdate và StudentQuantity tồn tại
      if (
        !ID ||
        StudentQuantityUpdate === undefined ||
        StudentQuantity === undefined
      ) {
        throw new Error(
          `Thiếu ID, StudentQuantityUpdate hoặc StudentQuantity cho bản ghi: ${JSON.stringify(
            item
          )}`
        );
      }

      // Sử dụng Regular Expression để trích xuất số từ ID
      const regex = /-(\d+)-/; // Biểu thức chính quy để tìm số giữa 2 dấu gạch nối
      const match = ID.match(regex);

      if (!match) {
        throw new Error(`Không thể trích xuất số ID từ: ${ID}`);
      }

      const numericID = match[1]; // Lấy phần số từ kết quả regex

      if (!numericID) {
        throw new Error(`Không thể trích xuất số ID từ: ${ID}`);
      }

      // Đồng bộ tất cả về định dạng số, nếu rỗng thì trở thành 0
      const studentQuantityUpdate =
        StudentQuantityUpdate === "" ? 0 : parseInt(StudentQuantityUpdate, 10);
      const studentQuantity =
        StudentQuantity === "" ? 0 : parseInt(StudentQuantity, 10);

      // Kiểm tra xem StudentQuantityUpdate có khác StudentQuantity không
      if (studentQuantity !== studentQuantityUpdate) {
        console.log(
          "Update ID: " +
            ID +
            " số sinh viên cũ : " +
            studentQuantity +
            " số sinh viên mới : " +
            studentQuantityUpdate
        );

        // Nếu StudentQuantityUpdate không hợp lệ (NaN), gán giá trị là 0
        if (isNaN(studentQuantityUpdate)) {
          throw new Error(
            `Số lượng sinh viên không hợp lệ: ${StudentQuantityUpdate}`
          );
        }

        // Gọi hàm quy đổi hệ số
        const { HeSoLopDong } = quyDoiHeSo(item); // Giả sử hàm quyDoiHeSo đã được định nghĩa trước đó

        // Tính QuyChuan
        const QuyChuan = Number(LL) * Number(HeSoLopDong) * Number(HeSoT7CN); // Nếu HeSoNgoaiGio là null, mặc định lấy giá trị 1

        console.log(QuyChuan);

        // Cập nhật các giá trị cần thay đổi
        updateCaseStatements.SoSinhVien.push(`WHEN ID = ? THEN ?`);
        updateValues.push(numericID, studentQuantityUpdate);

        updateCaseStatements.HeSoLopDong.push(`WHEN ID = ? THEN ?`);
        updateValues.push(numericID, HeSoLopDong);

        updateCaseStatements.QuyChuan.push(`WHEN ID = ? THEN ?`);
        updateValues.push(numericID, QuyChuan);

        idsToUpdate.push(numericID); // Thêm ID vào mảng idsToUpdate
      }
    });

    // Nếu không có bản ghi nào cần cập nhật, trả về thông báo
    if (updateCaseStatements.SoSinhVien.length === 0) {
      return res.json({
        success: false,
        message: "Không có lớp nào cập nhật số sinh viên",
      });
    }

    // Nếu chỉ có một ID trong mảng idsToUpdate, biến nó thành mảng để truyền vào IN
    const idsToUpdateParam =
      idsToUpdate.length === 1 ? [idsToUpdate[0]] : idsToUpdate;

    // Xây dựng câu lệnh UPDATE
    const updateQuery = `
            UPDATE ?? 
            SET 
                SoSinhVien = CASE ${updateCaseStatements.SoSinhVien.join(
                  " "
                )} ELSE SoSinhVien END,
                HeSoLopDong = CASE ${updateCaseStatements.HeSoLopDong.join(
                  " "
                )} ELSE HeSoLopDong END,
                QuyChuan = CASE ${updateCaseStatements.QuyChuan.join(
                  " "
                )} ELSE QuyChuan END
            WHERE ID IN (?);
        `;

    // Thực thi câu lệnh UPDATE
    await connection.query(updateQuery, [
      tableTam,
      ...updateValues,
      idsToUpdateParam,
    ]);

    res.json({
      success: true,
      message: "Cập nhật số lượng sinh viên, hệ số và QuyChuan thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật số lượng sinh viên:", error);
    res.status(500).json({
      success: false,
      message: `Đã xảy ra lỗi khi cập nhật dữ liệu: ${error.message}`,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối về pool
  }
};

// Xuất các hàm để sử dụng
module.exports = {
  getTableTam,
  deleteTableTam,
  updateTableTam,
  updateRow,
  deleteRow,
  addNewRow,
  exportToWord,
  exportToExcel,
  editStudentQuanity,
  exportToExcel_HDDK,
};
