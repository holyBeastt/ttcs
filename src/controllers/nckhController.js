const express = require("express");
const createPoolConnection = require("../config/databasePool");

const getQuyDinhSoGioNCKH = async (req, res) => {
    let connection;
    try {
        // Lấy kết nối từ pool
        connection = await createPoolConnection();

        // Truy vấn dữ liệu từ bảng quydoisogionckh
        const [rows, fields] = await connection.execute('SELECT * FROM quydoisogionckh');

        // Kiểm tra nếu không có dữ liệu
        if (rows.length === 0) {
            return res.status(404).send('Không có dữ liệu');
        }

        // Dữ liệu đầu tiên trong mảng rows (vì LIMIT 1)
        const data = rows[0];

        // Render view và truyền dữ liệu vào EJS
        res.render('nckhQuyDinhSoGioNCKH.ejs', { data });
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi trong quá trình truy vấn dữ liệu');
    } finally {
        // Giải phóng kết nối
        if (connection) {
            connection.release();
        }
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

// Hàm quy đổi đề tài dự án 
const quyDoiSoGioDeTaiDuAn = async (body) => {
    const { capDeTai, chuNhiem, thuKy, thanhVien } = body;

    let soGioChuNhiem = 0;
    let soGioThuKy = 0;
    let soGioThanhVien = [];

    try {
        // Tạo kết nối từ pool
        const connection = await createPoolConnection();

        // Lấy thông tin quy đổi từ bảng quydoisogionckh
        const [rows] = await connection.execute(
            `SELECT * FROM quydoisogionckh WHERE MaQuyDoi = ? AND PhanLoai = ? `,
            ["detaiduan", capDeTai]  // Dùng các giá trị truyền vào để lọc dữ liệu
        );

        // Kiểm tra nếu có dữ liệu trả về
        if (rows.length > 0) {
            const data = rows[0]; // Lấy kết quả đầu tiên từ bảng

            // Quy đổi giờ cho chủ nhiệm
            soGioChuNhiem = chuNhiem ? parseFloat(data.GiangVien1) : 0;

            // Quy đổi giờ cho thư ký
            soGioThuKy = thuKy ? parseFloat(data.GiangVien2) : 0;

            // Quy đổi giờ cho thành viên
            if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
                const gioThanhVien = parseFloat(data.ThanhVien) / thanhVien.length; // Chia đều giờ cho thành viên
                soGioThanhVien = thanhVien.map(() => parseFloat(gioThanhVien.toFixed(2)));
            }
        } else {
            throw new Error("Không tìm thấy dữ liệu quy đổi cho cấp đề tài này.");
        }

        // Đóng kết nối
        connection.release(); // Giải phóng kết nối sau khi hoàn thành


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
                return `${name} (${unit} - ${soGioThanhVien[index]} giờ)`.trim();
            }).join(", ");
        }

        // Trả về body đã được cập nhật
        return body;

    } catch (error) {
        console.error("Lỗi khi quy đổi số giờ:", error);
        throw error; // Ném lỗi nếu có vấn đề trong quá trình truy vấn
    }
};

