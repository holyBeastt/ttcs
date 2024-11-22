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
                [`QuyChuan${i}`]: QuyChuan = 0,  // Gán giá trị mặc định là chuỗi rỗng
                [`HocKy${i}`]: HocKy,  // Gán giá trị mặc định là chuỗi rỗng
                [`NamHoc${i}`]: NamHoc,  // Gán giá trị mặc định là chuỗi rỗng
                [`HinhThucKTGiuaKy${i}`]: HinhThucKTGiuaKy,  // Gán giá trị mặc định là chuỗi rỗng
                [`Lop${i}`]: Lop = "",  // Gán giá trị mặc định là chuỗi rỗng
            } = req.body; // Đảm bảo rằng các biến được khai báo đúng cách
            
            if ([SoTC, TenHocPhan, SoTietCTDT, SoSV, QuyChuan, Lop].every(value => value === "" || value === 0)) {
                console.log(`All data is default (empty or 0) for iteration ${i}`);
                continue; // Bỏ qua lần lặp này nếu tất cả dữ liệu là mặc định
            }
            SoTC = SoTC || 0;
            SoTietCTDT = SoTietCTDT || 0;
            let SoDe = 0, HeSoLopDong = 0;
            if (SoSV >= 41 && SoSV <= 50) {
                HeSoLopDong = 1.1;
                SoDe = 3;
            } else if (SoSV >= 51 && SoSV <= 65) {
                HeSoLopDong = 1.2;
                SoDe = 3;
            } else if (SoSV >= 66 && SoSV <= 80) {
                HeSoLopDong = 1.3;
                SoDe = 3;
            } else if (SoSV >= 81 && SoSV <= 100) {
                HeSoLopDong = 1.4;
                SoDe = 4;
            } else if (SoSV >= 101) {
                HeSoLopDong = 1.5;
                SoDe = 4;
            } else {
                HeSoLopDong = 1; // Giá trị mặc định nếu không nằm trong khoảng
                SoDe = 2;
            }
            let SoTietKT = 0;
            if (HinhThucKTGiuaKy === "none") {
                SoTietKT = 0;
            }
            if (HinhThucKTGiuaKy === "Coi, chấm TN" || HinhThucKTGiuaKy === "Coi, chấm viết" ) {
                    let number = HeSoT7CN*(0.05*SoSV +2);
                    SoTietKT = parseFloat(number.toFixed(2));
            }
            if (HinhThucKTGiuaKy === "Coi, chấm VĐ" || HinhThucKTGiuaKy === "Coi, chấm TH" ) {
                    let number = HeSoT7CN*(0.125*SoSV +2);
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

const getLopGiuaKi = async (req,res) => {
    const MaPhongBan = req.params.maPhongBan;
    const {Dot, Ki, Nam, MoiGiang} = req.params;
    console.log(Dot, Ki, Nam, MoiGiang);
    let connection
    try {
        connection = await createPoolConnection();
        if (MoiGiang === '0') {
            console.log("giảng dạy chính")
            const query = `SELECT * From giangday WHERE id_Gvm = "1" AND Khoa = ? AND Dot = ? AND HocKy = ? AND NamHoc = ? `;
            const [result] = await connection.query(query, [MaPhongBan, Dot, Ki, Nam]);
            res.json({
                success: true,
                maBoMon: result,
                });
        } else {
            console.log("lớp mời")
            const query = `SELECT * From giangday WHERE id_Gvm != "1" AND Khoa = ? AND Dot = ? AND HocKy = ? AND NamHoc = ? `;
            const [result] = await connection.query(query, [MaPhongBan, Dot, Ki, Nam]);
            res.json({
                success: true,
                maBoMon: result,
            });
        }
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
            if (select) {

                let SoTietKT = 0;
                let SoDe = 0;
                if (SoSV >= 41 && SoSV <= 80) {
                    SoDe = 3;
                } else if (SoSV >= 81) {
                    SoDe = 4;
                } else {
                    SoDe = 2;
                }
            
                if (hinhThucKTGiuaKy === "none") {
                    SoTietKT = 0;
                } else if (hinhThucKTGiuaKy === "Coi, chấm TN" || hinhThucKTGiuaKy === "Coi, chấm viết") {
                    let number = heSoT7CN * (0.05 * row.SoSV + 2);
                    SoTietKT = parseFloat(number.toFixed(2));
                } else if (hinhThucKTGiuaKy === "Coi, chấm VĐ" || hinhThucKTGiuaKy === "Coi, chấm TH") {
                    let number = heSoT7CN * (0.125 * row.SoSV + 2);
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

                const query3 = `UPDATE giangday SET DaChon = 1, HinhThucKTGiuaKy= ?, GiangVienCoiGK= ?  WHERE MaGiangDay = ?`;
                await connection.query(query3, [hinhThucKTGiuaKy, GiangVien, MaGiangDay]); 
            } else {
                const query2 = `DELETE FROM giuaky WHERE MaGiangDay = ?`;
                await connection.query(query2, [MaGiangDay]);
                const query3 = `UPDATE giangday SET DaChon = 0, GiangVienCoiGK= NULL WHERE MaGiangDay = ?`;
                await connection.query(query3, [MaGiangDay]);
            }
            
        }        

        // Gửi phản hồi thành công
        res.status(200).json({ message: "Cập nhật thành công" }); // Phản hồi thành công
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
    console.log(khoaDuyet);
    let connection;
    try {
        connection = await createPoolConnection();
        if (typeclass === "Lớp ngoài quy chuẩn") {
            const query = `UPDATE lopngoaiquychuan SET KhoaDuyet = ? WHERE MaGiangDay = ?`;
            await connection.query(query, [khoaDuyet, MaGiangDay]);
        } else {
            const query = `UPDATE giuaky SET KhoaDuyet = 1 WHERE MaGiangDay = ?`;
            await connection.query(query, [MaGiangDay]);
            const query1 = `UPDATE giangday SET KhoaDuyet = 1 WHERE MaGiangDay = ?`;
            await connection.query(query1, [MaGiangDay]);
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
            const query1 = `UPDATE giangday SET DaChon = 0, GiangVienCoiGK = NULL, KhoaDuyet = 0 WHERE MaGiangDay = ?`;
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
const deletelopngoaiquychuan = async (req, res) =>{
    const {MaGiangDay} = req.body;
    let connection
    try {
        connection = await createPoolConnection();
        const query =  `DELETE FROM lopngoaiquychuan WHERE MaGiangDay = ?`;
        await connection.query(query, [MaGiangDay]);
        res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
        res.json({
            success: true,
        });
    } catch (error) {
        console.error("Lỗi: ", error);
        res.status(500).send("Đã có lỗi xảy ra");
    }finally{
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
const updatelopngoaiquychuan = async (req, res) =>{
    const globalData = req.body; // Lấy dữ liệu từ client gửi đến
    if (!globalData || globalData.length === 0) {
        return res.status(400).json({ message: 'Không có dữ liệu để cập nhật.' });
    }

    // Tạo kết nối tới database MySQL
    const connection = await createPoolConnection();

    try {
        // Duyệt qua mỗi phần tử trong globalData và cập nhật vào bảng giangday
        for (let data of globalData) {
            const { tenHocPhan, soTC, maLop, soSV, hinhThucKTGiuaKy, heSoT7CN, MaGiangDay, soDe } = data;
        
            let SoTietKT = 0;
            let SoDe = 0;
            if (soSV >= 41 && soSV <= 80) {
                SoDe = 3;
            } else if (soSV >= 81) {
                SoDe = 4;
            } else {
                SoDe = 2;
            }
            
            if (hinhThucKTGiuaKy === "none") {
                SoTietKT = 0;
            } else if (hinhThucKTGiuaKy === "Coi, chấm TN" || hinhThucKTGiuaKy === "Coi, chấm viết") {
                let number = heSoT7CN * (0.05 * soSV + 2);
                SoTietKT = parseFloat(number.toFixed(2));
            } else if (hinhThucKTGiuaKy === "Coi, chấm VĐ" || hinhThucKTGiuaKy === "Coi, chấm TH") {
                let number = heSoT7CN * (0.125 * soSV + 2);
                SoTietKT = parseFloat(number.toFixed(2));
            }
            
            // Chuẩn bị mảng dữ liệu cho câu lệnh INSERT
            let valuesToInsert = [
                tenHocPhan, 
                heSoT7CN, 
                soSV, 
                hinhThucKTGiuaKy, 
                SoTietKT, 
                maLop, 
                soDe,
                soTC,
                MaGiangDay
            ];
            
            // Câu lệnh INSERT vào bảng giuaky
            const query2 = `
                UPDATE lopngoaiquychuan SET TenHocPhan = ?, HeSoT7CN = ?, SoSV = ?, HinhThucKTGiuaKy = ?, SoTietKT = ?, Lop = ?, SoDe = ?, SoTC = ?
                WHERE MaGiangDay = ? 
            `;
            
            // Thực hiện câu lệnh INSERT
            await connection.query(query2, valuesToInsert);
        }        

        // Gửi phản hồi thành công
        res.status(200).json({ message: "Cập nhật thành công" }); // Phản hồi thành công
    } catch (error) {
        console.error('Lỗi khi cập nhật dữ liệu:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi cập nhật dữ liệu.' });
    } finally {
        if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
};
module.exports = {
    addClass,
    getLopGiuaKi,
    SaveNote,
    DoneNote,
    updateLopThiGk,
    getLopGK,
    updateKhoaDuyet,
    deleteLopGK,
    getLopNgoaiQuyChuan,
    updateDuyet,
    deletelopngoaiquychuan,
    updatelopngoaiquychuan,
};