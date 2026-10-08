"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getContact, saveContact } from "@/lib/supabase/contact";
import { errorMessage } from "@/lib/supabase/catalog";
import { validateContact, type ContactSettings, type SocialLink } from "@/types/contact";

export function ContactEditor({ showToast }: { showToast: (type: "success" | "error", title: string, message: string) => void }) {
  const [contact, setContact] = useState<ContactSettings | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function load() {
    setError("");
    try { setContact(await getContact()); setDirty(false); }
    catch (cause) { setError(errorMessage(cause)); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function patch(value: Partial<ContactSettings>) { setContact(current => current ? { ...current, ...value } : current); setDirty(true); }
  function updateSocial(id: string, value: Partial<SocialLink>) { if (contact) patch({ socials: contact.socials.map(social => social.id === id ? { ...social, ...value } : social) }); }
  function move(index: number, offset: number) {
    if (!contact) return;
    const socials = [...contact.socials];
    [socials[index], socials[index + offset]] = [socials[index + offset], socials[index]];
    patch({ socials });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact) return;
    const validation = validateContact(contact);
    if (validation) { setError(validation); return; }
    setSaving(true); setError("");
    try {
      setContact(await saveContact(contact)); setDirty(false);
      window.dispatchEvent(new Event("contact-saved"));
      showToast("success", "Contacto guardado", "Los datos de contacto y las redes se actualizaron.");
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  }

  if (!contact) return <div className="catalog-loading" role="status">{error || "Cargando contacto…"}{error && <button type="button" onClick={() => void load()}>Reintentar</button>}</div>;

  return <form className="homepage-editor contact-editor" aria-label="Editor de contacto" onSubmit={submit}>
    <fieldset disabled={saving}>
      <section className="homepage-editor-band">
        <div className="homepage-section-heading"><h2>Contacto y retiro</h2><span>{dirty ? "Cambios sin guardar" : "Datos guardados"}</span></div>
        <div className="homepage-fields">
          <label className="admin-field"><span>Título de contacto</span><input required maxLength={120} value={contact.heading} onChange={event => patch({ heading: event.target.value })} /></label>
          <label className="admin-field"><span>Dirección</span><input required maxLength={300} value={contact.address} onChange={event => patch({ address: event.target.value })} /></label>
          <label className="admin-field"><span>Modalidad de atención</span><textarea required maxLength={600} value={contact.attendance} onChange={event => patch({ attendance: event.target.value })} /></label>
          <label className="admin-field"><span>Horarios (opcional)</span><textarea maxLength={600} placeholder="Por ejemplo: retiros de lunes a viernes, con coordinación previa" value={contact.hours} onChange={event => patch({ hours: event.target.value })} /></label>
          <label className="admin-field"><span id="contact-whatsapp-label">WhatsApp</span><input aria-labelledby="contact-whatsapp-label" aria-describedby="contact-whatsapp-help" required inputMode="tel" maxLength={15} pattern="[1-9][0-9]{7,14}" value={contact.whatsapp} onChange={event => patch({ whatsapp: event.target.value })} /><small id="contact-whatsapp-help">Código de país y número, sin +, espacios ni guiones. Se usa en todas las consultas y pedidos.</small></label>
          <label className="admin-field"><span>Email (opcional)</span><input type="email" maxLength={254} value={contact.email} onChange={event => patch({ email: event.target.value })} /></label>
        </div>
      </section>
      <section className="homepage-editor-band">
        <div className="homepage-section-heading"><h2>Mapa</h2><label className="homepage-visible"><input type="checkbox" checked={contact.mapVisible} onChange={event => patch({ mapVisible: event.target.checked })} />Mostrar mapa</label></div>
        <label className="admin-field"><span id="contact-map-label">Ubicación para el mapa (opcional)</span><input aria-labelledby="contact-map-label" aria-describedby="contact-map-help" maxLength={300} placeholder="Usar la dirección de contacto" value={contact.mapQuery} onChange={event => patch({ mapQuery: event.target.value })} /><small id="contact-map-help">Dejalo vacío para usar la dirección. También podés ingresar coordenadas o el nombre y la ciudad del lugar.</small></label>
      </section>
      <section className="homepage-editor-band" aria-labelledby="social-editor-title">
        <div className="homepage-section-heading"><h2 id="social-editor-title">Redes sociales</h2><button type="button" className="secondary-action" disabled={contact.socials.length >= 20} onClick={() => patch({ socials: [...contact.socials, { id: crypto.randomUUID(), label: "", url: "", visible: true }] })}><Plus size={17} />Agregar red social</button></div>
        <p>Agregá Instagram, Facebook, TikTok u otra red con su nombre y enlace. El orden de esta lista será el de la tienda.</p>
        {contact.socials.map((social, index) => <div className="contact-social-editor" key={social.id}>
          <label className="admin-field"><span>Nombre de la red {index + 1}</span><input required maxLength={50} value={social.label} onChange={event => updateSocial(social.id, { label: event.target.value })} /></label>
          <label className="admin-field"><span>Enlace de la red {index + 1}</span><input required type="url" maxLength={500} placeholder="https://…" value={social.url} onChange={event => updateSocial(social.id, { url: event.target.value })} /></label>
          <div className="contact-social-controls">
            <label className="homepage-visible"><input type="checkbox" checked={social.visible} onChange={event => updateSocial(social.id, { visible: event.target.checked })} />Visible</label>
            <button type="button" className="catalog-icon" aria-label={`Subir red ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} /></button>
            <button type="button" className="catalog-icon" aria-label={`Bajar red ${index + 1}`} disabled={index === contact.socials.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} /></button>
            <button type="button" className="catalog-icon danger" aria-label={`Eliminar red ${index + 1}`} onClick={() => patch({ socials: contact.socials.filter(item => item.id !== social.id) })}><Trash2 size={17} /></button>
          </div>
        </div>)}
        {!contact.socials.length && <p>No hay redes configuradas.</p>}
      </section>
      {error && <p className="contact-error" role="alert">{error}</p>}
      <div className="contact-save-actions"><button className="primary-action" type="submit" disabled={!dirty || saving}><Save size={18} />{saving ? "Guardando…" : "Guardar contacto"}</button><button className="secondary-action" type="button" onClick={() => { if (!dirty || window.confirm("¿Descartar los cambios de contacto sin guardar?")) void load(); }}>Recargar datos</button></div>
    </fieldset>
  </form>;
}
