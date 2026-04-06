# GUIA VISUAL & DESIGN — MÁQUINA CRIATIVA
# Para: IA gerando HTML/CSS
# Autor: Design System v1.0

---

## 01. CONCEITO

**Nome do sistema:** Máquina Criativa
**Conceito:** Estúdio de produção profissional. Uma ferramenta que equipes criativas usam por horas. Dark, técnico, denso de informação, sem ornamento desnecessário.

**Analogia de referência:** Linear.app + Vercel Dashboard + Figma em modo escuro.

**Anti-referências (nunca fazer):**
- Gradientes roxos/azuis genéricos
- Modals com backdrop blur pesado
- Cards com sombras dramáticas em fundos claros
- Fontes Inter, Roboto, Arial, system-ui
- Botões com border-radius > 8px (parece consumer app)
- Ícones coloridos demais
- Seções com padding excessivo e muito espaço vazio

---

## 02. FUNDAÇÃO DE CORES

### Variáveis obrigatórias
Sempre declare no `:root`. Nunca use hex direto no CSS — sempre via variável.

```css
:root {
  /* ── Superfícies ── */
  --bg-base:      #090C10;  /* fundo de toda a página */
  --bg-surface1:  #0F1318;  /* cards, painéis, sidebar */
  --bg-surface2:  #161B22;  /* elementos elevados, dropdowns */
  --bg-surface3:  #1C2128;  /* hover, item selecionado, input focus bg */

  /* ── Bordas ── */
  --border-subtle:  #1E252E;  /* divisores muito sutis */
  --border-default: #252D38;  /* bordas padrão de cards e inputs */
  --border-strong:  #2E3A48;  /* bordas de destaque, foco */

  /* ── Acento ── */
  --accent:         #00C9A7;  /* teal elétrico — ação principal */
  --accent-dim:     #00C9A712;/* fundo ghost de badges accent */
  --accent-glow:    #00C9A722;/* box-shadow de cards em destaque */
  --accent-hover:   #00B396;  /* accent escurecido 10% para hover */

  /* ── Texto ── */
  --text-primary:   #E8EFF7;  /* texto principal, headings */
  --text-secondary: #8B95A8;  /* labels, subtítulos */
  --text-muted:     #4E5A6A;  /* placeholders, metadados */
  --text-ghost:     #2E3A48;  /* texto desabilitado */
  --text-inverse:   #090C10;  /* texto sobre fundo accent */

  /* ── Status semânticos ── */
  --status-draft:     #4E5A6A;  /* cinza — rascunho */
  --status-review:    #F59E0B;  /* âmbar — aguardando */
  --status-approved:  #00C9A7;  /* teal — aprovado */
  --status-rejected:  #F43F5E;  /* rosa-vermelho — rejeitado */
  --status-scheduled: #818CF8;  /* índigo — agendado */
  --status-published: #34D399;  /* verde — publicado */
  --status-generating:#F59E0B;  /* âmbar — processando */

  /* ── Utilitários ── */
  --radius-sm: 4px;
  --radius-md: 6px;  /* inputs, buttons */
  --radius-lg: 8px;  /* cards, painéis */
  --transition: all 0.15s ease;
}
```

### Regras absolutas de cor
1. `background` da `<body>` é **sempre** `var(--bg-base)`. Nunca branco, nunca cinza claro.
2. Cards usam `var(--bg-surface1)`. Elementos dentro de cards usam `var(--bg-surface2)`.
3. Hover state de qualquer item interativo: `background: var(--bg-surface3)`.
4. Acento `var(--accent)` é reservado para **ação principal apenas**. Não decorar com ele.
5. Status colors nunca aparecem como backgrounds sólidos — sempre com opacidade 10–15% no bg e 30% na borda.

---

## 03. TIPOGRAFIA

