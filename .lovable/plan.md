

# Fluxo de Aprovação Contínua — Navegar para Próxima Copy

## Problema
Ao aprovar uma copy, o usuário fica na mesma página. Para revisar a próxima, precisa voltar à listagem manualmente. Isso quebra o ritmo de revisão.

## Solução

Após aprovar (ou rejeitar), buscar a próxima copy com status `review` (ou `draft`) da mesma ativação e navegar automaticamente. Se não houver mais copies pendentes, redirecionar para a listagem com toast de conclusão.

### Mudanças em `src/pages/CopyDetail.tsx`

1. **Nova função `navigateToNext`**: após `updateCopy` com status `approved` ou `rejected`, consulta a próxima copy pendente:

```typescript
const goToNextCopy = async () => {
  const { data } = await supabase
    .from("copies")
    .select("id")
    .eq("activation_id", activationId!)
    .in("status", ["review", "draft"])
    .neq("id", copyId!)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (data) {
    navigate(`/activations/${activationId}/copies/${data.id}`, { replace: true });
  } else {
    toast.success("Todas as copies foram revisadas!");
    navigate(`/activations/${activationId}/copies`);
  }
};
```

2. **Alterar `updateCopy`**: no bloco de `status === "approved"`, chamar `goToNextCopy()` em vez de apenas mostrar toast. Idem para `rejected`.

3. **Indicador visual**: mostrar badge discreto no header tipo "2 de 5 em revisão" para dar contexto de progresso.

### Arquivos modificados
- `src/pages/CopyDetail.tsx` — função `goToNextCopy`, contador de pendentes, navegação automática após aprovação/rejeição

