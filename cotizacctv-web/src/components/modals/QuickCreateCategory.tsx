"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Tag } from "lucide-react";
import { createCategory, Category } from "@/services/categoryService";
import { toast } from "sonner";

interface QuickCreateCategoryProps {
  onSuccess: (newItem: Category) => void;
  trigger?: React.ReactNode;
}

export function QuickCreateCategory({ onSuccess, trigger }: QuickCreateCategoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newItem = await createCategory({ name: name.trim() });
      toast.success("Categoría creada correctamente");
      onSuccess(newItem);
      setIsOpen(false);
      setName("");
    } catch (error: any) {
      console.error("Error al crear categoría:", error);
      toast.error(error.response?.data?.message || "Error al crear la categoría");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Nueva
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Nueva Categoría
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nombre de la Categoría</Label>
            <Input
              id="category-name"
              placeholder="Ej: Seguridad, Redes, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Categoría
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