// thêm đề tài dự án
const saveDeTaiDuAn = async (req, res) => {
    const data = await quyDoiSoGioDeTaiDuAn(req.body)
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

    // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
    // const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

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

// lấy bảng đề tài dự án
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

// quy đổi số tiết bài báo khoa học
const quyDoiSoTietBaiBaoKhoaHoc = (body) => {
    const {
        loaiTapChi,
        tacGia,
        tacGiaCtn,
        danhSachThanhVien
    } = body;

    // Danh sách số giờ tương ứng với các loại tạp chí
    const publicationHours = {
        "Tạp chí Nature; AAAS": 800,
        "Tạp chí khoa học thuộc hệ thống ISI/Scopus (Q1)": 700,
        "Tạp chí khoa học thuộc hệ thống ISI/Scopus (Q2)": 600,
        "Tạp chí khoa học thuộc hệ thống ISI/Scopus (Q3)": 500,
        "Tạp chí khoa học thuộc hệ thống ISI/Scopus (Q4)": 400,
        "Tạp chí quốc tế thuộc danh mục Web of Science, Scopus và các tạp chí quốc tế khác": 0,
        "Tạp chí khoa học chuyên ngành trong nước được Hội đồng Chức danh Giáo sư Nhà nước công nhận (>= 1 điểm)": 200,
        "Tạp chí khoa học chuyên ngành trong nước được Hội đồng Chức danh Giáo sư Nhà nước công nhận (>= 0.5 điểm)": 100,
        "Nội san học viện": 75,
        "Nội san cấp khoa": 50,
        "Hội thảo chuyên ngành": 100,
        "Hội nghị khoa học trong nước": 200,
        "Hội nghị, hội thảo khoa học quốc tế": 250,
        "Hội nghị, hội thảo khoa học quốc tế (ISI/Scopus)": 300
    };

    // Lấy số giờ của tạp chí
    let soTiet = publicationHours[loaiTapChi] || 0;
    let soTietTacGia = 0;
    let soTietTacGiaCtn = 0;
    let soTietThanhVien = [];

    // Trường hợp có 1 tác giả chính và không có tác giả chịu trách nhiệm và thành viên
    if (tacGia && !tacGiaCtn && !danhSachThanhVien) {
        soTietTacGia = soTiet; // Tác giả chính nhận 100% số giờ
    }
    // Trường hợp có 1 tác giả chính, 1 tác giả chịu trách nhiệm, và có thành viên
    else if (tacGia && tacGiaCtn && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
        let totalParticipants = 2 + danhSachThanhVien.length; // Tổng số người tham gia (2 tác giả + thành viên)

        // Tác giả chính nhận 20% số giờ
        soTietTacGia = (soTiet * 0.2);

        // Tác giả chịu trách nhiệm nhận 20% số giờ
        soTietTacGiaCtn = (soTiet * 0.2);

        // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính và tác giả chịu trách nhiệm
        let soTietPerMember = (soTiet * 0.6) / totalParticipants;

        // Gán số giờ cho thành viên
        soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);

        // Cộng số giờ cho tác giả chính và tác giả chịu trách nhiệm
        soTietTacGia += soTietPerMember; // Tác giả chính cũng nhận phần của thành viên
        soTietTacGiaCtn += soTietPerMember; // Tác giả chịu trách nhiệm cũng nhận phần của thành viên
    }
    // Trường hợp có 1 tác giả chính, không có tác giả chịu trách nhiệm và có thành viên
    else if (tacGia && !tacGiaCtn && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
        // Tác giả chính nhận 40% số giờ
        soTietTacGia = (soTiet * 0.4);

        // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính
        let soTietPerMember = (soTiet * 0.6) / (danhSachThanhVien.length + 1); // +1 vì tính cả tác giả chính

        // Gán số giờ cho thành viên
        soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);

        // Cộng số giờ cho tác giả chính
        soTietTacGia += soTietPerMember; // Tác giả chính cũng nhận phần của thành viên
    }

    // Tách và format thông tin của tác giả chính
    if (tacGia) {
        const { name, unit } = extractNameAndUnit(tacGia);
        body.tacGia = `${name} (${unit} - ${soTietTacGia} giờ)`.trim();
    }

    // Tách và format thông tin của tác giả chịu trách nhiệm
    if (tacGiaCtn) {
        const { name, unit } = extractNameAndUnit(tacGiaCtn);
        body.tacGiaCtn = `${name} (${unit} - ${soTietTacGiaCtn} giờ)`.trim();
    }

    // Tách và format thông tin của thành viên
    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
        body.thanhVien = danhSachThanhVien.map((member, index) => {
            const { name, unit } = extractNameAndUnit(member);
            return `${name} (${unit} - ${soTietThanhVien[index]} giờ)`.trim();
        }).join(", ");
    }

    // Trả về body đã được cập nhật
    return body;
};


// thêm bài báo khoa học
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
        khoa,
    };

    const updatedBody = quyDoiSoTietBaiBaoKhoaHoc(body); // Gọi hàm quy đổi

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


