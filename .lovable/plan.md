

# Refatorar UX e Hierarquia Visual — Templates e Peças

## Problemas Identificados

1. **Inline styles em vez de classes do design system**: `NewAsset`, `AssetDetail` e `SettingsTemplates` usam `style={{ fontFamily: "'JetBrains Mono'", color: "var(--text-muted)" }}` em vez das classes CSS já definidas (`field-label`, `text-mono-label`, `card-base`, `text-display-lg`, etc.)
2. **Emojis como thumbnails**: SettingsTemplates usa 🎠/🖼️/📐 — visual amador
3. **Hierarquia visual fraca**: tudo parece igual peso — falta distinção clara entre título, section labels, metadados e conteúdo
4. **Cards sem padrão**: não usam `card-base` / `card-interactive`
5. **Labels de campo sem `field-label`**: usam inline mono styles
6. **Stepper genérico**: sem hierarquia clara de progresso

## Alterações

### 1. `NewAsset.tsx` — Refatorar para classes do design system

- Título: `text-display-lg` em vez de inline Syne
- Stepper: usar `text-mono-label` para labels, `card-base` para containers
- Step 1 (copies): cards com `card-base card-interactive`, metadata em `text-mono-label`
- Step 2 (templates): cards com thumbnail melhor (ícone SVG ou sigla estilizada em vez de emoji), `card-base card-interactive`
- Step 3 (config): labels com `field-label`, inputs com `field-input`
- Step 4 (confirm): metadados em `text-mono-label`, card em `card-base`
- Remover todos os `style={{...}}` redundantes — usar as classes CSS existentes

### 2. `SettingsTemplates.tsx` — Hierarquia visual

- Título: `text-display-lg`
- Cards: `card-base` com hover via `card-interactive`
- Substituir emojis por ícones Lucide (Layout, Image, Layers para carousel)
- Badges de tipo/dimensão: usar `text-mono` com background sutil
- Ações (toggle/delete): agrupar melhor, separar visualmente do conteúdo
- Section labels: usar `section-label--ruled` para separar categorias

### 3. `AssetDetail.tsx` — Sidebar metadata

- Labels: `text-mono-label` em vez de inline JetBrains Mono 10px
- Valores: `text-body` ou `text-mono` conforme tipo
- Cards: `card-base`
- Botões de ação: manter com Button component, remover inline styles

### Princípios aplicados

- Nunca `style={{fontFamily: "'JetBrains Mono'"}}` — usar `text-mono-label` ou `field-label`
- Nunca `style={{background: "var(--bg-surface1)"}}` — usar `card-base`
- Hierarquia: `text-display-lg` > `SectionLabel` (ruled) > `text-heading` > `text-body` > `text-mono-label`
- Espaçamento: `space-y-5` para form sections, `gap-3` para grids de cards

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/pages/NewAsset.tsx` | Refatorar para classes CSS do design system |
| `src/pages/AssetDetail.tsx` | Refatorar sidebar metadata |
| `src/pages/SettingsTemplates.tsx` | Refatorar cards e hierarquia |

