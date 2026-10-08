export type SocialLink = { id: string; label: string; url: string; visible: boolean };

export type ContactSettings = {
  heading: string;
  address: string;
  attendance: string;
  hours: string;
  whatsapp: string;
  email: string;
  mapQuery: string;
  mapVisible: boolean;
  socials: SocialLink[];
  updatedAt: string;
};

export const defaultContact: ContactSettings = {
  heading: "Encontrá tu próximo disco.",
  address: "San Martín 845, W3400APT Corrientes, Argentina",
  attendance: "Punto de retiro con coordinación previa.",
  hours: "",
  whatsapp: "5493795762457",
  email: "",
  mapQuery: "",
  mapVisible: true,
  socials: [{ id: "instagram", label: "Instagram", url: "https://www.instagram.com/discosladoa/", visible: true }],
  updatedAt: ""
};

export function safeSocialUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function validateContact(contact: ContactSettings) {
  if (!contact.heading.trim() || !contact.address.trim() || !contact.attendance.trim()) return "Completá el título, la dirección y la modalidad de atención.";
  if (!/^[1-9]\d{7,14}$/.test(contact.whatsapp)) return "Ingresá WhatsApp con código de país y solo números (por ejemplo, 5493795762457).";
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return "Revisá el email de contacto.";
  if (contact.socials.some(social => !social.label.trim() || !safeSocialUrl(social.url))) return "Cada red necesita un nombre y un enlace completo que empiece con https://.";
  return "";
}
