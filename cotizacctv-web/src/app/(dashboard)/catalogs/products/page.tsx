"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  getProducts, 
  deleteProduct, 
} from '@/services/productService';
import { Product } from '@/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ProductForm } from '@/components/catalogs/ProductForm';

import { DataTable } from './data-table';
import { getColumns } from './columns';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateSuccess = () => {
    fetchProducts();
    setIsDialogOpen(false);
    setSelectedProduct(undefined);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteProduct(id);
      // Optimistic update
      setProducts(prev => prev.filter((p) => p.id !== id));
      toast.success(`Producto "${name}" eliminado correctamente`);
    } catch (error: any) {
      console.error("Error al eliminar producto:", error);
      toast.error(error.response?.data?.message || "Error al eliminar el producto");
    }
  };

  const columns = useMemo(() => getColumns(handleEdit, handleDelete), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
        <p className="text-muted-foreground">
          Gestiona los equipos, materiales y sus costos para las cotizaciones.
        </p>
      </div>

      <DataTable 
        columns={columns} 
        data={products} 
        isLoading={isLoading}
        toolbarActions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setSelectedProduct(undefined);
          }}>
            <DialogTrigger
              render={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </Button>
              }
            />
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedProduct ? "Editar Producto" : "Añadir Producto"}
                </DialogTitle>
              </DialogHeader>
              <ProductForm 
                product={selectedProduct}
                onSuccess={handleCreateSuccess} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        }
      />
    </div>
  );
}
