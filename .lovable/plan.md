

# Fix: Brand Name Leaking into Image Generation Prompts

## Diagnóstico

O `context` passado para `fillTemplate` no branch de imagem contém campos como `brand_colors`, `typography`, `visual_style` e `brief_files_context` — todos podem conter o nome da marca. Quando o `image_prompt_template` usa placeholders como `{{visual_style}}` ou `{{brief_files_context}}`, o nome da marca vaza para o prompt de imagem, e a IA de imagem renderiza logos/texto da marca na cena.

Além disso, o `generateImagePrompt` não tem instrução explícita para remover nomes de marca, logos ou texto do prompt.

## Solução

### 1. Criar contexto separado para imagem (sem brand identity textual)

No `generate-asset-from-template/index.ts`, criar um `imageContext` que exclui `brand_colors`, `typography`, `visual_style` e `brief_files_context`:

```typescript
const imageContext = {
  hook: copy.hook || "",
  body: copy.body || "",
  cta: copy.cta || "",
  full_copy: context.full_copy,
  objectives: brief?.objectives || "",
  target_audience: brief?.target_audience || "",
  tone_of_voice: brief?.tone_of_voice || "",
  // NO brand_colors, typography, visual_style, brief_files_context
  ...config,
};
```

Usar `imageContext` em vez de `context` nos `fillTemplate` de imagem (linhas 268 e 278).

### 2. Adicionar guarda no `generateImagePrompt`

Acrescentar no system prompt do otimizador de imagem:

```
REGRAS OBRIGATÓRIAS:
- NUNCA inclua nomes de marca, logos, texto ou tipografia na imagem
- A imagem é APENAS cenário/composição visual — texto vai no overlay HTML
- Remova qualquer referência a nome de empresa/produto do prompt
- Foco: composição, iluminação, cores, cenário, pessoas, objetos
```

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/generate-asset-from-template/index.ts` | Criar `imageContext` sem brand fields + atualizar guarda no `generateImagePrompt` |

## Impacto

- Imagens geradas não terão mais a marca renderizada na cena
- Brand identity continua sendo aplicada corretamente no HTML overlay
- Zero mudança na UI

