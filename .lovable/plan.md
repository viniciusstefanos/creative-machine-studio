

# Incorporar Instruções do Agente Criativo nos Prompts de IA

## O que será feito

Incorporar o documento `agente_criacao_conteudo.md` como system prompt / contexto base nas duas edge functions que usam IA para gerar conteúdo:

1. **`generate-copies`** — geração de copies de marketing
2. **`generate-asset-from-template`** — geração de HTML e prompts de imagem

O documento contém regras criativas validadas (hooks, estrutura de carrossel, CTA, métricas de referência, etc.) que devem guiar a IA na produção de conteúdo mais estratégico e profissional.

---

## Alterações

### 1. Edge Function `generate-copies/index.ts`

Substituir o system prompt genérico atual por um prompt rico baseado no documento:

- **Identidade**: copywriter de performance + diretor criativo (não apenas redator)
- **Regras de hook**: incorporar os 6 tipos validados (curiosidade, contrarian, prova social, problema direto, antes/depois, urgência)
- **Estrutura por formato**: post feed vs carrossel vs story vs ad — cada um com regras específicas
- **Funil**: instruções claras por etapa (topo = hook emocional, meio = interativo, fundo = prova + CTA direto)
- **Anti-patterns**: nunca começar com nome da marca, nunca CTA genérico, nunca copy que serve para qualquer marca
- **Especificidade > generalidade**: detalhes sensoriais e concretos
- **CTA fecha o loop do hook**
- **Máx 2 linhas de texto visível** em peças visuais
- **Métricas de referência** como contexto (CTR 1.87% Reels, etc.)

O prompt será uma constante `CREATIVE_AGENT_SYSTEM_PROMPT` no topo do arquivo (~800 chars resumidos das regras mais impactantes).

### 2. Edge Function `generate-asset-from-template/index.ts`

Enriquecer os prompts de geração de HTML e otimização de imagem:

- **HTML generation**: adicionar regras de hierarquia visual (máx 2 linhas texto, safe zone 15-85% em 9:16, contraste obrigatório, nunca começar com logo)
- **Image prompt optimization**: incorporar diretrizes visuais (UGC-style > polido, rosto na câmera +35% conversão, lo-fi/analog como tendência, lifestyle > produto isolado)
- **Carrossel**: slide 1 = gancho (não título de relatório), slides do meio = 1 ponto por slide (máx 3 linhas), último = CTA

### 3. Salvar documento como memória do projeto

Copiar `agente_criacao_conteudo.md` para `mem://features/creative-agent` para referência futura e consistência entre sessões.

---

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-copies/index.ts` | System prompt enriquecido com regras criativas |
| `supabase/functions/generate-asset-from-template/index.ts` | Prompts de HTML e imagem com diretrizes visuais |
| `mem://features/creative-agent` | Novo — referência do documento |
| `mem://index.md` | Atualizar com link para novo memory |

