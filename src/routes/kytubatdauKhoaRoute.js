const express = require('express');
const router = express.Router();
const pool = require('../config/Pool');

// GET - List all ky tu bat dau khoa
router.get('/api/kytubatdau/list', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, viet_tat, khoa FROM kitubatdau_khoa ORDER BY id'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu' });
    }
});

// POST - Create new
router.post('/api/kytubatdau', async (req, res) => {
    const { viet_tat, khoa } = req.body;

    if (!viet_tat || !khoa) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }

    try {
        // Check duplicate
        const [existing] = await pool.query(
            'SELECT * FROM kitubatdau_khoa WHERE viet_tat = ?',
            [viet_tat]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ký tự bắt đầu đã tồn tại'
            });
        }

        // Insert
        const [result] = await pool.query(
            'INSERT INTO kitubatdau_khoa (viet_tat, khoa) VALUES (?, ?)',
            [viet_tat, khoa]
        );

        res.status(201).json({
            success: true,
            message: 'Thêm mới thành công',
            data: { id: result.insertId, viet_tat, khoa }
        });
    } catch (error) {
        console.error('Error creating record:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi thêm mới' });
    }
});

// PUT - Update
router.put('/api/kytubatdau/:id', async (req, res) => {
    const { id } = req.params;
    const { viet_tat, khoa } = req.body;

    console.log('Update request body:', req.body);
    console.log('Update request id:', id);

    try {
        const [result] = await pool.query(
            'UPDATE kitubatdau_khoa SET viet_tat = ?, khoa = ? WHERE id = ?',
            [viet_tat, khoa, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi' });
        }

        res.json({
            success: true,
            message: 'Cập nhật thành công',
            data: { id, viet_tat, khoa }
        });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật' });
    }
});

// DELETE - Remove
router.delete('/api/kytubatdau/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            'DELETE FROM kitubatdau_khoa WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi' });
        }

        res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa' });
    }
});

module.exports = router;
