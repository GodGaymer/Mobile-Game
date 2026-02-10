const TICK_MS = 500;
const MISSION_SECONDS = 55;

const missions = [
  { id: 'quota', name: 'Quota Run', duration: MISSION_SECONDS, baseYield: { iron: 14, nickel: 8, ice: 5 }, risk: 0.25, payout: 130 },
  { id: 'prospect', name: 'Prospect Sweep', duration: MISSION_SECONDS + 10, baseYield: { iron: 6, nickel: 6, helium3: 5 }, risk: 0.45, payout: 170 },
  { id: 'salvage', name: 'Wreck Salvage', duration: MISSION_SECONDS + 15, baseYield: { iron: 10, nickel: 4, parts: 4 }, risk: 0.55, payout: 200 },
];

const marketNews = [
  { title: 'Shipyard Boom', effect: 'Iron & Nickel up', mods: { iron: 1.2, nickel: 1.15 } },
  { title: 'Fuel Crunch', effect: 'Helium-3 demand spikes', mods: { helium3: 1.35 } },
  { title: 'Cold Front', effect: 'Ice prices rise', mods: { ice: 1.25 } },
  { title: 'Pirate Taxes', effect: 'Parts and repairs cost more', mods: { parts: 1.2 } },
  { title: 'Calm Exchange', effect: 'Stable pricing', mods: {} },
];

const commodities = {
  iron: { name: 'Iron', base: 12 },
  nickel: { name: 'Nickel', base: 16 },
  ice: { name: 'Ice', base: 10 },
  helium3: { name: 'Helium-3', base: 24 },
  parts: { name: 'Parts', base: 28 },
};

const shipUpgrades = [
  { id: 'drill', name: 'Drill Core Mk2', cost: 260, desc: '+15% mission yield', apply: s => s.ship.yieldMult += 0.15 },
  { id: 'bay', name: 'Drone Bay +1', cost: 320, desc: '+1 drone slot', apply: s => s.ship.drones += 1 },
  { id: 'armor', name: 'Reinforced Hull', cost: 280, desc: '-20% mission damage', apply: s => s.ship.damageMitigation += 0.2 },
  { id: 'cargo', name: 'Cargo Pods', cost: 220, desc: '+25 colony storage cap', apply: s => s.colony.storageCap += 25 },
];

const colonyProjects = [
  { id: 'farm', name: 'Hydro Farm', cost: { credits: 180, ice: 8 }, desc: '+6 food/day', apply: s => s.colony.production.food += 6 },
  { id: 'reactor', name: 'Fusion Relay', cost: { credits: 220, helium3: 4 }, desc: '+8 power/day', apply: s => s.colony.production.power += 8 },
  { id: 'hab', name: 'Hab Expansion', cost: { credits: 200, iron: 10 }, desc: '+12 housing', apply: s => s.colony.housingCap += 12 },
  { id: 'market', name: 'Market Hub', cost: { credits: 260, nickel: 10 }, desc: '+8% sell prices', apply: s => s.colony.sellBonus += 0.08 },
];

const state = {
  day: 1,
  credits: 420,
  selectedMissionId: 'quota',
  stance: 'balanced',
  activeMission: null,
  log: ['Guild initialized. Colony ready for mission dispatch.'],
  news: marketNews[4],
  prices: {},
  inventory: { iron: 14, nickel: 10, ice: 12, helium3: 4, parts: 3 },
  ship: {
    hull: 100,
    drones: 3,
    yieldMult: 1,
    damageMitigation: 0,
    upgradesOwned: {},
  },
  colony: {
    population: 42,
    morale: 70,
    food: 55,
    power: 58,
    housingCap: 50,
    storageCap: 120,
    sellBonus: 0,
    production: { food: 3, power: 4 },
    projectsOwned: {},
  },
};

