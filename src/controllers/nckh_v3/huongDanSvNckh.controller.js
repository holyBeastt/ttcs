const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/huongDanSvNckh.service");

module.exports = buildTypeInputController(service, "hướng dẫn sinh viên NCKH");
