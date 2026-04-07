

# Corrigir fontes na renderização PNG + melhorar edição de texto

## Problemas identificados

### 1. Fonte diferente no PNG final
O HTML gerado usa `font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif` mas **não importa a fonte via Google Fonts**. Na preview (iframe), o navegador do usuário pode ter Inter instalada ou carregá-la do CSS global da app. Porém, o `html2canvas` (usado em `renderPng.ts`) não renderiza web fonts que não estejam explicitamente carregadas no container — cai no fallback (Helvetica/Arial).

**Solução**: Injetar um `<link>` do Google Fonts no HTML antes de renderizar com html2canvas, e aguardar o carregamento das fontes antes de capturar.

### 2. Edição de texto frágil
O `HtmlVisualEditor` usa `html.replace(oldText, newText)` — um simples string replace que:
- Pode substituir no lugar errado se o mesmo texto aparece em atributos ou múltiplas vezes
- Usa `defaultValue` nos inputs, então editar e voltar ao mesmo segmento não reflete o valor atual
- Não preserva HTML interno (tags `<br>`, `<span>` dentro do texto)

**Solução**: Usar replace mais preciso (localizar dentro de tags) e trocar `defaultValue` por `value` controlado.

## Plano de implementação

### Arquivo 1: `src/lib/renderPng.ts`
- Antes de inserir o HTML no container, parsear o `html_content` e extrair as fontes usadas (regex em `font-family`)
- Injetar `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">` (e quaisquer outras fontes detectadas) como `<style>` no container
- Usar `document.fonts.ready` para aguardar carregamento antes de chamar `html2canvas`
- Adicionar timeout de 3s para não travar caso a fonte não carregue

### Arquivo 2: `supabase/functions/generate-asset-from-template/index.ts`
- No HTML gerado pela IA, incluir no scaffold base um `<link>` do Google Fonts para Inter (e outras fontes usadas)
- Isso garante que tanto a preview (iframe) quanto a renderização PNG tenham a fonte correta embarcada no próprio HTML

### Arquivo 3: `src/components/ui/HtmlVisualEditor.tsx`
- Trocar `defaultValue` por estado controlado (`value`) nos inputs de texto, com `onChange` atualizando estado local por segmento
- No `updateText`: fazer replace mais seguro — localizar o texto dentro de `>...<` (conteúdo de tag) em vez de replace global
- Adicionar debounce no onChange para não travar a UI

### Arquivos modificados
- `src/lib/renderPng.ts` — injetar Google Fonts + aguardar carregamento
- `supabase/functions/generate-asset-from-template/index.ts` — incluir `<link>` de fontes no scaffold HTML
- `src/components/ui/HtmlVisualEditor.tsx` — inputs controlados + replace seguro

