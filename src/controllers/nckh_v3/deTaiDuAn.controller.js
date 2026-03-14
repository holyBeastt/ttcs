const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/deTaiDuAn.service");

module.exports = buildTypeInputController(service, "đề tài, dự án");
