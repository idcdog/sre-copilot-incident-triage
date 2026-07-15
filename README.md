# SRE Copilot: Evidence-Driven Incident Triage

A public-safe OpenAI Build Week project draft for an AI-assisted SRE workflow.

The demo shows how an SRE copilot can turn alerts, logs, traces, metrics, and change history into an auditable incident evidence package. It is designed around a strict safety boundary: the assistant can summarize, correlate, and recommend next read-only checks, but any production action requires human approval.

## Public safety statement

This repository contains only synthetic data and sanitized product concepts.

It intentionally excludes:

- original presentation files, slide exports, screenshots, and internal diagrams;
- real company names, internal system names, team names, org structure, or roadmap requests;
- real logs, traces, metrics, incidents, customer data, tickets, credentials, or API keys;
- exact internal operating metrics or pilot results.

## What is included

- A dependency-free browser demo in `index.html`.
- Synthetic incident evidence in `data/mock-incident.json`.
- A Devpost draft in `docs/devpost-draft.md`.
- A sanitization checklist in `docs/sanitization.md`.
- Architecture notes in `docs/architecture.md`.
- A model-output contract in `docs/model-contract.md`.
- A local public-safety validation script in `scripts/validate-public-safety.mjs`.
- A Three.js RCA mission-control topology showing serial and parallel agent investigation.

## Run locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser.

The RCA mission-control view loads Three.js from a public CDN for the animated topology. If Three.js is unavailable or the user prefers reduced motion, the page falls back to the static stage timeline and agent panels.

## Validate public safety

Run:

```bash
npm run validate
```

The validation checks for blocked file types, common secret patterns, personal email addresses, and accidental inclusion of media or presentation exports.

## Concept

The demo models a read-only triage loop:

1. Normalize alert context into an incident brief.
2. Gather evidence from mock logs, metrics, traces, and deployment changes.
3. Generate candidate causes with supporting and contradicting evidence.
4. Surface data gaps and cap confidence when evidence is incomplete.
5. Produce a human-approved next-step plan.

The animated RCA workflow uses a common synthetic production topology: edge, gateway, service, queue, cache, database, observability, change-log, and approval-gate layers. Multiple specialist agents fan out in parallel during evidence collection, then converge into a serial RCA synthesis and approval boundary.

## OpenAI fit

In a full implementation, OpenAI models can help with:

- natural-language incident summaries;
- evidence clustering across noisy observability signals;
- retrieval over runbooks and previous incident knowledge;
- structured RCA hypothesis generation;
- Codex-assisted tool integration and workflow automation.

This public repository keeps the model adapter mocked so the project can be reviewed without credentials or private infrastructure.

## Repository structure

```text
.
├── app.js
├── data/mock-incident.json
├── docs/
│   ├── architecture.md
│   ├── devpost-draft.md
│   ├── model-contract.md
│   └── sanitization.md
├── index.html
├── package.json
├── scripts/validate-public-safety.mjs
└── styles.css
```

## Demo status

This is a frontend-only public demo. The model adapter, production tool registry, and approval workflow are represented as design contracts rather than live integrations. The demo is read-only and advisory; it does not connect to production systems or execute changes.
