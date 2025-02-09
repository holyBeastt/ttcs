const express = require("express");
const createPoolConnection = require("../config/databasePool");

// render site quy định số giờ nckh cho admin dùng thư viện ejs
const getQuyDinhSoGioNCKH = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const [rows] = await connection.execute('SELECT * FROM quydinhsogionckh');

        if (rows.length === 0) {
            return res.status(404).send('Không có dữ liệu');
        }

        res.render('nckhQuyDinhSoGioNCKH.ejs', { data: rows });
    } catch (err) {
        console.error('Lỗi truy vấn:', err);
        res.status(500).send('Lỗi trong quá trình truy vấn dữ liệu');
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

// lấy bảng đề tài dự án
const getTableDeTaiDuAn = async (req, res) => {

    const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng detaiduan Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        let query;
        const queryParams = [];

        query = `SELECT * FROM detaiduan WHERE NamHoc = ? AND Khoa = ?`;
        queryParams.push(NamHoc, Khoa);


        // Thực hiện truy vấn
        const [results] = await connection.execute(query, queryParams);
        console.log(results)
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
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu giảng viên", error: error.message });
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

// Hàm quy đổi cho đề tài dự án
// const quyDoiSoGioDeTaiDuAn = async (body, MaBang) => {
//     const { capDeTai, chuNhiem, thuKy, thanhVien } = body;

//     let soGioChuNhiem = 0;
//     let soGioThuKy = 0;
//     let soGioThanhVien = [];

//     try {
//         // Tạo kết nối từ pool
//         const connection = await createPoolConnection();

//         // Truy vấn thông tin quy đổi từ bảng quydoisogionckh theo capDeTai
//         const [rows] = await connection.execute(
//             `SELECT * FROM quydinhsogionckh WHERE CapDeTaiDuAn = ?  AND MaBang = ?`,
//             [capDeTai, MaBang]  // Sử dụng giá trị capDeTai từ body để truy vấn
//         );

//         // Kiểm tra nếu có dữ liệu trả về
//         if (rows.length > 0) {
//             const data = rows[0]; // Lấy kết quả đầu tiên từ bảng

//             // Quy đổi giờ cho chủ nhiệm
//             if (chuNhiem) {
//                 soGioChuNhiem = parseFloat(data.ChuNhiem) || 0;  // Ánh xạ số giờ cho chủ nhiệm
//             }

//             // Quy đổi giờ cho thư ký
//             if (thuKy) {
//                 soGioThuKy = parseFloat(data.ThuKy) || 0;  // Ánh xạ số giờ cho thư ký
//             }

//             // Quy đổi giờ cho thành viên
//             if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
//                 const gioThanhVien = parseFloat(data.ThanhVien) / thanhVien.length; // Chia đều giờ cho thành viên
//                 soGioThanhVien = thanhVien.map(() => parseFloat(gioThanhVien.toFixed(2)));
//             }
//         } else {
//             throw new Error("Không tìm thấy dữ liệu quy đổi cho cấp đề tài này.");
//         }

//         // Đóng kết nối
//         connection.release(); // Giải phóng kết nối sau khi hoàn thành

//         // Tách và format thông tin của chủ nhiệm
//         if (chuNhiem) {
//             const { name, unit } = extractNameAndUnit(chuNhiem);
//             body.chuNhiem = `${name} (${unit} - ${soGioChuNhiem.toFixed(2)} giờ)`.trim();
//         }

//         // Tách và format thông tin của thư ký
//         if (thuKy) {
//             const { name, unit } = extractNameAndUnit(thuKy);
//             body.thuKy = `${name} (${unit} - ${soGioThuKy.toFixed(2)} giờ)`.trim();
//         }

//         // Tách và format thông tin của thành viên
//         if (thanhVien && Array.isArray(thanhVien)) {
//             body.thanhVien = thanhVien.map((member, index) => {
//                 const { name, unit } = extractNameAndUnit(member);
//                 return `${name} (${unit} - ${soGioThanhVien[index]} giờ)`.trim();
//             }).join(", ");
//         }

//         // Trả về body đã được cập nhật
//         return body;

//     } catch (error) {
//         console.error("Lỗi khi quy đổi số giờ:", error);
//         throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn
//     }
// };

const quyDoiSoGioDeTaiDuAn = async (body, MaBang) => {
    const { capDeTai, chuNhiem, thuKy, thanhVien } = body;

    let soGioChuNhiem = 0;
    let soGioThuKy = 0;
    let soGioThanhVien = [];

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Truy vấn thông tin quy đổi từ bảng quydinhsogionckh theo capDeTai
        const [rows] = await connection.execute(
            `SELECT * FROM quydinhsogionckh WHERE CapDeTaiDuAn = ? AND MaBang = ?`,
            [capDeTai, MaBang]
        );

        // Kiểm tra nếu có dữ liệu trả về
        if (rows.length > 0) {
            const data = rows[0]; // Lấy kết quả đầu tiên từ bảng

            // Quy đổi giờ cho chủ nhiệm
            if (chuNhiem) {
                soGioChuNhiem = parseFloat(data.ChuNhiem) || 0;
            }

            // Quy đổi giờ cho thư ký
            if (thuKy) {
                soGioThuKy = parseFloat(data.ThuKy) || 0;
            }

            // Quy đổi giờ cho thành viên
            if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
                const gioThanhVien = (parseFloat(data.ThanhVien) || 0) / thanhVien.length;
                soGioThanhVien = thanhVien.map(() => parseFloat(gioThanhVien.toFixed(2)));
            }
        } else {
            throw new Error("Không tìm thấy dữ liệu quy đổi cho cấp đề tài này.");
        }

        // Đóng kết nối
        connection.release();

        // Tách và format thông tin của chủ nhiệm
        if (chuNhiem) {
            const { name, unit } = extractNameAndUnit(chuNhiem);
            body.chuNhiem = `${name} (${unit} - ${soGioChuNhiem.toFixed(2)} giờ)`.trim();
        }

        // Tách và format thông tin của thư ký
        if (thuKy) {
            const { name, unit } = extractNameAndUnit(thuKy);
            body.thuKy = `${name} (${unit} - ${soGioThuKy.toFixed(2)} giờ)`.trim();
        }

        // Tách và format thông tin của thành viên
        if (thanhVien && Array.isArray(thanhVien)) {
            body.thanhVien = thanhVien.map((member, index) => {
                const { name, unit } = extractNameAndUnit(member);
                return `${name} (${unit} - ${soGioThanhVien[index].toFixed(2)} giờ)`.trim();
            }).join(", ");
        }

        // Trả về body đã được cập nhật
        return body;

    } catch (error) {
        console.error("Lỗi khi quy đổi số giờ:", error);
        throw error;
    }
};