const els = {
  day: document.getElementById('dayVal'),
  credits: document.getElementById('creditsVal'),
  pop: document.getElementById('popVal'),
  morale: document.getElementById('moraleVal'),
  hull: document.getElementById('hullVal'),
  drones: document.getElementById('droneVal'),
  news: document.getElementById('newsText'),
  missionCards: document.getElementById('missionCards'),
  dispatchBtn: document.getElementById('dispatchBtn'),
  missionText: document.getElementById('activeMissionText'),
  missionProgress: document.getElementById('missionProgress'),
  logList: document.getElementById('logList'),
  marketRows: document.getElementById('marketRows'),
  needsGrid: document.getElementById('needsGrid'),
  shipStats: document.getElementById('shipStats'),
  shipUpgrades: document.getElementById('shipUpgradeList'),
  colonyBuilds: document.getElementById('colonyBuildList'),
  shipArt: document.getElementById('shipArt'),
  boostBtn: document.getElementById('boostBtn'),
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function addLog(text) {
  state.log.push(`[Day ${state.day}] ${text}`);
  state.log = state.log.slice(-20);
}

function pickNews() {
  state.news = marketNews[Math.floor(Math.random() * marketNews.length)];
  els.news.textContent = `Sector News: ${state.news.title} — ${state.news.effect}`;
}

function recalcPrices() {
  Object.entries(commodities).forEach(([key, c]) => {
    const noise = rand(0.88, 1.12);
    const mod = state.news.mods[key] || 1;
    state.prices[key] = Math.round(c.base * noise * mod);
  });
}

function renderMissionCards() {
  els.missionCards.innerHTML = '';
  missions.forEach(m => {
    const card = document.createElement('div');
    card.className = `card ${state.selectedMissionId === m.id ? 'selected' : ''}`;
    card.innerHTML = `
      <strong>${m.name}</strong><br>
      <small>Duration: ${m.duration}s • Risk: ${Math.round(m.risk * 100)}%</small><br>
      <small>Base payout: ${m.payout}c</small>
    `;
    card.onclick = () => {
      state.selectedMissionId = m.id;
      renderMissionCards();
    };
    els.missionCards.appendChild(card);
  });
}

function stanceMult() {
  return state.stance === 'safe'
    ? { yield: 0.82, risk: 0.65, speed: 0.95 }
    : state.stance === 'aggressive'
      ? { yield: 1.25, risk: 1.35, speed: 1.15 }
      : { yield: 1.0, risk: 1.0, speed: 1.0 };
}

function startMission() {
  if (state.activeMission) return;
  const m = missions.find(x => x.id === state.selectedMissionId);
  const mod = stanceMult();
  state.activeMission = {
    id: m.id,
    name: m.name,
    remaining: m.duration / mod.speed,
    duration: m.duration / mod.speed,
    baseYield: m.baseYield,
    risk: m.risk * mod.risk,
    payout: m.payout,
    eventTriggered: false,
    emergencyBoosted: false,
  };
  addLog(`Mission dispatched: ${m.name} (${state.stance}).`);
}

function consumeColonyNeeds() {
  const c = state.colony;
  c.food += c.production.food - Math.round(c.population * 0.16);
  c.power += c.production.power - Math.round(c.population * 0.14);

  const housingPressure = c.population > c.housingCap ? (c.population - c.housingCap) : 0;
  const shortfalls = Number(c.food < 20) + Number(c.power < 20) + Number(housingPressure > 0);

  c.morale += 2 - shortfalls * 6;
  if (c.food < 8 || c.power < 8) c.morale -= 5;
  c.morale = clamp(c.morale, 5, 100);

  c.food = clamp(c.food, 0, c.storageCap);
  c.power = clamp(c.power, 0, c.storageCap);
}

function finishMission(success = true) {
  const m = state.activeMission;
  if (!m) return;

  const moraleMult = 0.8 + state.colony.morale / 100 * 0.4;
  const yieldMult = state.ship.yieldMult * stanceMult().yield * moraleMult;

  const gained = {};
  Object.entries(m.baseYield).forEach(([k, v]) => {
    gained[k] = Math.max(0, Math.round(v * yieldMult * rand(0.9, 1.15)));
    state.inventory[k] = (state.inventory[k] || 0) + gained[k];
  });

  let damage = Math.round(18 * m.risk * rand(0.6, 1.3) * (1 - state.ship.damageMitigation));
  if (!success) damage += 12;
  state.ship.hull = clamp(state.ship.hull - damage, 0, 100);

  const payout = Math.round((m.payout + (success ? 40 : -20)) * moraleMult);
  state.credits += Math.max(0, payout);

  addLog(`${m.name} complete. +${Object.entries(gained).map(([k,v]) => `${v} ${commodities[k]?.name || k}`).join(', ')} | +${payout}c | Hull -${damage}`);

  if (state.ship.hull < 35) {
    const repair = Math.round((100 - state.ship.hull) * 2.2);
    state.credits = Math.max(0, state.credits - repair);
    addLog(`Emergency dock repairs cost ${repair}c.`);
    state.ship.hull = 100;
  }

  state.activeMission = null;
  state.day += 1;
  consumeColonyNeeds();
  pickNews();
  recalcPrices();
}

function updateMissionTick(dt) {
  const m = state.activeMission;
  if (!m) return;

  m.remaining -= dt;

  if (!m.eventTriggered && m.remaining < m.duration * 0.5) {
    m.eventTriggered = true;
    if (Math.random() < m.risk) {
      addLog(`Mission event: hazard surge during ${m.name}.`);
      m.remaining += 5;
      state.ship.hull = clamp(state.ship.hull - Math.round(6 * m.risk), 0, 100);
    } else {
      addLog(`Mission event: efficient route found (+25c).`);
      state.credits += 25;
    }
  }

  if (m.remaining <= 0) finishMission(true);
}

function storageUsed() {
  return Object.entries(state.inventory).reduce((sum, [k,v]) => {
    if (k === 'parts') return sum + v * 2;
    return sum + v;
  }, 0);
}

function canAffordCost(cost) {
  if (state.credits < (cost.credits || 0)) return false;
  for (const [k,v] of Object.entries(cost)) {
    if (k === 'credits') continue;
    if ((state.inventory[k] || 0) < v) return false;
  }
  return true;
}

function payCost(cost) {
  state.credits -= (cost.credits || 0);
  for (const [k,v] of Object.entries(cost)) {
    if (k === 'credits') continue;
    state.inventory[k] -= v;
  }
}

function renderLog() {
  els.logList.innerHTML = state.log.slice().reverse().map(line => `<div class="log-item">${line}</div>`).join('');
}

function renderMarket() {
  els.marketRows.innerHTML = '';
  Object.entries(commodities).forEach(([key, c]) => {
    const row = document.createElement('div');
    row.className = 'market-row';
    const price = state.prices[key] || c.base;
    row.innerHTML = `
      <div><strong>${c.name}</strong><br><small>Stock: ${state.inventory[key] || 0}</small></div>
      <div>Price: ${price}c</div>
      <div class="market-actions">
        <button class="mini-btn" data-sell="${key}">Sell 1</button>
        <button class="mini-btn" data-buy="${key}">Buy 1</button>
      </div>
    `;
    row.querySelector('[data-sell]').onclick = () => {
      if ((state.inventory[key] || 0) <= 0) return;
      state.inventory[key] -= 1;
      state.credits += Math.round(price * (1 + state.colony.sellBonus));
      addLog(`Sold 1 ${c.name}.`);
      renderAll();
    };
    row.querySelector('[data-buy]').onclick = () => {
      if (state.credits < price) return;
      if (storageUsed() >= state.colony.storageCap) {
        addLog('Storage full. Expand cargo/warehouse.');
        renderAll();
        return;
      }
      state.credits -= price;
      state.inventory[key] = (state.inventory[key] || 0) + 1;
      addLog(`Bought 1 ${c.name}.`);
      renderAll();
    };
    els.marketRows.appendChild(row);
  });
}

function renderColony() {
  const c = state.colony;
  const needs = [
    { name: 'Food', value: c.food, cap: c.storageCap },
    { name: 'Power', value: c.power, cap: c.storageCap },
    { name: 'Housing', value: c.housingCap - c.population, cap: c.housingCap },
    { name: 'Morale', value: c.morale, cap: 100 },
  ];

  els.needsGrid.innerHTML = needs.map(n => {
    const pct = clamp((n.value / n.cap) * 100, 0, 100);
    const cls = pct < 30 ? 'need low' : 'need';
    return `<div class="${cls}"><strong>${n.name}: ${Math.round(n.value)}</strong><div class="need-bar"><div class="need-fill" style="width:${pct}%"></div></div></div>`;
  }).join('');

  els.colonyBuilds.innerHTML = '';
  colonyProjects.forEach(p => {
    const owned = state.colony.projectsOwned[p.id];
    const costText = Object.entries(p.cost).map(([k,v]) => `${v} ${k}`).join(', ');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<strong>${p.name}</strong><br><small>${p.desc}</small><br><small>Cost: ${costText}</small>`;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = owned ? 'Built' : 'Build';
    b.disabled = owned;
    b.onclick = () => {
      if (owned || !canAffordCost(p.cost)) return;
      payCost(p.cost);
      state.colony.projectsOwned[p.id] = true;
      p.apply(state);
      addLog(`Colony project complete: ${p.name}.`);
      renderAll();
    };
    card.appendChild(b);
    els.colonyBuilds.appendChild(card);
  });
}

function renderShipyard() {
  els.shipArt.textContent = `
        /\
   ____/==\____
  /___ DRGN ___\\
  |  Hull ${String(state.ship.hull).padStart(3, ' ')}%  |
  | Drones ${state.ship.drones}  Yield x${state.ship.yieldMult.toFixed(2)} |
  \____====____/
      /_||_\\
  `;

  els.shipStats.innerHTML = `
    <strong>Ship Stats</strong><br>
    Hull Integrity: ${state.ship.hull}%<br>
    Drone Capacity: ${state.ship.drones}<br>
    Yield Multiplier: x${state.ship.yieldMult.toFixed(2)}<br>
    Damage Mitigation: ${Math.round(state.ship.damageMitigation * 100)}%<br>
    Storage Used: ${storageUsed()} / ${state.colony.storageCap}
  `;

  els.shipUpgrades.innerHTML = '';
  shipUpgrades.forEach(u => {
    const owned = state.ship.upgradesOwned[u.id];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<strong>${u.name}</strong><br><small>${u.desc}</small><br><small>Cost: ${u.cost}c</small>`;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = owned ? 'Installed' : 'Install';
    b.disabled = owned || state.credits < u.cost;
    b.onclick = () => {
      if (owned || state.credits < u.cost) return;
      state.credits -= u.cost;
      state.ship.upgradesOwned[u.id] = true;
      u.apply(state);
      addLog(`Ship upgrade installed: ${u.name}.`);
      renderAll();
    };
    card.appendChild(b);
    els.shipUpgrades.appendChild(card);
  });
}

function renderMissionPanel() {
  if (!state.activeMission) {
    els.missionText.textContent = 'No mission active.';
    els.missionProgress.style.width = '0%';
    return;
  }
  const m = state.activeMission;
  const pct = clamp(((m.duration - m.remaining) / m.duration) * 100, 0, 100);
  els.missionText.textContent = `${m.name} (${state.stance}) — ${Math.ceil(m.remaining)}s remaining`;
  els.missionProgress.style.width = `${pct}%`;
}

function renderAll() {
  els.day.textContent = state.day;
  els.credits.textContent = state.credits;
  els.pop.textContent = state.colony.population;
  els.morale.textContent = state.colony.morale;
  els.hull.textContent = state.ship.hull;
  els.drones.textContent = state.ship.drones;
  els.news.textContent = `Sector News: ${state.news.title} — ${state.news.effect}`;

  renderMissionCards();
  renderMissionPanel();
  renderLog();
  renderMarket();
  renderColony();
  renderShipyard();
}

// Tab behavior
Array.from(document.querySelectorAll('.tab')).forEach(btn => {
  btn.onclick = () => {
    const tab = btn.dataset.tab;
    Array.from(document.querySelectorAll('.tab')).forEach(b => b.classList.toggle('active', b === btn));
    Array.from(document.querySelectorAll('.screen')).forEach(s => s.classList.toggle('active', s.dataset.screen === tab));
  };
});

// stance selector
Array.from(document.querySelectorAll('[data-stance]')).forEach(btn => {
  btn.onclick = () => {
    state.stance = btn.dataset.stance;
    Array.from(document.querySelectorAll('[data-stance]')).forEach(b => b.classList.toggle('active', b === btn));
  };
});

els.dispatchBtn.onclick = () => {
  if (state.activeMission) {
    addLog('Mission already in progress.');
    renderAll();
    return;
  }
  startMission();
  renderAll();
};

els.boostBtn.onclick = () => {
  if (!state.activeMission || state.activeMission.emergencyBoosted || state.credits < 40) return;
  state.credits -= 40;
  state.activeMission.remaining = Math.max(0, state.activeMission.remaining - 12);
  state.activeMission.emergencyBoosted = true;
  addLog('Emergency boost purchased. Mission ETA reduced.');
  renderAll();
};

function tick() {
  updateMissionTick(TICK_MS / 1000);
  renderMissionPanel();
  // passive morale drift
  if (!state.activeMission && Math.random() < 0.01) {
    state.colony.morale = clamp(state.colony.morale + (state.colony.food > 35 ? 1 : -1), 5, 100);
    renderAll();
  }
}

pickNews();
recalcPrices();
renderAll();
setInterval(tick, TICK_MS);
