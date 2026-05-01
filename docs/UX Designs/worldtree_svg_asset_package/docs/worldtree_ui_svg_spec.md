# WorldTree UI SVG Asset Specification (LLM-Readable)

## Overview
This document defines SVG asset specifications for two UI themes:
1. Paper UI (handcrafted parchment style)
2. Dark Fantasy UI (gothic, arcane style)

---

## PAPER UI

### Colors
- Base: #D8B982, #CFAE76, #E3CC9A
- Ink: #2B1A0F, #4A2D18, #6E4A24

### Assets
- paper-bg-parchment.svg (1920x1080)
- paper-panel-large.svg (720x480)
- paper-card.svg (320x220)
- paper-border-ink.svg (scalable)
- paper-edge-torn.svg (1024x64)
- paper-button-idle.svg (240x64)
- paper-button-hover.svg (240x64)
- paper-button-pressed.svg (240x64)
- paper-divider-ink.svg (600x16)
- paper-corner-flourish.svg (64x64)
- paper-icons.svg (24/32/48)

### Style Rules
- Hand-drawn uneven strokes
- Warped geometry (no perfect rectangles)
- Paper grain using SVG noise
- Soft shadows only
- Imperfections required (ink bleed, jitter)

### Filters
- paperNoise
- inkBleed
- softPaperShadow

---

## DARK FANTASY UI

### Colors
- Base: #090A0D, #11131A, #1D1A24
- Metal: #3B3444, #5B5364, #9A8F77
- Glow: #7D5CFF, #39C6FF, #B14CFF, #D6B76A

### Assets
- dark-bg-stone.svg (1920x1080)
- dark-panel-large.svg (760x520)
- dark-card-rune.svg (320x220)
- dark-border-gothic.svg (scalable)
- dark-divider-metal.svg (600x24)
- dark-button-idle.svg (260x72)
- dark-button-hover.svg (260x72)
- dark-button-pressed.svg (260x72)
- dark-rune-glow.svg (64x64)
- dark-corner-ornament.svg (96x96)
- dark-icons.svg (24/32/48)

### Style Rules
- Sharp, angular geometry
- Strong contrast
- Glow effects with blur
- Heavy shadows
- Ornate gothic detail

### Filters
- stoneNoise
- metalBevel
- runeGlow
- scratchMask

---

## COMPONENT MAPPING

- Background: parchment vs stone
- Panel: paper sheet vs gothic frame
- Button: ink label vs metal rune button
- Divider: ink line vs glowing metal line
- Icons: sketch vs glowing rune

---

## NAMING CONVENTION

/theme/component/state/size

Examples:
- paper/button/idle/md.svg
- dark/button/hover/md.svg

---

## FOLDER STRUCTURE

assets/
  paper/
    backgrounds/
    panels/
    buttons/
    borders/
    dividers/
    icons/
    textures/
  dark-fantasy/
    backgrounds/
    panels/
    buttons/
    borders/
    dividers/
    icons/
    textures/

---

## NOTES FOR LLM USE

- Always preserve imperfections in Paper UI
- Always preserve glow + contrast in Dark Fantasy UI
- Do not mix styles unless explicitly creating hybrid mode
- Use consistent naming and sizing
- All assets should be scalable SVG unless specified otherwise
