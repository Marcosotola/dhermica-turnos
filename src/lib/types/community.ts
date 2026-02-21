import { Timestamp } from 'firebase/firestore';

export interface CommunityPost {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    imageUrl?: string; // Legacy single image
    imageUrls?: string[]; // Multiple images support (e.g. Before/After)
    treatmentId?: string; // Optional link to a treatment catalog item
    createdAt: Timestamp;
    likes: string[]; // Array of user UIDs who liked the post
}
