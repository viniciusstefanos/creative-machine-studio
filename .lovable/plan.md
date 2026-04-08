

# Plano de ação para melhorar o app Máquina Criativa

## Diagnóstico atual

O app já tem o fluxo core funcional: Clientes → Ativações → Brief → Copies (org/ads) → Peças → Campanhas Meta → Agendamento → Métricas. Principais gaps identificados:

---

## Melhorias organizadas por prioridade

### P0 — Estabilidade e confiabilidade

1. **Loading states e error handling globais** — Hoje os componentes usam `useState(true)` para loading e não tratam erros de fetch. Criar um padrão com skeleton loaders e toast de erro automático quando queries falham.

2. **Tipagem forte** — Muitos `any` espalhados (activations, assets, copies, posts). Criar interfaces tipadas a partir do schema do banco e eliminar `any`.

3. **React Query em todo o app** — React Query está instalado mas quase nenhuma página usa. Hoje tudo é `useEffect` + `useState` manual sem cache, sem refetch automático, sem optimistic updates. Migrar para `useQuery`/`useMutation` traz cache, retry, loading/error states automáticos.

### P1 — UX e usabilidade

4. **Busca global** — Não existe busca. Adicionar um command palette (Cmd+K) para navegar rapidamente entre clientes, ativações, copies e peças.

5. **Empty states acionáveis** — Vários empty states são texto solto. Transformar em CTAs claros que guiam o próximo passo (ex: "Nenhuma copy ainda → Gerar com IA").

6. **Feedback de progresso em operações longas** — Geração de copies, upload de peças e publicação Meta podem demorar. Adicionar progress bars ou indicadores de step (ex: "Gerando 3/6...").

7. **Mobile responsivo** — Sidebar já tem hamburger, mas tabelas (AssetsTab, ScheduleTab) não são responsivas. Adaptar para cards em mobile.

### P2 — Funcionalidades de produto

8. **Duplicar ativação** — Poder clonar uma ativação inteira (brief, copies, configurações) como template para reuso.

9. **Histórico de versões de copy** — Ao regenerar um bloco (hook/body/cta), guardar a versão anterior para poder reverter.

10. **Dashboard por cliente** — Hoje o dashboard é global. Adicionar métricas consolidadas na página do cliente (volume, performance, investimento).

11. **Notificações em tempo real** — Usar Supabase Realtime para atualizar o badge de notificações sem reload.

### P3 — Performance e polish

12. **Lazy loading de rotas** — Todas as páginas carregam no bundle inicial. Usar `React.lazy()` + Suspense para code splitting.

13. **Paginação** — Listas de copies, assets e métricas carregam tudo de uma vez (limit 1000). Implementar paginação ou infinite scroll.

14. **Animações de transição** — Adicionar micro-animações nas transições de tab, cards e dialogs para dar mais fluidez.

---

## Sugestão de execução

Começar por **P0** (estabilidade) porque melhora a base de tudo. Depois **P1** (UX) que tem impacto direto no dia a dia. **P2** e **P3** conforme demanda.

Posso implementar qualquer item — qual quer priorizar?

