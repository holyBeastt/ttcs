This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# Summary

## Purpose

This is a reference codebase organized into multiple files for AI consumption.
It is designed to be easily searchable using grep and other text-based tools.

## File Structure

This skill contains the following reference files:

| File | Contents |
|------|----------|
| `project-structure.md` | Directory tree with line counts per file |
| `files.md` | All file contents (search with `## File: <path>`) |
| `tech-stacks.md` | Languages, frameworks, and dependencies per package (search with `## Tech Stack: <path>`) |
| `summary.md` | This file - purpose and format explanation |

## Usage Guidelines

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/services/vuotgio_v2/excel/**, src/services/vuotgio_v2/consolidatedExport.service.js, skills/vuot_gio/excel-dept-analyzer/SKILL.md, skills/vuot_gio/excel-master-consolidator/SKILL.md, skills/vuot_gio/excel-payment-generator/SKILL.md
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Statistics

20 files | 2,467 lines

| Language | Files | Lines |
|----------|------:|------:|
| JavaScript | 17 | 2,311 |
| Markdown | 3 | 156 |

**Largest files:**
- `src/services/vuotgio_v2/excel/components/excel-block.renderer.js` (804 lines)
- `src/services/vuotgio_v2/excel/utils/sdo-data.helpers.js` (230 lines)
- `src/services/vuotgio_v2/excel/components/kekhai-summary.component.js` (185 lines)
- `src/services/vuotgio_v2/excel/layouts/kekhai.layout.builder.js` (153 lines)
- `src/services/vuotgio_v2/excel/layouts/excel-columns.constants.js` (150 lines)
- `src/services/vuotgio_v2/excel/components/excel-header.renderer.js` (140 lines)
- `src/services/vuotgio_v2/excel/generators/keKhaiReport.generator.js` (119 lines)
- `src/services/vuotgio_v2/excel/utils/excel-style.utils.js` (107 lines)
- `src/services/vuotgio_v2/excel/generators/kekhai-formula.generator.js` (97 lines)
- `src/services/vuotgio_v2/excel/formulas/tableF.formula.builder.js` (97 lines)