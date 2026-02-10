# Shift Console Wireframe (Portrait)

## Screen hierarchy

```text
┌──────────────────────────────────────────┐
│ TOP HUD                                  │
│ [Hull] [Heat] [Power] [Cargo] [Threat]  │
│                                  [Pause] │
├──────────────────────────────────────────┤
│ NODE MAP / COMBAT FIELD                  │
│ - Rig anchor point                        │
│ - 3–6 nodes visible                       │
│ - Hazard lanes + warning overlays         │
│ - Drone pathing lines                     │
│ - Tap targets for node assignment         │
├──────────────────────────────────────────┤
│ SWIPE PANEL (3 pages)                     │
│ 1) Power Sliders                          │
│ 2) Drone Commands                         │
│ 3) Emergency Actions                      │
└──────────────────────────────────────────┘
Bottom Tabs: Contracts | Crew | Rig | Market | Station
```

## Layout zones (portrait, % of height)

- **Top HUD:** 12%
- **Map interaction area:** 48%
- **Bottom interaction panel:** 30%
- **Tab bar:** 10%

## Top HUD specification

- Always visible, never occluded by modals except full pause/menu.
- Meter style:
  - Icon + short label + value.
  - Critical thresholds flash and pulse.
- Priority color rules:
  - Heat >= 70: warning tint.
  - Heat >= 85: high-alert red pulse.
  - Threat >= 75: event warning amber pulse.
  - Hull <= 25: persistent critical state.

## Node Map behavior

- Node tokens sized for one-thumb target minimum (~44x44 pt equivalent).
- Selected node receives ring + line to assigned drone.
- Hazards shown as lane overlays with directional movement cues.
- Scanner discoveries animate in as revealed states (fogged -> identified).

## Bottom panel page 1: Power Sliders

- Four large sliders: Drill, Shields, Scanner, Thrusters.
- Live total indicator must equal 10 bars.
- Interaction rules:
  - Dragging one slider auto-rebalances only if optional "Auto Balance" toggle is on.
  - Default behavior: player manually adjusts and receives immediate error state if sum != 10.
- Overclock button:
  - Large CTA with active timer ring.
  - Disabled state shown during cooldown.

## Bottom panel page 2: Drone Commands

- Drone chips across top of panel (Miner / Hauler / Fixer).
- Tap drone -> map enters target mode -> tap node/module.
- Commands:
  - Deploy
  - Retarget
  - Recall
  - Emergency Recall (global)
- State labels per drone: `Idle`, `En Route`, `Active`, `Damaged`, `Recalling`.

## Bottom panel page 3: Emergency Actions

- Four high-contrast action buttons:
  1. Vent Heat
  2. Seal Breach
  3. Recall All
  4. Decoy
- Must display cost and cooldown inline on button body.
- Dangerous actions require one extra confirmation only when they consume scarce strategic resources.

## Event card modal (overlay)

- Triggered from simulation events.
- Structure:
  1. Title
  2. 1–2 sentence prompt
  3. 2–3 choice buttons with exact numeric effects
- Choice button example:
  - `Bribe Pirates (-120c, Threat -20)`
- Keep map dimmed but visible in background to preserve context.

## Primary gameplay states to mock

1. **Baseline extraction:** all systems stable.
2. **High heat emergency:** heat > 85 and vent available.
3. **Hull breach chain risk:** seal prompt visible.
4. **Drone-heavy optimization:** multiple active assignments.
5. **Extraction decision point:** objective met, optional risk push.
