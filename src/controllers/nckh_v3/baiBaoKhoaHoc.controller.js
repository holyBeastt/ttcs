const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/baiBaoKhoaHoc.service");

module.exports = buildTypeInputController(service, "bài báo khoa học");
