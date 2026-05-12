import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    deleteDoc, 
    doc,
    Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { ImpactImage } from '../types/impact';

const COLLECTION_NAME = 'impact_gallery';

export const getImpactImages = async (): Promise<ImpactImage[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
    } as ImpactImage));
};

export const uploadImpactImage = async (file: File, description: string, uploadedBy: string): Promise<void> => {
    // 1. Upload to Storage
    const storageRef = ref(storage, `impact/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);

    // 2. Add to Firestore
    await addDoc(collection(db, COLLECTION_NAME), {
        imageUrl,
        description,
        uploadedBy,
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
        storagePath: storageRef.fullPath // Keep to delete later
    });
};

export const deleteImpactImage = async (id: string, storagePath: string): Promise<void> => {
    // 1. Delete from Firestore
    await deleteDoc(doc(db, COLLECTION_NAME, id));

    // 2. Delete from Storage
    if (storagePath) {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
    }
};

export const updateImpactDescription = async (id: string, description: string): Promise<void> => {
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, COLLECTION_NAME, id), {
        description,
        updatedAt: Timestamp.now()
    });
};

