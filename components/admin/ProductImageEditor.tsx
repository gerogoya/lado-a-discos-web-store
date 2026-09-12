"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, Trash2 } from "lucide-react";
import { maxProductImages, type ImageDraft } from "@/types/product-image";
import { ProductImage } from "@/components/ProductImage";

export function ProductImageEditor({ images, onChange, onError, onPrepared, onBusy }: {
  images: ImageDraft[];
  onChange: (images: ImageDraft[]) => void;
  onError: (message: string) => void;
  onPrepared: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [reading, setReading] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const dragging = useRef<number | null>(null);
  async function add(files: File[]) {
    if (!files.length || reading) return;
    if (images.length + files.length > maxProductImages) {
      onError("Cada disco admite hasta 5 imágenes. Quitá alguna antes de agregar más."); return;
    }
    setReading(true);
    onBusy(true);
    try {
      const additions = await Promise.all(files.map(readImage));
      onChange([...images, ...additions]);
      onPrepared();
    } catch (error) { onError(error instanceof Error ? error.message : "No se pudo leer la imagen."); }
    finally { setReading(false); onBusy(false); }
  }
  function move(from: number, to: number) {
    if (reading || from === to || to < 0 || to >= images.length) return;
    const reordered = [...images];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    onChange(reordered);
    setAnnouncement(`Imagen movida a la posición ${to + 1}.`);
  }
  return <section className="admin-image-editor" aria-label="Imágenes del disco">
    <div className="admin-image-heading"><strong>Imágenes</strong><span>{images.length} / {maxProductImages}</span></div>
    <ol className="admin-image-list">
      {images.map((image, index) => <li key={image.id} draggable={!reading}
        onDragStart={event => {
          if (event.currentTarget.closest("fieldset:disabled")) { event.preventDefault(); return; }
          dragging.current = index; event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", image.id);
        }}
        onDragEnd={() => { dragging.current = null; }}
        onDragOver={event => { if (dragging.current !== null) event.preventDefault(); }}
        onDrop={event => { event.preventDefault(); if (dragging.current !== null && !event.currentTarget.closest("fieldset:disabled")) move(dragging.current, index); dragging.current = null; }}>
        <div className="admin-image-position"><GripVertical size={14} /><span>{index === 0 ? "Portada" : `Imagen ${index + 1}`}</span></div>
        <ProductImage src={image.url} alt={`Imagen ${index + 1} del disco`} width={160} height={160} />
        <div className="admin-image-controls">
          <button type="button" className="catalog-icon" title="Mover antes" aria-label={`Mover imagen ${index + 1} antes`} disabled={reading || index === 0} onClick={() => move(index, index - 1)}><ArrowLeft size={16} /></button>
          <button type="button" className="catalog-icon" title="Mover después" aria-label={`Mover imagen ${index + 1} después`} disabled={reading || index === images.length - 1} onClick={() => move(index, index + 1)}><ArrowRight size={16} /></button>
          <button type="button" className="catalog-icon danger" title="Quitar imagen" aria-label={`Quitar imagen ${index + 1}`} disabled={reading} onClick={() => onChange(images.filter(item => item.id !== image.id))}><Trash2 size={16} /></button>
        </div>
      </li>)}
    </ol>
    <label className="admin-field"><span>{reading ? "Preparando imágenes…" : "Agregar imágenes"}</span>
      <input aria-label="Imágenes" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple disabled={reading || images.length >= maxProductImages}
        onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void add(files); }} />
    </label>
    <span className="visually-hidden" role="status">{announcement}</span>
  </section>;
}

async function readImage(file: File): Promise<ImageDraft> {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type)) throw new Error(`Formato no admitido: ${file.name}. Usá JPG, PNG, WebP, GIF o AVIF.`);
  if (file.size > 50 * 1024 * 1024) throw new Error(`La imagen ${file.name} supera los 50 MB.`);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`La imagen ${file.name} está dañada o no es compatible.`));
    image.src = url;
  });
  return { id: crypto.randomUUID(), url, name: file.name, file };
}
