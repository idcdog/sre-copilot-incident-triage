import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { defaultScenarioId, scenarios } from "./data/scenarios.js";

const state = {
  data: null,
  activeScenario:
    scenarios.find((scenario) => scenario.id === defaultScenarioId) ?? scenarios[0],
  tab: "evidence",
  selectedNode: "control",
  activeStage: 0,
  agentLog: [],
  simulationStatus: "idle",
  autoplay: true,
  autoplayTimer: null,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};

const topologyNodes = [
  { id: "users", label: "Users", layer: "edge", x: -5.6, y: 1.9, z: 0, role: "traffic" },
  { id: "cdn", label: "CDN", layer: "edge", x: -4.1, y: 1.9, z: -0.5, role: "edge" },
  { id: "waf", label: "WAF", layer: "edge", x: -2.8, y: 1.2, z: 0.4, role: "guard" },
  { id: "gateway", label: "API Gateway", layer: "app", x: -1.4, y: 1.2, z: 0, role: "entry" },
  { id: "auth", label: "Auth Service", layer: "service", x: 0.1, y: 2.25, z: -0.6, role: "service" },
  { id: "checkout", label: "Checkout API", layer: "service", x: 0.3, y: 0.85, z: 0.35, role: "hot" },
  { id: "inventory", label: "Inventory", layer: "service", x: 1.85, y: 1.55, z: -0.4, role: "suspect" },
  { id: "payment", label: "Payment", layer: "service", x: 1.85, y: 0.15, z: 0.45, role: "service" },
  { id: "queue", label: "Message Bus", layer: "data", x: 3.25, y: 1.05, z: -0.2, role: "async" },
  { id: "worker", label: "Order Worker", layer: "data", x: 4.35, y: 1.8, z: 0.3, role: "worker" },
  { id: "cache", label: "Redis Cache", layer: "data", x: 3.25, y: -0.45, z: 0.1, role: "cache" },
  { id: "db", label: "Primary DB", layer: "data", x: 4.7, y: -0.55, z: -0.4, role: "database" },
  { id: "object", label: "Object Store", layer: "data", x: 5.45, y: 0.65, z: 0.35, role: "storage" },
  { id: "observability", label: "Observability", layer: "control", x: 1.45, y: -1.8, z: -0.9, role: "evidence" },
  { id: "change", label: "Change Log", layer: "control", x: -1.0, y: -1.65, z: 0.8, role: "change" },
  { id: "approval", label: "Approval Gate", layer: "control", x: 5.35, y: -1.95, z: 0.8, role: "approval" }
];

const topologyEdges = [
  ["users", "cdn"],
  ["cdn", "waf"],
  ["waf", "gateway"],
  ["gateway", "auth"],
  ["gateway", "checkout"],
  ["checkout", "inventory"],
  ["checkout", "payment"],
  ["checkout", "queue"],
  ["queue", "worker"],
  ["checkout", "cache"],
  ["checkout", "db"],
  ["worker", "object"],
  ["checkout", "observability"],
  ["inventory", "observability"],
  ["payment", "observability"],
  ["change", "checkout"],
  ["change", "inventory"],
  ["approval", "checkout"]
];

const agents = [
  { id: "router", label: "Domain Router", color: "#a8f0c6", stage: "serial" },
  { id: "metrics", label: "Metrics Agent", color: "#8be7ff", stage: "parallel" },
  { id: "trace", label: "Trace Agent", color: "#f3d99b", stage: "parallel" },
  { id: "logs", label: "Log Agent", color: "#f8a9a0", stage: "parallel" },
  { id: "change", label: "Change Agent", color: "#c7b9ff", stage: "parallel" },
  { id: "policy", label: "Policy Agent", color: "#ffcf70", stage: "gate" },
  { id: "synth", label: "RCA Synthesizer", color: "#d7ffe7", stage: "serial" }
];

