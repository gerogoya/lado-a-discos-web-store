"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const measurementId = "G-NWYWRTJ1DJ";
export const analyticsConsentKey = "lado-a-discos-analytics-consent";
type Consent = "accepted" | "declined";

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const banner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = banner.current;
    if (!element) return;
    const measure = () => document.documentElement.style.setProperty("--consent-height", `${element.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--consent-height"); };
  }, [consent, pathname]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(analyticsConsentKey);
      setConsent(saved === "accepted" || saved === "declined" ? saved : null);
    } catch {
      setConsent(null);
    }
  }, []);

  if (pathname.startsWith("/admin")) return null;

  function choose(value: Consent) {
    try {
      window.localStorage.setItem(analyticsConsentKey, value);
    } catch {
      // The current choice still applies for this visit.
    }
    setConsent(value);
  }

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}');`}
          </Script>
        </>
      )}

      {consent === null && (
        <div ref={banner} className="analytics-consent" role="region" aria-label="Preferencias de privacidad">
          <div className="analytics-consent-inner">
          <p>Usamos Google Analytics para conocer las visitas al sitio. Solo se activa si aceptás. <Link href="/privacidad">Más información</Link>.</p>
          <div className="analytics-consent-actions">
            <button type="button" onClick={() => choose("declined")}>Rechazar</button>
            <button type="button" onClick={() => choose("accepted")}>Aceptar</button>
          </div>
          </div>
        </div>
      )}

      <footer className="site-footer site-shell">
        <span>LADO A DISCOS · Sitio desarrollado por Greyline Studio</span>
        <Link className="privacy-link" href="/privacidad">Preferencias de privacidad</Link>
      </footer>
    </>
  );
}
