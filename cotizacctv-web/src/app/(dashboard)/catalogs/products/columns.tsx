"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product } from "@/types"
import { Button } from "@/components/ui/button"
import { Edit2, Trash, ArrowUpDown } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export const getColumns = (
  onEdit: (product: Product) => void,
  onDelete: (id: number, name: string) => void
): ColumnDef<Product>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Producto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const product = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{product.name}</span>
          <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
        </div>
      )
    },
  },
  {
    // Columna oculta — permite que el globalFilter encuentre por SKU
    accessorKey: "sku",
    header: "SKU",
    enableHiding: true,
    meta: { hidden: true },
    cell: () => null,
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => {
      const plainTextDescription = row.original.description?.replace(/<[^>]*>?/gm, "") || "Sin descripción"
      return (
        <div 
          className="max-w-[150px] truncate text-sm text-muted-foreground" 
          title={plainTextDescription}
        >
          {plainTextDescription}
        </div>
      )
    },
  },
  {
    id: "brand",
    accessorFn: (row) => row.brand?.name,
    header: "Marca",
    cell: ({ row }) => {
      const brandName = row.original.brand?.name
      return (
        <div className="flex">
          <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-inset ring-slate-500/10 uppercase tracking-tight">
            {brandName || "N/A"}
          </span>
        </div>
      )
    },
  },
  {
    id: "category",
    accessorFn: (row) => row.category?.name,
    header: "Categoría",
    cell: ({ row }) => {
      const categoryName = row.original.category?.name
      return (
        <div className="flex">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase tracking-tight">
            {categoryName || "Sin categoría"}
          </span>
        </div>
      )
    },
  },
  {
    id: "suppliers",
    header: "Proveedores",
    accessorFn: (row) => row.suppliers?.map(s => s.name).join(", "),
    cell: ({ row }) => {
      const suppliers = row.original.suppliers
      if (!suppliers || suppliers.length === 0) return <span className="text-sm text-muted-foreground">Sin proveedores</span>
      
      const firstSupplier = suppliers[0].name
      const extraCount = suppliers.length - 1

      return (
        <span className="text-sm text-muted-foreground" title={suppliers.map(s => s.name).join(", ")}>
          {firstSupplier} {extraCount > 0 && <span className="text-xs font-medium">+{extraCount} más</span>}
        </span>
      )
    },
  },
  {
    accessorKey: "calculated_sale_price",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-mr-4"
          >
            Precio Venta
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const product = row.original
      const star = product.suppliers?.find(s => s.pivot?.is_default) ?? product.suppliers?.[0]
      const baseCost = star?.pivot?.cost ? Number(star.pivot.cost) : null
      
      const formatCurrency = (val: number | null | undefined) => 
        val !== null && val !== undefined ? `Q ${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"

      return (
        <div className="flex flex-col items-end">
          <span className="font-semibold text-emerald-600 font-mono">
            {formatCurrency(Number(product.calculated_sale_price))}
          </span>
          <span className="text-xs text-muted-foreground">
            Base: {formatCurrency(baseCost)}
          </span>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      const product = row.original

      return (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => onEdit(product)}
          >
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Eliminar</span>
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará permanentemente el producto <strong>{product.name}</strong> y no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(product.id, product.name)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    },
  },
]
