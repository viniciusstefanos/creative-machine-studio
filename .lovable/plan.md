

# Fix: Peça nao aparece no dropdown de agendamento

## Problema raiz

A query na linha 47 do `SchedulePostDialog.tsx` faz um join implícito:
```sql
select("id, category, image_url, copy_id, template_id, status, version, asset_templates(name)")
```

Mas a tabela `assets` **nao tem foreign key** para `asset_templates`. O Supabase retorna erro silencioso e `data` vem `null`, resultando em dropdown vazio.

## Solucao

### 1. Remover o join quebrado da query

Substituir a query por uma sem join. Buscar o nome do template separadamente se necessário, ou simplesmente usar `category` + `version` como label (já suficiente para identificar a peça).

### Arquivo alterado

`src/components/activation/SchedulePostDialog.tsx`

- **Linha 47**: Remover `asset_templates(name)` do select — usar apenas campos diretos da tabela `assets`
- **Linha 55**: Idem para a query de fallback do preselectedAssetId
- **Linhas 162-181**: Ajustar label do dropdown para usar `category` + `version` (sem depender de `tplName`)

### Alternativa (mais robusta)

Criar uma migration adicionando a FK:
```sql
ALTER TABLE assets ADD CONSTRAINT assets_template_id_fkey 
  FOREIGN KEY (template_id) REFERENCES asset_templates(id);
```
Isso permitiria manter o join. Porém é mais arriscado se houver dados órfãos. A solução simples (remover o join) é mais segura.

### Resultado esperado

Ao clicar "Agendar publicação" na tela de uma peça aprovada, o dropdown mostra a peça pré-selecionada com thumbnail e label corretos.

