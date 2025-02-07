const path = require('path');
const fs = require('fs');

// Controller xử lý yêu cầu tải tệp
exports.downloadFile = (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '..', 'templates', fileName); // Đường dẫn đến thư mục templates

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Tệp không tìm thấy');
        }

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Lỗi khi tải xuống:', err);
                res.status(500).send('Có lỗi xảy ra khi tải xuống');
            }
        });
    });
};

// Controller xử lý yêu cầu upload và ghi đè tệp
exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).send('Không có tệp nào được gửi!');
    }

    const filePath = path.join(__dirname, '..', 'templates', req.file.originalname); // Đường dẫn lưu tệp
    const tempPath = req.file.path; // Đường dẫn file tạm

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Nếu tệp chưa tồn tại, xóa file tạm và trả lỗi
            fs.unlink(tempPath, () => {});
            return res.status(400).send('Tên tệp tải lên không trùng với tên tệp đã tồn tại!');
        }

        // Nếu tệp đã tồn tại, xóa tệp cũ trước khi ghi đè
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Lỗi khi xóa tệp cũ:', err);
                fs.unlink(tempPath, () => {}); // Xóa file tạm nếu có lỗi
                return res.status(500).send('Có lỗi xảy ra khi xóa tệp cũ!');
            }

            // Di chuyển file mới vào thư mục templates
            fs.rename(tempPath, filePath, (err) => {
                if (err) {
                    console.error('Lỗi khi ghi đè tệp:', err);
                    fs.unlink(tempPath, () => {}); // Xóa file tạm nếu có lỗi
                    return res.status(500).send('Có lỗi xảy ra khi ghi đè tệp!');
                }

                res.json({ message: 'Tệp đã được tải lên và ghi đè thành công' });
            });
        });
    });
};
