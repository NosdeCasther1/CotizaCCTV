export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  margin_percentage: number | null;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductSupplier extends Supplier {
  pivot: {
    cost: number;
    is_default: boolean;
    updated_at: string;
  };
}

export interface Product {
  id: number;
  category_id: number;
  brand_id: number | null;
  sku: string;
  name: string;
  description?: string;
  margin_percentage: number | null;
  utility_type?: 'percentage' | 'fixed_amount';
  purchase_price: number | null;
  tax_rate: number | null;
  active_margin: number;
  calculated_sale_price: number;
  suppliers?: ProductSupplier[];
  category?: Category;
  brand?: Brand;
  created_at?: string;
  updated_at?: string;
}

export interface QuoteItem {
  id: number;
  quote_id: number;
  product_id: number;
  quantity: number;
  frozen_unit_cost: number;
  product?: Product;
  created_at?: string;
  updated_at?: string;
}

export interface Quote {
  id: number;
  client_name: string;
  subtotal_materials: number;
  margin_applied: number;
  freight_cost: number;
  gasoline_cost: number;
  per_diem_cost: number;
  installation_total: number;
  grand_total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  installation_days: number;
  distance_km: number;
  discount_amount: number;
  discount_type: 'fixed' | 'percentage';
  expires_at: string;
  items?: QuoteItem[];
  created_at?: string;
  updated_at?: string;
}