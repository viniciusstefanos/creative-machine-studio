

# Fix: Legibilidade de texto sobre imagem de fundo

## Diagnóstico

O problema está no **prompt** das regras HTML (`HTML_CREATIVE_RULES` e na instrução do branch `html_and_image`). A IA gera o overlay HTML sem instruções explícitas para proteger o texto contra a imagem de fundo.

Problemas visíveis na peça:
- Texto se mistura com a imagem (sem gradient overlay)
- Botão CTA com texto desalinhado
- Sem text-shadow suficiente para contraste

## Solução

### 1. Adicionar regras de overlay obrigatório no prompt `asset_html_rules`

Adicionar uma seção nova nas `HTML_CREATIVE_RULES` em `generate-asset-from-template/index.ts`:

```
### SOBREPOSIÇÃO TEXTO + IMAGEM (OBRIGATÓRIO para html_and_image)
- SEMPRE adicionar gradient overlay entre imagem de fundo e texto
- Gradiente: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)
- Mínimo: 40% da altura do container coberto pelo gradiente
- Alternativa: faixa sólida semitransparente (rgba(0,0,0,0.7)) na zona de texto
- text-shadow OBRIGATÓRIO em TODOS os textos sobre imagem: 0 2px 8px rgba(0,0,0,0.8)
- Botão CTA: background sólido opaco, NUNCA transparente sobre imagem
- Texto NUNCA diretamente sobre imagem sem proteção visual
```

### 2. Melhorar o prompt do branch `html_and_image` (linha 269)

Adicionar instrução explícita no `overlayPrompt`:

```
IMPORTANTE: A imagem de fundo ocupa 100% do container. 
Você DEVE adicionar um gradient overlay escuro (linear-gradient to top, 
de rgba(0,0,0,0.85) até transparent) para garantir legibilidade.
O texto DEVE ter text-shadow forte. O botão CTA DEVE ter fundo opaco sólido.
Estrutura obrigatória:
<div style="width:Wpx;height:Hpx;background-image:url(IMG);background-size:cover;position:relative">
  <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)"></div>
  <div style="position:relative;z-index:1;..."><!-- conteúdo --></div>
</div>
```

### 3. Atualizar o prompt no banco de dados

Como os prompts agora vivem na tabela `prompt_templates`, também atualizar o registro `asset_html_rules` via migration para incluir as novas regras de overlay.

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-asset-from-template/index.ts` | Adicionar regras de overlay em `HTML_CREATIVE_RULES` + instrução explícita no branch `html_and_image` |
| Migration SQL | Atualizar conteúdo do prompt `asset_html_rules` no banco |

## Impacto

- Zero mudança visual na UI
- Todas as futuras peças `html_and_image` terão gradient overlay automático
- Peças existentes podem ser regeneradas para aplicar a correção

