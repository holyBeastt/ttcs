const trainingSystemMapper = require("../../../../mappers/vuotgio_v2/trainingSystem.mapper");

const classifyHeDaoTao = (tenHeDaoTao) => trainingSystemMapper.classify(tenHeDaoTao);

const normalizeDoiTuongLabel = (tenHeDaoTao) =>
  trainingSystemMapper.getLabel(trainingSystemMapper.getCategoryKey(tenHeDaoTao));

const getLabel = (key) => trainingSystemMapper.getLabel(key);

module.exports = {
  classifyHeDaoTao,
  normalizeDoiTuongLabel,
  getLabel,
};
