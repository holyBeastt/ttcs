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
- Only files matching these patterns are included: src/**/nckh_v3/**, docs/business-workflow/nckh-compensation.md, docs/business-workflow/business-rules.md, docs/business-workflow/as-is-overview.md
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Statistics

68 files | 8,356 lines

| Language | Files | Lines |
|----------|------:|------:|
| JavaScript | 60 | 6,763 |
| EJS | 8 | 1,593 |

**Largest files:**
- `src/public/js/nckh_v3/list/index.js` (591 lines)
- `src/public/js/nckh_v3/main/typeInputCommon.js` (584 lines)
- `src/mappers/nckh_v3/import.mapper.js` (497 lines)
- `src/views/nckh_v3/import.ejs` (462 lines)
- `src/services/nckh_v3/import.service.js` (459 lines)
- `src/services/nckh_v3/record.service.js` (393 lines)
- `src/repositories/nckh_v3/stats.repo.js` (370 lines)
- `src/public/js/nckh_v3/main/import.js` (327 lines)
- `src/services/nckh_v3/export.service.js` (326 lines)
- `src/services/nckh_v3/typeInput.service.js` (309 lines)