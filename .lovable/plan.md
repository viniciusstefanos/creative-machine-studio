

# Análise detalhada de melhorias nos Templates

## Estado atual — 13 templates ativos

| Template | Categoria | Ratio | Tipo geração | Scaffold HTML | Prompt IA | Campos editáveis | Prompt imagem |
|----------|-----------|-------|-------------|---------------|-----------|-----------------|---------------|
| Banner — Só Imagem | static | 4:5 | image_only | ❌ | ❌ | ✅ (1 campo) | ✅ |
| Carrossel Antes/Depois | carousel | 4:5 | html_and_image | ❌ | ✅ | ✅ (4 campos) | ✅ |
| Carrossel de Imagens | carousel | 4:5 | image_only | ❌ | ❌ | ✅ (2 campos) | ✅ |
| Carrossel Educativo | carousel | 4:5 | html_only | ❌ | ✅ | ✅ (5 campos) | ❌ |
| Carrossel Estilo Twitter | carousel | 4:5 | html_only | ❌ | ✅ | ✅ (3 campos) | ❌ |
| Carrossel Listicle | carousel | 4:5 | html_only | ❌ | ✅ | ✅ (4 campos) | ❌ |
| Post CTA Direto | static | 4:5 | html_and_image | ❌ | ✅ | ✅ (4 campos) | ✅ |
| Post Dado/Estatística | static | 4:5 | html_only | ❌ | ✅ | ✅ (4 campos) | ❌ |
| Post Feed — Imagem + Texto | static | 4:5 | html_and_image | ❌ | ✅ | ✅ | ✅ |
| Post Frase Forte | static | 4:5 | html_only | ❌ | ✅ | ✅ | ❌ |
| Reels Cover | static | 9:16 | html_and_image | ❌ | ✅ | ✅ | ✅ |
| Story — Texto sobre Gradiente | static | 9:16 | html_only | ❌ | ✅ | ✅ | ❌ |
| Story Interativo | static | 9:16 | html_only | ❌ | ✅ | ✅ | ❌ |

---

## Problemas identificados (por prioridade)

### 🔴 Críticos — impactam qualidade de geração

**1. Nenhum template tem `html_scaffold` preenchido**
Todos têm `scaffold_len: null`. A IA gera o layout inteiro do zero a cada peça, causando:
- Inconsistência visual entre peças do mesmo template
- Maior custo de tokens (a IA "inventa" todo o HTML)
- Impossibilidade de preview real no `TemplatePreview`

**2. Preview genérico e abstrato**
O `TemplatePreview` renderiza ícones/barras abstratas. Não usa o scaffold (que não existe) nem gera thumbnail. O usuário não tem ideia visual do que cada template produz.

**3. Campos editáveis inconsistentes entre templates**
Alguns usam array de objetos `[{key, type, label}]`, outros usam objeto `{key: {type, label}}`. Isso pode causar bugs no editor e na geração.

### 🟡 Importantes — impactam usabilidade

**4. Categorias incompletas**
Stories e Reels Cover estão como `category: "static"`. Deveria haver categorias `story` e `reels` para filtrar corretamente na criação de peças.

**5. Sem tags de funil**
Nenhum template indica se é topo, meio ou fundo de funil. O usuário precisa saber de cabeça qual template serve para qual etapa.

**6. Sem funcionalidade de duplicar**
Para customizar um template global por cliente, o usuário precisa criar do zero. Não há "duplicar e ajustar".

**7. Sem ordenação/prioridade**
Todos os templates aparecem em ordem alfabética. Templates mais usados ou recomendados não têm destaque.

### 🟢 Nice-to-have

**8. Sem thumbnail estático**
Campo `thumbnail_url` existe na tabela mas nunca é preenchido. Seria útil para preview rápido sem renderizar HTML.

**9. Sem versionamento de prompts**
Quando o system_prompt é editado, a versão anterior se perde. Sem rollback.

**10. Nenhum template 1:1**
Apesar do sistema suportar 1:1, não existe nenhum template nesse formato.

---

## Plano de melhorias (se aprovado)

### Fase 1 — Scaffolds HTML base (maior impacto)
Gerar e popular `html_scaffold` para os 10 templates que usam HTML (`html_only` e `html_and_image`). Cada scaffold será um HTML completo com variáveis `{{hook}}`, `{{body}}`, `{{cta}}`, `{{brand_color}}` etc., definindo layout, tipografia e espaçamento fixos. A IA só preenche o conteúdo.

### Fase 2 — Preview real
Alterar `TemplatePreview` para renderizar o scaffold HTML real (em miniatura via CSS transform scale) quando disponível. Fallback para o preview abstrato atual quando scaffold é null.

### Fase 3 — Normalizar editable_fields
Padronizar todos para formato objeto `{key: {label, type, default}}`. Migration para converter os que estão em array.

### Fase 4 — Categorias + funil
- Adicionar coluna `funnel_stage` (enum: `top`, `middle`, `bottom`) nos templates
- Separar categories: `static`, `carousel`, `story`, `reels`
- Atualizar os templates existentes

### Fase 5 — Duplicar template
Botão "Duplicar" na listagem que copia o template com `is_base: false`, `visibility: client_only`, permitindo customização.

### Arquivos modificados
- Migration SQL — popular scaffolds, normalizar campos, adicionar `funnel_stage`
- `src/components/ui/TemplatePreview.tsx` — renderizar scaffold real
- `src/pages/SettingsTemplates.tsx` — botão duplicar, filtros por categoria/funil
- `src/components/ui/TemplateEditorDialog.tsx` — campo funnel_stage

