const TICK_MS = 200;
const SHIFT_SECONDS = 180;
const MID_SHIFT_FORK_AT = 90;

const sectorNewsPool = [
  { title: "Shipyard Boom", text: "Ore demand up, safer lanes.", saleMult: 1.2, threatBias: -0.1 },
  { title: "Pirate Surge", text: "High profit, high danger.", saleMult: 1.3, threatBias: 0.4 },
  { title: "Solar Flare Season", text: "Heat pressure and unstable systems.", saleMult: 1.1, threatBias: 0.2 },
  { title: "Calm Lanes", text: "Lower threat, normal prices.", saleMult: 1.0, threatBias: -0.25 },
];

const captainTraits = [
  { id: "rockSense", name: "Rock-Sense", desc: "Scanner reduces threat growth by 35%.", apply: s => { s.trait = "Rock-Sense"; } },
  { id: "boomLover", name: "Boom-Lover", desc: "Events give +20% rewards but +8 base threat.", apply: s => { s.trait = "Boom-Lover"; s.threat += 8; } },
  { id: "safetyFirst", name: "Safety First", desc: "-20% accident damage, -10% extraction.", apply: s => { s.trait = "Safety First"; } },
  { id: "quickFixer", name: "Quick Fixer", desc: "Vent/Seal actions 35% stronger.", apply: s => { s.trait = "Quick Fixer"; } },
  { id: "greedy", name: "Greedy", desc: "+18% payout, +10% repair costs.", apply: s => { s.trait = "Greedy"; } },
  { id: "beerPowered", name: "Beer Powered", desc: "One rally per shift: +15 momentum on first overclock.", apply: s => { s.trait = "Beer Powered"; } },
];

const nodes = [
  { id: 1, name: "Iron Node", richness: 1.0 },
  { id: 2, name: "Nickel Node", richness: 1.15 },
  { id: 3, name: "Ice Node", richness: 0.85 },
  { id: 4, name: "Rare Earth Vein", richness: 1.8 },
  { id: 5, name: "Salvage Wreck", richness: 1.1 },
  { id: 6, name: "Anomaly", richness: 1.45 },
];

const events = [
  {
    title: "Micro-meteor Swarm",
    body: "A fast swarm is crossing your lane.",
    choices: [
      { label: "Thruster dodge (Threat -6, Heat +4)", risky: false, apply: () => { state.threat -= 6; state.heat += 4; } },
      { label: "Shield tank (Hull -7, Threat -2)", risky: false, apply: () => { state.hull -= 7; state.threat -= 2; } },
      { label: "Take hit (Hull -14, Momentum +10)", risky: true, apply: () => { state.hull -= 14; state.momentum += 10; } },
    ]
  },
  {
    title: "Volatile Pocket",
    body: "Unstable gas pocket found under the seam.",
    choices: [
      { label: "Slow drill (-8s, Heat -6)", risky: false, apply: () => { state.timeLeft -= 8; state.heat -= 6; } },
      { label: "Controlled blast (+10 cargo, Threat +9)", risky: true, apply: () => { state.cargo += 10; state.totalExtracted += 10; state.threat += 9; state.momentum += 6; } },
      { label: "Ignore (+5 heat, +5 threat)", risky: true, apply: () => { state.heat += 5; state.threat += 5; } },
    ]
  },
  {
    title: "Pirate Ping",
    body: "Unknown ship requests tribute.",
    choices: [
      { label: "Bribe (-10 cargo, Threat -16)", risky: false, apply: () => { state.cargo -= 10; state.threat -= 16; } },
      { label: "Jam comms (Heat +8, Threat -6)", risky: false, apply: () => { state.heat += 8; state.threat -= 6; } },
      { label: "Ambush (+220c, Hull -8, Threat +12)", risky: true, apply: () => { state.credits += 220; state.hull -= 8; state.threat += 12; state.momentum += 12; } },
    ]
  },
  {
    title: "Ancient Beacon",
    body: "Runic beacon pulses beneath debris.",
    choices: [
      { label: "Scan beacon (+2 parts, +4 heat)", risky: false, apply: () => { state.parts += 2; state.heat += 4; } },
      { label: "Strip relic (+180c, Threat +10)", risky: true, apply: () => { state.credits += 180; state.threat += 10; } },
      { label: "Ignore (+5 momentum)", risky: false, apply: () => { state.momentum += 5; } },
    ]
  },
  {
    title: "The Big Score",
    body: "A rich seam appears near extraction window.",
    choices: [
      { label: "Take one more node (+15 cargo, +20 threat)", risky: true, apply: () => { state.cargo += 15; state.totalExtracted += 15; state.threat += 20; state.momentum += 10; } },
      { label: "Play safe (+5 cargo)", risky: false, apply: () => { state.cargo += 5; state.totalExtracted += 5; } },
    ]
  },
  {
    title: "Drone Cascade",
    body: "Hauler queue stutters and ore starts spilling.",
    choices: [
      { label: "Manual reroute (+6 cargo, +4 heat)", risky: false, apply: () => { state.cargo += 6; state.totalExtracted += 6; state.heat += 4; } },
      { label: "Force throughput (+12 cargo, +12 heat, +8 threat)", risky: true, apply: () => { state.cargo += 12; state.totalExtracted += 12; state.heat += 12; state.threat += 8; } },
    ]
  },
];

