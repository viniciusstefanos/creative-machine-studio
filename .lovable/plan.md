

# Agendamento em massa + Subir anúncios em massa

## Resumo

Duas funcionalidades novas acessíveis via botões "em massa" nas abas Agenda e Campanhas:

1. **Agendar em massa** — selecionar múltiplas peças aprovadas, definir data inicial/final e horário, e distribuir automaticamente os posts ao longo dos dias
2. **Subir anúncios em massa** — selecionar múltiplas peças aprovadas e subir todas de uma vez a uma campanha existente (já funciona no `AddAdsToCampaignDialog`, mas precisa de UX melhor para seleção em massa)

## 1. Novo componente: `BulkScheduleDialog`

Dialog com o fluxo:

1. **Selecionar peças** — lista assets aprovados com thumbnail (checkbox multi-select, botão selecionar/limpar tudo)
2. **Configurar distribuição**:
   - Data início e data fim
   - Horários preferidos (ex: 09:00, 12:00, 18:00 — seleção múltipla)
   - Canal (instagram_feed, reels, stories)
   - Algoritmo: distribui N peças nos dias disponíveis, rotacionando pelos horários selecionados
3. **Preview** — mostra lista dos agendamentos que serão criados (data/hora + peça) antes de confirmar
4. **Confirmar** — insere todos os `scheduled_posts` de uma vez

### Lógica de distribuição

```text
Exemplo: 6 peças, 3 dias (10-12 abril), horários [09:00, 18:00]
→ 10/04 09:00 — Peça 1
→ 10/04 18:00 — Peça 2
→ 11/04 09:00 — Peça 3
→ 11/04 18:00 — Peça 4
→ 12/04 09:00 — Peça 5
→ 12/04 18:00 — Peça 6
```

Se há mais peças que slots, concentra mais por slot. Se há menos, distribui uniformemente.

### Caption automático

Para cada peça, puxa o `full_copy` da copy associada (mesma lógica do `SchedulePostDialog`).

## 2. Botão na `ScheduleTab`

Adicionar botão "Agendar em massa" ao lado do "Agendar post" existente.

## 3. Melhorar `AddAdsToCampaignDialog` para UX em massa

O componente já suporta multi-select de peças. Ajustes:
- Adicionar botões "Selecionar tudo" / "Limpar"
- Mostrar progresso durante submissão (X de Y subidos)
- Feedback visual por peça (check verde / erro vermelho)

## Arquivos modificados

- **`src/components/activation/BulkScheduleDialog.tsx`** — novo componente
- **`src/components/activation/ScheduleTab.tsx`** — botão para abrir o bulk dialog
- **`src/components/activation/AddAdsToCampaignDialog.tsx`** — melhorias de UX (select all, progresso)

Nenhuma migration necessária — usa a tabela `scheduled_posts` existente.

