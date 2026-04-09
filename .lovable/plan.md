

# Fix: Funções indefinidas no generate-asset-from-template

## 4 Bugs encontrados

### 1. `getImagePrompt` is not defined (linhas 611, 623)
A função se chama `generateImagePrompt` (definida na linha 331), mas é chamada como `getImagePrompt`. Além disso, a assinatura é diferente — `generateImagePrompt` recebe `(basePrompt, useClaude, anthropicKey, lovableKey)`, mas é chamada com `(template, context)`.

**Fix**: Substituir `getImagePrompt(template.image_prompt_template, context)` por lógica que:
1. Faz `fillTemplate` no `image_prompt_template` com o context
2. Chama `generateImagePrompt(filledPrompt, useClaude, anthropicKey, lovableKey)`

### 2. `splitCopyIntoSlides` is not defined (linha 607)
Função nunca definida. Usada apenas no branch `image_only`.

**Fix**: Definir a função que divide o copy em N partes para slides individuais de imagem.

### 3. `saveRender` is not defined (linhas 598, 602, 616, 639)
Função nunca definida. Deveria inserir na tabela `asset_template_renders`.

**Fix**: Definir dentro do handler como closure (precisa de `supabase` e `asset_id`):
```typescript
async function saveRender(slideIndex: number, data: Record<string, any>) {
  await supabase.from("asset_template_renders").upsert({
    asset_id,
    slide_index: slideIndex,
    ...data,
  }, { onConflict: "asset_id,slide_index" });
}
```

### 4. `.catch is not a function` (linha 655)
O supabase-js v2 retorna `PromiseLike`, não `Promise` completo — não tem `.catch()`.

**Fix**: Envolver em try/catch:
```typescript
try {
  await supabase.from("assets").update({ status: "rejected", feedback: feedbackMsg }).eq("id", asset_id);
} catch (err) { console.error("Cleanup failed:", err); }
```

## Arquivo modificado
- **`supabase/functions/generate-asset-from-template/index.ts`** — adicionar 3 funções faltantes + fix .catch

