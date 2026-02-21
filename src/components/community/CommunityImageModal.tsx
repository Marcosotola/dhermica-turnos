'use client';

import React from 'react';
import { X, User, Tag } from 'lucide-react';
import { CommunityPost } from '@/lib/types/community';
import { motion, AnimatePresence } from 'framer-motion';

interface CommunityImageModalProps {
    post: CommunityPost | null;
    onClose: () => void;
    treatmentName?: string;
}

export function CommunityImageModal({ post, onClose, treatmentName }: CommunityImageModalProps) {
    if (!post) return null;

    const imageUrls = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-sm"
                onClick={onClose}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-8 md:right-8 z-[160] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95"
                >
                    <X className="w-6 h-6 md:w-8 md:h-8" />
                </button>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-5xl h-full flex flex-col"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    <div className="w-full flex-1 overflow-y-auto no-scrollbar space-y-4 rounded-[2rem]">
                        {imageUrls.map((url, index) => (
                            <div key={url} className="relative w-full min-h-[50vh] flex items-center justify-center bg-zinc-900 rounded-[2rem] overflow-hidden">
                                <img
                                    src={url}
                                    alt={`Full view ${index + 1}`}
                                    className="max-w-full h-auto object-contain"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="w-full mt-4 md:mt-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/5 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-teal-500/20 flex items-center justify-center overflow-hidden border border-teal-500/30">
                                {post.userAvatar ? (
                                    <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 md:w-8 md:h-8 text-[#34baab]" />
                                )}
                            </div>
                            <div>
                                <h4 className="text-xl md:text-2xl font-black text-white leading-tight">{post.userName}</h4>
                                <p className="text-sm md:text-base text-white/50 font-medium">Resultado Compartido</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {treatmentName && (
                                <div className="bg-[#34baab]/20 px-4 py-2 rounded-2xl flex items-center gap-2 border border-[#34baab]/30">
                                    <Tag className="w-4 h-4 text-[#34baab]" />
                                    <span className="text-sm md:text-base font-black text-[#34baab] uppercase tracking-wider">{treatmentName}</span>
                                </div>
                            )}
                            <p className="text-white/80 text-center md:text-right font-medium text-sm md:text-lg max-w-md italic">
                                "{post.content}"
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
