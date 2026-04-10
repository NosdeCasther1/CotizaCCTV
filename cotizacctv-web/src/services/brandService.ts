import api from '@/lib/api';
import { Brand } from '@/types';

export async function getBrands(): Promise<Brand[]> {
  const { data } = await api.get<{ data: Brand[] }>('/brands');
  return data.data;
}

export async function createBrand(brand: Partial<Brand>): Promise<Brand> {
  const { data } = await api.post<{ data: Brand }>('/brands', brand);
  return data.data;
}

export async function updateBrand(id: number, brand: Partial<Brand>): Promise<Brand> {
  const { data } = await api.put<{ data: Brand }>(`/brands/${id}`, brand);
  return data.data;
}

export async function deleteBrand(id: number): Promise<void> {
  await api.delete(`/brands/${id}`);
}
