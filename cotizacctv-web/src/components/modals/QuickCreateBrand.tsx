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
import { Plus, Loader2, ShieldCheck } from "lucide-react";
import { createBrand } from "@/services/brandService";
import { Brand } from "@/types";
import { toast } from "sonner";

interface QuickCreateBrandProps {
  onSuccess: (newItem: Brand) => void;
  trigger?: React.ReactNode;
}

export function QuickCreateBrand({ onSuccess, trigger }: QuickCreateBrandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newItem = await createBrand({ name: name.trim() });
      toast.success("Marca creada correctamente");
      onSuccess(newItem);
      setIsOpen(false);
      setName("");
    } catch (error: any) {
      console.error("Error al crear marca:", error);
      toast.error("Error al crear la marca");
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
            <ShieldCheck className="h-5 w-5 text-primary" />
            Nueva Marca
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Nombre de la Marca</Label>
            <Input
              id="brand-name"
              placeholder="Ej: Hikvision, Dahua, etc."
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
              Crear Marca
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
