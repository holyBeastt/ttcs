---
name: overtime-workflow
description: Understand and safely modify the university teaching overtime (vuotgio) module. Captures canonical formulas, approval workflows, business rules, and drift detection. Use when implementing overtime calculations, managing approvals, or detecting workflow changes.
license: Proprietary
metadata:
  domain: academic-workload
  version: "1.0"
---

# Overtime Workflow Skill

This skill packages domain knowledge for the university's "vuotgio" (overtime/teaching overload) workload management module.

## What it does

Provides agents with:
- **Canonical formulas**: How overtime is calculated with NCKH deductions and caps
- **Business rules**: Approval gates, inclusion criteria, rounding policies
- **Drift detection**: Scripts to validate code against documented formulas
- **Edge cases**: Handling of negative totals, missing quotas, partial approvals

## When to use it

Use this skill when:
- Implementing or modifying overtime calculation logic
- Managing approval workflows or access controls
- Detecting unintended changes to the calculation formula
- Understanding dependencies on NCKH data

## Key files and scripts

See `references/` for detailed documentation:
- `references/formulas.md` — canonical formulas with pseudocode
- `references/protected-rules.md` — business rules that must not change without review
- `references/workflow.md` — data sources and aggregation flow

Run the validator to detect formula drift:

```bash
node scripts/validate_implementation.js --propose
```

See `references/change-tracking.md` for the complete drift detection workflow.
