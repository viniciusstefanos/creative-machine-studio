---
name: Creative Agent Guidelines
description: Rules for AI content generation — hooks, carousels, visual hierarchy, UGC-style, funnel stages, anti-patterns, 2026 benchmarks
type: feature
---

## Source
Based on `agente_criacao_conteudo.md` v1.0 + web research 2026 (Buffer 45M+ posts, Metricool, Socialinsider, Hootsuite).

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

### Instagram Brasil 2026 Benchmarks (validated)
- Feed/Carousel: 1080×1350px (4:5) = dominant format (replaces 1:1)
- Reels/Stories: 1080×1920px (9:16) = full screen
- Educational carousel: 10.15% engagement rate, 3.1x vs single post (Metricool)
- Reels 7-12s: 2.25x reach vs static, 82% completion rate
- Interactive story stickers: 2x response rate
- Odd numbers in title (3,5,7): +22% CTR (Buffer)
- UGC-style > polished production
- Face looking at camera: +35% conversion
- Peak hours BR: 12h-14h, 19h-21h (GMT-3)

### 8 Viral Templates (seeded in DB)
1. Carrossel Educativo (html_only, 4:5, 5-10 slides)
2. Carrossel Antes/Depois (html_and_image, 4:5, 4-6 slides)
3. Carrossel Listicle (html_only, 4:5, 5-7 slides)
4. Reels Cover (html_and_image, 9:16, 1 slide)
5. Post Frase Forte (html_only, 4:5, 1 slide)
6. Post Dado/Estatística (html_only, 4:5, 1 slide)
7. Post CTA Direto (html_and_image, 4:5, 1 slide)
8. Story Interativo (html_only, 9:16, 1 slide)
