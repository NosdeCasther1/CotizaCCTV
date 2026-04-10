import api from '@/lib/api';
import { Quote } from '@/types';
import { QuoteFormValues } from '@/lib/validations/quote';

export const generateQuote = async (payload: QuoteFormValues): Promise<Quote> => {
  // El backend devuelve { message: '...', data: Quote }
  const { data } = await api.post<{ message: string; data: Quote }>('/quotes', payload);
  return data.data;
};

export const getQuoteById = async (id: string | number): Promise<Quote> => {
  const { data } = await api.get<Quote>(`/quotes/${id}`);
  return data;
};

export const getQuotes = async (): Promise<Quote[]> => {
  const { data } = await api.get<Quote[]>('/quotes');
  return data;
};

export const updateQuote = async (id: string | number, payload: QuoteFormValues): Promise<Quote> => {
  const { data } = await api.put<{ message: string; data: Quote }>(`/quotes/${id}`, payload);
  return data.data;
};
