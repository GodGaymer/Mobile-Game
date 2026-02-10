## Extraction + heat (baseline)

`extraction_per_sec = base + drill_bars * step + modifiers`

Where baseline defaults are `base = 1.0`, `step = 2.0`, and `modifiers = 0.0` unless otherwise stated.

| Drill bars | Equation result (`base + bars*step + modifiers`) | Expected extraction/sec |
|---:|---:|---:|
| 0 | `1.0 + 0*2.0 + 0.0` | 1.0 |
| 5 | `1.0 + 5*2.0 + 0.0` | 11.0 |
| 10 | `1.0 + 10*2.0 + 0.0` | 21.0 |

Overclocked example (20% boost): with 10 bars and `modifiers = +4.2`, extraction is `1.0 + 10*2.0 + 4.2 = 25.2/sec`.

Rounding behavior: accumulate extraction as a float internally each tick and round only when displaying UI values.

## Implementation notes

### Simulation Order

Run simulation steps in this fixed order each tick:

1. Apply player inputs (sliders/buttons/drone retargets).
2. Apply production/damage generation.
3. Apply mitigation (shields/thrusters/fixer).
4. Apply cooling/vent effects.
5. Clamp values and evaluate threshold triggers.

Clamp bounds (explicit):

- `drill_bars`: clamp to `[0, 10]`.
- `extraction_per_sec`: clamp to `[0.0, +inf)`.
- `heat`: clamp to `[0.0, 100.0]`.

Threshold trigger semantics:

- **Crossing-edge trigger** (fire once per crossing): trigger only when value crosses the threshold boundary this tick (for example `prev_heat < 80.0` and `new_heat >= 80.0`). Do not retrigger on subsequent ticks while still above the threshold.
- **While-above trigger** (fire each eligible tick): trigger every tick where value remains above threshold after clamping (for example `new_heat >= 95.0`).

### Shift Event Pacing and Threat Scaling

Use a target-events model so each shift has a predictable event volume, then let threat bias what type of event is selected.

#### 1) Expected event counts by shift duration and intensity

Define three intensity bands and expected total event counts (`expected_events`) over a shift:

| Shift duration | Low intensity | Normal intensity | High intensity |
|---:|---:|---:|---:|
| 3 min (180s) | 2 | 4 | 6 |
| 5 min (300s) | 3 | 6 | 9 |
| 8 min (480s) | 5 | 9 | 14 |
| 10 min (600s) | 6 | 12 | 18 |

Guideline for custom shift lengths:

- `low_rate = 0.010 events/sec`
- `normal_rate = 0.020 events/sec`
- `high_rate = 0.030 events/sec`

Then compute:

`expected_events = round(shift_duration_sec * rate_by_intensity)`

#### 2) Baseline event check interval and threat-based probability

Use fixed event checks every `5s`.

- `check_interval_sec = 5`
- `checks_per_shift = shift_duration_sec / check_interval_sec`

Baseline spawn chance per check is:

`p_base = expected_events / checks_per_shift`

Clamp to avoid extremes and preserve pacing:

- `p_base = clamp(p_base, 0.02, 0.45)`

Threat (`threat` in `[0.0, 1.0]`) modifies final per-check probability with a bounded scalar:

- `threat_scalar = lerp(0.75, 1.35, threat)`
- `p_final = clamp(p_base * threat_scalar, 0.02, 0.60)`

Notes:

- Threat should primarily change event *severity/category weighting* and only moderately alter total volume.
- If a deterministic cap is needed, stop spawning once `spawned_events >= expected_events * 1.25`.

#### 3) Cooldown spacing to avoid duplicate high-impact events

Maintain per-category cooldown timers (in seconds) from the last spawned event of that category.

Minimum spacing rules:

- `pirate`: `45s`
- `meteor`: `35s`
- `system`: `30s`

Spawn eligibility check for candidate event `E` of category `C`:

1. `now - last_spawn_time[C] >= cooldown_sec[C]`
2. If false, either:
   - reroll a different category/event that is eligible, or
   - spawn nothing this check (preferred if reroll budget is exhausted).

