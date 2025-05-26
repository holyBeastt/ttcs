const fs = require("fs");
const path = require("path");
const appRoot = require("app-root-path");

const transferFacultyFileGvm = (oldFaculty, newFaculty, subject, fullName) => {
  const oldFolder = path.join(
    appRoot.path,
    "Giang_Vien_Moi",
    oldFaculty,
    subject,
    fullName
  );
  const newFolder = path.join(
    appRoot.path,
    "Giang_Vien_Moi",
    newFaculty,
    oldFaculty,
    fullName
  );

  if (fs.existsSync(oldFolder)) {
    // Tạo folder cha nếu chưa có
    console.log("📁 Tạo thư mục:", path.dirname(newFolder));
    fs.mkdirSync(path.dirname(newFolder), { recursive: true });
    console.log("✅ Tạo xong");

    fs.renameSync(oldFolder, newFolder);
    console.log("✅ Đã đổi thư mục:", oldFolder, "→", newFolder);

    // Đổi tên file chứa mã khoa cũ
    const files = fs.readdirSync(newFolder);
    files.forEach((file) => {
      if (file.startsWith(oldFaculty + "_")) {
        const newFileName = file.replace(oldFaculty + "_", newFaculty + "_");
        fs.renameSync(
          path.join(newFolder, file),
          path.join(newFolder, newFileName)
        );
        console.log("✅ Đã đổi tên file:", file, "→", newFileName);
      }
    });

    const oldDeptFolder = path.join(appRoot.path, "Giang_Vien_Moi", oldFaculty);
    if (fs.existsSync(oldDeptFolder)) {
      const files = fs.readdirSync(oldDeptFolder);
      if (files.length === 0) {
        fs.rmdirSync(oldDeptFolder); // Không cần recursive vì thư mục đã rỗng
        console.log("🗑️ Đã xóa thư mục khoa cũ (rỗng):", oldDeptFolder);
      } else {
        console.log("⚠️ Không xóa, thư mục còn dữ liệu:", oldDeptFolder);
      }
    }
  } else {
    console.warn("⚠️ Thư mục cũ không tồn tại:", oldFolder);
  }
};

module.exports = transferFacultyFileGvm;
