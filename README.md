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
