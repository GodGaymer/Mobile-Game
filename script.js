const TICK_MS = 200;
const SHIFT_SECONDS = 180;

const sectorNewsPool = [
  {
    key: "shipyard-boom",
    title: "Shipyard Boom",
    text: "Iron/Nickel buyers pay more this shift.",
    saleMult: 1.2,
    threatBias: -0.1,
  },
  {
    key: "pirate-surge",
    title: "Pirate Surge",
    text: "Cargo demand spikes, but threat rises faster.",
    saleMult: 1.25,
    threatBias: 0.35,
  },
  {
    key: "solar-flares",
    title: "Solar Flare Season",
    text: "Heat pressure is up. Scanner insights improve outcomes.",
    saleMult: 1.1,
    threatBias: 0.15,
  },
  {
    key: "calm-lanes",
    title: "Calm Lanes",
    text: "Quiet traffic. Lower threat, average pricing.",
    saleMult: 1,
    threatBias: -0.25,
  },
];

const state = {
  hull: 100,
  heat: 0,
  power: 10,
  cargo: 0,
  cargoMax: 30,
  threat: 0,
  overclockTicks: 0,
  selectedNode: null,
  timeLeft: SHIFT_SECONDS,
  credits: 0,
  shiftActive: true,
  quotaTarget: 30,
  totalExtracted: 0,
  shiftIndex: 1,
  parts: 0,
  nextAutoEventIn: 16,
  currentNews: sectorNewsPool[3],
  runHistory: [],
  upgrades: {
    drillMk2: false,
    coolerFins: false,
    cargoPods: false,
    fluxShield: false,
    hazardPay: false,
  },
};

const nodes = [
  { id: 1, name: "Iron Node", richness: 1.0 },
  { id: 2, name: "Nickel Node", richness: 1.15 },
  { id: 3, name: "Ice Node", richness: 0.8 },
  { id: 4, name: "Rare Earth Vein", richness: 1.8 },
  { id: 5, name: "Salvage Wreck", richness: 1.1 },
  { id: 6, name: "Anomaly", richness: 1.5 },
];

const events = [
  {
    title: "Micro-meteor Swarm",
    body: "A fast swarm is crossing your lane.",
    choices: [
      { label: "Thruster dodge (Threat -6, Heat +4)", apply: () => { state.threat -= 6; state.heat += 4; } },
      { label: "Shield tank (Hull -7, Threat -2)", apply: () => { state.hull -= 7; state.threat -= 2; } },
      { label: "Take hit (Hull -14)", apply: () => { state.hull -= 14; } },
    ]
  },
  {
    title: "Pirate Ping",
    body: "Unknown ship requesting tribute.",
    choices: [
      { label: "Bribe (-10 cargo, Threat -16)", apply: () => { state.cargo -= 10; state.threat -= 16; } },
      { label: "Jam comms (Heat +9, Threat -6)", apply: () => { state.heat += 9; state.threat -= 6; } },
      { label: "Run (Heat +5, Hull -5)", apply: () => { state.heat += 5; state.hull -= 5; } },
    ]
  },
  {
    title: "Volatile Pocket",
    body: "You hit unstable gas under the seam.",
    choices: [
      { label: "Slow drill (-8s, Heat -6)", apply: () => { state.timeLeft -= 8; state.heat -= 6; } },
      { label: "Controlled blast (+9 cargo, Threat +8)", apply: () => { state.cargo += 9; state.totalExtracted += 9; state.threat += 8; } },
      { label: "Ignore (+4 heat now, +4 threat)", apply: () => { state.heat += 4; state.threat += 4; } },
    ]
  },
  {
    title: "Ancient Beacon",
    body: "A rune beacon pulses beneath debris.",
    choices: [
      { label: "Scan beacon (+2 parts, +5 heat)", apply: () => { state.parts += 2; state.heat += 5; } },
      { label: "Strip it (+180c, Threat +10)", apply: () => { state.credits += 180; state.threat += 10; } },
      { label: "Leave it (Morale +flavor, no effect)", apply: () => {} },
    ]
  },
  {
    title: "The Big Score",
    body: "You find a rich seam just before extraction window.",
    choices: [
      { label: "Take one more node (+14 cargo, +18 threat)", apply: () => { state.cargo += 14; state.totalExtracted += 14; state.threat += 18; } },
      { label: "Play safe (+4 cargo)", apply: () => { state.cargo += 4; state.totalExtracted += 4; } },
    ]
  },
  {
    title: "Union Inspection",
    body: "Guild inspector pings for compliance logs.",
    choices: [
      { label: "Comply (-6s, Threat -7)", apply: () => { state.timeLeft -= 6; state.threat -= 7; } },
      { label: "Dodge logs (+120c, Threat +9)", apply: () => { state.credits += 120; state.threat += 9; } },
    ]
  },
];

