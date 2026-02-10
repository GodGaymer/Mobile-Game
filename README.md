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
