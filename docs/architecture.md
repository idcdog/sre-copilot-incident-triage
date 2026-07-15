# Architecture

SRE Copilot is structured as a read-first incident response workflow. The public demo is static, but the architecture is intentionally shaped so a real implementation can add model calls and tool integrations without weakening the safety boundary.

## Layers

### 1. Signal intake

Inputs are normalized into a small incident bundle:

- alert metadata;
- metric symptoms;
- log excerpts;
- trace spans;
- recent changes;
- known data gaps.

The public demo uses `data/scenarios.js`. Every record is synthetic and versioned with the deterministic scenario schema.

### 2. Evidence control plane

The control plane is responsible for deterministic behavior that should not be delegated to a language model:

- tool allowlists;
- read-only versus write-action separation;
- approval requirements;
- evidence provenance;
- confidence caps;
- replayable incident notes.

### 3. Reasoning adapter

The model-facing adapter receives a bounded evidence bundle and returns structured output. In this repository the adapter is represented by mock data so reviewers can run the project without credentials.

Expected model responsibilities:

- summarize the incident;
- cluster related evidence;
- draft candidate causes;
- list contradicting evidence;
- identify data gaps;
- recommend safe next checks.

### 4. Tool registry

Tools are grouped by risk:

- read-only checks: metrics, logs, traces, service catalog, runbooks;
- approval-gated changes: rollback, restart, configuration changes, customer notification.

The assistant can recommend approval-gated actions but should not execute them by default.

### 5. Closure loop

The output is designed to be useful during and after an incident:

- current best explanation;
- confidence score and why it is limited;
- supporting evidence;
- contradicting evidence;
- follow-up checks;
- human approval boundary.

## Public demo boundary

This repository does not include:

- production integrations;
- credentials;
- real incidents;
- internal screenshots;
- private system names;
- organization-specific operating metrics.