const upgrades = [
  {
    id: "drillMk2",
    name: "Drill Head Mk2",
    cost: 220,
    text: "+10% extraction",
    apply: () => { state.upgrades.drillMk2 = true; }
  },
  {
    id: "coolerFins",
    name: "Cooler Fins",
    cost: 180,
    text: "-15% heat gain",
    apply: () => { state.upgrades.coolerFins = true; }
  },
  {
    id: "cargoPods",
    name: "Cargo Pods",
    cost: 200,
    text: "+10 cargo capacity",
    apply: () => {
      if (!state.upgrades.cargoPods) state.cargoMax += 10;
      state.upgrades.cargoPods = true;
    }
  },
  {
    id: "fluxShield",
    name: "Flux Shield",
    cost: 260,
    text: "-30% threat hull damage",
    apply: () => { state.upgrades.fluxShield = true; }
  },
  {
    id: "hazardPay",
    name: "Hazard Contracting",
    cost: 230,
    text: "+20% high-threat payout, +10% base threat gain",
    apply: () => { state.upgrades.hazardPay = true; }
  }
];

const ids = ["drill", "shields", "scanner", "thrusters"];
const out = Object.fromEntries(ids.map(id => [id, document.getElementById(id + "Out")]));
const inputs = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

const nodeWrap = document.getElementById("nodes");
const statusText = document.getElementById("statusText");
const eventDialog = document.getElementById("eventDialog");
const summaryDialog = document.getElementById("summaryDialog");

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function chooseSectorNews() {
  const choice = sectorNewsPool[Math.floor(Math.random() * sectorNewsPool.length)];
  state.currentNews = choice;
  document.getElementById("newsText").textContent = `Sector News: ${choice.title} — ${choice.text}`;
}

function renderNodes() {
  nodeWrap.innerHTML = "";
  nodes.forEach(n => {
    const b = document.createElement("button");
    b.className = "node" + (state.selectedNode === n.id ? " active" : "");
    b.textContent = n.name;
    b.onclick = () => {
      if (!state.shiftActive) return;
      state.selectedNode = n.id;
      statusText.textContent = `Miner drone assigned to ${n.name}.`;
      renderNodes();
    };
    nodeWrap.appendChild(b);
  });
}

function rebalance(changed) {
  let total = ids.reduce((a, id) => a + Number(inputs[id].value), 0);
  if (total <= state.power) return;
  let overflow = total - state.power;
  for (const id of ids) {
    if (id === changed) continue;
    while (overflow > 0 && Number(inputs[id].value) > 0) {
      inputs[id].value = Number(inputs[id].value) - 1;
      overflow -= 1;
    }
  }
}

ids.forEach(id => {
  inputs[id].addEventListener("input", () => {
    rebalance(id);
    out[id].textContent = inputs[id].value;
  });
});

function extractionMultiplier() {
  let mult = 1;
  if (state.upgrades.drillMk2) mult *= 1.1;
  if (state.overclockTicks > 0) mult *= 1.3;
  return mult;
}

