const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/thanhVienHoiDong.service");

module.exports = buildTypeInputController(service, "thành viên hội đồng khoa học");
