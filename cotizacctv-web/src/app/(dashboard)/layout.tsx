import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/50">
      {/* Inyectamos el Sidebar */}
      <Sidebar />

      {/* Contenedor principal que ocupa el resto del espacio */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
        
        {/* Footer al final del contenido */}
        <Footer />
      </div>
    </div>
  );
}
