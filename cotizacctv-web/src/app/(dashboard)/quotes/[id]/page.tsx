"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pencil, MessageCircle } from "lucide-react";
import { Quote } from "@/types";
import { getQuoteById } from "@/services/quoteService";

export default function QuoteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchQuote = async () => {
      try {
        setIsLoading(true);
        const data = await getQuoteById(id);
        setQuote(data);
      } catch (err) {
        console.error("Error fetching quote:", err);
        setError("La cotización no existe o hubo un error al cargarla.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuote();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium tracking-wide">Cargando detalles de la cotización...</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-red-50 text-red-500 p-6 rounded-3xl border border-red-100 flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="font-semibold text-lg">{error}</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
        >
          Volver a Cotizaciones
        </button>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    // Reutilizando la lógica de descarga directa implementada anteriormente
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    window.location.href = `${apiUrl}/quotes/${id}/pdf`;
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    approved: 'bg-green-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };

  const translatedStatus = {
    draft: 'Borrador',
    sent: 'Enviada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  };

  const handleEdit = () => {
    router.push(`/quotes/${id}/edit`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10" />
        
        <div className="z-10">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Cotización #{quote.id}
            </h1>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColors[quote.status]}`}>
              {translatedStatus[quote.status]}
            </span>
          </div>
          <p className="text-slate-500 text-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Cliente: <span className="font-semibold text-slate-800">{quote.client_name}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 z-10 w-full md:w-auto">
          <button 
            onClick={() => router.push('/quotes')}
            className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 text-center"
          >
            Volver
          </button>
          <button 
            onClick={handleEdit}
            className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Pencil className="h-5 w-5" />
            Editar
          </button>
          <button 
            onClick={handleDownloadPdf}
            className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar PDF
          </button>
          {quote.client_phone && (
            <a 
              href={`https://wa.me/${quote.client_phone.replace(/[\s-]/g, '')}?text=${encodeURIComponent(`Hola ${quote.client_name}, le saluda Edson de CotizaCCTV. Le adjunto la cotización #${String(quote.id).padStart(4, '0')} por los servicios solicitados. Puede verla aquí: http://localhost:8000/api/quotes/${quote.id}/pdf`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </a>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content - Equipment List */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-slate-800">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                Equipos Cotizados
              </h2>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-4 px-6 md:px-8">Producto</th>
                    <th className="py-4 px-4 text-center w-24">Cant.</th>
                    <th className="py-4 px-4 text-right hidden sm:table-cell">Precio Unit.</th>
                    <th className="py-4 px-6 md:px-8 text-right bg-slate-50/50">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.items?.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-5 px-6 md:px-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.product?.name || 'Producto Desconocido'}</span>
                          <span className="text-xs font-medium text-slate-400 mt-0.5 font-mono">{item.product?.sku || 'N/A'}</span>
                          {(item.product?.category || (item.product?.suppliers && item.product.suppliers.length > 0)) && (
                            <div className="flex gap-2 mt-2">
                              {item.product?.category && <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-semibold uppercase tracking-wider">{item.product.category.name}</span>}
                              {(item.product?.suppliers && item.product.suppliers.length > 0) && <span className="text-[10px] bg-indigo-50 px-2.5 py-1 rounded-md text-indigo-600 font-semibold uppercase tracking-wider">{item.product.suppliers[0].name}</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <div className="mx-auto w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700">
                          {item.quantity}
                        </div>
                      </td>
                      <td className="py-5 px-4 text-right text-slate-500 font-medium hidden sm:table-cell">
                        Q {Number(item.frozen_unit_cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-5 px-6 md:px-8 text-right font-bold text-slate-900 bg-slate-50/30">
                        Q {(item.quantity * Number(item.frozen_unit_cost)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                  {(!quote.items || quote.items.length === 0) && (
                     <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="font-medium">No hay equipos en esta cotización.</p>
                          </div>
                        </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar - Financial Breakdown */}
        <div className="xl:col-span-1">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl sticky top-8 overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
            
            <div className="p-8 relative z-10">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                Resumen Financiero
              </h2>
              
              <div className="space-y-5">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                  <span className="text-slate-300 font-medium">Materiales Base</span>
                  <span className="font-bold text-white text-lg">Q {Number(quote.subtotal_materials).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                
                <div className="flex justify-between items-center bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                  <span className="text-emerald-100 font-medium">Margen Aplicado</span>
                  <span className="font-bold text-emerald-400 text-lg">+ Q {Number(quote.margin_applied).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                
                {Number(quote.discount_amount) > 0 && (
                  <div className="flex justify-between items-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                    <span className="text-red-100 font-medium">Descuento Especial</span>
                    <span className="font-bold text-red-400 text-lg">
                      - Q {(() => {
                        const base = Number(quote.subtotal_materials) + Number(quote.margin_applied) + Number(quote.installation_total) + Number(quote.freight_cost) + Number(quote.gasoline_cost) + Number(quote.per_diem_cost);
                        return quote.discount_type === 'percentage' 
                          ? Math.round(base * (Number(quote.discount_amount) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : Number(quote.discount_amount).toLocaleString(undefined, { maximumFractionDigits: 0 });
                      })()}
                    </span>
                  </div>
                )}
                
                <div className="space-y-4 pt-4 px-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Mano de Obra
                    </span>
                    <span className="font-semibold text-slate-200">Q {Number(quote.installation_total).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div> Viáticos
                    </span>
                    <span className="font-semibold text-slate-200">Q {Number(quote.per_diem_cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> Logística
                    </span>
                    <span className="font-semibold text-slate-200">Q {(Number(quote.gasoline_cost) + Number(quote.freight_cost)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
                
                <div className="mt-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-50"></div>
                  <div className="relative bg-slate-800 p-6 rounded-3xl border border-white/10 text-center">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Gran Total</p>
                    <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-br from-white via-blue-100 to-slate-400 bg-clip-text text-transparent truncate flex justify-center items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-400">Q</span>
                      {Number(quote.grand_total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>
              
                <div className="flex justify-between items-center text-xs font-medium text-slate-400 bg-black/20 p-3 rounded-xl">
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tiempo Estimado
                  </span>
                  <span className="text-slate-300 font-bold">{quote.installation_days} días</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium text-slate-400 bg-black/20 p-3 rounded-xl">
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Creado
                  </span>
                  <span className="text-slate-300">{quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium text-slate-400 bg-black/20 p-3 rounded-xl">
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Expira
                  </span>
                  <span className="text-slate-300">{new Date(quote.expires_at).toLocaleDateString()}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
