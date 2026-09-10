# Data-Source-Explorer Reference

> **Source-of-truth status:** Reconciled against current Vượt Giờ V2 runtime tables on **2026-09-10**. `vg_coi_cham_ra_de` is a historical sample only; current KTHP aggregation uses `vg_kthp`, `vg_kthp_ra_de`, `vg_kthp_coi_thi`, and `vg_kthp_cham_thi`.

## How to use this skill

### Step 1: Run the extractor

```bash
node skills/vuot_gio/data-source-explorer/scripts/extract-table-samples.js
```

This queries the configured database tables and writes output files.

### Step 2: Review outputs

- `data-samples/<table>.json` — contains schema (field definitions) and up to 10 sample rows
- `schemas/<table>.schema.json` — simplified schema (field, type, nullable, key, default)

### Step 3: Use in your code

Reference the output JSON files to understand real field names, types, and data shapes when building:
- Aggregation queries
- Import/export validators
- Test fixtures

## Configuration

Edit `config/tables.json` to add or remove tables. Default tables cover all overtime aggregation sources:
- Teaching: `giangday`
- KTHP: `vg_kthp` plus `vg_kthp_ra_de`, `vg_kthp_coi_thi`, and `vg_kthp_cham_thi`
- External classes: `vg_lop_ngoai_quy_chuan`
- Thesis guidance: `exportdoantotnghiep`
- Field trips: `vg_huong_dan_tham_quan_thuc_te`
- Reference tables: `sotietdinhmuc`, `nhanvien`, `he_dao_tao`, `phongban`

Projected sources also include `quychuan`, `doantotnghiep`, and the LNQC draft
table `course_schedule_details`. The generated `vg_coi_cham_ra_de` sample/schema
files remain available for historical comparison only.

## Security notes

- Read-only operations (SELECT only)
- Requires database connection credentials
- Requires human approval before running on production
- Sample data may contain real lecturer names (anonymize before sharing)
