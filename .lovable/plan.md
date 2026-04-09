

# Cadastro de Perfil Social por Ativação

## Problema
Templates que exibem foto de perfil, nome e @handle usam dados genéricos ou vazios. Não há cadastro para essas informações, e a Edge Function de geração não as injeta no prompt.

## Solução

### 1. Migration — Novos campos na tabela `activations`

Adicionar 3 colunas à tabela `activations`:
- `social_display_name` (text, nullable) — nome de exibição no perfil
- `social_handle` (text, nullable) — @handle (ex: `@meucliente`)
- `social_avatar_url` (text, nullable) — URL da foto de perfil

### 2. UI — Formulário de criação/edição de ativação

No `NewActivation.tsx`, adicionar seção "Perfil Social" com 3 campos:
- Nome de exibição (text input)
- @Handle (text input com placeholder `@perfil`)
- Foto de perfil (upload ou URL) — upload para bucket `assets` (já público)

Auto-preencher com dados do `client_meta_accounts` (se existir `instagram_username`), mas permitir edição.

### 3. Edge Function — Injetar dados no prompt

No `generate-asset-from-template/index.ts`:
- Buscar `social_display_name`, `social_handle`, `social_avatar_url` da ativação (já temos o `activation_id`)
- Adicionar instrução ao prompt:

```
## PERFIL SOCIAL (OBRIGATÓRIO nos templates que exibem perfil)
Nome: {social_display_name}
Handle: {social_handle}
Foto de perfil URL: {social_avatar_url}
Quando o template incluir avatar, nome de perfil ou @handle, use EXATAMENTE estes dados.
NÃO invente nomes de perfil ou handles fictícios.
```

- Se `social_avatar_url` existir, instruir o HTML a usar `<img src="{url}">` em vez de placeholder

### 4. Edição posterior

Na página da ativação (`ActivationHub`), permitir editar os dados de perfil social na aba de Brief ou em uma seção dedicada.

## Arquivos modificados

- **Migration SQL** — 3 colunas em `activations`
- **`src/pages/NewActivation.tsx`** — campos de perfil social no formulário, auto-fill do client_meta_accounts
- **`supabase/functions/generate-asset-from-template/index.ts`** — buscar dados de perfil e injetar no prompt
- **`src/pages/ActivationHub.tsx`** ou **`src/components/activation/BriefTab.tsx`** — edição dos dados de perfil social

