import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    Timestamp,
    arrayUnion,
    arrayRemove,
    getDoc
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from 'firebase/storage';
import { db, storage } from './config';
import { CommunityPost } from '../types/community';

const COLLECTION_NAME = 'community_posts';

/**
 * Fetch all community posts ordered by creation date
 */
export const getCommunityPosts = async (): Promise<CommunityPost[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as CommunityPost));
};

/**
 * Upload an image for a community post
 */
export const uploadCommunityImage = async (file: File, userId: string): Promise<string> => {
    const storageRef = ref(storage, `community/${userId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};

/**
 * Create a new community post
 */
export const createCommunityPost = async (post: Omit<CommunityPost, 'id' | 'createdAt'>): Promise<string> => {
    // Clean undefined values to prevent Firestore crash
    const cleanData = Object.entries(post).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
    }, {} as any);

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...cleanData,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
};

/**
 * Toggle like for a post
 */
export const toggleLikePost = async (postId: string, userId: string): Promise<void> => {
    const postRef = doc(db, COLLECTION_NAME, postId);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
        const likes = postSnap.data().likes || [];
        if (likes.includes(userId)) {
            await updateDoc(postRef, {
                likes: arrayRemove(userId)
            });
        } else {
            await updateDoc(postRef, {
                likes: arrayUnion(userId)
            });
        }
    }
};

/**
 * Delete a community post and its associated image from Storage
 */
export const deleteCommunityPost = async (postId: string, imageUrl: string): Promise<void> => {
    // 1. Delete image from Storage
    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
    } catch (error) {
        console.error('Error deleting community post image:', error);
        // Continue deleting the doc even if image deletion fails (it might have been deleted already)
    }

    // 2. Delete document from Firestore
    const docRef = doc(db, COLLECTION_NAME, postId);
    await deleteDoc(docRef);
};