### Fontes — importar sempre

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
```

### Mapeamento de uso

| Fonte | Uso | Nunca usar em |
|---|---|---|
| **Syne** | Títulos, nome da plataforma, section headers | Corpo de texto, labels pequenos |
| **DM Sans** | Corpo, labels, botões, inputs, parágrafos | Títulos principais |
| **JetBrains Mono** | Status, rotas, IDs, timestamps, badges, metadata técnica | Títulos, parágrafos longos |

### Escala tipográfica

```css
/* DISPLAY — Syne */
.text-display-xl  { font: 800 40px/1.05 'Syne'; letter-spacing: -1.5px; color: var(--text-primary); }
.text-display-lg  { font: 700 28px/1.1  'Syne'; letter-spacing: -1px;   color: var(--text-primary); }
.text-display-md  { font: 600 20px/1.2  'Syne'; letter-spacing: -0.5px; color: var(--text-primary); }
.text-heading     { font: 600 16px/1.3  'Syne'; letter-spacing: -0.3px; color: var(--text-primary); }

/* UI — DM Sans */
.text-body-lg     { font: 400 15px/1.6  'DM Sans'; color: var(--text-primary); }
.text-body        { font: 400 13px/1.6  'DM Sans'; color: var(--text-primary); }
.text-body-sm     { font: 300 12px/1.5  'DM Sans'; color: var(--text-secondary); }
.text-label       { font: 500 12px/1    'DM Sans'; color: var(--text-secondary); }
.text-caption     { font: 400 11px/1.4  'DM Sans'; color: var(--text-muted); }

