import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from 'firebase/storage';
import { db, storage } from './config';
import { Promotion } from '../types/promotion';

const COLLECTION_NAME = 'promotions';

export const getPromotions = async (): Promise<Promotion[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
        updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
    } as Promotion));
};

export const uploadPromotionImage = async (file: File, promotionId: string): Promise<string> => {
    const storageRef = ref(storage, `promotions/${promotionId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};

export const deletePromotionImage = async (imageUrl: string): Promise<void> => {
    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
    } catch (error) {
        console.error('Error deleting promotion image:', error);
    }
};

export const createPromotion = async (promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...promotion,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    return docRef.id;
};

export const updatePromotion = async (id: string, promotion: Partial<Promotion>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
        ...promotion,
        updatedAt: Timestamp.now(),
    });
};

export const deletePromotion = async (id: string): Promise<void> => {
    // 1. Delete all images in the promotion folder
    const storageFolderRef = ref(storage, `promotions/${id}`);
    try {
        const listResult = await listAll(storageFolderRef);
        const deletePromises = listResult.items.map(item => deleteObject(item));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error deleting promotion images:', error);
    }

    // 2. Delete the document
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
};
