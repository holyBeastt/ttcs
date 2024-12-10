const path = require('path');
const fs = require('fs');

// Controller xử lý yêu cầu tải tệp
exports.downloadFile = (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '..', 'templates', fileName); // Đường dẫn đến thư mục templates

    fs.exists(filePath, (exists) => {
        if (exists) {
            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('Lỗi khi tải xuống:', err);
                    res.status(500).send('Có lỗi xảy ra khi tải xuống');
                }
            });
        } else {
            res.status(404).send('Tệp không tìm thấy');
        }
    });
};
// Controller xử lý yêu cầu upload và ghi đè tệp
exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).send('Không có tệp nào được gửi!');
    }

    const filePath = path.join(__dirname, '..', 'templates', req.file.originalname); // Đường dẫn lưu tệp

    // Kiểm tra nếu tệp đã tồn tại trong thư mục templates
    fs.exists(filePath, (exists) => {
        if (exists) {
            // Nếu tệp đã tồn tại, xóa tệp cũ
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Lỗi khi xóa tệp cũ:', err);
                    return res.status(500).send('Có lỗi xảy ra khi xóa tệp cũ!');
                }

                // Di chuyển tệp tải lên và ghi đè tệp cũ
                fs.rename(req.file.path, filePath, (err) => {
                    if (err) {
                        console.error('Lỗi khi ghi đè tệp:', err);
                        return res.status(500).send('Có lỗi xảy ra khi ghi đè tệp!');
                    }

                    res.json({ message: 'Tệp đã được tải lên và ghi đè thành công' });
                });
            });
        } else {
            // Nếu tệp chưa tồn tại, chỉ cần lưu lại
            fs.rename(req.file.path, filePath, (err) => {
                if (err) {
                    console.error('Lỗi khi lưu tệp:', err);
                    return res.status(500).send('Có lỗi xảy ra khi lưu tệp!');
                }

                res.json({ message: 'Tệp đã được tải lên thành công!' });
            });
        }
    });
};
