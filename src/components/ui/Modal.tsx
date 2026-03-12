import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    headerAction?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Modal({ isOpen, onClose, title, children, footer, headerAction, size = 'md' }: ModalProps) {
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative w-full ${sizes[size]} bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[95vh] md:max-h-[85vh] flex flex-col animate-slide-up md:animate-fade-in`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b shrink-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="p-2 md:hidden"
                        >
                            <X className="w-6 h-6" />
                        </Button>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {headerAction}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="hidden md:flex rounded-full p-2"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="shrink-0 border-t p-4 md:p-6 bg-white md:rounded-b-2xl sticky bottom-0 md:relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] md:shadow-none">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
