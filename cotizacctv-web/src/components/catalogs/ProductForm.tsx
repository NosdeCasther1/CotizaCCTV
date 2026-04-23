"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Loader2, Package, Hash, DollarSign, Tag, Truck, Percent, Star, AlignLeft, ShieldCheck, Check, ChevronsUpDown, Coins, Image as ImageIcon, Camera, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ComboboxFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: { id: string | number; name: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  emptyText?: string;
  allowClear?: boolean;
}

function ComboboxField({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  searchPlaceholder = "Buscar...",
  icon,
  disabled,
  emptyText = "No se encontraron resultados.",
  allowClear = false
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find(opt => opt.id.toString() === value?.toString());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-between font-normal text-left px-3 bg-background"
        )}
      >
        <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden">
          {icon}
          <span className="truncate">
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value || value === "none" ? "opacity-100" : "opacity-0")} />
                  Sin selección
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onChange(option.id.toString());
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toString() === option.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().min(1, "El SKU es requerido"),
  category_id: z.string().min(1, "La categoría es requerida"),
  brand_id: z.string().optional().nullable(),
  utility_type: z.enum(['percentage', 'fixed_amount']).default('percentage'),
  margin_percentage: z.string()
    .refine((val) => val === "" || !isNaN(Number(val)), { message: "Debe ser un número" })
    .optional(),
  tax_rate: z.string()
    .refine((val) => val === "" || !isNaN(Number(val)), { message: "Debe ser un número" })
    .optional(),
  suppliers: z.array(z.object({
    supplier_id: z.string().min(1, "Requerido"),
    cost: z.string().refine((val) => !isNaN(Number(val)), { message: "Número inválido" }),
    is_default: z.boolean().default(false),
  })).min(1, "Debe tener al menos un proveedor"),
  image: z.any().optional(),
});

