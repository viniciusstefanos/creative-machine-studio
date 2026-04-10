

# Novo tipo de geração: `designed_image` (imagem com texto integrado)

## Conceito

Hoje existem 3 tipos: `html_only`, `image_only`, `html_and_image`. O novo tipo `designed_image` envia um prompt completo para o modelo de imagem (Nano Banana 2) pedindo a **arte final com texto, layout e design** — tudo renderizado na própria imagem. Zero HTML.

Vantagem: o design fica mais orgânico, sem as limitações de CSS/HTML. O Nano Banana 2 já renderiza texto com boa qualidade.

## Fluxo

```text
copy + brief + brand colors + template config
        ↓
  prompt de design completo (composição + texto + cores + CTA)
        ↓
  Nano Banana 2 (gemini-3.1-flash-image-preview)
        ↓
  imagem PNG final (texto já integrado)
        ↓
  salva em asset_template_renders + assets
```

## Mudanças

### 1. Edge function `generate-asset-from-template/index.ts`

Adicionar branch `designed_image` após o `html_and_image`:

- Monta prompt detalhado com: dimensões exatas, copy (hook/body/CTA), cores da marca, estilo visual, instruções de layout (hierarquia, safe zones, tipografia)
- Inclui regras de design (contraste, alinhamento, CTA destacado) diretamente no prompt de imagem
- Chama `generateImage()` com modelo `google/gemini-3.1-flash-image-preview`
- Salva render com `image_url` (sem `html_content`)
- Suporta carrossel (múltiplos slides como imagens independentes)

### 2. Prompt de design para imagem

O prompt precisa ser mais detalhado que o `image_only` atual, incluindo:
- Dimensões exatas (ex: "1080x1350px, aspect ratio 4:5")
- Texto exato a renderizar (hook como headline grande, CTA como botão)
- Paleta de cores da marca
- Hierarquia visual (3 níveis)
- Safe zones e padding
- Estilo (dark, gradient, glassmorphism, etc.)

### 3. Frontend `AssetDetail.tsx`

- Na preview: se `generation_type === "designed_image"`, renderizar como imagem (igual `image_only`)
- Nos botões de edição: mostrar apenas "Refinar imagem" e "Editar textos" (sem "Editar design HTML")
- Regenerar imagem funciona igual ao `image_only`

### 4. Seed de template

Criar 1-2 templates base com `generation_type: "designed_image"` via migration SQL para teste:
- "Post Design Completo" (1080×1350, 4:5, single)
- "Story Design Completo" (1080×1920, 9:16, single)

### 5. `NewAsset.tsx` / `SelectTemplate.tsx`

Já funciona — templates aparecem na lista normalmente, o `generation_type` é transparente para o usuário.

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/generate-asset-from-template/index.ts` | Adicionar branch `designed_image` |
| `src/pages/AssetDetail.tsx` | Ajustar preview e botões de edição para `designed_image` |
| `supabase/functions/edit-asset-render/index.ts` | Suportar refinamento de `designed_image` (regenera imagem com novo prompt) |
| Migration SQL | Seed de 2 templates `designed_image` |

## Risco

O texto gerado por IA de imagem pode ter erros ortográficos ou de layout. Mitigação: o prompt será muito explícito sobre o texto exato, e o usuário pode regenerar facilmente.

