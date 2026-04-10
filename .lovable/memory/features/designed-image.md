---
name: Designed Image Generation Type
description: generation_type designed_image renders full design with text directly in image via Nano Banana 2, no HTML overlay
type: feature
---

## Overview
`designed_image` sends a complete design prompt (copy + brand + layout rules) to `google/gemini-3.1-flash-image-preview` which renders the final art with text integrated into the image. Zero HTML.

## Templates
- "Post Design Completo" (1080×1350, 4:5, static)
- "Story Design Completo" (1080×1920, 9:16, story)

## Flow
1. `generate-asset-from-template` builds rich prompt with DESIGNED_IMAGE_RULES + copy + brand colors + visual style
2. Calls `generateImage()` — saves result as `image_url` in render (no `html_content`)
3. Frontend treats it like image_only: shows image preview, offers "Refinar imagem" button
4. Edit via `edit-asset-render` `regenerate_image` action (same as image_only)

## Frontend Behavior
- `hasHtml` = false → no "Editar design" or "Refinar com IA" buttons
- `showImageRegen` = true (generation_type includes "image") → "Refinar imagem" shown
- Preview renders via `<img>` tag
