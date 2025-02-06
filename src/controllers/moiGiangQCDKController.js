require("dotenv").config();
const path = require("path");
const connection = require("../controllers/connectDB"); // Giả định rằng bạn đã cấu hình kết nối ở đây
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const { Document, Packer, Table, TableRow, TableCell, Paragraph, HeadingLevel } = require("docx");

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
            query = `SELECT * FROM ${tableTam} WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;
            queryParams.push(Khoa, Dot, Ki, Nam);
        } else {
            query = `SELECT * FROM ${tableTam} WHERE Dot = ? AND Ki = ? AND Nam = ?`;
            queryParams.push(Dot, Ki, Nam);
        }

        // Thực hiện truy vấn
        const [results] = await connection.execute(query, queryParams);

        // Trả về kết quả dưới dạng JSON
        res.json(results); // results chứa dữ liệu trả về
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
    console.log("Xóa thành công dữ liệu bảng tạm khoa, đợt, kì, năm:", Khoa, Dot, Ki, Nam);

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
                return res.json({ message: "Xóa thành công dữ liệu." });
            } else {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy dữ liệu để xóa." });
            }
        }
    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu:", error);
        return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
    } finally {
        if (connection) connection.release(); // Giải phóng kết nối
    }
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
            return res.status(400).json({ message: "Dữ liệu không hợp lệ hoặc rỗng." });
        }

        // Chuẩn bị các giá trị cho truy vấn INSERT ... ON DUPLICATE KEY UPDATE
        const insertUpdateValues = data.map(row => [
            row.ID || null, // ID (có thể là null nếu là thêm mới)
            row.Khoa,
            row.Dot,
            row.Ki,
            row.Nam,
            row.GiaoVien || null,
            row.HeSoLopDong || null,
            row.HeSoT7CN || null,
            row.LL || null,
            row.LopHocPhan || null,
            row.QuyChuan || null,
            row.SoSinhVien || null,
            row.SoTietCTDT || null,
            row.SoTinChi || null
        ]);

        const insertUpdateQuery = `
            INSERT INTO ?? (ID, Khoa, Dot, Ki, Nam, GiaoVien, HeSoLopDong, HeSoT7CN, LL, LopHocPhan, QuyChuan, SoSinhVien, SoTietCTDT, SoTinChi) 
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
                SoTinChi = VALUES(SoTinChi)
        `;

        await connection.query(insertUpdateQuery, [tableTam, insertUpdateValues]);

        return res.json({ message: "Cập nhật dữ liệu thành công." });
    } catch (error) {
        console.error("Lỗi khi xử lý dữ liệu:", error);
        return res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý dữ liệu." });
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
            return res.status(400).json({ message: "Dữ liệu không hợp lệ hoặc thiếu ID." });
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
            ID // Điều kiện WHERE sử dụng ID
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
                SoTinChi = ?
            WHERE ID = ?
        `;

        // Thực thi truy vấn
        await connection.query(updateQuery, [tableTam, ...updateValues]);

        // Trả về phản hồi thành công
        return res.json({ message: "Dòng dữ liệu đã được cập nhật thành công." });
    } catch (error) {
        console.error("Lỗi khi cập nhật dòng dữ liệu:", error);
        return res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật dữ liệu." });
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
    const data = req.body;  // Lấy dữ liệu dòng mới từ body
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
        const [result] = await connection.query(insertQuery, [tableTam, ...insertValues]);

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
        "CB": "Cơ bản",
        "ATTT": "An toàn thông tin",
        "QS&GDTC": "QS&GDTC",
        "LLCT": "Lý luận chính trị",
        "TTTH": "Trung tâm thực hành",
        "CNTT": "Công nghệ thông tin",
        "ĐTVT": "Điện tử - Viễn thông",
        "MM": "Mật mã"
    };

    try {
        // Kiểm tra dữ liệu đầu vào
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ hoặc rỗng." });
        }

        // Nhóm dữ liệu theo Khoa
        const groupedByKhoa = data.reduce((groups, item) => {
            const khoa = item.Khoa;  // Dùng giá trị của Khoa làm key để nhóm
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
            const khoaName = khoaMap[khoa] || khoa;  // Sử dụng ánh xạ Khoa hoặc giữ nguyên nếu không có ánh xạ

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
                                            alignment: "center",  // Căn giữa dòng
                                            bold: true,  // In đậm dòng "Khoa"
                                        })
                                    ],
                                    columnSpan: orderedKeys.length - 1, // Giảm số cột vì bỏ cột Khoa
                                })
                            ],
                        })
                    ],
                })
            );

            // Tạo bảng cho các học phần trong khoa
            const filteredKeys = orderedKeys.filter(key => key !== "Khoa"); // Loại bỏ cột "Khoa"
            const tableRows = [
                // Header row (sử dụng titleMap)
                new TableRow({
                    children: filteredKeys.map((key) =>
                        new TableCell({
                            children: [new Paragraph({ text: titleMap[key] || key, bold: true })],
                        })
                    ),
                }),
                // Data rows (dùng orderedKeys để sắp xếp thứ tự các cột)
                ...groupedByKhoa[khoa].map((row, index) =>
                    new TableRow({
                        children: filteredKeys.map((key) => {
                            // Nếu là "TT", tạo số thứ tự
                            const cellValue = key === "TT" ? `${index + 1}.` : row[key];
                            return new TableCell({
                                children: [new Paragraph({ text: cellValue !== null ? String(cellValue) : "" })],
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
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.send(buffer);
    } catch (error) {
        console.error("Lỗi khi xuất file docx:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi xuất file docx." });
    }
};

// const editStudentQuanity = async (req, res) => {
//     const data = req.body;  // Nhận dữ liệu từ body
//     console.log("Dữ liệu nhận để cập nhật:", data); // In ra để kiểm tra

//     const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
//     let connection;

//     try {
//         connection = await createPoolConnection(); // Tạo kết nối từ pool

//         // Kiểm tra dữ liệu đầu vào
//         if (!Array.isArray(data) || data.length === 0) {
//             return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ hoặc rỗng." });
//         }

//         // Xây dựng phần CASE trong câu lệnh UPDATE
//         let updateCaseStatements = [];
//         let updateValues = [];
//         let idsToUpdate = [];

//         data.forEach((item) => {
//             const { ID, StudentQuantityUpdate, StudentQuantity } = item;

//             // Kiểm tra nếu ID, StudentQuantityUpdate và StudentQuantity tồn tại
//             if (!ID || StudentQuantityUpdate === undefined || StudentQuantity === undefined) {
//                 throw new Error(`Thiếu ID, StudentQuantityUpdate hoặc StudentQuantity cho bản ghi: ${JSON.stringify(item)}`);
//             }

//             // Sử dụng Regular Expression để trích xuất số từ ID
//             const regex = /-(\d+)-/; // Biểu thức chính quy để tìm số giữa 2 dấu gạch nối
//             const match = ID.match(regex);

//             if (!match) {
//                 throw new Error(`Không thể trích xuất số ID từ: ${ID}`);
//             }

//             const numericID = match[1]; // Lấy phần số từ kết quả regex

//             if (!numericID) {
//                 throw new Error(`Không thể trích xuất số ID từ: ${ID}`);
//             }

//             // Đồng bộ tất cả về định dạng số, nếu rỗng thì trở thành 0
//             const studentQuantityUpdate = StudentQuantityUpdate === '' ? 0 : parseInt(StudentQuantityUpdate, 10);
//             const studentQuantity = StudentQuantity === '' ? 0 : parseInt(StudentQuantity, 10);

//             // Kiểm tra xem StudentQuantityUpdate có khác StudentQuantity không
//             if (studentQuantity !== studentQuantityUpdate) {
//                 console.log('Update ID: ' + ID + ' số sinh viên cũ : ' + studentQuantity + ' số sinh viên mới : ' + studentQuantityUpdate);

//                 // Nếu StudentQuantityUpdate không hợp lệ (NaN), gán giá trị là 0
//                 if (isNaN(studentQuantityUpdate)) {
//                     throw new Error(`Số lượng sinh viên không hợp lệ: ${StudentQuantityUpdate}`);
//                 }

//                 // Xây dựng phần CASE để cập nhật số lượng sinh viên
//                 updateCaseStatements.push(`
//                     WHEN ID = ? THEN ?
//                 `);
//                 updateValues.push(numericID, studentQuantityUpdate); // Thêm giá trị ID và StudentQuantityUpdate
//                 idsToUpdate.push(numericID);  // Thêm ID vào mảng idsToUpdate
//             }
//         });

//         // Nếu không có bản ghi nào cần cập nhật, trả về thông báo
//         if (updateCaseStatements.length === 0) {
//             return res.json({ success: false, message: "Không có lớp nào cập nhật số sinh viên" });
//         }

//         // Nếu chỉ có một ID trong mảng idsToUpdate, biến nó thành mảng để truyền vào IN
//         const idsToUpdateParam = idsToUpdate.length === 1 ? [idsToUpdate[0]] : idsToUpdate;

//         // Xây dựng câu lệnh UPDATE
//         const updateQuery = `
//             UPDATE ?? 
//             SET SoSinhVien = CASE ${updateCaseStatements.join(' ')}
//             ELSE SoSinhVien END
//             WHERE ID IN (?);
//         `;

//         // Thực thi câu lệnh UPDATE
//         await connection.query(updateQuery, [tableTam, ...updateValues, idsToUpdateParam]);

//         res.json({ success: true, message: "Cập nhật số lượng sinh viên thành công." });

//     } catch (error) {
//         console.error("Lỗi khi cập nhật số lượng sinh viên:", error);
//         res.status(500).json({ success: false, message: `Đã xảy ra lỗi khi cập nhật dữ liệu: ${error.message}` });
//     } finally {
//         if (connection) connection.release(); // Giải phóng kết nối về pool
//     }
// };


const editStudentQuanity = async (req, res) => {
    const data = req.body;  // Nhận dữ liệu từ body
    // console.log("Dữ liệu nhận để cập nhật:", data); // In ra để kiểm tra

    const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
    let connection;

    try {
        connection = await createPoolConnection(); // Tạo kết nối từ pool

        // Kiểm tra dữ liệu đầu vào
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ hoặc rỗng." });
        }

        // Xây dựng phần CASE trong câu lệnh UPDATE
        let updateCaseStatements = {
            SoSinhVien: [],
            HeSoLopDong: [],
            QuyChuan: []
        };
        let updateValues = [];
        let idsToUpdate = [];

        data.forEach((item) => {
            const { ID, StudentQuantityUpdate, StudentQuantity, HeSoT7CN, LL } = item;  // Lấy HeSoNgoaiGio từ item

            // Kiểm tra nếu ID, StudentQuantityUpdate và StudentQuantity tồn tại
            if (!ID || StudentQuantityUpdate === undefined || StudentQuantity === undefined) {
                throw new Error(`Thiếu ID, StudentQuantityUpdate hoặc StudentQuantity cho bản ghi: ${JSON.stringify(item)}`);
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
            const studentQuantityUpdate = StudentQuantityUpdate === '' ? 0 : parseInt(StudentQuantityUpdate, 10);
            const studentQuantity = StudentQuantity === '' ? 0 : parseInt(StudentQuantity, 10);

            // Kiểm tra xem StudentQuantityUpdate có khác StudentQuantity không
            if (studentQuantity !== studentQuantityUpdate) {
                console.log('Update ID: ' + ID + ' số sinh viên cũ : ' + studentQuantity + ' số sinh viên mới : ' + studentQuantityUpdate);

                // Nếu StudentQuantityUpdate không hợp lệ (NaN), gán giá trị là 0
                if (isNaN(studentQuantityUpdate)) {
                    throw new Error(`Số lượng sinh viên không hợp lệ: ${StudentQuantityUpdate}`);
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

                idsToUpdate.push(numericID);  // Thêm ID vào mảng idsToUpdate
            }
        });

        // Nếu không có bản ghi nào cần cập nhật, trả về thông báo
        if (updateCaseStatements.SoSinhVien.length === 0) {
            return res.json({ success: false, message: "Không có lớp nào cập nhật số sinh viên" });
        }

        // Nếu chỉ có một ID trong mảng idsToUpdate, biến nó thành mảng để truyền vào IN
        const idsToUpdateParam = idsToUpdate.length === 1 ? [idsToUpdate[0]] : idsToUpdate;

        // Xây dựng câu lệnh UPDATE
        const updateQuery = `
            UPDATE ?? 
            SET 
                SoSinhVien = CASE ${updateCaseStatements.SoSinhVien.join(' ')} ELSE SoSinhVien END,
                HeSoLopDong = CASE ${updateCaseStatements.HeSoLopDong.join(' ')} ELSE HeSoLopDong END,
                QuyChuan = CASE ${updateCaseStatements.QuyChuan.join(' ')} ELSE QuyChuan END
            WHERE ID IN (?);
        `;

        // Thực thi câu lệnh UPDATE
        await connection.query(updateQuery, [tableTam, ...updateValues, idsToUpdateParam]);

        res.json({ success: true, message: "Cập nhật số lượng sinh viên, hệ số và QuyChuan thành công." });

    } catch (error) {
        console.error("Lỗi khi cập nhật số lượng sinh viên:", error);
        res.status(500).json({ success: false, message: `Đã xảy ra lỗi khi cập nhật dữ liệu: ${error.message}` });
    } finally {
        if (connection) connection.release(); // Giải phóng kết nối về pool
    }
};


const quyDoiHeSo = (item) => {
    // Biến để lưu giá trị HeSoLopDong
    let HeSoLopDong = null;

    // Trường hợp tính HeSoLopDong theo số lượng sinh viên
    const StudentQuantityUpdate = item.StudentQuantityUpdate;

    // Quy đổi HeSoLopDong theo số lượng sinh viên
    if (StudentQuantityUpdate <= 40) {
        HeSoLopDong = 1;
    } else if (StudentQuantityUpdate > 40 && StudentQuantityUpdate <= 50) {
        HeSoLopDong = 1.1;
    } else if (StudentQuantityUpdate > 50 && StudentQuantityUpdate <= 65) {
        HeSoLopDong = 1.2;
    } else if (StudentQuantityUpdate > 65 && StudentQuantityUpdate <= 80) {
        HeSoLopDong = 1.3;
    } else if (StudentQuantityUpdate > 80 && StudentQuantityUpdate <= 100) {
        HeSoLopDong = 1.4;
    } else if (StudentQuantityUpdate > 100) {
        HeSoLopDong = 1.5;
    }

    // Trả về kết quả quy đổi
    return {
        HeSoLopDong
    };
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
    editStudentQuanity,
};
