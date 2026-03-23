import api from './client';

export interface ContractPhone {
  countryCode: string;
  number: string;
}

export interface PaymentScheduleItem {
  date: string;
  amount: number;
  isPaid?: boolean;
}

export interface CreateContractData {
  clientName: string;
  contractDate: string;
  companyId?: string;
  paymentType: string;
  saleType?: string;
  presentationId: string;
  tripId: string;
  speakerId?: string;
  signedById: string;
  totalAmount: number;
  advanceCash?: number;
  advanceTerminal?: number;
  advanceBank?: number;
  installmentMonths?: number;
  firstPaymentDate?: string;
  registrationAddress?: string;
  actualAddress?: string;
  bankIds?: string[];
  bankAdvances?: Record<string, number>;
  phones?: ContractPhone[];
  paymentSchedule?: PaymentScheduleItem[];
}

export interface RefundData {
  paymentStatus: 'REFUND' | 'PARTIAL_REFUND';
  advanceCash?: number;
  advanceTerminal?: number;
  advanceBank?: number;
  bankAdvances?: Record<string, number>;
  amountAfterRefund?: number;
}

export const contractsApi = {
  list: (params?: { tripId?: string }) =>
    api.get('/contracts', { params }),
  getById: (id: string) => api.get(`/contracts/${id}`),
  create: (data: CreateContractData) => api.post('/contracts', data),
  update: (id: string, data: Partial<CreateContractData>) =>
    api.patch(`/contracts/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/contracts/${id}/status`, { status }),
  refund: (id: string, data: RefundData) =>
    api.patch(`/contracts/${id}/refund`, data),
  updateFinancials: (id: string, data: Partial<CreateContractData>) =>
    api.patch(`/contracts/${id}/financials`, data),
  payScheduleItem: (scheduleItemId: string) =>
    api.patch(`/contracts/schedule/${scheduleItemId}/pay`),
  delete: (id: string) => api.delete(`/contracts/${id}`),
};
