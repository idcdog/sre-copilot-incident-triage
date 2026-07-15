const state = {
  data: null,
  tab: "evidence"
};

const formatKey = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());

const createList = (items) => {
  const list = document.createElement("ul");
  for (const item of items) {
    const row = document.createElement("li");
    row.textContent = item;
    list.append(row);
  }
  return list;
};

const createCard = (title, body, meta) => {
  const card = document.createElement("article");
  card.className = "card";

  const heading = document.createElement("h3");
  heading.textContent = title;
  card.append(heading);

  if (meta) {
    const metaNode = document.createElement("p");
    metaNode.className = "meta";
    metaNode.textContent = meta;
    card.append(metaNode);
  }

  if (Array.isArray(body)) {
    card.append(createList(body));
  } else {
    const copy = document.createElement("p");
    copy.className = "meta";
    copy.textContent = body;
    card.append(copy);
  }

  return card;
};

const renderSummary = (incident) => {
  const summary = document.querySelector("#incident-summary");
  summary.replaceChildren();

  for (const key of ["id", "severity", "service", "environment", "startedAt"]) {
    const row = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");

    label.textContent = formatKey(key);
    value.textContent = incident[key];
    row.append(label, value);
    summary.append(row);
  }
};

const renderEvidence = (content, data) => {
  const groups = data.signals;
  const grid = document.createElement("div");
  grid.className = "grid";

  for (const [groupName, records] of Object.entries(groups)) {
    const lines = records.map((record) =>
      Object.entries(record)
        .map(([key, value]) => `${formatKey(key)}: ${value}`)
        .join(" | ")
    );
    grid.append(createCard(formatKey(groupName), lines));
  }

  content.append(grid);
};

const renderCauses = (content, data) => {
  for (const cause of data.candidateCauses) {
    const card = createCard(cause.label, []);
    const confidence = document.createElement("div");
    confidence.className = "confidence";
    confidence.textContent = `Confidence: ${Math.round(cause.confidence * 100)}%`;

    const supportTitle = document.createElement("p");
    supportTitle.className = "meta";
    supportTitle.textContent = "Supporting evidence";

    const contradictionTitle = document.createElement("p");
    contradictionTitle.className = "meta";
    contradictionTitle.textContent = "Contradicting evidence";

    card.append(
      confidence,
      supportTitle,
      createList(cause.supportingEvidence),
      contradictionTitle,
      createList(cause.contradictingEvidence)
    );
    content.append(card);
  }
};

const renderGaps = (content, data) => {
  content.append(
    createCard(
      "Confidence-limiting data gaps",
      data.dataGaps,
      "The copilot should reduce certainty when critical evidence is unavailable."
    )
  );
};

const renderSafety = (content, data) => {
  content.append(
    createCard("Read-only actions allowed", data.safetyBoundary.readOnlyAllowed),
    createCard(
      "Human approval required",
      data.safetyBoundary.humanApprovalRequired,
      "The assistant may recommend these actions, but must not execute them autonomously."
    )
  );
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

