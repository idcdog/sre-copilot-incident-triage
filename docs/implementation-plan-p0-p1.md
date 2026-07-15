# P0/P1 Implementation Plan

This plan upgrades the public-safe SRE Copilot demo from an animated concept into a judge-friendly hackathon workflow. All features use synthetic data only and remain read-only/advisory.

## Goals

- Make the value obvious within 30 seconds.
- Demonstrate multi-agent RCA behavior without requiring credentials or private infrastructure.
- Produce a useful incident artifact: a copyable RCA brief.
- Preserve the core safety claim: production-changing actions are approval-gated.
- Keep the implementation static, inspectable, and easy to run.

## Non-goals

- No real OpenAI API call in the public demo.
- No real observability, ticketing, deployment, or incident-management integration.
- No real company names, hostnames, logs, metrics, users, or credentials.
- No autonomous remediation.

## P0 features

### 0. Scenario schema first

All P0/P1 functionality must be driven by one shared scenario schema before feature work starts. Do not hardcode feature-specific data and migrate later.

Use JavaScript modules instead of runtime JSON fetches:

```text
data/scenarios.js
data/runbooks.js
```

Reason:

- The current demo should remain easy to inspect.
- The existing page already uses ES modules.
- A module-based data layer avoids `file://` JSON fetch failures when someone opens `index.html` directly.
- The same schema can drive one scenario now and multiple scenarios later.

Core scenario shape:

```js
export const scenarios = [
  {
    id: "checkout-latency-config-change",
    title: "Checkout latency after synthetic config change",
    incident: {
      id: "demo-inc-2026-07-15-001",
      severity: "P2",
      service: "checkout-api-demo",
      environment: "staging-demo",
      startedAt: "2026-07-15T02:14:00Z",
      summary: "Synthetic checkout latency increase after a demo configuration change."
    },
    topology: {
      suspectNodes: ["checkout", "inventory", "change", "observability"],
      approvalNode: "approval"
    },
    stages: [
      {
        id: "alert-intake",
        title: "01 · Alert intake",
        mode: "serial",
        activeAgents: ["router"],
        activeNodes: ["gateway", "checkout"],
        paths: [["users", "cdn", "waf", "gateway", "checkout"]],
        logEvents: [
          {
            offsetMs: 0,
            agentId: "router",
            risk: "read-only",
            message: "Scoped synthetic latency alert to checkout-api-demo."
          }
        ]
      }
    ],
    evidence: {
      alerts: [],
      metrics: [],
      logs: [],
      traces: [],
      changes: []
    },
    confidenceModel: {
      baseline: 30,
      cap: 99,
      factors: [
        { id: "metric-alignment", label: "Metric anomaly alignment", value: 22 },
        { id: "trace-correlation", label: "Trace span correlation", value: 18 },
        { id: "change-window", label: "Change-window match", value: 20 },
        { id: "log-pattern", label: "Log retry pattern", value: 14 },
        { id: "missing-pool-metric", label: "Missing pool saturation metric", value: -8 },
        { id: "missing-dependency-health", label: "Missing dependency health signal", value: -6 }
      ]
    },
    rca: {
      candidateRootCause: "Synthetic connection pool limit too low between checkout-api-demo and inventory-demo.",
      safeNextChecks: [],
      approvalRequiredActions: []
    },
    approvalBoundary: {
      allowedReadOnly: [],
      blockedProductionActions: []
    },
    runbookMatches: []
  }
];
```

Confidence calculation:

```js
finalConfidence = clamp(
  scenario.confidenceModel.baseline + sum(scenario.confidenceModel.factors.value),
  0,
  scenario.confidenceModel.cap
);
```

Confidence must never display as `100%` because the demo intentionally preserves uncertainty and data gaps.

### 1. One-click RCA demo run

Add a primary control labeled `Run incident simulation`.

Behavior:

1. Reset the mission state to stage 1.
2. Clear previous agent log entries.
3. Automatically advance through all RCA phases:
   - Alert intake.
   - Parallel evidence sweep.
   - Correlate suspect path.
   - Approval boundary.
   - RCA handoff.
4. For each phase, append agent log entries.
5. Update confidence factors and final RCA brief.
6. Stop on RCA handoff and show `Simulation complete`.

Implementation:

