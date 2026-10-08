"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getContact } from "@/lib/supabase/contact";
import { defaultContact } from "@/types/contact";

const ContactContext = createContext(defaultContact);

export function ContactProvider({ children }: { children: React.ReactNode }) {
  const [contact, setContact] = useState(defaultContact);
  useEffect(() => {
    let active = true;
    const refresh = () => { void getContact().then(value => { if (active) setContact(value); }).catch(error => console.warn("Using default contact details.", error)); };
    refresh();
    window.addEventListener("contact-saved", refresh);
    return () => { active = false; window.removeEventListener("contact-saved", refresh); };
  }, []);
  return <ContactContext.Provider value={contact}>{children}</ContactContext.Provider>;
}

export const useContact = () => useContext(ContactContext);
