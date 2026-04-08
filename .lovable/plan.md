

# Cores dos Templates Devem Obedecer o Briefing por Padrão

## Problema

Hoje os `editable_fields` dos templates (ex: `brand_color`, `accent_color`, `bg_color`) usam valores default genéricos (ex: `#00C9A7`, `#111111`). Quando o usuário seleciona um template para gerar uma peça, esses defaults são carregados sem considerar as cores da identidade visual definidas no briefing.

O briefing já possui o campo `brand_colors` (texto descritivo com hex) e o `extracted_fields` dos arquivos pode conter `visual_guidelines.colors_hex`. Mas nada disso alimenta os defaults dos templates.

**Exceções**: Alguns templates exigem cores fixas (ex: carrossel estilo Twitter = fundo branco + texto preto). Nesses casos, o template deve prevalecer.

## Solução

### 1. Extrair cores hex do briefing (frontend — `NewAsset.tsx`)

Quando o brief é carregado, parsear `brand_colors` e/ou `consolidated_context.visual_guidelines` para extrair cores hex automáticas:

```typescript
function extractBriefColors(brief: any): { primary?: string; secondary?: string; accent?: string; bg?: string } {
  const colors: string[] = [];
  // Parse hex codes from brand_colors text
  const hexMatches = (brief?.brand_colors || "").match(/#[0-9A-Fa-f]{6}/g) || [];
  colors.push(...hexMatches);
  // Also check consolidated_context
  const consolidated = brief?.consolidated_context?.visual_guidelines?.colors_hex || [];
  colors.push(...consolidated.filter((c: string) => !colors.includes(c)));
  return {
    primary: colors[0],
    secondary: colors[1],
    accent: colors[2] || colors[0],
  };
}
```

### 2. Flag `lock_colors` nos templates

Adicionar campo `lock_colors: boolean` (default `false`) nos `editable_fields` ou como campo top-level no template. Quando `true`, os defaults do template prevalecem e não são sobrescritos pelo brief.

Na prática, implementar como uma propriedade `locked: true` em cada campo do `editable_fields`:

```json
{
  "bg_color": { "label": "Fundo", "type": "color", "default": "#FFFFFF", "locked": true },
  "text_color": { "label": "Texto", "type": "color", "default": "#000000", "locked": true }
}
```

Campos sem `locked: true` terão seus defaults substituídos pelas cores do brief.

### 3. Override dos defaults no `useEffect` de `selectedTemplate` (`NewAsset.tsx`)

No `useEffect` que popula `renderConfig` a partir dos `editable_fields`, após montar os defaults, sobrescrever campos de cor que não estejam `locked`:

```typescript
useEffect(() => {
  if (!selectedTemplate?.editable_fields) { setRenderConfig({}); return; }
  const fields = selectedTemplate.editable_fields;
  const defaults: Record<string, any> = {};
  const briefColors = extractBriefColors(brief);
  
  // Map de nomes comuns → cor do brief
  const colorMap: Record<string, string | undefined> = {
    brand_color: briefColors.primary,
    accent_color: briefColors.accent,
    cta_color: briefColors.accent || briefColors.primary,
    primary_color: briefColors.primary,
    secondary_color: briefColors.secondary,
  };

  Object.entries(fields).forEach(([key, field]) => {
    defaults[key] = field.default;
    // Override color fields with brief colors (unless locked)
    if (field.type === "color" && !field.locked && colorMap[key]) {
      defaults[key] = colorMap[key];
    }
  });
  setRenderConfig(defaults);
}, [selectedTemplate, brief]);
```

### 4. Injetar cores do brief no prompt da IA (edge function)

No `generate-asset-from-template`, o contexto já recebe `brand_colors` como texto. Adicionar instrução explícita no prompt:

```
## CORES DA MARCA (OBRIGATÓRIO)
Use EXCLUSIVAMENTE estas cores da identidade visual do cliente: ${context.brand_colors}
- Cor primária para elementos dominantes
- Cor de acento APENAS para CTA/botões
- NÃO use cores genéricas quando as cores da marca estiverem definidas
```

### 5. Indicador visual na UI

No step de configuração do template em `NewAsset.tsx`, mostrar um badge ao lado dos campos de cor que foram preenchidos automaticamente pelo brief: "🎨 Do briefing". O usuário pode editar livremente.

## Arquivos modificados

- **`src/pages/NewAsset.tsx`** — `extractBriefColors()`, override de defaults no `useEffect`, badge visual
- **`supabase/functions/generate-asset-from-template/index.ts`** — instrução de cores obrigatórias no prompt
- **Templates existentes** (migration SQL) — marcar `locked: true` nos `editable_fields` dos templates que exigem cores fixas (ex: Carrossel Twitter-style)

