

# Formulário de geração IA com controles avançados

## Resumo

Substituir o mini-dropdown atual do "Gerar com IA" por um painel/dialog com campos configuráveis antes de gerar.

## O que o usuário vai ver

Ao clicar em "Gerar com IA", abre um dialog com:

1. **Finalidade** — select: Orgânico / Ads / Ambos (já existe, muda de dropdown pra campo no dialog)
2. **Etapas do funil** — checkboxes: Topo / Meio / Fundo (default: todas marcadas)
3. **Quantidade** — input numérico: quantos copies gerar (default: 6, máx: 20)
4. **Assunto / Dor** — textarea opcional: "Ex: insegurança sobre investimentos", "dor de quem não tem tempo de cozinhar"

Botão "Gerar" no rodapé do dialog dispara a geração.

## Mudanças técnicas

### `CopiesTab.tsx`
- Remover o dropdown inline de purpose
- Adicionar state para o dialog de geração (`showGenDialog`)
- Novo estado com os 4 campos: `genPurpose`, `genFunnelStages`, `genQuantity`, `genTopic`
- Dialog usando componentes existentes (Dialog, Checkbox, Input, Textarea, Select)
- Ao confirmar, chama `handleAIGenerate` passando os novos parâmetros

### `generate-copies/index.ts`
- Aceitar novos parâmetros: `quantity` (number), `topic` (string opcional)
- Usar `quantity` no prompt: "Gere no máximo {quantity} copies"
- Se `topic` informado, adicionar ao prompt: `ASSUNTO/DOR ESPECÍFICA: {topic}. Todas as copies devem abordar esse tema/dor.`
- `funnel_stages` já é recebido mas hoje é hardcoded no front — passa a ser dinâmico

### Arquivos modificados
- **`src/components/activation/CopiesTab.tsx`** — dialog de configuração substituindo dropdown
- **`supabase/functions/generate-copies/index.ts`** — parâmetros `quantity` e `topic`

