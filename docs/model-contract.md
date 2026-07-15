# Model contract

This project treats model output as structured evidence, not as an autonomous command.

## Input shape

```json
{
  "incident": {
    "id": "demo-inc-2026-07-15-001",
    "title": "Elevated checkout latency in demo service",
    "severity": "P2",
    "service": "checkout-api-demo",
    "environment": "staging-demo",
    "startedAt": "2026-07-15T02:14:00Z",
    "summary": "Synthetic incident summary"
  },
  "signals": {
    "alerts": [],
    "logs": [],
    "traces": [],
    "changes": []
  }
}
```

## Output shape

```json
{
  "summary": "Short incident explanation.",
  "candidateCauses": [
    {
      "label": "Connection pool limit too low",
      "confidence": 0.72,
      "supportingEvidence": ["Evidence item"],
      "contradictingEvidence": ["Evidence item"]
    }
  ],
  "dataGaps": ["Missing signal"],
  "safeNextChecks": ["Read-only follow-up check"],
  "approvalRequired": ["Production-changing operation"]
}
```

## Guardrails

- Confidence must be lower when important evidence is missing.
- Every cause must include supporting evidence.
- Contradicting evidence should be preserved instead of hidden.
- Write actions must be separated from read-only checks.
- Production-changing actions require explicit human approval.
- The model should not invent telemetry, tickets, users, services, or metrics.

## Why structured output matters

Incident response is operationally sensitive. Free-form prose is useful for humans, but automation needs predictable fields that can be validated, audited, and replayed. The model contract gives the control plane a stable boundary around model reasoning.

