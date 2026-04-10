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
import { Brand } from "@/types";
import { createBrand, updateBrand } from "@/services/brandService";

const brandSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string().min(2, "El slug debe tener al menos 2 caracteres"),
});

type BrandFormValues = {
  name: string;
  slug: string;
};

interface BrandFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Brand;
}

export function BrandForm({ onSuccess, onCancel, initialData }: BrandFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
    },
  });

  const onSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      if (initialData) {
        await updateBrand(initialData.id, values);
      } else {
        await createBrand(values);
      }
      onSuccess();
    } catch (error) {
      console.error("Error al guardar marca:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    // Generate slug automatically
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setValue("slug", slug, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Marca</Label>
        <Input
          id="name"
          placeholder="Ej: Hikvision, Dahua, Ubiquiti..."
          {...register("name")}
          onChange={handleNameChange}
          autoFocus
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message as React.ReactNode}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          placeholder="ej-hikvision"
          {...register("slug")}
          disabled={isSubmitting}
        />
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message as React.ReactNode}</p>
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
          {initialData ? "Actualizar Marca" : "Guardar Marca"}
        </Button>
      </DialogFooter>
    </form>
  );
}
