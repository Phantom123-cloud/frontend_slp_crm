import api from './index';

/** Строка статистики, возвращаемая с бэкенда */
export interface StatsRow {
  key: string;
  label: string;
  presentationsCount: number;
  // Гостевая статистика
  invited: number;
  arrived: number;
  arrivedPairs: number;
  pctArrived: number;
  leftGuests: number;
  leftPairs: number;
  notLetGuests: number;
  notLetPairs: number;
  inHallGuests: number;
  inHallPairs: number;
  // Сводная статистика (Часовка, отказы, переписанные)
  successApproach: number | null;
  totalApproach: number | null;
  refusalCount: number | null;
  refusalValue: number | null;
  rewriteCount: number | null;
  rewriteValue: number | null;
  // Только для персональных вкладок
  userId?: string;
  role?: string;
}

export const statsApi = {
  /** Получить статистику презентаций за период */
  getPresentationStats: (params: {
    from: string;
    to: string;
    groupBy: string;
    tab: string;
  }) =>
    api
      .get('/stats/presentations', { params })
      .then((r) => r.data as StatsRow[]),
};
