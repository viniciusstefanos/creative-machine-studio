

# Melhorar Regeneração de Imagem — Contexto Rico + Robustez

## Problemas

1. **Sem contexto**: O prompt enviado à IA é apenas `"Generate an image: {user_prompt}"` — sem contexto do briefing, da marca, da copy, ou descrição da imagem atual
2. **Falhas silenciosas**: Se a API retorna formato inesperado, o usuário vê "Falha ao gerar imagem" sem saber o motivo
3. **Sem referência visual**: A imagem anterior não é enviada como referência para edição — toda geração parte do zero

## Solução

### 1. Edge Function `edit-asset-render` — action `regenerate_image` enriquecida

Ao receber `regenerate_image`, buscar contexto adicional do DB antes de chamar a IA:

- **Imagem atual**: buscar `image_url` do render ou asset e enviar como referência visual (image editing em vez de geração do zero)
- **Briefing**: buscar `briefs.consolidated_context` da ativação para extrair marca, estilo visual, cores, público
- **Copy**: buscar `copies.hook`, `copies.body` do asset para dar contexto temático
- **Template**: buscar `asset_templates.image_prompt_template` se existir

Montar prompt enriquecido:
```
## Contexto da marca
{consolidated_context resumido: nome, estilo visual, cores, público}

## Peça atual
Copy: {hook} — {body}
Template: {template_name}

## Instrução do usuário
{image_prompt}

Gere uma imagem fotográfica de alta qualidade seguindo a instrução acima, mantendo coerência com a marca e o contexto da peça.
```

Quando houver `image_url` atual, usar **image editing** (enviar imagem existente como referência) em vez de geração pura. Isso resolve o problema de "falta contexto da imagem anterior".

### 2. Fallback robusto na extração de base64

Adicionar retry (1x) em caso de falha da API, e melhorar mensagem de erro com detalhes (ex: "Modelo não retornou imagem, tente novamente").

### 3. UI — Pré-preencher prompt e mostrar imagem atual

No `AssetDetail.tsx`, ao abrir modo imagem:
- Mostrar thumbnail da imagem atual ao lado do campo de prompt
- Pré-popular o prompt com sugestão baseada no `image_prompt_template` do template ou na copy
- Adicionar toggle "Editar imagem atual" vs "Gerar do zero" — editar usa a imagem como referência, gerar ignora

### 4. Novo body para a edge function

```typescript
{
  render_id, asset_id, action: "regenerate_image",
  image_prompt,
  edit_current: true/false  // se true, envia imagem atual como referência
}
```

## Arquivos modificados

- **`supabase/functions/edit-asset-render/index.ts`** — buscar briefing/copy/template, montar prompt rico, suportar image editing com imagem atual como referência, retry
- **`src/pages/AssetDetail.tsx`** — thumbnail da imagem atual no painel, toggle editar/gerar, pré-popular prompt