- Add `state.simulationStatus`: `idle | running | complete`.
- Add `runSimulation()` orchestrator with deterministic timed steps.
- Drive the run from `activeScenario.stages`.
- Each stage owns `logEvents`; confidence is calculated from `activeScenario.confidenceModel`.
- Manual stage click pauses the simulation.
- `prefers-reduced-motion` keeps the same state transitions but disables animated probe movement.

Acceptance criteria:

- One click runs the whole scenario.
- User can rerun from the beginning.
- No console errors.
- The run does not depend on network except existing Three.js CDN.

### 2. Multi-agent execution log

Add a control-plane log panel near Mission Control.

Log format:

```text
[00:00] Domain Router scoped incident to checkout-api-demo
[00:04] Metrics Agent found p95 latency spike
[00:07] Trace Agent found slow inventory.reserve span
[00:10] Change Agent matched config change inside incident window
[00:13] Policy Agent blocked rollback until human approval
[00:16] RCA Synthesizer generated current best explanation
```

Implementation:

- Add `agentLog` array in state.
- Render logs as an ordered list with stable `data-agent-id` and `data-stage-id`.
- Each event includes:
  - timestamp label;
  - agent id;
  - action;
  - evidence target;
  - risk level: `read-only | approval-required`.
- Provide a `Clear log` button.
- Add persistent copy above the log: `Scripted simulation · synthetic data · no live LLM or production tools`.

Acceptance criteria:

- Logs explain serial and parallel work.
- Approval-gated entries are visually distinct.
- Approval-gated entries use both text and visual treatment, not color alone.
- Agent log remains readable on mobile.

### 3. RCA report generation

Add a `Generated RCA brief` panel that updates at the end of the run.

Report sections:

- Incident summary.
- Timeline.
- Evidence used.
- Candidate root cause.
- Confidence explanation.
- Data gaps.
- Safe next checks.
- Approval-required actions.

Implementation:

- Generate Markdown from current synthetic state.
- Add `Copy RCA brief` button using Clipboard API.
- If Clipboard API is unavailable, select a textarea fallback.
- Keep report visible and deterministic for Devpost judges.

Acceptance criteria:

- RCA brief is copyable.
- Report contains no sensitive data.
- Report clearly says synthetic/read-only demo.

### 4. Evidence confidence model

Replace the single confidence number with an explainable factor model.

Synthetic factors for the first scenario:

- Metric anomaly alignment: `+22`.
- Trace span correlation: `+18`.
- Change-window match: `+20`.
- Log retry pattern: `+14`.
- Missing pool saturation metric: `-8`.
- Missing dependency health signal: `-6`.

Implementation:

- Add `confidenceModel.factors` to the active scenario module.
- Render factor bars with positive/negative direction.
- Calculate final confidence as `clamp(baseline + sum(factors), 0, cap)`.
- Link confidence factors to RCA brief.

Acceptance criteria:

- Users can see why confidence is not 100%.
- Negative evidence/data gaps are preserved.
- Confidence math is simple and reproducible.

### 5. Allowed/blocked safety boundary

Pull the core approval-boundary interaction into P0. The full approval packet generator remains P1, but the judge must immediately see that read-only checks and production-changing actions are treated differently.

UI:

- `Allowed read-only checks`
  - Query metrics.
  - Query traces.
  - Query logs.
  - Retrieve synthetic runbook snippets.
- `Blocked production actions`
  - Roll back config.
  - Restart service.
  - Change pool limit.
  - Notify customers.

Implementation:

- Render `approvalBoundary.allowedReadOnly` and `approvalBoundary.blockedProductionActions` from the active scenario.
- Use explicit labels: `Allowed` and `Blocked`.
- Do not rely on red/green alone; use text, icons, and border styles.
- Agent log entries with `risk: "approval-required"` link to this panel.

Acceptance criteria:

- The safety boundary is visible during the 60-second demo path.
- No control in P0 executes or submits an action.
- The RCA brief includes both safe next checks and approval-required actions.

## P1 features

### 6. Scenario switcher

Add a synthetic scenario selector with 3 scenarios:

1. Checkout latency after config change.
2. Database saturation.
3. Message queue backlog.

Each scenario changes:

- incident title;
- active suspect nodes;
- agent paths;
- evidence records;
- confidence factors;
- final RCA brief.

Implementation:

- Add additional scenarios to `data/scenarios.js`.
- Migrate the current incident into `data/scenarios.js` from the start. Do not keep `data/mock-incident.json` as a second source of truth.
- Use one topology; update highlighted nodes and paths per scenario.
- Pre-author node/path mapping per scenario before coding:
  - Checkout latency: `checkout`, `inventory`, `change`, `observability`.
  - Database saturation: `checkout`, `db`, `observability`.
  - Message queue backlog: `checkout`, `queue`, `worker`, `observability`.

