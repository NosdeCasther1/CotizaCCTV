import api from '@/lib/api';

export interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  products_count?: number;
}

export type SupplierFormValues = Omit<Supplier, 'id'>;

export const getSuppliers = async (): Promise<Supplier[]> => {
  const { data } = await api.get<{ data: Supplier[] }>('/suppliers');
  return data.data;
};

export const createSupplier = async (payload: SupplierFormValues): Promise<Supplier> => {
  const { data } = await api.post<{ data: Supplier }>('/suppliers', payload);
  return data.data;
};

export const updateSupplier = async (id: number, payload: Partial<SupplierFormValues>): Promise<Supplier> => {
  const { data } = await api.put<{ data: Supplier }>(`/suppliers/${id}`, payload);
  return data.data;
};

export const deleteSupplier = async (id: number): Promise<void> => {
  await api.delete(`/suppliers/${id}`);
};
