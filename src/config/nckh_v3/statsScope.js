const STATS_SCOPE = Object.freeze({
  OFFICIAL: "OFFICIAL",
  PREVIEW: "PREVIEW",
});

const normalizeStatsScope = (scope) =>
  scope === STATS_SCOPE.PREVIEW ? STATS_SCOPE.PREVIEW : STATS_SCOPE.OFFICIAL;

module.exports = {
  STATS_SCOPE,
  normalizeStatsScope,
};
