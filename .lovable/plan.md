

# Revisar Templates + Adicionar Previews + Regra de Sangria 135px

## Problemas encontrados nos templates

Após revisar os 13 templates contra as specs do relatório Instagram 2026:

### Erros críticos de dimensão/prompt
1. **Post Feed — Imagem + Texto** (`feed-image-text`): system_prompt diz "1080x1080px" mas a tabela tem 1080x1350. Prompt desatualizado e genérico demais.
2. **Story — Texto sobre Gradiente** (`story-gradient-text`): prompt muito curto, sem menção a safe zones (250px topo, 340px base).
3. **Story Interativo** (`story-interativo`): safe zones dizem "15% topo, 20% base" — correto seria 250px e 340px conforme spec.
4. **Reels Cover** (`reels-cover`): safe zone diz "15% superior e 20% inferior" — deveria ser 250px e 340px em pixels.
5. **Carrossel Estilo Twitter** (`carousel-twitter-style`): prompt genérico, sem regras de safe zone ou sangria.

### Regra de sangria 135px (feed 4:5)
Para todos os templates 1080x1350 (feed/carrossel), o conteúdo deve respeitar 135px de margem superior e inferior. Isso garante que o conteúdo não seja cortado pelo "ver mais" e pelo preview do grid (que agora é 3:4).

O `HTML_CREATIVE_RULES` já tem "padding: 120px 80px" para 4:5 — precisa ser atualizado para **135px vertical**.

## Plano de implementação

### 1. Atualizar `HTML_CREATIVE_RULES` no edge function
- Mudar safe zone 4:5 de `padding: 120px 80px` para `padding: 135px 80px`
- Adicionar nota explícita: "Para 1080x1350: sangria de 135px acima e abaixo — nenhum conteúdo crítico nessa faixa"

### 2. Migration SQL para corrigir templates
Atualizar `system_prompt` dos seguintes templates:

- **feed-image-text**: corrigir "1080x1080px" → "1080x1350px", adicionar regras de safe zone e sangria 135px
- **story-gradient-text**: expandir prompt com safe zones 250px/340px e regras visuais
- **story-interativo**: corrigir safe zones para 250px/340px em pixels
- **reels-cover**: corrigir safe zones para 250px/340px em pixels
- **carousel-twitter-style**: adicionar regras de safe zone e sangria 135px
- **Todos os carrosseis 1080x1350**: mencionar sangria 135px explicitamente nos prompts

### 3. Adicionar preview HTML nos cards de template (`SettingsTemplates.tsx`)
Cada card de template mostrará uma miniatura visual representativa:

- Renderizar um mini-preview estático em HTML/CSS no espaço de thumbnail (100px de altura)
- Mostrar um esquema visual simplificado do layout (wireframe): retângulo com linhas representando headline, body, CTA, proporção correta
- Usar as cores do template (fundo escuro, accent) para dar identidade
- Mostrar dimensão e proporção visualmente (ex: retângulo 4:5 ou 9:16 proporcional)
- Para carrosséis, mostrar múltiplos mini-cards lado a lado

### Arquivos modificados
- `supabase/functions/generate-asset-from-template/index.ts` — atualizar `HTML_CREATIVE_RULES` (sangria 135px)
- Migration SQL — atualizar `system_prompt` de 6 templates
- `src/pages/SettingsTemplates.tsx` — adicionar previews visuais nos cards

