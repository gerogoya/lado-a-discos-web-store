import { createSupabaseBrowserClient } from "./client";
import type { Database, Json } from "./database.types";
import type { ContactSettings, SocialLink } from "@/types/contact";

type ContactRow = Database["public"]["Tables"]["contact_settings"]["Row"];

function mapContact(row: ContactRow): ContactSettings {
  return {
    heading: row.heading, address: row.address, attendance: row.attendance,
    hours: row.hours, whatsapp: row.whatsapp, email: row.email,
    mapQuery: row.map_query, mapVisible: row.map_visible,
    socials: row.socials as unknown as SocialLink[], updatedAt: row.updated_at
  };
}

export async function getContact() {
  const { data, error } = await createSupabaseBrowserClient().from("contact_settings").select().eq("id", true).single();
  if (error) throw error;
  return mapContact(data);
}

export async function saveContact(contact: ContactSettings) {
  const { data, error } = await createSupabaseBrowserClient().rpc("save_contact", {
    expected_updated_at: contact.updatedAt,
    content: {
      heading: contact.heading.trim(), address: contact.address.trim(), attendance: contact.attendance.trim(),
      hours: contact.hours.trim(), whatsapp: contact.whatsapp, email: contact.email.trim(),
      map_query: contact.mapQuery.trim(), map_visible: contact.mapVisible,
      socials: contact.socials.map(social => ({ ...social, label: social.label.trim(), url: social.url.trim() })) as unknown as Json
    }
  });
  if (error) throw error;
  return mapContact(data);
}
