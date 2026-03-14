const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/deXuatNghienCuu.service");

module.exports = buildTypeInputController(service, "đề xuất nghiên cứu");
