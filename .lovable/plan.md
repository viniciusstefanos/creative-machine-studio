

# Puxar campanhas do Meta Ads filtradas por nomenclatura

## Problema

Não existe nenhuma ação no edge function `meta-ads` para listar campanhas existentes na conta de anúncios. O `CampaignsTab` só lê da tabela local `ad_campaigns`. A funcionalidade de "puxar campanhas já existentes no Meta Ads, filtradas pelo slug da ativação" simplesmente não foi implementada.

## Solução

### 1. Nova action `list_campaigns` no edge function `meta-ads`

Adicionar action que:
- Recebe `ad_account_id` e `name_filter` (o slug da ativação)
- Chama `GET /{ad_account_id}/campaigns?fields=id,name,status,effective_status,daily_budget,objective,start_time,stop_time&filtering=[{"field":"name","operator":"CONTAIN","value":"{name_filter}"}]`
- Para cada campanha retornada, busca adsets e ads associados
- Retorna a lista completa

### 2. Botão "Importar do Meta" no `CampaignsTab`

Adicionar botão ao lado de "Criar Campanha":
- Ao clicar, chama a action `list_campaigns` com `name_filter = activationSlug`
- Exibe dialog com campanhas encontradas no Meta que ainda não estão na tabela local (comparando `platform_campaign_id`)
- Usuário seleciona quais importar
- Para cada selecionada, insere registro em `ad_campaigns` com os dados do Meta (nome, objetivo, status, budget, platform_campaign_id, ad_account_id)
- Opcionalmente importa adsets/ads como `ad_creatives`

### 3. Fluxo UI

```text
Campanhas de Ads     [slug]
                     [↓ Importar do Meta]  [+ Adicionar Anúncios]  [+ Criar Campanha]

── Dialog "Importar Campanhas" ──
Encontradas 3 campanhas com "meu-slug" no nome:
☑ meu-slug — Black Friday Feed     PAUSED    R$20/dia
☑ meu-slug — Stories Awareness     ACTIVE    R$15/dia
☐ meu-slug — Teste antigo          PAUSED    R$5/dia
                                              [Importar selecionadas]
```

## Arquivos modificados

- **`supabase/functions/meta-ads/index.ts`** — nova action `list_campaigns` com filtering por nome
- **`src/components/activation/CampaignsTab.tsx`** — botão "Importar do Meta", dialog de seleção, lógica de inserção no DB

