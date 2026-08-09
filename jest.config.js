'use strict';

module.exports = {
  roots: ['<rootDir>/test'],
  testPathIgnorePatterns: [
    '/test/integration/data-sync\\.test\\.js$',
    '/test/mappers/summary\\.mapper\\.test\\.js$',
    '/test/services/nckh-formula\\.test\\.js$',
    '/test/utils/sql-escape\\.test\\.js$',
    '/test/moigiang/integration/',
    '/test/moigiang/regression/',
  ],
};
