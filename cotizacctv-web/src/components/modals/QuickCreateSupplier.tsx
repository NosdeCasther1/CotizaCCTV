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
import { Plus, Loader2, Truck } from "lucide-react";
import { createSupplier, Supplier } from "@/services/supplierService";
import { toast } from "sonner";

interface QuickCreateSupplierProps {
  onSuccess: (newItem: Supplier) => void;
  trigger?: React.ReactNode;
}

export function QuickCreateSupplier({ onSuccess, trigger }: QuickCreateSupplierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newItem = await createSupplier({ 
        name: name.trim(),
        email: null,
        phone: null
      });
      toast.success("Proveedor creado correctamente");
      onSuccess(newItem);
      setIsOpen(false);
      setName("");
    } catch (error: any) {
      console.error("Error al crear proveedor:", error);
      toast.error(error.response?.data?.message || "Error al crear el proveedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={trigger || (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Nueva
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Nuevo Proveedor
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">Nombre del Proveedor</Label>
            <Input
              id="supplier-name"
              placeholder="Ej: SYSCOM, EPCOM, etc."
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
              Crear Proveedor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
