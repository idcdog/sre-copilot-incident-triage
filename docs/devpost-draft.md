# Devpost draft

## Project name

SRE Copilot: Evidence-Driven Incident Triage

## Tagline

An AI-assisted SRE workflow that converts observability signals into auditable incident evidence, RCA hypotheses, and human-approved next steps.

## Inspiration

Incident response often fails because evidence is scattered across alerts, logs, traces, dashboards, change records, and runbooks. The goal of this project is to make that evidence easier to inspect without turning the assistant into an unsafe autonomous operator.

## What it does

The demo takes a synthetic incident bundle and produces:

- a normalized incident brief;
- grouped evidence from mock metrics, logs, traces, and changes;
- candidate root-cause hypotheses with supporting and contradicting evidence;
- confidence-limiting data gaps;
- a safety boundary that separates read-only assistance from actions requiring human approval.
- an architecture-style interface showing how the evidence control plane separates model reasoning from deterministic approval policy.
- a Three.js RCA mission-control view where agents fan out across a synthetic edge, gateway, service, queue, cache, database, observability, and approval-gate topology.
- three switchable synthetic scenarios: checkout latency, database saturation, and message queue backlog.
- synthetic runbook snippets used as advisory context.
- a local-only approval packet generator for blocked mitigation actions.

## How we built it

This public demo is a static web app using HTML, CSS, JavaScript, a Three.js CDN import for the topology animation, synthetic JavaScript scenario data, and synthetic runbook snippets.

The RCA topology uses Three.js from a public CDN for the animated mission-control view. If it cannot load, the static agent timeline still explains the workflow.

The full product direction is intended to use OpenAI models for evidence clustering, incident summarization, runbook retrieval, RCA drafting, and Codex-assisted integration work. The public repository keeps model calls mocked so reviewers do not need private credentials or infrastructure access.

The repository also includes a public-safety validation script that checks for common secret patterns, personal email addresses, and blocked media or presentation files before publishing.

## OpenAI usage

Planned OpenAI integration points:

- GPT-class models for incident summaries and hypothesis generation;
- structured outputs for evidence packages and approval boundaries;
- retrieval over runbooks and prior synthetic incident examples;
- Codex for implementation, refactoring, tests, and integration tasks.

## Challenges

The main challenge is not generating text. It is keeping the workflow auditable, evidence-backed, and safe. The design therefore treats confidence as bounded by evidence quality and requires explicit human approval before any production-changing operation.

## Accomplishments

- Public-safe runnable demo with synthetic incident evidence.
- Clear safety model for SRE workflows.
- Sanitized Devpost-ready project narrative.
- No dependency on internal data, screenshots, systems, or credentials.
- Architecture and model-contract documentation that explain how a real implementation can add OpenAI model calls while preserving approval boundaries.
- A cinematic topology animation that demonstrates serial intake, parallel evidence collection, RCA synthesis, and approval-gated action.
- A deterministic Devpost mode at `?demo=devpost` for screen recording.
- Three incident scenarios that reuse one topology while changing evidence, confidence factors, and RCA output.
- Copyable RCA brief and approval packet outputs.

## What is next

- Add a real model adapter behind an environment-variable API key.
- Add structured output validation for incident evidence packages.
- Add a real retrieval adapter for approved public/demo runbooks.
- Add a real approval workflow integration behind explicit operator confirmation.
- Add test fixtures for different incident classes.

## Submission notes

Before publishing:

- verify that all screenshots and videos use only this public-safe demo;
- do not attach internal presentation files or exports;
- do not include real company, team, system, incident, metric, or customer names;
- publish only the sanitized repository and demo URL.
