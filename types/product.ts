export type ProductStatus = "published" | "reserved" | "sold" | "draft";

export type ProductCondition = "M" | "NM" | "EX" | "VG+" | "VG" | "G";

export type Product = {
  id: string;
  slug: string;
  artist: string;
  title: string;
  price: number;
  mediaCondition: ProductCondition;
  sleeveCondition: ProductCondition;
  genre: string;
  year: number;
  country: string;
  photos: string[];
  stock: number;
  status: ProductStatus;
  isNew: boolean;
  featured?: boolean;
};
