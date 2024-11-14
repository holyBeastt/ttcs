const express = require("express");
const multer = require("multer");
const router = express.Router();
const createPoolConnection = require("../config/databasePool");


const addClass = async (req, res) => {
    const MaPhongBan = req.params.MaPhongBan;
    const GiangVien = req.body.GiangVien;
    const index = req.body.index;
    let connection;
    try {
        connection = await createPoolConnection();
        const query = `SELECT id_User FROM nhanvien WHERE TenNhanVien = ?`;
        const [rows] = await connection.query(query, [GiangVien]);
        const id_User = rows[0].id_User;
        for (let i = 1; i <= index; i++) { // Sửa lại điều kiện vòng lặp để bao gồm cả giá trị index
            console.log(i);
            let {
                [`SoTC${i}`]: SoTC = 0, 
                [`TenHocPhan${i}`]: TenHocPhan = "",  // Gán giá trị mặc định là chuỗi rỗng
                [`SoTietCTDT${i}`]: SoTietCTDT = 0, 
                [`HeSoT7CN${i}`]: HeSoT7CN,  // Gán giá trị mặc định là 0
                [`SoSV${i}`]: SoSV = 0,  // Gán giá trị mặc định là 0
                [`HeSoLopDong${i}`]: HeSoLopDong = 0, 
                [`QuyChuan${i}`]: QuyChuan = 0,  // Gán giá trị mặc định là chuỗi rỗng
                [`HocKy${i}`]: HocKy,  // Gán giá trị mặc định là chuỗi rỗng
                [`NamHoc${i}`]: NamHoc,  // Gán giá trị mặc định là chuỗi rỗng
                [`HinhThucKTGiuaKy${i}`]: HinhThucKTGiuaKy,  // Gán giá trị mặc định là chuỗi rỗng
                [`Lop${i}`]: Lop = "",  // Gán giá trị mặc định là chuỗi rỗng
                [`SoDe${i}`]: SoDe = ""
            } = req.body; // Đảm bảo rằng các biến được khai báo đúng cách
            
            if ([SoTC, TenHocPhan, SoTietCTDT, SoSV, HeSoLopDong, QuyChuan, Lop].every(value => value === "" || value === 0)) {
                console.log(`All data is default (empty or 0) for iteration ${i}`);
                continue; // Bỏ qua lần lặp này nếu tất cả dữ liệu là mặc định
            }
            SoTC = SoTC || 0;
            SoTietCTDT = SoTietCTDT || 0;
            HeSoLopDong = HeSoLopDong || 0;
            let heSo = 1;
            if (HeSoT7CN === "Không") {
                heSo = 1;
            } else {
                heSo = 1.5
            }
            let SoTietKT = 0;
            if (HinhThucKTGiuaKy === "none") {
                SoTietKT = 0;
            }
            if (HinhThucKTGiuaKy === "Coi, chấm TN" || HinhThucKTGiuaKy === "Coi, chấm viết" ) {
                    let number = heSo*(0.05*SoSV +2);
                    SoTietKT = parseFloat(number.toFixed(2));
            }
            if (HinhThucKTGiuaKy === "Coi, chấm VĐ" || HinhThucKTGiuaKy === "Coi, chấm TH" ) {
                    let number = heSo*(0.125*SoSV +2);
                    SoTietKT = parseFloat(number.toFixed(2));
            }
            console.log(SoTC,
                TenHocPhan,
                SoTietCTDT,
                HeSoT7CN,
                SoSV,
                HeSoLopDong,
                QuyChuan,
                HocKy,
                NamHoc,
                HinhThucKTGiuaKy,
                SoTietKT,
                Lop, MaPhongBan);
            const query1 = `INSERT INTO lopngoaiquychuan (SoTC, TenHocPhan, id_User, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, QuyChuan, HocKy, NamHoc, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop, SoDe, MaPhongBan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
            await connection.query(query1, [SoTC, TenHocPhan, id_User, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, QuyChuan, HocKy, NamHoc, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop, SoDe, MaPhongBan]);

        }
        res.redirect("/addclass?message=insertSuccess");
    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu: ", error);
        res.status(500).send("Lỗi server, không thể cập nhật dữ liệu");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};

const getLopMoi = async (req,res) => {
    const MaPhongBan = req.params.maPhongBan;
    const {Dot, Ki, Nam} = req.params;
    console.log(Dot, Ki, Nam);
    let connection
    try {
        connection = await createPoolConnection();
        const query = `SELECT * From giangday WHERE id_Gvm != "1" AND Khoa = ? AND Dot = ? AND HocKy = ? AND NamHoc = ? `;
        const [result] = await connection.query(query, [MaPhongBan, Dot, Ki, Nam]);
        res.json({
            success: true,
            maBoMon: result,
          });
    } catch (error) {
        console.error("Lỗi: ", error);
        res.status(500).send("Đã có lỗi xảy ra");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
const SaveNote = async (req, res) => {
  let connection = await createPoolConnection();
  try {
    const { id, ghiChu, typeclass } = req.body;
    const HoanThanh = false;

    console.log(id, ghiChu, HoanThanh, typeclass);
    if (typeof typeclass === "undefined") {
        const query = `
            UPDATE giangday 
            SET GhiChu = ? , HoanThanh = ?
            WHERE MaGiangDay = ?
        `;
        await connection.query(query, [ghiChu, HoanThanh, id]);
    } else {
        if (typeclass === "Lớp ngoài quy chuẩn") {
            console.log("Lớp ngoài quy chuẩn")
            const query = `
                UPDATE lopngoaiquychuan 
                SET GhiChu = ? , HoanThanh = ?
                WHERE MaGiangDay = ?
            `;
            await connection.query(query, [ghiChu, HoanThanh, id]);
        } else {
            const query = `
            UPDATE giuaky 
            SET GhiChu = ? , HoanThanh = ?
            WHERE MaGiangDay = ?
        `;
        await connection.query(query, [ghiChu, HoanThanh, id]);
        }
    }
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
const DoneNote = async (req, res) => {
  let connection = await createPoolConnection();
  try {
    const { id, ghiChu, typeclass } = req.body;
    const HoanThanh = true;
    const mGhiChu = ghiChu + " Đã sửa";

    console.log(id, ghiChu, mGhiChu, HoanThanh, typeclass);
    if (typeof typeclass === "undefined") {
        const query = `
            UPDATE giangday 
            SET GhiChu = ?, HoanThanh = ? 
            WHERE MaGiangDay = ?
        `;
        await connection.query(query, [mGhiChu, HoanThanh, id]);
    } else {
        if (typeclass === "Lớp ngoài quy chuẩn") {
            const query = `
                UPDATE lopngoaiquychuan 
                SET GhiChu = ? , HoanThanh = ?
                WHERE MaGiangDay = ?
            `;
            await connection.query(query, [mGhiChu, HoanThanh, id]);
        } else {
            const query = `
                UPDATE giuaky 
                SET GhiChu = ?, HoanThanh = ? 
                WHERE MaGiangDay = ?
            `;
            await connection.query(query, [mGhiChu, HoanThanh, id]);
        }
    }
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
// Hàm xử lý cập nhật dữ liệu
const updateLopThiGk = async (req, res) => {
    const globalData = req.body; // Lấy dữ liệu từ client gửi đến
    if (!globalData || globalData.length === 0) {
        return res.status(400).json({ message: 'Không có dữ liệu để cập nhật.' });
    }

    // Tạo kết nối tới database MySQL
    const connection = await createPoolConnection();

    try {
        // Duyệt qua mỗi phần tử trong globalData và cập nhật vào bảng giangday
        for (let data of globalData) {
            const { hinhThucKTGiuaKy, heSoT7CN, select, MaGiangDay, soDe, GiangVien } = data;
        
            // Truy vấn dữ liệu từ bảng giangday bằng MaGiangDay
            const query1 = `SELECT * FROM giangday WHERE MaGiangDay = ?`;
            let [rows] = await connection.query(query1, [MaGiangDay]);
        
            // Kiểm tra nếu không tìm thấy dữ liệu
            if (rows.length === 0) {
                console.log(`Không tìm thấy dữ liệu với MaGiangDay: ${MaGiangDay}`);
                continue; // Bỏ qua phần tử này nếu không tìm thấy dữ liệu
            }
        
            // Lấy dữ liệu của row đầu tiên (vì chỉ có 1 dòng dữ liệu trả về với mỗi MaGiangDay)
            let row = rows[0];
        
            let heSo = (heSoT7CN === "Không") ? 1 : 1.5;
            let SoTietKT = 0;
        
            if (hinhThucKTGiuaKy === "none") {
                SoTietKT = 0;
            } else if (hinhThucKTGiuaKy === "Coi, chấm TN" || hinhThucKTGiuaKy === "Coi, chấm viết") {
                let number = heSo * (0.05 * row.SoSV + 2);
                SoTietKT = parseFloat(number.toFixed(2));
            } else if (hinhThucKTGiuaKy === "Coi, chấm VĐ" || hinhThucKTGiuaKy === "Coi, chấm TH") {
                let number = heSo * (0.125 * row.SoSV + 2);
                SoTietKT = parseFloat(number.toFixed(2));
            }
        
            // Chuẩn bị mảng dữ liệu cho câu lệnh INSERT
            let valuesToInsert = [
                row.MaGiangDay, 
                row.TenHocPhan, 
                row.id_User, 
                heSoT7CN, 
                row.SoSV, 
                row.HocKy, 
                row.NamHoc, 
                row.MaHocPhan, 
                GiangVien, 
                hinhThucKTGiuaKy, 
                SoTietKT, 
                row.Lop, 
                soDe,
                row.Khoa
            ];
        
            // Câu lệnh INSERT vào bảng giuaky
            const query2 = `
                INSERT INTO giuaky (MaGiangDay, TenHocPhan, id_User, HeSoT7CN, SoSV, HocKy, NamHoc, MaHocPhan, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop, SoDe, Khoa) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE
                    TenHocPhan = VALUES(TenHocPhan),
                    id_User = VALUES(id_User),
                    HeSoT7CN = VALUES(HeSoT7CN),
                    SoSV = VALUES(SoSV),
                    HocKy = VALUES(HocKy),
                    NamHoc = VALUES(NamHoc),
                    MaHocPhan = VALUES(MaHocPhan),
                    GiangVien = VALUES(GiangVien),
                    HinhThucKTGiuaKy = VALUES(HinhThucKTGiuaKy),
                    SoTietKT = VALUES(SoTietKT),
                    Lop = VALUES(Lop),
                    SoDe = VALUES(SoDe),
                    Khoa = VALUES(Khoa);
            `;
        
            // Thực hiện câu lệnh INSERT
            await connection.query(query2, valuesToInsert);

            const query3 = `UPDATE giangday SET DaChon = 1 WHERE MaGiangDay = ?`;
            await connection.query(query3, [MaGiangDay]);
        }        

        // Gửi phản hồi thành công
        res.json({ message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error('Lỗi khi cập nhật dữ liệu:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi cập nhật dữ liệu.' });
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
const getLopGK = async (req,res) => {
    const MaPhongBan = req.params.maPhongBan;
    const {Ki, Nam} = req.params;
    console.log(Ki, Nam);
    let connection;
    try {
        connection = await createPoolConnection();
        const query = `SELECT * From giuaky WHERE Khoa = ? AND HocKy = ? AND NamHoc = ? `;
        const [result] = await connection.query(query, [MaPhongBan, Ki, Nam]);
        res.json({
            success: true,
            maBoMon: result,
          });
    } catch (error) {
        console.error("Lỗi: ", error);
        res.status(500).send("Đã có lỗi xảy ra");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
const updateKhoaDuyet = async (req, res) =>{
    const {MaGiangDay, typeclass, khoaDuyet} = req.body;
    let connection;
    try {
        connection = await createPoolConnection();
        if (typeclass === "Lớp ngoài quy chuẩn") {
            const query = `UPDATE lopngoaiquychuan SET KhoaDuyet = ? WHERE MaGiangDay = ?`;
            await connection.query(query, [khoaDuyet, MaGiangDay]);
        } else {
            const query = `UPDATE giuaky SET KhoaDuyet = 1 WHERE MaGiangDay = ?`;
        await connection.query(query, [MaGiangDay]);
        }
        res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
    } catch (error) {
        console.error("Lỗi: ", error);
        res.status(500).send("Đã có lỗi xảy ra");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
const deleteLopGK = async (req, res) =>{
    const {MaGiangDay, typeclass} = req.body;
    let connection;
    try {
        connection = await createPoolConnection();
        if (typeclass === "Lớp ngoài quy chuẩn") {
            const query = `DELETE FROM lopngoaiquychuan WHERE MaGiangDay = ?`;
            await connection.query(query, [MaGiangDay]);
        } else {
            const query1 = `UPDATE giangday SET DaChon = 0 WHERE MaGiangDay = ?`;
            await connection.query(query1, [MaGiangDay]);
            const query2 = `DELETE FROM giuaky WHERE MaGiangDay = ?`;
            await connection.query(query2, [MaGiangDay]);
        }
        
        res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
    } catch (error) {
        console.error("Lỗi: ", error);
        res.status(500).send("Đã có lỗi xảy ra");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};

const getLopNgoaiQuyChuan = async (req, res) =>{
    const MaPhongBan = req.params.MaPhongBan;
    const {Ki, Nam} = req.params;
    console.log(MaPhongBan, Ki, Nam);
    let connection;
    try {
        connection = await createPoolConnection();
        if (MaPhongBan ==="DAOTAO" || MaPhongBan === "TAICHINH") {
            const query = `SELECT * FROM lopngoaiquychuan WHERE HocKy = ? AND NamHoc = ?`;
            const [rows] = await connection.query(query, [ Ki, Nam]);
            console.log(rows)
            res.json({
                success: true,
                maBoMon: rows,
            });
        } else {
            const query = `SELECT * FROM lopngoaiquychuan WHERE MaPhongBan = ? AND HocKy = ? AND NamHoc = ?`;
            const [rows] = await connection.query(query, [MaPhongBan, Ki, Nam]);
            console.log(rows)
            res.json({
                success: true,
                maBoMon: rows,
            });
        }
    } catch (error) {
        console.error("Lỗi: ", error);
        res.status(500).send("Đã có lỗi xảy ra");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
const updateDuyet = async (req, res) =>{
    const {MaGiangDay, typeclass, KhoaDuyet, daoTaoDuyet, MaPhongBan} = req.body;
    let connection;
    try {
        connection = await createPoolConnection();
        if (MaPhongBan === "DAOTAO") {
            if (typeclass === "Lớp ngoài quy chuẩn") {
                const query = `UPDATE lopngoaiquychuan SET KhoaDuyet = ?, DaoTaoDuyet = ? WHERE MaGiangDay = ?`;
                await connection.query(query, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
            } else {
                const query = `UPDATE giuaky SET KhoaDuyet = ?, DaoTaoDuyet = ? WHERE MaGiangDay = ?`;
                await connection.query(query, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
            }
        };
        if (MaPhongBan === "TAICHINH") {
            if (typeclass === "Lớp ngoài quy chuẩn") {
                const query = `UPDATE lopngoaiquychuan SET DaoTaoDuyet = ?, TaiChinhDuyet = ? WHERE MaGiangDay = ?`;
                await connection.query(query, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
            } else {
                const query = `UPDATE giuaky SET DaoTaoDuyet = ?, TaiChinhDuyet = ? WHERE MaGiangDay = ?`;
                await connection.query(query, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
            }
        }
        res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
    } catch (error) {
        console.error("Lỗi: ", error);
        res.status(500).send("Đã có lỗi xảy ra");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};

module.exports = {
    addClass,
    getLopMoi,
    SaveNote,
    DoneNote,
    updateLopThiGk,
    getLopGK,
    updateKhoaDuyet,
    deleteLopGK,
    getLopNgoaiQuyChuan,
    updateDuyet,
};