

# Implementar P1 — UX e Usabilidade

## O que já foi feito (P0/P1 parcial)
- Busca global Cmd+K (item 4) — já implementado
- Skeleton loaders e React Query nas páginas Dashboard e ActivationHub
- Lazy loading de rotas

## O que falta no P1

### 1. Empty states acionáveis (item 5)

Vários empty states já existem mas alguns são apenas texto. Melhorar:

- **BriefTab** — não tem empty state quando brief está vazio; adicionar CTA "Preencher brief"
- **CopiesTab** — já tem CTA para brief, mas quando `briefDone === true` falta botão "Gerar com IA" no empty state
- **AssetsTab** — já tem CTAs bons (manter)
- **CampaignsTab** — empty state tem texto mas falta botão CTA "Criar campanha"
- **ScheduleTab** — empty state com `assetsApproved === 0` falta CTA para ir a peças

**Arquivos**: `CopiesTab.tsx`, `CampaignsTab.tsx`, `ScheduleTab.tsx`

### 2. Feedback de progresso em operações longas (item 6)

- **CopiesTab** — ao gerar IA, o botão mostra "Gerando..." mas sem progresso. Adicionar um toast com progresso ou um banner inline com spinner + texto descritivo ("Gerando X copies com IA, aguarde...")
- **BulkScheduleDialog** — já tem step wizard mas submissão mostra apenas "Agendando...". Adicionar progresso `(X de Y agendados)` com barra de progresso
- **AddAdsToCampaignDialog** — mesma lógica: progresso por peça subida
- **ScheduleTab publish** — ao publicar (especialmente carrossel com render de slides), mostrar progresso dos steps ("Renderizando slide 2/5...", "Publicando...")

**Arquivos**: `CopiesTab.tsx`, `BulkScheduleDialog.tsx`, `AddAdsToCampaignDialog.tsx`, `ScheduleTab.tsx`

### 3. Mobile responsivo (item 7)

- **AssetsTab lista** — tabela `<Table>` não responsiva. Em telas `< md`, trocar para cards (como já faz no grid view). Forçar `viewMode="grid"` em mobile ou esconder colunas não essenciais
- **ScheduleTab** — grid `md:grid-cols-[240px_1fr]` já collapsa. OK
- **CampaignsTab** — cards já responsivos. OK
- **Header breadcrumbs** — já tem `pl-10 md:pl-0` para mobile. OK
- **CopiesTab form** — grid `sm:grid-cols-4` já collapsa. OK

**Arquivo**: `AssetsTab.tsx`

---

## Resumo de mudanças

| Arquivo | Mudança |
|---------|---------|
| `CopiesTab.tsx` | Botão "Gerar com IA" no empty state; banner de progresso inline durante geração |
| `CampaignsTab.tsx` | Botão CTA no empty state |
| `ScheduleTab.tsx` | CTA no empty state para ir a peças; progresso step-by-step ao publicar (render slides + publish) |
| `BulkScheduleDialog.tsx` | Barra de progresso `X/Y` durante submissão |
| `AddAdsToCampaignDialog.tsx` | Barra de progresso `X/Y` durante upload de anúncios |
| `AssetsTab.tsx` | Forçar grid view em mobile (esconder tabela em `< md`) |

Nenhuma migration necessária.

