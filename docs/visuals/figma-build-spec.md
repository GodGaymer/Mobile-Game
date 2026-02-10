# Figma Build Spec (Execution-Ready)

## File structure

- Page 1: `00_Foundations`
- Page 2: `01_Components`
- Page 3: `02_Screens_Portrait`
- Page 4: `03_States_and_Flows`

## Foundations (`00_Foundations`)

1. **Color styles**
   - Create styles for all palette entries from `style-guide.md`.
2. **Text styles**
   - Header + body + caption tokens.
3. **Spacing scale**
   - 4 / 8 / 12 / 16 / 24 / 32.
4. **Radius + stroke tokens**
   - Radii: 8 and 12.
   - Stroke: 1 default, 2 critical.

## Components (`01_Components`)

Create these component sets first:

1. `HUD/Meter`
   - Variants: normal, warning, critical.
2. `Controls/PowerSlider`
   - Variants: idle, active-drag, locked.
3. `Controls/ActionButton`
   - Variants: default, warning, critical, cooldown, disabled.
4. `Drones/Chip`
   - Variants: idle, selected, active, damaged.
5. `Event/Card`
   - Variants: 2-choice, 3-choice.
6. `Nav/BottomTab`
   - Variants: inactive, active.

## Portrait frame definitions (`02_Screens_Portrait`)

Use iPhone-ish portrait frame baseline (e.g., 390x844) and duplicate for Android proportions.

Create these five frames:

1. `Shift_Default`
2. `Shift_HeatCritical`
3. `Shift_EventModal_PiratePing`
4. `Shift_DroneTargeting`
5. `Cashout_MarketRefine`

## Layout recipe for Shift screen

- Root frame with vertical auto-layout.
- Child sections:
  1. `TopHUD` (fixed height)
  2. `MapZone` (fill container)
  3. `BottomPanel` (fixed height with tabbed content)
  4. `BottomTabs` (fixed height)
- Keep `TopHUD` and `BottomTabs` pinned in prototyping.

## Naming conventions

- Components: `Category/Element/Variant`
- Frames: `Screen_Context_State`
- Layers: concise nouns; no "Rectangle 123".

## Prototype links

Wire these interactions:

- Slider drag states
- Drone chip select -> target mode overlay
- Event modal choice outcomes (at least one branch each)
- Emergency button cooldown visualization

## Ready-for-dev handoff checklist

- [ ] All components use styles/tokens (no raw hex or ad hoc font settings)
- [ ] Variant properties named consistently
- [ ] Measurements shown for touch targets and key spacing
- [ ] Critical thresholds annotated on HUD meters
- [ ] Event buttons display exact numeric effects in labels
