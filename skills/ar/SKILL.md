---
name: ar
description: Long-running autonomous research loop that plans sub-goals, auto-dispatches research skills (/deepresearch, /lit, /autoresearch, /review), reviews each round, and accepts approval at configurable checkpoints. Use when the user asks for open-ended long-form research, autonomous investigation, or a "self-driving researcher" over hours to days.
---

# /ar — Long-running Autonomous Research

Run the `/ar` workflow. The slash command expands the full workflow instructions in the active session; do not try to read a relative prompt-template path from the installed skill directory.

`/ar <topic>` starts a plan-driven stage loop:
- Generates a plan artifact (`outputs/.plans/<slug>-ar.md`) with a sub-goal tree
- Each round: selects a sub-goal, dispatches evidence collection (via `researcher` subagent running `/deepresearch`, `/lit`, `/autoresearch`, or direct research), runs `reviewer` for adversarial critique, updates the plan
- Configurable approval: `--approve each|stage|critical|never` (default: `critical` — reviewer self-approves, pauses only on FATAL or direction drift)
- Resumable: `/ar <slug>` reads the plan artifact and continues from the last round
- Every K rounds (default 3), `verifier` cleans up citations
- On convergence: `writer` synthesizes final brief, `verifier` adds citations, `reviewer` does final pass, provenance sidecar written

Session files: `outputs/.plans/<slug>-ar.md`, `outputs/.drafts/<slug>-round-N-*.md`, `outputs/<slug>.md`, `outputs/<slug>.provenance.md`

Distinct from `/autoresearch` (bounded single-metric optimization loop) — `/ar` is open-ended, multi-goal, and orchestrates other research commands.
