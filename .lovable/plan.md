

# Escala, Volume e Análise de Dados — Plano de Evolução

## O que falta hoje

O app atual é 1:1 — um copy gera uma peça, uma peça é aprovada individualmente. Não existe:
- Criação em massa / matriz generativa
- Dashboard analítico real (métricas são placeholder "—")
- Visão de volume/escala por cliente ou período
- Comparação de performance entre criativos

---

## Funcionalidades Propostas

### 1. Matriz Generativa (Batch Creation)

Nova página `/activations/:id/assets/batch` com interface de matriz:
- **Eixo X**: copies aprovados (selecionar múltiplos)
- **Eixo Y**: templates (selecionar múltiplos)
- Cada célula da matriz = uma peça a ser gerada
- Checkbox para selecionar/deselecionar combinações
- Botão "Gerar N peças" que dispara todas em paralelo
- Progress bar mostrando quantas foram geradas vs total

Exemplo: 3 copies × 4 templates = 12 peças geradas de uma vez.

Nova edge function `batch-generate-assets` que recebe array de `{copy_id, template_id, render_config}` e processa em sequência (para não estourar rate limits da API).

### 2. Dashboard Analítico Real

Refatorar `Index.tsx` (Dashboard) e `AnalyticsTab.tsx`:

**Dashboard global** (`/`):
- Cards de resumo: total de peças geradas, aprovadas, rejeitadas, publicadas (queries reais ao DB)
- Gráfico de volume por semana (últimas 8 semanas) — barras empilhadas por status
- Taxa de aprovação (aprovadas / total geradas)
- Top 3 templates mais usados
- Top 3 copies com melhor engagement (quando métricas existirem)

**Analytics por ativação** (tab Métricas):
- Gráfico de linha temporal com métricas por dia
- Comparativo entre peças: engagement por peça (bar chart)
- CPR (custo por resultado) por peça
- Card de "melhor peça" (maior engagement)

Usar `recharts` para gráficos (já é dependência comum com shadcn).

### 3. Visão de Volume por Cliente

Em `ClientDetail.tsx`, adicionar seção de resumo:
- Total de ativações ativas
- Total de peças geradas / aprovadas / publicadas
- Volume por mês (sparkline simples)

### 4. Exportação de Relatório

Botão "Exportar relatório" no dashboard e na AnalyticsTab:
- Gera CSV com métricas consolidadas
- Colunas: ativação, peça, template, status, likes, comments, shares, saves, spend, CPR, data

---

## Detalhes Técnicos

### Novos arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/BatchAssets.tsx` | Página da matriz generativa |
| `supabase/functions/batch-generate-assets/index.ts` | Edge function para geração em lote |
| `src/components/dashboard/VolumeChart.tsx` | Gráfico de volume semanal |
| `src/components/dashboard/StatsCards.tsx` | Cards de resumo com dados reais |
| `src/components/dashboard/TemplateRanking.tsx` | Ranking de templates |
| `src/components/activation/PerformanceChart.tsx` | Gráfico de performance por peça |

### Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/pages/Index.tsx` | Refatorar com queries reais + gráficos |
| `src/components/activation/AnalyticsTab.tsx` | Adicionar gráficos + comparativo |
| `src/pages/ClientDetail.tsx` | Seção de volume/resumo |
| `src/components/activation/AssetsTab.tsx` | Botão "Gerar em lote" |
| `src/App.tsx` | Rota `/activations/:id/assets/batch` |
| `src/components/layout/Sidebar.tsx` | (inalterado) |
| `package.json` | Adicionar `recharts` |

### Migration SQL

Nenhuma nova tabela necessária — as queries de dashboard usam as tabelas existentes (`assets`, `copies`, `metrics`, `activations`) com agregações.

### Ordem de implementação

1. Instalar `recharts` + criar componentes de gráfico
2. Refatorar Dashboard com dados reais
3. Refatorar AnalyticsTab com gráficos
4. Implementar Matriz Generativa (página + edge function)
5. Adicionar resumo de volume no ClientDetail
6. Exportação CSV