/* MONO — JetBrains Mono */
.text-mono-lg     { font: 400 13px/1.5  'JetBrains Mono'; color: var(--text-secondary); }
.text-mono        { font: 400 11px/1.4  'JetBrains Mono'; letter-spacing: 0.3px; }
.text-mono-label  { font: 400 9px/1     'JetBrains Mono'; letter-spacing: 4px; text-transform: uppercase; color: var(--accent); }
```

### Regras tipográficas
- `letter-spacing: 4px; text-transform: uppercase` é reservado para **section labels** em JetBrains Mono 9px
- Títulos Syne sempre com `letter-spacing` negativo (cria densidade, parece profissional)
- DM Sans em `font-weight: 300` para metadados secundários — cria hierarquia sem mudar tamanho

---

## 04. ESPAÇAMENTO

### Grid base: 4px

```
4px   → gap mínimo entre elementos inline
8px   → padding interno de badges e chips
12px  → padding interno de itens de lista
16px  → padding de cards compactos
20px  → padding padrão de cards
24px  → gap entre seções dentro de um card
32px  → padding de painéis principais
40px  → padding de páginas
48px  → gap entre seções de página
```

### Regras
- Nunca usar valores arbitrários (ex: 13px, 22px). Sempre múltiplos de 4.
- Densidade é intencional — essa é uma tool, não uma landing page. Não adicionar padding generoso "para respirar".
- Gap entre elementos de lista: `8px`. Gap entre cards: `12px`. Gap entre seções: `24–32px`.

---

## 05. COMPONENTES

### 5.1 Card

```css
.card {
  background: var(--bg-surface1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  transition: var(--transition);
}

/* Variante: destaque / accent */
.card--accent {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  box-shadow: 0 0 20px var(--accent-glow);
}

/* Variante: hover interativo */
.card--interactive:hover {
  border-color: var(--border-strong);
  background: var(--bg-surface2);
}
```

**HTML padrão:**
```html
<div class="card">
  <div class="card__header">
    <span class="text-mono-label">LABEL DA SEÇÃO</span>
    <span class="status-badge status-badge--review">review</span>
  </div>
  <div class="card__body">
    <!-- conteúdo -->
  </div>
</div>
```

---

### 5.2 Status Badge

**Regra:** fundo com 10% de opacidade, borda com 30%, texto e dot com 100%.

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font: 400 10px/1 'JetBrains Mono';
  letter-spacing: 0.5px;
}

.status-badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* Variantes por status */
.status-badge--draft     { color: var(--status-draft);     background: color-mix(in srgb, var(--status-draft)     10%, transparent); border: 1px solid color-mix(in srgb, var(--status-draft)     30%, transparent); }
.status-badge--review    { color: var(--status-review);    background: color-mix(in srgb, var(--status-review)    10%, transparent); border: 1px solid color-mix(in srgb, var(--status-review)    30%, transparent); }
.status-badge--approved  { color: var(--status-approved);  background: color-mix(in srgb, var(--status-approved)  10%, transparent); border: 1px solid color-mix(in srgb, var(--status-approved)  30%, transparent); }
.status-badge--rejected  { color: var(--status-rejected);  background: color-mix(in srgb, var(--status-rejected)  10%, transparent); border: 1px solid color-mix(in srgb, var(--status-rejected)  30%, transparent); }
.status-badge--scheduled { color: var(--status-scheduled); background: color-mix(in srgb, var(--status-scheduled) 10%, transparent); border: 1px solid color-mix(in srgb, var(--status-scheduled) 30%, transparent); }
.status-badge--published { color: var(--status-published); background: color-mix(in srgb, var(--status-published) 10%, transparent); border: 1px solid color-mix(in srgb, var(--status-published) 30%, transparent); }
```

---

### 5.3 Botões

```css
/* Base */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font: 500 12px/1 'DM Sans';
  letter-spacing: 0.2px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: var(--transition);
  white-space: nowrap;
}

/* Primary — ação principal da tela */
.btn--primary {
  background: var(--accent);
  color: var(--text-inverse);
  border-color: var(--accent);
}
.btn--primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

/* Secondary — ação secundária */
.btn--secondary {
  background: var(--bg-surface2);
  color: var(--text-primary);
  border-color: var(--border-strong);
}
.btn--secondary:hover { background: var(--bg-surface3); }

/* Ghost — ação terciária */
.btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}
.btn--ghost:hover { background: var(--bg-surface2); color: var(--text-primary); }

/* Danger — ação destrutiva */
.btn--danger {
  background: color-mix(in srgb, var(--status-rejected) 10%, transparent);
  color: var(--status-rejected);
  border-color: color-mix(in srgb, var(--status-rejected) 30%, transparent);
}
.btn--danger:hover { background: color-mix(in srgb, var(--status-rejected) 18%, transparent); }

/* Tamanhos */
.btn--sm { padding: 5px 10px; font-size: 11px; }
.btn--lg { padding: 10px 20px; font-size: 13px; }

/* Ícone apenas */
.btn--icon { padding: 6px; border-radius: var(--radius-md); }
```

**Regra:** apenas **um** `btn--primary` por viewport. Todos os outros são secondary ou ghost.

---

### 5.4 Input / Field

```css
.field { display: flex; flex-direction: column; gap: 6px; }

.field__label {
  font: 400 9px/1 'JetBrains Mono';
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.field__input {
  width: 100%;
  padding: 9px 12px;
  background: var(--bg-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font: 400 13px/1 'DM Sans';
  outline: none;
  transition: var(--transition);
}

.field__input::placeholder { color: var(--text-muted); }
.field__input:focus { border-color: var(--accent); background: var(--bg-surface1); }
.field__input:disabled { opacity: 0.4; cursor: not-allowed; }

/* Hint / erro */
.field__hint { font: 400 11px/1.4 'DM Sans'; color: var(--text-muted); }
.field__error { font: 400 11px/1.4 'DM Sans'; color: var(--status-rejected); }
```

---

### 5.5 Section Label

Uso: títulos de blocos internos, separadores de seção.

```css
.section-label {
  font: 400 9px/1 'JetBrains Mono';
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 12px;
}

/* Variante com linha */
.section-label--ruled {
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-label--ruled::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}
```

---

### 5.6 Sidebar

```css
.sidebar {
  width: 220px;
  height: 100vh;
  background: var(--bg-surface1);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: fixed;
  top: 0;
  left: 0;
}

.sidebar__logo {
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font: 800 16px/1 'Syne';
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.sidebar__nav { flex: 1; padding: 8px; }

.sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font: 400 13px/1 'DM Sans';
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
}

.sidebar__nav-item:hover {
  background: var(--bg-surface2);
  color: var(--text-secondary);
}

.sidebar__nav-item--active {
  background: var(--bg-surface3);
  color: var(--text-primary);
}

/* Notificação badge no item */
.sidebar__badge {
  margin-left: auto;
  font: 500 10px/1 'JetBrains Mono';
  background: var(--accent);
  color: var(--text-inverse);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.sidebar__footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 10px;
}
```

---

### 5.7 Tab Bar

```css
.tabs { border-bottom: 1px solid var(--border-subtle); display: flex; }

.tab {
  padding: 10px 16px;
  font: 400 12px/1 'DM Sans';
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: var(--transition);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab:hover { color: var(--text-secondary); }

.tab--active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

/* Badge de contagem na tab */
.tab__count {
  font: 500 10px/1 'JetBrains Mono';
  background: var(--bg-surface3);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 10px;
}

.tab--active .tab__count {
  background: var(--accent-dim);
  color: var(--accent);
}
```

---

### 5.8 Copy Block (componente específico do produto)

```css
.copy-block {
  background: var(--bg-surface1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  transition: var(--transition);
}

.copy-block--review { border-color: color-mix(in srgb, var(--status-review) 40%, transparent); }
.copy-block--approved { border-color: color-mix(in srgb, var(--status-approved) 30%, transparent); }
.copy-block--rejected { border-color: color-mix(in srgb, var(--status-rejected) 30%, transparent); }

.copy-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.copy-block__label {
  font: 400 9px/1 'JetBrains Mono';
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.copy-block__actions { display: flex; gap: 6px; align-items: center; }

.copy-block__content {
  font: 400 13px/1.7 'DM Sans';
  color: var(--text-primary);
}
```

---

### 5.9 Notification Item

```css
.notification {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-surface1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  transition: var(--transition);
  cursor: pointer;
}

.notification:hover { background: var(--bg-surface2); }

.notification--unread {
  background: var(--bg-surface2);
  border-color: var(--border-default);
}

.notification__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.notification__icon { font-size: 16px; flex-shrink: 0; }

.notification__body { flex: 1; min-width: 0; }
.notification__message { font: 400 12px/1.4 'DM Sans'; color: var(--text-primary); }
.notification__time { font: 400 10px/1 'JetBrains Mono'; color: var(--text-muted); margin-top: 3px; }
```

---

## 06. LAYOUT

### Estrutura de página

```html
<body>
  <aside class="sidebar">...</aside>

  <div class="app-shell">
    <header class="topbar">
      <!-- breadcrumb + ações globais -->
    </header>

    <main class="page-content">
      <!-- conteúdo da rota -->
    </main>
  </div>
</body>
```

```css
body {
  display: flex;
  background: var(--bg-base);
  min-height: 100vh;
  margin: 0;
}

.app-shell {
  flex: 1;
  margin-left: 220px; /* sidebar width */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.topbar {
  height: 48px;
  background: var(--bg-surface1);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 8px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-content {
  flex: 1;
  padding: 32px 40px;
  max-width: 1140px;
}
```

### Breadcrumb

```css
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font: 400 11px/1 'JetBrains Mono';
  color: var(--text-muted);
}

.breadcrumb__sep { color: var(--border-strong); }
.breadcrumb__current { color: var(--accent); }
```

```html
<nav class="breadcrumb">
  <span>Bella Vista</span>
  <span class="breadcrumb__sep">›</span>
  <span>Dia das Mães</span>
  <span class="breadcrumb__sep">›</span>
  <span class="breadcrumb__current">Copies</span>
</nav>
```

---

## 07. PADRÕES DE ESTADO

### Empty state
```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 8px;
}

.empty-state__icon { font-size: 32px; opacity: 0.4; }
.empty-state__title { font: 600 14px/1.3 'Syne'; color: var(--text-secondary); }
.empty-state__desc { font: 400 12px/1.5 'DM Sans'; color: var(--text-muted); max-width: 280px; }
```

### Loading skeleton
```css
.skeleton {
  background: var(--bg-surface2);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

### Disabled
```css
[disabled], .disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: not-allowed;
}
```

---

## 08. MICRO-INTERAÇÕES

### Princípios
- Transição padrão: `all 0.15s ease` — rápida, não distrativa
- Hover em cards: `border-color` e `background` mudam suavemente
- Hover em botões: escurecer 10% ou clarear levemente
- Focus em inputs: `border-color` muda para `--accent`
- Nenhum `transform: scale()` desnecessário — isso é tool, não marketing site
- Nenhum `animation` em elementos estáticos — só quando há mudança de estado real

### Permitido
```css
/* Fade in de novo conteúdo */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-in { animation: fade-in 0.2s ease; }

