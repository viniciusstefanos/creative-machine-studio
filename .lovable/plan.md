

# Campanhas no mesmo nível de Agendar no workflow

## Situacao atual

O WorkflowProgress tem 4 etapas: Brief → Copies → Peças → Agendar. Campanhas (ad-campaigns) fica apenas na tab bar secundária, separada do fluxo principal.

## Solucao

Adicionar "Campanhas" como 5o passo no WorkflowProgress, entre Peças e Agendar. Ambos (Campanhas e Agendar) representam destinos de distribuicao paralelos -- trafego pago e organico.

```text
[Brief] ── [Copies] ── [Peças] ── [Campanhas] ── [Agendar]
```

- **Campanhas** fica desbloqueada quando `assetsApproved > 0` (mesmo criterio de Agendar)
- Status "done" quando existem campanhas criadas (`campaignsCount > 0`)
- Icone: `Megaphone` (lucide)
- Remover "Campanhas" da tab bar secundaria para nao duplicar

### Mudancas

1. **`WorkflowProgress.tsx`**
   - Adicionar prop `campaignsCount`
   - Inserir step "Campanhas" com key `ad-campaigns`, path `ad-campaigns`, entre Pecas e Agendar

2. **`ActivationHub.tsx`**
   - Buscar count de `ad_campaigns` no query (similar ao `scheduled_posts`)
   - Passar `campaignsCount` ao WorkflowProgress
   - Remover `{ key: "ad-campaigns" }` do array `tabs` (sai da tab bar)

## Arquivos modificados
- `src/components/activation/WorkflowProgress.tsx`
- `src/pages/ActivationHub.tsx`

