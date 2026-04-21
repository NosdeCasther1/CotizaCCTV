import api from '@/lib/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  products_count?: number;
}

export type CategoryFormValues = Omit<Category, 'id' | 'slug'>;

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await api.get<{ data: Category[] }>('/categories');
  return data.data;
};

export const createCategory = async (payload: CategoryFormValues): Promise<Category> => {
  const { data } = await api.post<{ data: Category }>('/categories', payload);
  return data.data;
};

export const updateCategory = async (id: number, payload: Partial<CategoryFormValues>): Promise<Category> => {
  const { data } = await api.put<{ data: Category }>(`/categories/${id}`, payload);
  return data.data;
};

export const deleteCategory = async (id: number): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
