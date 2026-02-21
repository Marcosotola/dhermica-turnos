'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { CommunityPost } from '@/lib/types/community';
import { Heart, Trash2, Tag as TagIcon, User } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { haptics } from '@/lib/utils/haptics';

interface CommunityPostCardProps {
    post: CommunityPost;
    isAdmin: boolean;
    onDelete: (post: CommunityPost) => void;
    onLike: (postId: string) => void;
    onClick?: (post: CommunityPost) => void;
    treatmentName?: string;
    priority?: boolean;
}

export function CommunityPostCard({ post, isAdmin, onDelete, onLike, onClick, treatmentName, priority = false }: CommunityPostCardProps) {
    const { user } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isLiked = user && post.likes.includes(user.uid);
    const canDelete = isAdmin || (user && post.userId === user.uid);

    const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);

    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
            setCurrentIndex(index);
        }
    };

    const handleLike = () => {
        haptics.light();
        onLike(post.id);
    };

    return (
        <div
            onClick={() => onClick?.(post)}
            className={`bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-gray-100 shadow-sm md:shadow-lg overflow-hidden group hover:shadow-2xl hover:border-[#34baab]/20 transition-all duration-300 h-full flex flex-col ${onClick ? 'cursor-pointer' : ''}`}
        >
            {/* User Info */}
            <div className="p-2 md:p-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-3">
                    <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-teal-50 flex items-center justify-center overflow-hidden border border-teal-100 flex-shrink-0">
                        {post.userAvatar ? (
                            <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-3 h-3 md:w-5 md:h-5 text-[#34baab]" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-[10px] md:text-sm font-black text-gray-900 leading-tight truncate">{post.userName}</h4>
                        <p className="text-[7px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                            {formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: es })}
                        </p>
                    </div>
                </div>

                {canDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(post);
                        }}
                        className="p-1 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all flex-shrink-0"
                    >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                )}
            </div>

            {/* Post Image(s) - Carousel Layout */}
            <div className="relative aspect-square w-full">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full w-full"
                >
                    {images.map((url, index) => (
                        <div key={url} className="relative flex-shrink-0 w-full h-full snap-center">
                            <Image
                                src={url}
                                alt={`Community post image ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 80vw, 400px"
                                priority={priority && index === 0}
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    ))}
                </div>

                {/* Carousel Dots */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full">
                        {images.map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-[#34baab] w-3' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}

                {treatmentName && (
                    <div className="absolute top-4 left-4 z-10">
                        <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-lg border border-white/20">
                            <TagIcon className="w-3.5 h-3.5 text-[#34baab]" />
                            <span className="text-[10px] font-black text-gray-900 truncate uppercase tracking-widest">{treatmentName}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions & Content */}
            <div className="p-2.5 md:p-5 space-y-1.5 md:space-y-3 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-1 md:mb-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLike();
                            }}
                            className="flex items-center gap-1 group/like"
                        >
                            <Heart
                                className={`w-4 h-4 md:w-6 md:h-6 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400 group-hover/like:scale-110'}`}
                            />
                            <span className={`text-[10px] md:text-xs font-black ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>
                                {post.likes.length}
                            </span>
                        </button>
                    </div>

                    <p className="text-[10px] md:text-sm text-gray-700 font-medium leading-tight md:leading-relaxed line-clamp-3 md:line-clamp-none">
                        <span className="font-black text-gray-900 mr-1 md:mr-2">{post.userName}</span>
                        {post.content}
                    </p>
                </div>
            </div>
        </div>
    );
}
