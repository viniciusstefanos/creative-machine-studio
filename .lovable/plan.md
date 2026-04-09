

# Avaliação de Templates — Bons, Precisam Melhorar, Remover

## Resumo dos 13 Templates Base

### BOM — Prontos para uso (6)

| # | Template | Motivo |
|---|----------|--------|
| 1 | **Carrossel Educativo** | Scaffold sólido com `{{bg_color}}`, `{{accent_color}}`, slide number, progress bar. Prompt detalhado com benchmarks. Mais versátil dos carrosséis. |
| 2 | **Carrossel Listicle** | Scaffold com número grande, progress bar, CTA button. Prompt com regras claras de estrutura. Bom complemento ao educativo. |
| 3 | **Post Frase Forte** | Scaffold elegante com `{{bg_color}}`, `{{text_color}}`, aspas decorativas. Prompt focado em tipografia bold. Simples e eficaz. |
| 4 | **Post Dado/Estatística** | Scaffold com número gigante 140px, contexto, fonte. Prompt correto para dados. Layout limpo e impactante. |
| 5 | **Story — Texto sobre Gradiente** | Scaffold com `{{gradient_from}}`, `{{gradient_to}}`, safe zones corretas (250px top, 340px bottom). Swipe hint. Completo. |
| 6 | **Carrossel Estilo Twitter** | Scaffold com card estilo tweet, avatar, handle. Prompt atualizado com perfil social. Diferenciado e funcional. |

### PRECISAM MELHORAR (4)

| # | Template | Problemas | Correção |
|---|----------|-----------|----------|
| 1 | **Carrossel Antes/Depois** | Scaffold usa `background: #0a0a0a` hardcoded em vez de `{{bg_color}}`. Cor accent referenciada mas bg não respeita briefing. | Trocar `#0a0a0a` por `{{bg_color}}` no scaffold. |
| 2 | **Post CTA Direto** | Scaffold com overlay fixo `rgba(0,0,0,.3/75)` — não usa cores do briefing no fundo. `{{cta_color}}` existe mas bg é genérico. Prompt curto demais comparado aos outros. | Adicionar `{{bg_color}}` e enriquecer system_prompt com regras de composição e safe zones. |
| 3 | **Post Feed — Imagem + Texto** | Scaffold usa `{{overlay_opacity}}` que a IA pode não preencher corretamente. `{{text_color}}` existe mas falta `{{accent_color}}` para o CTA. Sem botão visual — só texto plain para CTA. | Adicionar `{{accent_color}}` para CTA, simplificar overlay para valor fixo seguro, adicionar botão visual ao CTA. |
| 4 | **Reels Cover** | Scaffold completo com safe zones corretas, MAS falta `{{bg_color}}` — usa overlay genérico. Sem `{{accent_color}}`. Play icon é legal mas é estático. Prompt não menciona cores do briefing. | Adicionar `{{accent_color}}` para headline, incluir instrução no prompt para usar cores do briefing. |

### REMOVER (3)

| # | Template | Motivo |
|---|----------|--------|
| 1 | **Banner — Só Imagem** (`banner-image-only`) | Sem scaffold, sem system_prompt. `generation_type: image_only` com prompt genérico `"Imagem {{visual_style}} para post..."`. Redundante — qualquer template `html_and_image` já gera imagem. Sem valor agregado, confunde o usuário. |
| 2 | **Carrossel de Imagens** (`carousel-images`) | Sem scaffold, sem system_prompt. `generation_type: image_only`. Prompt de imagem genérico. Gerar 3-5 imagens sem HTML não é carrossel — é uma galeria sem contexto. Sem identidade visual, sem texto, sem CTA. |
| 3 | **Story Interativo** (`story-interativo`) | O conceito é bom (enquete/quiz), mas a execução é uma imagem estática simulando interatividade. No Instagram real, o valor dos stories interativos vem dos stickers nativos (enquete, quiz, slider). Uma imagem PNG simulando isso não tem funcionalidade real — engana o usuário. Se mantiver, precisa repensar completamente o propósito (ex: usar como teaser "responda nos stories"). |

## Plano de Implementação

### 1. Migration SQL
- Desativar (`active = false`) os 3 templates a remover
- Não deletar — manter para assets já gerados com eles

### 2. Atualizar scaffolds dos 4 templates "melhorar"
- `carousel-antes-depois`: `#0a0a0a` → `{{bg_color}}`
- `post-cta-direto`: adicionar `{{bg_color}}`, melhorar prompt
- `feed-image-text`: adicionar `{{accent_color}}` no CTA, simplificar overlay
- `reels-cover`: adicionar `{{accent_color}}`, atualizar prompt

### 3. Atualizar prompts
- Enriquecer system_prompt dos 4 templates com instruções explícitas de uso de cores do briefing

### Arquivos modificados
- **Migration SQL** — desativar 3 templates + atualizar scaffolds e prompts dos 4 templates

