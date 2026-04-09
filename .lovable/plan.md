

# Estado da Arte — Templates Stunning

## Diagnóstico

Analisei todo o pipeline. Os templates e a geração são funcionais, mas há gaps significativos para atingir qualidade "stunning":

### Problemas Atuais

1. **Contradição de fontes no `generate-asset-from-template`**: Linha 120 diz "usar fontes system seguras: Inter, Helvetica, Arial" — isso contradiz a regra de Google Fonts e resulta em peças com tipografia genérica. Os scaffolds usam Google Fonts, mas o prompt de geração final pede system fonts.

2. **Template HTML obrigatório genérico** (linhas 157-164): O boilerplate que a IA segue usa apenas `Inter` — sem variedade tipográfica. Para peças stunning, precisamos de pares tipográficos expressivos (display + corpo).

3. **Sem micro-interações visuais**: Os scaffolds são flat — sem `box-shadow`, `text-shadow`, `backdrop-filter`, gradientes complexos, bordas decorativas, ou elementos geométricos decorativos que diferenciam peças profissionais.

4. **Sem exemplos de referência**: A IA recebe regras abstratas mas nenhum exemplo concreto de HTML "stunning". Few-shot learning melhora drasticamente a qualidade.

5. **Modelo `gemini-3-flash-preview` para HTML**: Flash é rápido mas menos preciso em design. Para peças stunning, `gemini-2.5-pro` ou `gpt-5` produzem HTML significativamente melhor.

6. **Sem paleta de design systems modernos**: As regras falam de "gradientes sutis" sem dar exemplos concretos de técnicas CSS modernas (glassmorphism, grain texture, neon glow, etc.).

7. **Sem validação de qualidade pós-geração**: O HTML gerado não passa por nenhum check (contraste, tamanho de fonte, safe zones).

## Solução — 4 Eixos

### 1. Upgrade do Prompt de Geração (`generate-asset-from-template`)

- Remover contradição de fontes (linha 120) — substituir por "Use Google Fonts expressivas"
- Adicionar **biblioteca de técnicas CSS avançadas** no prompt:
  - `text-shadow` para profundidade em headlines
  - `background: linear-gradient(...)` com múltiplos stops
  - `backdrop-filter: blur()` para glassmorphism
  - `box-shadow` layered para depth
  - Pseudo-elementos decorativos via HTML (círculos, linhas, dots)
  - `letter-spacing: -0.03em` + `line-height: 0.95` para headlines impactantes
- Adicionar **2-3 exemplos concretos de HTML** (few-shot) para cada tipo de template (post, carousel, story)
- Substituir boilerplate genérico por pares tipográficos recomendados: `Space Grotesk + DM Sans`, `Playfair Display + Inter`, `Syne + DM Sans`, `Bebas Neue + Inter`

### 2. Upgrade do Modelo para HTML

- Trocar `gemini-3-flash-preview` por `gemini-2.5-pro` para geração de HTML (onde qualidade visual importa)
- Manter `flash` apenas para geração de prompts de imagem (onde velocidade é prioridade)

### 3. Refatorar Scaffolds Base (Migration SQL)

Atualizar os 6 templates "bons" para incluir:
- Pares tipográficos específicos em vez de só `Inter`
- Elementos decorativos (accent lines, geometric shapes, grain overlays)
- `text-shadow` e `box-shadow` nos scaffolds
- Gradientes mais sofisticados (multi-stop, radial)

### 4. Validação Pós-Geração (Client-side)

Em `renderPng.ts` ou `AssetDetail.tsx`, após receber HTML:
- Checar se fontes foram carregadas (já existe)
- Log de warning se headline < 60px (novo)
- Nenhum blocker — apenas logging para iteração futura

## Detalhes Técnicos

### Arquivos modificados

- **`supabase/functions/generate-asset-from-template/index.ts`**:
  - Corrigir linha 120 (system fonts → Google Fonts)
  - Adicionar seção `CSS_ADVANCED_TECHNIQUES` com exemplos de text-shadow, gradients, glassmorphism
  - Adicionar seção `TYPOGRAPHY_PAIRS` com 4-5 combinações recomendadas
  - Adicionar 2 exemplos few-shot de HTML stunning (1 post + 1 carousel slide)
  - Trocar modelo de `gemini-3-flash-preview` para `gemini-2.5-pro` na chamada `callLovableAI`
  - Atualizar boilerplate HTML template para incluir `text-shadow`, `letter-spacing`

- **`supabase/functions/generate-template/index.ts`**:
  - Adicionar mesmas técnicas CSS avançadas no `TEMPLATE_DESIGN_RULES`
  - Adicionar pares tipográficos recomendados
  - Adicionar 1 exemplo few-shot de scaffold stunning

- **Migration SQL** — Atualizar scaffolds dos 6 templates bons:
  - Adicionar `text-shadow`, `letter-spacing`, gradientes mais ricos
  - Trocar `Inter` standalone por pares tipográficos (ex: `Space Grotesk` para headlines + `DM Sans` para corpo)
  - Adicionar elementos decorativos (accent lines, dots, geometric accents)

