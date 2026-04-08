

# Adicionar opção "Subir para tráfego" ao aprovar peça

## Problema

Quando a peça é aprovada, só aparece "Agendar publicação" (orgânico). Falta a opção de adicionar a peça a uma campanha de tráfego pago (Meta Ads).

## Solução

No bloco de ações pós-aprovação (`asset.status === "approved"`, linhas 827-838 de `AssetDetail.tsx`), adicionar um botão **"Adicionar a campanha"** que:

1. Abre o `AddAdsToCampaignDialog` já existente, com o asset pré-selecionado
2. Busca o `metaAccount` do cliente (mesma lógica que `CampaignsTab` usa)
3. Busca campanhas existentes da ativação para o dialog

## Mudanças em `AssetDetail.tsx`

1. **Importar** `AddAdsToCampaignDialog` e o ícone `Megaphone` (ou `Target`)
2. **Adicionar state**: `addToCampaignOpen`, `metaAccount`, `campaigns`
3. **Fetch metaAccount** junto com os dados do asset (usar `client_meta_accounts` via `activation.client_id`)
4. **Adicionar botão** no bloco `approved`:

```text
[Agendar publicação]        ← orgânico (já existe)
[Adicionar a campanha ▸]    ← tráfego (NOVO)
[Criar outra peça →]        ← já existe
[Desaprovar]                ← já existe
```

5. **Renderizar** `<AddAdsToCampaignDialog>` com `activationId`, `metaAccount`, e `landingPageUrl` do activation

## Arquivo modificado
- `src/pages/AssetDetail.tsx`

