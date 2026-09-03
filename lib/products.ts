import type { Product, ProductCondition } from "@/types/product";
import { publicAsset } from "@/lib/assets";

const imageFiles = [
  "61953720-A4B9-4066-886F-3A43CE46E222.JPG",
  "IMG_2273.jpg",
  "IMG_2274.jpg",
  "IMG_2275.jpg",
  "IMG_2276.jpg",
  "IMG_2277.jpg",
  "IMG_2278.jpg",
  "IMG_2279.jpg",
  "IMG_2280.jpg",
  "IMG_2281.jpg",
  "IMG_2283.jpg",
  "IMG_2284.jpg",
  "IMG_2285.jpg",
  "IMG_2286.jpg",
  "IMG_2287.jpg",
  "IMG_2288.jpg",
  "IMG_2289.jpg",
  "IMG_2290.jpg",
  "IMG_2291.jpg",
  "IMG_2292.jpg",
  "IMG_2293.jpg",
  "IMG_2295.jpg",
  "IMG_2296.jpg",
  "IMG_2297.jpg",
  "IMG_2298.jpg",
  "IMG_2299.jpg",
  "IMG_2300.jpg",
  "IMG_2301.jpg",
  "IMG_2302.jpg",
  "IMG_2303.jpg",
  "IMG_2304.jpg",
  "IMG_2305.jpg",
  "IMG_2306.jpg",
  "IMG_2307.jpg",
  "IMG_2308.jpg",
  "IMG_2309.jpg",
  "IMG_2310.jpg",
  "IMG_2311.jpg",
  "IMG_2312.jpg",
  "IMG_2313.jpg",
  "IMG_2314.jpg",
  "IMG_2315.jpg",
  "IMG_2316.jpg",
  "IMG_2317.jpg",
  "IMG_2319.jpg",
  "IMG_2320.jpg",
  "IMG_2321.jpg",
  "IMG_2322.jpg",
  "IMG_2323.jpg",
  "IMG_2324.jpg",
  "IMG_2325.jpg",
  "IMG_2326.jpg",
  "IMG_2327.jpg"
];

const genres = ["Rock", "Rock nacional", "Jazz", "Tango", "Pop", "Funk / Soul", "Disco", "Progresivo"];
const countries = ["Argentina", "Estados Unidos", "Reino Unido", "Brasil", "España", "Alemania", "Italia"];
const mediaConditions: ProductCondition[] = ["NM", "EX", "VG+", "VG"];
const sleeveConditions: ProductCondition[] = ["EX", "VG+", "VG", "G"];

export const products: Product[] = imageFiles.map((file, index) => {
  const itemNumber = index + 1;
  const isNew = itemNumber % 17 === 0;

  return {
    id: `lp-${String(itemNumber).padStart(3, "0")}`,
    slug: `vinilo-12-pulgadas-${String(itemNumber).padStart(3, "0")}`,
    artist: itemNumber === 2 ? "Rick Wakeman" : "Artista por completar",
    title: itemNumber === 2 ? "Mitos y leyendas del Rey Arturo" : `Vinilo 12 pulgadas #${String(itemNumber).padStart(2, "0")}`,
    album: itemNumber === 2 ? "Mitos y leyendas del Rey Arturo" : "Album por completar",
    description: "",
    price: 26000 + itemNumber * 1400,
    currency: "ARS",
    mediaCondition: isNew ? "M" : mediaConditions[index % mediaConditions.length],
    sleeveCondition: isNew ? "M" : sleeveConditions[index % sleeveConditions.length],
    genre: genres[index % genres.length],
    year: 1970 + (index % 25),
    country: countries[index % countries.length],
    photos: [publicAsset(`/products/${file}`)],
    stock: 1,
    status: "published",
    isNew,
    featured: index < 6
  };
});

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export const genresForFilters = Array.from(new Set(products.map((product) => product.genre))).sort();