const blueprintNodes = [
  {
    id: "ingest",
    index: "01",
    title: "Signal intake",
    subtitle: "Alert · Metric · Log · Trace",
    body: "Normalizes synthetic observability signals into a single incident context.",
    tags: ["context", "read-only"]
  },
  {
    id: "control",
    index: "02",
    title: "Evidence control plane",
    subtitle: "Policy · Audit · Approval",
    body: "Keeps orchestration deterministic: evidence, data gaps, approval boundaries, and replayable decisions are tracked outside the model.",
    tags: ["deterministic", "auditable"]
  },
  {
    id: "reasoning",
    index: "03",
    title: "Reasoning adapter",
    subtitle: "Summary · Hypothesis · RCA",
    body: "Uses model reasoning to summarize signals and draft candidate causes. In this public demo, calls are mocked.",
    tags: ["mocked", "structured"]
  },
  {
    id: "tools",
    index: "04",
    title: "Tool registry",
    subtitle: "Metrics · Logs · Changes",
    body: "Exposes safe read-only checks first. Any production-changing command is blocked until explicit human approval.",
    tags: ["scoped", "safe"]
  },
  {
    id: "closure",
    index: "05",
    title: "Closure loop",
    subtitle: "Gaps · Notes · Follow-up",
    body: "Turns incident evidence into a handoff-ready brief with confidence limits and next verification steps.",
    tags: ["handoff", "feedback"]
  }
];

const formatKey = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};

const setAutoplay = (enabled) => {
  state.autoplay = enabled && !state.reducedMotion;
  const toggle = document.querySelector("#mission-play-toggle");
  if (!toggle) return;

  toggle.textContent = state.autoplay ? "Pause mission" : "Resume mission";
  toggle.setAttribute("aria-pressed", String(!state.autoplay));
};

const createList = (items) => {
  const list = createElement("ul", "evidence-list");
  for (const item of items) {
    const row = document.createElement("li");
    row.textContent = item;
    list.append(row);
  }
  return list;
};