// Thêm đề tài dự án
const saveDeTaiDuAn = async (req, res) => {
    const data = await quyDoiSoGioDeTaiDuAn(req.body, 'detaiduan')
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
    } = data;

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng detaiduan
        await connection.execute(
            `
INSERT INTO detaiduan (
CapDeTai, NamHoc, TenDeTai, MaSoDeTai, ChuNhiem, ThuKy, NgayNghiemThu, Khoa, DanhSachThanhVien
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm đề tài dự án thành công')
        res.status(200).json({
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
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// Lấy bảng đề tài dự án
const getTableBaiBaoKhoaHoc = async (req, res) => {

    const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng baibaokhoahoc Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        let query;
        const queryParams = [];

        query = `SELECT * FROM baibaokhoahoc WHERE NamHoc = ? AND Khoa = ?`;
        queryParams.push(NamHoc, Khoa);

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

// Quy đổi số giờ bài báo khoa học
// const quyDoiSoGioBaiBaoKhoaHoc = async (body, MaBang) => {
//     const {
//         loaiTapChi,
//         tacGia,
//         tacGiaCtn,
//         danhSachThanhVien
//     } = body;

//     let SoGio = 0;  // Số giờ sẽ lấy từ cơ sở dữ liệu
//     let SoGioTacGia = 0;
//     let SoGioTacGiaCtn = 0;
//     let SoGioThanhVien = [];

//     try {
//         // Tạo kết nối từ pool (cần có hàm tạo kết nối cơ sở dữ liệu, ví dụ như createPoolConnection)
//         const connection = await createPoolConnection();

//         // Truy vấn số giờ tương ứng với loại tạp chí từ cơ sở dữ liệu
//         const [rows] = await connection.execute(
//             `SELECT SoGio FROM quydinhsogionckh WHERE LoaiTapChi = ? AND MaBang = ?`,
//             [loaiTapChi, MaBang]  // Sử dụng giá trị loaiTapChi từ body để truy vấn
//         );

//         // Kiểm tra nếu có dữ liệu trả về
//         if (rows.length > 0) {
//             SoGio = parseFloat(rows[0].SoGio) || 0; // Lấy số giờ từ kết quả trả về
//         } else {
//             throw new Error("Không tìm thấy thông tin số giờ cho loại tạp chí này.");
//         }

//         // Đóng kết nối sau khi hoàn thành
//         connection.release();

//         // Trường hợp có 1 tác giả chính và không có tác giả chịu trách nhiệm và thành viên
//         if (tacGia && !tacGiaCtn && !danhSachThanhVien) {
//             SoGioTacGia = SoGio; // Tác giả chính nhận 100% số giờ
//         }
//         // Trường hợp có 1 tác giả chính, 1 tác giả chịu trách nhiệm, và có thành viên
//         else if (tacGia && tacGiaCtn && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
//             let totalParticipants = 2 + danhSachThanhVien.length; // Tổng số người tham gia (2 tác giả + thành viên)

//             // Tác giả chính nhận 20% số giờ
//             SoGioTacGia = (SoGio * 0.2);

//             // Tác giả chịu trách nhiệm nhận 20% số giờ
//             SoGioTacGiaCtn = (SoGio * 0.2);

//             // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính và tác giả chịu trách nhiệm
//             let SoGioPerMember = (SoGio * 0.6) / totalParticipants;

//             // Gán số giờ cho thành viên
//             SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);

//             // Cộng số giờ cho tác giả chính và tác giả chịu trách nhiệm
//             SoGioTacGia += SoGioPerMember; // Tác giả chính cũng nhận phần của thành viên
//             SoGioTacGiaCtn += SoGioPerMember; // Tác giả chịu trách nhiệm cũng nhận phần của thành viên
//         }
//         // Trường hợp có 1 tác giả chính, không có tác giả chịu trách nhiệm và có thành viên
//         else if (tacGia && !tacGiaCtn && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
//             // Tác giả chính nhận 40% số giờ
//             SoGioTacGia = (SoGio * 0.4);

//             // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính
//             let SoGioPerMember = (SoGio * 0.6) / (danhSachThanhVien.length + 1); // +1 vì tính cả tác giả chính

//             // Gán số giờ cho thành viên
//             SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);

//             // Cộng số giờ cho tác giả chính
//             SoGioTacGia += SoGioPerMember; // Tác giả chính cũng nhận phần của thành viên
//         }

//         // Tách và format thông tin của tác giả chính
//         if (tacGia) {
//             const { name, unit } = extractNameAndUnit(tacGia);
//             body.tacGia = `${name} (${unit} - ${SoGioTacGia} giờ)`.trim();
//         }

//         // Tách và format thông tin của tác giả chịu trách nhiệm
//         if (tacGiaCtn) {
//             const { name, unit } = extractNameAndUnit(tacGiaCtn);
//             body.tacGiaCtn = `${name} (${unit} - ${SoGioTacGiaCtn} giờ)`.trim();
//         }

//         // Tách và format thông tin của thành viên
//         if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
//             body.thanhVien = danhSachThanhVien.map((member, index) => {
//                 const { name, unit } = extractNameAndUnit(member);
//                 return `${name} (${unit} - ${SoGioThanhVien[index]} giờ)`.trim();
//             }).join(", ");
//         }

//         // Trả về body đã được cập nhật
//         return body;

//     } catch (error) {
//         console.error("Lỗi khi quy đổi số giờ bài báo khoa học:", error);
//         throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn hoặc xử lý
//     }
// };

const quyDoiSoGioBaiBaoKhoaHoc = async (body, MaBang) => {
    const {
        loaiTapChi,
        tacGia,
        tacGiaCtn,
        danhSachThanhVien
    } = body;

    let SoGio = 0;  // Số giờ sẽ lấy từ cơ sở dữ liệu
    let SoGioTacGia = 0;
    let SoGioTacGiaCtn = 0;
    let SoGioThanhVien = [];

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Truy vấn số giờ từ cơ sở dữ liệu
        const [rows] = await connection.execute(
            `SELECT SoGio FROM quydinhsogionckh WHERE LoaiTapChi = ? AND MaBang = ?`,
            [loaiTapChi, MaBang]
        );

        if (rows.length > 0) {
            SoGio = parseFloat(rows[0].SoGio) || 0;
        } else {
            throw new Error("Không tìm thấy thông tin số giờ cho loại tạp chí này.");
        }

        // Đóng kết nối sau khi hoàn thành
        connection.release();

        // Trường hợp chỉ có tác giả chính
        if (tacGia && !tacGiaCtn && !danhSachThanhVien) {
            SoGioTacGia = SoGio;
        }
        // Trường hợp có tác giả chính, tác giả chịu trách nhiệm và thành viên
        else if (tacGia && tacGiaCtn && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
            let totalParticipants = 2 + danhSachThanhVien.length;

            SoGioTacGia = (SoGio * 0.2);
            SoGioTacGiaCtn = (SoGio * 0.2);

            let SoGioPerMember = (SoGio * 0.6) / totalParticipants;
            SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);

            SoGioTacGia += SoGioPerMember;
            SoGioTacGiaCtn += SoGioPerMember;
        }
        // Trường hợp có tác giả chính và thành viên, không có tác giả chịu trách nhiệm
        else if (tacGia && !tacGiaCtn && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
            SoGioTacGia = (SoGio * 0.4);
            let SoGioPerMember = (SoGio * 0.6) / (danhSachThanhVien.length + 1);

            SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);
            SoGioTacGia += SoGioPerMember;
        }

        // Làm tròn số giờ đến 2 chữ số sau dấu phẩy
        SoGioTacGia = parseFloat(SoGioTacGia.toFixed(2));
        SoGioTacGiaCtn = parseFloat(SoGioTacGiaCtn.toFixed(2));
        SoGioThanhVien = SoGioThanhVien.map(soGio => parseFloat(soGio.toFixed(2)));

        // Tách và format thông tin của tác giả chính
        if (tacGia) {
            const { name, unit } = extractNameAndUnit(tacGia);
            body.tacGia = `${name} (${unit} - ${SoGioTacGia.toFixed(2)} giờ)`.trim();
        }

        // Tách và format thông tin của tác giả chịu trách nhiệm
        if (tacGiaCtn) {
            const { name, unit } = extractNameAndUnit(tacGiaCtn);
            body.tacGiaCtn = `${name} (${unit} - ${SoGioTacGiaCtn.toFixed(2)} giờ)`.trim();
        }

        // Tách và format thông tin của thành viên
        if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
            body.thanhVien = danhSachThanhVien.map((member, index) => {
                const { name, unit } = extractNameAndUnit(member);
                return `${name} (${unit} - ${SoGioThanhVien[index].toFixed(2)} giờ)`.trim();
            }).join(", ");
        }

        // Trả về body đã được cập nhật
        return body;

    } catch (error) {
        console.error("Lỗi khi quy đổi số giờ bài báo khoa học:", error);
        throw error;
    }
};


// Thêm bài báo khoa học
const saveBaiBaoKhoaHoc = async (req, res) => {
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

    const updatedBody = await quyDoiSoGioBaiBaoKhoaHoc(body, 'baibaokhoahoc'); // Gọi hàm quy đổi
    console.log(updatedBody);
    // Cập nhật lại thông tin từ hàm quy đổi vào body
    const { tacGia: tacGiaUpdated, tacGiaCtn: tacGiaCtnUpdated, thanhVien: thanhVienUpdated } = updatedBody;

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
        console.log('Thêm bài báo khoa học thành công');
        res.status(200).json({
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
    const quyDoiResult = await quyDoiSoGioBangSangCheVaGiaiThuong({
        loaiBangSangChe: phanLoai,
        tacGia,
        danhSachThanhVien: thanhVien
    }, 'bangsangchevagiaithuong');

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

        // Trả về phản hồi thành công cho client
        console.log('Thêm bằng sáng chế và giải thưởng thành công');
        res.status(200).json({
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

        query = `SELECT * FROM bangsangchevagiaithuong WHERE NamHoc = ? AND Khoa = ?`;
        queryParams.push(NamHoc, Khoa);

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

// Quy đổi số giờ bằng sáng chế và giải thưởng
// const quyDoiSoGioBangSangCheVaGiaiThuong = async (body, MaBang) => {
//     const { loaiBangSangChe, tacGia, danhSachThanhVien } = body;

//     let SoGio = 0;  // Số giờ sẽ lấy từ cơ sở dữ liệu
//     let SoGioTacGia = 0;
//     let SoGioThanhVien = [];

//     try {
//         // Tạo kết nối từ pool (cần có hàm tạo kết nối cơ sở dữ liệu, ví dụ như createPoolConnection)
//         const connection = await createPoolConnection();

//         // Truy vấn số giờ tương ứng với loại bằng sáng chế hoặc giải thưởng từ cơ sở dữ liệu
//         const [rows] = await connection.execute(
//             `SELECT SoGio FROM quydinhsogionckh WHERE BangSangCheGiaiThuong = ? AND MaBang = ?`,
//             [loaiBangSangChe, MaBang]  // Sử dụng giá trị loaiBangSangChe từ body để truy vấn
//         );

//         // Kiểm tra nếu có dữ liệu trả về
//         if (rows.length > 0) {
//             SoGio = parseFloat(rows[0].SoGio) || 0; // Lấy số giờ từ kết quả trả về
//         } else {
//             throw new Error("Không tìm thấy thông tin số giờ cho loại bằng sáng chế hoặc giải thưởng này.");
//         }

//         // Đóng kết nối sau khi hoàn thành
//         connection.release();

//         // Trường hợp có 1 tác giả chính và không có thành viên
//         if (tacGia && !danhSachThanhVien) {
//             SoGioTacGia = SoGio; // Tác giả chính nhận 100% số giờ
//         }
//         // Trường hợp có 1 tác giả chính và có thành viên
//         else if (tacGia && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
//             // Tổng số người tham gia (1 tác giả + thành viên)
//             let totalParticipants = 1 + danhSachThanhVien.length; // Tính tổng số người tham gia

//             // Tác giả chính nhận 40% số giờ
//             SoGioTacGia = (SoGio * 0.4);

//             // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính
//             let SoGioPerMember = (SoGio * 0.6) / totalParticipants;

//             // Gán số giờ cho thành viên
//             SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);

//             // Cộng số giờ cho tác giả chính
//             SoGioTacGia += SoGioPerMember; // Tác giả chính cũng nhận phần của thành viên
//         }

//         // Tách và format thông tin của tác giả chính
//         if (tacGia) {
//             const { name, unit } = extractNameAndUnit(tacGia);
//             body.tacGia = `${name} (${unit} - ${SoGioTacGia} giờ)`.trim();
//         }

//         // Tách và format thông tin của thành viên
//         if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
//             body.thanhVien = danhSachThanhVien.map((member, index) => {
//                 const { name, unit } = extractNameAndUnit(member);
//                 return `${name} (${unit} - ${SoGioThanhVien[index]} giờ)`.trim();
//             }).join(", ");
//         }

//         // Trả về body đã được cập nhật
//         return body;

//     } catch (error) {
//         console.error("Lỗi khi quy đổi số giờ bằng sáng chế và giải thưởng:", error);
//         throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn hoặc xử lý
//     }
// };

const quyDoiSoGioBangSangCheVaGiaiThuong = async (body, MaBang) => {
    const { loaiBangSangChe, tacGia, danhSachThanhVien } = body;

    let SoGio = 0;
    let SoGioTacGia = 0;
    let SoGioThanhVien = [];

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Truy vấn số giờ tương ứng với loại bằng sáng chế hoặc giải thưởng từ cơ sở dữ liệu
        const [rows] = await connection.execute(
            `SELECT SoGio FROM quydinhsogionckh WHERE BangSangCheGiaiThuong = ? AND MaBang = ?`,
            [loaiBangSangChe, MaBang]
        );

        // Kiểm tra nếu có dữ liệu trả về
        if (rows.length > 0) {
            SoGio = parseFloat(rows[0].SoGio) || 0;
        } else {
            throw new Error("Không tìm thấy thông tin số giờ cho loại bằng sáng chế hoặc giải thưởng này.");
        }

        // Đóng kết nối
        connection.release();

        // Trường hợp có 1 tác giả chính và không có thành viên
        if (tacGia && !danhSachThanhVien) {
            SoGioTacGia = SoGio;
        }
        // Trường hợp có 1 tác giả chính và có thành viên
        else if (tacGia && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
            let totalParticipants = 1 + danhSachThanhVien.length; // Tổng số người tham gia

            // Tác giả chính nhận 40% số giờ
            SoGioTacGia = parseFloat((SoGio * 0.4).toFixed(2));

            // 60% còn lại chia đều cho tất cả thành viên (kể cả tác giả)
            let SoGioPerMember = parseFloat(((SoGio * 0.6) / totalParticipants).toFixed(2));

            // Gán số giờ cho thành viên
            SoGioThanhVien = Array(danhSachThanhVien.length).fill(SoGioPerMember);

            // Cộng số giờ cho tác giả chính
            SoGioTacGia += SoGioPerMember;
        }

        // Tách và format thông tin của tác giả chính
        if (tacGia) {
            const { name, unit } = extractNameAndUnit(tacGia);
            body.tacGia = `${name} (${unit} - ${SoGioTacGia.toFixed(2)} giờ)`.trim();
        }

        // Tách và format thông tin của thành viên
        if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
            body.thanhVien = danhSachThanhVien.map((member, index) => {
                const { name, unit } = extractNameAndUnit(member);
                return `${name} (${unit} - ${SoGioThanhVien[index].toFixed(2)} giờ)`.trim();
            }).join(", ");
        }

        return body;

    } catch (error) {
        console.error("Lỗi khi quy đổi số giờ bằng sáng chế và giải thưởng:", error);
        throw error;
    }
};


// Thêm sách và giáo trình
const saveSachVaGiaoTrinh = async (req, res) => {
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
    } = req.body;
    console.log(req.body)


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
    const quyDoiKetQua = await quyDoiSachVaGiaoTrinh(body, 'sachvagiaotrinh');

    // Trích xuất kết quả sau khi quy đổi
    const {
        tacGia: tacGiaFormatted,
        dongChuBien: dongChuBienFormatted,
        thanhVien: thanhVienFormatted,
    } = quyDoiKetQua;
    console.log(quyDoiKetQua)

    // Kết nối với cơ sở dữ liệu
    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng sachvagiaotrinh
        await connection.execute(
            `
INSERT INTO sachvagiaotrinh (
PhanLoai, NamHoc, TenSachVaGiaoTrinh, SoXuatBan, SoTrang, TacGia, DongChuBien, DanhSachThanhVien, Khoa
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm sách và giáo trình thành công');
        res.status(200).json({
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
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// const quyDoiSachVaGiaoTrinh = async (body, MaBang) => {
//     const {
//         phanLoai,
//         tacGia,
//         dongChuBien, // Thay 'tacGiaCtn' thành 'dongChuBien'
//         danhSachThanhVien
//     } = body;

//     let soGio = 0;  // Số giờ sẽ lấy từ cơ sở dữ liệu
//     let soGioTacGia = 0;
//     let soGioDongChuBien = 0; // Cập nhật biến tên theo yêu cầu
//     let soGioThanhVien = [];

//     try {
//         // Tạo kết nối từ pool (cần có hàm tạo kết nối cơ sở dữ liệu, ví dụ như createPoolConnection)
//         const connection = await createPoolConnection();

//         // Truy vấn số giờ tương ứng với loại sách/giáo trình và mã bằng từ cơ sở dữ liệu
//         const [rows] = await connection.execute(
//             `SELECT SoGio FROM quydinhsogionckh WHERE SachGiaoTrinh = ? AND MaBang = ?`,
//             [phanLoai, MaBang]  // Sử dụng giá trị phanLoai và MaBang từ body để truy vấn
//         );

//         // Kiểm tra nếu có dữ liệu trả về
//         if (rows.length > 0) {
//             soGio = parseFloat(rows[0].SoGio) || 0; // Lấy số giờ từ kết quả trả về
//         } else {
//             throw new Error("Không tìm thấy thông tin số giờ cho loại sách/giáo trình này.");
//         }

//         // Đóng kết nối sau khi hoàn thành
//         connection.release();

//         // Trường hợp có 1 tác giả chính và không có tác giả chịu trách nhiệm và thành viên
//         if (tacGia && !dongChuBien && !danhSachThanhVien) {
//             soGioTacGia = soGio; // Tác giả chính nhận 100% số giờ
//         }
//         // Trường hợp có 1 tác giả chính, 1 tác giả chịu trách nhiệm, và có thành viên
//         else if (tacGia && dongChuBien && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
//             let totalParticipants = 2 + danhSachThanhVien.length; // Tổng số người tham gia (2 tác giả + thành viên)

//             // Tác giả chính nhận 20% số giờ
//             soGioTacGia = (soGio * 0.2);

//             // Dong chu bien nhận 20% số giờ
//             soGioDongChuBien = (soGio * 0.2);

//             // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính và tác giả chịu trách nhiệm
//             let soGioPerMember = (soGio * 0.6) / totalParticipants;

//             // Gán số giờ cho thành viên
//             soGioThanhVien = Array(danhSachThanhVien.length).fill(soGioPerMember);

//             // Cộng số giờ cho tác giả chính và tác giả chịu trách nhiệm
//             soGioTacGia += soGioPerMember; // Tác giả chính cũng nhận phần của thành viên
//             soGioDongChuBien += soGioPerMember; // Dong chu bien cũng nhận phần của thành viên
//         }
//         // Trường hợp có 1 tác giả chính, không có tác giả chịu trách nhiệm và có thành viên
//         else if (tacGia && !dongChuBien && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
//             // Tác giả chính nhận 40% số giờ
//             soGioTacGia = (soGio * 0.4);

//             // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính
//             let soGioPerMember = (soGio * 0.6) / (danhSachThanhVien.length + 1); // +1 vì tính cả tác giả chính

//             // Gán số giờ cho thành viên
//             soGioThanhVien = Array(danhSachThanhVien.length).fill(soGioPerMember);

//             // Cộng số giờ cho tác giả chính
//             soGioTacGia += soGioPerMember; // Tác giả chính cũng nhận phần của thành viên
//         }

//         // Tách và format thông tin của tác giả chính
//         if (tacGia) {
//             const { name, unit } = extractNameAndUnit(tacGia);
//             body.tacGia = `${name} (${unit} - ${soGioTacGia} giờ)`.trim();
//         }

//         // Tách và format thông tin của dong chu bien
//         if (dongChuBien) {
//             const { name, unit } = extractNameAndUnit(dongChuBien);
//             body.dongChuBien = `${name} (${unit} - ${soGioDongChuBien} giờ)`.trim(); // Thay 'tacGiaCtn' thành 'dongChuBien'
//         }

//         // Tách và format thông tin của thành viên
//         if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
//             body.thanhVien = danhSachThanhVien.map((member, index) => {
//                 const { name, unit } = extractNameAndUnit(member);
//                 return `${name} (${unit} - ${soGioThanhVien[index]} giờ)`.trim();
//             }).join(", ");
//         }

//         // Trả về body đã được cập nhật
//         return body;

//     } catch (error) {
//         console.error("Lỗi khi quy đổi số giờ sách và giáo trình:", error);
//         throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn hoặc xử lý
//     }
// };

const quyDoiSachVaGiaoTrinh = async (body, MaBang) => {
    const {
        phanLoai,
        tacGia,
        dongChuBien,
        danhSachThanhVien
    } = body;

    let soGio = 0;
    let soGioTacGia = 0;
    let soGioDongChuBien = 0;
    let soGioThanhVien = [];

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Truy vấn số giờ từ cơ sở dữ liệu
        const [rows] = await connection.execute(
            `SELECT SoGio FROM quydinhsogionckh WHERE SachGiaoTrinh = ? AND MaBang = ?`,
            [phanLoai, MaBang]
        );

        // Kiểm tra nếu có dữ liệu trả về
        if (rows.length > 0) {
            soGio = parseFloat(rows[0].SoGio) || 0;
        } else {
            throw new Error("Không tìm thấy thông tin số giờ cho loại sách/giáo trình này.");
        }

        // Đóng kết nối
        connection.release();

        // Trường hợp có 1 tác giả chính và không có đồng chủ biên và thành viên
        if (tacGia && !dongChuBien && !danhSachThanhVien) {
            soGioTacGia = soGio;
        }
        // Trường hợp có 1 tác giả chính, 1 đồng chủ biên và có thành viên
        else if (tacGia && dongChuBien && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
            let totalParticipants = 2 + danhSachThanhVien.length;

            // Tác giả chính và đồng chủ biên nhận mỗi người 20% số giờ
            soGioTacGia = parseFloat((soGio * 0.2).toFixed(2));
            soGioDongChuBien = parseFloat((soGio * 0.2).toFixed(2));

            // 60% còn lại chia đều cho tất cả thành viên (bao gồm cả tác giả chính và đồng chủ biên)
            let soGioPerMember = parseFloat(((soGio * 0.6) / totalParticipants).toFixed(2));

            // Gán số giờ cho thành viên
            soGioThanhVien = Array(danhSachThanhVien.length).fill(soGioPerMember);

            // Cộng số giờ cho tác giả chính và đồng chủ biên
            soGioTacGia += soGioPerMember;
            soGioDongChuBien += soGioPerMember;
        }
        // Trường hợp có 1 tác giả chính, không có đồng chủ biên nhưng có thành viên
        else if (tacGia && !dongChuBien && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
            soGioTacGia = parseFloat((soGio * 0.4).toFixed(2));

            // 60% còn lại chia đều cho tất cả thành viên (bao gồm cả tác giả chính)
            let soGioPerMember = parseFloat(((soGio * 0.6) / (danhSachThanhVien.length + 1)).toFixed(2));

            // Gán số giờ cho thành viên
            soGioThanhVien = Array(danhSachThanhVien.length).fill(soGioPerMember);

            // Cộng số giờ cho tác giả chính
            soGioTacGia += soGioPerMember;
        }

        // Tách và format thông tin của tác giả chính
        if (tacGia) {
            const { name, unit } = extractNameAndUnit(tacGia);
            body.tacGia = `${name} (${unit} - ${soGioTacGia.toFixed(2)} giờ)`.trim();
        }

        // Tách và format thông tin của đồng chủ biên
        if (dongChuBien) {
            const { name, unit } = extractNameAndUnit(dongChuBien);
            body.dongChuBien = `${name} (${unit} - ${soGioDongChuBien.toFixed(2)} giờ)`.trim();
        }

        // Tách và format thông tin của thành viên
        if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
            body.thanhVien = danhSachThanhVien.map((member, index) => {
                const { name, unit } = extractNameAndUnit(member);
                return `${name} (${unit} - ${soGioThanhVien[index].toFixed(2)} giờ)`.trim();
            }).join(", ");
        }

        return body;

    } catch (error) {
        console.error("Lỗi khi quy đổi số giờ sách và giáo trình:", error);
        throw error;
    }
};


// Lấy bảng sách và giáo trình
const getTableSachVaGiaoTrinh = async (req, res) => {

    const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng sachvagiaotrinh Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        let query;
        const queryParams = [];

        // Truy vấn dữ liệu từ bảng sachvagiaotrinh
        query = `SELECT * FROM sachvagiaotrinh WHERE NamHoc = ? AND Khoa = ?`;
        queryParams.push(NamHoc, Khoa);

        // Thực hiện truy vấn
        const [results] = await connection.execute(query, queryParams);

        // Trả về kết quả dưới dạng JSON
        res.json(results); // results chứa dữ liệu trả về
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
    // Lấy dữ liệu từ body
    const {
        phanLoai, // Phân loại
        namHoc,
        tenDeTai, // Tên đề tài
        soQDGiaoNhiemVu, // Số quyết định công nhận
        ngayQDGiaoNhiemVu, // Ngày quyết định công nhận
        thanhVien, // Đây là một mảng từ client
        khoa,
    } = req.body;

    // Gọi hàm quy đổi
    const quyDoiResult = await quyDoiSoGioNckhVaHuanLuyen({
        phanLoai,
        danhSachThanhVien: thanhVien
    }, 'nckhvahuanluyendoituyen');

    // Lấy kết quả sau khi quy đổi
    const thanhVienFormatted = quyDoiResult.thanhVien || "";

    console.log(thanhVienFormatted)

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng NCKH và huấn luyện đội tuyển
        await connection.execute(
            `
INSERT INTO nckhvahuanluyendoituyen (
PhanLoai, NamHoc, TenDeTai, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, DanhSachThanhVien, Khoa
)
VALUES (?, ?, ?, ?, ?, ?, ?)
`,
            [
                phanLoai, // Phân loại
                namHoc,
                tenDeTai, // Tên đề tài
                soQDGiaoNhiemVu, // Số quyết định công nhận
                ngayQDGiaoNhiemVu, // Ngày quyết định công nhận
                thanhVienFormatted, // Danh sách thành viên đã được format
                khoa,
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm NCKH và huấn luyện đội tuyển thành công');
        res.status(200).json({
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
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// const quyDoiSoGioNckhVaHuanLuyen = async (body, MaBang) => {
//     const { phanLoai, danhSachThanhVien } = body;

//     let totalHours = 0;  // Số giờ quy đổi sẽ lấy từ cơ sở dữ liệu
//     let thanhVienResult = "";

//     try {
//         // Tạo kết nối từ pool (cần có hàm tạo kết nối cơ sở dữ liệu, ví dụ như createPoolConnection)
//         const connection = await createPoolConnection();

//         // Truy vấn số giờ tương ứng với loại NCKH và Huấn luyện từ cơ sở dữ liệu
//         const [rows] = await connection.execute(
//             `SELECT SoGio FROM quydinhsogionckh WHERE NCKHHuanLuyenDoiTuyen = ? AND MaBang = ?`,
//             [phanLoai, MaBang]  // Sử dụng giá trị phanLoai và MaBang từ body để truy vấn
//         );

//         // Kiểm tra nếu có dữ liệu trả về
//         if (rows.length > 0) {
//             totalHours = parseFloat(rows[0].SoGio) || 0; // Lấy số giờ từ kết quả trả về
//         } else {
//             throw new Error("Không tìm thấy thông tin số giờ cho loại NCKH và Huấn luyện này.");
//         }

//         // Đóng kết nối sau khi hoàn thành
//         connection.release();

//         // Tổng số người tham gia (danh sách thành viên)
//         const participants = danhSachThanhVien && Array.isArray(danhSachThanhVien) ? danhSachThanhVien : [];

//         // Tính số giờ chia đều cho các thành viên
//         const hoursPerMember = participants.length > 0
//             ? Math.floor(totalHours / participants.length)
//             : 0;

//         // Xử lý format đầu ra
//         participants.forEach((participant, index) => {
//             // Tách tên và đơn vị
//             let name = participant;
//             let unit = "";
//             if (participant.includes(" - ")) {
//                 const split = participant.split(" - ");
//                 name = split[0].trim();
//                 unit = split[1].trim();
//             }

//             const formatted = `${name} (${unit} - ${hoursPerMember} giờ)`;

//             // Gán vào danh sách thành viên
//             thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
//         });

//         // Kết quả cuối cùng
//         return {
//             thanhVien: thanhVienResult || null,
//         };

//     } catch (error) {
//         console.error("Lỗi khi quy đổi số giờ NCKH và Huấn luyện:", error);
//         throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn hoặc xử lý
//     }
// };

const quyDoiSoGioNckhVaHuanLuyen = async (body, MaBang) => {
    const { phanLoai, danhSachThanhVien } = body;

    let totalHours = 0;  // Số giờ quy đổi sẽ lấy từ cơ sở dữ liệu
    let thanhVienResult = "";

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Truy vấn số giờ tương ứng với loại NCKH và Huấn luyện từ cơ sở dữ liệu
        const [rows] = await connection.execute(
            `SELECT SoGio FROM quydinhsogionckh WHERE NCKHHuanLuyenDoiTuyen = ? AND MaBang = ?`,
            [phanLoai, MaBang]
        );

        // Kiểm tra nếu có dữ liệu trả về
        if (rows.length > 0) {
            totalHours = parseFloat(rows[0].SoGio) || 0; // Lấy số giờ từ kết quả trả về
        } else {
            throw new Error("Không tìm thấy thông tin số giờ cho loại NCKH và Huấn luyện này.");
        }

        // Đóng kết nối sau khi hoàn thành
        connection.release();

        // Tổng số người tham gia (danh sách thành viên)
        const participants = danhSachThanhVien && Array.isArray(danhSachThanhVien) ? danhSachThanhVien : [];

        // Tính số giờ chia đều cho các thành viên, làm tròn đến 2 chữ số
        const hoursPerMember = participants.length > 0
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

            const formatted = `${name} (${unit} - ${hoursPerMember.toFixed(2)} giờ)`;

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
    }
};


// Lấy bảng nckh và huấn luyện đội tuyển
const getTableNckhVaHuanLuyenDoiTuyen = async (req, res) => {

    const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng nckhvahuanluyendoituyen Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        let query;
        const queryParams = [];

        // Truy vấn dữ liệu từ bảng nckhvahuanluyendoituyen
        query = `SELECT * FROM nckhvahuanluyendoituyen WHERE NamHoc = ? AND Khoa = ?`;
        queryParams.push(NamHoc, Khoa);

        // Thực hiện truy vấn
        const [results] = await connection.execute(query, queryParams);

        // Trả về kết quả dưới dạng JSON
        res.json(results); // results chứa dữ liệu trả về
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
    } = req.body;

    // Gọi hàm quy đổi
    const quyDoiResult = await quyDoiSoGioXayDungChuongTrinhDaoTao({
        phanLoai,
        danhSachThanhVien: thanhVien,
        soTC
    }, 'xaydungctdt');

    // Lấy kết quả sau khi quy đổi
    const thanhVienFormatted = quyDoiResult.thanhVien || "";

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng xaydungctdt
        await connection.execute(
            `
INSERT INTO xaydungctdt (
HinhThucXayDung, NamHoc, TenChuongTrinh, SoTC, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, DanhSachThanhVien, Khoa
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm xây dựng CTĐT thành công');
        res.status(200).json({
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
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// const quyDoiSoGioXayDungChuongTrinhDaoTao = async (body, MaBang) => {
//     const { phanLoai, danhSachThanhVien, soTC } = body;

//     // Kiểm tra đầu vào `soTC`, nếu không hợp lệ thì mặc định là 0
//     const validSoTC = Number.isInteger(parseInt(soTC)) && parseInt(soTC) > 0 ? parseInt(soTC) : 0;

//     let totalHours = 0;  // Số giờ quy đổi sẽ lấy từ cơ sở dữ liệu
//     let thanhVienResult = "";

//     try {
//         // Tạo kết nối từ pool (cần có hàm tạo kết nối cơ sở dữ liệu, ví dụ như createPoolConnection)
//         const connection = await createPoolConnection();

//         // Truy vấn số giờ tương ứng với loại công việc từ cơ sở dữ liệu
//         const [rows] = await connection.execute(
//             `SELECT SoGio FROM quydinhsogionckh WHERE XayDungCTDT = ? AND MaBang = ?`,
//             [phanLoai, MaBang]  // Sử dụng giá trị phanLoai và MaBang từ body để truy vấn
//         );

//         // Kiểm tra nếu có dữ liệu trả về
//         if (rows.length > 0) {
//             totalHours = parseFloat(rows[0].SoGio) || 0; // Lấy số giờ từ kết quả trả về
//         } else {
//             throw new Error("Không tìm thấy thông tin số giờ cho loại công việc này.");
//         }

//         // Đóng kết nối sau khi hoàn thành
//         connection.release();

//         // Nếu loại công việc có số tín chỉ, nhân với số giờ quy đổi
//         if (validSoTC > 0) {
//             totalHours *= validSoTC;
//         }

//         // Tổng số người tham gia (danh sách thành viên)
//         const participants = danhSachThanhVien && Array.isArray(danhSachThanhVien) ? danhSachThanhVien : [];

//         // Tính số giờ chia đều cho các thành viên
//         const hoursPerMember = participants.length > 0
//             ? Math.floor(totalHours / participants.length)
//             : 0;

//         // Xử lý format đầu ra
//         participants.forEach((participant, index) => {
//             // Tách tên và đơn vị
//             let name = participant;
//             let unit = "";
//             if (participant.includes(" - ")) {
//                 const split = participant.split(" - ");
//                 name = split[0].trim();
//                 unit = split[1].trim();
//             }

//             const formatted = `${name} (${unit} - ${hoursPerMember} giờ)`;

//             // Gán vào danh sách thành viên
//             thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
//         });

//         // Kết quả cuối cùng
//         return {
//             thanhVien: thanhVienResult || null,
//         };

//     } catch (error) {
//         console.error("Lỗi khi quy đổi số giờ xây dựng chương trình đào tạo:", error);
//         throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn hoặc xử lý
//     }
// };

const quyDoiSoGioXayDungChuongTrinhDaoTao = async (body, MaBang) => {
    const { phanLoai, danhSachThanhVien, soTC } = body;

    // Kiểm tra và xử lý `soTC`, mặc định là 0 nếu không hợp lệ
    const validSoTC = Number.isInteger(parseInt(soTC)) && parseInt(soTC) > 0 ? parseInt(soTC) : 0;

    let totalHours = 0;
    let thanhVienResult = "";

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Truy vấn số giờ từ cơ sở dữ liệu
        const [rows] = await connection.execute(
            `SELECT SoGio FROM quydinhsogionckh WHERE XayDungCTDT = ? AND MaBang = ?`,
            [phanLoai, MaBang]
        );

        // Kiểm tra nếu có dữ liệu trả về
        if (rows.length > 0) {
            totalHours = parseFloat(rows[0].SoGio) || 0;
        } else {
            throw new Error("Không tìm thấy thông tin số giờ cho loại công việc này.");
        }

        // Đóng kết nối
        connection.release();

        // Nếu loại công việc có số tín chỉ, nhân với số giờ quy đổi
        if (validSoTC > 0) {
            totalHours = parseFloat((totalHours * validSoTC).toFixed(2));
        }

        // Tổng số người tham gia
        const participants = danhSachThanhVien && Array.isArray(danhSachThanhVien) ? danhSachThanhVien : [];

        // Tính số giờ chia đều cho các thành viên
        const hoursPerMember = participants.length > 0
            ? parseFloat((totalHours / participants.length).toFixed(2))
            : 0;

        // Xử lý format đầu ra
        participants.forEach((participant, index) => {
            const { name, unit } = extractNameAndUnit(participant);
            const formatted = `${name} (${unit} - ${hoursPerMember.toFixed(2)} giờ)`;
            thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
        });

        // Kết quả cuối cùng
        return {
            thanhVien: thanhVienResult || null,
        };

    } catch (error) {
        console.error("Lỗi khi quy đổi số giờ xây dựng chương trình đào tạo:", error);
        throw error;
    }
};

// Lấy bảng xaydungctdt
const getTableXayDungCTDT = async (req, res) => {

    const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng xaydungctdt Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `SELECT * FROM xaydungctdt WHERE NamHoc = ? AND Khoa = ?`; // Truy vấn dữ liệu từ bảng xaydungctdt
        const queryParams = [NamHoc, Khoa];

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
    } = req.body;

    // Gọi hàm quy đổi
    const quyDoiResult = await quyDoiSoGioBienSoanGiaoTrinhBaiGiang({
        phanLoai,
        danhSachThanhVien: thanhVien,
        soTC,
        tacGia
    }, 'biensoangiaotrinhbaigiang');

    // Lấy kết quả sau khi quy đổi
    const thanhVienFormatted = quyDoiResult.thanhVien || "";
    const tacGiaFormatted = quyDoiResult.tacGia || "";


    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng biensoangiaotrinhbaigiang
        await connection.execute(
            `
INSERT INTO biensoangiaotrinhbaigiang (
PhanLoai, NamHoc, TenGiaoTrinhBaiGiang, SoTC, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, TacGia, DanhSachThanhVien, Khoa
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm biên soạn giáo trình/bài giảng thành công');
        res.status(200).json({
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
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// const quyDoiSoGioBienSoanGiaoTrinhBaiGiang = async (body, MaBang) => {
//     const { phanLoai, soTC, tacGia, danhSachThanhVien } = body;

//     let totalHours = 0;

//     // Chuyển đổi soTC sang số nguyên
//     const soTCInt = parseInt(soTC, 10); // Sử dụng cơ số 10 để chuyển đổi

//     try {
//         // Tạo kết nối từ pool (cần có hàm tạo kết nối cơ sở dữ liệu, ví dụ như createPoolConnection)
//         const connection = await createPoolConnection();

//         // Truy vấn số giờ tương ứng với loại công việc từ cơ sở dữ liệu
//         const [rows] = await connection.execute(
//             `SELECT SoGio FROM quydinhsogionckh WHERE BienSoanGiaoTrinhBaiGiang = ? AND MaBang = ?`,
//             [phanLoai, MaBang]  // Sử dụng giá trị phanLoai và MaBang từ body để truy vấn
//         );

//         // Kiểm tra nếu có dữ liệu trả về
//         if (rows.length > 0) {
//             totalHours = parseFloat(rows[0].SoGio) || 0; // Lấy số giờ từ kết quả trả về
//         } else {
//             throw new Error("Không tìm thấy thông tin số giờ cho loại công việc này.");
//         }

//         // Đóng kết nối sau khi hoàn thành
//         connection.release();

//         // Nếu loại công việc có số tín chỉ, nhân với số giờ quy đổi
//         if (soTCInt > 0) {
//             totalHours *= soTCInt;
//         }

//         // Làm tròn xuống
//         totalHours = Math.floor(totalHours);

//         let soTietTacGia = 0;
//         let soTietThanhVien = [];

//         // Trường hợp chỉ có tác giả
//         if (tacGia && (!danhSachThanhVien || danhSachThanhVien.length === 0)) {
//             soTietTacGia = totalHours; // Tác giả chính nhận 100% số giờ
//         }
//         // Trường hợp có tác giả và thành viên
//         else if (tacGia && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
//             // Tác giả chính nhận 40% số giờ
//             soTietTacGia = totalHours * 0.4;

//             // Còn lại 60% chia đều cho tác giả và thành viên
//             let totalParticipants = 1 + danhSachThanhVien.length; // Tính số người tham gia (tác giả + thành viên)
//             let soTietPerMember = Math.floor((totalHours * 0.6) / totalParticipants); // Phần chia cho mỗi người, làm tròn xuống

//             // Gán số giờ cho thành viên
//             soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);

//             // Cộng số giờ cho tác giả chính
//             soTietTacGia += soTietPerMember; // Tác giả chính cũng nhận phần của thành viên
//         }

//         // Tách và format thông tin của tác giả chính
//         if (tacGia) {
//             const { name, unit } = extractNameAndUnit(tacGia);
//             body.tacGia = `${name} (${unit} - ${soTietTacGia} giờ)`; // Định dạng theo yêu cầu
//         }

//         // Tách và format thông tin của thành viên
//         if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
//             body.thanhVien = danhSachThanhVien.map((member, index) => {
//                 const { name, unit } = extractNameAndUnit(member);
//                 return `${name} (${unit} - ${soTietThanhVien[index]} giờ)`.trim();
//             }).join(", ");
//         }

//         // Kết quả cuối cùng
//         return body;

//     } catch (error) {
//         console.error("Lỗi khi quy đổi số giờ biên soạn giáo trình/bài giảng:", error);
//         throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn hoặc xử lý
//     }
// };

const quyDoiSoGioBienSoanGiaoTrinhBaiGiang = async (body, MaBang) => {
    const { phanLoai, soTC, tacGia, danhSachThanhVien } = body;

    let totalHours = 0;

    // Chuyển đổi soTC sang số nguyên, kiểm tra hợp lệ
    const soTCInt = Number.isInteger(parseInt(soTC, 10)) && parseInt(soTC, 10) > 0 ? parseInt(soTC, 10) : 0;

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Truy vấn số giờ từ cơ sở dữ liệu
        const [rows] = await connection.execute(
            `SELECT SoGio FROM quydinhsogionckh WHERE BienSoanGiaoTrinhBaiGiang = ? AND MaBang = ?`,
            [phanLoai, MaBang]
        );

        // Kiểm tra nếu có dữ liệu trả về
        if (rows.length > 0) {
            totalHours = parseFloat(rows[0].SoGio) || 0;
        } else {
            throw new Error("Không tìm thấy thông tin số giờ cho loại công việc này.");
        }

        // Đóng kết nối
        connection.release();

        // Nếu có số tín chỉ, nhân với số giờ quy đổi
        if (soTCInt > 0) {
            totalHours = parseFloat((totalHours * soTCInt).toFixed(2));
        }

        let soTietTacGia = 0;
        let soTietThanhVien = [];

        // Trường hợp chỉ có tác giả
        if (tacGia && (!danhSachThanhVien || danhSachThanhVien.length === 0)) {
            soTietTacGia = totalHours; // Tác giả chính nhận 100% số giờ
        }
        // Trường hợp có tác giả và thành viên
        else if (tacGia && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
            // Tác giả chính nhận 40% số giờ
            soTietTacGia = parseFloat((totalHours * 0.4).toFixed(2));

            // Còn lại 60% chia đều cho tác giả và thành viên
            let totalParticipants = 1 + danhSachThanhVien.length; // Tổng số người tham gia
            let soTietPerMember = parseFloat(((totalHours * 0.6) / totalParticipants).toFixed(2));

            // Gán số giờ cho thành viên
            soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);

            // Cộng số giờ cho tác giả chính
            soTietTacGia += soTietPerMember;
        }

        // Tách và format thông tin của tác giả chính
        if (tacGia) {
            const { name, unit } = extractNameAndUnit(tacGia);
            body.tacGia = `${name} (${unit} - ${soTietTacGia.toFixed(2)} giờ)`;
        }

        // Tách và format thông tin của thành viên
        if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
            body.thanhVien = danhSachThanhVien.map((member, index) => {
                const { name, unit } = extractNameAndUnit(member);
                return `${name} (${unit} - ${soTietThanhVien[index].toFixed(2)} giờ)`.trim();
            }).join(", ");
        }

        // Kết quả cuối cùng
        return body;

    } catch (error) {
        console.error("Lỗi khi quy đổi số giờ biên soạn giáo trình/bài giảng:", error);
        throw error;
    }
};

// Lấy bảng biensoangiaotrinhbaigiang
const getTableBienSoanGiaoTrinhBaiGiang = async (req, res) => {
    const { NamHoc, Khoa } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng biensoangiaotrinhbaigiang Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `SELECT * FROM biensoangiaotrinhbaigiang WHERE NamHoc = ? AND Khoa = ?`; // Truy vấn dữ liệu từ bảng biensoangiaotrinhbaigiang
        const queryParams = [NamHoc, Khoa];

        // Thực hiện truy vấn
        const [results] = await connection.execute(query, queryParams);

        // Trả về kết quả dưới dạng JSON
        res.json(results); // results chứa dữ liệu trả về
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

        let query = '';

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

const editNckh = async (req, res) => {
    const { ID, MaBang } = req.params;

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần cập nhật." });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Dữ liệu gửi lên bị thiếu hoặc rỗng." });
    }

    let data = {};
    let updateQuery = "";
    let queryParams = [];

    switch (MaBang) {
        case "detaiduan":
            data = {
                CapDeTai: req.body.CapDeTai,
                TenDeTai: req.body.TenDeTai,
                MaSoDeTai: req.body.MaSoDeTai,
                ChuNhiem: req.body.ChuNhiem,
                ThuKy: req.body.ThuKy,
                DanhSachThanhVien: req.body.DanhSachThanhVien,
                NgayNghiemThu: req.body.NgayNghiemThu,
            };

            updateQuery = `
                UPDATE detaiduan 
                SET CapDeTai = ?, TenDeTai = ?, MaSoDeTai = ?, ChuNhiem = ?, ThuKy = ?, DanhSachThanhVien = ?, NgayNghiemThu = ?
                WHERE ID = ?`;

            queryParams = [
                data.CapDeTai,
                data.TenDeTai,
                data.MaSoDeTai,
                data.ChuNhiem,
                data.ThuKy,
                data.DanhSachThanhVien,
                data.NgayNghiemThu,
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
            };

            updateQuery = `
                UPDATE baibaokhoahoc 
                SET LoaiTapChi = ?, TenBaiBao = ?, TacGia = ?, TacGiaChiuTrachNhiem = ?, DanhSachThanhVien = ?
                WHERE ID = ?`;

            queryParams = [
                data.LoaiTapChi,
                data.TenBaiBao,
                data.TacGia,
                data.TacGiaChiuTrachNhiem,
                data.DanhSachThanhVien,
                ID,
            ];
            break;

        case "bangsangchevagiaithuong":
            data = {
                PhanLoai: req.body.PhanLoai,
                TenBangSangCheVaGiaiThuong: req.body.TenBangSangCheVaGiaiThuong,
                NgayQDCongNhan: req.body.NgayQDCongNhan,
                SoQDCongNhan: req.body.SoQDCongNhan,
                TacGia: req.body.TacGia,
                DanhSachThanhVien: req.body.DanhSachThanhVien,
            };

            updateQuery = `
                UPDATE bangsangchevagiaithuong 
                SET PhanLoai = ?, TenBangSangCheVaGiaiThuong = ?, NgayQDCongNhan = ?, SoQDCongNhan = ?, TacGia = ?, DanhSachThanhVien = ?
                WHERE ID = ?`;

            queryParams = [
                data.PhanLoai,
                data.TenBangSangCheVaGiaiThuong,
                data.NgayQDCongNhan,
                data.SoQDCongNhan,
                data.TacGia,
                data.DanhSachThanhVien,
                ID,
            ];
            break;

        case "biensoangiaotrinhbaigiang":
            data = {
                PhanLoai: req.body.PhanLoai,
                TenGiaoTrinhBaiGiang: req.body.TenGiaoTrinhBaiGiang,
                SoTC: req.body.SoTC,
                SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
                NgayQDGiaoNhiemVu: req.body.NgayQDGiaoNhiemVu,
                TacGia: req.body.TacGia,
                DanhSachThanhVien: req.body.DanhSachThanhVien,
            };

            updateQuery = `
                UPDATE biensoangiaotrinhbaigiang 
                SET PhanLoai = ?, TenGiaoTrinhBaiGiang = ?, SoTC = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, TacGia = ?, DanhSachThanhVien = ?
                WHERE ID = ?`;

            queryParams = [
                data.PhanLoai,
                data.TenGiaoTrinhBaiGiang,
                data.SoTC,
                data.SoQDGiaoNhiemVu,
                data.NgayQDGiaoNhiemVu,
                data.TacGia,
                data.DanhSachThanhVien,
                ID,
            ];
            break;
        case "nckhvahuanluyendoituyen":
            data = {
                PhanLoai: req.body.PhanLoai,
                TenDeTai: req.body.TenDeTai,
                SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
                NgayQDGiaoNhiemVu: req.body.NgayQDGiaoNhiemVu,
                DanhSachThanhVien: req.body.DanhSachThanhVien,
            };

            updateQuery = `
        UPDATE nckhvahuanluyendoituyen 
        SET PhanLoai = ?, TenDeTai = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, DanhSachThanhVien = ?
        WHERE ID = ?`;

            queryParams = [
                data.PhanLoai,
                data.TenDeTai,
                data.SoQDGiaoNhiemVu,
                data.NgayQDGiaoNhiemVu,
                data.DanhSachThanhVien,
                ID,
            ];
            break;
        case "sachvagiaotrinh":
            // Giả sử đây là code cập nhật cho sachvagiaotrinh (đã có sẵn)
            data = {
                // Các trường dữ liệu của sachvagiaotrinh, ví dụ:
                PhanLoai: req.body.PhanLoai,
                TenSachVaGiaoTrinh: req.body.TenSachVaGiaoTrinh,
                SoXuatBan: req.body.SoXuatBan,
                SoTrang: req.body.SoTrang,
                TacGia: req.body.TacGia,
                DongChuBien: req.body.DongChuBien,
                DanhSachThanhVien: req.body.DanhSachThanhVien,
            };

            updateQuery = `
                  UPDATE sachvagiaotrinh
                  SET PhanLoai = ?, TenSachVaGiaoTrinh = ?, SoXuatBan = ?, SoTrang = ?, TacGia = ?, DongChuBien = ?, DanhSachThanhVien = ?
                  WHERE ID = ?`;

            queryParams = [
                data.PhanLoai,
                data.TenSachVaGiaoTrinh,
                data.SoXuatBan,
                data.SoTrang,
                data.TacGia,
                data.DongChuBien,
                data.DanhSachThanhVien,
                ID,
            ];
            break;
        case "xaydungctdt":
            // Code cập nhật cho bảng xaydungctdt
            data = {
                HinhThucXayDung: req.body.HinhThucXayDung,
                TenChuongTrinh: req.body.TenChuongTrinh,
                SoTC: req.body.SoTC,
                SoQDGiaoNhiemVu: req.body.SoQDGiaoNhiemVu,
                NgayQDGiaoNhiemVu: req.body.NgayQDGiaoNhiemVu,
                DanhSachThanhVien: req.body.DanhSachThanhVien,
            };

            updateQuery = `
                  UPDATE xaydungctdt
                  SET HinhThucXayDung = ?, TenChuongTrinh = ?, SoTC = ?, SoQDGiaoNhiemVu = ?, NgayQDGiaoNhiemVu = ?, DanhSachThanhVien = ?
                  WHERE ID = ?`;

            queryParams = [
                data.HinhThucXayDung,
                data.TenChuongTrinh,
                data.SoTC,
                data.SoQDGiaoNhiemVu,
                data.NgayQDGiaoNhiemVu,
                data.DanhSachThanhVien,
                ID,
            ];
            break;
        default:
            return res.status(400).json({ message: "Loại bảng không hợp lệ." });
    }


    const connection = await createPoolConnection();

    try {
        const [result] = await connection.execute(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }

        console.log(`Cập nhật thành công ID: ${ID} trong bảng ${MaBang}`);
        res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Lỗi khi cập nhật:", error);
        res.status(500).json({
            message: "Có lỗi xảy ra khi cập nhật.",
            error: error.message,
        });
    } finally {
        connection.release();
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
    getData,
    editNckh
};