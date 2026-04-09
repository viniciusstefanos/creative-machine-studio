

# Engenharia de Prompts — Painel de Controle

## Diagnóstico: 10 prompts hardcoded em 5 edge functions

| Prompt | Arquivo | Função |
|--------|---------|--------|
| `BRIEF_SYSTEM_PROMPT` | `_shared/brief-system-prompt.ts` | Regras invioláveis de briefing (base de todos) |
| `DEEP_EXTRACTION_SCHEMA` | `_shared/brief-system-prompt.ts` | Schema JSON para extração de dados do brief |
| `BASE_SYSTEM_PROMPT` (copy) | `generate-copies/index.ts` | Prompt do diretor criativo para copies |
| `ORGANIC_RULES` | `generate-copies/index.ts` | Regras específicas para copy orgânico |
| `ADS_RULES` | `generate-copies/index.ts` | Regras específicas para copy de ads |
| `HTML_CREATIVE_RULES` | `generate-asset-from-template/index.ts` | Regras visuais para geração de peças HTML |
| `IMAGE_CREATIVE_RULES` | `generate-asset-from-template/index.ts` | Diretrizes de imagem/fotografia |
| `TEMPLATE_DESIGN_RULES` | `generate-template/index.ts` | Regras para criação de scaffolds de templates |
| `EXTRACTION_SYSTEM` | `extract-brief/index.ts` | Prompt de extração de dados do brief |
| `REGEN_COPY_PROMPT` | `regenerate-copy-block/index.ts` | Prompt de regeneração de bloco individual de copy |

---

## Arquitetura

### 1. Tabela `prompt_templates`

```sql
CREATE TABLE prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,        -- ex: "brief_system", "copy_base", "ads_rules"
  name text NOT NULL,                -- ex: "Regras de Briefing"
  category text NOT NULL,            -- "briefing" | "copy" | "peças" | "templates"
  description text,                  -- explicação do que faz
  content text NOT NULL,             -- o prompt em si
  is_system boolean DEFAULT true,    -- prompts do sistema vs custom
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
```

Seed com os 10 prompts atuais. RLS: leitura para authenticated, escrita para admins.

### 2. Edge functions leem do banco

Cada function faz um `SELECT content FROM prompt_templates WHERE slug = 'xxx'` no início, com fallback para o valor hardcoded atual (segurança se o banco falhar).

```text
Request → Edge Function
            ├── SELECT prompt FROM prompt_templates WHERE slug = '...'
            ├── fallback → constante hardcoded original
            └── usa prompt do banco
```

### 3. Página `/settings/prompts`

- Sidebar: ícone engrenagem → "Prompts IA"
- Lista agrupada por categoria (Briefing, Copies, Peças, Templates)
- Cada prompt: card expansível com nome, descrição, textarea editável
- Botão "Salvar" + "Restaurar padrão" por prompt
- Badge "Editado" quando difere do original
- Preview do prompt final montado (com variáveis expandidas)

```text
┌─────────────────────────────────────────────┐
│ ⚙ Engenharia de Prompts                    │
├─────────────────────────────────────────────┤
│ ▸ Briefing                                  │
│   ├ Regras de Briefing (base)        [edit] │
│   ├ Extração de Dados                [edit] │
│   └ Schema de Extração              [view]  │
│ ▸ Copies                                    │
│   ├ Diretor Criativo (base)          [edit] │
│   ├ Regras Orgânico                  [edit] │
│   ├ Regras Ads                       [edit] │
│   └ Regeneração de Bloco             [edit] │
│ ▸ Peças                                     │
│   ├ Regras Criativas HTML            [edit] │
│   └ Diretrizes de Imagem             [edit] │
│ ▸ Templates                                 │
│   └ Regras de Design                 [edit] │
└─────────────────────────────────────────────┘
```

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| **Migration SQL** | Criar tabela `prompt_templates` + seed 10 prompts + RLS |
| **`src/pages/SettingsPrompts.tsx`** | Nova página com editor de prompts |
| **`src/App.tsx`** | Adicionar rota `/settings/prompts` |
| **`src/components/layout/Sidebar.tsx`** | Adicionar link "Prompts IA" no menu |
| **`supabase/functions/_shared/brief-system-prompt.ts`** | Manter como fallback, exportar também slugs |
| **`supabase/functions/generate-copies/index.ts`** | Ler prompts do banco com fallback |
| **`supabase/functions/generate-asset-from-template/index.ts`** | Ler prompts do banco com fallback |
| **`supabase/functions/generate-template/index.ts`** | Ler prompts do banco com fallback |
| **`supabase/functions/extract-brief/index.ts`** | Ler prompts do banco com fallback |
| **`supabase/functions/regenerate-copy-block/index.ts`** | Ler prompts do banco com fallback |

### Padrão de leitura nas edge functions

```typescript
async function getPrompt(supabase, slug: string, fallback: string): Promise<string> {
  const { data } = await supabase
    .from("prompt_templates")
    .select("content")
    .eq("slug", slug)
    .single();
  return data?.content || fallback;
}
```

