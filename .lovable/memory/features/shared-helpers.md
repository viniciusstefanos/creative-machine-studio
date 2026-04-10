---
name: Shared Edge Function Helpers
description: Extracted _shared/ modules for cors, call-ai, extract-html, generate-image, build-brief-context with resolveBrandIdentity
type: feature
---

## Files
- `_shared/cors.ts` — corsHeaders constant
- `_shared/extract-html.ts` — extractHtml() strips markdown fences
- `_shared/call-ai.ts` — callClaude, callLovableAI, callTextAI (unified)
- `_shared/generate-image.ts` — extractBase64FromResponse, generateImage (upload to storage)
- `_shared/build-brief-context.ts` — fillTemplate, buildFilesContext, buildBrandInstructions, buildSocialInstruction, resolveBrandIdentity
- `_shared/get-prompt.ts` — getPrompt (reads from prompt_templates table)
- `_shared/brief-system-prompt.ts` — BRIEF_SYSTEM_PROMPT, DEEP_EXTRACTION_SCHEMA

## Usage
All edge functions import from _shared/ instead of duplicating logic.
