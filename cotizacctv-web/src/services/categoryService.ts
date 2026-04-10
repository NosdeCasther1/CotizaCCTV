import api from '@/lib/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
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

export const deleteCategory = async (id: number): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
