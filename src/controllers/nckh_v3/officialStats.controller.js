const { STATS_SCOPE } = require("../../config/nckh_v3/statsScope");

const renderPage = (_req, res) => {
  res.render("nckh_v3/stats_official.ejs", { statsScope: STATS_SCOPE.OFFICIAL });
};

module.exports = { renderPage };
