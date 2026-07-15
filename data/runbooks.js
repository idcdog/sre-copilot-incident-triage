export const runbooks = [
  {
    id: "checkout-latency",
    title: "Checkout latency triage",
    summary:
      "Compare p95 checkout latency with dependency timeout rate, trace spans, and recent configuration changes.",
    checks: [
      "Confirm whether latency is isolated to checkout-api-demo.",
      "Compare dependency span duration with timeout thresholds.",
      "Check whether a recent configuration change altered pool or retry behavior."
    ]
  },
  {
    id: "dependency-timeout",
    title: "Dependency timeout investigation",
    summary:
      "Use trace span timing, retry logs, and dependency health signals to separate caller-side saturation from dependency degradation.",
    checks: [
      "Group slow spans by dependency operation.",
      "Compare retry volume with dependency error rate.",
      "Preserve missing dependency health as a confidence-limiting data gap."
    ]
  },
  {
    id: "database-saturation",
    title: "Database saturation checklist",
    summary:
      "Compare queue depth, lock waits, write latency, and traffic changes before proposing database-impacting mitigation.",
    checks: [
      "Correlate write latency with queue depth.",
      "Inspect slow query and lock-wait samples.",
      "Require approval before failover, write throttling, or index changes."
    ]
  },
  {
    id: "slow-query",
    title: "Slow query evidence review",
    summary:
      "Treat slow-query samples as supporting evidence only when query plan and workload context are available.",
    checks: [
      "Check whether slow-query samples align with incident timing.",
      "Look for missing query-plan evidence.",
      "Avoid irreversible database changes without operator approval."
    ]
  },
  {
    id: "queue-backlog",
    title: "Queue backlog runbook",
    summary:
      "Separate publisher failure, broker health, and consumer throughput before proposing queue operations.",
    checks: [
      "Compare publish rate, consumer lag, and worker throughput.",
      "Inspect dead-letter and retry samples.",
      "Require approval before replaying, purging, or scaling consumers."
    ]
  },
  {
    id: "worker-throughput",
    title: "Worker throughput checklist",
    summary:
      "Use worker logs, trace duration, and recent concurrency changes to explain throughput drops.",
    checks: [
      "Check whether worker throughput changed after configuration updates.",
      "Compare retry logs with handler timeout spans.",
      "Scale workers only after explicit human approval."
    ]
  }
];
