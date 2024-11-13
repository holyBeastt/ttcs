const express = require("express");
const multer = require("multer");
const router = express.Router();
const createPoolConnection = require("../config/databasePool");


const addClass = async (req, res) => {
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
                [`Lop${i}`]: Lop = ""  // Gán giá trị mặc định là chuỗi rỗng
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
                Lop);
            const query1 = `INSERT INTO lopngoaiquychuan (SoTC, TenHocPhan, id_User, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, QuyChuan, HocKy, NamHoc, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
            await connection.query(query1, [SoTC, TenHocPhan, id_User, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, QuyChuan, HocKy, NamHoc, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop]);
        }
        res.redirect("/addclass?message=insertSuccess");
    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu: ", error);
        res.status(500).send("Lỗi server, không thể cập nhật dữ liệu");
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};


module.exports = {
    addClass,
};