/* Shimmer em loading */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* Dot pulsante em status generating */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.8); }
}
```

### Proibido
- `transition: all 0.5s` ou mais lento — parece lento demais
- `box-shadow` animado — pesado demais
- Rotação, flip, bounce em UI de produção
- `backdrop-filter: blur()` em modals — caro computacionalmente

---

## 09. FORMULÁRIOS

### Anatomia de um form bem construído
```html
<form class="form">
  <div class="form__section">
    <div class="section-label">INFORMAÇÕES BÁSICAS</div>

    <div class="form__grid">
      <div class="field">
        <label class="field__label">NOME DA ATIVAÇÃO</label>
        <input class="field__input" type="text" placeholder="Ex: Dia das Mães 2025">
      </div>

      <div class="field">
        <label class="field__label">TIPO</label>
        <select class="field__input">
          <option>Sazonal</option>
          <option>Ongoing</option>
        </select>
      </div>
    </div>
  </div>

  <div class="form__footer">
    <button class="btn btn--ghost">Cancelar</button>
    <button class="btn btn--primary">Criar ativação</button>
  </div>
</form>
```

```css
.form__section { margin-bottom: 28px; }
.form__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--border-subtle);
  margin-top: 8px;
}
```

---

## 10. TABELAS E LISTAS

```css
.data-table { width: 100%; border-collapse: collapse; }