const upgrades = [
  { id: "drillMk2", name: "Drill Head Mk2", cost: 220, text: "+10% extraction", apply: () => { state.upgrades.drillMk2 = true; } },
  { id: "coolerFins", name: "Cooler Fins", cost: 180, text: "-15% heat gain", apply: () => { state.upgrades.coolerFins = true; } },
  { id: "cargoPods", name: "Cargo Pods", cost: 200, text: "+10 cargo", apply: () => { if (!state.upgrades.cargoPods) state.cargoMax += 10; state.upgrades.cargoPods = true; } },
  { id: "fluxShield", name: "Flux Shield", cost: 260, text: "-30% threat hull damage", apply: () => { state.upgrades.fluxShield = true; } },
  { id: "hazardPay", name: "Hazard Contracting", cost: 230, text: "+20% high-threat payout, +10% threat gain", apply: () => { state.upgrades.hazardPay = true; } },
];

const state = {
  hull: 100,
  heat: 0,
  power: 10,
  cargo: 0,
  cargoMax: 30,
  threat: 0,
  momentum: 0,
  overclockTicks: 0,
  selectedNode: null,
  timeLeft: SHIFT_SECONDS,
  credits: 0,
  shiftActive: false,
  quotaTarget: 30,
  totalExtracted: 0,
  shiftIndex: 1,
  parts: 0,
  nextAutoEventIn: 14,
  trait: "None",
  traitRallyUsed: false,
  currentNews: sectorNewsPool[3],
  runHistory: [],
  legendaryMoments: [],
  comboStreak: 0,
  comboTimer: 0,
  comboBest: 0,
  midForkDone: false,
  crisisActive: false,
  crisisTimer: 0,
  crisisResolved: 0,
  upgrades: {
    drillMk2: false,
    coolerFins: false,
    cargoPods: false,
    fluxShield: false,
    hazardPay: false,
  },
};

const ids = ["drill", "shields", "scanner", "thrusters"];
const out = Object.fromEntries(ids.map(id => [id, document.getElementById(id + "Out")]));
const inputs = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

