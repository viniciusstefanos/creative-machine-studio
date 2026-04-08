

# Melhorar UX da Matriz Generativa — Identificação de Templates

## Problema
Os headers das colunas mostram apenas o nome truncado em 100px + dimensões. Como vários templates começam com o mesmo prefixo (ex: "Banner —..."), fica impossível distingui-los.

## Solução

### 1. Headers mais informativos
- Aumentar `max-w` do nome para ~140px
- Mostrar a **categoria** com badge colorido (Estático, Carrossel, Story, Reels)
- Mostrar **funnel_stage** se existir (Topo, Meio, Fundo)
- Exibir thumbnail do template (usa `TemplatePreview` em miniatura ou `thumbnail_url`) no header
- Tooltip com nome completo ao hover

### 2. Agrupamento por categoria
Em vez de uma tabela flat com todos os templates lado a lado, agrupar as colunas por categoria com separadores visuais (section headers dentro do `<thead>`). Isso reduz a carga cognitiva.

### 3. Selecionar coluna/linha inteira
- Clicar no header do template seleciona/deseleciona toda a coluna
- Clicar no nome da copy seleciona/deseleciona toda a linha
- Feedback visual: highlight na coluna/linha ao hover

### 4. Filtro rápido de templates
Adicionar filtro por categoria (Estático, Carrossel, Story) acima da tabela para reduzir o número de colunas visíveis.

## Arquivos modificados
- **`src/pages/BatchAssets.tsx`** — headers com thumbnail/badge/tooltip, agrupamento por categoria, seleção de coluna/linha, filtro

