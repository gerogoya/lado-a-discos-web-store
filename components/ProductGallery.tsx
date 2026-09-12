"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { ProductImage } from "./ProductImage";
import { publicAsset } from "@/lib/assets";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export function ProductGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const images = photos.length ? photos : [publicAsset("/brand/lado-a-discos-logo.jpg")];
  const index = Math.min(active, images.length - 1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (viewerOpen && !dialog.open) dialog.showModal();
    if (!viewerOpen && dialog.open) dialog.close();
  }, [viewerOpen]);

  const showImage = (nextIndex: number) => {
    setActive(Math.max(0, Math.min(images.length - 1, nextIndex)));
    setZoom(MIN_ZOOM);
    panRef.current?.scrollTo({ left: 0, top: 0 });
  };

  const changeZoom = (nextZoom: number) => {
    const boundedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    setZoom(boundedZoom);
    if (boundedZoom === MIN_ZOOM) panRef.current?.scrollTo({ left: 0, top: 0 });
  };

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom === MIN_ZOOM || event.pointerType === "touch") return;
    const stage = panRef.current;
    if (!stage) return;
    event.preventDefault();
    stage.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
  };

  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const stage = panRef.current;
    const drag = dragRef.current;
    if (!stage || !drag) return;
    stage.scrollLeft = drag.left - (event.clientX - drag.x);
    stage.scrollTop = drag.top - (event.clientY - drag.y);
  };

  const stopPan = () => {
    dragRef.current = null;
  };

  return <section className="detail-gallery" aria-label="Galería del disco">
    <div className="detail-gallery-stage">
      <button
        className="detail-gallery-open"
        type="button"
        aria-label={`Ampliar imagen ${index + 1} de ${images.length}`}
        title="Ampliar imagen"
        onClick={() => setViewerOpen(true)}
      >
        <ProductImage src={images[index]} alt={`${title}, imagen ${index + 1} de ${images.length}`} width={900} height={900} priority />
        <span className="detail-gallery-expand" aria-hidden="true"><Maximize2 size={20} /></span>
      </button>
    </div>
    {images.length > 1 && <div className="detail-gallery-controls">
      <button type="button" aria-label="Imagen anterior" title="Imagen anterior" disabled={index === 0} onClick={() => showImage(index - 1)}><ChevronLeft size={24} /></button>
      <span aria-live="polite" aria-atomic="true">{index + 1} de {images.length}</span>
      <button type="button" aria-label="Imagen siguiente" title="Imagen siguiente" disabled={index === images.length - 1} onClick={() => showImage(index + 1)}><ChevronRight size={24} /></button>
    </div>}

    <dialog
      ref={dialogRef}
      className="image-viewer"
      aria-label="Visor ampliado de imágenes"
      onCancel={() => setViewerOpen(false)}
      onClose={() => setViewerOpen(false)}
      onClick={event => {
        if (event.currentTarget === event.target) setViewerOpen(false);
      }}
    >
      <header className="image-viewer-header">
        <div>
          <strong>{title}</strong>
          <span aria-live="polite">Imagen {index + 1} de {images.length}</span>
        </div>
        <button type="button" aria-label="Cerrar imagen ampliada" title="Cerrar" onClick={() => setViewerOpen(false)}><X size={24} /></button>
      </header>
      <div
        ref={panRef}
        className={`image-viewer-stage${zoom > MIN_ZOOM ? " is-zoomed" : ""}`}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        onDragStart={event => event.preventDefault()}
      >
        <div className="image-viewer-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
          <ProductImage src={images[index]} alt={`${title}, imagen ampliada ${index + 1} de ${images.length}`} width={1800} height={1800} priority />
        </div>
      </div>
      <footer className="image-viewer-controls">
        <button type="button" aria-label="Imagen anterior ampliada" title="Imagen anterior" disabled={index === 0} onClick={() => showImage(index - 1)}><ChevronLeft size={24} /></button>
        <span className="image-viewer-divider" aria-hidden="true" />
        <button type="button" aria-label="Alejar imagen" title="Alejar" disabled={zoom === MIN_ZOOM} onClick={() => changeZoom(zoom - ZOOM_STEP)}><Minus size={22} /></button>
        <output aria-label="Nivel de zoom">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Acercar imagen" title="Acercar" disabled={zoom === MAX_ZOOM} onClick={() => changeZoom(zoom + ZOOM_STEP)}><Plus size={22} /></button>
        <button type="button" aria-label="Restablecer zoom" title="Restablecer zoom" disabled={zoom === MIN_ZOOM} onClick={() => changeZoom(MIN_ZOOM)}><RotateCcw size={20} /></button>
        <span className="image-viewer-divider" aria-hidden="true" />
        <button type="button" aria-label="Imagen siguiente ampliada" title="Imagen siguiente" disabled={index === images.length - 1} onClick={() => showImage(index + 1)}><ChevronRight size={24} /></button>
      </footer>
    </dialog>
  </section>;
}