const nodeWrap = document.getElementById("nodes");
const statusText = document.getElementById("statusText");
const eventDialog = document.getElementById("eventDialog");
const summaryDialog = document.getElementById("summaryDialog");
const briefingDialog = document.getElementById("briefingDialog");

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function chooseSectorNews() {
  state.currentNews = sectorNewsPool[Math.floor(Math.random() * sectorNewsPool.length)];
  document.getElementById("newsText").textContent = `Sector News: ${state.currentNews.title} — ${state.currentNews.text}`;
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
      addCombo(1, "Node retarget");
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

ids.forEach(id => inputs[id].addEventListener("input", () => {
  rebalance(id);
  out[id].textContent = inputs[id].value;
  if (state.shiftActive) addCombo(0.5, "Power tuning");
}));

function addCombo(points, source) {
  state.comboStreak = clamp(state.comboStreak + points, 0, 20);
  state.comboTimer = 8;
  state.comboBest = Math.max(state.comboBest, state.comboStreak);
  state.momentum = clamp(state.momentum + 1 + points, 0, 100);
  if (state.comboStreak >= 6) {
    statusText.textContent = `Combo x${state.comboStreak.toFixed(1)}! ${source}`;
  }
}

function extractionMultiplier() {
  let mult = 1 + state.momentum * 0.003 + state.comboStreak * 0.01;
  if (state.upgrades.drillMk2) mult *= 1.1;
  if (state.overclockTicks > 0) mult *= 1.3;
  if (state.trait === "Safety First") mult *= 0.9;
  if (state.crisisActive) mult *= 1.08;
  return mult;
}

function heatMultiplier() {
  let mult = state.upgrades.coolerFins ? 0.85 : 1;
  if (state.trait === "Boom-Lover") mult *= 1.08;
  if (state.crisisActive) mult *= 1.18;
  return mult;
}

function updateHazardBanner() {
  const hz = document.getElementById("hazardText");
  if (!state.shiftActive) {
    hz.textContent = "Awaiting shift briefing.";
    hz.classList.remove("hot");
    return;
  }

  if (state.crisisActive) {
    hz.textContent = `CRISIS CHAIN ACTIVE (${Math.ceil(state.crisisTimer)}s): keep Heat < 75 and Threat < 78 for bonus!`;
    hz.classList.add("hot");
    return;
  }

  const sec = Math.max(0, Math.ceil(state.nextAutoEventIn));
  hz.textContent = `Incoming hazard window in ~${sec}s. Threat ${Math.round(state.threat)} / Heat ${Math.round(state.heat)} / Combo x${state.comboStreak.toFixed(1)}.`;
  hz.classList.toggle("hot", state.heat >= 80 || state.threat >= 80);
}

function chooseAndShowDialog(title, body, choices) {
  document.getElementById("eventTitle").textContent = title;
  document.getElementById("eventBody").textContent = body;
  const wrap = document.getElementById("eventActions");
  wrap.innerHTML = "";

  choices.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "dialog-choice";
    btn.textContent = c.label;
    btn.onclick = () => {
      c.apply();
      if (c.risky) addCombo(2, "Risk play"); else addCombo(1, "Clean decision");
      sanitizeState();
      eventDialog.close();
      render();
    };
    wrap.appendChild(btn);
  });

  eventDialog.showModal();
}

function maybeTriggerMidShiftFork() {
  if (state.midForkDone || state.timeLeft > MID_SHIFT_FORK_AT || eventDialog.open || !state.shiftActive) return;
  state.midForkDone = true;

  chooseAndShowDialog(
    "Mid-Shift Fork",
    "You can commit to one strategic plan for the rest of this run.",
    [
      {
        label: "Hyperlane Gamble (+22 cargo now, threat ramps faster)",
        risky: true,
        apply: () => {
          state.cargo += 22;
          state.totalExtracted += 22;
          state.threat += 14;
          state.currentNews.threatBias += 0.2;
          state.legendaryMoments.push("⚡ Hyperlane Gamble chosen.");
        }
      },
      {
        label: "Stability Protocol (+18 hull, -20 heat, -15s)",
        risky: false,
        apply: () => {
          state.hull += 18;
          state.heat -= 20;
          state.timeLeft -= 15;
          state.legendaryMoments.push("🧯 Stability Protocol chosen.");
        }
      }
    ]
  );
}

function maybeTriggerCrisis(dt) {
  if (!state.shiftActive || eventDialog.open) return;

  if (!state.crisisActive && state.threat >= 78 && state.heat >= 72) {
    state.crisisActive = true;
    state.crisisTimer = 18;
    state.legendaryMoments.push("⚠ Crisis chain triggered.");
  }

  if (!state.crisisActive) return;

  state.crisisTimer -= dt;

  if (state.heat < 75 && state.threat < 78) {
    state.crisisActive = false;
    state.crisisResolved += 1;
    state.momentum = clamp(state.momentum + 20, 0, 100);
    state.credits += 80;
    addCombo(2, "Crisis resolved");
    statusText.textContent = "Crisis stabilized! +80c and momentum surge.";
    return;
  }

  if (state.crisisTimer <= 0) {
    state.crisisActive = false;
    state.hull -= 12;
    state.heat += 10;
    state.threat += 8;
    state.comboStreak = Math.max(0, state.comboStreak - 2);
    statusText.textContent = "Crisis failed: chain reaction damaged the rig.";
  }
}

function maybeTriggerAutoEvent(dtSec) {
  state.nextAutoEventIn -= dtSec;
  if (state.nextAutoEventIn > 0 || eventDialog.open) return;

  const pressure = clamp(0.45 + (state.threat / 100) * 0.9 + (state.heat / 100) * 0.5, 0.2, 1.2);
  const trigger = Math.random() < clamp(0.22 * pressure, 0.2, 0.78);
  state.nextAutoEventIn = clamp(16 - state.threat / 12 - state.shiftIndex * 0.2, 6, 18);
  if (trigger) showEvent();
}

