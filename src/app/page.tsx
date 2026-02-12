import Link from 'next/link';
import { Calendar, Users, Search, Truck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Dhermica Estética
          </h1>
          <p className="text-xl text-gray-600">
            Sistema de Gestión de Turnos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/turnos"
            className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#34baab]/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#34baab]/20 transition-colors">
                <Calendar className="w-8 h-8 text-[#34baab]" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Turnos
              </h2>
              <p className="text-gray-600">
                Gestiona los turnos diarios
              </p>
            </div>
          </Link>

          <Link
            href="/profesionales"
            className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-pink-200 transition-colors">
                <Users className="w-8 h-8 text-pink-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Staff
              </h2>
              <p className="text-gray-600">
                Gestiona el equipo de trabajo
              </p>
            </div>
          </Link>

          <Link
            href="/alquileres"
            className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
                <Truck className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Alquileres
              </h2>
              <p className="text-gray-600">
                Gestión de máquinas y equipos
              </p>
            </div>
          </Link>

          <Link
            href="/turnos?action=search"
            className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#45a049]/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#45a049]/20 transition-colors">
                <Search className="w-8 h-8 text-[#45a049]" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Buscar
              </h2>
              <p className="text-gray-600">
                Localiza turnos rápidamente
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
