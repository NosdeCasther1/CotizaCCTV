"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteSchema, QuoteFormValues } from "@/lib/validations/quote";
import { getQuoteById, updateQuote } from "@/services/quoteService";
import { useState, useEffect, useMemo } from "react";
import { Quote, Product } from "@/types";
import { getProducts } from "@/services/productService";
import { getSettings } from "@/services/settingService";
import { ProductCombobox } from "@/components/ProductCombobox";
import { Pencil, ArrowLeft, Loader2, Save } from "lucide-react";

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema) as Resolver<QuoteFormValues>,
    defaultValues: {
      client_name: "",
      freight_cost: 0,
      installation_total: 0,
      distance_km: 0,
      installation_days: 1,
      items: [{ product_id: 0, quantity: 1 }],
    },
    mode: "onChange"
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [products, settingsData, quoteData] = await Promise.all([
          getProducts(),
          getSettings(),
          getQuoteById(id)
        ]);
        
        setAvailableProducts(products);
        setSettings(settingsData);
        
        // Mapear los items de la cotización al formato del formulario
        const formattedItems = quoteData.items?.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })) || [];

        form.reset({
          client_name: quoteData.client_name,
          freight_cost: Number(quoteData.freight_cost),
          installation_total: Number(quoteData.installation_total),
          distance_km: Number(quoteData.distance_km || 0),
          installation_days: Number(quoteData.installation_days),
          items: formattedItems.length > 0 ? formattedItems : [{ product_id: 0, quantity: 1 }],
        });

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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  }) || [];

  const liveTotalMaterials = useMemo(() => {
    return (watchedItems as QuoteFormValues["items"]).reduce((acc, item) => {
      if (!item) return acc;
      const product = availableProducts.find((p) => p.id === item.product_id);
      if (product) {
        return acc + Math.round(product.calculated_sale_price * (item.quantity || 0));
      }
      return acc;
    }, 0);
  }, [watchedItems, availableProducts]);

  // Suscribirse a cambios para auto-cálculos
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Auto-cálculo de Logística/Flete
      if (name === "distance_km") {
        const distance = Number(value.distance_km || 0);
        const ratePerKm = Number(settings.freight_cost_per_km || 0);
        form.setValue("freight_cost", Math.round(distance * ratePerKm));
      }

      // Auto-cálculo de Mano de Obra
      if (name?.startsWith("items")) {
        let totalDevices = 0;
        value.items?.forEach((item: any) => {
          if (!item?.product_id) return;
          const product = availableProducts.find(p => p.id === item.product_id);
          const categorySlug = product?.category?.slug?.toLowerCase() || "";
          if (categorySlug.includes("camara") || categorySlug.includes("dvr") || categorySlug.includes("nvr")) {
            totalDevices += Number(item.quantity || 0);
          }
        });
        const laborPerDevice = Number(settings.labor_cost_per_device || 0);
        form.setValue("installation_total", Math.round(totalDevices * laborPerDevice));
      }
    });

    return () => subscription.unsubscribe();
  }, [form, settings, availableProducts]);

  const onSubmit = async (data: QuoteFormValues) => {
    setIsSubmitting(true);
    try {
      await updateQuote(id, data);
      router.push(`/quotes/${id}`);
    } catch (error) {
      console.error("Error al actualizar cotización:", error);
      alert("Error en la validación del backend o conexión.");
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <button 
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
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Sección: Datos del Cliente */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            <h2 className="text-lg font-semibold text-slate-800">Información General</h2>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Cliente</label>
              <input 
                {...form.register("client_name")} 
                className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="Nombre de la empresa o persona"
              />
              {form.formState.errors.client_name && (
                <span className="text-red-500 text-xs mt-1 ml-1">{form.formState.errors.client_name.message}</span>
              )}
            </div>
          </div>
        </section>

        {/* Sección: Logística y Operativa */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-indigo-600 rounded-full" />
            <h2 className="text-lg font-semibold text-slate-800">Logística & Operativa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Días de Instalación</label>
              <input type="number" {...form.register("installation_days")} className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Distancia (KM)</label>
              <input type="number" {...form.register("distance_km")} className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Costo Logística / Flete (Q)</label>
              <input type="number" {...form.register("freight_cost")} className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Costo Mano de Obra (Q)</label>
              <input type="number" {...form.register("installation_total")} className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
          </div>
        </section>

        {/* Sección: Productos Dinámicos */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-600 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800">Equipos & Materiales</h2>
            </div>
            <button 
              type="button" 
              onClick={() => append({ product_id: 0, quantity: 1 })}
              className="text-emerald-600 text-sm font-bold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>+</span> Agregar Producto
            </button>
          </div>
          
          <div className="space-y-4">
            {fields.map((field, index) => {
              const currentProductId = form.watch(`items.${index}.product_id`);
              const selectedProduct = availableProducts.find(p => p.id === currentProductId);
              const quantity = form.watch(`items.${index}.quantity`) || 0;
              const subtotal = selectedProduct ? Math.round(selectedProduct.calculated_sale_price * quantity) : 0;

              return (
                <div key={field.id} className="group flex gap-4 items-end p-4 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Equipo a Instalar</label>
                    <Controller
                      control={form.control}
                      name={`items.${index}.product_id`}
                      render={({ field: { value, onChange } }) => (
                        <ProductCombobox 
                          value={value} 
                          onChange={(val) => {
                            onChange(val);
                          }} 
                        />
                      )}
                    />
                  </div>
                  <div className="w-24 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Cant.</label>
                    <input 
                      type="number" 
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} 
                      className="w-full rounded-xl border border-slate-200 p-3 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">P. Unitario</label>
                    <div className="w-full rounded-xl border border-slate-100 p-3 bg-slate-100/50 text-slate-600 font-medium">
                      Q {selectedProduct?.calculated_sale_price?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}
                    </div>
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Subtotal</label>
                    <div className="w-full rounded-xl border border-slate-100 p-3 bg-emerald-50 text-emerald-700 font-bold">
                      Q {subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="pb-1">
                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Eliminar producto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
            
            {fields.length > 0 && (
              <div className="flex justify-end pr-16 pt-2">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Materiales Estimado</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    Q {liveTotalMaterials.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {fields.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-slate-400">No hay productos agregados. Haz clic en "Agregar Producto" para comenzar.</p>
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex justify-end pt-4 gap-4">
          <button 
            type="button"
            onClick={() => router.back()}
            className="px-8 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Actualizando...
              </>
            ) : (
                <>
                    <Save className="w-5 h-5" />
                    Guardar Cambios
                </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
