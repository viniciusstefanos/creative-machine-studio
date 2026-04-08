

# Visão de lista para Copies com "selecionar tudo"

## Problema
A aba de Copies só tem visualização em cards. Não há toggle de view mode (grid/lista) nem "selecionar tudo" como já existe em Peças (AssetsTab).

## Solução
Adicionar à CopiesTab o mesmo padrão de AssetsTab:
- Toggle grid/list (LayoutGrid + LayoutList)
- Checkbox "selecionar tudo" no header da lista
- View mode "list" como tabela compacta com colunas: checkbox, finalidade (ORG/ADS), gancho (truncado), funil, status
- View mode "grid" mantém os cards atuais

## Mudanças em `src/components/activation/CopiesTab.tsx`

1. **Estado**: adicionar `viewMode` ("grid" | "list"), default "list"
2. **Header**: adicionar toggle de view mode (mesmo estilo visual de AssetsTab)
3. **Selecionar tudo**: adicionar `toggleAll` e `allSelected` (como AssetsTab linhas 93-101), com checkbox no header que seleciona/deseleciona todos os `filtered`
4. **View list**: renderizar `<Table>` com colunas:
   - Checkbox
   - Badge ORG/ADS
   - Hook (truncado 1 linha, link para detalhe)
   - Tipo · Canal
   - Funil
   - Status badge
5. **View grid**: manter a renderização atual com cards

## Detalhes técnicos
- Importar `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` de `@/components/ui/table`
- Importar `LayoutGrid, LayoutList` de lucide
- `toggleAll` opera sobre `filtered` (respeitando o filtro ativo)
- `allSelected` = `filtered.length > 0 && filtered.every(c => selected.has(c.id))`

## Arquivo modificado
- `src/components/activation/CopiesTab.tsx`