const createCard = (title, body, meta) => {
  const card = createElement("article", "card");
  card.append(createElement("h3", null, title));

  if (meta) card.append(createElement("p", "meta", meta));

  if (Array.isArray(body)) {
    card.append(createList(body));
  } else {
    card.append(createElement("p", "meta", body));
  }

  return card;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getStages = () => state.activeScenario.stages;

const getAgentLabel = (agentId) => agents.find((agent) => agent.id === agentId)?.label ?? agentId;

const calculateConfidence = (scenario) => {
  const { baseline, cap, factors } = scenario.confidenceModel;
  return clamp(
    baseline + factors.reduce((sum, factor) => sum + factor.value, 0),
    0,
    cap
  );
};

const formatTimestamp = (offsetMs) => {
  const seconds = Math.floor(offsetMs / 1000);
  return `00:${String(seconds).padStart(2, "0")}`;
};

const buildRcaBrief = (scenario) => {
  const confidence = calculateConfidence(scenario);
  const evidenceLines = Object.entries(scenario.evidence)
    .flatMap(([group, records]) => records.map((record) => `- ${formatKey(group)}: ${Object.values(record).join(" · ")}`))
    .join("\n");

  return `# RCA Brief: ${scenario.incident.title}

Synthetic/read-only demo. No live LLM, no production tools, no real customer data.

## Incident

- ID: ${scenario.incident.id}
- Severity: ${scenario.incident.severity}
- Service: ${scenario.incident.service}
- Environment: ${scenario.incident.environment}
- Started: ${scenario.incident.startedAt}

${scenario.incident.summary}

## Current best explanation

${scenario.rca.candidateRootCause}

## Confidence

${confidence}% confidence, capped below 100% because data gaps are preserved.

${scenario.confidenceModel.factors.map((factor) => `- ${factor.label}: ${factor.value > 0 ? "+" : ""}${factor.value}`).join("\n")}

## Evidence used

${evidenceLines}

## Data gaps

${scenario.dataGaps.map((gap) => `- ${gap}`).join("\n")}

## Safe next checks

${scenario.rca.safeNextChecks.map((check) => `- ${check}`).join("\n")}

## Approval-required actions

${scenario.rca.approvalRequiredActions.map((action) => `- ${action}`).join("\n")}
`;
};

const renderSummary = (incident) => {
  document.querySelector("#incident-title").textContent = incident.title;
  const summary = document.querySelector("#incident-summary");
  summary.replaceChildren();

  for (const key of ["severity", "service", "environment", "startedAt"]) {
    const row = createElement("div");
    row.append(createElement("dt", null, formatKey(key)));
    row.append(createElement("dd", null, incident[key]));
    summary.append(row);
  }
};

const renderHeroStats = (data) => {
  document.querySelector("#hero-confidence").textContent = `${calculateConfidence(data)}`;
  document.querySelector("#signal-count").textContent = `${
    Object.keys(data.evidence).length
  } active`;
};

const renderBlueprint = () => {
  const map = document.querySelector("#node-map");
  const panel = document.querySelector("#selected-panel");
  map.replaceChildren();

  for (const node of blueprintNodes) {
    const button = createElement("button", "node-card");
    button.type = "button";
    button.dataset.node = node.id;
    button.classList.toggle("active", node.id === state.selectedNode);
    button.append(createElement("span", "node-index", node.index));
    button.append(createElement("strong", null, node.title));
    button.append(createElement("small", null, node.subtitle));
    button.addEventListener("click", () => {
      state.selectedNode = node.id;
      renderBlueprint();
    });
    map.append(button);
  }

  const selected = blueprintNodes.find((node) => node.id === state.selectedNode);
  panel.replaceChildren();
  panel.append(createElement("p", "section-kicker", "Selected component"));
  panel.append(createElement("h3", null, selected.title));
  panel.append(createElement("p", "meta", selected.subtitle));
  panel.append(createElement("p", "panel-body", selected.body));

  const tags = createElement("div", "tag-row");
  for (const tag of selected.tags) tags.append(createElement("span", null, tag));
  panel.append(tags);
};

const renderMissionPanels = () => {
  const roster = document.querySelector("#agent-roster");
  const timeline = document.querySelector("#stage-timeline");
  const stages = getStages();
  const activeStage = stages[state.activeStage];
  roster.replaceChildren();
  timeline.replaceChildren();

  for (const agent of agents) {
    const card = createElement("article", "agent-chip");
    card.dataset.agentId = agent.id;
    card.dataset.agentStage = agent.stage;
    card.classList.toggle("active", activeStage.activeAgents.includes(agent.id));
    card.style.setProperty("--agent-color", agent.color);
    card.append(createElement("span", "agent-dot"));
    card.append(createElement("strong", null, agent.label));
    card.append(createElement("small", null, agent.stage));
    roster.append(card);
  }

  stages.forEach((stage, index) => {
    const button = createElement("button", "stage-step");
    button.type = "button";
    button.id = `stage-${index + 1}`;
    button.dataset.stageId = stage.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    button.dataset.stageMode = stage.mode;
    button.role = "tab";
    button.setAttribute("aria-selected", String(index === state.activeStage));
    button.setAttribute("aria-controls", "topology-canvas");
    button.tabIndex = index === state.activeStage ? 0 : -1;
    button.classList.toggle("active", index === state.activeStage);
    button.append(createElement("span", null, stage.title));
    button.append(createElement("small", null, stage.mode));
    button.addEventListener("click", () => {
      setAutoplay(false);
      state.activeStage = index;
      renderMissionPanels();
      window.dispatchEvent(new CustomEvent("rca-stage-change", { detail: { index } }));
    });
    button.addEventListener("keydown", (event) => {
      const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
      if (!keys.includes(event.key)) return;

      event.preventDefault();
      const lastIndex = stages.length - 1;
      let nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = index === lastIndex ? 0 : index + 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = index === 0 ? lastIndex : index - 1;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = lastIndex;
      setAutoplay(false);
      state.activeStage = nextIndex;
      renderMissionPanels();
      document.querySelector(`#stage-${nextIndex + 1}`)?.focus();
      window.dispatchEvent(new CustomEvent("rca-stage-change", { detail: { index: nextIndex } }));
    });
    timeline.append(button);
  });

  document.querySelector("#active-stage-title").textContent = activeStage.title;
  document.querySelector("#active-stage-copy").textContent = activeStage.copy;
};

const renderSimulationOutputs = () => {
  const scenario = state.activeScenario;
  const status = document.querySelector("#simulation-status");
  const log = document.querySelector("#agent-log");
  const score = document.querySelector("#confidence-score");
  const factors = document.querySelector("#confidence-factors");
  const boundary = document.querySelector("#approval-boundary");
  const brief = document.querySelector("#rca-brief");

  status.textContent = `${formatKey(state.simulationStatus)} · scripted simulation · synthetic data · no live LLM or production tools.`;

  log.replaceChildren();
  const logList = createElement("ol", "agent-log-list");
  for (const event of state.agentLog) {
    const row = createElement("li", `agent-log-entry ${event.risk === "approval-required" ? "blocked" : "allowed"}`);
    row.dataset.agentId = event.agentId;
    row.dataset.stageId = event.stageId;
    row.append(createElement("span", "log-time", event.time));
    row.append(createElement("strong", null, getAgentLabel(event.agentId)));
    row.append(createElement("span", "log-risk", event.risk === "approval-required" ? "Blocked · approval required" : "Allowed · read-only"));
    row.append(createElement("p", null, event.message));
    logList.append(row);
  }
  log.append(logList);

  score.textContent = `${calculateConfidence(scenario)}%`;
  factors.replaceChildren();
  for (const factor of scenario.confidenceModel.factors) {
    const row = createElement("div", `factor-row ${factor.value < 0 ? "negative" : "positive"}`);
    row.append(createElement("span", null, factor.label));
    row.append(createElement("strong", null, `${factor.value > 0 ? "+" : ""}${factor.value}`));
    factors.append(row);
  }

  boundary.replaceChildren();
  const allowed = createElement("article", "boundary-list allowed");
  allowed.append(createElement("h4", null, "Allowed · read-only"));
  allowed.append(createList(scenario.approvalBoundary.allowedReadOnly));
  const blocked = createElement("article", "boundary-list blocked");
  blocked.append(createElement("h4", null, "Blocked · approval required"));
  blocked.append(createList(scenario.approvalBoundary.blockedProductionActions));
  boundary.append(allowed, blocked);

  brief.value = buildRcaBrief(scenario);
};

const runSimulation = () => {
  if (state.simulationStatus === "running") return;

  setAutoplay(false);
  state.simulationStatus = "running";
  state.activeStage = 0;
  state.agentLog = [];
  renderMissionPanels();
  renderSimulationOutputs();
  window.dispatchEvent(new CustomEvent("rca-stage-change", { detail: { index: state.activeStage } }));

  const stages = getStages();
  const stageDelayMs = state.reducedMotion ? 220 : 2300;
  stages.forEach((stage, index) => {
    window.setTimeout(() => {
      state.activeStage = index;
      for (const event of stage.logEvents) {
        state.agentLog.push({
          ...event,
          stageId: stage.id,
          time: formatTimestamp(event.offsetMs)
        });
      }
      renderMissionPanels();
      renderSimulationOutputs();
      window.dispatchEvent(new CustomEvent("rca-stage-change", { detail: { index } }));
    }, index * stageDelayMs);
  });

  window.setTimeout(() => {
    state.simulationStatus = "complete";
    renderSimulationOutputs();
  }, stages.length * stageDelayMs + 120);
};

const startMissionAutoplay = () => {
  setAutoplay(!state.reducedMotion);
  const toggle = document.querySelector("#mission-play-toggle");
  toggle?.addEventListener("click", () => {
    setAutoplay(!state.autoplay);
  });

  if (state.reducedMotion) return;

  state.autoplayTimer = window.setInterval(() => {
    if (!state.autoplay) return;
    state.activeStage = (state.activeStage + 1) % getStages().length;
    renderMissionPanels();
    window.dispatchEvent(new CustomEvent("rca-stage-change", { detail: { index: state.activeStage } }));
  }, 5200);
};

const initializeTopology = () => {
  const canvas = document.querySelector("#topology-canvas");
  const fallback = document.querySelector("#topology-fallback");
  const stage = canvas?.parentElement;

  if (!canvas || !stage || state.reducedMotion) {
    fallback.hidden = false;
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.15, 13);
  camera.lookAt(0, -0.45, 0);

  const group = new THREE.Group();
  scene.add(group);

  const nodeMeshes = new Map();
  const labelElements = new Map();
  const edgeMeshes = [];
  const probes = [];

  const palette = {
    edge: 0x7fe7b4,
    app: 0xa8f0c6,
    service: 0xf1f8f4,
    data: 0xd6c08a,
    control: 0x8be7ff
  };

  const makeVector = (nodeId) => {
    const node = topologyNodes.find((item) => item.id === nodeId);
    return new THREE.Vector3(node.x, node.y, node.z);
  };

  for (const [from, to] of topologyEdges) {
    const points = [makeVector(from), makeVector(to)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x6ea88b,
      transparent: true,
      opacity: 0.22
    });
    const line = new THREE.Line(geometry, material);
    line.userData = { from, to };
    edgeMeshes.push(line);
    group.add(line);
  }

  for (const node of topologyNodes) {
    const color = palette[node.layer];
    const geometry = new THREE.SphereGeometry(node.role === "hot" ? 0.17 : 0.12, 28, 20);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: node.role === "hot" ? 1 : 0.78
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.x, node.y, node.z);
    mesh.userData = { node };
    mesh.name = node.id;
    nodeMeshes.set(node.id, mesh);
    group.add(mesh);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.235, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    );
    ring.position.copy(mesh.position);
    ring.userData = { nodeId: node.id, isRing: true };
    group.add(ring);

    const label = createElement("span", "topology-label", node.label);
    stage.append(label);
    labelElements.set(node.id, label);
  }

  agents.forEach((agent, index) => {
    const probe = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      new THREE.MeshBasicMaterial({ color: agent.color, transparent: true, opacity: 0.95 })
    );
    probe.userData = { agent, offset: index * 0.17 };
    probes.push(probe);
    group.add(probe);
  });

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
  };

  const projectLabels = () => {
    const bounds = stage.getBoundingClientRect();
    for (const node of topologyNodes) {
      const mesh = nodeMeshes.get(node.id);
      const label = labelElements.get(node.id);
      const position = mesh.position.clone().project(camera);
      const x = (position.x * 0.5 + 0.5) * bounds.width;
      const y = (-position.y * 0.5 + 0.5) * bounds.height;
      label.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  };

  const resolvePathPosition = (path, progress) => {
    const clamped = ((progress % 1) + 1) % 1;
    const segmentCount = path.length - 1;
    const scaled = clamped * segmentCount;
    const segmentIndex = Math.min(Math.floor(scaled), segmentCount - 1);
    const localProgress = scaled - segmentIndex;
    const from = makeVector(path[segmentIndex]);
    const to = makeVector(path[segmentIndex + 1]);
    return from.lerp(to, localProgress);
  };

  const setActiveStage = (index) => {
    state.activeStage = index;
    const stageConfig = getStages()[index];
    const activeEdges = new Set();

    for (const path of stageConfig.paths) {
      for (let i = 0; i < path.length - 1; i += 1) {
        activeEdges.add(`${path[i]}:${path[i + 1]}`);
        activeEdges.add(`${path[i + 1]}:${path[i]}`);
      }
    }

    for (const [nodeId, mesh] of nodeMeshes.entries()) {
      const isActive = stageConfig.activeNodes.includes(nodeId);
      mesh.material.opacity = isActive ? 1 : 0.35;
      mesh.scale.setScalar(isActive ? 1.45 : 1);
    }

    for (const label of labelElements.values()) label.classList.remove("active");
    for (const nodeId of stageConfig.activeNodes) labelElements.get(nodeId)?.classList.add("active");

    for (const edge of edgeMeshes) {
      const key = `${edge.userData.from}:${edge.userData.to}`;
      edge.material.opacity = activeEdges.has(key) ? 0.86 : 0.16;
      edge.material.color.set(activeEdges.has(key) ? 0xa8f0c6 : 0x6ea88b);
    }
  };

  setActiveStage(state.activeStage);
  window.addEventListener("rca-stage-change", (event) => setActiveStage(event.detail.index));
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();

  const animate = () => {
    const elapsed = clock.getElapsedTime();
    const stageConfig = getStages()[state.activeStage];
    group.rotation.y = Math.sin(elapsed * 0.22) * 0.07;
    group.rotation.x = Math.sin(elapsed * 0.17) * 0.035;

    probes.forEach((probe, index) => {
      const path = stageConfig.paths[index % stageConfig.paths.length];
      const isAgentActive = stageConfig.activeAgents.includes(probe.userData.agent.id);
      probe.visible = isAgentActive || stageConfig.mode === "parallel";
      probe.material.opacity = isAgentActive ? 1 : 0.22;
      const progress = elapsed * (stageConfig.mode === "parallel" ? 0.28 : 0.18) + probe.userData.offset;
      probe.position.copy(resolvePathPosition(path, progress));
      probe.scale.setScalar(isAgentActive ? 1.5 + Math.sin(elapsed * 4) * 0.18 : 0.78);
    });

    for (const child of group.children) {
      if (child.userData?.isRing) {
        const active = getStages()[state.activeStage].activeNodes.includes(child.userData.nodeId);
        child.rotation.z += active ? 0.014 : 0.004;
        child.material.opacity = active ? 0.34 + Math.sin(elapsed * 3) * 0.08 : 0.1;
      }
    }

    renderer.render(scene, camera);
    projectLabels();
    window.requestAnimationFrame(animate);
  };

  animate();
};

