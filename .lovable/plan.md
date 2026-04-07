

# Implementar Templates Virais Instagram Brasil 2026

## Pesquisa Consolidada — Dados Validados 2026

Baseado em múltiplas fontes (Buffer 45M+ posts, Socialinsider, Metricool, Hootsuite, Envox, Conbersa):

### Dimensões Oficiais Instagram 2026
| Formato | Resolução | Proporção | Notas |
|---------|-----------|-----------|-------|
| Feed/Carrossel | 1080×1350px | 4:5 | Novo padrão dominante (substitui 1:1) |
| Feed vertical alto | 1080×1440px | 3:4 | Aceito, mais espaço visual |
| Reels/Stories | 1080×1920px | 9:16 | Tela cheia, máx impacto |
| Quadrado (legado) | 1080×1080px | 1:1 | Ainda funciona mas perde alcance |

### Formatos com Maior Engajamento (dados reais)
1. **Carrossel educativo** — 3.1x mais engagement que post único, 10.15% engagement rate (Metricool)
2. **Reels 7-12s** — 2.25x mais reach que estáticos, 82% completion rate
3. **Carrossel antes/depois** — alto save rate (bookmarking)
4. **Carrossel listicle** — números ímpares (3, 5, 7) no título = +22% CTR
5. **Post estático com frase forte** — funciona para quote/dados
6. **Story interativo** — 2x resposta com stickers

### Estruturas Virais Validadas Brasil
- **Hook impossível de ignorar** (slide 1): nunca título de relatório
- **1 ponto por slide** no carrossel (máx 3 linhas)
- **CTA único e claro** no último slide
- **UGC-style** supera produções polidas
- **Rosto na câmera** = +35% conversão

---

## O que será feito

### 1. Atualizar dimensões dos templates existentes (1:1 → 4:5)
Os 5 templates atuais usam 1080×1080 (1:1) — formato obsoleto. Atualizar para 1080×1350 (4:5), o padrão dominante 2026.

### 2. Criar 8 novos templates virais

| Template | Categoria | Tipo | Dimensão | Slides |
|----------|-----------|------|----------|--------|
| **Carrossel Educativo** | carousel | html_only | 1080×1350 (4:5) | 5-10 |
| **Carrossel Antes/Depois** | carousel | html_and_image | 1080×1350 (4:5) | 4-6 |
| **Carrossel Listicle** | carousel | html_only | 1080×1350 (4:5) | 5-7 |
| **Reels Cover** | static | html_and_image | 1080×1920 (9:16) | 1 |
| **Post Frase Forte** | static | html_only | 1080×1350 (4:5) | 1 |
| **Post Dado/Estatística** | static | html_only | 1080×1350 (4:5) | 1 |
| **Post CTA Direto** | static | html_and_image | 1080×1350 (4:5) | 1 |
| **Story Interativo** | static | html_only | 1080×1920 (9:16) | 1 |

Cada template terá:
- `system_prompt` com instruções específicas de estrutura viral
- `html_scaffold` otimizado para o formato
- `image_prompt_template` (quando aplicável) com regras UGC/Brasil
- `editable_fields` com campos relevantes (headline, body, cta, cor, etc.)

### 3. Atualizar system prompts na edge function

Incorporar os dados de benchmark reais (engagement rates, completion rates) nos prompts, reforçando as estruturas que performam melhor.

---

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| Migration SQL | UPDATE templates existentes (4:5) + INSERT 8 novos |
| `supabase/functions/generate-asset-from-template/index.ts` | Atualizar prompts com benchmarks 2026 |
| `mem://features/creative-agent` | Atualizar com dados de pesquisa |

