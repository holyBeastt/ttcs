# Data-Source-Explorer Reference

## How to use this skill

### Step 1: Run the extractor

```bash
node scripts/extract-table-samples.js
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
- KTHP (exams): `vg_coi_cham_ra_de`
- External classes: `vg_lop_ngoai_quy_chuan`
- Thesis guidance: `exportdoantotnghiep`
- Field trips: `vg_huong_dan_tham_quan_thuc_te`
- Reference tables: `sotietdinhmuc`, `nhanvien`, `he_dao_tao`, `phongban`

## Security notes

- Read-only operations (SELECT only)
- Requires database connection credentials
- Requires human approval before running on production
- Sample data may contain real lecturer names (anonymize before sharing)
