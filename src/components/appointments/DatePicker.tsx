'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '../ui/Input';
import { getTodayDate } from '@/lib/utils/time';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <Input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10"
            />
        </div>
    );
}
