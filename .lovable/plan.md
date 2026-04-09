

# Adicionar Sigla da Ativação na Nomenclatura — Campanha / Conjunto / Ad

## Estado Atual

O wizard já busca `activationSlug` e monta `${activationSlug} — ${campaignName}`. Mas usa `—` como separador e não segue o padrão padronizado com `-`.

## Mudanças

### 1. Novo `src/lib/adNaming.ts`

Funções utilitárias:

- **`sanitize(str)`** — remove acentos, espaços→`-`, uppercase, strip caracteres especiais
- **`buildCampaignName(slug, campaignName, objective)`** — `{SLUG}-{NOME}-{OBJ}` (ex: `BF26-BLACK-FRIDAY-TRAFFIC`)
- **`buildAdsetName(campaignName, segment)`** — `{CAMPAIGN}-{SEGMENT}` (ex: `BF26-BLACK-FRIDAY-TRAFFIC-BROAD`)
- **`buildAdName(category, copyIndex, creativeIndex)`** — `{FMT}-{A}-{V1}` (ex: `CRS-A-V1`)

Mapa de objetivo: `OUTCOME_TRAFFIC→TRAF`, `OUTCOME_SALES→SALES`, etc.

### 2. `CreateCampaignWizard.tsx`

- Auto-popular `campaignName` com `buildCampaignName(activationSlug, userInput, objective)` no preview/revisão
- `fullCampaignName` usa a função em vez de concatenação manual
- Adset: `buildAdsetName(fullCampaignName, "BROAD")`
- Ads: `buildAdName(template.category, index, 1)`

### 3. `AddAdsToCampaignDialog.tsx`

- Importar `buildAdName` e usar no `handleSubmit` em vez de `asset.name || "Ad N"`

### Arquivos modificados
- **`src/lib/adNaming.ts`** — novo
- **`src/components/activation/CreateCampaignWizard.tsx`** — usar funções de nomenclatura
- **`src/components/activation/AddAdsToCampaignDialog.tsx`** — usar `buildAdName`

