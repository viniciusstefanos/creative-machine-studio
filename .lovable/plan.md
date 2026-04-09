

# Melhorar Qualidade dos Templates — Pipeline de Criação e Geração

## Diagnóstico

Analisei o pipeline completo: `generate-template` (cria scaffold) → `generate-asset-from-template` (gera peça final). Os problemas:

1. **Contradição de fontes**: `generate-template` diz "Não use `<link>`, use system fonts" — mas `generate-asset-from-template` exige Google Fonts via `<link>`. Templates criados via IA nascem sem suporte a fontes customizadas.

2. **Scaffold sem variáveis de cor**: O prompt do `generate-template` menciona `{{brand_color}}` genérico, mas o pipeline de geração espera `{{bg_color}}`, `{{accent_color}}`, `{{text_color}}`. Templates criados pela IA não terão essas variáveis.

3. **System prompt gerado é fraco**: O `generate-template` pede um `system_prompt` genérico. Deveria incluir instruções de cores do briefing, safe zones, e as regras visuais que já existem no `HTML_CREATIVE_RULES`.

4. **Sem referência ao HTML_CREATIVE_RULES**: A IA que cria o template não conhece as regras de layout, safe zones, tipografia mínima etc. que a IA de geração vai seguir. Resultado: scaffolds incompatíveis.

5. **editable_fields genérico**: Não inclui campos de cor obrigatórios (`bg_color`, `accent_color`, `text_color`) por padrão.

## Solução

### 1. Atualizar `generate-template` Edge Function

- Injetar um subset das `HTML_CREATIVE_RULES` no system prompt para que scaffolds sigam as mesmas regras de safe zones, tipografia e cores
- Trocar "Não use `<link>`" por "Use Google Fonts via `<link>`" — alinhado com o pipeline de geração
- Substituir `{{brand_color}}` por `{{bg_color}}`, `{{accent_color}}`, `{{text_color}}` como variáveis padrão
- Exigir que `editable_fields` sempre inclua campos de cor (`bg_color`, `accent_color`, `text_color`) com defaults
- Incluir instrução para o `system_prompt` gerado referenciar cores do briefing

### 2. Atualizar `TemplateEditorDialog.tsx`

- Após IA gerar, validar se `editable_fields` contém os 3 campos de cor. Se não, adicionar automaticamente com defaults
- Mostrar warning se scaffold não contém `{{bg_color}}` ou `{{accent_color}}`

### 3. Melhorar prompt de refinamento (modo edit)

- Quando o usuário refina um template existente, enviar o scaffold atual + as regras visuais para que a IA mantenha consistência

## Detalhes técnicos

### Arquivos modificados
- **`supabase/functions/generate-template/index.ts`** — injetar HTML_CREATIVE_RULES subset, corrigir variáveis de cor, exigir editable_fields com cores
- **`src/components/ui/TemplateEditorDialog.tsx`** — auto-adicionar campos de cor ausentes, warning visual

