import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
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
import { Product } from '../types/product';

const COLLECTION_NAME = 'products';

export const getProducts = async (): Promise<Product[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Product[];
};

export const getProduct = async (id: string): Promise<Product | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Product;
    }
    return null;
};

export const createProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...product,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    return docRef.id;
};

export const updateProduct = async (id: string, product: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
        ...product,
        updatedAt: Date.now()
    });
};

export const deleteProduct = async (id: string): Promise<void> => {
    // 1. Delete images from Storage
    const storageFolderRef = ref(storage, `products/${id}`);
    try {
        const listResult = await listAll(storageFolderRef);
        const deletePromises = listResult.items.map(item => deleteObject(item));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error deleting product images:', error);
    }

    // 2. Delete document from Firestore
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
};

// Image Upload Helpers
export const uploadProductImage = async (productId: string, file: File): Promise<string> => {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `products/${productId}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
};

export const deleteProductImage = async (url: string): Promise<void> => {
    try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
    } catch (error) {
        console.error('Error deleting image from Storage:', error);
    }
};
