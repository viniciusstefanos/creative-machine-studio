

# Batch A — Assets: Geração, Detalhe e Aprovação

## O que será construído

4 entregas: página de criação de asset, edge function de geração com IA, página de detalhe/aprovação, e atualização da tab de assets existente.

---

## 1. Página `NewAsset.tsx`

Rota: `/activations/:id/assets/new`

Fluxo em 3 steps dentro da mesma página:
- **Step 1**: Lista copies da ativação com `status = 'approved'`. Usuário seleciona um. Cards clicáveis com hook truncado + StatusBadge.
- **Step 2**: Lista `asset_formats` ativos. Cards com nome, categoria (badge) e `prompt_hint` como dica. Seleção obrigatória.
- **Step 3**: Botão "Gerar peça com IA" que:
  1. Insere registro em `assets` com `status: 'generating'`, `copy_id`, `format_id`, `activation_id`
  2. Chama `supabase.functions.invoke("generate-asset", { body: { asset_id, activation_id, copy_id, format_id } })`
  3. Redireciona para `/activations/:id/assets/:assetId`

Design: stepper visual com 3 círculos numerados, dark theme, fontes do design system.

## 2. Edge Function `generate-asset`

Arquivo: `supabase/functions/generate-asset/index.ts`

Fluxo:
1. Recebe `{ asset_id, activation_id, copy_id, format_id }`
2. Cria client Supabase com service role
3. Busca brief (tom, público, objetivos), copy (hook/body/cta), e format (nome, prompt_hint)
4. Chama Lovable AI (`google/gemini-3-flash-preview`) com prompt para gerar HTML responsivo da peça criativa baseado no copy + format + brief context
5. Chama Lovable AI (`google/gemini-3.1-flash-image-preview`) para gerar imagem contextual baseada no brief
6. Faz upload da imagem gerada para Storage bucket `assets` (criar bucket via migration)
7. Atualiza o asset: `html_content`, `image_url` (URL pública do storage), `status: 'review'`
8. Trata erros 429/402 e retorna mensagem adequada

## 3. Página `AssetDetail.tsx`

Rota: `/activations/:id/assets/:assetId`

Layout em 2 colunas:
- **Coluna principal (2/3)**:
  - Se `status === 'generating'`: skeleton animado com "Gerando peça..." + polling a cada 3s
  - Se `html_content`: renderizar em iframe sandboxed
  - Se `image_url`: mostrar imagem
- **Sidebar (1/3)**:
  - StatusBadge, metadados (formato, categoria, copy vinculado, versão, data)
  - Botões contextuais por status:
    - `review`: "Aprovar" → `approved` | "Rejeitar" → textarea feedback → `rejected`
    - `approved`: "Agendar" → navega para schedule tab
    - `rejected`: "Gerar nova versão" → insere novo asset com `version+1` e feedback, chama generate-asset novamente
  - CommentThread com `entityType="asset"`

## 4. Atualizar `AssetsTab.tsx`

- Adicionar botão "Nova peça" linkando para `/activations/:id/assets/new`
- Cards clicáveis com `Link` para `/activations/:id/assets/:assetId`
- Mostrar nome do formato (join com `asset_formats`)

## 5. Registrar rotas no `App.tsx`

```
/activations/:id/assets/new → NewAsset
/activations/:id/assets/:assetId → AssetDetail
```

## 6. Migration SQL

- Criar bucket `assets` no Storage (público para leitura de imagens geradas)

---

## Detalhes técnicos

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx.sql` | Criar storage bucket `assets` |
| `supabase/functions/generate-asset/index.ts` | Nova edge function |
| `src/pages/NewAsset.tsx` | Nova página |
| `src/pages/AssetDetail.tsx` | Nova página |
| `src/components/activation/AssetsTab.tsx` | Atualizar com botão + links |
| `src/App.tsx` | 2 novas rotas |

