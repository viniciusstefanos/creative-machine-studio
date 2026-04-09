

# Organização por Lotes, Filtros e Variações — Copies & Peças

## Problema

Com volume crescente, copies e peças viram uma lista longa sem agrupamento. Escolher copies para gerar peças fica difícil. Não há conceito de "lote" nem de "variação" (A/B).

## Solução em 3 eixos

### 1. Sistema de Lotes (Batches)

Cada geração de copies ou peças cria automaticamente um **lote numerado** (ex: `Lote #1 — 12 copies`, `Lote #2 — 6 copies`). Isso permite:
- Agrupar visualmente por lote na listagem
- Filtrar por lote
- Identificar rapidamente "de qual rodada veio"

**Implementação:**
- Migration: adicionar coluna `batch_label` (text) em `copies` e `assets`
- Na Edge Function `generate-copies`: ao inserir, calcular o próximo número de lote para aquela ativação (`SELECT COUNT(DISTINCT batch_label)...`) e setar `batch_label = "Lote #N"`
- Na geração em lote de peças (`BatchAssets.tsx`): mesma lógica, atribuir batch_label ao criar assets
- Na UI: agrupar copies/assets por `batch_label` com headers colapsáveis

### 2. Filtros inteligentes

Adicionar barra de filtros acima da listagem de copies e peças:

**Copies:**
- Filtro existente: Finalidade (Orgânico/Ads) ✓ já existe
- **Novo**: Status (Draft/Review/Approved/Rejected)
- **Novo**: Funil (Topo/Meio/Fundo)
- **Novo**: Lote
- **Novo**: Busca por texto no hook

**Peças:**
- **Novo**: Status (Generating/Review/Approved)
- **Novo**: Categoria do template (Estático/Carrossel/Story)
- **Novo**: Lote
- **Novo**: Com/sem copy associada

Filtros aparecem como chips horizontais, padrão do design system.

### 3. Variações (A/B)

Conceito: uma copy ou peça pode ter **variações** — versões alternativas do mesmo conteúdo, vinculadas ao original.

**Copies:**
- Botão "Criar variação" na página de detalhe da copy
- Duplica a copy com `version` incrementado e um campo `parent_id` apontando pro original
- Na listagem, variações aparecem indentadas abaixo do original (ou com badge "Var B", "Var C")

**Peças:**
- Botão "Gerar variação" na página de detalhe do asset
- Cria novo asset com mesmo `copy_id` + `template_id` mas nova geração (imagem/layout diferente)
- `parent_id` aponta pro original

**Implementação:**
- Migration: adicionar `parent_id` (uuid, nullable, self-reference) em `copies` e `assets`
- Na listagem, agrupar variações sob o item pai
- Badge visual: "A" (original), "B", "C" para variações

## Detalhes técnicos

### Migration SQL
```sql
ALTER TABLE copies ADD COLUMN batch_label text;
ALTER TABLE copies ADD COLUMN parent_id uuid;
ALTER TABLE assets ADD COLUMN batch_label text;
ALTER TABLE assets ADD COLUMN parent_id uuid;
```

### Arquivos modificados
- **Migration SQL** — 4 colunas novas (batch_label + parent_id em copies e assets)
- **`supabase/functions/generate-copies/index.ts`** — calcular e atribuir batch_label
- **`src/components/activation/CopiesTab.tsx`** — filtros (status, funil, lote, busca), agrupamento por lote, exibição de variações
- **`src/components/activation/AssetsTab.tsx`** — filtros (status, categoria, lote), agrupamento por lote, exibição de variações
- **`src/pages/CopyDetail.tsx`** — botão "Criar variação"
- **`src/pages/AssetDetail.tsx`** — botão "Gerar variação"
- **`src/pages/BatchAssets.tsx`** — atribuir batch_label na geração em lote

