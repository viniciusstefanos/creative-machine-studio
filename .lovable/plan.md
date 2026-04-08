

# Gestão Profissional de Links e UTMs + UTM Dinâmico no Meta Ads

## Problemas Atuais

1. **UtmTab básica**: 1 config UTM por ativação, sem variações por canal/peça
2. **UTMs no wizard são estáticos**: `utm_source=facebook`, `utm_medium=paid`, `utm_campaign=manual` — não variam por anúncio
3. **Sem `utm_content` dinâmico**: Meta suporta `url_tags` com placeholders como `{{ad.name}}`, `{{adset.name}}`, `{{campaign.name}}` — não usamos
4. **Sem shortener/tracking**: URLs longas, sem click tracking próprio
5. **Sem vínculo entre UTM salva e campanha**: A UTM configurada na aba UTMs não alimenta o wizard de campanha

## Solução em 4 Fases

### Fase 1 — UTM Templates por Canal

Refatorar a tabela `utm_configs` para suportar múltiplas configs por ativação (1 por canal):

```sql
ALTER TABLE public.utm_configs
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS use_dynamic_params boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dynamic_content_pattern text;

-- Remove unique constraint se existir, permitir múltiplas configs
CREATE UNIQUE INDEX IF NOT EXISTS utm_configs_activation_channel_idx
  ON utm_configs(activation_id, channel);
```

Canais pré-definidos: `default`, `meta_ads`, `google_ads`, `email`, `organic_social`.

### Fase 2 — UTM Dinâmico com Macros Meta Ads

Na UI do UtmTab, quando canal = `meta_ads`, exibir opções de macro dinâmica:

- `utm_content`: dropdown com `{{ad.name}}`, `{{adset.name}}`, `{{ad.id}}`, ou texto fixo
- `utm_campaign`: `{{campaign.name}}` ou texto fixo
- `utm_term`: `{{adset.name}}` ou texto fixo

Essas macros são resolvidas pela Meta no momento do clique — cada anúncio gera uma URL única automaticamente.

No `CreateCampaignWizard`, o `buildUtmTags()` passa a consultar a config `meta_ads` da ativação e montar os `url_tags` com as macros. Exemplo de saída:

```
utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Isso é passado como `url_tags` no `create_ad` (já funciona na API Meta — campo `creativePayload.url_tags`).

### Fase 3 — UI Refatorada da Aba UTMs

Substituir o formulário simples por:

1. **Tabs por canal** (Default, Meta Ads, Google Ads, Email, Social Orgânico)
2. **Preview dinâmico** mostrando URL com macros destacadas em cor diferente
3. **Botão "Copiar URL"** para cada variação
4. **Auto-preenchimento**: `utm_campaign` = slug da ativação por default
5. **Indicador "Dinâmico"**: badge ao lado dos campos que usam macros Meta
6. **Tabela de links gerados**: lista de URLs por canal com botão copiar

### Fase 4 — Integração Wizard ↔ UTM Config

Quando o wizard abre no Step 4 (Anúncios):
- Carregar automaticamente a `utm_config` do canal `meta_ads` (se existir)
- Preencher `utmSource`, `utmMedium`, `utmCampaign` com os valores salvos
- Se `use_dynamic_params = true`, usar as macros no `url_tags`
- Mostrar preview da URL final com macros destacadas
- Se não houver config, manter o comportamento atual (campos manuais)

## Arquivos Modificados

- **Migration SQL** — `channel`, `use_dynamic_params`, `dynamic_content_pattern` em `utm_configs`
- **`src/components/activation/UtmTab.tsx`** — reescrever com tabs por canal, macros Meta, preview dinâmico
- **`src/components/activation/CreateCampaignWizard.tsx`** — `buildUtmTags()` consulta utm_configs, suporta macros
- **`supabase/functions/meta-ads/index.ts`** — garantir que `url_tags` com macros é passado corretamente (já funciona, apenas validar)

