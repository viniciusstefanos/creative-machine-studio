

# Fix: Cor Destaque não vem do briefing

## Problema

O campo "Cor Destaque" (`accent_color`) não mostra o badge "Do briefing" porque a lógica de extração de cores tem um bug:

```typescript
// extractBriefColors() — linha 35
accent: colors[2] || colors[0],  // só pega 3ª cor, senão repete a 1ª
text: colors[1] ? undefined : "#f5f5f0",  // BUG: retorna undefined quando TEM secondary
```

- Se o brief tem apenas 2 cores hex, `accent` vira igual a `primary` (1ª cor) — ou seja, nunca é a cor de destaque real
- `text` retorna `undefined` quando existe uma cor secundária — lógica invertida
- O campo accent mostra `#00C9A7` (default do template) porque `briefColors.accent` não traz valor útil

## Correção

**`src/pages/NewAsset.tsx`** — Refatorar `extractBriefColors()`:

```typescript
function extractBriefColors(brief: any) {
  const colors: string[] = [];
  const hexMatches = (brief?.brand_colors || "").match(/#[0-9A-Fa-f]{6}/g) || [];
  colors.push(...hexMatches);
  const consolidated = (brief?.consolidated_context as any)?.visual_guidelines?.colors_hex || [];
  colors.push(...consolidated.filter((c: string) => !colors.includes(c)));
  return {
    primary: colors[0],
    secondary: colors[1],
    accent: colors[1] || colors[0],   // 2ª cor como accent (mais provável que a 3ª)
    background: colors[0],
    text: colors[2] || "#f5f5f0",     // 3ª cor como text, ou fallback claro
  };
}
```

**`src/pages/BatchAssets.tsx`** — Mesma correção na função `extractBriefColors` duplicada (linhas 48-55).

### Arquivos modificados
- `src/pages/NewAsset.tsx` — fix extractBriefColors
- `src/pages/BatchAssets.tsx` — fix extractBriefColors (mesma função duplicada)