Optional anti-streak global guard (recommended):

- `high_impact_global_spacing = 20s`
- If `E.impact == high`, require `now - last_high_impact_spawn >= 20s`.

Implementation tip:

- Track `last_spawn_time` in simulation state and evaluate cooldowns during event selection, *before* committing any event side effects.

### Morale System Specification

Treat morale as a bounded scalar that is updated once per simulation tick and shown to players as an integer percentage.

- `morale` clamp: `[0, 100]`
- Internal storage: float for accumulation, rounded only for UI.
- Tick formula:

`morale_next = clamp(morale_prev + passive_drift + threshold_impact + source_sink_delta, 0, 100)`

#### 1) Passive morale drift per minute

Passive drift is optional and can be disabled by setting it to zero.

- Default: `passive_drift_per_min = -1.0`
- Per-second conversion: `passive_drift = passive_drift_per_min / 60`
- If no passive drift is desired for a mode/difficulty, set `passive_drift_per_min = 0.0`.

#### 2) Morale threshold bands and concrete impacts

Apply one active band each tick based on `morale_prev` (before this tick's updates):

| Morale band | Band effect | Concrete numeric modifiers |
|---|---|---|
| `< 30` (low) | Crew instability | `extraction_per_sec_mult = -0.15`, `event_severity_weight_high = +0.10`, `critical_mishap_chance = +0.05` |
| `30–70` (stable) | Baseline operation | No modifier (`0.00` across morale-derived stats) |
| `> 70` (high) | Motivated crew | `extraction_per_sec_mult = +0.10`, `repair_speed_mult = +0.10`, `event_severity_weight_high = -0.05` |

Band behavior:

- Evaluate once per tick after core production values are computed and before final clamping.
- Only one band can apply at a time.
- Crossing a band edge can optionally trigger a one-shot log/toast, but numeric band modifiers are continuous while in-band.

#### 3) All morale sources and sinks

Sum morale sources/sinks in `source_sink_delta` each tick from these channels.

##### Traits (persistent modifiers)

- `optimist` trait: `+0.5 morale/min`
- `pessimist` trait: `-0.5 morale/min`
- `hardened` trait: reduces negative event morale penalties by `25%`

Trait effects are always-on while the crew member is active.

##### Events (discrete deltas)

- Minor positive event (e.g., clean salvage): `+4 morale`
- Minor negative event (e.g., equipment scare): `-6 morale`
- Major positive event (e.g., bonus cache): `+8 morale`
- Major negative event (e.g., pirate breach): `-12 morale`

Apply instantly when the event resolves.

##### Beer action (player consumable)

- Use effect: `+10 morale` instantly
- Cooldown: `90s`
- Optional side-effect (if enabled in balance mode): `-5% extraction_per_sec` for `20s`

##### Emergency extract (panic action)

- Immediate morale penalty: `-20 morale`
- Additional next-shift penalty tag: `shaken` (`-5 starting morale`, applied once at next shift start)

#### 4) Persistence rules between shifts

At shift end, persist morale with partial carryover and a safe reset range.

- Carryover: `next_shift_start_morale = round(prev_shift_end_morale * 0.60)`
- Reset floor: minimum start morale after carryover is `25`
- Reset ceiling: maximum start morale after carryover is `80`

Final start morale formula:

`start_morale = clamp(round(end_morale * 0.60) + one_shot_shift_tags, 25, 80)`

Where `one_shot_shift_tags` includes effects like emergency extract's `shaken` penalty.

#### 5) UI surfacing rule (required)

Always surface morale effects via a dedicated morale icon + tooltip:

- Show a morale status icon beside the morale meter (red low, gray stable, green high).
- On hover/tap, tooltip must list **exact active numeric modifiers** from the current band and active sources/sinks.
- Tooltip format example:
  - `Morale: 24 (Low)`
  - `Extraction: -15%`
  - `High-impact event weight: +10%`
  - `Passive drift: -1.0/min`
  - `Recent source: Beer +10`
