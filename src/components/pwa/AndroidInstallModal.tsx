'use client';

import { Download, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface AndroidInstallModalProps {
    onInstall: () => void;
    onClose: () => void;
}

export function AndroidInstallModal({ onInstall, onClose }: AndroidInstallModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500 sm:zoom-in">
                <div className="relative p-6 text-center">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>

                    <div className="w-20 h-20 bg-gradient-to-br from-[#45a049] to-[#3d8b40] rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg transform -rotate-3">
                        <Download className="w-10 h-10 text-white" />
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-2">¡Instala la App!</h3>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Accede a <span className="font-bold text-[#45a049]">Dhermica</span> más rápido y úsala como una aplicación nativa en tu Android.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={onInstall}
                            className="w-full bg-[#45a049] hover:bg-[#3d8b40] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-[0.98]"
                        >
                            Instalar Ahora
                        </Button>
                        <button
                            onClick={onClose}
                            className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors py-2"
                        >
                            Quizás más tarde
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