Acceptance criteria:

- Switching scenario resets simulation.
- No private names or real metrics.
- Three.js topology remains stable.

### 7. Approval gate interaction

Make the safety boundary interactive.

P1 expands the P0 boundary into a copyable approval packet.

UI:

- AI-recommended actions:
  - Increase connection pool limit.
  - Roll back config change.
  - Restart worker.
- Read-only checks are marked `Allowed`.
- Production-changing actions are marked `Blocked`.
- `Request approval packet` creates an approval summary but does not execute anything.

Implementation:

- Add `approvalActions` data model.
- Add `requestApprovalPacket(actionId)` that generates a static packet:
  - action;
  - why recommended;
  - evidence references;
  - blast radius;
  - rollback plan;
  - approver placeholder.
- Do not include any submit-to-external-service behavior.

Acceptance criteria:

- The UI makes it impossible to confuse recommendation with execution.
- Approval packet is local-only and copyable.

### 7. Runbook retrieval mock

Priority: P2 unless P0/P1 core demo is already stable.

Add a read-only mock retrieval panel.

Behavior:

- During evidence sweep, show retrieved snippets:
  - `checkout latency triage`;
  - `dependency timeout investigation`;
  - `connection pool saturation checklist`.
- RCA brief cites these snippets as advisory context, not proof.

Implementation:

- Add `data/runbooks.json`.
- Render top 2 snippets for the active scenario.
- Use synthetic runbook titles and generic content.

Acceptance criteria:

- Runbook snippets improve realism.
- They do not claim real internal documentation exists.

### 8. Devpost demo mode

Add `?demo=devpost` mode.

Behavior:

- Auto-scroll to Mission Control.
- Show a compact sequence of: Run Simulation -> Agent Log -> RCA Brief.
- Disable nonessential UI flourishes.
- Stop on final RCA brief for screen recording.

Implementation:

- Parse `URLSearchParams`.
- If `demo=devpost`, start the simulation after initial render.
- Keep autoplay and simulation independent; simulation controls the timeline.

Acceptance criteria:

- Useful for recording a 60-90 second demo video.
- No hidden state; a refresh reproduces the same run.

## Data model changes

Recommended files:

```text
data/scenarios.js
data/runbooks.js
```

Core scenario shape:

The complete schema is defined in `P0 feature 0` above and must be implemented first.

## Implementation order

1. Add `data/scenarios.js` with the complete first scenario and confidence model.
2. Migrate current mock incident rendering to use the active scenario module.
3. Add confidence model calculation and UI.
4. Add allowed/blocked safety-boundary panel.
5. Add execution log state and UI.
6. Add `runSimulation()` orchestrator and state machine.
7. Add RCA brief generation and copy action.
8. Add scenario switcher with pre-authored node/path mappings.
9. Add approval packet generator.
10. Add Devpost demo mode.
11. Optional: add runbook mock after core flow is stable.
12. Update README and Devpost draft.
13. Validate public safety and browser behavior.

## Validation plan

- `node --check app.js`.
- `npm run validate`.
- Browser desktop check:
  - load page;
  - run simulation;
  - switch scenarios;
  - copy RCA brief;
  - request approval packet.
- Browser mobile check:
  - no horizontal overflow;
  - controls >= 44px;
  - logs and report readable.
- Reduced-motion check:
  - simulation state works without motion-heavy animation.
- Deterministic simulation smoke test:
  - idle -> running -> complete;
  - expected log count;
  - expected final confidence;
  - allowed/blocked boundary rendered.
- Public safety scan:
  - no company names;
  - no personal emails;
  - no internal hostnames;
  - no real IPs;
  - no credentials.

## Risks

- Too much UI may dilute the current strong visual direction.
  - Mitigation: keep Mission Control as the main stage and use collapsible panels.
- Simulation timing can fight with manual exploration.
  - Mitigation: manual clicks pause simulation.
- Scenario data can become too verbose.
  - Mitigation: keep each scenario compact and deterministic.
- Copy-to-clipboard may fail in some browser contexts.
  - Mitigation: textarea fallback.
- Simulation can re-enter if the user clicks repeatedly.
  - Mitigation: guard `runSimulation()` when status is `running`.
