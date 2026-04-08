

# Melhorar nomenclatura dos assets

## Problema atual

Assets são criados sem nome (`name: null`). O display cai em fallbacks genéricos como "carousel" ou "Peça v1". A ID única (UUID) é longa demais para uso visual.

## Nova nomenclatura proposta

**Formato**: `{ID_CURTA}-{SIGLA_TEMPLATE} {título_da_copy}`

Exemplo: `042-CRS Sua pele merece mais`

- **ID curta**: número sequencial de 3 dígitos (ex: `042`), baseado em `count(*)` de assets da ativação + 1
- **Sigla do template**: primeiras 3 letras da categoria ou slug do template em maiúsculo (ex: `CRS` = carousel, `STC` = static, `STR` = stories, `RLS` = reels). Usar um mapa fixo no código
- **Título da copy**: primeiras ~5 palavras do hook da copy associada, truncado

Sigla da ativação **não** é incluída (já está a nível de campanha).

## Mudanças

### 1. Função utilitária `buildAssetName`

Criar em `src/lib/assetNaming.ts`:
- Recebe: `sequenceNumber`, `templateCategory` (ou slug), `copyHook`
- Retorna: string formatada tipo `042-CRS Sua pele merece mais`
- Mapa de siglas: `{ carousel: "CRS", static: "STC", stories: "STR", reels: "RLS", feed: "FED" }` com fallback para primeiras 3 letras

### 2. `NewAsset.tsx` — gerar nome na criação

Antes do insert:
- Contar assets existentes na ativação (`count`)
- Pegar hook da copy selecionada
- Chamar `buildAssetName(count + 1, template.category, copy.hook)`
- Incluir `name` no insert

### 3. `BatchAssets.tsx` — gerar nome na criação em lote

Mesmo padrão, incrementando o contador a cada asset no loop.

### 4. Display (sem mudança estrutural)

`AssetsTab.tsx`, `AssetDetail.tsx`, `AddAdsToCampaignDialog.tsx`, `BulkScheduleDialog.tsx` e `CreateCampaignWizard.tsx` já usam `asset.name` — como agora sempre terá valor, os fallbacks genéricos deixam de aparecer.

## Arquivos modificados
- **`src/lib/assetNaming.ts`** — novo, função `buildAssetName`
- **`src/pages/NewAsset.tsx`** — gerar nome antes do insert
- **`src/pages/BatchAssets.tsx`** — gerar nome no loop de criação

