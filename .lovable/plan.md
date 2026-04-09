

# Correção de Inconsistências no Fluxo de Criação

Implementação de 6 correções priorizadas por impacto. **Aprovação de copies permanece manual, copy por copy.**

---

## 1. Cores do brief nunca chegam aos templates (Problemas 1, 2, 7)

**`src/pages/NewAsset.tsx`** — Refatorar `colorMap` (linhas 120-126) para ler `from_brief` dos `editable_fields` dinamicamente em vez de mapear por nome hardcoded:
```
Object.entries(fields).forEach(([key, field]) => {
  if (field.type === "color" && field.from_brief) {
    // "background" → briefColors.primary
    // "accent" → briefColors.accent
    // "text" → briefColors.text (novo)
  }
});
```

**`src/pages/BatchAssets.tsx`** — Buscar brief da ativação e preencher `render_config` com cores mapeadas via `from_brief` antes de enviar para geração. Atualmente envia `render_config: {}`.

## 2. Copies não recebem consolidated_context (Problema 6)

**`supabase/functions/generate-copies/index.ts`** — Buscar `consolidated_context` do brief e injetar no prompt como bloco estruturado (brand_name, brand_values, key_messages, etc.), similar ao que `generate-asset-from-template` já faz.

## 3. Eliminar duplicação no generate-asset (Problemas 9, 10)

**`supabase/functions/generate-asset-from-template/index.ts`** — Extrair 2 funções helper:
- `buildBrandInstructions(context)` → retorna brandColor + typography + visualStyle instructions
- `buildSocialInstruction(activationSocial)` → retorna social profile instruction

Reutilizar nos branches `html_only` e `html_and_image` em vez de duplicar com versões mais curtas.

## 4. Regras food & beverage hardcoded (Problema 5)

**`supabase/functions/regenerate-copy-block/index.ts`** — Remover regras específicas de food/beverage (linhas 39-47). Em vez disso, receber `tone_of_voice` e `extra_context` do brief no request body e injetar no prompt dinamicamente.

## 5. Modelo divergente copies vs peças (Problema 4)

**`supabase/functions/generate-copies/index.ts`** — Migrar de Anthropic API direta para Lovable AI Gateway como default (consistente com geração de peças). Usar `google/gemini-2.5-pro` para qualidade. Manter fallback Claude via `ANTHROPIC_API_KEY` se `use_claude: true` for enviado.

**`supabase/functions/regenerate-copy-block/index.ts`** — Mesma migração para Lovable AI Gateway.

## 6. Brief colors parse frágil no generate-asset (Problema 3)

**`supabase/functions/generate-asset-from-template/index.ts`** — Quando `render_config` já contém cores hex via `from_brief`, usar diretamente no prompt em vez de pedir à IA para "EXTRAIR os códigos hex" de uma string. Só fazer parse textual quando render_config não trouxer cores.

---

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/NewAsset.tsx` | colorMap dinâmico via `from_brief` |
| `src/pages/BatchAssets.tsx` | buscar brief, preencher render_config com cores |
| `supabase/functions/generate-copies/index.ts` | consolidated_context + migrar para Lovable AI |
| `supabase/functions/regenerate-copy-block/index.ts` | remover food hardcode + migrar para Lovable AI |
| `supabase/functions/generate-asset-from-template/index.ts` | helpers reutilizáveis + usar cores do render_config |

