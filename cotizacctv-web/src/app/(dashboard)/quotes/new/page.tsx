"use client";

import Link from "next/link";
import { Trash2, PackageSearch, GripVertical } from "lucide-react";
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
import { generateQuote } from "@/services/quoteService";
import { useState, useEffect, useMemo, useCallback } from "react";
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

export default function NewQuotePage() {

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<Quote | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // ── Fetch initial data ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingProducts(true);
        const [products, settingsData] = await Promise.all([
          getProducts(),
          getSettings(),
        ]);
        setAvailableProducts(products);
        setSettings(settingsData);
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchData();
  }, []);

  // ── Form setup ──────────────────────────────────────────────────────────
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema) as Resolver<QuoteFormValues>,
    defaultValues: {
      client_name: "",
      freight_cost: 0,
      installation_total: 0,
      distance_km: 0,
      installation_days: 1,
      items: [],
    },
    mode: "onChange",
  });

  // ── Session-storage draft ───────────────────────────────────────────────
  useEffect(() => {
    const draft = sessionStorage.getItem("quote_draft_state");
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as QuoteFormValues;
        form.reset(parsed);
      } catch (e) {
        console.error("Error parsing quote draft", e);
      }
    }

    const subscription = form.watch((value, { name }) => {
      sessionStorage.setItem("quote_draft_state", JSON.stringify(value));

      if (name) setQuoteResult(null);

      // Auto-calc freight
      if (name === "distance_km") {
        const distance = Number(value.distance_km || 0);
        const ratePerKm = Number(settings.freight_cost_per_km || 0);
        form.setValue("freight_cost", Math.round(distance * ratePerKm));
      }

      // Auto-calc labor
      if (name?.startsWith("items")) {
        let totalDevices = 0;
        value.items?.forEach((item: any) => {
          if (!item?.product_id) return;
          const product = availableProducts.find(
            (p) => p.id === item.product_id
          );
          const slug = product?.category?.slug?.toLowerCase() || "";
          if (
            slug.includes("camara") ||
            slug.includes("dvr") ||
            slug.includes("nvr")
          ) {
            totalDevices += Number(item.quantity || 0);
          }
        });
        const laborPerDevice = Number(settings.labor_cost_per_device || 0);
        form.setValue(
          "installation_total",
          Math.round(totalDevices * laborPerDevice)
        );
      }
    });

    return () => subscription.unsubscribe();
  }, [form, settings, availableProducts]);

  // ── Field array ─────────────────────────────────────────────────────────
  const { fields, append, remove, update, move } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // ── Live totals ─────────────────────────────────────────────────────────
  const watchedItems = useWatch({ control: form.control, name: "items" }) || [];
  const watchedFreight =
    useWatch({ control: form.control, name: "freight_cost" }) || 0;
  const watchedInstallation =
    useWatch({ control: form.control, name: "installation_total" }) || 0;

  const liveTotalMaterials = useMemo(() => {
    return (watchedItems as QuoteFormValues["items"]).reduce((acc, item) => {
      if (!item) return acc;
      const product = availableProducts.find((p) => p.id === item.product_id);
      return product
        ? acc + Math.round(product.calculated_sale_price * (item.quantity || 0))
        : acc;
    }, 0);
  }, [watchedItems, availableProducts]);

  const grandTotal =
    liveTotalMaterials +
    Number(watchedFreight) +
    Number(watchedInstallation);

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
      const result = await generateQuote(data);
      setQuoteResult(result);
      sessionStorage.removeItem("quote_draft_state");
      // Note: We don't reset the form immediately so the user can see their data in disabled state
    } catch (error) {
      console.error("Error al generar cotización:", error);
      alert("Error en la validación del backend o conexión. Revisa la consola.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Generar Nueva Cotización
          </h1>
          <p className="text-slate-500 mt-1">
            Configura los parámetros del proyecto y los equipos para calcular el presupuesto final.
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Cliente</label>
              <input
                {...form.register("client_name")}
                disabled={!!quoteResult}
                className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Nombre de la empresa o persona"
              />
              {form.formState.errors.client_name && (
                <span className="text-red-500 text-xs mt-1 ml-1">
                  {form.formState.errors.client_name.message}
                </span>
              )}
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
                  disabled={!!quoteResult}
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Distancia (KM)</label>
                <input
                  type="number"
                  {...form.register("distance_km")}
                  disabled={!!quoteResult}
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Logística / Flete (Q)</label>
                <input
                  type="number"
                  {...form.register("freight_cost")}
                  disabled={!!quoteResult}
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Mano de Obra (Q)</label>
                <input
                  type="number"
                  {...form.register("installation_total")}
                  disabled={!!quoteResult}
                  className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
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
            </div>

            {/* ── GLOBAL SEARCH BAR ── */}
            <div className="px-6 py-4 bg-emerald-50/40 border-b border-slate-100">
              <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-2">
                ⚡ Agregar producto (busca y selecciona para agregar)
              </label>
              <ProductSearchBar
                products={availableProducts}
                onSelect={handleQuickAdd}
                isLoading={isLoadingProducts}
                disabled={!!quoteResult}
              />
            </div>

            {/* ── DENSE TABLE ── */}
            {fields.length > 0 ? (
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
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
                                      disabled={!!quoteResult}
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
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                                          {selectedProduct.sku}
                                        </span>
                                        <span className="text-slate-800 font-medium leading-tight">
                                          {selectedProduct.name}
                                        </span>
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
                                      disabled={!!quoteResult}
                                      className="w-16 mx-auto block rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                                    />
                                  </td>

                                  {/* P. Unit */}
                                  <td className="px-3 py-1.5 text-right">
                                    <span className="text-slate-500 font-medium tabular-nums">
                                      Q {fmt(unitPrice)}
                                    </span>
                                  </td>

                                  {/* Subtotal */}
                                  <td className="px-4 py-1.5 text-right">
                                    <span className="text-emerald-700 font-bold tabular-nums">
                                      Q {fmt(subtotal)}
                                    </span>
                                  </td>

                                  {/* Delete */}
                                  <td className="px-2 py-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => remove(index)}
                                      disabled={!!quoteResult}
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
                    </SortableContext>
                  </DndContext>

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
        </div>

        {/* ── RIGHT COLUMN: Sticky Sidebar ── */}
        <div className="lg:col-span-4 sticky top-6 h-fit space-y-4">
          {!quoteResult ? (
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
                    <span className="text-slate-500 font-medium whitespace-nowrap">Equipos y Materiales</span>
                    <span className="text-slate-900 font-semibold tabular-nums">
                      Q {fmt(liveTotalMaterials)}
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
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Generar Cotización"
                    )}
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-3 px-4">
                    Al generar la cotización se guardará el registro y podrás descargar el PDF formal.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* SUCCESS CARD IN SIDEBAR */
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
              <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-[50px] -mr-16 -mt-16" />
                <CardHeader className="border-b border-white/10 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-1 bg-green-500/20 rounded-md">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    Cotización Generada
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-slate-400 text-sm">
                      <span>Subtotal Equipos</span>
                      <span className="text-white font-medium">Q {fmt(quoteResult.subtotal_materials)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-sm">
                      <span>Mano de Obra</span>
                      <span className="text-white font-medium">Q {fmt(quoteResult.installation_total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-sm">
                      <span>Logística &amp; Otros</span>
                      <span className="text-white font-medium">
                        Q {fmt(
                          Number(quoteResult.gasoline_cost || 0) +
                          Number(quoteResult.per_diem_cost || 0) +
                          Number(quoteResult.freight_cost || 0)
                        )}
                      </span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="pt-2">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                        Gran Total
                      </p>
                      <p className="text-4xl font-black text-white tabular-nums">
                        Q {fmt(quoteResult.grand_total)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <Link
                      href={`/quotes/${quoteResult.id}`}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2"
                    >
                      Ver Detalles
                    </Link>
                    <a
                      href={`http://localhost:8000/api/quotes/${quoteResult.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Descargar PDF
                    </a>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setQuoteResult(null);
                        form.reset({
                          client_name: "",
                          freight_cost: 0,
                          installation_total: 0,
                          distance_km: 0,
                          installation_days: 1,
                          items: [],
                        });
                      }}
                      className="text-slate-500 hover:text-slate-300 text-xs font-medium py-2 transition-colors"
                    >
                      Nueva Cotización
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!quoteResult && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <h4 className="text-blue-800 text-[10px] font-bold uppercase mb-1">Nota de Sistema</h4>
              <p className="text-blue-700 text-[11px] leading-relaxed">
                Los precios de materiales se basan en el precio de venta sugerido configurado en el catálogo.
              </p>
            </div>
          )}
        </div>
      </form>

      {/* Result viewer removed - now handled in sidebar */}
    </div>
  );
}
