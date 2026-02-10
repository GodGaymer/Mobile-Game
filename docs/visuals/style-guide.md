# Visual Style Guide (MVP)

## Art direction statement

"Forged dwarven industry meets hard-space operations": readable industrial UI, bold status language, and tactile metallic accents.

## Color system

### Core palette

- **Space Charcoal** `#11161D` — primary background
- **Forge Iron** `#2A3340` — cards/panels
- **Signal Amber** `#F4A62A` — interactive controls
- **Heat Red** `#E24A3B` — critical damage/overheat
- **Warning Yellow** `#FFD54A` — warning thresholds
- **Coolant Teal** `#2CC9C2` — positive stabilization
- **Mineral Green** `#63D471` — success/positive economy
- **Text Primary** `#E9EEF5`
- **Text Secondary** `#A9B4C2`

### Meter semantic mapping

- Hull: teal -> yellow -> red by threshold
- Heat: neutral gray -> yellow (70+) -> red (85+)
- Threat: neutral -> amber (50+) -> red (80+)
- Cargo: neutral with green pulse on full/profitable state

## Typography

- **Display / headers:** heavy techno sans (all-caps optional for compact labels)
- **Body / values:** clean sans optimized for small mobile text
- Recommended hierarchy:
  - H1: 24
  - H2: 20
  - H3: 16
  - Body: 14
  - Caption: 12

## Shape language

- Panels: rounded rectangle (8–12 radius)
- Buttons: high contrast, chunky silhouettes
- Critical actions: thicker border + glow pulse
- Icons: geometric, low-detail silhouette for readability at small sizes

## Motion language

- Fast feedback for player actions (<200ms perceptual response).
- Pulse animation for critical systems only; avoid constant animation spam.
- Event card entrance: quick vertical slide + fade.
- Resource changes: short numeric "tick" pop animation.

## FX usage

- Overclock active: orange bloom around drill UI and subtle camera shake.
- Heat spike: red edge vignette + HUD warning flicker.
- Shield impacts: cyan ripple on hull meter and map hit marker.

## Accessibility baseline

- Avoid color-only critical states: pair with icon + text label.
- Minimum contrast target: WCAG AA equivalent for all core text.
- Ensure button labels remain legible at 320pt width class.
