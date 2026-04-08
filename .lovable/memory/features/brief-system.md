---
name: Brief System & System Prompt
description: Global BRIEF_SYSTEM_PROMPT in _shared/brief-system-prompt.ts, deep extraction with 15 fields, BriefFileViewer component, consolidated_context and system_prompt fields in briefs table
type: feature
---

## System Prompt Global
- Located at `supabase/functions/_shared/brief-system-prompt.ts`
- Imported by: extract-brief, generate-copies, generate-asset-from-template, regenerate-copy-block
- Core rule: NÃO INVENTE informações. Atenha-se aos documentos.

## Deep Extraction Schema
- `DEEP_EXTRACTION_SCHEMA` exports ~15 structured fields
- Fields: brand_name, brand_positioning, brand_values, products_services, tone_of_voice (object with formality/personality/keywords), target_audience (object with demographics/psychographics/pain_points/desires/objections), competitors, visual_guidelines, proof_points, key_messages, restrictions, objectives, extra_context, references_urls, detected_category, document_summary
- Stored in `brief_files.extracted_fields` (jsonb)

## Brief Table Additions
- `briefs.system_prompt` — custom per-activation instructions
- `briefs.consolidated_context` — merged data from all files

## UI Components
- `BriefFileViewer` — collapsible per-file viewer with tabs (Campos extraídos | Texto completo), re-extract button
- `BriefTab` — consolidation button, system_prompt field, document explorer
- `BriefFilesSection` — upload-only (file list moved to BriefFileViewer)

## Downstream Usage
- generate-copies: sends extracted_fields + raw_text (15K limit per file), includes system_prompt
- generate-asset-from-template: same, injects BRIEF_SYSTEM_PROMPT + customPrompt into all generation branches
