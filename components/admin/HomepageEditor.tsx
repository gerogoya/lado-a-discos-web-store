"use client";

import { ArrowDown, ArrowUp, Bold, Eye, EyeOff, LayoutTemplate, Link as LinkIcon, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SimpleRichText, isSafeContentHref } from "@/components/SimpleRichText";
import { getHomepage, saveHomepage } from "@/lib/supabase/homepage";
import type { HomepageContent, HomepageSection } from "@/types/homepage";

type Toast = (type: "success" | "error", title: string, message: string) => void;

export function HomepageEditor({ showToast }: { showToast: Toast }) {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const homepage = await getHomepage(true);
      setContent(homepage.content);
      setSections(homepage.sections);
    } catch (error) {
      const message = messageFrom(error, "No se pudo cargar la portada.");
      setLoadError(message);
      showToast("error", "No se pudo cargar la portada", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content) return;
    if (!content.eyebrow.trim() || !content.heading.trim()) {
      showToast("error", "Faltan datos", "Completá el eyebrow y el título principal.");
      return;
    }
    if (content.actions.some(action => !action.label.trim() || !isSafeContentHref(action.href))) {
      showToast("error", "Revisá los botones", "Cada botón necesita texto y un destino válido: #seccion, /ruta o https://...");
      return;
    }
    if (sections.some(section => !section.title.trim())) {
      showToast("error", "Revisá las secciones", "Todas las secciones necesitan un título.");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveHomepage(content, sections);
      setContent(saved);
      setSections(current => current.map((section, index) => ({ ...section, sortOrder: index })));
      showToast("success", "Portada guardada", "Los cambios ya están disponibles en la página principal.");
    } catch (error) {
      showToast("error", "No se pudo guardar la portada", messageFrom(error, "Revisá los datos e intentá nuevamente."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Cargando portada...</p>;
  if (!content) return <div className="admin-message error" role="alert">{loadError}<button type="button" className="secondary-action" onClick={() => void load()}>Reintentar</button></div>;

  return <form className="homepage-editor" onSubmit={submit} aria-label="Editor de portada">
    <section className="homepage-editor-band">
      <div className="admin-panel-heading"><div><p className="eyebrow">Página principal</p><h2>Hero</h2></div><LayoutTemplate size={24} /></div>
      <div className="homepage-fields">
        <label className="admin-field"><span>Eyebrow</span><input value={content.eyebrow} maxLength={120} onChange={event => setContent({ ...content, eyebrow: event.target.value })} /></label>
        <label className="admin-field"><span>Título H1</span><input value={content.heading} maxLength={180} onChange={event => setContent({ ...content, heading: event.target.value })} /></label>
        <SimpleTextEditor label="Texto introductorio" value={content.body} maxLength={2000} onChange={body => setContent({ ...content, body })} />
      </div>
    </section>

    <section className="homepage-editor-band" aria-labelledby="hero-buttons-title">
      <div className="homepage-section-heading"><h2 id="hero-buttons-title">Botones del hero</h2></div>
      <div className="homepage-action-list">
        {content.actions.map((action, index) => <div className="homepage-action-row" key={action.id}>
          <label className="admin-field"><span>Texto del botón {index + 1}</span><input value={action.label} maxLength={80} onChange={event => setContent({ ...content, actions: content.actions.map(item => item.id === action.id ? { ...item, label: event.target.value } : item) })} /></label>
          <label className="admin-field"><span>Destino</span><input value={action.href} maxLength={500} onChange={event => setContent({ ...content, actions: content.actions.map(item => item.id === action.id ? { ...item, href: event.target.value } : item) })} /></label>
          <label className="homepage-visible"><input type="checkbox" checked={action.visible} onChange={event => setContent({ ...content, actions: content.actions.map(item => item.id === action.id ? { ...item, visible: event.target.checked } : item) })} />Visible</label>
        </div>)}
      </div>
    </section>

    <section className="homepage-editor-band" aria-labelledby="additional-sections-title">
      <div className="homepage-section-heading"><h2 id="additional-sections-title">Secciones inferiores</h2><button type="button" className="secondary-action" onClick={() => setSections(current => [...current, { id: crypto.randomUUID(), title: "", body: "", visible: true, sortOrder: current.length }])}><Plus size={16} />Agregar sección</button></div>
      <div className="homepage-sections-editor">
        {sections.map((section, index) => <article className="homepage-section-editor" key={section.id}>
          <div className="homepage-section-tools">
            <span>Sección {index + 1}</span>
            <button type="button" className="catalog-icon" disabled={index === 0} aria-label={`Subir sección ${index + 1}`} title="Mover arriba" onClick={() => setSections(move(sections, index, index - 1))}><ArrowUp size={17} /></button>
            <button type="button" className="catalog-icon" disabled={index === sections.length - 1} aria-label={`Bajar sección ${index + 1}`} title="Mover abajo" onClick={() => setSections(move(sections, index, index + 1))}><ArrowDown size={17} /></button>
            <button type="button" className="catalog-icon" aria-label={`${section.visible ? "Ocultar" : "Mostrar"} sección ${index + 1}`} title={section.visible ? "Ocultar" : "Mostrar"} onClick={() => setSections(current => current.map(item => item.id === section.id ? { ...item, visible: !item.visible } : item))}>{section.visible ? <Eye size={17} /> : <EyeOff size={17} />}</button>
            <button type="button" className="catalog-icon danger" aria-label={`Eliminar sección ${index + 1}`} title="Eliminar" onClick={() => { if (window.confirm(`Eliminar la sección "${section.title || index + 1}"?`)) setSections(current => current.filter(item => item.id !== section.id)); }}><Trash2 size={17} /></button>
          </div>
          <label className="admin-field"><span>Título</span><input value={section.title} maxLength={180} onChange={event => setSections(current => current.map(item => item.id === section.id ? { ...item, title: event.target.value } : item))} /></label>
          <SimpleTextEditor label="Descripción" value={section.body} maxLength={5000} onChange={body => setSections(current => current.map(item => item.id === section.id ? { ...item, body } : item))} />
        </article>)}
        {!sections.length && <p className="homepage-empty">Todavía no hay secciones adicionales.</p>}
      </div>
    </section>
    <div className="homepage-save-bar"><button type="submit" className="admin-save-button" disabled={saving}><Save size={17} />{saving ? "Guardando..." : "Guardar portada"}</button></div>
  </form>;
}

function SimpleTextEditor({ label, value, maxLength, onChange }: { label: string; value: string; maxLength: number; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function wrap(kind: "bold" | "link") {
    const element = ref.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || (kind === "bold" ? "texto" : "enlace");
    const insertion = kind === "bold" ? `**${selected}**` : `[${selected}](https://)`;
    onChange(value.slice(0, start) + insertion + value.slice(end));
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + insertion.length, start + insertion.length); });
  }
  return <div className="simple-editor">
    <div className="simple-editor-heading"><label>{label}</label><div><button type="button" title="Negrita" aria-label={`Aplicar negrita en ${label}`} onClick={() => wrap("bold")}><Bold size={16} /></button><button type="button" title="Enlace" aria-label={`Agregar enlace en ${label}`} onClick={() => wrap("link")}><LinkIcon size={16} /></button></div></div>
    <textarea ref={ref} aria-label={label} value={value} maxLength={maxLength} rows={5} onChange={event => onChange(event.target.value)} />
    {value && <div className="simple-editor-preview"><SimpleRichText value={value} /></div>}
  </div>;
}

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}
