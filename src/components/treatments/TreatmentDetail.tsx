'use client';

import { Modal } from "../ui/Modal";
import { Treatment } from "@/lib/types/treatment";
import { Sparkles, CheckCircle2, AlertCircle, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";

interface TreatmentDetailProps {
    isOpen: boolean;
    onClose: () => void;
    treatment: Treatment | null;
}

export function TreatmentDetail({ isOpen, onClose, treatment }: TreatmentDetailProps) {
    if (!treatment) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={treatment.name} size="lg">
            <div className="space-y-8 pb-6">
                {/* Hero Section */}
                <div className="relative bg-gradient-to-br from-[#34baab] to-[#2aa89a] rounded-3xl p-8 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="relative z-10">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                            {treatment.category}
                        </span>
                        <h3 className="text-3xl font-black mb-4 leading-tight">{treatment.name}</h3>
                        <p className="text-teal-50 text-lg leading-relaxed opacity-90 italic">
                            {treatment.shortDescription}
                        </p>
                    </div>
                </div>

                {/* Description */}
                {treatment.fullDescription && (
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#34baab]" /> Acerca del tratamiento
                        </h4>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {treatment.fullDescription}
                        </p>
                    </div>
                )}

                {/* Grid for prices and more */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Prices */}
                    <div className="space-y-4">
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs ml-1">Precios y Versiones</h4>
                        <div className="space-y-3">
                            {treatment.prices.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-[#34baab]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 capitalize">{p.zone}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                {p.gender === 'female' ? 'Femenino' : p.gender === 'male' ? 'Masculino' : 'Unisex'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-[#34baab]">${p.price.toLocaleString()}</p>
                                        {p.duration && (
                                            <p className="text-[10px] font-bold text-gray-400 flex items-center justify-end gap-1">
                                                <Clock className="w-3 h-3" /> {p.duration} min
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-4">
                        {treatment.benefits && treatment.benefits.length > 0 && (
                            <div className="bg-teal-50/50 p-6 rounded-3xl border border-teal-100">
                                <h4 className="font-black text-teal-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Beneficios
                                </h4>
                                <ul className="space-y-2">
                                    {treatment.benefits.map((b, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-teal-800 font-medium">
                                            <span className="mt-1 text-teal-500">•</span> {b}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Contraindications */}
                        {treatment.contraindications && treatment.contraindications.length > 0 && (
                            <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100">
                                <h4 className="font-black text-red-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Contraindicaciones
                                </h4>
                                <ul className="space-y-2">
                                    {treatment.contraindications.map((c, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-red-800 font-medium">
                                            <span className="mt-1 text-red-400">•</span> {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pre/Post Care */}
                {(treatment.preCare?.length || treatment.postCare?.length) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {treatment.preCare && treatment.preCare.length > 0 && (
                            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                                <h4 className="font-black text-amber-900 uppercase tracking-widest text-[10px] mb-3">Cuidados Pre-Tratamiento</h4>
                                <ul className="space-y-2">
                                    {treatment.preCare.map((item, i) => (
                                        <li key={i} className="text-xs text-amber-800 font-medium flex gap-2">
                                            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {treatment.postCare && treatment.postCare.length > 0 && (
                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                <h4 className="font-black text-blue-900 uppercase tracking-widest text-[10px] mb-3">Cuidados Post-Tratamiento</h4>
                                <ul className="space-y-2">
                                    {treatment.postCare.map((item, i) => (
                                        <li key={i} className="text-xs text-blue-800 font-medium flex gap-2">
                                            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-4">
                    <Button onClick={onClose} className="w-full py-4 rounded-2xl bg-[#34baab] hover:bg-[#2aa89a] text-white">
                        Cerrar Detalles
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
