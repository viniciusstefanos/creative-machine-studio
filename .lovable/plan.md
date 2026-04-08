# Melhorar Fluxo de Aprovação de Peças

## Problemas Atuais
1. Após aprovar, o usuário fica na mesma página e precisa clicar "Próxima peça →" manualmente
2. Sem indicador claro de progresso (quantas faltam revisar)
3. Sem atalhos de teclado para agilizar revisão em massa
4. Ao rejeitar sem feedback, precisa de 2 cliques (Rejeitar → confirmar)

## Solução

### 1. Navegação automática após aprovação
Após aprovar, dispara o render em background e **navega automaticamente** para a próxima peça com status `review`. Se não houver mais pendentes, redireciona para a listagem com toast "🎉 Todas as peças foram revisadas!".

### 2. Atalhos de teclado
- `A` = Aprovar (quando status é `review`)
- `R` = Abrir campo de rejeição
- `→` = Próxima peça
- `←` = Peça anterior

### 3. Progress bar no header
Badge estilo "3 de 8 revisadas" com barra de progresso visual, substituindo o contador atual simples.

### 4. Rejeição rápida
Botão "Rejeitar e próxima →" disponível direto (sem precisar abrir campo de feedback primeiro). Feedback vira opcional inline.

### 5. Toast com contexto
Após aprovar: "Peça aprovada ✓ — 3 de 8 revisadas. Renderizando PNGs..."

## Arquivos modificados
- `src/pages/AssetDetail.tsx` — navegação automática, atalhos, progress bar, rejeição rápida
