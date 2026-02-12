'use client';

import { Share, PlusSquare, X, ChevronRight } from 'lucide-react';

interface IOSInstallModalProps {
    onClose: () => void;
}

export function IOSInstallModal({ onClose }: IOSInstallModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500 sm:zoom-in">
                <div className="relative p-6">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>

                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Instalar en iOS</h3>
                        <p className="text-gray-500 text-sm">Sigue estos pasos para instalar Dhermica</p>
                    </div>

                    <div className="space-y-6 mb-8">
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                                <span className="font-black text-[#45a049]">1</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700">
                                Presiona el icono de <span className="inline-block p-1 bg-blue-50 text-blue-600 rounded-md mx-0.5"><Share className="w-4 h-4" /></span> (Compartir) en tu navegador.
                            </p>
                        </div>

                        <div className="flex items-center justify-center">
                            <ChevronRight className="w-5 h-5 text-gray-300 rotate-90" />
                        </div>

                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                                <span className="font-black text-[#45a049]">2</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700">
                                Selecciona la opción <span className="font-bold text-gray-900 underline block">"Agregar a inicio"</span>
                            </p>
                            <PlusSquare className="w-6 h-6 text-gray-400" />
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98]"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
