import Link from "next/link";
import { PrivacyPreferences } from "@/components/PrivacyPreferences";
import { PrivacyContact } from "@/components/PrivacyContact";

export const metadata = {
  title: "Privacidad | LADO A DISCOS",
  description: "Información sobre Google Analytics y las preferencias de privacidad de LADO A DISCOS."
};

export default function PrivacyPage() {
  return (
    <main className="site-shell privacy-page">
      <Link className="back-link" href="/">← Volver al catálogo</Link>
      <h1>Privacidad</h1>
      <p>Este sitio usa Google Analytics 4 para conocer cuántas personas lo visitan, qué páginas consultan y cómo llegan. La etiqueta se carga solo si elegís “Aceptar”.</p>
      <p>Google puede recibir datos sobre tu navegador, ubicación aproximada e interacciones con el sitio, y usar cookies para distinguir visitas. <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">Conocé cómo Google usa estos datos</a>.</p>
      <p>Guardamos tu elección de Analytics en el almacenamiento local de este navegador. El carrito también usa almacenamiento local. Si elegís “Rechazar”, no cargamos la etiqueta de Analytics.</p>
      <PrivacyPreferences />
      <p>La sección Contacto incluye un mapa de Google Maps. Al cargarlo, tu navegador se conecta con Google, independientemente de tu elección sobre Analytics.</p>
      <p>Para consultas sobre privacidad, <PrivacyContact />.</p>
    </main>
  );
}
