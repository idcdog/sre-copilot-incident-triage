export const scenarios = [
  {
    id: "checkout-latency-config-change",
    title: "Checkout latency after synthetic config change",
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
        id: "alert-intake",
        title: "01 · Alert intake",
        mode: "serial",
        copy:
          "Domain Router receives a synthetic latency alert and scopes the investigation to checkout-api-demo.",
        activeNodes: ["gateway", "checkout"],
        activeAgents: ["router"],
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
        id: "parallel-evidence-sweep",
        title: "02 · Parallel evidence sweep",
        mode: "parallel",
        copy:
          "Metrics, Trace, Log, and Change agents fan out in parallel across observability, service, and change-log surfaces.",
        activeNodes: ["checkout", "inventory", "observability", "change", "cache", "db"],
        activeAgents: ["metrics", "trace", "logs", "change"],
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
        id: "correlate-suspect-path",
        title: "03 · Correlate suspect path",
        mode: "serial",
        copy:
          "Evidence converges on checkout-to-inventory calls after a synthetic pool-limit change.",
        activeNodes: ["change", "checkout", "inventory", "observability"],
        activeAgents: ["synth"],
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
        id: "approval-boundary",
        title: "04 · Approval boundary",
        mode: "gate",
        copy:
          "Policy Agent blocks rollback, restart, and config changes until a human approves the action.",
        activeNodes: ["checkout", "approval"],
        activeAgents: ["policy"],
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
        id: "rca-handoff",
        title: "05 · RCA handoff",
        mode: "serial",
        copy:
          "RCA Synthesizer emits the current best explanation, supporting evidence, contradicting evidence, and data gaps.",
        activeNodes: ["checkout", "inventory", "observability", "approval"],
        activeAgents: ["synth", "policy"],
        paths: [["inventory", "checkout", "observability", "approval"]],
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
        "Draft an incident note from the evidence bundle."
      ],
      blockedProductionActions: [
        "Roll back the synthetic configuration change.",
        "Increase connection pool limits.",
        "Restart checkout-api-demo or inventory-demo.",
        "Notify customers or external stakeholders."
      ]
    },
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
    runbookMatches: []
  }
];

export const defaultScenarioId = "checkout-latency-config-change";

