import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type TicketsResult } from '@/lib/api';
import type { TicketId, TicketStatus } from '@/lib/types';

// Hardcoded — el seed inserta un único proyecto "Rediseño Web" con id=1.
// Cuando el SideBar permita cambiar de proyecto, esto sale del estado de ruta.
const PROJECT_ID = 1;

const ticketsQueryKey = (projectId: number) => ['tickets', projectId] as const;

export function useTickets() {
  return useQuery({
    queryKey: ticketsQueryKey(PROJECT_ID),
    queryFn: () => api.tickets.list(PROJECT_ID),
  });
}

/**
 * Mutation con optimistic UI: la columna se actualiza al instante;
 * si el backend devuelve error, hace rollback al estado previo.
 */
export function useMoveTicket() {
  const qc = useQueryClient();
  const queryKey = ticketsQueryKey(PROJECT_ID);

  return useMutation({
    mutationFn: ({ id, newStatus }: { id: TicketId; newStatus: TicketStatus }) =>
      api.tickets.changeStatus(id, newStatus),

    onMutate: async ({ id, newStatus }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<TicketsResult>(queryKey);
      if (prev) {
        qc.setQueryData<TicketsResult>(queryKey, {
          ...prev,
          tickets: prev.tickets.map((t) =>
            t.id === id ? { ...t, status: newStatus } : t,
          ),
        });
      }
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKey, ctx.prev);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}