function heatMultiplier() {
  return state.upgrades.coolerFins ? 0.85 : 1;
}

function maybeTriggerAutoEvent(dtSec) {
  state.nextAutoEventIn -= dtSec;
  if (state.nextAutoEventIn > 0 || eventDialog.open) return;

  const threatFactor = clamp(state.threat / 100, 0, 1);
  const heatFactor = clamp(state.heat / 100, 0, 1);
  const pressure = 0.55 + threatFactor * 0.8 + heatFactor * 0.5;
  const shouldTrigger = Math.random() < clamp(0.25 * pressure, 0.2, 0.75);

  state.nextAutoEventIn = clamp(16 - (state.threat / 10), 7, 18);
  if (shouldTrigger) showEvent();
}

function tick() {
  if (!state.shiftActive) return;

  const dtSec = TICK_MS / 1000;
  const drill = Number(inputs.drill.value);
  const shields = Number(inputs.shields.value);
  const scanner = Number(inputs.scanner.value);
  const thrusters = Number(inputs.thrusters.value);

  const selectedNode = nodes.find(n => n.id === state.selectedNode);
  const richness = selectedNode?.richness ?? 1;

  const extractPerSecond = 0.25 * drill * richness * extractionMultiplier();
  const extractTick = state.selectedNode ? extractPerSecond * dtSec : 0;
  state.cargo += extractTick;
  state.totalExtracted += extractTick;

  const heatPerSec = (0.6 * drill + (state.overclockTicks > 0 ? 0.4 : 0) - 0.5 * shields) * heatMultiplier();
  state.heat += heatPerSec * dtSec;
  state.heat -= 1.0 * dtSec;

  const hazardBonus = state.upgrades.hazardPay ? 0.1 : 0;
  const threatPerSec = 0.2 + 0.1 * drill - 0.15 * shields - 0.04 * scanner + state.currentNews.threatBias + hazardBonus;
  state.threat += threatPerSec * dtSec;

  const fluxReduction = state.upgrades.fluxShield ? 0.7 : 1;
  const hullDmgPerSec = Math.max(0, (state.threat - 80) * 0.02 - thrusters * 0.012) * fluxReduction;
  state.hull -= hullDmgPerSec * dtSec;

  state.heat = clamp(state.heat, 0, 100);
  state.threat = clamp(state.threat, 0, 100);
  state.hull = clamp(state.hull, 0, 100);
  state.cargo = clamp(state.cargo, 0, state.cargoMax);

  if (state.overclockTicks > 0) state.overclockTicks -= 1;
  state.timeLeft = Math.max(0, state.timeLeft - dtSec);

  maybeTriggerAutoEvent(dtSec);

  if (state.hull <= 0) return endShift("fail_hull");
  if (state.heat >= 100) return endShift("fail_heat");
  if (state.timeLeft <= 0) return endShift("timeout");

  const quotaNow = Math.floor(state.totalExtracted);
  if (quotaNow >= state.quotaTarget) {
    statusText.textContent = "Quota met! Push your luck or extract now.";
  } else {
    statusText.textContent = state.selectedNode ? "Mining in progress." : "Assign a drone to begin mining.";
  }

  render();
}

function render() {
  document.getElementById("hullVal").textContent = Math.round(state.hull);
  document.getElementById("heatVal").textContent = Math.round(state.heat);
  document.getElementById("cargoVal").textContent = `${Math.round(state.cargo)}/${state.cargoMax}`;
  document.getElementById("threatVal").textContent = Math.round(state.threat);
  document.getElementById("quotaVal").textContent = `${Math.floor(state.totalExtracted)}/${state.quotaTarget}`;
  document.getElementById("timeVal").textContent = `${Math.ceil(state.timeLeft)}s`;
  document.getElementById("creditsVal").textContent = `${state.credits}`;

  const heatMeter = document.getElementById("heatMeter");
  const threatMeter = document.getElementById("threatMeter");
  const hullMeter = document.getElementById("hullMeter");
  [heatMeter, threatMeter, hullMeter].forEach(el => el.classList.remove("warning", "danger"));

  if (state.heat >= 85) heatMeter.classList.add("danger");
  else if (state.heat >= 70) heatMeter.classList.add("warning");

  if (state.threat >= 80) threatMeter.classList.add("danger");
  else if (state.threat >= 50) threatMeter.classList.add("warning");

  if (state.hull <= 25) hullMeter.classList.add("danger");
}

