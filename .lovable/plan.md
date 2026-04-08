

# Separação Orgânico vs Ads — Respostas e Plano Refinado

## Suas perguntas respondidas

**1. A tag da copy na peça já vai dizer se é ad ou orgânico?**
Sim. Cada copy terá um campo `purpose` ("organic" ou "ads"). No card da peça (asset), o badge da copy associada mostrará "ORG" ou "ADS". Assim, ao olhar qualquer peça, você sabe pra qual fluxo ela foi pensada.

**2. Posso gerar copies só pra um tipo?**
Sim. O botão "Gerar com IA" ganhará um seletor: **Orgânico**, **Ads** ou **Ambos**. Você escolhe antes de gerar.

**3. Posso criar uma variação Ads a partir de uma copy orgânica (e vice-versa)?**
Sim. Na tela de detalhe da copy, haverá um botão **"Criar variação Ads"** (ou "Criar variação Orgânica") que duplica a copy, ajusta o `purpose`, e opcionalmente chama a IA para adaptar o tom (CTA de engajamento → CTA de conversão, por exemplo).

---

## Plano de implementação

### 1. Migration — campo `purpose` na tabela `copies`
```sql
ALTER TABLE copies ADD COLUMN purpose text DEFAULT 'organic';
```

### 2. `CopiesTab.tsx` — filtros e controle de geração
- Chips de filtro: **Todos** | **Orgânico** | **Ads** (com contagem)
- Badge "ORG" ou "ADS" em cada card da lista
- Botão "Gerar com IA" abre mini-select: Orgânico / Ads / Ambos
- Campo "Finalidade" no formulário de criação manual

### 3. `CopyDetail.tsx` — variação entre tipos
- Campo editável `purpose` (select)
- Botão **"Criar variação Ads"** (se purpose=organic) ou **"Criar variação Orgânica"** (se purpose=ads)
  - Duplica a copy no banco com o purpose invertido
  - Opcionalmente chama a edge function `regenerate-copy-block` para adaptar tom/CTA

### 4. `StatusBadge.tsx` — novos status
- `published_organic` → "Publicado · Orgânico" (verde)
- `published_ads` → "Publicado · Ads" (cor accent)

### 5. `generate-copies` edge function
- Recebe novo parâmetro `purpose`: `"organic"`, `"ads"` ou `"both"`
- Se `"both"`: gera 2 variações por combinação (uma orgânica, uma ads)
- Se `"organic"` ou `"ads"`: gera só aquele tipo
- Diferença no prompt: orgânico = caption longo, hashtags, CTA de engajamento; ads = direto, curto, CTA de conversão

### 6. Integração nos fluxos de publicação (sem mudança estrutural)
- `ScheduleTab` / `BulkScheduleDialog`: ao publicar → status `published_organic`
- `CreateCampaignWizard` / `AddAdsToCampaignDialog`: ao subir → status `published_ads`

## Arquivos modificados
- **Migration SQL** — 1 coluna nova
- **`CopiesTab.tsx`** — filtros, badge, seletor de geração
- **`CopyDetail.tsx`** — botão "Criar variação", select purpose
- **`StatusBadge.tsx`** — 2 novos status
- **`generate-copies/index.ts`** — parâmetro purpose, prompt condicional

