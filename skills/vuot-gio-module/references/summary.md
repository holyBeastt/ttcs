This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

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
- Only files matching these patterns are included: src/**/vuotgio_v2/**, docs/business-workflow/workload-aggregation.md, docs/business-workflow/business-rules.md, docs/business-workflow/as-is-overview.md, docs/business-workflow/tổng quan luồng phân theo loại giảng viên.md, skills/vuot_gio/overtime-workflow/**
- Files matching these patterns are excluded: src/services/vuotgio_v2/excel/**, src/services/vuotgio_v2/consolidatedExport.service.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Statistics

103 files | 23,508 lines

| Language | Files | Lines |
|----------|------:|------:|
| JavaScript | 74 | 15,625 |
| EJS | 14 | 7,134 |
| Markdown | 11 | 269 |
| JSON | 4 | 480 |

**Largest files:**
- `src/views/vuotgio_v2/vuotgio.tongHopGV.ejs` (1,280 lines)
- `src/public/js/vuotgio_v2/tongHop/giangVien.js` (819 lines)
- `src/public/js/vuotgio_v2/lopNgoaiQC/themLopNgoaiQC.js` (809 lines)
- `src/public/js/vuotgio_v2/lopNgoaiQC/danhSachLopNgoaiQC.js` (800 lines)
- `src/views/vuotgio_v2/vuotgio.add.coiChamRaDe.ejs` (768 lines)
- `src/public/js/vuotgio_v2/duyetKTHP/index.js` (763 lines)
- `src/public/js/vuotgio_v2/tongHop/khoa.js` (661 lines)
- `src/views/vuotgio_v2/vuotgio.thongKeGiangDay.ejs` (620 lines)
- `src/views/vuotgio_v2/vuotgio.tongHopKhoa.ejs` (607 lines)
- `src/views/vuotgio_v2/vuotGioKyTuBD.ejs` (593 lines)