const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/sachGiaoTrinh.service");

module.exports = buildTypeInputController(service, "sách, giáo trình");
