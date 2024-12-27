const createPoolConnection = require("../config/databasePool");

// Controller cho trang soTietDM
const renderSoTietDM = async (req, res) => {
    const pool = await createPoolConnection();
    try {
        // Lấy dữ liệu hiện tại
        const [rows] = await pool.execute("SELECT GiangDay, VuotGio, NCKH FROM sotietdinhmuc LIMIT 1");
        res.render("vuotGioSoTietDM.ejs", { 
            currentData: rows[0] || { GiangDay: 0, VuotGio: 0, NCKH: 0 } 
        });
    } catch (error) {
        console.error("Lỗi khi render trang soTietDM:", error);
        res.status(500).send("Có lỗi xảy ra khi tải trang. Vui lòng thử lại sau.");
    } finally {
        if (pool) pool.end();
    }
};

// Controller cập nhật số tiết định mức
const updateSoTietDM = async (req, res) => {
    const pool = await createPoolConnection();
    try {
        const { soTietDaoTao, soTietVuotGio, soTietNCKH } = req.body;
        
        // Validate input
        if (!soTietDaoTao || !soTietVuotGio || !soTietNCKH) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin"
            });
        }

        // Kiểm tra xem đã có dữ liệu chưa
        const [existingRows] = await pool.execute("SELECT COUNT(*) as count FROM sotietdinhmuc");
        
        if (existingRows[0].count === 0) {
            // Nếu chưa có dữ liệu, thêm mới
            await pool.execute(
                "INSERT INTO sotietdinhmuc (GiangDay, VuotGio, NCKH) VALUES (?, ?, ?)",
                [soTietDaoTao, soTietVuotGio, soTietNCKH]
            );
        } else {
            // Nếu đã có dữ liệu, cập nhật
            await pool.execute(
                "UPDATE sotietdinhmuc SET GiangDay = ?, VuotGio = ?, NCKH = ?",
                [soTietDaoTao, soTietVuotGio, soTietNCKH]
            );
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật định mức thành công"
        });

    } catch (error) {
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
    updateSoTietDM
};
