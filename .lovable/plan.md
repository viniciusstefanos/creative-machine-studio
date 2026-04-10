

# Injetar Regras de Design & Boas Práticas no `designed_image`

## O que mudar

O `DESIGNED_IMAGE_RULES` atual (linhas 306-342) tem regras genéricas. Precisa incorporar as regras detalhadas do documento de boas práticas (composição, tipografia com tamanhos mínimos, cores, fotografia, proibições absolutas, safe zones por formato, etc.).

## Mudança

**Arquivo:** `supabase/functions/generate-asset-from-template/index.ts`

Substituir o `DESIGNED_IMAGE_RULES` atual pelo conteúdo completo das regras de design, incluindo:

- **Especificações por formato**: Feed 4:5 safe zones (14px lateral), Stories 9:16 safe zones (topo 250px, base 300px, lateral 96px) — aplicar dinamicamente baseado no `aspect_ratio`
- **Composição visual**: hierarquia 3 níveis, regra dos terços, espaço negativo mín 30%, profundidade 3 planos
- **Tipografia com tamanhos mínimos**: headline ≥60px, subheadline ≥36px, corpo ≥28px, CTA ≥32px, disclaimers ≥20px. Máx 2 famílias. Contraste 4.5:1. Texto ≤20% da área. Headlines máx 8 palavras.
- **Cores**: paleta 1 dominante + 1 suporte + 1 acento/CTA. Acento só no CTA.
- **Fotografia**: foco seletivo, produto = ponto mais luminoso, saturação moderada
- **10 proibições absolutas**: texto ilegível, 3+ famílias, logo cortado, 2+ CTAs, fotos pixeladas, sem hierarquia, fora da zona segura, copy genérico, 4+ focos visuais, imagens sem direitos

Além disso, tornar as safe zones dinâmicas baseadas no `aspect_ratio` do template (9:16 tem safe zones maiores no topo/base).

## Impacto

- Imagens `designed_image` seguirão as mesmas regras profissionais de design
- Safe zones corretas por formato
- Zero mudança na UI