// thêm bằng sáng chế và giải thưởng
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
    const quyDoiResult = quyDoiSoTietBangSangCheVaGiaiThuong({
        loaiBangSangChe: phanLoai,
        tacGia,
        danhSachThanhVien: thanhVien
    });

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


// lấy bảng đề tài dự án
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

//
const quyDoiSoTietBangSangCheVaGiaiThuong = (body) => {
    const { loaiBangSangChe, tacGia, danhSachThanhVien } = body;

    // Danh sách số giờ tương ứng với từng loại bằng sáng chế/giải thưởng
    const awardHours = {
        "Bằng độc quyền sáng chế": 400,
        "Giải thưởng khoa học và công nghệ cấp Quốc gia": 250,
        "Giải thưởng khoa học và công nghệ cấp Bộ trở lên": 200,
        "Giải thưởng khoa học và công nghệ cấp dưới Bộ": 100,
        "Giải pháp hữu ích": 150,
    };

    // Lấy số giờ quy đổi dựa trên loại bằng sáng chế/giải thưởng
    const totalHours = awardHours[loaiBangSangChe] || 0;

    // Tổng số người tham gia (tác giả + thành viên)
    const participants = [];
    if (tacGia) participants.push(tacGia);
    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
        participants.push(...danhSachThanhVien);
    }

    // Tính số giờ chia đều
    const hoursPerParticipant = participants.length > 0
        ? Math.floor(totalHours / participants.length)
        : 0;

    // Xử lý format đầu ra
    let tacGiaResult = "";
    let thanhVienResult = "";

    participants.forEach((participant, index) => {
        // Tách tên và đơn vị
        let name = participant;
        let unit = "";
        if (participant.includes(" - ")) {
            const split = participant.split(" - ");
            name = split[0].trim();
            unit = split[1].trim();
        }

        const formatted = `${name} (${unit} - ${hoursPerParticipant} giờ)`;

        // Phân loại tác giả và thành viên
        if (index === 0 && tacGia) {
            tacGiaResult = formatted;
        } else {
            thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
        }
    });

    // Kết quả cuối cùng
    return {
        tacGia: tacGiaResult || null,
        thanhVien: thanhVienResult || null,
    };
};


// thêm sách và giáo trình
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
    const quyDoiKetQua = quyDoiSachVaGiaoTrinh(body);

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

