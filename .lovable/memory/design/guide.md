---
name: Visual Design Guide
description: Complete design guide with typography, colors, spacing, component patterns, and anti-patterns for Máquina Criativa
type: design
---

## Colors (HSL in CSS vars)
- Surfaces: --bg-base (215 33% 5%), --bg-surface1 (8%), --bg-surface2 (11%), --bg-surface3 (13%)
- Borders: --border-subtle (14%), --border-default (18%), --border-strong (23%)
- Accent: --accent (166 100% 39%), --accent-hover (35%), --accent-dim (28%)
- Text: --text-primary (94%), --text-secondary (60%), --text-muted (36%), --text-ghost (23%), --text-inverse (5%)
- Status: draft(gray), review(amber), approved(teal), rejected(rose), scheduled(indigo), published(green)

## Typography
- Syne: titles only (display-xl 40px, display-lg 28px, display-md 20px, heading 16px). Always negative letter-spacing.
- DM Sans: body, labels, buttons. Weight 300-600.
- JetBrains Mono: status, IDs, timestamps, section labels (9px uppercase tracking 3-4px)

## Spacing: 4px grid (4,8,12,16,20,24,32,40,48)

## Components
- Cards: bg-surface1, border-default, radius 8px, padding 16px 20px. Hover: border-strong + bg-surface2.
- Buttons: radius 6px, DM Sans 12px. Only ONE primary per viewport.
- Inputs: bg-base, border-strong, radius 6px, DM Sans 13px. Focus: border-accent + bg-surface1.
- Labels: JetBrains Mono 9px, uppercase, tracking 3px, text-secondary.
- StatusBadge: dot + 10% bg + 30% border, JetBrains Mono 10px, rounded-full.
- CopyBlock: status-based border color, action separator border-top, regenerate pushed right with ml-auto.
- Tabs: active = text-primary + border-bottom accent. Inactive = text-muted.

## Anti-patterns (NEVER)
- White/light backgrounds
- Inter/Roboto/Arial fonts
- border-radius > 8px
- Dramatic box-shadows
- Two primary buttons per viewport
- backdrop-filter: blur()
- Transitions > 0.15s
- Gradients as backgrounds
- Color values without CSS variables
