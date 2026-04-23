"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Trash2, PackageSearch, GripVertical, Pencil, ArrowLeft, Loader2, Save, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
  Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteSchema, QuoteFormValues } from "@/lib/validations/quote";
import { getQuoteById, updateQuote } from "@/services/quoteService";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Quote, Product } from "@/types";
import { getProducts } from "@/services/productService";
import { getSettings } from "@/services/settingService";
import { ProductSearchBar } from "@/components/ProductSearchBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Helper ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("es-GT", { maximumFractionDigits: 0 });

// ─── SortableTableRow ──────────────────────────────────────────────────────
function SortableTableRow({
  id,
  isDragDisabled = false,
  children,
}: {
  id: string;
  isDragDisabled?: boolean;
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isDragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="group hover:bg-slate-50/80 transition-colors"
    >
      {children({ ...attributes, ...listeners })}
    </tr>
  );
}

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isClearListDialogOpen, setIsClearListDialogOpen] = useState(false);
  
  const lastAutoDiscountRef = useRef(0);

  // ── Form setup ──────────────────────────────────────────────────────────
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema) as Resolver<QuoteFormValues>,
    defaultValues: {
      client_name: "",
      freight_cost: 0,
      installation_total: 0,
      distance_km: 0,
      installation_days: 1,
      discount_amount: 0,
      discount_type: "fixed",
      items: [],
      extra_expenses: [],
    },
    mode: "onChange",
  });

  // ── Fetch initial data ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [products, settingsData, quoteData] = await Promise.all([
          getProducts(),
          getSettings(),
          getQuoteById(id),
        ]);
        setAvailableProducts(products);
        setSettings(settingsData);

        const formattedItems = quoteData.items?.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.frozen_unit_cost || item.product?.calculated_sale_price || 0
        })) || [];

        const formattedExtraExpenses = quoteData.extra_expenses?.map((exp: any) => ({
          description: exp.description,
          amount: Number(exp.amount),
        })) || [];

        form.reset({
          client_name: quoteData.client_name,
          client_phone: quoteData.client_phone || "",
          freight_cost: Number(quoteData.freight_cost),
          installation_total: Number(quoteData.installation_total),
          distance_km: Number(quoteData.distance_km || 0),
          installation_days: Number(quoteData.installation_days),
          discount_amount: Number(quoteData.discount_amount || 0),
          discount_type: quoteData.discount_type || "fixed",
          items: formattedItems,
          extra_expenses: formattedExtraExpenses,
        });

        let initialAutoDiscount = 0;
        formattedItems.forEach((item: any) => {
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            const suggestedPrice = Number(product.calculated_sale_price || 0);
            const unitPrice = Number(item.unit_price || 0);
            if (unitPrice < suggestedPrice) {
              initialAutoDiscount += (suggestedPrice - unitPrice) * Number(item.quantity || 0);
            }
          }
        });
        lastAutoDiscountRef.current = initialAutoDiscount;

      } catch (error) {
        console.error("Error al cargar datos para edición:", error);
        alert("Error al cargar la cotización.");
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, form, router]);

  // ── Auto-calculations ──
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Auto-calc freight
      if (name === "distance_km") {
        const distance = Number(value.distance_km || 0);
        const ratePerKm = Number(settings.freight_cost_per_km || 0);
        form.setValue("freight_cost", Math.round(distance * ratePerKm));
      }

      // Auto-calc labor & v1.3.1 Watcher de Descuento Automático Reactivo
      if (name?.startsWith("items") || name === "discount_type") {
        let totalDevices = 0;
        let currentAutoDiscount = 0;
        
        const currentItems = form.getValues("items") || [];
        
        currentItems.forEach((item: any) => {
          if (!item.product_id) return;
          const product = availableProducts.find(p => p.id === item.product_id);
          if (!product) return;

          const slug = product?.category?.slug?.toLowerCase() || "";
          if (slug.includes("camara") || slug.includes("dvr") || slug.includes("nvr")) {
            totalDevices += Number(item.quantity || 0);
          }

          const suggestedPrice = Number(product.calculated_sale_price || 0);
          const unitPrice = Number(item.unit_price || 0);
          if (unitPrice < suggestedPrice) {
            currentAutoDiscount += (suggestedPrice - unitPrice) * Number(item.quantity || 0);
          }
        });

        const laborPerDevice = Number(settings.labor_cost_per_device || 0);
        form.setValue("installation_total", Math.round(totalDevices * laborPerDevice));

        const discountType = form.getValues("discount_type");
        if (discountType === "fixed") {
          const delta = currentAutoDiscount - lastAutoDiscountRef.current;
          if (delta !== 0) {
            const currentDiscountAmount = Number(form.getValues("discount_amount") || 0);
            const newTotalDiscount = Math.max(0, currentDiscountAmount + delta);
            form.setValue("discount_amount", Math.round(newTotalDiscount));
            lastAutoDiscountRef.current = currentAutoDiscount;
          }
        } else {
           lastAutoDiscountRef.current = 0;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, settings, availableProducts]);

  // ── Field array ─────────────────────────────────────────────────────────
  const { fields, append, remove, update, move } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { 
    fields: extraFields, 
    append: appendExtra, 
    remove: removeExtra 
  } = useFieldArray({
    control: form.control,
    name: "extra_expenses",
  });

  // ── Live totals ─────────────────────────────────────────────────────────
  const watchedItems = useWatch({ control: form.control, name: "items" }) || [];
  const watchedFreight =
    useWatch({ control: form.control, name: "freight_cost" }) || 0;
  const watchedInstallation =
    useWatch({ control: form.control, name: "installation_total" }) || 0;
  const watchedDiscountAmount =
    useWatch({ control: form.control, name: "discount_amount" }) || 0;
  const watchedDiscountType =
    useWatch({ control: form.control, name: "discount_type" }) || "fixed";

  const watchedExtraExpenses = useWatch({ control: form.control, name: "extra_expenses" }) || [];

  const liveTotalMaterials = useMemo(() => {
    return (watchedItems as QuoteFormValues["items"]).reduce((acc, item) => {
      if (!item || !item.product_id) return acc;
      return acc + Math.round((item.unit_price || 0) * (item.quantity || 0));
    }, 0);
  }, [watchedItems]);

  const liveTotalPurchasePrice = useMemo(() => {
    return (watchedItems as QuoteFormValues["items"]).reduce((acc, item) => {
      if (!item) return acc;
      const product = availableProducts.find((p) => p.id === item.product_id);
      if (!product) return acc;

      const defaultSupplier = product.suppliers?.find((s: any) => s.pivot.is_default);
      const cost = defaultSupplier 
        ? Number(defaultSupplier.pivot.cost) 
        : (Number(product.purchase_price) || 0);

      return acc + Math.round(cost * (item.quantity || 0));
    }, 0);
  }, [watchedItems, availableProducts]);

  const liveTotalSuggestedMaterials = useMemo(() => {
    return (watchedItems as QuoteFormValues["items"]).reduce((acc, item) => {
      if (!item || !item.product_id) return acc;
      const product = availableProducts.find(p => p.id === item.product_id);
      const suggested = product?.calculated_sale_price || item.unit_price || 0;
      return acc + Math.round(suggested * (item.quantity || 0));
    }, 0);
  }, [watchedItems, availableProducts]);

  const liveBaseTotal =
    liveTotalSuggestedMaterials +
    Number(watchedFreight) +
    Number(watchedInstallation);

  const liveDiscountValue = useMemo(() => {
    const amount = Number(watchedDiscountAmount);
    if (watchedDiscountType === "percentage") {
      return Math.round(liveBaseTotal * (amount / 100));
    }
    return amount;
  }, [liveBaseTotal, watchedDiscountAmount, watchedDiscountType]);

  const liveTotalExtraExpenses = useMemo(() => {
    return (watchedExtraExpenses as QuoteFormValues["extra_expenses"]).reduce((acc, exp) => {
      return acc + (Number(exp.amount) || 0);
    }, 0);
  }, [watchedExtraExpenses]);

  const liveEstimatedGrossProfit = useMemo(() => {
    const profitEquipos = liveTotalMaterials - liveTotalPurchasePrice;
    return profitEquipos + Number(watchedInstallation) + Number(watchedFreight);
  }, [liveTotalMaterials, liveTotalPurchasePrice, watchedInstallation, watchedFreight]);

  const liveNetRealProfit = useMemo(() => {
    return liveEstimatedGrossProfit - (liveDiscountValue || 0) - liveTotalExtraExpenses;
  }, [liveEstimatedGrossProfit, liveDiscountValue, liveTotalExtraExpenses]);

  const grandTotal = Math.max(0, liveBaseTotal - (liveDiscountValue || 0));

  // ── DnD sensors ─────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex((f) => f.id === active.id);
        const newIndex = fields.findIndex((f) => f.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          move(oldIndex, newIndex);
        }
      }
    },
    [fields, move]
  );

  // ── POS: Quick-add handler ──────────────────────────────────────────────
  const handleQuickAdd = useCallback(
    (product: Product) => {
      const currentItems = form.getValues("items");
      const existingIndex = currentItems.findIndex(
        (item) => item.product_id === product.id
      );

      if (existingIndex !== -1) {
        // Product already in list → increment quantity
        const existing = currentItems[existingIndex];
        update(existingIndex, {
          ...existing,
          quantity: (existing.quantity || 0) + 1,
        });
      } else {
        // New product → append
        append({
          product_id: product.id,
          quantity: 1,
          unit_price: product.calculated_sale_price,
        });
      }
    },
    [form, append, update]
  );

  // ── Submit ──────────────────────────────────────────────────────────────
  const onSubmit = async (data: QuoteFormValues) => {
    setIsSubmitting(true);
    try {
      await updateQuote(id, data);
      router.push(`/quotes/${id}`);
    } catch (error) {
      console.error("Error al actualizar cotización:", error);
      alert("Error en la validación del backend o conexión. Revisa la consola.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium tracking-wide">Cargando cotización para editar...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
        <div>
          <button 
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Volver al detalle</span>
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Pencil className="w-8 h-8 text-blue-600" />
            Editar Cotización #{id}
          </h1>
          <p className="text-slate-500 mt-1">
            Modifica los parámetros y equipos de la cotización existente.
          </p>
        </div>
      </header>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative"
      >
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Información General */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800">Información General</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Cliente</label>
                <input
                  {...form.register("client_name")}
                  
                  suppressHydrationWarning={true}
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Nombre de la empresa o persona"
                />
                {form.formState.errors.client_name && (
                  <span className="text-red-500 text-xs mt-1 ml-1">
                    {form.formState.errors.client_name.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Teléfono (WhatsApp)</label>
                <input
                  {...form.register("client_phone")}
                  
                  suppressHydrationWarning={true}
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ej. +502 1234 5678"
                />
              </div>
            </div>
          </section>

          {/* Logística & Operativa */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-indigo-600 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800">Logística &amp; Operativa</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Días de Instalación</label>
                <input
                  type="number"
                  {...form.register("installation_days")}
                  
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Distancia (KM)</label>
                <input
                  type="number"
                  {...form.register("distance_km")}
                  
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Logística / Flete (Q)</label>
                <input
                  type="number"
                  {...form.register("freight_cost")}
                  
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Mano de Obra (Q)</label>
                <input
                  type="number"
                  {...form.register("installation_total")}
                  
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* Descuentos & Ajustes */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-red-600 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800">Descuentos &amp; Ajustes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Tipo de Descuento</label>
                <select
                  {...form.register("discount_type")}
                  
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:opacity-50"
                >
                  <option value="fixed">Monto Fijo (Q)</option>
                  <option value="percentage">Porcentaje (%)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">
                  {watchedDiscountType === "percentage" ? "Porcentaje (%)" : "Descuento (Q)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    {watchedDiscountType === "percentage" ? "%" : "Q"}
                  </span>
                  <input
                    type="number"
                    {...form.register("discount_amount")}
                    
                    className="w-full rounded-xl border border-slate-200 p-3 pl-8 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:opacity-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ══ Equipos & Materiales (POS) ══ */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="w-1 h-6 bg-emerald-600 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800 flex-1">
                Equipos &amp; Materiales
              </h2>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                {fields.length} ítem{fields.length !== 1 ? "s" : ""}
              </span>
              <AlertDialog open={isClearListDialogOpen} onOpenChange={setIsClearListDialogOpen}>
                <AlertDialogTrigger render={
                  <button
                    type="button"
                    disabled={!!quoteResult || fields.length === 0}
                    className="ml-4 text-[10px] font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Trash2 className="h-3 w-3" />
                    Limpiar Lista
                  </button>
                } />
                <AlertDialogContent>
                  <AlertDialogHeader className="flex flex-col items-center justify-center">
                    <div className="rounded-full bg-red-100 p-3 mb-2">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-center">¿Confirmar Limpieza?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                      Esta acción eliminará todos los equipos y materiales de la lista actual.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      variant="destructive"
                      onClick={() => {
                        form.setValue("items", []);
                        setIsClearListDialogOpen(false);
                      }}
                    >
                      Sí, vaciar lista
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* ── GLOBAL SEARCH BAR ── */}
            <div className="px-6 py-4 bg-emerald-50/40 border-b border-slate-100">
              <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-2">
                ⚡ Agregar producto (busca y selecciona para agregar)
              </label>
              <ProductSearchBar
                products={availableProducts}
                onSelect={handleQuickAdd}
                
                
              />
            </div>

            {/* ── DENSE TABLE ── */}
            {fields.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="w-6" />
                      <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">
                        #
                      </th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20">
                        Cant.
                      </th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28">
                        P. Unit.
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28">
                        Subtotal
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                      <tbody className="divide-y divide-slate-50">
                        {fields.map((field, index) => {
                          const currentItem = watchedItems[index];
                          const productId = currentItem?.product_id;
                          const selectedProduct = availableProducts.find(
                            (p) => p.id === productId
                          );
                          const quantity = currentItem?.quantity || 0;
                          const unitPrice =
                            selectedProduct?.calculated_sale_price ?? 0;
                          const subtotal = Math.round(unitPrice * quantity);

                          return (
                            <SortableTableRow
                              key={field.id}
                              id={field.id}
                              isDragDisabled={!!quoteResult}
                            >
                              {(dragHandleProps) => (
                                <>
                                  {/* Grip handle */}
                                  <td className="pl-2 py-1.5">
                                    <button
                                      type="button"
                                      {...dragHandleProps}
                                      className="p-1 rounded text-slate-200 hover:text-slate-400 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition-colors disabled:hidden opacity-0 group-hover:opacity-100"
                                      title="Arrastrar para reordenar"
                                    >
                                      <GripVertical className="h-3.5 w-3.5" />
                                    </button>
                                  </td>

                                  {/* # */}
                                  <td className="px-4 py-1.5 text-slate-300 font-mono text-xs text-center">
                                    {index + 1}
                                  </td>

                                  {/* Producto */}
                                  <td className="px-3 py-1.5">
                                    {selectedProduct ? (
                                      <div className="flex flex-col">
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <span className="flex items-center gap-2 cursor-help group/info">
                                              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                                                {selectedProduct.sku}
                                              </span>
                                              <span className="text-slate-800 font-medium leading-tight border-b border-dotted border-slate-300 group-hover/info:border-slate-500 transition-colors">
                                                {selectedProduct.name}
                                              </span>
                                              <Info className="h-3 w-3 text-slate-400 group-hover/info:text-blue-500 transition-colors" />
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="max-w-sm bg-slate-900 text-slate-50 p-0 shadow-2xl border-none rounded-xl overflow-hidden">
                                            <div className="flex gap-4">
                                              {selectedProduct.image_url && (
                                                <div className="w-24 h-24 bg-white shrink-0">
                                                  <img 
                                                    src={selectedProduct.image_url} 
                                                    alt={selectedProduct.name} 
                                                    className="w-full h-full object-contain p-1"
                                                  />
                                                </div>
                                              )}
                                              <div className="p-3 flex-1 min-w-[150px]">
                                                <div className="flex items-center gap-1.5 border-b border-slate-700 pb-1 mb-1">
                                                  <Info className="h-3 w-3 text-blue-400" />
                                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Especificaciones</p>
                                                </div>
                                                <p className="text-[11px] leading-relaxed text-slate-200 line-clamp-6">
                                                  {selectedProduct.description 
                                                    ? selectedProduct.description.replace(/<[^>]*>/g, "") 
                                                    : "Sin descripción técnica disponible."}
                                                </p>
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                        {/* Feedback de Utilidad */}
                                        <div className="mt-1 flex items-center gap-2">
                                          {(() => {
                                            const defaultSupplier = selectedProduct.suppliers?.find(s => s.pivot.is_default);
                                            const cost = defaultSupplier 
                                              ? Number(defaultSupplier.pivot.cost) 
                                              : (Number(selectedProduct.purchase_price) || 0);
                                            
                                            const price = currentItem?.unit_price || 0;
                                            const utility = price - cost;
                                            const utilityPercent = price > 0 ? (utility / price) * 100 : -100;
                                            const isLow = utilityPercent < 5;
                                            
                                            return (
                                              <span className={cn(
                                                "text-[10px] font-medium transition-colors",
                                                isLow ? "text-red-500 font-bold" : "text-slate-400"
                                              )}>
                                                Costo: Q{cost.toFixed(2)} | Utilidad: Q{utility.toFixed(2)} ({utilityPercent.toFixed(1)}%)
                                                {isLow && " ⚠️ Margen Bajo"}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-xs">
                                        Producto no encontrado
                                      </span>
                                    )}
                                  </td>

                                  {/* Cant. */}
                                  <td className="px-3 py-1.5">
                                    <input
                                      type="number"
                                      min={1}
                                      {...form.register(`items.${index}.quantity`, {
                                        valueAsNumber: true,
                                      })}
                                      className="w-16 mx-auto block rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                                    />
                                  </td>

                                  {/* P. Unit */}
                                  <td className="px-3 py-1.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-slate-400 text-xs font-semibold">Q</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        {...form.register(`items.${index}.unit_price`, {
                                          valueAsNumber: true,
                                        })}
                                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                                      />
                                    </div>
                                  </td>

                                  {/* Subtotal */}
                                  <td className="px-4 py-1.5 text-right">
                                    <span className="text-emerald-700 font-bold tabular-nums">
                                      Q {fmt(Math.round((currentItem?.unit_price || 0) * (currentItem?.quantity || 0)))}
                                    </span>
                                  </td>

                                  {/* Delete */}
                                  <td className="px-2 py-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => remove(index)}
                                      title="Eliminar fila"
                                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:hidden"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </>
                              )}
                            </SortableTableRow>
                          );
                        })}
                      </tbody>

                   {/* Footer total */}
                   <tfoot>
                    <tr className="border-t-2 border-slate-100 bg-slate-50/60">
                      <td colSpan={4} className="px-4 py-2.5 text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Total Materiales
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-base font-black text-slate-900 tabular-nums">
                          Q {fmt(liveTotalMaterials)}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              </SortableContext>
              </DndContext>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
                <div className="p-4 bg-slate-100 rounded-full">
                  <PackageSearch className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">
                  Sin productos agregados
                </p>
                <p className="text-slate-400 text-sm max-w-xs">
                  Usa el buscador de arriba para agregar equipos a esta cotización.
                </p>
              </div>
            )}
          </section>

          {/* ══ Gastos Operativos del Proyecto (Variables) ══ */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="w-1 h-6 bg-orange-500 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800 flex-1">
                Gastos Operativos del Proyecto (Variables)
              </h2>
              <button
                type="button"
                onClick={() => appendExtra({ description: "", amount: 0 })}
                
                className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                + Agregar Gasto
              </button>
            </div>

            <div className="p-6">
              {extraFields.length > 0 ? (
                <div className="space-y-4">
                  {extraFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex-1 space-y-1">
                        <input
                          {...form.register(`extra_expenses.${index}.description`)}
                          
                          placeholder="Ej: Gasolina extra, Almuerzos, etc."
                          className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                        />
                      </div>
                      <div className="w-40 space-y-1">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Q</span>
                          <input
                            type="number"
                            step="0.01"
                            {...form.register(`extra_expenses.${index}.amount`)}
                            
                            className="w-full rounded-xl border border-slate-200 p-3 pl-8 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-semibold"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExtra(index)}
                        
                        className="p-3 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-0"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 text-sm">No hay gastos extra registrados.</p>
                  <button
                    type="button"
                    onClick={() => appendExtra({ description: "", amount: 0 })}
                    
                    className="mt-2 text-xs font-bold text-orange-600 hover:underline"
                  >
                    Haga clic aquí para agregar el primero
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN: Sticky Sidebar ── */}
        <div className="lg:col-span-4 sticky top-6 h-fit space-y-4">
            <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in duration-300">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  Resumen Financiero
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium whitespace-nowrap">Total Bruto Equipos</span>
                    <span className="text-slate-900 font-semibold tabular-nums">
                      Q {fmt(liveTotalSuggestedMaterials)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Mano de Obra</span>
                    <span className="text-slate-900 font-semibold tabular-nums">
                      Q {fmt(Number(watchedInstallation))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Logística / Flete</span>
                    <span className="text-slate-900 font-semibold tabular-nums">
                      Q {fmt(Number(watchedFreight))}
                    </span>
                  </div>
                  {liveDiscountValue > 0 && (
                    <div className="flex justify-between items-center text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                      <span className="font-medium">Descuento Especial</span>
                      <span className="font-bold tabular-nums">
                        - Q {fmt(liveDiscountValue)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Utilidad Bruta Estimada</span>
                    <span className="text-emerald-700 font-bold text-xs">+ Q {fmt(liveEstimatedGrossProfit)}</span>
                  </div>
                  <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (liveEstimatedGrossProfit / (grandTotal || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {liveTotalExtraExpenses > 0 && (
                  <div className="flex justify-between items-center px-2 text-orange-600">
                    <span className="text-xs font-medium">(-) Gastos Extra Var.</span>
                    <span className="text-xs font-bold tabular-nums">Q {fmt(liveTotalExtraExpenses)}</span>
                  </div>
                )}

                <div className="bg-blue-900 text-white p-4 rounded-2xl shadow-inner">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Utilidad Neta Real</span>
                    <span className="text-blue-300 font-bold text-xs">Final</span>
                  </div>
                  <div className="text-2xl font-black tabular-nums">
                    Q {fmt(liveNetRealProfit)}
                  </div>
                  <p className="text-[9px] opacity-60 mt-1 italic leading-tight">
                    * Descuentos y gastos extra aplicados.
                  </p>
                </div>

                <Separator className="bg-slate-100" />

                <div className="pt-2">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Gran Total Estimado
                    </span>
                    <span className="text-blue-600 font-bold text-[10px]">IVA incluido*</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tabular-nums">
                    Q {fmt(grandTotal)}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting || fields.length === 0}
                    className="w-full bg-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Guardar Cambios
                        </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => router.back()}
                    className="w-full bg-slate-100 text-slate-600 px-10 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all text-center mt-3"
                  >
                    Cancelar
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-3 px-4">
                    Los cambios se guardarán en la base de datos.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <h4 className="text-blue-800 text-[10px] font-bold uppercase mb-1">Nota de Sistema</h4>
              <p className="text-blue-700 text-[11px] leading-relaxed">
                Los precios de materiales se basan en el precio de venta sugerido configurado en el catálogo.
              </p>
            </div>
        </div>
      </form>

      {/* Result viewer removed - now handled in sidebar */}
    </div>
  );
}
