

# Campanhas Meta Ads — Planejar, Criar e Subir

## Estado atual

Já existe:
- Tabela `ad_campaigns` no banco (name, platform, objective, budget, status, platform_campaign_id, activation_id)
- Edge function `meta-ads` com actions: `get_ad_accounts`, `create_campaign`, `create_adset`, `create_ad`
- `CampaignsTab` na aba "Campanhas" — lista campanhas, mas sem ação de criar
- `MetaAccountSettings` no cliente — configura instagram_page_id e ad_account_id
- Peças aprovadas com renders PNG prontas para upload

Falta: UI completa para criar campanha, conjunto de anúncios e vincular peças aprovadas como ads.

## Plano de implementação

### 1. Expandir tabela `ad_campaigns` (migration)
Adicionar campos para suportar a hierarquia completa:
- `ad_account_id text` — conta de anúncio usada
- `platform_adset_id text` — ID do adset no Meta
- `adset_name text`
- `daily_budget_cents integer` — orçamento diário em centavos
- `targeting jsonb` — segmentação (países, idade, interesses)
- `start_date date`, `end_date date`

### 2. Criar tabela `ad_creatives` (migration)
Para rastrear cada anúncio individual vinculado a uma peça:
- `id uuid PK`
- `campaign_id uuid` → ad_campaigns
- `asset_id uuid` → assets
- `name text`
- `caption text`
- `link text`
- `platform_ad_id text`
- `platform_creative_id text`
- `status text default 'draft'`
- `created_at timestamptz`

RLS: authenticated can CRUD.

### 3. Reformular `CampaignsTab` — UI completa

**Estado vazio**: botão "Criar Campanha"

**Wizard em 3 passos** (dialog/sheet):

1. **Campanha** — nome, objetivo (dropdown: OUTCOME_ENGAGEMENT, OUTCOME_TRAFFIC, OUTCOME_AWARENESS, OUTCOME_LEADS, OUTCOME_SALES), orçamento diário, datas
2. **Segmentação** — países (default BR), faixa etária, gênero, interesses (campo texto livre por enquanto)
3. **Anúncios** — selecionar peças aprovadas da ativação (grid com thumbnails), cada uma vira um ad. Caption pré-populado com a copy associada, link pré-populado com landing_page_url da ativação

Ao confirmar:
- Chama `meta-ads` → `create_campaign`
- Chama `meta-ads` → `create_adset`
- Para cada peça selecionada, chama `meta-ads` → `create_ad` (usando png_url do render)
- Salva tudo no banco (ad_campaigns + ad_creatives)

**Lista de campanhas**: card expandível mostrando adset + lista de ads com status e link para a peça

### 4. Atualizar edge function `meta-ads`
- Aceitar `start_date`/`end_date` no create_adset (campos `start_time`, `end_time` da API Meta)
- Aceitar `age_min`, `age_max`, `genders`, `interests` no targeting
- Usar `page_access_token` do `client_meta_accounts` quando disponível (buscar via activation → client)
- Nova action `get_campaign_status` — buscar status atualizado de campaign + adset + ads no Meta

### 5. Buscar credenciais Meta automaticamente
Ao abrir CampaignsTab, buscar `client_meta_accounts` via activation → client_id para usar `ad_account_id` e `page_access_token` sem o usuário precisar informar novamente.

## Arquivos modificados
- **Migration SQL** — expandir `ad_campaigns`, criar `ad_creatives`
- **`src/components/activation/CampaignsTab.tsx`** — refazer com wizard de criação + lista detalhada
- **`src/components/activation/CreateCampaignWizard.tsx`** — novo componente (wizard 3 passos)
- **`supabase/functions/meta-ads/index.ts`** — aceitar targeting detalhado, datas, nova action de status

