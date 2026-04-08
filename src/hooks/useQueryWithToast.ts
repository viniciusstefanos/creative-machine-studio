import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";

/**
 * Wrapper around useQuery that shows a toast on error.
 */
export function useQueryWithToast<T>(
  options: UseQueryOptions<T, Error> & { errorMessage?: string }
) {
  const { errorMessage, ...queryOptions } = options;
  const query = useQuery<T, Error>(queryOptions);

  useEffect(() => {
    if (query.error) {
      toast.error(errorMessage || "Erro ao carregar dados. Tente novamente.");
      console.error("Query error:", query.error);
    }
  }, [query.error, errorMessage]);

  return query;
}