// For values in the form
type ProductFormValues = {
  name: string;
  description: string;
  sku: string;
  category_id: string;
  brand_id?: string | null;
  utility_type: 'percentage' | 'fixed_amount';
  margin_percentage: string;
  tax_rate: string;
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
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      category_id: product?.category_id?.toString() || "",
      brand_id: product?.brand_id?.toString() || "",
      utility_type: product?.utility_type || "percentage",
      margin_percentage: product?.margin_percentage?.toString() || "",
      tax_rate: product?.tax_rate?.toString() || "0",
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
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("sku", values.sku);
      formData.append("category_id", values.category_id);
      
      if (values.description) {
        formData.append("description", values.description);
      }
      
      if (values.brand_id) {
        formData.append("brand_id", values.brand_id);
      }
      
      formData.append("utility_type", values.utility_type);
      
      if (values.margin_percentage !== "") {
        formData.append("margin_percentage", values.margin_percentage);
      }
      
      formData.append("tax_rate", values.tax_rate === "" ? "0" : values.tax_rate);

      // Append suppliers
      values.suppliers.forEach((s, index) => {
        formData.append(`suppliers[${index}][supplier_id]`, s.supplier_id);
        formData.append(`suppliers[${index}][cost]`, s.cost);
        formData.append(`suppliers[${index}][is_default]`, s.is_default ? "1" : "0");
      });

      // Append image if selected
      const imageFile = (watch("image") as any);
      if (imageFile instanceof File) {
        formData.append("image", imageFile);
      }

      if (product) {
        await updateProduct(product.id, formData);
      } else {
        await createProduct(formData);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error al guardar producto:", error);
      
      // Manejo de errores de validación (422) de Laravel
      if (error.response?.status === 422 && error.response.data?.errors) {
        const validationErrors = error.response.data.errors;
        
        if (validationErrors.sku) {
          setError("sku", { 
            type: "manual", 
            message: "Este SKU ya está registrado en otro producto activo." 
          });
        }
        
        // Se podrían manejar otros errores aquí si fuera necesario
      }
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
          <Label htmlFor="margin_percentage">Utilidad / Margen</Label>
          <div className="flex gap-2">
            <Controller
              name="utility_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed_amount">Monto Fijo (Q)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <div className="relative flex-1">
              {watch("utility_type") === 'percentage' ? (
                <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              ) : (
                <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                id="margin_percentage"
                placeholder={watch("utility_type") === 'percentage' ? "Heredado" : "0.00"}
                className="pl-8"
                {...register("margin_percentage")}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex justify-between items-center px-1">
             <p className="text-[10px] text-muted-foreground">
               {watch("utility_type") === 'percentage' 
                 ? "Vacio = hereda de categoría o global" 
                 : "Monto exacto a ganar sobre el costo"}
             </p>
             {watch("utility_type") === 'percentage' && (
               <Button 
                 type="button" 
                 variant="ghost" 
                 size="sm" 
                 className="h-5 text-[10px] text-blue-600 hover:text-blue-700 p-0"
                 onClick={() => setValue("margin_percentage", "30")}
               >
                 Usar 30%
               </Button>
             )}
          </div>
          {errors.margin_percentage && (
            <p className="text-sm text-destructive">{errors.margin_percentage.message as React.ReactNode}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tax_rate">Impuesto / IVA (%)</Label>
          <div className="relative">
            <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              {...register("tax_rate")}
              disabled={isSubmitting}
            />
          </div>
          {errors.tax_rate && (
            <p className="text-sm text-destructive">{errors.tax_rate.message as React.ReactNode}</p>
          )}
        </div>
      </div>

      {(() => {
        const suppliersWatch = watch("suppliers");
        const favoriteSupplier = suppliersWatch?.find((s: any) => s.is_default);
        const baseCost = favoriteSupplier ? Number(favoriteSupplier.cost) : 0;
        
        if (baseCost > 0) {
          return (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Sugerencia de Negocio</p>
                <p className="text-sm text-blue-900 font-medium">Precio de Venta Sugerido (Basado en favorito)</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-blue-600">
                  Q {watch("utility_type") === 'percentage' 
                    ? (baseCost / (1 - (Number(watch("margin_percentage") || 0) / 100))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : (baseCost + Number(watch("margin_percentage") || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

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
        <Label>Imagen del Producto</Label>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "relative h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted",
              imagePreview && "border-solid border-primary/20"
            )}>
              {imagePreview ? (
                <>
                  <img 
                    src={imagePreview} 
                    alt="Vista previa" 
                    className="h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setValue("image", undefined);
                    }}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Camera className="h-8 w-8 opacity-40" />
                  <span className="text-[10px]">Sin imagen</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="relative"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isSubmitting}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {imagePreview ? "Cambiar Imagen" : "Subir Imagen"}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setValue("image", file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </Button>
                {imagePreview && (
                  <p className="text-[10px] text-muted-foreground">
                    Soporta JPG, PNG, WebP (Máx 2MB)
                  </p>
                )}
              </div>
              {!imagePreview && (
                <p className="text-xs text-muted-foreground">
                  Sube una foto clara del producto para el catálogo y cotizaciones.
                </p>
              )}
            </div>
          </div>
        </div>
        {errors.image && (
          <p className="text-sm text-destructive">{errors.image.message as React.ReactNode}</p>
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
            <ComboboxField
              value={field.value?.toString() || ""}
              onChange={field.onChange}
              options={categories}
              placeholder={isLoadingRelations ? "Cargando..." : "Seleccionar categoría"}
              searchPlaceholder="Buscar categoría..."
              icon={<Tag className="h-4 w-4 text-muted-foreground" />}
              disabled={isSubmitting || isLoadingRelations}
            />
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
            <ComboboxField
              value={field.value?.toString() || ""}
              onChange={field.onChange}
              options={brands}
              placeholder={isLoadingRelations ? "Cargando..." : "Seleccionar marca (Opcional)"}
              searchPlaceholder="Buscar marca..."
              icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
              disabled={isSubmitting || isLoadingRelations}
              allowClear
            />
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
                  <ComboboxField
                    value={field.value?.toString() || ""}
                    onChange={field.onChange}
                    options={suppliers}
                    placeholder="Proveedor"
                    searchPlaceholder="Buscar proveedor..."
                    icon={<Truck className="h-4 w-4 text-muted-foreground" />}
                    disabled={isSubmitting || isLoadingRelations}
                  />
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

