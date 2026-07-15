const state = {
  data: null,
  tab: "evidence",
  selectedNode: "control"
};

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
  const topCause = data.candidateCauses.reduce((best, cause) =>
    cause.confidence > best.confidence ? cause : best
  );
  document.querySelector("#hero-confidence").textContent = `${Math.round(
    topCause.confidence * 100
  )}`;
  document.querySelector("#signal-count").textContent = `${
    Object.keys(data.signals).length
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

const renderEvidence = (content, data) => {
  const grid = createElement("div", "card-grid");

  for (const [groupName, records] of Object.entries(data.signals)) {
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
    tab.classList.toggle("active", tab.dataset.tab === state.tab);
  }
};

const initialize = async () => {
  const response = await fetch("data/mock-incident.json");
  state.data = await response.json();
  renderSummary(state.data.incident);
  renderHeroStats(state.data);
  renderBlueprint();
  render();

  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => {
      state.tab = tab.dataset.tab;
      render();
    });
  }
};

initialize().catch((error) => {
  const content = document.querySelector("#content");
  content.replaceChildren(createCard("Demo load failed", error.message));
});

