

# Sistemática de Agendamento de Posts no Instagram

## Situacao Atual

A tab "Agendamento" (`ScheduleTab.tsx`) existe mas e rudimentar: lista posts ja inseridos no banco e permite publicar manualmente. Nao ha como **criar** agendamentos, selecionar pecas aprovadas, definir data/hora, editar caption, ou ter visao de calendario.

A edge function `meta-publish` ja suporta `publish_post` e `publish_carousel`. A tabela `scheduled_posts` existe com campos `scheduled_at`, `channel`, `status`, `asset_id`, `activation_id`.

## O que sera construido

### 1. Dialog de Agendamento (novo componente)

`src/components/activation/SchedulePostDialog.tsx`

- Modal acionado por botao "Agendar post" na ScheduleTab
- Selecao de peca: dropdown filtrando assets aprovados da ativacao (com thumbnail preview)
- Caption: textarea pre-populada com copy associada (hook + body + cta), editavel
- Data e hora: inputs nativos de date e time (com sugestao de melhores horarios Brasil 2026)
- Canal: select com opcoes "Instagram Feed", "Instagram Reels", "Instagram Stories"
- Botao "Agendar" que insere na tabela `scheduled_posts`

### 2. Refatorar ScheduleTab

- Adicionar botao "Agendar post" no topo (visivel quando ha pecas aprovadas)
- Exibir posts em cards mais ricos: thumbnail da peca, caption truncada, data/hora, canal, status
- Acoes por post: Publicar agora, Editar agendamento, Cancelar
- Agrupar por status: Agendados (ordenado por data) | Publicados
- Botao "Publicar agora" chama a edge function existente

### 3. Agendar direto do AssetDetail

- Na pagina de detalhe da peca aprovada, adicionar botao "Agendar" ao lado de "Aprovar"
- Abre o mesmo SchedulePostDialog pre-selecionando a peca atual

### 4. Visao de Calendario (simples)

- Componente de mini-calendario mensal na ScheduleTab
- Dias com posts agendados marcados com dot indicator
- Click no dia filtra a lista para aquele dia

### 5. Publicacao automatica (cron)

- Edge function `auto-publish-scheduled` que roda a cada 5 minutos via pg_cron
- Busca posts com `status = 'scheduled'` e `scheduled_at <= now()`
- Publica via Meta API e atualiza status

---

## Detalhes Tecnicos

### Arquivos novos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/activation/SchedulePostDialog.tsx` | Dialog de criacao/edicao de agendamento |
| `src/components/activation/ScheduleCalendar.tsx` | Mini calendario mensal |
| `supabase/functions/auto-publish-scheduled/index.ts` | Cron job para publicacao automatica |

### Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/components/activation/ScheduleTab.tsx` | Refatorar com cards ricos, calendario, botao agendar |
| `src/pages/AssetDetail.tsx` | Adicionar botao "Agendar" para pecas aprovadas |

### Migration SQL

Adicionar coluna `caption` na tabela `scheduled_posts` para armazenar a caption editada (evitar re-fetch do copy no momento da publicacao).

```sql
ALTER TABLE scheduled_posts ADD COLUMN caption text;
```

### Cron Job (via insert tool, nao migration)

```sql
SELECT cron.schedule('auto-publish-scheduled', '*/5 * * * *', ...);
```

Chama a edge function `auto-publish-scheduled` que busca posts pendentes e publica.

### Ordem de implementacao

1. Migration: adicionar coluna `caption`
2. Criar `SchedulePostDialog` (selecao de peca, caption, data/hora, canal)
3. Refatorar `ScheduleTab` (cards ricos, acoes, agrupamento por status)
4. Criar `ScheduleCalendar` (mini calendario com dots)
5. Adicionar botao "Agendar" no `AssetDetail`
6. Criar edge function `auto-publish-scheduled`
7. Configurar cron job

