import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TicketPriority, TicketStatus } from '@/lib/types';
import type { BoardFilters } from './filters';

const VALID_STATUS: readonly TicketStatus[] = ['todo', 'progress', 'done'];
const VALID_PRIORITY: readonly TicketPriority[] = ['high', 'med', 'low'];

function parseList<T extends string>(raw: string | null, valid: readonly T[]): T[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => (valid as readonly string[]).includes(s));
}

function parseStrings(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function encodeList(values: string[]): string | null {
  return values.length > 0 ? values.join(',') : null;
}

export type UseBoardFiltersResult = {
  filters: BoardFilters;
  setFilter: <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => void;
  removeFilter: (key: keyof BoardFilters) => void;
  clearAll: () => void;
};

export function useBoardFilters(): UseBoardFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<BoardFilters>(
    () => ({
      q: searchParams.get('q') ?? '',
      status: parseList(searchParams.get('status'), VALID_STATUS),
      priority: parseList(searchParams.get('priority'), VALID_PRIORITY),
      tag: parseStrings(searchParams.get('tag')),
      assignee: parseStrings(searchParams.get('assignee')),
    }),
    [searchParams],
  );

  const setFilter = useCallback(
    <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (key === 'q') {
          const s = (value as string).trim();
          if (s) next.set('q', s);
          else next.delete('q');
        } else {
          const encoded = encodeList(value as string[]);
          if (encoded) next.set(key, encoded);
          else next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const removeFilter = useCallback(
    (key: keyof BoardFilters) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        return next;
      });
    },
    [setSearchParams],
  );

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { filters, setFilter, removeFilter, clearAll };
}
