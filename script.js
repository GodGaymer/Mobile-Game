const state = {
  hull: 100,
  heat: 0,
  power: 10,
  cargo: 0,
  cargoMax: 30,
  threat: 0,
  overclockTicks: 0,
  selectedNode: null,
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
  }
];

const ids = ["drill", "shields", "scanner", "thrusters"];
const out = Object.fromEntries(ids.map(id => [id, document.getElementById(id + "Out")]));
const inputs = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

const nodeWrap = document.getElementById("nodes");
const statusText = document.getElementById("statusText");
const dialog = document.getElementById("eventDialog");

function renderNodes() {
  nodeWrap.innerHTML = "";
  nodes.forEach(n => {
    const b = document.createElement("button");
    b.className = "node" + (state.selectedNode === n.id ? " active" : "");
    b.textContent = n.name;
    b.onclick = () => {
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

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function tick() {
  const drill = Number(inputs.drill.value);
  const shields = Number(inputs.shields.value);
  const thrusters = Number(inputs.thrusters.value);

  const extract = (0.25 * drill) * (state.overclockTicks > 0 ? 1.3 : 1);
  if (state.selectedNode) state.cargo += extract * 0.5;

  state.heat += (0.6 * drill + (state.overclockTicks > 0 ? 0.4 : 0) - 0.5 * shields) * 0.2;
  state.heat -= 0.2;

  state.threat += (0.2 + 0.1 * drill - 0.15 * shields) * 0.2;
  state.hull -= Math.max(0, (state.threat - 80) * 0.002 - thrusters * 0.001);

  state.heat = clamp(state.heat, 0, 100);
  state.threat = clamp(state.threat, 0, 100);
  state.hull = clamp(state.hull, 0, 100);
  state.cargo = clamp(state.cargo, 0, state.cargoMax);

  if (state.overclockTicks > 0) state.overclockTicks -= 1;

  if (state.hull <= 0) statusText.textContent = "Shift failed: hull collapse.";
  else if (state.heat >= 100) statusText.textContent = "Catastrophic heat! Hit Vent Heat now.";
  else statusText.textContent = state.selectedNode ? "Mining in progress." : "Assign a drone to begin mining.";

  render();
}

function render() {
  document.getElementById("hullVal").textContent = Math.round(state.hull);
  document.getElementById("heatVal").textContent = Math.round(state.heat);
  document.getElementById("cargoVal").textContent = `${Math.round(state.cargo)}/${state.cargoMax}`;
  document.getElementById("threatVal").textContent = Math.round(state.threat);

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
      dialog.close();
      render();
    };
    wrap.appendChild(btn);
  });
  dialog.showModal();
}

document.getElementById("overclockBtn").onclick = () => {
  state.overclockTicks = 50;
  statusText.textContent = "Overclock engaged for 10s.";
};

document.getElementById("ventBtn").onclick = () => {
  state.heat = Math.max(0, state.heat - 20);
};

document.getElementById("sealBtn").onclick = () => {
  state.hull = Math.min(100, state.hull + 8);
  state.heat = Math.min(100, state.heat + 4);
};

document.getElementById("extractBtn").onclick = () => {
  const credits = Math.round(state.cargo * 12);
  statusText.textContent = `Extracted. Shift payout: ${credits}c.`;
  state.cargo = 0;
  state.threat = Math.max(0, state.threat - 20);
};

document.getElementById("eventBtn").onclick = showEvent;

renderNodes();
render();
setInterval(tick, 200);
