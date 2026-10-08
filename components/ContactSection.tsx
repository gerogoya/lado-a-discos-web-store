"use client";

import { ArrowUpRight, Clock3, Mail, MapPin, MessageCircle } from "lucide-react";
import { useContact } from "./ContactProvider";
import { buildWhatsAppUrl } from "@/lib/store-config";
import { safeSocialUrl } from "@/types/contact";

export function ContactSection() {
  const contact = useContact();
  const query = encodeURIComponent(contact.mapQuery || contact.address);
  return <section className="contact-section" id="contacto" aria-labelledby="contact-title">
    <div className="contact-copy">
      <p className="eyebrow">Contacto · LADO A DISCOS</p>
      <h2 id="contact-title">{contact.heading}</h2>
      <p className="contact-attendance">{contact.attendance}</p>
      <address><MapPin size={20} aria-hidden="true" /><span>{contact.address}</span></address>
      {contact.hours && <p className="contact-detail"><Clock3 size={20} aria-hidden="true" /><span>{contact.hours}</span></p>}
      {contact.email && <a className="contact-detail" href={`mailto:${contact.email}`}><Mail size={20} aria-hidden="true" />{contact.email}</a>}
      <div className="contact-actions">
        <a className="primary-action" href={buildWhatsAppUrl("Hola LADO A DISCOS, quiero hacer una consulta.", contact.whatsapp)} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} />Escribinos por WhatsApp</a>
        <a className="secondary-action" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer">Cómo llegar<ArrowUpRight size={18} /></a>
      </div>
      <div className="contact-socials" aria-label="Redes sociales">
        {contact.socials.filter(social => social.visible && safeSocialUrl(social.url)).map(social => <a key={social.id} href={social.url} target="_blank" rel="noopener noreferrer">{social.label}<ArrowUpRight size={15} /></a>)}
      </div>
    </div>
    {contact.mapVisible && <div className="contact-map">
      <iframe title={`Ubicación de LADO A DISCOS: ${contact.address}`} src={`https://maps.google.com/maps?q=${query}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      <p><MapPin size={15} aria-hidden="true" />{contact.attendance}</p>
    </div>}
  </section>;
}
