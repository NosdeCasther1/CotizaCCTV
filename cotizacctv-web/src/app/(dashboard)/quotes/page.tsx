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
  Eye
} from "lucide-react";
import { getQuotes } from "@/services/quoteService";
import { Quote } from "@/types";
import { Badge } from "@/components/ui/badge";

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setIsLoading(true);
        const data = await getQuotes();
        // Ordenar por ID descendente (más recientes primero)
        setQuotes(data.sort((a, b) => b.id - a.id));
      } catch (error) {
        console.error("Error fetching quotes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      default: return 'outline';
    }
  };

  const translatedStatus: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
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

  if (isLoading) {
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
        <div className="z-10 w-full md:w-auto">
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
            <option value="draft">Borrador</option>
            <option value="sent">Enviada</option>
            <option value="approved">Aprobada</option>
            <option value="rejected">Rechazada</option>
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
                    <Badge variant={getBadgeVariant(quote.status)}>
                      {translatedStatus[quote.status]}
                    </Badge>
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
