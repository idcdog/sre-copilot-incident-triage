const baseStages = {
  alertIntake: {
    id: "alert-intake",
    title: "01 · Alert intake",
    mode: "serial",
    activeAgents: ["router"]
  },
  evidenceSweep: {
    id: "parallel-evidence-sweep",
    title: "02 · Parallel evidence sweep",
    mode: "parallel",
    activeAgents: ["metrics", "trace", "logs", "change"]
  },
  correlate: {
    id: "correlate-suspect-path",
    title: "03 · Correlate suspect path",
    mode: "serial",
    activeAgents: ["synth"]
  },
  approval: {
    id: "approval-boundary",
    title: "04 · Approval boundary",
    mode: "gate",
    activeAgents: ["policy"]
  },
  handoff: {
    id: "rca-handoff",
    title: "05 · RCA handoff",
    mode: "serial",
    activeAgents: ["synth", "policy"]
  }
};

const makeApprovalAction = ({
  id,
  label,
  why,
  evidenceRefs,
  blastRadius,
  rollbackPlan
}) => ({
  id,
  label,
  risk: "approval-required",
  why,
  evidenceRefs,
  blastRadius,
  rollbackPlan,
  approver: "Human incident commander"
});

export const scenarios = [
  {
    id: "checkout-latency-config-change",
    title: "Checkout latency after synthetic config change",
    shortLabel: "Checkout latency",
    incident: {
      id: "demo-inc-2026-07-15-001",
      title: "Elevated checkout latency in demo service",
      severity: "P2",
      service: "checkout-api-demo",
      environment: "staging-demo",
      startedAt: "2026-07-15T02:14:00Z",
      summary:
        "Synthetic incident where checkout requests show elevated latency and intermittent dependency timeouts after a routine configuration change."
    },
    topology: {
      suspectNodes: ["checkout", "inventory", "change", "observability"],
      approvalNode: "approval"
    },
    stages: [
      {
        ...baseStages.alertIntake,
        copy:
          "Domain Router receives a synthetic latency alert and scopes the investigation to checkout-api-demo.",
        activeNodes: ["gateway", "checkout"],
        paths: [["users", "cdn", "waf", "gateway", "checkout"]],
        logEvents: [
          {
            offsetMs: 0,
            agentId: "router",
            risk: "read-only",
            target: "checkout-api-demo",
            message: "Scoped synthetic latency alert to checkout-api-demo."
          }
        ]
      },
      {
        ...baseStages.evidenceSweep,
        copy:
          "Metrics, Trace, Log, and Change agents fan out in parallel across observability, service, and change-log surfaces.",
        activeNodes: ["checkout", "inventory", "observability", "change", "cache", "db"],
        paths: [
          ["observability", "checkout", "inventory"],
          ["observability", "checkout", "cache"],
          ["observability", "checkout", "db"],
          ["change", "checkout", "inventory"]
        ],
        logEvents: [
          {
            offsetMs: 2800,
            agentId: "metrics",
            risk: "read-only",
            target: "metrics-demo",
            message: "Found synthetic p95 latency and dependency timeout spike."
          },
          {
            offsetMs: 3600,
            agentId: "trace",
            risk: "read-only",
            target: "inventory-demo.reserve",
            message: "Found slow dependency span near the timeout threshold."
          },
          {
            offsetMs: 4400,
            agentId: "logs",
            risk: "read-only",
            target: "checkout-api-demo logs",
            message: "Found retry and deadline-exceeded log patterns."
          },
          {
            offsetMs: 5200,
            agentId: "change",
            risk: "read-only",
            target: "change log",
            message: "Matched synthetic connection-pool change inside incident window."
          }
        ]
      },
      {
        ...baseStages.correlate,
        copy:
          "Evidence converges on checkout-to-inventory calls after a synthetic pool-limit change.",
        activeNodes: ["change", "checkout", "inventory", "observability"],
        paths: [["change", "checkout", "inventory", "observability"]],
        logEvents: [
          {
            offsetMs: 7800,
            agentId: "synth",
            risk: "read-only",
            target: "evidence bundle",
            message: "Correlated change timing, trace latency, and retry logs into one suspect path."
          }
        ]
      },
      {
        ...baseStages.approval,
        copy:
          "Policy Agent blocks rollback, restart, and config changes until a human approves the action.",
        activeNodes: ["checkout", "approval"],
        paths: [["approval", "checkout"]],
        logEvents: [
          {
            offsetMs: 10300,
            agentId: "policy",
            risk: "approval-required",
            target: "connection pool mitigation",
            message: "Blocked production-changing mitigation; generated approval-required recommendation only."
          }
        ]
      },
      {
        ...baseStages.handoff,
        copy:
          "RCA Synthesizer emits the current best explanation, supporting evidence, contradicting evidence, and data gaps.",
        activeNodes: ["checkout", "inventory", "observability", "approval"],
        paths: [["inventory", "checkout", "observability", "approval"], ["approval", "checkout"]],
        logEvents: [
          {
            offsetMs: 12800,
            agentId: "synth",
            risk: "read-only",
            target: "RCA brief",
            message: "Generated deterministic RCA brief with confidence factors and data gaps."
          }
        ]
      }
    ],
    evidence: {
      alerts: [
        {
          source: "metrics-demo",
          name: "High p95 latency",
          value: "p95 latency increased from 220ms to 1.8s",
          window: "last 15 minutes"
        },
        {
          source: "metrics-demo",
          name: "Dependency timeout rate",
          value: "timeout rate increased to 7.4%",
          window: "last 10 minutes"
        }
      ],
      logs: [
        {
          timestamp: "2026-07-15T02:16:12Z",
          level: "warn",
          message: "Synthetic timeout while calling inventory-demo: deadline exceeded after 1500ms"
        },
        {
          timestamp: "2026-07-15T02:18:44Z",
          level: "info",
          message: "Synthetic retry policy applied: attempt=2 backoff=200ms"
        }
      ],
      traces: [
        {
          traceId: "trace-demo-001",
          slowSpan: "inventory-demo.reserve",
          durationMs: 1460,
          status: "deadline_exceeded"
        },
        {
          traceId: "trace-demo-002",
          slowSpan: "checkout-api-demo.create_order",
          durationMs: 1830,
          status: "ok_with_retry"
        }
      ],
      changes: [
        {
          timestamp: "2026-07-15T02:03:00Z",
          component: "checkout-api-demo",
          type: "config",
          description: "Synthetic connection-pool limit reduced for demo purposes"
        }
      ]
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
    candidateCauses: [
      {
        label: "Connection pool limit too low",
        confidence: 0.72,
        supportingEvidence: [
          "Synthetic configuration change occurred shortly before the latency increase.",
          "Slow spans point to dependency calls waiting near the timeout threshold."
        ],
        contradictingEvidence: [
          "No direct synthetic pool saturation metric is available in the mock dataset."
        ]
      },
      {
        label: "Downstream dependency degradation",
        confidence: 0.48,
        supportingEvidence: [
          "Mock traces show deadline_exceeded responses from the dependency span."
        ],
        contradictingEvidence: [
          "No independent synthetic alert from the dependency service is present."
        ]
      }
    ],
    dataGaps: [
      "Pool saturation metric is missing from the mock evidence bundle.",
      "Dependency service health signal is not included.",
      "No customer-impact sample is included because this is synthetic data."
    ],
    safetyBoundary: {
      readOnlyAllowed: [
        "summarize evidence",
        "query additional observability data",
        "draft incident notes",
        "suggest rollback or mitigation options"
      ],
      humanApprovalRequired: [
        "rollback deployment",
        "change production configuration",
        "restart services",
        "notify customers"
      ]
    },
    approvalBoundary: {
      allowedReadOnly: [
        "Query synthetic metrics for checkout-api-demo.",
        "Query synthetic traces for checkout-to-inventory calls.",
        "Inspect synthetic logs for timeout and retry patterns.",
        "Retrieve synthetic runbook snippets."
      ],
      blockedProductionActions: [
        "Roll back the synthetic configuration change.",
        "Increase connection pool limits.",
        "Restart checkout-api-demo or inventory-demo.",
        "Notify customers or external stakeholders."
      ]
    },
    approvalActions: [
      makeApprovalAction({
        id: "restore-pool-limit",
        label: "Restore previous connection-pool limit",
        why:
          "Synthetic traces, retry logs, and change timing point to a checkout-to-inventory pool bottleneck.",
        evidenceRefs: ["trace-demo-001", "metrics-demo latency alert", "synthetic config change"],
        blastRadius: "Checkout request path in the staging-demo environment.",
        rollbackPlan: "Reapply the synthetic prior value and monitor p95 latency plus timeout rate for 15 minutes."
      }),
      makeApprovalAction({
        id: "restart-checkout",
        label: "Restart checkout-api-demo",
        why:
          "A restart may clear stale connection state, but it can interrupt in-flight synthetic traffic.",
        evidenceRefs: ["deadline-exceeded logs", "retry pattern"],
        blastRadius: "Short disruption to checkout-api-demo instances.",
        rollbackPlan: "Abort if error rate increases; keep previous deployment revision unchanged."
      })
    ],
    rca: {
      candidateRootCause:
        "Synthetic connection pool limit too low between checkout-api-demo and inventory-demo.",
      safeNextChecks: [
        "Verify synthetic pool saturation metric if available.",
        "Compare dependency health signal against checkout latency.",
        "Review the synthetic change diff before requesting mitigation."
      ],
      approvalRequiredActions: [
        "Request approval to restore the previous connection-pool limit.",
        "Request approval before restarting services.",
        "Request approval before external notification."
      ]
    },
    runbookMatches: ["checkout-latency", "dependency-timeout"]
  },
  {
    id: "database-saturation",
    title: "Database saturation during synthetic traffic surge",
    shortLabel: "DB saturation",
    incident: {
      id: "demo-inc-2026-07-15-002",
      title: "Synthetic write latency in checkout data path",
      severity: "P2",
      service: "checkout-api-demo",
      environment: "staging-demo",
      startedAt: "2026-07-15T03:22:00Z",
      summary:
        "Synthetic checkout writes slow down while database queue depth and lock wait samples rise during a controlled traffic surge."
    },
    topology: {
      suspectNodes: ["checkout", "db", "observability"],
      approvalNode: "approval"
    },
    stages: [
      {
        ...baseStages.alertIntake,
        copy:
          "Domain Router scopes the synthetic write-latency alert to checkout-api-demo and its primary database path.",
        activeNodes: ["gateway", "checkout", "db"],
        paths: [["users", "cdn", "waf", "gateway", "checkout", "db"]],
        logEvents: [
          {
            offsetMs: 0,
            agentId: "router",
            risk: "read-only",
            target: "checkout-api-demo",
            message: "Scoped synthetic write latency to checkout-api-demo and Primary DB."
          }
        ]
      },
      {
        ...baseStages.evidenceSweep,
        copy:
          "Metrics, Trace, and Log agents compare checkout write latency against synthetic database queue and lock-wait evidence.",
        activeAgents: ["metrics", "trace", "logs"],
        activeNodes: ["checkout", "db", "observability", "cache"],
        paths: [
          ["observability", "checkout", "db"],
          ["observability", "db"],
          ["checkout", "cache", "db"]
        ],
        logEvents: [
          {
            offsetMs: 2600,
            agentId: "metrics",
            risk: "read-only",
            target: "db-metrics-demo",
            message: "Found queue depth and write latency moving together."
          },
          {
            offsetMs: 3400,
            agentId: "trace",
            risk: "read-only",
            target: "checkout-api-demo.write_order",
            message: "Found slow database write span with lock-wait annotation."
          },
          {
            offsetMs: 4200,
            agentId: "logs",
            risk: "read-only",
            target: "database-demo logs",
            message: "Found synthetic lock wait and slow-query patterns."
          }
        ]
      },
      {
        ...baseStages.correlate,
        copy:
          "Evidence converges on database saturation rather than edge or payment-service degradation.",
        activeNodes: ["checkout", "db", "observability"],
        paths: [["checkout", "db", "observability"]],
        logEvents: [
          {
            offsetMs: 7600,
            agentId: "synth",
            risk: "read-only",
            target: "evidence bundle",
            message: "Correlated queue depth, slow write spans, and lock-wait logs into a database suspect path."
          }
        ]
      },
      {
        ...baseStages.approval,
        copy:
          "Policy Agent blocks database-impacting actions until an operator approves the mitigation.",
        activeNodes: ["db", "approval"],
        paths: [["approval", "db"]],
        logEvents: [
          {
            offsetMs: 10100,
            agentId: "policy",
            risk: "approval-required",
            target: "database mitigation",
            message: "Blocked index change, failover, and write-throttle actions without human approval."
          }
        ]
      },
      {
        ...baseStages.handoff,
        copy:
          "RCA Synthesizer emits a database-saturation brief with explicit missing capacity and query-plan evidence.",
        activeNodes: ["checkout", "db", "observability", "approval"],
        paths: [["checkout", "db", "observability", "approval"], ["approval", "db"]],
        logEvents: [
          {
            offsetMs: 12600,
            agentId: "synth",
            risk: "read-only",
            target: "RCA brief",
            message: "Generated database-saturation RCA brief with confidence limits."
          }
        ]
      }
    ],
    evidence: {
      alerts: [
        {
          source: "metrics-demo",
          name: "High database queue depth",
          value: "queue depth increased from 4 to 43",
          window: "last 12 minutes"
        }
      ],
      metrics: [
        {
          source: "db-metrics-demo",
          name: "Write latency",
          value: "p95 write latency increased from 35ms to 760ms",
          window: "last 12 minutes"
        }
      ],
      logs: [
        {
          timestamp: "2026-07-15T03:25:32Z",
          level: "warn",
          message: "Synthetic slow write query observed with lock_wait_ms=420"
        }
      ],
      traces: [
        {
          traceId: "trace-demo-db-001",
          slowSpan: "checkout-api-demo.write_order",
          durationMs: 980,
          status: "ok_with_db_wait"
        }
      ],
      changes: [
        {
          timestamp: "2026-07-15T03:05:00Z",
          component: "traffic-shaper-demo",
          type: "load-test",
          description: "Synthetic traffic surge started for demo purposes"
        }
      ]
    },
    confidenceModel: {
      baseline: 30,
      cap: 99,
      factors: [
        { id: "queue-depth", label: "DB queue-depth alignment", value: 24 },
        { id: "trace-write-span", label: "Slow write span correlation", value: 17 },
        { id: "lock-wait-logs", label: "Lock-wait log pattern", value: 16 },
        { id: "traffic-window", label: "Traffic surge window match", value: 12 },
        { id: "missing-query-plan", label: "Missing query-plan sample", value: -9 },
        { id: "missing-capacity-baseline", label: "Missing capacity baseline", value: -7 }
      ]
    },
    candidateCauses: [
      {
        label: "Primary database saturation",
        confidence: 0.7,
        supportingEvidence: [
          "Synthetic queue depth and write latency moved together.",
          "Slow write spans include database wait annotations."
        ],
        contradictingEvidence: [
          "No synthetic query plan sample is included."
        ]
      },
      {
        label: "Checkout application regression",
        confidence: 0.42,
        supportingEvidence: [
          "Checkout write path latency increased during the incident window."
        ],
        contradictingEvidence: [
          "No checkout deployment change is present in the synthetic change list."
        ]
      }
    ],
    dataGaps: [
      "Query-plan sample is missing from the mock evidence bundle.",
      "Historical database capacity baseline is not included.",
      "No real customer data is included because this is a public synthetic demo."
    ],
    safetyBoundary: {
      readOnlyAllowed: [
        "summarize evidence",
        "query additional database metrics",
        "draft incident notes",
        "suggest query or capacity checks"
      ],
      humanApprovalRequired: [
        "change indexes",
        "fail over database",
        "throttle writes",
        "restart database nodes"
      ]
    },
    approvalBoundary: {
      allowedReadOnly: [
        "Query synthetic database queue metrics.",
        "Inspect synthetic slow-query logs.",
        "Compare checkout write spans with database wait samples.",
        "Retrieve synthetic database triage runbook snippets."
      ],
      blockedProductionActions: [
        "Create or drop indexes.",
        "Fail over the primary database.",
        "Throttle checkout writes.",
        "Restart database nodes."
      ]
    },
    approvalActions: [
      makeApprovalAction({
        id: "enable-write-throttle",
        label: "Temporarily throttle synthetic checkout writes",
        why:
          "Queue depth and write latency align with a controlled traffic surge, so limiting write pressure may stabilize the demo path.",
        evidenceRefs: ["db-metrics-demo queue depth", "trace-demo-db-001", "slow write log"],
        blastRadius: "Checkout write throughput in the staging-demo environment.",
        rollbackPlan: "Remove the synthetic throttle once queue depth returns below the demo threshold."
      }),
      makeApprovalAction({
        id: "database-failover",
        label: "Fail over primary database",
        why:
          "Failover is a high-impact mitigation and is included only to demonstrate policy blocking.",
        evidenceRefs: ["queue depth alert", "write latency metric"],
        blastRadius: "Primary database writer role and all dependent synthetic services.",
        rollbackPlan: "Abort unless replica health is confirmed; keep current writer if health checks fail."
      })
    ],
    rca: {
      candidateRootCause:
        "Synthetic primary database saturation during a controlled traffic surge.",
      safeNextChecks: [
        "Inspect synthetic query-plan sample if available.",
        "Compare database wait samples with checkout write traces.",
        "Check whether traffic-shaping settings changed inside the incident window."
      ],
      approvalRequiredActions: [
        "Request approval before write throttling.",
        "Request approval before failover.",
        "Request approval before index changes."
      ]
    },
    runbookMatches: ["database-saturation", "slow-query"]
  },
  {
    id: "message-queue-backlog",
    title: "Message queue backlog in synthetic order pipeline",
    shortLabel: "Queue backlog",
    incident: {
      id: "demo-inc-2026-07-15-003",
      title: "Synthetic order processing backlog",
      severity: "P3",
      service: "order-worker-demo",
      environment: "staging-demo",
      startedAt: "2026-07-15T04:08:00Z",
      summary:
        "Synthetic order events accumulate in the message bus while worker throughput drops and retry volume increases."
    },
    topology: {
      suspectNodes: ["checkout", "queue", "worker", "observability"],
      approvalNode: "approval"
    },
    stages: [
      {
        ...baseStages.alertIntake,
        copy:
          "Domain Router scopes the synthetic backlog alert to the checkout publish path and order-worker-demo consumer group.",
        activeNodes: ["checkout", "queue", "worker"],
        paths: [["gateway", "checkout", "queue", "worker"]],
        logEvents: [
          {
            offsetMs: 0,
            agentId: "router",
            risk: "read-only",
            target: "order-worker-demo",
            message: "Scoped synthetic backlog to Message Bus and Order Worker."
          }
        ]
      },
      {
        ...baseStages.evidenceSweep,
        copy:
          "Metrics, Trace, Log, and Change agents compare publish rate, consumer lag, worker retries, and recent worker config.",
        activeAgents: ["metrics", "logs", "trace", "change"],
        activeNodes: ["checkout", "queue", "worker", "observability", "change"],
        paths: [
          ["observability", "queue", "worker"],
          ["observability", "checkout", "queue"],
          ["observability", "worker"],
          ["change", "worker"]
        ],
        logEvents: [
          {
            offsetMs: 2500,
            agentId: "metrics",
            risk: "read-only",
            target: "queue-metrics-demo",
            message: "Found consumer lag rising while publish rate stays flat."
          },
          {
            offsetMs: 3300,
            agentId: "logs",
            risk: "read-only",
            target: "order-worker-demo logs",
            message: "Found synthetic retry loop and handler timeout messages."
          },
          {
            offsetMs: 4300,
            agentId: "trace",
            risk: "read-only",
            target: "order-worker-demo.process",
            message: "Found slow worker span after queue receive."
          },
          {
            offsetMs: 5200,
            agentId: "change",
            risk: "read-only",
            target: "worker config",
            message: "Matched synthetic concurrency reduction near backlog start."
          }
        ]
      },
      {
        ...baseStages.correlate,
        copy:
          "Evidence converges on worker throughput reduction rather than checkout publish failure.",
        activeNodes: ["checkout", "queue", "worker", "observability"],
        paths: [["checkout", "queue", "worker", "observability"]],
        logEvents: [
          {
            offsetMs: 7700,
            agentId: "synth",
            risk: "read-only",
            target: "evidence bundle",
            message: "Correlated worker concurrency change, consumer lag, and retry logs."
          }
        ]
      },
      {
        ...baseStages.approval,
        copy:
          "Policy Agent blocks scaling and replay operations until a human approves the action.",
        activeNodes: ["queue", "worker", "approval"],
        paths: [["approval", "worker"], ["approval", "queue"]],
        logEvents: [
          {
            offsetMs: 10100,
            agentId: "policy",
            risk: "approval-required",
            target: "worker scaling",
            message: "Blocked worker scale-up and message replay until human approval."
          }
        ]
      },
      {
        ...baseStages.handoff,
        copy:
          "RCA Synthesizer emits a queue-backlog brief with safe checks and approval-gated mitigation options.",
        activeNodes: ["checkout", "queue", "worker", "observability", "approval"],
        paths: [["checkout", "queue", "worker", "observability", "approval"], ["approval", "worker"]],
        logEvents: [
          {
            offsetMs: 12500,
            agentId: "synth",
            risk: "read-only",
            target: "RCA brief",
            message: "Generated queue-backlog RCA brief with approval-gated next steps."
          }
        ]
      }
    ],
    evidence: {
      alerts: [
        {
          source: "queue-metrics-demo",
          name: "Consumer lag",
          value: "lag increased from 120 to 8,400 synthetic messages",
          window: "last 20 minutes"
        }
      ],
      metrics: [
        {
          source: "worker-metrics-demo",
          name: "Worker throughput",
          value: "processed messages decreased from 620/min to 180/min",
          window: "last 20 minutes"
        }
      ],
      logs: [
        {
          timestamp: "2026-07-15T04:13:18Z",
          level: "warn",
          message: "Synthetic handler timeout while processing order event"
        },
        {
          timestamp: "2026-07-15T04:16:41Z",
          level: "info",
          message: "Synthetic retry scheduled for order event batch"
        }
      ],
      traces: [
        {
          traceId: "trace-demo-queue-001",
          slowSpan: "order-worker-demo.process",
          durationMs: 2420,
          status: "ok_with_retry"
        }
      ],
      changes: [
        {
          timestamp: "2026-07-15T04:00:00Z",
          component: "order-worker-demo",
          type: "config",
          description: "Synthetic worker concurrency reduced for demo purposes"
        }
      ]
    },
    confidenceModel: {
      baseline: 30,
      cap: 99,
      factors: [
        { id: "lag-throughput", label: "Lag/throughput inverse correlation", value: 23 },
        { id: "worker-trace", label: "Worker slow-span correlation", value: 17 },
        { id: "retry-logs", label: "Retry log pattern", value: 15 },
        { id: "worker-change", label: "Worker config window match", value: 18 },
        { id: "missing-dead-letter", label: "Missing dead-letter sample", value: -7 },
        { id: "missing-publisher-errors", label: "Missing publisher error sample", value: -5 }
      ]
    },
    candidateCauses: [
      {
        label: "Worker concurrency too low",
        confidence: 0.76,
        supportingEvidence: [
          "Synthetic worker concurrency was reduced before backlog growth.",
          "Consumer lag increased while publish rate stayed flat."
        ],
        contradictingEvidence: [
          "No dead-letter queue sample is included."
        ]
      },
      {
        label: "Queue broker degradation",
        confidence: 0.37,
        supportingEvidence: [
          "Consumer lag increased quickly during the incident window."
        ],
        contradictingEvidence: [
          "No synthetic broker health alert is present."
        ]
      }
    ],
    dataGaps: [
      "Dead-letter queue sample is missing.",
      "Publisher error sample is not included.",
      "No real order or customer identifiers are included."
    ],
    safetyBoundary: {
      readOnlyAllowed: [
        "summarize evidence",
        "query synthetic consumer lag",
        "draft incident notes",
        "suggest queue-drain checks"
      ],
      humanApprovalRequired: [
        "scale worker fleet",
        "replay messages",
        "purge queue",
        "change worker concurrency"
      ]
    },
    approvalBoundary: {
      allowedReadOnly: [
        "Query synthetic queue lag metrics.",
        "Inspect synthetic worker retry logs.",
        "Compare worker spans with queue receive timestamps.",
        "Retrieve synthetic queue backlog runbook snippets."
      ],
      blockedProductionActions: [
        "Scale worker fleet.",
        "Replay messages.",
        "Purge queue contents.",
        "Change worker concurrency."
      ]
    },
    approvalActions: [
      makeApprovalAction({
        id: "scale-workers",
        label: "Scale order-worker-demo consumers",
        why:
          "Consumer lag rose while worker throughput fell after a synthetic concurrency reduction.",
        evidenceRefs: ["queue lag alert", "worker throughput metric", "worker config change"],
        blastRadius: "Order-worker-demo consumer group in staging-demo.",
        rollbackPlan: "Restore the prior synthetic worker count if error rate or retries increase."
      }),
      makeApprovalAction({
        id: "message-replay",
        label: "Replay delayed synthetic messages",
        why:
          "Replay can reduce backlog age after worker stability is confirmed, but it can duplicate side effects.",
        evidenceRefs: ["consumer lag metric", "handler timeout logs"],
        blastRadius: "Delayed synthetic order events in the message bus.",
        rollbackPlan: "Stop replay immediately if duplicate-processing guardrails report errors."
      })
    ],
    rca: {
      candidateRootCause:
        "Synthetic order-worker concurrency reduction caused message queue backlog.",
      safeNextChecks: [
        "Inspect synthetic dead-letter queue sample if available.",
        "Compare publish rate with consumer lag.",
        "Review worker concurrency change before requesting scale-up."
      ],
      approvalRequiredActions: [
        "Request approval before worker scale-up.",
        "Request approval before message replay.",
        "Request approval before queue purge."
      ]
    },
    runbookMatches: ["queue-backlog", "worker-throughput"]
  }
];

export const defaultScenarioId = "checkout-latency-config-change";
