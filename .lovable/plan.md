

# Refatorar Briefing — System Prompt + Exploração Completa dos Arquivos

## Problemas Atuais

1. **Extração superficial**: O `extract-brief` resume documentos ricos em 4-5 campos curtos (tone, audience, objectives, extra_context), perdendo 90% do conteúdo
2. **Sem system prompt global**: Não existe um prompt-base que garanta "não invente dados" em toda a cadeia (extract → generate-copies → generate-asset)
3. **raw_text truncado**: `generate-copies` corta cada arquivo em 8K chars, `generate-asset` em 5K — documentos completos se perdem
4. **UI simplista**: BriefTab mostra arquivos como mini-cards com status "extraído/sem texto" — não permite explorar o conteúdo real

## Plano

### Fase 1 — System Prompt Global + Constante Compartilhada

Criar um arquivo `supabase/functions/_shared/brief-system-prompt.ts` com o system prompt base que será importado por todas as edge functions:

```typescript
export const BRIEF_SYSTEM_PROMPT = `
## REGRAS INVIOLÁVEIS DE BRIEFING

1. NÃO INVENTE nenhuma informação, dado, estatística, cliente, depoimento ou cenário hipotético.
2. Atenha-se EXCLUSIVAMENTE às informações presentes nos documentos e campos do briefing.
3. Se uma informação não estiver no briefing, NÃO a inclua — prefira omitir a inventar.
4. NÃO crie nomes de produtos, marcas, locais ou pessoas fictícias.
5. NÃO invente dados de prova social (reviews, números, certificações) que não estejam no brief.
6. Se o briefing for insuficiente para um campo, deixe claro que falta informação — NÃO preencha com suposições.
7. Trate CADA documento anexado como fonte primária de verdade.
8. Quando houver conflito entre campos manuais e documentos, os campos manuais prevalecem (foram editados pelo usuário).
`;
```

Importar em: `extract-brief`, `generate-copies`, `generate-asset-from-template`, `regenerate-copy-block`.

### Fase 2 — Extração Profunda dos Arquivos

Refatorar `extract-brief` para extrair uma estrutura muito mais rica dos documentos:

- **Novo schema de extração** com ~15 campos (em vez de 5):
  - `brand_name`, `brand_positioning`, `brand_values`
  - `products_services` (array com nome, descrição, preço, diferenciais)
  - `tone_of_voice` (detalhado: formalidade, personalidade, palavras-chave, palavras proibidas)
  - `target_audience` (demografia, psicografia, dores, desejos, objeções)
  - `competitors` (nomes, posicionamento, diferenciais)
  - `visual_guidelines` (cores hex, fontes, estilo, do/don't)
  - `proof_points` (números reais, prêmios, depoimentos reais do doc)
  - `key_messages` (mensagens-chave da marca)
  - `restrictions` (termos proibidos, temas sensíveis, restrições legais)
  - `detected_category`, `document_summary`
- Aumentar limite de texto enviado à IA: 12K → 30K chars (ou texto completo)
- Salvar extração completa em `extracted_fields` (jsonb) — já existe na tabela

### Fase 3 — Nova UI do Brief: Explorador de Documentos

Substituir a UI atual por uma experiência rica:

1. **Painel de arquivos expandível**: Cada arquivo vira um collapsible com:
   - Header: nome + categoria (tag colorida) + status extração
   - Conteúdo expandido: texto completo do documento (`raw_text`) em scroll
   - Campos extraídos: cards visuais com os dados estruturados do `extracted_fields`
   - Botão "Re-extrair" para reprocessar com o novo schema

2. **Brief consolidado (abaixo)**: Os campos editáveis atuais (tom, público, objetivos, etc.) continuam, mas agora há um botão **"Consolidar dos arquivos"** que puxa e merge inteligentemente todos os `extracted_fields` dos arquivos em um brief unificado

3. **Novo componente `BriefFileViewer`**: Exibe o conteúdo completo de cada arquivo com:
   - Texto formatado com sections detectadas
   - Highlight dos trechos que geraram cada campo extraído
   - Tabs: "Texto completo" | "Campos extraídos"

### Fase 4 — Downstream: Usar Conteúdo Completo na Geração

Atualizar `generate-copies` e `generate-asset-from-template`:

- Enviar `extracted_fields` completo (não apenas raw_text truncado)
- Aumentar limite de raw_text por arquivo: 8K → 15K
- Incluir `BRIEF_SYSTEM_PROMPT` no system prompt de cada function
- Estruturar o contexto dos arquivos por categoria (identidade visual separada de produto, separada de público-alvo)

### Fase 5 — Migration: campo `system_prompt` no briefs

Adicionar coluna `system_prompt` na tabela `briefs` para que o usuário possa customizar instruções específicas por ativação (ex: "nunca usar a palavra 'promoção'", "sempre mencionar delivery grátis").

```sql
ALTER TABLE public.briefs
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS consolidated_context jsonb;
```

## Arquivos Modificados

- **Novo**: `supabase/functions/_shared/brief-system-prompt.ts` — prompt global
- **`supabase/functions/extract-brief/index.ts`** — schema rico, texto completo, BRIEF_SYSTEM_PROMPT
- **`supabase/functions/generate-copies/index.ts`** — importar BRIEF_SYSTEM_PROMPT, usar extracted_fields
- **`supabase/functions/generate-asset-from-template/index.ts`** — idem
- **Novo**: `src/components/activation/BriefFileViewer.tsx` — explorador de conteúdo do arquivo
- **`src/components/activation/BriefTab.tsx`** — layout com explorador + consolidação + campo system_prompt
- **`src/components/activation/BriefFilesSection.tsx`** — collapsible com conteúdo expandido
- **Migration SQL** — `system_prompt` e `consolidated_context` em `briefs`

