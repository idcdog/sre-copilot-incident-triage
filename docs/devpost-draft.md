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

## How we built it

This public demo is a dependency-free static web app using HTML, CSS, JavaScript, and a synthetic JSON evidence bundle.

The full product direction is intended to use OpenAI models for evidence clustering, incident summarization, runbook retrieval, RCA drafting, and Codex-assisted integration work. The public repository keeps model calls mocked so reviewers do not need private credentials or infrastructure access.

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

## What is next

- Add a real model adapter behind an environment-variable API key.
- Add structured output validation for incident evidence packages.
- Add a mock runbook retrieval layer.
- Add an approval workflow for recommended mitigations.
- Add test fixtures for different incident classes.

## Submission notes

Before publishing:

- verify that all screenshots and videos use only this public-safe demo;
- do not attach internal presentation files or exports;
- do not include real company, team, system, incident, metric, or customer names;
- keep the repository private until final review is complete.

