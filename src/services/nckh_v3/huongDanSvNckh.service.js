const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "HUONGDAN",
  mode: "equal",
  logLabel: "hướng dẫn sinh viên NCKH",
});
