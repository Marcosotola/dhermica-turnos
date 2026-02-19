'use client';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-2xl bg-gray-200/60 ${className || ''}`}
            {...props}
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-[2rem] border-2 border-gray-50 p-6 flex flex-col gap-4 shadow-sm h-full">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
            </div>
            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                <div className="space-y-1">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
        </div>
    );
}

export function PromoCardSkeleton() {
    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 overflow-hidden shadow-sm h-full flex flex-col">
            <Skeleton className="aspect-[16/10] w-full" />
            <div className="p-6 space-y-4">
                <div className="flex gap-2">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 w-24 self-center" />
                </div>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="pt-4 border-t border-gray-50">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