function showEvent() {
  if (!state.shiftActive) return;
  const e = events[Math.floor(Math.random() * events.length)];
  document.getElementById("eventTitle").textContent = e.title;
  document.getElementById("eventBody").textContent = e.body;

  const wrap = document.getElementById("eventActions");
  wrap.innerHTML = "";
  e.choices.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "dialog-choice";
    btn.textContent = c.label;
    btn.onclick = () => {
      c.apply();
      state.hull = clamp(state.hull, 0, 100);
      state.heat = clamp(state.heat, 0, 100);
      state.threat = clamp(state.threat, 0, 100);
      state.cargo = clamp(state.cargo, 0, state.cargoMax);
      state.timeLeft = clamp(state.timeLeft, 0, SHIFT_SECONDS);
      eventDialog.close();
      render();
    };
    wrap.appendChild(btn);
  });
  eventDialog.showModal();
}

function gradeRun(resultType, payout) {
  let score = 0;
  if (payout.quotaMet) score += 45;
  score += clamp((state.totalExtracted / state.quotaTarget) * 25, 0, 25);
  score += clamp((state.hull / 100) * 20, 0, 20);
  score += clamp((state.threat / 100) * 10, 0, 10); // reward risk-taking
  if (resultType.startsWith("fail")) score -= 30;
  if (state.timeLeft > 45) score += 5;

  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  return "D";
}

function calculatePayout(resultType) {
  const saleMult = state.currentNews.saleMult;
  const cargoCredits = Math.round(state.cargo * 12 * saleMult);
  const quotaMet = state.totalExtracted >= state.quotaTarget;
  const quotaBonus = quotaMet ? 180 : 0;
  const highRiskBonus = state.upgrades.hazardPay && state.threat >= 70 ? Math.round((cargoCredits + quotaBonus) * 0.2) : 0;
  const failurePenalty = resultType.startsWith("fail") ? 0.55 : 1;
  const gross = Math.round((cargoCredits + quotaBonus + highRiskBonus) * failurePenalty);
  const repairCost = Math.round((100 - state.hull) * 1.2);
  const net = Math.max(0, gross - repairCost);
  return { cargoCredits, quotaBonus, highRiskBonus, repairCost, net, quotaMet };
}

function renderHistory() {
  const wrap = document.getElementById("historyList");
  if (state.runHistory.length === 0) {
    wrap.innerHTML = "<div class='history-item'>No previous shifts yet.</div>";
    return;
  }
  wrap.innerHTML = state.runHistory.slice(-5).reverse().map(run =>
    `<div class='history-item'>Shift ${run.shift}: Grade ${run.grade} • Net ${run.net}c • ${run.result}</div>`
  ).join("");
}

