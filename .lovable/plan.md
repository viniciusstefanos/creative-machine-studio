

# Fix: Renderização Puxando Fontes da App + Botões Desalinhados

## Problema Raiz

1. **Fontes erradas**: `renderHtmlToPng()` injeta o HTML do asset diretamente no DOM da página (`document.body.appendChild`). O CSS global do app (`src/index.css` linha 89-91) aplica `font-family: 'Syne'` em todos os `h1-h6`. Resultado: títulos do asset renderizado usam Syne em vez da fonte definida no HTML gerado.

2. **Botões desalinhados**: `html2canvas` tem problemas conhecidos com `display: flex`, `align-items: center` em botões. O texto do botão fica descentralizado no PNG final.

## Solução

### Isolar o HTML do asset em um iframe (sandbox CSS)

Substituir a abordagem atual (innerHTML no DOM) por um **iframe offscreen** com `srcdoc`. O iframe cria um contexto CSS completamente isolado — nenhum estilo do app vaza para dentro.

#### `src/lib/renderPng.ts` — reescrever `renderHtmlToPng`

```
Antes:
  container.innerHTML = htmlContent → herda CSS global (Syne, etc.)
  html2canvas(container) → problemas com flex em botões

Depois:
  1. Criar iframe offscreen com srcdoc contendo:
     - Link do Google Fonts extraído do HTML
     - Reset CSS (*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 })
     - O HTML do asset
  2. Aguardar iframe carregar + fonts.ready
  3. Usar html2canvas no iframe.contentDocument.body
  4. Remover iframe
```

**Detalhe técnico do iframe**:
```typescript
const iframe = document.createElement("iframe");
iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${width}px;height:${height}px;border:none;`;
iframe.sandbox = "allow-same-origin"; // permite acessar contentDocument
document.body.appendChild(iframe);

const doc = iframe.contentDocument!;
doc.open();
doc.write(`<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="${fontsUrl}">
  <style>*{margin:0;padding:0;box-sizing:border-box}
  button,a{display:inline-flex;align-items:center;justify-content:center;text-align:center}
  </style>
</head><body style="width:${width}px;height:${height}px;overflow:hidden">
  ${htmlContent}
</body></html>`);
doc.close();

// Esperar load + fonts
await new Promise(r => iframe.addEventListener("load", r));
await doc.fonts.ready;

const canvas = await html2canvas(doc.body, { width, height, scale: 2, ... });
```

Isso resolve ambos os problemas:
- **Fontes**: O iframe não herda o CSS do app. Os `h1-h6` usam apenas o que está no HTML do asset.
- **Botões**: O reset CSS dentro do iframe inclui regras específicas para `button` e `a` com `display:inline-flex; align-items:center; justify-content:center` garantindo centralização.

### Arquivo modificado
- **`src/lib/renderPng.ts`** — reescrever `renderHtmlToPng` para usar iframe isolado em vez de `innerHTML` no DOM principal

