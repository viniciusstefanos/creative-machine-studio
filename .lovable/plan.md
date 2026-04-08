

# Adicionar preview visual dos templates na criação de peça

## Problema

No Step 2 de `NewAsset.tsx`, cada card de template mostra apenas um ícone genérico (`categoryIcon`) — Layout, Image ou Layers. Na página `SettingsTemplates.tsx` já existe o componente `TemplatePreview` que renderiza um mini wireframe visual (carousel com 3 cards, aspect ratio correto, zonas de hook/body/CTA).

## Solução

Extrair `TemplatePreview` de `SettingsTemplates.tsx` para um componente reutilizável e usá-lo no lugar do ícone genérico em `NewAsset.tsx`.

## Mudanças

### 1. Extrair `TemplatePreview` para arquivo próprio

Criar `src/components/ui/TemplatePreview.tsx` com o componente `TemplatePreview` que hoje está inline em `SettingsTemplates.tsx` (linhas 10-100 aprox).

### 2. `NewAsset.tsx` — substituir ícone por preview

No Step 2 (linhas 312-317), trocar:
```
{categoryIcon(t.category)}
```
por:
```
<TemplatePreview template={t} />
```

Remover a função `categoryIcon` se não for usada em outro lugar.

### 3. `SettingsTemplates.tsx` — importar do novo arquivo

Substituir o componente inline pelo import de `@/components/ui/TemplatePreview`.

### Arquivos modificados
- **`src/components/ui/TemplatePreview.tsx`** — novo, extraído de SettingsTemplates
- **`src/pages/NewAsset.tsx`** — usar TemplatePreview no step 2
- **`src/pages/SettingsTemplates.tsx`** — importar do novo arquivo

