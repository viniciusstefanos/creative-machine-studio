

# Plano de Melhoria — Navegacao e UX entre Etapas

## Problemas Identificados

### 1. Navegacao sem retorno claro
- `AssetDetail` nao tem botao "Voltar" para a lista de pecas. O usuario fica preso.
- `CopyDetail` tem botao voltar mas usa inline styles inconsistentes.
- Apos gerar peca (`NewAsset`), o usuario e redirecionado para `AssetDetail` mas nao consegue voltar facilmente ao hub.

### 2. Fluxo morto apos acoes
- Apos **aprovar** um copy em `CopyDetail`, nada acontece — o usuario fica na mesma tela sem orientacao do proximo passo ("Agora crie pecas").
- Apos **aprovar** uma peca em `AssetDetail`, ha botao "Agendar" mas nenhuma indicacao visual de progresso.
- Apos **rejeitar** um copy, nao ha link para voltar e gerar nova versao.

### 3. WorkflowProgress desconectado
- O `WorkflowProgress` aparece no hub mas desaparece ao entrar em `CopyDetail` ou `AssetDetail`. O usuario perde nocao de onde esta no fluxo.
- Tabs no hub usam `hsl(var(--text-primary))` enquanto o WorkflowProgress usa `var(--text-primary)` — mistura de formatos CSS.

### 4. Empty states sem direcao
- `AssetsTab` e `ScheduleTab` mostram links para etapa anterior mas sem contexto de progresso geral.
- `CopiesTab` empty state nao menciona quantos copies a IA vai gerar.

### 5. Inconsistencia de design system
- `CopiesTab`, `AssetsTab`, `ScheduleTab` usam inline `style={{...}}` em vez das classes CSS do design system (`card-base`, `field-label`, `text-mono-label`, etc.) — ja corrigido em `NewAsset` e `SettingsTemplates` mas nao propagado.
- `CopyDetail` usa `hsl(var(--...))` em muitos lugares — deveria usar classes.

### 6. Mobile: stepper do NewAsset nao responsivo
- Labels do stepper quebram em telas pequenas. Nao ha versao compacta.

---

## Alteracoes Propostas

### A. Adicionar "Next Step Bar" contextual (todas as paginas de detalhe)

Componente `NextStepBar` — barra fixa no topo ou abaixo do header que mostra:
- Onde o usuario esta no workflow (mini breadcrumb visual)
- Acao principal sugerida ("Proximo: criar pecas", "Proximo: agendar")
- Botao para avancar para proxima etapa

Aparece em: `CopyDetail` (apos aprovar), `AssetDetail` (apos aprovar), `NewAsset` (no final).

### B. Botao "Voltar" consistente em todas as paginas de detalhe

- `AssetDetail`: adicionar botao voltar para `/activations/{id}/assets`
- Padronizar estilo usando `Button variant="ghost"` com icone `ArrowLeft`

### C. Toasts com acao apos aprovar/rejeitar

- Aprovar copy: toast com botao "Criar peca →"
- Aprovar peca: toast com botao "Agendar →"  
- Rejeitar: toast com botao "Voltar para lista"

### D. Migrar tabs do hub para classes do design system

- `CopiesTab`: substituir inline styles por `card-base`, `card-interactive`, `field-label`, `text-mono-label`
- `AssetsTab`: idem
- `ScheduleTab`: idem
- `CopyDetail`: substituir `hsl(var(--...))` por classes CSS existentes

### E. Stepper responsivo no NewAsset

- Em mobile: mostrar apenas step atual + numero / total
- Esconder labels, manter apenas circulos numerados

### F. WorkflowProgress mini nas paginas de detalhe

- Adicionar versao compacta (apenas circulos + linha) no header de `CopyDetail` e `AssetDetail` para manter contexto de progresso

---

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/components/activation/NextStepBar.tsx` | Novo — barra contextual de proximo passo |
| `src/pages/AssetDetail.tsx` | Botao voltar + NextStepBar + toasts com acao |
| `src/pages/CopyDetail.tsx` | NextStepBar + toasts com acao + migrar para classes CSS |
| `src/pages/NewAsset.tsx` | Stepper responsivo mobile |
| `src/components/activation/CopiesTab.tsx` | Migrar inline styles para classes do design system |
| `src/components/activation/AssetsTab.tsx` | Migrar inline styles para classes do design system |
| `src/components/activation/ScheduleTab.tsx` | Migrar inline styles para classes do design system |
| `src/components/activation/WorkflowProgress.tsx` | Extrair versao compacta para uso em paginas de detalhe |

