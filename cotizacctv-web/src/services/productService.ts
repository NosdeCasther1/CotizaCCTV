import api from '@/lib/api';
import { Product, Category, Supplier } from '@/types';

// Interface para el formulario de creación/edición
export interface ProductFormValues {
  name: string;
  sku: string;
  category_id: string | number;
  supplier_id: string | number;
  current_cost: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get<{data: Product[]}>('/products');
  return data.data;
};

export const createProduct = async (productData: ProductFormValues): Promise<Product> => {
  const { data } = await api.post<{data: Product}>('/products', productData);
  return data.data;
};

export const updateProduct = async (id: number, productData: ProductFormValues): Promise<Product> => {
  const { data } = await api.put<{data: Product}>(`/products/${id}`, productData);
  return data.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
  await api.delete(`/products/${id}`);
};
