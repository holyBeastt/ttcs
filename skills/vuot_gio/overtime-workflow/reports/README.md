# Historical generated reports

> **Status:** Non-authoritative generated artifacts. Reviewed on **2026-09-10**.

The `diff-report-*.json` files in this directory were generated from earlier
fixtures or earlier mapper versions. They intentionally retain the inputs and
outputs produced at generation time (including older values such as
`dinhMucNCKH=280`). Do not rewrite those values just to make a historical report
look current.

For current behavior, use:

- `src/mappers/vuotgio_v2/policies/PolicyV1.js` and `PolicyV2.js`;
- `src/mappers/vuotgio_v2/policies/OvertimePolicyFactory.js`;
- `src/services/vuotgio_v2/department_excel/data/calculator.js`;
- the canonical documents in `docs/business-workflow/` and
  `skills/vuot_gio/overtime-workflow/`.

In particular, current runtime defaults are `dinhMucChuan=280` and
`dinhMucNCKH=200`, and `MAX_PAYABLE_HOURS=300` is declared but not applied by
the current payment calculator.
