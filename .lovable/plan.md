

# Próxima fase — Máquina Criativa

## Status atual

Já implementado: Auth Google, layout global, dashboard, clientes CRUD, ativações com hub de tabs (brief, copies, UTM, assets, campaigns, schedule, analytics), geração de copies com IA, tela de edição/aprovação de copy com comentários, notificações.

## O que falta (priorizado)

Baseado no checklist, os itens de maior impacto pendentes são:

### Batch 1 — Esta implementação

**1. Supabase Storage + Upload de brief (PDF/DOCX)**
- Criar bucket `briefs` no Storage
- Componente `FileDrop` (drag & drop) no BriefTab
- Upload do arquivo para Storage
- Edge Function `extract-brief` que usa Lovable AI (Gemini Flash) para extrair campos estruturados do texto
- Tela de revisão dos campos extraídos (campos vazios sinalizados em amarelo)

**2. Regeneração individual de bloco de copy com IA**
- Edge Function `regenerate-copy-block` que recebe bloco (hook/body/cta), feedback e contexto do brief
- Conectar os botões "Regenerar" do CopyBlock no CopyDetail
- Campo de feedback ao rejeitar bloco individual

**3. Página de Configurações — Time**
- Rota `/settings/team` com lista de usuários (profiles)
- Convidar usuário por email (Supabase Auth invite)
- Alterar role (admin/team)

**4. Página de Configurações — Formatos de Peça**
- Rota `/settings/formats` com lista de asset_formats por categoria
- CRUD de formatos (nome, slug, categoria, prompt_hint)
- Toggle ativo/inativo
- Seed com formatos padrão via migration

**5. Notification badges no header e sidebar**
- Dropdown de últimas 5 notificações no sino do header
- Badge numérico no sino

---

## Detalhes técnicos

| Item | Arquivos |
|------|----------|
| Storage + FileDrop | Migration (bucket), `src/components/ui/FileDrop.tsx`, `BriefTab.tsx` |
| Extract brief | `supabase/functions/extract-brief/index.ts` |
| Regenerate block | `supabase/functions/regenerate-copy-block/index.ts`, `CopyDetail.tsx`, `CopyBlock.tsx` |
| Settings Team | `src/pages/SettingsTeam.tsx`, `App.tsx` (rota) |
| Settings Formats | `src/pages/SettingsFormats.tsx`, `App.tsx` (rota), Migration (seed) |
| Notification badges | `Header.tsx`, `Sidebar.tsx` |

### Fluxo de extração de brief
```text
Upload PDF/DOCX → Storage → Edge Function
  → Lê arquivo do Storage
  → Extrai texto (text content)
  → Prompt Gemini Flash → JSON com campos
  → Retorna campos extraídos
  → UI mostra para revisão → Salva em briefs
```

