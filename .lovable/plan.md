

# Subir anúncios em campanhas existentes

## Contexto

Hoje o wizard `CreateCampaignWizard` sempre cria campanha + adset + ads de uma vez. O usuário quer poder selecionar uma campanha já criada (que já tem adset no Meta) e adicionar novos anúncios nela.

## Plano

### 1. Novo componente: `AddAdsToCampaignDialog`

Dialog separado do wizard de criação, acessível pela aba Campanhas. Fluxo:

1. **Selecionar campanha** — lista campanhas existentes desta ativação (tabela `ad_campaigns`) que tenham `platform_adset_id` preenchido
2. **Selecionar peças aprovadas** — mesma lógica do step 3 do wizard atual (assets aprovados com renders)
3. **Submeter** — para cada asset selecionado, chama `meta-ads` com `action: "create_ad"` usando o `platform_adset_id` da campanha selecionada

### 2. Botão na `CampaignsTab`

Adicionar botão "Adicionar Anúncios" ao lado do "Criar Campanha". Abre o novo dialog.

Também: dentro de cada campanha expandida, um botão "+ Adicionar anúncio" que já pré-seleciona aquela campanha.

### 3. Lógica no frontend

- Buscar campanhas com `platform_adset_id IS NOT NULL` (indica que o adset já foi criado no Meta)
- Reutilizar a mesma lógica de `loadApprovedAssets` do wizard
- Na submissão, chamar `meta-ads` `create_ad` com `adset_id = campaign.platform_adset_id`
- Salvar `ad_creatives` no banco com `campaign_id` do DB

### Nenhuma mudança no backend

A edge function `meta-ads` já suporta `create_ad` com `adset_id` passado diretamente. Não precisa de migration nem de alteração na edge function.

### Arquivos modificados
- **`src/components/activation/AddAdsToCampaignDialog.tsx`** — novo componente
- **`src/components/activation/CampaignsTab.tsx`** — botão para abrir o dialog + botão dentro de cada campanha expandida

