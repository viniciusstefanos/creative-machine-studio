

# Templates globais em popover discreto

## Problema
A lista de templates globais com switches ocupa muito espaço vertical na página do cliente, poluindo a view principal.

## Solução
Mover a lista de toggles para um Popover (ou Dialog compacto) acionado por um botão "Gerenciar globais". A seção principal mostra apenas os templates exclusivos do cliente + um resumo tipo "X de Y templates globais ativos".

## Mudanças em `ClientTemplates.tsx`

1. **Substituir a lista inline** de templates globais por uma linha resumo:
   - Texto: `"8 de 12 templates globais ativos"` (contagem dinâmica)
   - Botão discreto: `"Gerenciar"` que abre um Popover

2. **Popover** (usando o `Popover` existente do projeto):
   - Largura ~320px, max-height com scroll
   - Lista compacta: cada item com Switch + nome + dimensão em uma linha
   - Sem preview visual (manter leve)

3. **Layout final da seção**:
   ```text
   Templates                    [+ Template exclusivo]
   ─────────────────────────────────────────────────
   Exclusivos deste cliente (cards com preview, como hoje)
   
   8 de 12 globais ativos       [Gerenciar ▾]
   ```

## Arquivo modificado
- `src/components/client/ClientTemplates.tsx` — substituir lista inline por resumo + Popover

