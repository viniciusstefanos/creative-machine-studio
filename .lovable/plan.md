

# Implementar Auth com Google — Máquina Criativa

## Visão Geral
Configurar Supabase no projeto e implementar autenticação via Google OAuth, com tela de login dark seguindo o design system definido.

## Pré-requisito: Supabase
O projeto ainda não tem Supabase integrado. Será necessário habilitar o Lovable Cloud ou conectar um projeto Supabase externo para ter auth + banco de dados.

---

## O que será implementado

### 1. Setup Supabase
- Instalar `@supabase/supabase-js`
- Criar client Supabase em `src/integrations/supabase/client.ts`

### 2. Design System Global
- Adicionar as variáveis CSS customizadas (backgrounds, borders, accent, text, status) ao `index.css`
- Importar fontes Syne, DM Sans e JetBrains Mono no `index.html`
- Sobrescrever variáveis shadcn para o tema dark

### 3. Contexto de Auth
- Criar `src/contexts/AuthContext.tsx` com `onAuthStateChange` + `getSession`
- Provider no `App.tsx` envolvendo todas as rotas
- Hook `useAuth()` para acessar sessão/usuário

### 4. Tela de Login (`/login`)
- Layout centralizado, fundo `--bg-base`
- Logo "Máquina Criativa" em Syne bold, cor accent
- Botão "Entrar com Google" estilizado (botão primário accent)
- Chama `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Redireciona para `/` após login

### 5. Proteção de Rotas
- Componente `ProtectedRoute` que redireciona para `/login` se não autenticado
- Rota `/login` redireciona para `/` se já autenticado

### 6. Tabela `profiles`
- Criar via migration: `id (uuid, FK auth.users)`, `email`, `full_name`, `avatar_url`, `role (admin/team)`, `created_at`
- Trigger para auto-criar perfil no signup
- RLS: usuário lê/atualiza próprio perfil, admin lê todos

---

## Detalhes Técnicos

### Arquivos criados/modificados
| Arquivo | Ação |
|---------|------|
| `index.html` | Adicionar fontes Google |
| `src/index.css` | Variáveis CSS do design system |
| `src/integrations/supabase/client.ts` | Cliente Supabase |
| `src/contexts/AuthContext.tsx` | Context + Provider de auth |
| `src/components/ProtectedRoute.tsx` | Guarda de rotas |
| `src/pages/Login.tsx` | Tela de login com Google |
| `src/App.tsx` | Integrar provider e rotas |
| Migration SQL | Tabela profiles + trigger + RLS |

### Fluxo
```text
/login → Botão Google → Supabase OAuth → Redirect → / (Dashboard)
                                                    ↓
                                              AuthContext verifica sessão
                                              Cria perfil automaticamente
```

