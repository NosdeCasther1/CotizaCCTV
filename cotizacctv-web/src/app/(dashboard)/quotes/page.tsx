"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  FileText, 
  Search, 
  Calculator, 
  Pencil, 
  Download,
  Filter,
  Eye,
  RefreshCw,
  MessageCircle
} from "lucide-react";
import { getQuotes, updateQuoteStatus } from "@/services/quoteService";
import { Quote } from "@/types";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      const data = await getQuotes();
      // Ordenar por ID descendente (más recientes primero)
      setQuotes(data.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Error al cargar las cotizaciones");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleStatusChange = async (quoteId: number, newStatus: string) => {
    try {
      await updateQuoteStatus(quoteId, newStatus);
      
      // Actualizar el estado localmente para una respuesta fluida
      setQuotes(prevQuotes => 
        prevQuotes.map(q => q.id === quoteId ? { ...q, status: newStatus as any } : q)
      );
      
      toast.success(`Estado actualizado a ${translatedStatus[newStatus]}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("No se pudo actualizar el estado");
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'rejected': return 'destructive';
      case 'pending': return 'warning';
      case 'accepted': return 'default'; // Generalmente azul en este tema
      default: return 'outline';
    }
  };

  const translatedStatus: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    completed: 'Completada',
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const matchesSearch = 
        quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.id.toString().includes(searchTerm);
      
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  if (isLoading && quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium tracking-wide">Cargando historial de cotizaciones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10" />
        
        <div className="z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            Historial de Cotizaciones
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Administra, busca y filtra todas las cotizaciones del sistema.
          </p>
        </div>
        <div className="z-10 w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <button 
            onClick={fetchQuotes}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-2xl transition-all active:scale-95"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link 
            href="/quotes/new" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white hover:bg-blue-500 font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 w-full md:w-auto"
          >
            <Calculator className="w-5 h-5" />
            Nueva Cotización
          </Link>
        </div>
      </header>

      {/* Filters and Search */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
          />
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Filter className="h-4 w-4" />
            <span>Estado:</span>
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium cursor-pointer"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="accepted">Aceptadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="completed">Completadas</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-5 px-6">ID</th>
                <th className="py-5 px-6 w-1/3">Cliente</th>
                <th className="py-5 px-6">Fecha</th>
                <th className="py-5 px-6 text-center">Estado</th>
                <th className="py-5 px-6 text-right">Total</th>
                <th className="py-5 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-900 font-mono">
                      #{String(quote.id).padStart(4, '0')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-800">{quote.client_name}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>{quote.items?.length || 0} equipos</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>Días: {quote.installation_days}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-600 font-medium">
                      {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex justify-center">
                      <Select 
                        value={quote.status} 
                        onValueChange={(val) => handleStatusChange(quote.id, val)}
                      >
                        <SelectTrigger className={`h-8 w-[130px] border-none shadow-none focus:ring-0 font-semibold rounded-full px-3 ${
                          quote.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          quote.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                          quote.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending" className="text-amber-600 font-medium">Pendiente</SelectItem>
                          <SelectItem value="accepted" className="text-blue-600 font-medium">Aceptada</SelectItem>
                          <SelectItem value="rejected" className="text-red-600 font-medium">Rechazada</SelectItem>
                          <SelectItem value="completed" className="text-emerald-600 font-medium">Completada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-black text-slate-900">
                      Q {Number(quote.grand_total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Link 
                        href={`/quotes/${quote.id}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <Link 
                        href={`/quotes/${quote.id}/edit`}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </Link>
                      {quote.client_phone && (
                        <a
                          href={`https://wa.me/${quote.client_phone.replace(/[\s-]/g, '')}?text=${encodeURIComponent(`Hola ${quote.client_name}, le saluda Edson de CotizaCCTV. Le adjunto la cotización #${String(quote.id).padStart(4, '0')} por los servicios solicitados. Puede verla aquí: http://localhost:8000/api/quotes/${quote.id}/pdf`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Enviar por WhatsApp"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </a>
                      )}
                      <a 
                        href={`http://localhost:8000/api/quotes/${quote.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText className="h-16 w-16 mb-4 opacity-20" />
                      <p className="font-medium text-lg text-slate-500">No se encontraron cotizaciones.</p>
                      <p className="text-sm mt-1">Prueba cambiando los filtros o la búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