const renderEvidence = (content, data) => {
  const grid = createElement("div", "card-grid");

  for (const [groupName, records] of Object.entries(data.evidence)) {
    const lines = records.map((record) =>
      Object.entries(record)
        .map(([key, value]) => `${formatKey(key)}: ${value}`)
        .join(" · ")
    );
    grid.append(createCard(formatKey(groupName), lines, `${records.length} synthetic records`));
  }

  content.append(grid);
};

const renderCauses = (content, data) => {
  const grid = createElement("div", "card-grid");

  for (const cause of data.candidateCauses) {
    const card = createElement("article", "card cause-card");
    const score = createElement("span", "score", `${Math.round(cause.confidence * 100)}%`);

    card.append(createElement("p", "section-kicker", "Candidate cause"));
    card.append(createElement("h3", null, cause.label));
    card.append(score);
    card.append(createElement("p", "meta", "Supporting evidence"));
    card.append(createList(cause.supportingEvidence));
    card.append(createElement("p", "meta", "Contradicting evidence"));
    card.append(createList(cause.contradictingEvidence));
    grid.append(card);
  }

  content.append(grid);
};

const renderGaps = (content, data) => {
  content.append(
    createCard(
      "Confidence-limiting data gaps",
      data.dataGaps,
      "The copilot must reduce certainty when critical evidence is unavailable."
    )
  );
};

