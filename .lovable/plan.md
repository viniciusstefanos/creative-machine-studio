

# Sistema de Templates de Peças — Máquina Criativa

## Visão Geral

Implementar um sistema completo de templates para geração de peças visuais, substituindo o fluxo atual (que usa `asset_formats`) por templates configuráveis com 3 modos de geração (`html_only`, `image_only`, `html_and_image`), suporte a carrosséis multi-slide, campos editáveis dinâmicos e renderização HTML→PNG via html2canvas.

---

## Fase 1 — Banco de Dados

**Migration SQL:**

1. Criar tabela `asset_templates` com todos os campos (identidade, classificação, dimensões, prompts, editable_fields jsonb, is_base, active)
2. Criar tabela `asset_template_renders` (slide_index, html_content, image_url, png_url, status por slide)
3. Adicionar colunas `template_id` e `render_config` na tabela `assets`
4. RLS: authenticated pode ler templates e renders; admins podem gerenciar templates custom
5. Seed dos 5 templates base via INSERT (Carrossel Twitter, Carrossel Imagens, Feed Image+Text, Story Gradiente, Banner Imagem)

---

## Fase 2 — Edge Function `generate-asset-from-template`

Nova edge function que substitui a atual `generate-asset` para templates. Recebe `{ asset_id, template_id, copy_id, activation_id, render_config }`.

3 branches de geração:

- **`html_only`**: Chama Lovable AI (Gemini Flash) com system_prompt do template + copy. Para carrosséis, instrui retorno como JSON array `[{slide_index, html}]`. Salva cada slide em `asset_template_renders`.
- **`image_only`**: Para cada slide, preenche `image_prompt_template` com context e chama Gemini Flash Image. Upload para Storage.
- **`html_and_image`**: Passo 1 gera imagem de fundo, Passo 2 gera HTML overlay referenciando a imagem, salva ambos.

Status do asset atualiza para `review` quando todos os renders estiverem `ready`.

---

## Fase 3 — Frontend: Renderização HTML→PNG

- Instalar `html2canvas` no projeto
- Criar utilitário `renderHtmlToPng(html, width, height)` que renderiza offscreen e retorna data URL
- Criar `uploadPng(assetId, slideIndex, dataUrl)` que faz upload para Storage bucket `assets`
- A renderização PNG acontece no browser após receber os HTMLs gerados, fazendo upload dos PNGs finais

---

## Fase 4 — Atualizar Fluxo Nova Peça (`NewAsset.tsx`)

Stepper atualizado: **Copy → Template → Configurar → Gerar**

- **Step 2** (substituindo "Selecionar Formato"): Grid de template cards com thumbnail, nome, badges (BASE/CUSTOM, categoria, tipo de geração). Filtros por categoria e generation_type.
- **Step 3** (novo): Editor dinâmico de `editable_fields` — renderiza inputs de color, select, slider conforme o JSON do template selecionado. Mostra preview de dimensões e descrição.
- **Step 4**: Confirmação com resumo e botão gerar. Insere asset com `template_id` e `render_config`, invoca `generate-asset-from-template`.

---

## Fase 5 — Preview de Slides (`AssetDetail.tsx`)

- Buscar `asset_template_renders` do asset, ordenados por `slide_index`
- Viewer principal com aspect-ratio dinâmico baseado no template (1:1, 9:16, 4:5)
- Navegação entre slides: botões prev/next + strip de thumbnails
- Cada slide mostra PNG renderizado (ou imagem gerada)
- Ações de aprovar/rejeitar aplicam ao asset inteiro

---

## Fase 6 — Página Settings Templates (`/settings/templates`)

- Nova rota e página `SettingsTemplates.tsx`
- Lista templates agrupados por categoria, badge BASE (cinza) vs CUSTOM (teal)
- Templates base: somente visualização
- Templates custom: editar, ativar/desativar, deletar
- Formulário de novo template: campos condicionais por `generation_type`
- Adicionar "Templates" à sidebar de configurações (entre Time e Formatos)

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx.sql` | Criar tabelas + seed |
| `supabase/functions/generate-asset-from-template/index.ts` | Nova edge function |
| `src/pages/NewAsset.tsx` | Refatorar stepper com seleção de template + editor de campos |
| `src/pages/AssetDetail.tsx` | Adicionar preview multi-slide com navegação |
| `src/pages/SettingsTemplates.tsx` | Nova página de gerenciamento |
| `src/components/layout/Sidebar.tsx` | Adicionar link Templates |
| `src/App.tsx` | Nova rota `/settings/templates` |
| `src/lib/renderPng.ts` | Utilitário html2canvas + upload |
| `package.json` | Adicionar `html2canvas` |

