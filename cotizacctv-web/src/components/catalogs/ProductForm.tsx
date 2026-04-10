"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Loader2, Package, Hash, DollarSign, Tag, Truck, Percent, Star, AlignLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProduct, updateProduct } from "@/services/productService";
import { getCategories, Category } from "@/services/categoryService";
import { getSuppliers, Supplier } from "@/services/supplierService";
import { getBrands } from "@/services/brandService";
import { Product, Brand } from "@/types";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { QuickCreateCategory } from "@/components/modals/QuickCreateCategory";
import { QuickCreateBrand } from "@/components/modals/QuickCreateBrand";
import { QuickCreateSupplier } from "@/components/modals/QuickCreateSupplier";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().min(1, "El SKU es requerido"),
  category_id: z.string().min(1, "La categoría es requerida"),
  brand_id: z.string().optional().nullable(),
  margin_percentage: z.string()
    .refine((val) => val === "" || !isNaN(Number(val)), { message: "Debe ser un número" })
    .optional(),
  suppliers: z.array(z.object({
    supplier_id: z.string().min(1, "Requerido"),
    cost: z.string().refine((val) => !isNaN(Number(val)), { message: "Número inválido" }),
    is_default: z.boolean().default(false),
  })).min(1, "Debe tener al menos un proveedor"),
});

