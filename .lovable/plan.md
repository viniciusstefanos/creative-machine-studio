

# Prevenção de Erros de Design — Validação Pós-Geração

## O Problema

Hoje o fluxo é: **prompt → IA gera HTML → salva direto no banco**. Não existe nenhuma etapa de validação entre a geração e o salvamento. Se a IA ignora uma regra (texto sem contraste, botão desalinhado, fonte não carregada), o erro vai direto pro usuário.

Prompts melhores ajudam, mas IAs são probabilísticas — sempre haverá falhas. A solução robusta é adicionar uma **camada de validação automática** no HTML gerado.

## Solução: HTML Validator + Auto-fix

### 1. Criar `_shared/validate-html.ts`

Uma função que recebe o HTML gerado e verifica regras básicas de design antes de salvar:

| Verificação | O que faz | Auto-fix |
|---|---|---|
| **Gradient overlay** | Se `background-image` existe, exige `linear-gradient` overlay | Injeta div overlay automaticamente |
| **Text-shadow** | Todo texto sobre imagem precisa `text-shadow` | Adiciona `text-shadow: 0 2px 8px rgba(0,0,0,0.8)` |
| **CTA centralizado** | Botão com `display:flex;align-items:center;justify-content:center` | Injeta estilos de centralização |
| **Dimensões fixas** | Container raiz tem `width` e `height` em px (não %, vw, vh) | Substitui por valores do template |
| **Google Fonts** | Verifica se há `<link>` do Google Fonts (não system fonts) | Warning apenas |
| **Contraste mínimo** | Cores de texto vs fundo com ratio ≥ 3:1 | Warning apenas |
| **Overflow** | Texto não excede container (heurística: font-size vs height) | Warning apenas |

### 2. Integrar no fluxo de geração

Em `generate-asset-from-template/index.ts`, após cada `extractHtml()`:

```
const rawHtml = extractHtml(rawContent);
const { html, warnings } = validateAndFixHtml(rawHtml, {
  width: template.width_px,
  height: template.height_px,
  generationType: template.generation_type,
});
```

Warnings ficam logados no console para debugging. Fixes automáticos são aplicados silenciosamente.

### 3. Mesma validação no `edit-asset-render`

Para que refinamentos também passem pela validação.

### 4. Salvar warnings no banco (opcional mas útil)

Adicionar coluna `generation_warnings text[]` na tabela `asset_template_renders` para rastrear quais peças precisaram de auto-fix — isso ajuda a melhorar os prompts ao longo do tempo.

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/_shared/validate-html.ts` | Criar — validador + auto-fix |
| `supabase/functions/generate-asset-from-template/index.ts` | Integrar validação após cada `extractHtml()` |
| `supabase/functions/edit-asset-render/index.ts` | Integrar validação |
| Migration SQL | Adicionar coluna `generation_warnings` em `asset_template_renders` |

## Impacto

- Peças com erros básicos são corrigidas automaticamente antes de chegar ao usuário
- Warnings registrados permitem identificar padrões de falha e melhorar prompts
- Zero mudança na UI — puramente backend

