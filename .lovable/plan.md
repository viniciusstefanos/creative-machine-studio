

# Refatoração em 3 Ondas — Templates & Peças

## Resumo

Extrair código duplicado das edge functions para helpers compartilhados, unificar a lógica de cores do briefing, e componentizar `NewAsset.tsx` (637 linhas → ~5 componentes menores).

---

## Onda 1 — Helpers compartilhados (`_shared/`)

Lógica duplicada entre `generate-asset-from-template`, `generate-copies`, `edit-asset-render` e `generate-template`.

| Helper a criar | O que move | De onde vem |
|---|---|---|
| `_shared/call-ai.ts` | `callClaude`, `callLovableAI`, `callTextAI` | generate-asset (162-220), generate-copies (106-157) |
| `_shared/generate-image.ts` | `generateImage`, `generateImagePrompt`, `extractBase64FromResponse` | generate-asset (237-315), edit-asset-render (94-128) |
| `_shared/extract-html.ts` | `extractHtml` | generate-asset (8-20), edit-asset-render (7-18) — idênticas |
| `_shared/cors.ts` | `corsHeaders` | Todos os 5 functions — mesmo objeto |
| `_shared/build-brief-context.ts` | `buildBrandInstructions`, `buildSocialInstruction`, `fillTemplate`, contexto de brief files | generate-asset (469-521, 317-319, 398-466) |

**Resultado**: `generate-asset-from-template` cai de 627 → ~250 linhas, `generate-copies` de 348 → ~250. Cada function importa helpers em vez de redefinir.

---

## Onda 2 — Unificar extração de cores

Hoje a mesma lógica de "pegar hex do briefing" existe em **3 lugares**:
1. `NewAsset.tsx` (26-54) — `extractBriefColors()` no frontend
2. `generate-asset-from-template` (418-451, 469-512) — `buildBrandInstructions()` no backend
3. `edit-asset-render` (34-73) — `buildImageContext()` no backend

**Ação**:
- Criar `_shared/resolve-brand-identity.ts` com função `resolveBrandIdentity(brief, briefFiles, consolidated)` que retorna `{ colors: string[], fonts: string[], visualStyle: string }`.
- Usada por `generate-asset`, `edit-asset-render`, e `generate-template`.
- No frontend, criar hook `src/hooks/useBriefColors.ts` que faz a mesma extração (ou simplesmente chama o campo `consolidated_context` que já tem as cores resolvidas) — eliminar a função `extractBriefColors` inline do `NewAsset.tsx`.

---

## Onda 3 — Componentizar `NewAsset.tsx`

637 linhas com 5 steps misturados em um único componente.

| Componente | Responsabilidade | Linhas atuais |
|---|---|---|
| `NewAssetWizard.tsx` | Orchestrador: stepper, navegação, estado global | ~80 linhas |
| `steps/SelectCopy.tsx` | Step 1: lista de copies aprovados | 319-348 |
| `steps/SelectTemplate.tsx` | Step 2: grid de templates com filtros | 352-412 |
| `steps/ConfigureTemplate.tsx` | Step 3: editable_fields (cores, selects, sliders) | 416-504 |
| `steps/ReviewImagePrompt.tsx` | Step 4: editor de prompt de imagem | 508-566 |
| `steps/ConfirmGenerate.tsx` | Step 5: resumo + botão gerar | 570-631 |

**Shared state via props**: `selectedCopy`, `selectedTemplate`, `renderConfig`, `imagePrompt`, `onNext/onBack`.

Hook `useBriefColors` (da Onda 2) alimenta `ConfigureTemplate` automaticamente.

---

## Arquivos finais

| Arquivo | Ação |
|---|---|
| `supabase/functions/_shared/call-ai.ts` | Criar |
| `supabase/functions/_shared/generate-image.ts` | Criar |
| `supabase/functions/_shared/extract-html.ts` | Criar |
| `supabase/functions/_shared/cors.ts` | Criar |
| `supabase/functions/_shared/build-brief-context.ts` | Criar |
| `supabase/functions/_shared/resolve-brand-identity.ts` | Criar |
| `supabase/functions/generate-asset-from-template/index.ts` | Refatorar (627→~250 linhas) |
| `supabase/functions/generate-copies/index.ts` | Refatorar (348→~250 linhas) |
| `supabase/functions/edit-asset-render/index.ts` | Refatorar (346→~200 linhas) |
| `supabase/functions/generate-template/index.ts` | Refatorar menor |
| `src/hooks/useBriefColors.ts` | Criar |
| `src/pages/NewAsset.tsx` | Manter como wrapper fino |
| `src/components/new-asset/SelectCopy.tsx` | Criar |
| `src/components/new-asset/SelectTemplate.tsx` | Criar |
| `src/components/new-asset/ConfigureTemplate.tsx` | Criar |
| `src/components/new-asset/ReviewImagePrompt.tsx` | Criar |
| `src/components/new-asset/ConfirmGenerate.tsx` | Criar |

## Ordem de execução

1. **Onda 1 primeiro** — zero impacto visual, só mover código. Teste: gerar peça e copy normalmente.
2. **Onda 2** — unificar cores. Teste: cores do briefing aparecem nos campos configuráveis.
3. **Onda 3** — componentizar frontend. Teste: fluxo completo de criação de peça funciona igual.

Cada onda é independente e pode ser aprovada/testada antes de prosseguir.

