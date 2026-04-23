"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Calculator, 
  Package, 
  Tags, 
  Truck, 
  ArrowRight,
  TrendingUp,
  FileText,
  BarChart3,
  Percent,
  Clock,
  MessageCircle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { getQuotes } from "@/services/quoteService";
import { getProducts } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { getSuppliers } from "@/services/supplierService";
import { getMaintenanceReminders, markAsCalled } from "@/services/maintenanceService";
import { Quote, Product, Category, Supplier, MaintenanceReminder } from "@/types";
import { Badge } from "@/components/ui/badge";

const mockChartData = [
  { day: 'Lun', total: 4500 },
  { day: 'Mar', total: 5200 },
  { day: 'Mié', total: 4800 },
  { day: 'Jue', total: 6100 },
  { day: 'Vie', total: 5900 },
  { day: 'Sáb', total: 4200 },
  { day: 'Dom', total: 3800 },
];

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [maintenanceReminders, setMaintenanceReminders] = useState<MaintenanceReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [fetchedQuotes, fetchedProducts, fetchedCategories, fetchedSuppliers, fetchedReminders] = await Promise.all([
          getQuotes().catch(() => [] as Quote[]),
          getProducts().catch(() => [] as Product[]),
          getCategories().catch(() => [] as Category[]),
          getSuppliers().catch(() => [] as Supplier[]),
          getMaintenanceReminders({ upcoming: true }).catch(() => [] as MaintenanceReminder[])
        ]);
        
        const sortedQuotes = (fetchedQuotes || []).sort((a, b) => b.id - a.id);
        
        setQuotes(sortedQuotes);
        setProducts(fetchedProducts || []);
        setCategories(fetchedCategories || []);
        setSuppliers(fetchedSuppliers || []);
        setMaintenanceReminders(fetchedReminders || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleMarkAsCalled = async (id: number) => {
    try {
      await markAsCalled(id);
      setMaintenanceReminders(prev => 
        prev.map(r => r.id === id ? { ...r, status: 'called' } : r)
      );
    } catch (error) {
      console.error("Error al marcar como llamado:", error);
    }
  };

  const totalCotizado = quotes.reduce((acc, q) => acc + Number(q.grand_total), 0);
  const totalPendientes = quotes.filter(q => q.status === 'pending').length;
  const totalAceptadas = quotes.filter(q => q.status === 'accepted').length;
  const totalConfirmadas = quotes.filter(q => q.status === 'accepted' || q.status === 'completed').length;
  const tasaCierre = quotes.length > 0 ? (totalConfirmadas / quotes.length) * 100 : 0;
  
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'warning';
      default: return 'outline';
    }
  };

  const translatedStatus: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    completed: 'Completada',
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium tracking-wide">Cargando métricas del sistema CotizaCCTV...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header and Call to Action */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
        {/* Abstract Blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[80px]"></div>
        
        <div className="z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Panel de Control
          </h1>
          <p className="text-slate-300 text-lg">
            Bienvenido, aquí tienes un resumen general de tus operaciones.
          </p>
        </div>
        <div className="z-10 w-full md:w-auto">
          <Link 
            href="/quotes/new" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white hover:bg-blue-500 font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 w-full md:w-auto"
          >
            <Calculator className="w-5 h-5" />
            Crear Cotización
          </Link>
        </div>
      </header>

      {/* Funnel Summary Widget */}
      <section className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-6 animate-in slide-in-from-left duration-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Resumen de Embudo:</span>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400">Total Pendientes</span>
            <span className="text-xl font-black text-amber-600">{totalPendientes}</span>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400">Total Aceptadas</span>
            <span className="text-xl font-black text-blue-600">{totalAceptadas}</span>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400">Tasa de Cierre</span>
            <span className="text-xl font-black text-emerald-600">{tasaCierre.toFixed(1)}%</span>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Generado</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">Q {totalCotizado.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-slate-400">Cartera total en sistema</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">En Espera</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{totalPendientes}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-slate-400">Cotizaciones pendientes</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Confirmadas</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{totalConfirmadas}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${tasaCierre}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-50 rounded-full blur-2xl group-hover:bg-orange-100 transition-colors"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
               <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Productos</p>
               <h3 className="text-3xl font-black text-slate-900 mt-1">{products.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
               <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-slate-400">Ítems en catálogo</p>
          </div>
        </div>
      </section>

      {/* Próximos Mantenimientos Widget */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-slate-800 animate-in slide-in-from-right duration-500">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            Próximos Mantenimientos (Siguientes 15 días)
          </h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {maintenanceReminders.length} Pendiente(s)
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-4">Equipos</th>
                <th className="py-4 px-4 text-center">Fecha Próxima</th>
                <th className="py-4 px-4 text-center">Estado</th>
                <th className="py-4 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenanceReminders.map((reminder) => (
                <tr key={reminder.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6 font-bold text-slate-900">{reminder.client_name}</td>
                  <td className="py-4 px-4 text-sm text-slate-500 max-w-xs truncate" title={reminder.equipment_summary || ''}>
                    {reminder.equipment_summary || 'N/A'}
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-sm text-slate-600">
                    {new Date(reminder.next_service_date).toLocaleDateString('es-GT')}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge variant={reminder.status === 'called' ? 'info' : 'warning'}>
                      {reminder.status === 'called' ? 'Llamado' : 'Pendiente'}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {reminder.client_phone && (
                        <a
                          href={`https://wa.me/${reminder.client_phone.replace(/[\s-]/g, '')}?text=${encodeURIComponent(`Hola ${reminder.client_name}, le saludamos de CotizaCCTV. Le recordamos que ya pasaron 6 meses desde su instalación y le toca su mantenimiento preventivo. ¿Le gustaría programar una cita?`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-full transition-all hover:scale-105 active:scale-95"
                          title="Contactar por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {reminder.status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsCalled(reminder.id)}
                          className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                        >
                          Marcar Llamado
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {maintenanceReminders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                    No hay mantenimientos programados para los próximos 15 días.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Quotes Table */}
        <div className="lg:col-span-2">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-slate-800 h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                Cotizaciones Recientes
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-4 px-6">Nº</th>
                    <th className="py-4 px-4 w-1/3">Cliente</th>
                    <th className="py-4 px-4 text-center">Estado</th>
                    <th className="py-4 px-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotes.slice(0, 6).map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <Link href={`/quotes/${quote.id}`} className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          #{String(quote.id).padStart(4, '0')}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-700">{quote.client_name}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant={getBadgeVariant(quote.status)}>
                          {translatedStatus[quote.status]}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="font-black text-slate-900">
                          Q {Number(quote.grand_total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {quotes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No hay cotizaciones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Activity Chart */}
        <div className="lg:col-span-1">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-slate-800 h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Actividad Semanal</h2>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                      }}
                      formatter={(value: number) => [`Q ${value.toLocaleString()}`, 'Total']}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {mockChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 3 ? '#3b82f6' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-slate-400 italic">Total generado últimos 7 días</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

