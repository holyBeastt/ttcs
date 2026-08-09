const test = require('node:test');
const assert = require('node:assert');
const { escapeLikePattern, buildLikePattern } = require('../../src/utils/sql-escape');

test('sql-escape.js - escapeLikePattern tests', async (t) => {
    await t.test('should escape percent, underscore, and backslash characters', () => {
        assert.strictEqual(escapeLikePattern('abc%def_ghi\\jkl'), 'abc\\%def\\_ghi\\\\jkl');
    });

    await t.test('should return empty string for null or undefined input', () => {
        assert.strictEqual(escapeLikePattern(null), '');
        assert.strictEqual(escapeLikePattern(undefined), '');
    });

    await t.test('should not change clean strings', () => {
        assert.strictEqual(escapeLikePattern('clean string 123'), 'clean string 123');
    });
});

test('sql-escape.js - buildLikePattern tests', async (t) => {
    await t.test('should add percentage prefix and suffix by default', () => {
        assert.strictEqual(buildLikePattern('test_value'), '%test\\_value%');
    });

    await t.test('should support disabling prefix or suffix', () => {
        assert.strictEqual(buildLikePattern('test_value', { prefix: false }), 'test\\_value%');
        assert.strictEqual(buildLikePattern('test_value', { suffix: false }), '%test\\_value');
        assert.strictEqual(buildLikePattern('test_value', { prefix: false, suffix: false }), 'test\\_value');
    });
});