function sanitizeState() {
  state.hull = clamp(state.hull, 0, 100);
  state.heat = clamp(state.heat, 0, 100);
  state.threat = clamp(state.threat, 0, 100);
  state.cargo = clamp(state.cargo, 0, state.cargoMax);
  state.timeLeft = clamp(state.timeLeft, 0, SHIFT_SECONDS);
}

function tick() {
  if (!state.shiftActive) return;

  const dt = TICK_MS / 1000;
  const drill = Number(inputs.drill.value);
  const shields = Number(inputs.shields.value);
  const scanner = Number(inputs.scanner.value);
  const thrusters = Number(inputs.thrusters.value);

  const selectedNode = nodes.find(n => n.id === state.selectedNode);
  const richness = selectedNode?.richness ?? 1;

  const extractPerSec = 0.25 * drill * richness * extractionMultiplier();
  const extractTick = state.selectedNode ? extractPerSec * dt : 0;
  state.cargo += extractTick;
  state.totalExtracted += extractTick;

  let threatPerSec = 0.2 + 0.1 * drill - 0.15 * shields - 0.04 * scanner + state.currentNews.threatBias;
  if (state.upgrades.hazardPay) threatPerSec += 0.1;
  if (state.trait === "Rock-Sense") threatPerSec -= 0.04 * scanner;

  state.heat += (0.6 * drill + (state.overclockTicks > 0 ? 0.4 : 0) - 0.5 * shields) * heatMultiplier() * dt;
  state.heat -= 1.0 * dt;
  state.threat += threatPerSec * dt;

  let hullDmgPerSec = Math.max(0, (state.threat - 80) * 0.02 - thrusters * 0.012);
  if (state.upgrades.fluxShield) hullDmgPerSec *= 0.7;
  if (state.trait === "Safety First") hullDmgPerSec *= 0.8;
  state.hull -= hullDmgPerSec * dt;

  if (state.overclockTicks > 0) state.overclockTicks -= 1;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  state.momentum = clamp(state.momentum - 0.2, 0, 100);

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
  } else if (state.comboStreak > 0) {
    state.comboStreak = clamp(state.comboStreak - 0.15, 0, 20);
  }

  sanitizeState();
  maybeTriggerMidShiftFork();
  maybeTriggerAutoEvent(dt);
  maybeTriggerCrisis(dt);

  if (state.hull <= 0) return endShift("fail_hull");
  if (state.heat >= 100) return endShift("fail_heat");
  if (state.timeLeft <= 0) return endShift("timeout");

  const quotaNow = Math.floor(state.totalExtracted);
  statusText.textContent = quotaNow >= state.quotaTarget
    ? "Quota met! Push greed for grade bonus or extract now."
    : state.selectedNode ? "Mining in progress." : "Assign a drone to begin mining.";

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
  document.getElementById("momentumVal").textContent = `${Math.round(state.momentum)}%`;
  document.getElementById("traitVal").textContent = `${state.trait} | x${state.comboStreak.toFixed(1)}`;

  const heatMeter = document.getElementById("heatMeter");
  const threatMeter = document.getElementById("threatMeter");
  const hullMeter = document.getElementById("hullMeter");
  [heatMeter, threatMeter, hullMeter].forEach(el => el.classList.remove("warning", "danger"));
  if (state.heat >= 85) heatMeter.classList.add("danger"); else if (state.heat >= 70) heatMeter.classList.add("warning");
  if (state.threat >= 80) threatMeter.classList.add("danger"); else if (state.threat >= 50) threatMeter.classList.add("warning");
  if (state.hull <= 25) hullMeter.classList.add("danger");

  updateHazardBanner();
}

function applyEventTraitMods() {
  if (state.trait === "Boom-Lover") {
    state.cargo += 2;
    state.totalExtracted += 2;
  }
}

function showEvent() {
  if (!state.shiftActive) return;
  const e = events[Math.floor(Math.random() * events.length)];
  chooseAndShowDialog(e.title, e.body, e.choices.map(choice => ({
    label: choice.label,
    risky: choice.risky,
    apply: () => {
      choice.apply();
      applyEventTraitMods();
    }
  })));
}

