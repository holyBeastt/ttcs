const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/sangKien.service");

module.exports = buildTypeInputController(service, "sáng kiến");