const quyDoiSachVaGiaoTrinh = (body) => {
    const {
        phanLoai,
        tacGia,
        dongChuBien, // Thay 'tacGiaCtn' thành 'dongChuBien'
        danhSachThanhVien
    } = body;

    // Danh sách số giờ tương ứng với các loại sách/giáo trình
    const bookHours = {
        "Sách chuyên khảo được xuất bản": 600,
        "Giáo trình, tài liệu giảng dạy được xuất bản": 400,
        "Sách tham khảo hoặc tương đương được xuất bản": 300,
        "Một chương sách chuyên khảo được xuất bản tại nước ngoài": 400,
    };

    // Lấy số giờ quy đổi
    let soTiet = bookHours[phanLoai] || 0;
    let soTietTacGia = 0;
    let soTietDongChuBien = 0; // Cập nhật biến tên theo yêu cầu
    let soTietThanhVien = [];

    // Trường hợp có 1 tác giả chính và không có tác giả chịu trách nhiệm và thành viên
    if (tacGia && !dongChuBien && !danhSachThanhVien) {
        soTietTacGia = soTiet; // Tác giả chính nhận 100% số giờ
    }
    // Trường hợp có 1 tác giả chính, 1 tác giả chịu trách nhiệm, và có thành viên
    else if (tacGia && dongChuBien && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
        let totalParticipants = 2 + danhSachThanhVien.length; // Tổng số người tham gia (2 tác giả + thành viên)

        // Tác giả chính nhận 20% số giờ
        soTietTacGia = (soTiet * 0.2);

        // Dong chu bien nhận 20% số giờ
        soTietDongChuBien = (soTiet * 0.2);

        // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính và tác giả chịu trách nhiệm
        let soTietPerMember = (soTiet * 0.6) / totalParticipants;

        // Gán số giờ cho thành viên
        soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);

        // Cộng số giờ cho tác giả chính và tác giả chịu trách nhiệm
        soTietTacGia += soTietPerMember; // Tác giả chính cũng nhận phần của thành viên
        soTietDongChuBien += soTietPerMember; // Dong chu bien cũng nhận phần của thành viên
    }
    // Trường hợp có 1 tác giả chính, không có tác giả chịu trách nhiệm và có thành viên
    else if (tacGia && !dongChuBien && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
        // Tác giả chính nhận 40% số giờ
        soTietTacGia = (soTiet * 0.4);

        // Còn lại 60% chia đều cho tất cả thành viên, bao gồm tác giả chính
        let soTietPerMember = (soTiet * 0.6) / (danhSachThanhVien.length + 1); // +1 vì tính cả tác giả chính

        // Gán số giờ cho thành viên
        soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);

        // Cộng số giờ cho tác giả chính
        soTietTacGia += soTietPerMember; // Tác giả chính cũng nhận phần của thành viên
    }



    // Tách và format thông tin của tác giả chính
    if (tacGia) {
        const { name, unit } = extractNameAndUnit(tacGia);
        body.tacGia = `${name} (${unit} - ${soTietTacGia} giờ)`.trim();
    }

    // Tách và format thông tin của dong chu bien
    if (dongChuBien) {
        const { name, unit } = extractNameAndUnit(dongChuBien);
        body.dongChuBien = `${name} (${unit} - ${soTietDongChuBien} giờ)`.trim(); // Thay 'tacGiaCtn' thành 'dongChuBien'
    }

    // Tách và format thông tin của thành viên
    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
        body.thanhVien = danhSachThanhVien.map((member, index) => {
            const { name, unit } = extractNameAndUnit(member);
            return `${name} (${unit} - ${soTietThanhVien[index]} giờ)`.trim();
        }).join(", ");
    }

    // Trả về body đã được cập nhật
    return body;
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
    const quyDoiResult = quyDoiSoTietNckhVaHuanLuyen({
        phanLoai,
        danhSachThanhVien: thanhVien
    });

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

