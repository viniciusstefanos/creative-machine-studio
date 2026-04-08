

# Criação de Campanhas Profissional — Wizard Completo

## Situação Atual
O wizard tem 3 steps simples (nome/objetivo/budget → segmentação básica → selecionar peças). Falta:
- Tipo de compra (lance) e estratégia de lance
- Evento de conversão para campanhas de Leads/Vendas
- Integração com Pixel (listar pixels da conta)
- Placement (posicionamento automático vs manual)
- Otimização condicionada ao objetivo
- Configuração a nível de anúncio (CTA button, tracking)

## Plano

### Fase 1 — Edge function: novas actions no `meta-ads`
1. **`list_pixels`** — `GET /{ad_account_id}/adspixels?fields=id,name,is_unavailable`
2. **`list_custom_conversions`** — `GET /{ad_account_id}/customconversions?fields=id,name,pixel,rule` para campanhas de conversão
3. Ajustar **`create_adset`** para aceitar:
   - `promoted_object` (pixel_id + custom_event_type para OUTCOME_LEADS/SALES)
   - `optimization_goal` dinâmico baseado no objetivo
   - `bid_strategy` (LOWEST_COST_WITHOUT_CAP, COST_CAP, BID_CAP)
   - `bid_amount` (quando bid_strategy = COST_CAP ou BID_CAP)
   - `publisher_platforms` / `facebook_positions` / `instagram_positions` para placement manual
4. Ajustar **`create_ad`** para aceitar:
   - `call_to_action` no link_data (LEARN_MORE, SHOP_NOW, SIGN_UP, etc.)
   - `url_tags` para UTM tracking no nível do anúncio

### Fase 2 — Refatorar wizard para 5 steps
O wizard passa de 3 para 5 steps:

```text
Step 1: Campanha           Step 2: Estratégia         Step 3: Segmentação
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ Nome               │     │ Tipo de compra     │     │ Idade, Gênero      │
│ Objetivo (5 opções)│     │  ○ Menor custo     │     │ Interesses         │
│ Special Ad Category│     │  ○ Cost cap  R$__  │     │ Audiências custom  │
│ Orçamento diário   │     │  ○ Bid cap   R$__  │     │ Placement          │
│ Datas              │     │                    │     │  ○ Automático       │
│                    │     │ Pixel (select)     │     │  ○ Manual           │
│                    │     │ Evento conversão   │     │    ☑ Feed ☑ Stories │
│                    │     │ (se Leads/Vendas)  │     │    ☑ Reels          │
└────────────────────┘     └────────────────────┘     └────────────────────┘

Step 4: Anúncios           Step 5: Revisão
┌────────────────────┐     ┌────────────────────┐
│ Selecionar peças   │     │ Resumo completo    │
│ CTA button (select)│     │ Campanha: ...      │
│ URL destino        │     │ Budget: R$20/dia   │
│ UTM parameters     │     │ Pixel: ...         │
│                    │     │ N peças: 4         │
│                    │     │     [Criar]         │
└────────────────────┘     └────────────────────┘
```

### Fase 3 — Lógica condicional por objetivo

| Objetivo | optimization_goal | promoted_object | Evento necessário |
|----------|------------------|-----------------|-------------------|
| OUTCOME_AWARENESS | REACH | — | — |
| OUTCOME_TRAFFIC | LINK_CLICKS | — | — |
| OUTCOME_ENGAGEMENT | POST_ENGAGEMENT | — | — |
| OUTCOME_LEADS | LEAD_GENERATION ou OFFSITE_CONVERSIONS | pixel_id + LEAD | Sim |
| OUTCOME_SALES | OFFSITE_CONVERSIONS | pixel_id + PURCHASE | Sim |

Quando o usuário seleciona Leads ou Vendas:
- Buscar pixels via `list_pixels`
- Mostrar select de pixel
- Mostrar select de evento de conversão (LEAD, PURCHASE, ADD_TO_CART, etc.)

### Fase 4 — CTA buttons no nível do anúncio
Lista de CTAs disponíveis no Meta:
- LEARN_MORE, SHOP_NOW, SIGN_UP, SUBSCRIBE, DOWNLOAD, GET_OFFER, CONTACT_US, BOOK_TRAVEL, APPLY_NOW, SEND_WHATSAPP_MESSAGE

Adicionar select no Step 4 (Anúncios) que aplica o CTA a todos os ads.

### Fase 5 — Pixel config no cliente
Adicionar campo `pixel_id` na tabela `client_meta_accounts` (ads) para que o pixel fique salvo por cliente e seja pré-preenchido no wizard.

## Detalhes técnicos

### Migration SQL
```sql
ALTER TABLE public.client_meta_accounts
  ADD COLUMN IF NOT EXISTS pixel_id text;
```

### Arquivos modificados
- **`supabase/functions/meta-ads/index.ts`** — actions `list_pixels`, `list_custom_conversions`; ajustar `create_adset` e `create_ad`
- **`src/components/activation/CreateCampaignWizard.tsx`** — refatorar para 5 steps com lógica condicional
- **`src/components/client/MetaAccountSettings.tsx`** — campo pixel_id no card de Ads
- Migration SQL — `pixel_id` em `client_meta_accounts`

