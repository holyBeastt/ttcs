const createPoolConnection = require("../config/databasePool");

// Controller cho trang soTietDM
const renderSoTietDM = (req, res) => {
    try {
        res.render("vuotGioSoTietDM.ejs");
    } catch (error) {
        console.error("Lỗi khi render trang soTietDM:", error);
        res.status(500).send("Có lỗi xảy ra khi tải trang. Vui lòng thử lại sau.");
    }
};

// Controller lấy danh sách số tiết định mức
const getSoTietDM = async (req, res) => {
    const pool = await createPoolConnection();
    try {
        const [rows] = await pool.execute(
            "SELECT NamHoc as nam, GiangDay as so_tiet_dao_tao, VuotGio as so_tiet_vuot_gio, NCKH as so_tiet_nckh FROM sotietdinhmuc ORDER BY NamHoc DESC"
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Lỗi khi lấy thông tin định mức:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin định mức"
        });
    } finally {
        if (pool) pool.end();
    }
};

// Controller thêm năm mới
const createSoTietDM = async (req, res) => {
    const pool = await createPoolConnection();
    try {
        const { namHoc, giangDay = 300, vuotGio = 330, nckh = 170 } = req.body;
        
        // Validate input
        if (!namHoc || isNaN(namHoc)) {
            return res.status(400).json({
                success: false,
                message: "Năm học không hợp lệ"
            });
        }

        // Kiểm tra năm học đã tồn tại
        const [existing] = await pool.execute(
            "SELECT NamHoc FROM sotietdinhmuc WHERE NamHoc = ?",
            [namHoc]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Năm học này đã tồn tại"
            });
        }

        // Thêm mới với transaction
        await pool.beginTransaction();
        
        await pool.execute(
            "INSERT INTO sotietdinhmuc (NamHoc, GiangDay, VuotGio, NCKH) VALUES (?, ?, ?, ?)",
            [namHoc, giangDay, vuotGio, nckh]
        );

        await pool.commit();

        res.status(201).json({
            success: true,
            message: "Thêm năm học mới thành công"
        });

    } catch (error) {
        if (pool) await pool.rollback();
        console.error("Lỗi khi thêm năm học mới:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi thêm năm học mới"
        });
    } finally {
        if (pool) pool.end();
    }
};

// Controller cập nhật số tiết định mức
const updateSoTietDM = async (req, res) => {
    const pool = await createPoolConnection();
    try {
        const { nam } = req.params;
        const { soTietDaoTao, soTietVuotGio, soTietNCKH } = req.body;
        
        // Validate input
        if (!nam || isNaN(nam)) {
            return res.status(400).json({
                success: false,
                message: "Năm học không hợp lệ"
            });
        }

        let updateQuery = "UPDATE sotietdinhmuc SET";
        const updateValues = [];
        
        if (soTietDaoTao !== undefined) {
            updateQuery += " GiangDay = ?,";
            updateValues.push(soTietDaoTao);
        }
        
        if (soTietVuotGio !== undefined) {
            updateQuery += " VuotGio = ?,";
            updateValues.push(soTietVuotGio);
        }
        
        if (soTietNCKH !== undefined) {
            updateQuery += " NCKH = ?,";
            updateValues.push(soTietNCKH);
        }
        
        if (updateValues.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có dữ liệu cần cập nhật"
            });
        }

        updateQuery = updateQuery.slice(0, -1);
        updateQuery += " WHERE NamHoc = ?";
        updateValues.push(nam);

        await pool.beginTransaction();
        
        const [result] = await pool.execute(updateQuery, updateValues);
        
        if (result.affectedRows === 0) {
            await pool.rollback();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy định mức cho năm này"
            });
        }

        await pool.commit();

        res.status(200).json({
            success: true,
            message: "Cập nhật định mức thành công"
        });

    } catch (error) {
        if (pool) await pool.rollback();
        console.error("Lỗi khi cập nhật định mức:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật định mức"
        });
    } finally {
        if (pool) pool.end();
    }
};

module.exports = {
    renderSoTietDM,
    getSoTietDM,
    createSoTietDM,
    updateSoTietDM
};
