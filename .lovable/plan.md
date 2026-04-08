

# Separar conexões Orgânico e Ads em `client_meta_accounts`

## Problema

Hoje existe **uma única linha** por cliente na tabela `client_meta_accounts`, misturando campos de orgânico (Facebook Page, Instagram Actor, username, page_access_token) com campos de ads (ad_account_id, ad_account_name). Quando o cliente usa BMs diferentes para orgânico e tráfego, os tokens e IDs conflitam.

## Solução

Separar em **duas linhas por cliente**: uma com `platform = "meta_organic"` e outra com `platform = "meta_ads"`. Cada uma com seu próprio `page_access_token` opcional.

### 1. Migration: adicionar coluna `page_access_token` para ads e permitir múltiplas linhas

- Não precisa alterar schema (já permite múltiplas linhas, `maybeSingle()` é só no código)
- A coluna `page_access_token` já existe
- Apenas garantir que o combo `(client_id, platform)` seja unique:

```sql
ALTER TABLE public.client_meta_accounts 
  DROP CONSTRAINT IF EXISTS client_meta_accounts_client_id_platform_key;
ALTER TABLE public.client_meta_accounts 
  ADD CONSTRAINT client_meta_accounts_client_id_platform_key 
  UNIQUE (client_id, platform);
```

### 2. `MetaAccountSettings.tsx` — UI separada

Refatorar para gerenciar **dois registros independentes**:

- **Card "Orgânico"** (platform = `meta_organic`): Facebook Page ID, Instagram Actor ID, Username, Page Access Token (opcional)
  - Botão "Auto-detectar" via `get_pages`
  - Botão "Salvar" próprio

- **Card "Conta de Anúncios"** (platform = `meta_ads`): Ad Account ID, Nome da conta, Access Token (opcional, para BM diferente)
  - Botão "Auto-detectar" via `get_ad_accounts`
  - Botão "Salvar" próprio

Estado: dois forms independentes (`organicForm` e `adsForm`), cada um com load/save separado buscando por `eq("platform", "meta_organic")` / `eq("platform", "meta_ads")`.

### 3. Atualizar consumidores

Cada ponto que lê `client_meta_accounts` precisa filtrar pelo `platform` correto:

| Arquivo | Uso | Filtro |
|---------|-----|--------|
| `ScheduleTab.tsx` (publicação orgânica) | instagram_page_id, facebook_page_id | `eq("platform", "meta_organic")` |
| `auto-publish-scheduled/index.ts` | publicação orgânica | `eq("platform", "meta_organic")` |
| `AssetDetail.tsx` | busca ad_account_id para ads + instagram para orgânico | Buscar **ambos** registros |
| `meta-ads/index.ts` (get_meta_account) | ad_account_id | `eq("platform", "meta_ads")` |
| `meta-ads/index.ts` (outras actions que usam token) | token de ads | `eq("platform", "meta_ads")` |

### 4. Fallback de compatibilidade

Se o cliente só tem um registro com `platform = "meta"` (dados antigos), tratar como fallback: ler esse registro para ambos os contextos até que o usuário salve separadamente.

## Arquivos modificados

- **Migration SQL** — unique constraint `(client_id, platform)`
- **`src/components/client/MetaAccountSettings.tsx`** — dois cards independentes com save separado
- **`src/components/activation/ScheduleTab.tsx`** — filtrar `meta_organic`
- **`src/pages/AssetDetail.tsx`** — buscar ambos registros (organic para schedule, ads para campaigns)
- **`supabase/functions/auto-publish-scheduled/index.ts`** — filtrar `meta_organic`
- **`supabase/functions/meta-ads/index.ts`** — filtrar `meta_ads`