function openSummary(resultType, payout, grade) {
  const titleMap = {
    extracted: "Shift Complete",
    timeout: "Shift Ended (Time Up)",
    fail_hull: "Shift Failed (Hull)",
    fail_heat: "Shift Failed (Heat)",
  };

  document.getElementById("summaryTitle").textContent = titleMap[resultType] || "Shift Summary";
  document.getElementById("summaryBody").textContent = payout.quotaMet
    ? "Quota achieved. Guild pays full bonus."
    : "Quota not met. Partial earnings only.";

  document.getElementById("summaryStats").innerHTML = [
    `Shift ${state.shiftIndex}`,
    `Sector News: ${state.currentNews.title}`,
    `Extracted: ${Math.floor(state.totalExtracted)} ore`,
    `Cargo Sale: ${payout.cargoCredits}c`,
    `Quota Bonus: ${payout.quotaBonus}c`,
    `Hazard Bonus: ${payout.highRiskBonus}c`,
    `Repair Cost: -${payout.repairCost}c`,
    `Net Payout: ${payout.net}c`,
    `Credits Total: ${state.credits}c`,
    `Parts Total: ${state.parts}`,
  ].map(line => `<div>${line}</div>`).join("");

  const gradeEl = document.getElementById("summaryGrade");
  gradeEl.textContent = `Grade: ${grade}`;
  gradeEl.className = `summary-grade grade-${grade.toLowerCase()}`;

  renderHistory();
  renderUpgradeOptions();
  summaryDialog.showModal();
}

function renderUpgradeOptions() {
  const wrap = document.getElementById("upgradeActions");
  wrap.innerHTML = "";
  upgrades.forEach(up => {
    const owned = state.upgrades[up.id];
    const affordable = state.credits >= up.cost;
    const btn = document.createElement("button");
    btn.className = "dialog-choice";
    btn.disabled = owned || !affordable;
    btn.textContent = owned
      ? `Owned: ${up.name}`
      : `${up.name} (${up.cost}c) — ${up.text}`;
    btn.onclick = () => {
      if (state.credits < up.cost || state.upgrades[up.id]) return;
      state.credits -= up.cost;
      up.apply();
      renderUpgradeOptions();
      render();
    };
    wrap.appendChild(btn);
  });
}

function endShift(resultType) {
  if (!state.shiftActive) return;
  state.shiftActive = false;

  const payout = calculatePayout(resultType);
  state.credits += payout.net;
  state.parts += payout.quotaMet ? 2 : 1;

  const grade = gradeRun(resultType, payout);
  state.runHistory.push({
    shift: state.shiftIndex,
    grade,
    net: payout.net,
    result: resultType,
  });

  openSummary(resultType, payout, grade);
  render();
}

function resetForNextShift() {
  state.shiftIndex += 1;
  state.hull = 100;
  state.heat = 0;
  state.threat = 0;
  state.cargo = 0;
  state.overclockTicks = 0;
  state.selectedNode = null;
  state.totalExtracted = 0;
  state.timeLeft = SHIFT_SECONDS;
  state.shiftActive = true;
  state.nextAutoEventIn = clamp(14 - state.shiftIndex * 0.5, 7, 16);
  state.quotaTarget = 30 + Math.floor((state.shiftIndex - 1) * 5);

  chooseSectorNews();
  renderNodes();
  render();
  statusText.textContent = "New shift started. Pick a node and mine.";
}

document.getElementById("overclockBtn").onclick = () => {
  if (!state.shiftActive) return;
  state.overclockTicks = 50;
  state.threat = clamp(state.threat + 2, 0, 100);
  statusText.textContent = "Overclock engaged for 10s.";
};

document.getElementById("ventBtn").onclick = () => {
  if (!state.shiftActive) return;
  state.heat = Math.max(0, state.heat - 20);
  render();
};

document.getElementById("sealBtn").onclick = () => {
  if (!state.shiftActive) return;
  state.hull = Math.min(100, state.hull + 8);
  state.heat = Math.min(100, state.heat + 4);
  render();
};

document.getElementById("extractBtn").onclick = () => {
  if (!state.shiftActive) return;
  endShift("extracted");
};

document.getElementById("eventBtn").onclick = () => {
  if (!state.shiftActive) return;
  state.threat = clamp(state.threat + 5, 0, 100);
  showEvent();
};

document.getElementById("nextShiftBtn").onclick = () => {
  summaryDialog.close();
  resetForNextShift();
};

chooseSectorNews();
renderNodes();
render();
setInterval(tick, TICK_MS);
