'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAparatoSessionsByDateRange } from '@/lib/firebase/aparatos';
import { AparatoTreatment } from '@/lib/types/aparato';

const APARATO_COLORS: Record<AparatoTreatment, string> = {
    Definitiva: '#dc2626',
    HiFu: '#f97316',
    Liposonix: '#0891b2',
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface Props {
    value: string;
    onChange: (date: string) => void;
}

export function CalendarWithSessions({ value, onChange }: Props) {
    const today = new Date();
    const todayStr = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const [viewYear, setViewYear] = useState(() =>
        value ? parseInt(value.slice(0, 4)) : today.getFullYear()
    );
    const [viewMonth, setViewMonth] = useState(() =>
        value ? parseInt(value.slice(5, 7)) - 1 : today.getMonth()
    );
    const [sessionMap, setSessionMap] = useState<Map<string, Set<AparatoTreatment>>>(new Map());

    const pad = (n: number) => String(n).padStart(2, '0');

    useEffect(() => {
        const startDate = `${viewYear}-${pad(viewMonth + 1)}-01`;
        const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
        const endDate = `${viewYear}-${pad(viewMonth + 1)}-${pad(lastDay)}`;

        getAparatoSessionsByDateRange(startDate, endDate).then(sessions => {
            const map = new Map<string, Set<AparatoTreatment>>();
            sessions.forEach(s => {
                if (!map.has(s.date)) map.set(s.date, new Set());
                map.get(s.date)!.add(s.treatment);
            });
            setSessionMap(map);
        });
    }, [viewMonth, viewYear]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    // Week starts on Monday (offset: 0=Mon ... 6=Sun)
    const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const presentTreatments = new Set<AparatoTreatment>();
    sessionMap.forEach(set => set.forEach(t => presentTreatments.add(t)));

    return (
        <div className="select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="font-bold text-gray-900">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;

                    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
                    const isSelected = dateStr === value;
                    const isToday = dateStr === todayStr;
                    const treatments = sessionMap.get(dateStr);

                    return (
                        <button
                            key={day}
                            onClick={() => onChange(dateStr)}
                            className={[
                                'flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl transition-colors min-h-[44px]',
                                isSelected
                                    ? 'bg-gray-900 text-white'
                                    : isToday
                                    ? 'bg-[#34baab]/10 text-[#34baab] font-bold'
                                    : 'text-gray-700 hover:bg-gray-50',
                            ].join(' ')}
                        >
                            <span className="text-sm leading-tight">{day}</span>
                            {treatments && treatments.size > 0 && (
                                <div className="flex gap-[3px] mt-1 flex-wrap justify-center px-0.5">
                                    {Array.from(treatments).map(t => (
                                        <span
                                            key={t}
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{
                                                backgroundColor: isSelected
                                                    ? 'rgba(255,255,255,0.8)'
                                                    : APARATO_COLORS[t],
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend — only shows treatments present in this month */}
            {presentTreatments.size > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-2">
                    {(Object.keys(APARATO_COLORS) as AparatoTreatment[])
                        .filter(t => presentTreatments.has(t))
                        .map(t => (
                            <div key={t} className="flex items-center gap-1.5">
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: APARATO_COLORS[t] }}
                                />
                                <span className="text-xs text-gray-500">{t}</span>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
