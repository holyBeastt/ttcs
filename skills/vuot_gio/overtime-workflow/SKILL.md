---
name: overtime-workflow
description: Understand and safely modify the university teaching overtime (vuotgio) module. Captures the current formulas, approval workflows, snapshot behavior, and drift-detection caveats.
license: Proprietary
metadata:
  domain: academic-workload
  version: "1.1"
---

# Overtime Workflow Skill

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this skill conflicts with source code, source code is authoritative.

Use this skill when working on Vượt Giờ V2 (`/v2/vuotgio`), its NCKH dependency, approval/lock flow, snapshot/export behavior, or policy formulas.

## Current production path

```text
tongHop.service
  → summary.mapper.toAtomicSDO()/toCollectionSDO()
  → OvertimePolicyFactory
  → PolicyV1 or PolicyV2
```

The non-exported `summary.mapper.calculateOvertime()` helper is not the production entry point. The validator under `scripts/` still expects that export and is currently incompatible with the source; do not treat a successful validator run as evidence until it is updated.

## References in this skill

The canonical files are in this directory, not under `references/`:

- `formulas.md` — policy formulas and defaults.
- `protected-rules.md` — rules that must not drift without review.
- `workflow.md` — sources, approval gates, and snapshot transitions.
- `architecture.md` — route/service/repository/mapper map.
- `edge-cases.md` — failure-prone cases and test ideas.
- `change-tracking.md` — drift-detection design and current validator limitation.
- `references/REFERENCE.md` — index of these files.

## When to use

Use this skill before changing:

- overtime policy or quota handling;
- LNQC/KTHP/HDTQ approval predicates;
- NCKH injection into SDOs;
- year lock or snapshot reads;
- payment breakdown/export;
- Vượt Giờ routes, repositories, or mappers.
