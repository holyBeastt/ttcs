const statsRepo = require("./stats.repo");

/**
 * Export Repository - Thin layer for export-specific queries.
 * Initially reusing statsRepo for data consistency.
 */
class ExportRepository {
  async getLecturerSummary(connection, filters) {
    return statsRepo.listLecturerSummary(connection, filters);
  }

  async getLecturerRecords(connection, filters) {
    return statsRepo.listLecturerRecords(connection, filters);
  }
}

module.exports = new ExportRepository();
