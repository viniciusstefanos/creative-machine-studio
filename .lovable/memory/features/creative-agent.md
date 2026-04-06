---
name: Creative Agent Guidelines
description: Rules for AI content generation — hooks, carousels, visual hierarchy, UGC-style, funnel stages, anti-patterns
type: feature
---

## Source
Based on `agente_criacao_conteudo.md` v1.0 (2025-2026 validated formats).

## Key Rules Applied to Edge Functions

### generate-copies
- 6 validated hook types (curiosity, contrarian, social proof, direct problem, before/after, urgency)
- Funnel-specific instructions (top=emotional hook, mid=interactive, bottom=proof+direct CTA)
- Anti-patterns: never start with brand name, never generic CTA, never non-specific copy
- Specificity > generality (sensory details)
- CTA closes the hook's loop
- Max 2 visible text lines in visual pieces

### generate-asset-from-template
- HTML: max 2 lines visible, safe zone 15-85% height (9:16), high contrast mandatory, never start with logo
- Carousel: slide 1 = hook (never report title), mid slides = 1 point each (max 3 lines), last = CTA
- Image prompts: UGC-style > polished, face looking at camera (+35% conversion), lo-fi/analog trend, lifestyle > isolated product
- Reference metrics: video CTR 1.87%, Reels <15s = 82% completion, "Excellent" Ad Strength = +6% conversion
