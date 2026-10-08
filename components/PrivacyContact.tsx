"use client";
import { useContact } from "./ContactProvider";
import { buildWhatsAppUrl } from "@/lib/store-config";

export function PrivacyContact() {
  const contact = useContact();
  return <a href={buildWhatsAppUrl("Hola, quiero consultar sobre la privacidad de LADO A DISCOS.", contact.whatsapp)} target="_blank" rel="noreferrer">escribinos por WhatsApp</a>;
}