function gradeRun(resultType) {
  let score = 0;
  const quotaRatio = state.totalExtracted / state.quotaTarget;
  score += clamp(quotaRatio * 45, 0, 45);
  score += clamp((state.hull / 100) * 20, 0, 20);
  score += clamp((state.threat / 100) * 12, 0, 12);
  score += clamp((state.momentum / 100) * 8, 0, 8);
  score += clamp(state.comboBest * 1.5, 0, 15);
  score += state.crisisResolved * 4;
  if (resultType === "extracted") score += 10;
  if (resultType.startsWith("fail")) score -= 24;

  if (score >= 95) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function calculatePayout(resultType) {
  const cargoBase = state.cargo * 12 * state.currentNews.saleMult;
  const quotaBonus = state.totalExtracted >= state.quotaTarget ? 180 : 0;
  const riskBonus = state.upgrades.hazardPay && state.threat >= 70 ? (cargoBase + quotaBonus) * 0.2 : 0;
  const momentumBonus = cargoBase * (state.momentum / 100) * 0.12;
  const comboBonus = cargoBase * clamp(state.comboBest * 0.01, 0, 0.25);
  const crisisBonus = state.crisisResolved * 100;

  let gross = cargoBase + quotaBonus + riskBonus + momentumBonus + comboBonus + crisisBonus;
  if (state.trait === "Greedy") gross *= 1.18;
  if (resultType.startsWith("fail")) gross *= 0.55;

  let repairCost = (100 - state.hull) * 1.2;
  if (state.trait === "Greedy") repairCost *= 1.1;

  return {
    cargoCredits: Math.round(cargoBase),
    quotaBonus: Math.round(quotaBonus),
    riskBonus: Math.round(riskBonus),
    momentumBonus: Math.round(momentumBonus),
    comboBonus: Math.round(comboBonus),
    crisisBonus: Math.round(crisisBonus),
    repairCost: Math.round(repairCost),
    net: Math.max(0, Math.round(gross - repairCost)),
  };
}

function renderHistory() {
  const wrap = document.getElementById("historyList");
  wrap.innerHTML = state.runHistory.length
    ? state.runHistory.slice(-6).reverse().map(r => `<div class='history-item'>Shift ${r.shift}: Grade ${r.grade} • Net ${r.net}c • ${r.result}</div>`).join("")
    : "<div class='history-item'>No previous shifts yet.</div>";
}

function renderBadges() {
  const wrap = document.getElementById("badgeList");
  wrap.innerHTML = state.legendaryMoments.length
    ? state.legendaryMoments.slice(-5).reverse().map(t => `<div class='history-item'>${t}</div>`).join("")
    : "<div class='history-item'>No legendary moments yet.</div>";
}

function detectLegendaryMoments(resultType, grade) {
  const moments = [];
  if (grade === "S") moments.push("⭐ S-Rank Shift: Guild legends will sing.");
  if (state.heat >= 90 && resultType === "extracted") moments.push("🔥 Redline Escape: extracted above 90 heat.");
  if (state.hull <= 15 && resultType === "extracted") moments.push("🛡 Last-Plate Survival: extracted under 15 hull.");
  if (state.threat >= 90 && resultType === "extracted") moments.push("☠ Pirate Magnet: survived at 90+ threat.");
  if (state.comboBest >= 10) moments.push("⚡ Combo Master: maintained a 10+ action streak.");
  if (state.crisisResolved >= 2) moments.push("🧠 Crisis Commander: stabilized multiple chain crises.");
  if (moments.length === 0) moments.push("⛏ Solid Shift: no legendary tags this run.");
  state.legendaryMoments.push(...moments);
}

function openSummary(resultType, payout, grade) {
  const titleMap = {
    extracted: "Shift Complete",
    timeout: "Shift Ended (Time Up)",
    fail_hull: "Shift Failed (Hull)",
    fail_heat: "Shift Failed (Heat)",
  };

  document.getElementById("summaryTitle").textContent = titleMap[resultType] || "Shift Summary";
  document.getElementById("summaryBody").textContent = state.totalExtracted >= state.quotaTarget
    ? "Quota achieved. Guild pays full bonus."
    : "Quota missed. You still brought something home.";

  document.getElementById("summaryStats").innerHTML = [
    `Shift ${state.shiftIndex}`,
    `Captain Trait: ${state.trait}`,
    `Sector News: ${state.currentNews.title}`,
    `Extracted: ${Math.floor(state.totalExtracted)} ore`,
    `Cargo Sale: ${payout.cargoCredits}c`,
    `Quota Bonus: ${payout.quotaBonus}c`,
    `Risk Bonus: ${payout.riskBonus}c`,
    `Momentum Bonus: ${payout.momentumBonus}c`,
    `Combo Bonus: ${payout.comboBonus}c`,
    `Crisis Bonus: ${payout.crisisBonus}c`,
    `Repair Cost: -${payout.repairCost}c`,
    `Net Payout: ${payout.net}c`,
    `Best Combo: x${state.comboBest.toFixed(1)}`,
    `Crisis Resolved: ${state.crisisResolved}`,
    `Credits Total: ${state.credits}c`,
  ].map(line => `<div>${line}</div>`).join("");

  const ge = document.getElementById("summaryGrade");
  ge.textContent = `Grade: ${grade}`;
  ge.className = `summary-grade grade-${grade.toLowerCase()}`;

  renderBadges();
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
    btn.textContent = owned ? `Owned: ${up.name}` : `${up.name} (${up.cost}c) — ${up.text}`;
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
  state.parts += state.totalExtracted >= state.quotaTarget ? 2 : 1;

  const grade = gradeRun(resultType);
  state.runHistory.push({ shift: state.shiftIndex, grade, net: payout.net, result: resultType });
  detectLegendaryMoments(resultType, grade);

  openSummary(resultType, payout, grade);
  render();
}

function startBriefing() {
  const picks = [...captainTraits].sort(() => Math.random() - 0.5).slice(0, 3);
  const wrap = document.getElementById("traitActions");
  wrap.innerHTML = "";
  picks.forEach(tr => {
    const btn = document.createElement("button");
    btn.className = "dialog-choice";
    btn.textContent = `${tr.name} — ${tr.desc}`;
    btn.onclick = () => {
      tr.apply(state);
      briefingDialog.close();
      state.shiftActive = true;
      statusText.textContent = `Captain chosen: ${tr.name}. Shift underway.`;
      render();
    };
    wrap.appendChild(btn);
  });
  briefingDialog.showModal();
}

function resetForNextShift() {
  state.shiftIndex += 1;
  state.hull = 100;
  state.heat = 0;
  state.threat = 0;
  state.cargo = 0;
  state.momentum = 0;
  state.overclockTicks = 0;
  state.selectedNode = null;
  state.totalExtracted = 0;
  state.timeLeft = SHIFT_SECONDS;
  state.shiftActive = false;
  state.trait = "None";
  state.traitRallyUsed = false;
  state.comboStreak = 0;
  state.comboBest = 0;
  state.comboTimer = 0;
  state.midForkDone = false;
  state.crisisActive = false;
  state.crisisTimer = 0;
  state.crisisResolved = 0;
  state.nextAutoEventIn = clamp(14 - state.shiftIndex * 0.4, 6, 16);
  state.quotaTarget = 30 + Math.floor((state.shiftIndex - 1) * 5);

  chooseSectorNews();
  renderNodes();
  render();
  statusText.textContent = "Choose a captain trait in briefing to launch shift.";
  startBriefing();
}

document.getElementById("overclockBtn").onclick = () => {
  if (!state.shiftActive) return;
  state.overclockTicks = 50;
  state.threat = clamp(state.threat + 2, 0, 100);
  state.momentum = clamp(state.momentum + 8, 0, 100);
  addCombo(1.5, "Overclock");
  if (state.trait === "Beer Powered" && !state.traitRallyUsed) {
    state.traitRallyUsed = true;
    state.momentum = clamp(state.momentum + 15, 0, 100);
    statusText.textContent = "Beer Rally! Momentum spike engaged.";
  } else {
    statusText.textContent = "Overclock engaged for 10s.";
  }
  render();
};

document.getElementById("ventBtn").onclick = () => {
  if (!state.shiftActive) return;
  const ventPower = state.trait === "Quick Fixer" ? 28 : 20;
  state.heat = Math.max(0, state.heat - ventPower);
  state.momentum = clamp(state.momentum + 4, 0, 100);
  addCombo(1, "Heat vent");
  render();
};

document.getElementById("sealBtn").onclick = () => {
  if (!state.shiftActive) return;
  const repair = state.trait === "Quick Fixer" ? 12 : 8;
  state.hull = Math.min(100, state.hull + repair);
  state.heat = Math.min(100, state.heat + 4);
  addCombo(1, "Breach seal");
  render();
};

document.getElementById("extractBtn").onclick = () => {
  if (!state.shiftActive) return;
  endShift("extracted");
};

document.getElementById("eventBtn").onclick = () => {
  if (!state.shiftActive) return;
  state.threat = clamp(state.threat + 5, 0, 100);
  addCombo(1, "Forced risk");
  showEvent();
};

document.getElementById("nextShiftBtn").onclick = () => {
  summaryDialog.close();
  resetForNextShift();
};

chooseSectorNews();
renderNodes();
render();
startBriefing();
setInterval(tick, TICK_MS);
