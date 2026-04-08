

# Edição avançada de Templates + IA + Escopo por cliente

## Resumo

Transformar a página de Templates de uma lista estática em um editor completo com criação via IA, extração de referência por imagem, e controle de visibilidade por cliente.

---

## 1. Migration: escopo de templates por cliente

Hoje `asset_templates` não tem vínculo com cliente. Adicionar:

```sql
ALTER TABLE asset_templates ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE asset_templates ADD COLUMN visibility text DEFAULT 'global';
-- visibility: 'global' (todos), 'client_only' (só o cliente dono)
```

Nova tabela de associação para controlar quais templates globais estão habilitados por cliente:

```sql
CREATE TABLE client_template_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  template_id uuid NOT NULL,
  enabled boolean DEFAULT true,
  UNIQUE(client_id, template_id)
);
ALTER TABLE client_template_settings ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated can read/insert/update
```

Lógica: ao criar peça, filtrar templates por `(visibility = 'global' AND enabled para o client) OR (client_id = X)`.

## 2. Editor/Criador de Template — Dialog completo

Substituir o botão "Novo template" (hoje disabled) por um dialog wizard com 3 modos de criação:

**Modo 1 — Manual**: formulário com campos: nome, categoria (static/carousel), aspect ratio, generation_type, html_scaffold (editor de código), system_prompt, image_prompt_template, editable_fields (JSON), cliente (opcional).

**Modo 2 — IA a partir de descrição**: campo de texto livre (ex: "carrossel minimalista com fundo gradiente, 5 slides, tipografia bold"). Chama edge function que gera o `html_scaffold` + `system_prompt` + `editable_fields` via IA.

**Modo 3 — Extrair de imagem de referência**: upload de imagem. Edge function envia a imagem para modelo multimodal que analisa layout, cores, tipografia e gera um template HTML equivalente.

### Campos do formulário

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | text | Sim |
| Categoria | select (static/carousel) | Sim |
| Aspect ratio | select (4:5, 9:16, 1:1) | Sim |
| Tipo de geração | select (html_only, image_only, html_and_image) | Sim |
| Slides min/max | number (só carousel) | Sim |
| HTML scaffold | code editor (textarea tall) | Não (IA preenche) |
| System prompt | textarea | Não (IA preenche) |
| Image prompt template | textarea | Não |
| Editable fields | JSON editor | Não |
| Cliente | select (opcional) | Não |
| Visibilidade | select (global / exclusivo cliente) | Sim |
| Descrição | textarea | Não |

### Preview ao vivo

Ao editar o HTML scaffold, renderizar preview em tempo real usando iframe sandboxed (mesmo approach do `HtmlVisualEditor` existente).

## 3. Edge function: `generate-template`

Nova edge function que recebe:
- `mode`: "from_description" ou "from_image"
- `description`: texto descritivo (modo descrição)
- `image_url`: URL da imagem de referência (modo imagem)
- `category`, `aspect_ratio`, `generation_type`

Retorna: `{ html_scaffold, system_prompt, editable_fields, image_prompt_template }`

Para modo imagem: envia a imagem ao modelo multimodal com prompt pedindo análise de layout, cores, tipografia, e geração de HTML equivalente.

## 4. Controle por cliente na página do cliente

Na `ClientDetail.tsx`, adicionar seção "Templates" que mostra:
- Templates globais com toggle on/off (gerencia `client_template_settings`)
- Templates exclusivos do cliente (com opção de criar novo)

## 5. Filtro no NewAsset

Em `NewAsset.tsx`, ao carregar templates, filtrar:
1. Templates com `visibility = 'global'` que estão enabled para o `client_id` da ativação (ou sem entry em `client_template_settings`, default enabled)
2. Templates com `client_id = client_id` da ativação

## 6. Edição de template existente

Na `SettingsTemplates.tsx`, ao clicar num template custom, abrir o mesmo dialog em modo edição. Permitir editar HTML scaffold, prompts, campos editáveis. Botão "Refinar com IA" que pega o scaffold atual + instrução e gera versão melhorada.

---

## Arquivos modificados

- **Migration SQL** — `client_id` + `visibility` em `asset_templates`, tabela `client_template_settings`
- **`supabase/functions/generate-template/index.ts`** — nova edge function
- **`src/pages/SettingsTemplates.tsx`** — dialog de criação/edição com 3 modos
- **`src/pages/NewAsset.tsx`** — filtro de templates por cliente
- **`src/pages/ClientDetail.tsx`** — seção de templates por cliente
- **`src/components/ui/TemplateEditorDialog.tsx`** — novo componente do editor

