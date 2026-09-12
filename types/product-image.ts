export const maxProductImages = 5;

export type ProductImageRecord = {
  id: string;
  productId: string;
  storagePath: string;
  publicUrl: string;
  altText: string;
  sortOrder: number;
  createdAt: string;
};

export type ImageDraft = {
  id: string;
  url: string;
  name: string;
  storagePath?: string;
  file?: File;
};
