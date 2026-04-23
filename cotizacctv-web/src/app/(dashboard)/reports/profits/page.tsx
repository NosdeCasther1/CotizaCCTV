"use client";

import { useState, useEffect, useMemo } from "react";
import { getQuotes } from "@/services/quoteService";
import { Quote } from "@/types";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Calendar,
  Layers,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fmt = (n: number) =>
  n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProfitsReportPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportMode, setReportMode] = useState<'confirmed' | 'projected'>('confirmed');

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const data = await getQuotes();
        setQuotes(data);
      } catch (error) {
        console.error("Error al cargar cotizaciones:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  const filteredQuotes = useMemo(() => {
    if (reportMode === 'confirmed') {
      return quotes.filter(q => q.status === 'accepted' || q.status === 'completed');
    }
    // Proyectado incluye aceptadas, completadas y pendientes
    return quotes.filter(q => q.status === 'accepted' || q.status === 'completed' || q.status === 'pending');
  }, [quotes, reportMode]);

  const stats = useMemo(() => {
    let totalQuoted = 0;
    let totalMaterialCost = 0;
    let totalInstallation = 0;
    let totalLogistics = 0;

    filteredQuotes.forEach((quote) => {
      totalQuoted += Number(quote.grand_total);
      totalInstallation += Number(quote.installation_total);
      totalLogistics += Number(quote.freight_cost) + Number(quote.gasoline_cost || 0) + Number(quote.per_diem_cost || 0);

      quote.items?.forEach((item) => {
        const productCost = Number(item.product?.purchase_price) || 0;
        totalMaterialCost += productCost * (item.quantity || 0);
      });

      quote.extra_expenses?.forEach((exp) => {
        totalLogistics += Number(exp.amount);
      });
    });

    const netProfit = totalQuoted - totalMaterialCost - totalInstallation - totalLogistics;
    const profitMargin = totalQuoted > 0 ? (netProfit / totalQuoted) * 100 : 0;

    return {
      totalQuoted,
      totalMaterialCost,
      totalInstallation,
      totalLogistics,
      netProfit,
      profitMargin
    };
  }, [filteredQuotes]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Reporte de Ganancias
          </h1>
          <p className="text-slate-500 mt-1">
            Análisis financiero detallado basado en el estado de las ventas.
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
          <Button
            variant={reportMode === 'confirmed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setReportMode('confirmed')}
            className={`rounded-lg flex gap-2 font-bold ${reportMode === 'confirmed' ? 'bg-white text-blue-600 shadow-sm hover:bg-white' : 'text-slate-500'}`}
          >
            <CheckCircle2 size={16} />
            Confirmadas
          </Button>
          <Button
            variant={reportMode === 'projected' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setReportMode('projected')}
            className={`rounded-lg flex gap-2 font-bold ${reportMode === 'projected' ? 'bg-white text-blue-600 shadow-sm hover:bg-white' : 'text-slate-500'}`}
          >
            <Clock size={16} />
            Proyectado
          </Button>
        </div>
      </header>

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <DollarSign size={48} className="text-slate-900" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {reportMode === 'confirmed' ? 'Ventas Confirmadas' : 'Total Proyectado'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">Q {fmt(stats.totalQuoted)}</div>
            <p className="text-[10px] text-slate-400 mt-1">
              {reportMode === 'confirmed' ? 'Solo Aceptadas y Completadas' : 'Incluye Pendientes'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Briefcase size={48} className="text-slate-900" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Costo de Materiales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">Q {fmt(stats.totalMaterialCost)}</div>
            <p className="text-[10px] text-slate-400 mt-1">Inversión en equipos</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp size={48} className="text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Utilidad Neta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">Q {fmt(stats.netProfit)}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                {stats.profitMargin.toFixed(1)}% Margen
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-sm overflow-hidden relative ${reportMode === 'confirmed' ? 'bg-slate-900 text-white' : 'bg-blue-900 text-white'}`}>
          <div className="absolute bottom-0 right-0 p-3 opacity-20">
            <Layers size={64} className="text-white" />
          </div>
          <CardHeader className="pb-2 text-slate-400">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">
              {reportMode === 'confirmed' ? 'Cerradas' : 'En Embudo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{filteredQuotes.length}</div>
            <p className="text-[10px] text-slate-500 mt-1">Cotizaciones filtradas</p>
          </CardContent>
        </Card>
      </div>

      {/* --- Detail Table --- */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            Desglose de {reportMode === 'confirmed' ? 'Ventas' : 'Proyecciones'}
          </h2>
          <div className="text-xs text-slate-400 flex items-center gap-2">
             <Calendar size={14} />
             <span>{reportMode === 'confirmed' ? 'Solo cerradas' : 'Incluye preventa'}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                <th className="px-6 py-4">Cliente / ID</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Gastos Op.</th>
                <th className="px-6 py-4">Utilidad</th>
                <th className="px-6 py-4 text-right">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredQuotes.map((quote) => {
                let materialCost = 0;
                quote.items?.forEach(item => {
                   materialCost += (Number(item.product?.purchase_price) || 0) * (item.quantity || 0);
                });
                
                const extraExpTotal = quote.extra_expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
                const opExpenses = Number(quote.installation_total) + Number(quote.freight_cost) + Number(quote.gasoline_cost || 0) + Number(quote.per_diem_cost || 0) + extraExpTotal;
                const netProfit = Number(quote.grand_total) - materialCost - opExpenses;
                const margin = Number(quote.grand_total) > 0 ? (netProfit / Number(quote.grand_total)) * 100 : 0;

                return (
                  <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 truncate max-w-[150px]">{quote.client_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">#{quote.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        quote.status === 'completed' ? 'success' :
                        quote.status === 'accepted' ? 'default' :
                        quote.status === 'pending' ? 'warning' : 'destructive'
                      } className="text-[10px] px-2 py-0">
                        {quote.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">Q {fmt(quote.grand_total)}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      <div className="flex flex-col">
                        <span>Q {fmt(opExpenses)}</span>
                        {quote.extra_expenses && quote.extra_expenses.length > 0 && (
                          <span className="text-[9px] text-orange-500 font-bold uppercase">
                            Incl. {quote.extra_expenses.length} extras
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold",
                        netProfit >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        Q {fmt(netProfit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className={cn(
                         "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black",
                         margin >= 20 ? "bg-emerald-50 text-emerald-700" : 
                         margin >= 5 ? "bg-amber-50 text-amber-700" : 
                         "bg-red-50 text-red-700"
                       )}>
                         {margin >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                         {margin.toFixed(1)}%
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No hay cotizaciones registradas en este modo.
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
