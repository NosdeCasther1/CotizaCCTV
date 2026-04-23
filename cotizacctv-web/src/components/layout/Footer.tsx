'use client';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 px-4 md:px-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          &copy; {currentYear} <span className="font-semibold text-slate-900">CotizaCCTV</span>. 
          Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 border border-slate-200">
            v1.6.2
           </span>
          <p className="text-xs text-muted-foreground">
            Sistema de Cotizaciones
          </p>
        </div>
      </div>
    </footer>
  );
}
