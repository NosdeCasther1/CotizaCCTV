"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Category } from "@/types";
import { createCategory, updateCategory } from "@/services/categoryService";

const categorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  margin_percentage: z.string()
    .refine((val) => val === "" || !isNaN(Number(val)), { message: "Debe ser un número" })
    .optional(),
});

type CategoryFormValues = {
  name: string;
  margin_percentage: string;
};

interface CategoryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Category;
}

export function CategoryForm({ onSuccess, onCancel, initialData }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || "",
      margin_percentage: initialData?.margin_percentage?.toString() || "",
    },
  });

  const onSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        margin_percentage: values.margin_percentage === "" ? null : Number(values.margin_percentage),
      };
      
      if (initialData) {
        await updateCategory(initialData.id, payload as any);
      } else {
        await createCategory(payload as any);
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error al guardar categoría:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          placeholder="Ej: Cámaras IP, Grabadores..."
          {...register("name")}
          autoFocus
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message as React.ReactNode}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="margin_percentage">Margen Sugerido (%)</Label>
        <Input
          id="margin_percentage"
          type="number"
          step="0.01"
          placeholder="Ej: 30.00 (Opcional, usa el margen global si está vacío)"
          {...register("margin_percentage")}
          disabled={isSubmitting}
        />
        {errors.margin_percentage && (
          <p className="text-sm text-destructive">{errors.margin_percentage.message as React.ReactNode}</p>
        )}
      </div>

      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Actualizar Categoría" : "Guardar Categoría"}
        </Button>
      </DialogFooter>
    </form>
  );
}
