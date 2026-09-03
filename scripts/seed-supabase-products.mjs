import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const productsDir = join(rootDir, "public", "products");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = "product-images";

const genres = ["Rock", "Rock nacional", "Jazz", "Tango", "Pop", "Funk / Soul", "Disco", "Progresivo"];
const countries = ["Argentina", "Estados Unidos", "Reino Unido", "Brasil", "Espana", "Alemania", "Italia"];
const mediaConditions = ["NM", "EX", "VG+", "VG"];
const sleeveConditions = ["EX", "VG+", "VG", "G"];

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false
  }
});

const imageFiles = (await readdir(productsDir))
  .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
  .sort((firstFile, secondFile) => firstFile.localeCompare(secondFile, "en", { numeric: true }));

for (const [index, file] of imageFiles.entries()) {
  const itemNumber = index + 1;
  const isNew = itemNumber % 17 === 0;
  const slug = `vinilo-12-pulgadas-${String(itemNumber).padStart(3, "0")}`;
  const artist = itemNumber === 2 ? "Rick Wakeman" : "Artista por completar";
  const title = itemNumber === 2 ? "Mitos y leyendas del Rey Arturo" : `Vinilo 12 pulgadas #${String(itemNumber).padStart(2, "0")}`;
  const album = itemNumber === 2 ? "Mitos y leyendas del Rey Arturo" : "Album por completar";
  const productPayload = {
    slug,
    artist,
    title,
    album,
    description: "",
    year: 1970 + (index % 25),
    genre: genres[index % genres.length],
    price: 26000 + itemNumber * 1400,
    currency: "ARS",
    status: "published",
    media_condition: isNew ? "M" : mediaConditions[index % mediaConditions.length],
    sleeve_condition: isNew ? "M" : sleeveConditions[index % sleeveConditions.length],
    stock: 1,
    is_new: isNew,
    featured: index < 6
  };

  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert(productPayload, { onConflict: "slug" })
    .select("id, title, artist")
    .single();

  if (productError) {
    throw productError;
  }

  const storagePath = `seed/${file}`;
  const fileBuffer = await readFile(join(productsDir, file));
  const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, fileBuffer, {
    contentType: getContentType(file),
    upsert: true
  });

  if (uploadError) {
    throw uploadError;
  }

  const { error: imageError } = await supabase.from("product_images").upsert(
    {
      product_id: product.id,
      storage_path: storagePath,
      alt_text: `${product.artist} - ${product.title}`,
      sort_order: 0
    },
    { onConflict: "storage_path" }
  );

  if (imageError) {
    throw imageError;
  }

  console.log(`Seeded ${slug}: ${file}`);
}

console.log(`Seed complete: ${imageFiles.length} products.`);

function getContentType(fileName) {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/jpeg";
}
