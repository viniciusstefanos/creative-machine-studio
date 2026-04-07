

# Incorporar Design Rules Meta Ads + Revisar Templates

## O que muda

O documento `design-rules-meta-ads.md` traz regras detalhadas de composição, tipografia, cores, fotografia, copy, animação e checklist de aprovação. Muitas já existem parcialmente nos prompts atuais, mas faltam regras cruciais como:

- Tamanhos mínimos de fonte (headline 60px, corpo 28px, CTA 32px)
- Zona segura de Stories/Reels (topo 250px, base 300px, lateral 96px) — atualmente usa valores menores
- Regra dos 20% de texto, hierarquia em 3 níveis, espaço negativo 30%
- Profundidade em 3 planos (fundo, plano médio, primeiro plano)
- Cores: paleta 3 cores (dominante, suporte, acento/CTA), psicologia food & beverage
- Copy: estrutura Gancho → Benefício/Dor → Prova → CTA, headlines max 8 palavras
- Carrossel: continuidade visual entre cards, bordas que "sangram"
- Proibições absolutas (10 itens) e checklist de aprovação

## Plano

### 1. Salvar documento como memory
Criar `mem://features/design-rules-meta-ads` com o conteúdo condensado do documento para referência futura.

### 2. Atualizar `generate-asset-from-template/index.ts`

**`HTML_CREATIVE_RULES`** — reescrever incorporando:
- Safe zones corrigidas: Stories topo 250px, base 300px, lateral 96px (atualmente 200px/250px/80px)
- Tamanhos mínimos de fonte do documento (headline 60px, sub 36px, corpo 28px, CTA 32px)
- Regra dos 20% de cobertura de texto
- Hierarquia 3 níveis obrigatória (âncora, suporte, CTA)
- Espaço negativo mínimo 30%
- Profundidade 3 planos
- Paleta 3 cores: dominante + suporte + acento CTA
- Contraste mínimo 4.5:1 (já existe, reforçar)
- Carrossel: continuidade visual, bordas sangradas, card 1 isolado funciona
- 10 proibições absolutas como checklist final no prompt
- Headlines max 8 palavras

**`IMAGE_CREATIVE_RULES`** — adicionar:
- Fotografia: hero shot, lifestyle, flat lay
- Edição: temperatura consistente, saturação moderada, produto = ponto mais luminoso
- Profundidade de campo seletiva
- Psicologia de cores food & beverage

### 3. Atualizar `generate-copies/index.ts`

**`CREATIVE_AGENT_SYSTEM_PROMPT`** — incorporar:
- Estrutura copy: Gancho → Benefício/Dor → Prova → CTA
- CTAs proibidos: "Saiba mais", "Clique aqui" sem contexto
- CTAs food & beverage: "Peça agora", "Ver cardápio", "Reserve sua mesa"
- Tom de voz por segmento (fast food, casual, fine dining, saudável, bar)
- Headlines max 8 palavras
- Prova social obrigatória quando aplicável
- Variações A/B: teste uma variável por vez

### 4. Atualizar `regenerate-copy-block/index.ts`

Adicionar ao system prompt as regras de copy do documento (estrutura, CTAs, tom de voz, anti-patterns).

### 5. Revisar templates no banco (seed data)

Consultar `asset_templates` para verificar se os 8 templates base estão com dimensões e configurações alinhadas ao documento:
- Feed 4:5 = 1080×1350 (não 1080×1080)
- Stories/Reels 9:16 = 1080×1920
- Zona segura lateral 14px (feed) vs 96px (stories)
- `system_prompt` de cada template alinhado com as novas regras

Se necessário, criar migration para atualizar `system_prompt`, `html_scaffold`, dimensões ou campos editáveis dos templates existentes.

### Arquivos modificados
- `supabase/functions/generate-asset-from-template/index.ts` — prompts visuais e HTML
- `supabase/functions/generate-copies/index.ts` — prompt de copy
- `supabase/functions/regenerate-copy-block/index.ts` — prompt de regeneração
- `mem://features/design-rules-meta-ads` — novo memory file
- Possível migration SQL para atualizar templates