.data-table th {
  font: 400 9px/1 'JetBrains Mono';
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}

.data-table td {
  font: 400 12px/1 'DM Sans';
  color: var(--text-primary);
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.data-table tr:hover td { background: var(--bg-surface2); }
.data-table tr:last-child td { border-bottom: none; }
```

---

## 11. CHECKLIST PARA QUALQUER COMPONENTE

Antes de entregar HTML/CSS, verifique:

```
☐ Fundo usa variável CSS — nunca hex direto
☐ Nenhuma cor hardcoded no CSS
☐ Fonte correta por contexto (Syne/DM Sans/JetBrains Mono)
☐ Status tem dot colorido + fundo com opacidade
☐ Único btn--primary por tela
☐ Inputs com label em mono uppercase
☐ border-radius: 6px em botões/inputs, 8px em cards
☐ Espaçamento em múltiplos de 4px
☐ transition: all 0.15s ease nos interativos
☐ Hover state definido
☐ Focus state em inputs usa --accent
☐ Estado vazio tratado
☐ Estado de loading tratado
☐ Estado disabled tratado
☐ Nenhum fundo branco ou cinza claro
```

---

## 12. ERROS COMUNS — NUNCA FAZER

```
✗ background: white / #fff / #f5f5f5
✗ font-family: Inter, Roboto, Arial, system-ui
✗ border-radius: 12px, 16px, 24px (parece consumer)
✗ box-shadow: 0 10px 40px rgba(0,0,0,0.3) — sombra dramática
✗ padding: 48px 64px — excesso de espaço
✗ color: var(--accent) em texto decorativo
✗ Dois btn--primary na mesma tela
✗ Status badge sem dot
✗ Label de campo em DM Sans — sempre JetBrains Mono
✗ transition: all 0.5s — lento demais
✗ backdrop-filter: blur() em overlays
✗ animation em elementos que não mudaram de estado
✗ Gradiente como fundo de componente
✗ Textos em UPPERCASE que não são section labels ou mono badges
```
