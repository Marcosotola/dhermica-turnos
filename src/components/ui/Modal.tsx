import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        full: 'max-w-full md:max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative w-full ${sizes[size]} bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] md:max-h-[85vh] flex flex-col animate-slide-up md:animate-fade-in`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900">{title}</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full p-2 min-h-[44px] min-w-[44px]"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
