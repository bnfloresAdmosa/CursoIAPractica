import type { Tag, User } from '@/lib/types';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterPill } from '@/components/ui/FilterPill';
import { Btn } from '@/components/ui/Btn';
import { Icon, type IconName } from '@/components/ui/Icon';
import {
  type BoardFilters as Filters,
  formatAssigneeList,
  formatPriorityList,
  formatStatusList,
  formatTagList,
} from './filters';
import { useBoardFilters } from './useBoardFilters';

export type BoardFiltersProps = {
  totalResults: number;
  tagsById: Map<string, Tag>;
  usersById: Map<string, User>;
};

const FILTER_META: Array<{ key: keyof Filters; label: string; icon: IconName }> = [
  { key: 'priority', label: 'Prioridad', icon: 'clock' },
  { key: 'status', label: 'Estado', icon: 'list' },
  { key: 'tag', label: 'Etiqueta', icon: 'tag' },
  { key: 'assignee', label: 'Asignado', icon: 'user' },
];

export function BoardFilters({ totalResults, tagsById, usersById }: BoardFiltersProps) {
  const { filters, setFilter, removeFilter } = useBoardFilters();

  const valueLabel = (key: keyof Filters): string => {
    if (key === 'priority') return formatPriorityList(filters.priority);
    if (key === 'status') return formatStatusList(filters.status);
    if (key === 'tag') return formatTagList(filters.tag, tagsById);
    if (key === 'assignee') return formatAssigneeList(filters.assignee, usersById);
    return '';
  };

  const isActive = (key: keyof Filters): boolean => {
    const v = filters[key];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        flexWrap: 'wrap',
      }}
    >
      <SearchBar
        placeholder="Buscar en títulos…"
        width={240}
        value={filters.q}
        onChange={(v) => setFilter('q', v)}
      />
      {FILTER_META.filter((m) => isActive(m.key)).map((m) => (
        <FilterPill
          key={m.key}
          icon={<Icon name={m.icon} size={12} />}
          label={m.label}
          value={valueLabel(m.key)}
          onRemove={() => removeFilter(m.key)}
        />
      ))}
      <Btn
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="plus" size={12} />}
        style={{ color: 'var(--muted)' }}
      >
        Agregar filtro
      </Btn>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--muted)',
          fontSize: 12,
        }}
      >
        <span>{totalResults} resultados</span>
      </div>
    </div>
  );
}