const quyDoiSoTietNckhVaHuanLuyen = (body) => {
    const { phanLoai, danhSachThanhVien } = body;

    // Danh sách số giờ tương ứng với từng loại NCKH và Huấn luyện đội tuyển
    const awardHours = {
        "NCKH đạt yêu cầu cấp khoa": 25,
        "NCKH đạt yêu cầu cấp Học viện": 35,
        "NCKH đạt giải khuyến khích, giải Ba cấp Học viện": 40,
        "NCKH đạt giải Nhì, sản phẩm tiêu biểu cấp Học viện": 45,
        "NCKH đạt giải Nhất cấp Học viện": 50,
        "Huấn luyện đội tuyển trong các cuộc thi cấp quốc tế": 100,
        "Huấn luyện đội tuyển trong các cuộc thi trong nước": 90
    };

    // Lấy số giờ quy đổi dựa trên loại NCKH và Huấn luyện
    const totalHours = awardHours[phanLoai] || 0;

    // Tổng số người tham gia (danh sách thành viên)
    const participants = danhSachThanhVien && Array.isArray(danhSachThanhVien) ? danhSachThanhVien : [];

    // Tính số giờ chia đều cho các thành viên
    const hoursPerMember = participants.length > 0
        ? Math.floor(totalHours / participants.length)
        : 0;

    // Xử lý format đầu ra
    let thanhVienResult = "";

    participants.forEach((participant, index) => {
        // Tách tên và đơn vị
        let name = participant;
        let unit = "";
        if (participant.includes(" - ")) {
            const split = participant.split(" - ");
            name = split[0].trim();
            unit = split[1].trim();
        }

        const formatted = `${name} (${unit} - ${hoursPerMember} giờ)`;

        // Gán vào danh sách thành viên
        thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
    });

    // Kết quả cuối cùng
    return {
        thanhVien: thanhVienResult || null,
    };
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
    } = req.body;

    // Gọi hàm quy đổi
    const quyDoiResult = quyDoiXayDungChuongTrinhDaoTao({
        phanLoai,
        danhSachThanhVien: thanhVien,
        soTC
    });

    // Lấy kết quả sau khi quy đổi
    const thanhVienFormatted = quyDoiResult.thanhVien || "";

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng xaydungctdt
        await connection.execute(
            `
INSERT INTO xaydungctdt (
HinhThucXayDung, NamHoc, TenChuongTrinh, SoTC, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, DanhSachThanhVien
)
VALUES (?, ?, ?, ?, ?, ?, ?)
`,
            [
                phanLoai, // Phân loại
                namHoc,
                tenChuongTrinh, // Tên chương trình
                soTC,
                soQDGiaoNhiemVu, // Số quyết định giao nhiệm vụ
                ngayQDGiaoNhiemVu, // Ngày quyết định giao nhiệm vụ
                thanhVienFormatted, // Danh sách thành viên đã được format
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

const quyDoiXayDungChuongTrinhDaoTao = (body) => {
    const { phanLoai, danhSachThanhVien, soTC } = body;

    // Kiểm tra đầu vào `soTC`, nếu không hợp lệ thì mặc định là 0
    // const validSoTC = typeof soTC === "number" && soTC > 0 ? soTC : 0;
    const validSoTC = Number.isInteger(parseInt(soTC)) && parseInt(soTC) > 0 ? parseInt(soTC) : 0;


    // Quy định cách tính số giờ tương ứng với từng loại công việc
    const calculateHours = {
        "Xây dựng mới chương trình khung được hội đồng nghiệm thu đánh giá từ Đạt yêu cầu trở lên": validSoTC * 3.75,
        "Xây dựng mới chương trình chi tiết được hội đồng nghiệm thu đánh giá từ Đạt yêu cầu trở lên": validSoTC * 11.5,
        "Tu chỉnh chương trình khung được hội đồng nghiệm thu đánh giá từ Đạt yêu cầu trở lên": validSoTC * 1.5,
        "Tu chỉnh chương trình chi tiết được hội đồng nghiệm thu đánh giá từ Đạt yêu cầu trở lên": validSoTC * 3.5
    };

    // Lấy số giờ quy đổi dựa trên loại công việc
    const totalHours = calculateHours[phanLoai] || 0;

    // Tổng số người tham gia (danh sách thành viên)
    const participants = danhSachThanhVien && Array.isArray(danhSachThanhVien) ? danhSachThanhVien : [];

    // Tính số giờ chia đều cho các thành viên
    const hoursPerMember = participants.length > 0
        ? Math.floor(totalHours / participants.length)
        : 0;

    // Xử lý format đầu ra
    let thanhVienResult = "";

    participants.forEach((participant, index) => {
        // Tách tên và đơn vị
        let name = participant;
        let unit = "";
        if (participant.includes(" - ")) {
            const split = participant.split(" - ");
            name = split[0].trim();
            unit = split[1].trim();
        }

        const formatted = `${name} (${unit} - ${hoursPerMember} giờ)`;

        // Gán vào danh sách thành viên
        thanhVienResult += (thanhVienResult ? ", " : "") + formatted;
    });

    // Kết quả cuối cùng
    return {
        thanhVien: thanhVienResult || null,
    };
};

// Lấy bảng xaydungctdt
const getTableXayDungCTDT = async (req, res) => {

    const { NamHoc } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng xaydungctdt Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `SELECT * FROM xaydungctdt WHERE NamHoc = ?`; // Truy vấn dữ liệu từ bảng xaydungctdt
        const queryParams = [NamHoc];

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
    } = req.body;

    // Gọi hàm quy đổi
    const quyDoiResult = quyDoiBienSoanGiaoTrinhBaiGiang({
        phanLoai,
        danhSachThanhVien: thanhVien,
        soTC,
        tacGia
    });

    // Lấy kết quả sau khi quy đổi
    const thanhVienFormatted = quyDoiResult.thanhVien || "";
    const tacGiaFormatted = quyDoiResult.tacGia || "";


    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng biensoangiaotrinhbaigiang
        await connection.execute(
            `
INSERT INTO biensoangiaotrinhbaigiang (
PhanLoai, NamHoc, TenGiaoTrinhBaiGiang, SoTC, SoQDGiaoNhiemVu, NgayQDGiaoNhiemVu, TacGia, DanhSachThanhVien
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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



const quyDoiBienSoanGiaoTrinhBaiGiang = (body) => {
    const {
        phanLoai,
        soTC,
        tacGia,
        danhSachThanhVien
    } = body;
    console.log(body)

    let totalHours = 0;
    // Chuyển đổi soTC sang số nguyên
    const soTCInt = parseInt(soTC, 10); // Sử dụng cơ số 10 để chuyển đổi

    if (phanLoai === "Viết mới giáo trình, bài giảng và được hội đồng nghiệm thu đánh giá từ Đạt yêu cầu trở lên") {
        totalHours = soTCInt * 42; // Số giờ cho việc viết mới giáo trình/bài giảng
    } else if (phanLoai === "Tu chỉnh giáo trình, bài giảng và được hội đồng nghiệm thu đánh giá từ Đạt yêu cầu trở lên") {
        totalHours = soTCInt * 14; // Số giờ cho việc tu chỉnh giáo trình/bài giảng
    }

    // Làm tròn xuống
    totalHours = Math.floor(totalHours);

    let soTietTacGia = 0;
    let soTietThanhVien = [];

    // Trường hợp chỉ có tác giả
    if (tacGia && (!danhSachThanhVien || danhSachThanhVien.length === 0)) {
        soTietTacGia = totalHours; // Tác giả chính nhận 100% số giờ
    }
    // Trường hợp có tác giả và thành viên
    else if (tacGia && danhSachThanhVien && Array.isArray(danhSachThanhVien) && danhSachThanhVien.length > 0) {
        // Tác giả chính nhận 40% số giờ
        soTietTacGia = totalHours * 0.4;

        // Còn lại 60% chia đều cho tác giả và thành viên
        let totalParticipants = 1 + danhSachThanhVien.length; // Tính số người tham gia (tác giả + thành viên)
        let soTietPerMember = Math.floor((totalHours * 0.6) / totalParticipants); // Phần chia cho mỗi người, làm tròn xuống

        // Gán số giờ cho thành viên
        soTietThanhVien = Array(danhSachThanhVien.length).fill(soTietPerMember);

        // Cộng số giờ cho tác giả chính
        soTietTacGia += soTietPerMember; // Tác giả chính cũng nhận phần của thành viên
    }

    // Tách và format thông tin của tác giả chính
    if (tacGia) {
        const { name, unit } = extractNameAndUnit(tacGia);
        body.tacGia = `${name} (${unit} - ${soTietTacGia} giờ)`; // Định dạng theo yêu cầu
    }

    // Tách và format thông tin của thành viên
    if (danhSachThanhVien && Array.isArray(danhSachThanhVien)) {
        body.thanhVien = danhSachThanhVien.map((member, index) => {
            const { name, unit } = extractNameAndUnit(member);
            return `${name} (${unit} - ${soTietThanhVien[index]} giờ)`.trim();
        }).join(", ");
    }

    // console.log(body)
    // Trả về body đã được cập nhật
    return body;
};

// Lấy bảng biensoangiaotrinhbaigiang
const getTableBienSoanGiaoTrinhBaiGiang = async (req, res) => {
    const { NamHoc } = req.params; // Lấy năm học từ URL parameter

    console.log("Lấy dữ liệu bảng biensoangiaotrinhbaigiang Năm:", NamHoc);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `SELECT * FROM biensoangiaotrinhbaigiang WHERE NamHoc = ?`; // Truy vấn dữ liệu từ bảng biensoangiaotrinhbaigiang
        const queryParams = [NamHoc];

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
    getTableBienSoanGiaoTrinhBaiGiang
};