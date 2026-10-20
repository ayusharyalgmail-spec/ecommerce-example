import { keepPreviousData, useQuery as useTanQuery } from "@tanstack/react-query";
import { useCallback, useId } from "react";

/**
 * Compatibility shim: the original `useQuery(fn, deps)` signature, now running on TanStack Query.
 * Pages that have not migrated keep working; each call site gets a private cache entry (so no
 * behaviour change). New code should call `useQuery` from @tanstack/react-query with a shared key
 * (see lib/queries.ts) to get de-duplication and stale-while-revalidate.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const id = useId();
  const q = useTanQuery({
    queryKey: ["legacy", id, ...deps],
    queryFn: () => fn(), // options are refreshed every render, so this always calls the latest closure
    staleTime: 0,
    gcTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData, // the old hook kept showing the previous data while reloading
  });
  const { refetch } = q;
  const reload = useCallback(() => { void refetch(); }, [refetch]);
  return {
    data: q.data as T | undefined,
    error: q.error ? (q.error instanceof Error ? q.error.message : String(q.error)) : null,
    loading: q.isFetching,
    reload,
  };
}

/** Unwraps a Supabase `{ data, error }` result or throws. */
export function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}