// For values in the form
type ProductFormValues = {
  name: string;
  description: string;
  sku: string;
  category_id: string;
  brand_id?: string | null;
  margin_percentage: string;
  suppliers: {
    supplier_id: string;
    cost: string;
    is_default: boolean;
  }[];
};

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      category_id: product?.category_id?.toString() || "",
      brand_id: product?.brand_id?.toString() || "",
      margin_percentage: product?.margin_percentage?.toString() || "",
      suppliers: product?.suppliers && product.suppliers.length > 0 
        ? product.suppliers.map(s => ({
            supplier_id: s.id.toString(),
            cost: s.pivot.cost.toString(),
            is_default: !!s.pivot.is_default,
          }))
        : [{ supplier_id: "", cost: "", is_default: true }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "suppliers",
  });

  const setPrimarySupplier = (selectedIndex: number) => {
    fields.forEach((field, index) => {
      update(index, { ...field, is_default: index === selectedIndex });
    });
  };

  const handleCategoryCreated = (newCategory: Category) => {
    setCategories(prev => [...prev, newCategory]);
    // Small timeout to ensure the select options are rendered before selecting
    setTimeout(() => setValue("category_id", newCategory.id.toString()), 0);
  };

  const handleBrandCreated = (newBrand: Brand) => {
    setBrands(prev => [...prev, newBrand]);
    setTimeout(() => setValue("brand_id", newBrand.id.toString()), 0);
  };

  const handleSupplierCreated = (newSupplier: Supplier, index?: number) => {
    setSuppliers(prev => {
      if (prev.some(s => s.id === newSupplier.id)) return prev;
      return [...prev, newSupplier];
    });
    
    if (index !== undefined) {
      setTimeout(() => setValue(`suppliers.${index}.supplier_id`, newSupplier.id.toString()), 0);
    }
  };

  useEffect(() => {
    const fetchRelations = async () => {
      setIsLoadingRelations(true);
      try {
        const [cats, supps, brnds] = await Promise.all([
          getCategories(),
          getSuppliers(),
          getBrands()
        ]);
        setCategories(cats);
        setSuppliers(supps);
        setBrands(brnds);
      } catch (error) {
        console.error("Error al cargar relaciones:", error);
      } finally {
        setIsLoadingRelations(false);
      }
    };

    fetchRelations();
  }, []);

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        brand_id: values.brand_id === "" ? null : Number(values.brand_id),
        margin_percentage: values.margin_percentage === "" ? null : Number(values.margin_percentage),
        suppliers: values.suppliers.map(s => ({
          supplier_id: Number(s.supplier_id),
          cost: Number(s.cost),
          is_default: s.is_default
        }))
      };

      if (product) {
        await updateProduct(product.id, payload as any);
      } else {
        await createProduct(payload as any);
      }
      onSuccess();
    } catch (error) {
      console.error("Error al guardar producto:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU / Código</Label>
          <div className="relative">
            <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="sku"
              placeholder="Ej: CAM-HIK-001"
              className="pl-8"
              {...register("sku")}
              disabled={isSubmitting}
            />
          </div>
          {errors.sku && (
            <p className="text-sm text-destructive">{errors.sku.message as React.ReactNode}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="margin_percentage">Margen Real (%)</Label>
          <div className="relative">
            <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="margin_percentage"
              placeholder="Heredado"
              className="pl-8"
              {...register("margin_percentage")}
              disabled={isSubmitting}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Vacio = hereda de categoría o global</p>
          {errors.margin_percentage && (
            <p className="text-sm text-destructive">{errors.margin_percentage.message as React.ReactNode}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Producto</Label>
        <div className="relative">
          <Package className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            placeholder="Ej: Cámara Domo IP 4MP"
            className="pl-8"
            {...register("name")}
            disabled={isSubmitting}
          />
        </div>
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message as React.ReactNode}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value}
              onChange={field.onChange}
              placeholder="Ej: Cámara con visión nocturna a 30m, IP67..."
              disabled={isSubmitting}
            />
          )}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message as React.ReactNode}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Categoría</Label>
          <QuickCreateCategory onSuccess={handleCategoryCreated} />
        </div>
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <Select 
              onValueChange={field.onChange} 
              value={field.value?.toString()}
              disabled={isSubmitting || isLoadingRelations}
            >
              <SelectTrigger className="w-full">
                <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={isLoadingRelations ? "Cargando..." : "Seleccionar categoría"}>
                  {field.value && categories.find(c => c.id.toString() === field.value.toString())?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.category_id && (
          <p className="text-sm text-destructive">{errors.category_id.message as React.ReactNode}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Marca</Label>
          <QuickCreateBrand onSuccess={handleBrandCreated} />
        </div>
        <Controller
          name="brand_id"
          control={control}
          render={({ field }) => (
            <Select 
              onValueChange={field.onChange} 
              value={field.value?.toString()}
              disabled={isSubmitting || isLoadingRelations}
            >
              <SelectTrigger className="w-full">
                <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={isLoadingRelations ? "Cargando..." : "Seleccionar marca (Opcional)"}>
                  {field.value && field.value !== "none" && brands.find(b => b.id.toString() === field.value.toString())?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin marca</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.brand_id && (
          <p className="text-sm text-destructive">{errors.brand_id.message as React.ReactNode}</p>
        )}
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Costos por Proveedor</Label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => append({ supplier_id: "", cost: "", is_default: fields.length === 0 })}
            disabled={isSubmitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Costo
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end border p-3 rounded-lg bg-muted/30">
            <div className="sm:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Proveedor</Label>
                <QuickCreateSupplier onSuccess={(s) => handleSupplierCreated(s, index)} />
              </div>
              <Controller
                name={`suppliers.${index}.supplier_id`}
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value?.toString()}
                    disabled={isSubmitting || isLoadingRelations}
                  >
                    <SelectTrigger className="w-full">
                      <Truck className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Proveedor">
                        {field.value && suppliers.find(s => s.id.toString() === field.value.toString())?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="sm:col-span-4 space-y-2">
              <Label>Costo (GTQ)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  {...register(`suppliers.${index}.cost`)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="sm:col-span-1">
              <Controller
                name={`suppliers.${index}.is_default`}
                control={control}
                render={({ field }) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-full"
                    onClick={() => setPrimarySupplier(index)}
                    title={field.value ? "Proveedor Principal" : "Marcar como Principal"}
                    disabled={isSubmitting}
                  >
                    <Star className={`h-5 w-5 ${field.value ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                  </Button>
                )}
              />
            </div>
            <div className="sm:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive h-10 w-full"
                onClick={() => {
                  const currentSuppliers = watch("suppliers");
                  const wasDefault = currentSuppliers[index].is_default;
                  remove(index);
                  if (wasDefault && currentSuppliers.length > 1) {
                    // Set the new first item as default if we deleted the default one
                    setTimeout(() => {
                      const updatedSuppliers = watch("suppliers");
                      if (updatedSuppliers.length > 0) {
                        setPrimarySupplier(0);
                      }
                    }, 0);
                  }
                }}
                disabled={isSubmitting || fields.length === 1}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
            {errors.suppliers && (errors.suppliers as any)[index] && (
              <div className="sm:col-span-12">
                <p className="text-[10px] text-destructive">
                  {(errors.suppliers as any)[index]?.supplier_id?.message || (errors.suppliers as any)[index]?.cost?.message}
                </p>
              </div>
            )}
          </div>
        ))}
        {errors.suppliers?.root && (
          <p className="text-sm text-destructive">{errors.suppliers.root.message as React.ReactNode}</p>
        )}
      </div>

      <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background pb-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingRelations}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {product ? "Actualizar Producto" : "Guardar Producto"}
        </Button>
      </DialogFooter>
    </form>
  );
}

