const TICK_MS = 200;
const SHIFT_SECONDS = 180;

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
  upgrades: {
    drillMk2: false,
    coolerFins: false,
    cargoPods: false,
  },
};

const nodes = [
  { id: 1, name: "Iron Node", richness: 1.0 },
  { id: 2, name: "Nickel Node", richness: 1.2 },
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
      { label: "Thruster dodge (Threat -5, Heat +4)", apply: () => { state.threat = Math.max(0, state.threat - 5); state.heat += 4; } },
      { label: "Shield tank (Hull -6, Threat -2)", apply: () => { state.hull -= 6; state.threat = Math.max(0, state.threat - 2); } },
      { label: "Take hit (Hull -14)", apply: () => { state.hull -= 14; } },
    ]
  },
  {
    title: "Pirate Ping",
    body: "Unknown ship requesting tribute.",
    choices: [
      { label: "Bribe (-8 cargo, Threat -15)", apply: () => { state.cargo = Math.max(0, state.cargo - 8); state.threat = Math.max(0, state.threat - 15); } },
      { label: "Jam comms (Heat +8, Threat -5)", apply: () => { state.heat += 8; state.threat = Math.max(0, state.threat - 5); } },
      { label: "Run (Heat +5, Hull -4)", apply: () => { state.heat += 5; state.hull -= 4; } },
    ]
  },
  {
    title: "Rich Vein",
    body: "Scanner flags a premium seam nearby.",
    choices: [
      { label: "Divert drones (+10 cargo, Threat +6)", apply: () => { state.cargo += 10; state.totalExtracted += 10; state.threat += 6; } },
      { label: "Stay focused (+3 cargo)", apply: () => { state.cargo += 3; state.totalExtracted += 3; } },
    ]
  },
  {
    title: "Hull Crack",
    body: "A pressure seam starts opening across the lower bay.",
    choices: [
      { label: "Quick patch (Heat +6, Hull +4)", apply: () => { state.heat += 6; state.hull += 4; } },
      { label: "Full seal (Hull +10, Time -8s)", apply: () => { state.hull += 10; state.timeLeft = Math.max(0, state.timeLeft - 8); } },
    ]
  }
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
      if (!state.upgrades.cargoPods) {
        state.cargoMax += 10;
      }
      state.upgrades.cargoPods = true;
    }
  }
];

const ids = ["drill", "shields", "scanner", "thrusters"];
const out = Object.fromEntries(ids.map(id => [id, document.getElementById(id + "Out")]));
const inputs = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

const nodeWrap = document.getElementById("nodes");
const statusText = document.getElementById("statusText");
const eventDialog = document.getElementById("eventDialog");
const summaryDialog = document.getElementById("summaryDialog");

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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function extractionMultiplier() {
  let mult = 1;
  if (state.upgrades.drillMk2) mult *= 1.1;
  if (state.overclockTicks > 0) mult *= 1.3;
  return mult;
}

function heatMultiplier() {
  return state.upgrades.coolerFins ? 0.85 : 1;
}

function tick() {
  if (!state.shiftActive) return;

  const drill = Number(inputs.drill.value);
  const shields = Number(inputs.shields.value);
  const thrusters = Number(inputs.thrusters.value);

  const extractPerSecond = 0.25 * drill * extractionMultiplier();
  const extractTick = state.selectedNode ? extractPerSecond * (TICK_MS / 1000) : 0;

  state.cargo += extractTick;
  state.totalExtracted += extractTick;

  const heatPerSec = (0.6 * drill + (state.overclockTicks > 0 ? 0.4 : 0) - 0.5 * shields) * heatMultiplier();
  state.heat += heatPerSec * (TICK_MS / 1000);
  state.heat -= 1.0 * (TICK_MS / 1000);

  const threatPerSec = 0.2 + 0.1 * drill - 0.15 * shields;
  state.threat += threatPerSec * (TICK_MS / 1000);
  state.hull -= Math.max(0, (state.threat - 80) * 0.015 - thrusters * 0.01) * (TICK_MS / 1000);

  state.heat = clamp(state.heat, 0, 100);
  state.threat = clamp(state.threat, 0, 100);
  state.hull = clamp(state.hull, 0, 100);
  state.cargo = clamp(state.cargo, 0, state.cargoMax);

  if (state.overclockTicks > 0) state.overclockTicks -= 1;

  state.timeLeft = Math.max(0, state.timeLeft - TICK_MS / 1000);

  if (state.hull <= 0) {
    endShift("fail_hull");
    return;
  }
  if (state.heat >= 100) {
    endShift("fail_heat");
    return;
  }
  if (state.timeLeft <= 0) {
    endShift("timeout");
    return;
  }

  const quotaNow = Math.floor(state.totalExtracted);
  if (quotaNow >= state.quotaTarget) {
    statusText.textContent = "Quota met! Extract now for full payout.";
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
      eventDialog.close();
      render();
    };
    wrap.appendChild(btn);
  });
  eventDialog.showModal();
}

function calculatePayout(resultType) {
  const cargoCredits = Math.round(state.cargo * 12);
  const quotaMet = state.totalExtracted >= state.quotaTarget;
  const quotaBonus = quotaMet ? 180 : 0;
  const failurePenalty = resultType.startsWith("fail") ? 0.55 : 1;
  const gross = Math.round((cargoCredits + quotaBonus) * failurePenalty);
  const repairCost = Math.round((100 - state.hull) * 1.2);
  const net = Math.max(0, gross - repairCost);
  return { cargoCredits, quotaBonus, repairCost, net, quotaMet };
}

function openSummary(resultType, payout) {
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
    `Extracted: ${Math.floor(state.totalExtracted)} ore`,
    `Cargo Sale: ${payout.cargoCredits}c`,
    `Quota Bonus: ${payout.quotaBonus}c`,
    `Repair Cost: -${payout.repairCost}c`,
    `Net Payout: ${payout.net}c`,
    `Credits Total: ${state.credits}c`,
  ].map(line => `<div>${line}</div>`).join("");

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

  openSummary(resultType, payout);
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
  state.quotaTarget = 30 + Math.floor((state.shiftIndex - 1) * 4);

  renderNodes();
  render();
  statusText.textContent = "New shift started. Pick a node and mine.";
}

document.getElementById("overclockBtn").onclick = () => {
  if (!state.shiftActive) return;
  state.overclockTicks = 50;
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

document.getElementById("eventBtn").onclick = showEvent;

document.getElementById("nextShiftBtn").onclick = () => {
  summaryDialog.close();
  resetForNextShift();
};

renderNodes();
render();
setInterval(tick, TICK_MS);