const renderSafety = (content, data) => {
  const grid = createElement("div", "card-grid");
  grid.append(
    createCard("Read-only actions allowed", data.safetyBoundary.readOnlyAllowed),
    createCard(
      "Human approval required",
      data.safetyBoundary.humanApprovalRequired,
      "The assistant may recommend these actions, but must not execute them autonomously."
    )
  );
  content.append(grid);
};

const render = () => {
  const content = document.querySelector("#content");
  content.replaceChildren();

  if (!state.data) {
    content.append(createCard("Loading demo data", "Reading synthetic incident bundle."));
    return;
  }

  const renderers = {
    evidence: renderEvidence,
    causes: renderCauses,
    gaps: renderGaps,
    safety: renderSafety
  };

  renderers[state.tab](content, state.data);

  for (const tab of document.querySelectorAll(".tab")) {
    const isActive = tab.dataset.tab === state.tab;
    tab.classList.toggle("active", tab.dataset.tab === state.tab);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  }
  content.setAttribute("aria-labelledby", `tab-${state.tab}`);
};

const initialize = async () => {
  state.data = state.activeScenario;
  renderSummary(state.data.incident);
  renderHeroStats(state.data);
  renderMissionPanels();
  renderSimulationOutputs();
  initializeTopology();
  startMissionAutoplay();
  renderBlueprint();
  render();

  document.querySelector("#run-simulation")?.addEventListener("click", runSimulation);
  document.querySelector("#copy-brief")?.addEventListener("click", async () => {
    const brief = document.querySelector("#rca-brief");
    brief.select();
    try {
      await navigator.clipboard.writeText(brief.value);
      document.querySelector("#copy-brief").textContent = "Copied";
      window.setTimeout(() => {
        document.querySelector("#copy-brief").textContent = "Copy brief";
      }, 1400);
    } catch {
      document.execCommand("copy");
    }
  });

  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => {
      state.tab = tab.dataset.tab;
      render();
    });
    tab.addEventListener("keydown", (event) => {
      const tabs = [...document.querySelectorAll(".tab")];
      const index = tabs.indexOf(tab);
      const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
      if (!keys.includes(event.key)) return;

      event.preventDefault();
      let nextIndex = index;
      const lastIndex = tabs.length - 1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = index === lastIndex ? 0 : index + 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = index === 0 ? lastIndex : index - 1;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = lastIndex;
      state.tab = tabs[nextIndex].dataset.tab;
      render();
      tabs[nextIndex].focus();
    });
  }
};

initialize().catch((error) => {
  const content = document.querySelector("#content");
  content.replaceChildren(createCard("Demo load failed", error.message));
});
