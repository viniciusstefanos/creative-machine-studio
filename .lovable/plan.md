

# Corrigir vazamento de texto explicativo no preview de assets

## Problema

A IA retorna o HTML do criativo junto com texto explicativo em markdown (ex: "### Por que este layout funciona para o Instagram 2026?..."). O código atual só remove code fences (` ```html ``` `) mas não remove o texto antes/depois do HTML. Esse texto acaba salvo no `html_content` e renderizado no iframe de preview.

## Solução

Duas camadas de proteção:

### 1. Edge function — limpeza robusta do output da IA

Em `supabase/functions/generate-asset-from-template/index.ts`, criar uma função `extractHtml()` que:

- Remove code fences (já faz)
- Extrai apenas o conteúdo HTML: busca o primeiro `<link` ou `<div` ou `<html` e o último `</div>` ou `</html>` e retorna só esse trecho
- Remove qualquer texto markdown antes/depois do HTML
- Aplicar em todos os pontos onde `rawContent` / `rawHtml` é processado (linhas 470-481, 509-510)

Também aplicar em `supabase/functions/generate-asset/index.ts` (linhas 133-136) e `supabase/functions/edit-asset-render/index.ts` (onde refine_html retorna conteúdo).

### 2. Prompt — instrução mais forte

Adicionar ao final do prompt do sistema: `"Retorne SOMENTE o código HTML. ZERO texto explicativo, ZERO markdown, ZERO comentários fora do HTML."`

## Arquivos modificados

- **`supabase/functions/generate-asset-from-template/index.ts`** — função `extractHtml()` + aplicar nos 3 pontos de parsing + reforço no prompt
- **`supabase/functions/generate-asset/index.ts`** — mesma função `extractHtml()` na linha 133
- **`supabase/functions/edit-asset-render/index.ts`** — mesma limpeza no retorno de `refine_html`

