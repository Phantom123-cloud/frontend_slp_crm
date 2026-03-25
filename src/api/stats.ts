import api from './client';

// Строка статистики — одинакова для всех вкладок и группировок
export interface StatsRow {
  key: string;
  label: string;
  presentationsCount: number;
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
  successApproach: number | null;
  totalApproach: number | null;
  refusalCount: number | null;
  refusalValue: number | null;
  rewriteCount: number | null;
  rewriteValue: number | null;
  turnoverBefore: number;
  turnoverAfter: number;
  userId?: string;
  role?: string;
  presDate?: string;
  presTime?: string;
  presType?: string;
  presVenue?: string;
}

export const statsApi = {
  getPresentationStats: (params: {
    from: string;
    to: string;
    groupBy: string;
    tab: string;
  }) =>
    api
      .get('/stats/presentations', { params })
      .then((r) => r.data as StatsRow[]),

  getContractStats: (params: { from: string; to: string; filterBy?: string; userId?: string }) =>
    api.get('/stats/contracts', { params }).then((r) => r.data),
};
