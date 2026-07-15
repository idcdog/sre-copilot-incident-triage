# Sanitization notes

This repository is prepared for public review and intentionally avoids internal material.

## Removed categories

- Original presentation files and slide exports.
- Internal screenshots, diagrams, or product UI captures.
- Company-specific names, internal team names, and private platform names.
- Real observability data, logs, traces, alerts, incidents, tickets, metrics, and customer context.
- Roadmap details, management asks, pilot results, operational targets, or internal adoption numbers.
- Credentials, tokens, API keys, billing details, or personal account data.

## Replacement strategy

- Internal service names were replaced with generic demo names such as `checkout-api-demo`.
- Internal telemetry sources were replaced with mock categories: metrics, logs, traces, and changes.
- Internal metrics were replaced with synthetic example values.
- Operational workflow details were generalized into a reusable SRE incident-triage pattern.
- Product screenshots were replaced by a lightweight static demo.

## Review checklist before making the repository public

- Search the repository for internal project names and company names.
- Confirm that all data under `data/` is synthetic.
- Confirm no images, slide files, PDFs, or exported screenshots are committed.
- Confirm no `.env` files, API keys, or credentials are committed.
- Confirm Devpost screenshots and videos are captured only from this sanitized demo.

