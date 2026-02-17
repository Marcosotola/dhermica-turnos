export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    images: string[]; // Array of image URLs (max 3)
    createdAt: number;
    updatedAt: number;
}
