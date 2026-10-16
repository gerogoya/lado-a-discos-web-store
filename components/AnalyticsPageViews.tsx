"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadingProductTitle, privacyTitle, storeTitle } from "@/lib/page-titles";

const measurementId = "G-NWYWRTJ1DJ";
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  "ga-disable-G-NWYWRTJ1DJ"?: boolean;
};

export function AnalyticsPageViews({ accepted }: { accepted: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [tagReady, setTagReady] = useState(false);
  const visit = useRef<{ url: string; sent: boolean; referrer: string } | null>(null);
  const initialized = useRef(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const relativePath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length) : pathname;
  const path = relativePath.replace(/\/$/, "") || "/";
  const admin = path === "/admin" || path.startsWith("/admin/");

  useEffect(() => {
    const analytics = window as AnalyticsWindow;
    analytics["ga-disable-G-NWYWRTJ1DJ"] = !accepted || admin;
    const url = new URL(window.location.href);
    url.hash = "";
    const location = url.href;
    if (visit.current?.url !== location) {
      visit.current = { url: location, sent: false, referrer: visit.current?.url || document.referrer };
    }
    if (admin) return;

    if (accepted && !initialized.current) {
      analytics.dataLayer = analytics.dataLayer || [];
      analytics.gtag = function () { analytics.dataLayer!.push(arguments); };
      analytics.gtag("js", new Date());
      // Release prerequisite: also disable Enhanced Measurement history pageviews.
      analytics.gtag("config", measurementId, { send_page_view: false });
      initialized.current = true;
    }

    const productRoute = path === "/producto" || path.startsWith("/producto/");
    const slug = path === "/producto" ? url.searchParams.get("slug")?.trim() || "" : decodeURIComponent(path.slice("/producto/".length));
    const update = () => {
      // A late response or observer from the previous navigation cannot send a view.
      if (window.location.pathname + window.location.search !== url.pathname + url.search) return;
      let title: string;
      if (productRoute) {
        const marker = document.querySelector<HTMLElement>("[data-product-slug]");
        if (!marker || marker.dataset.productSlug !== slug) {
          if (document.title !== loadingProductTitle) document.title = loadingProductTitle;
          return;
        }
        title = marker.dataset.pageTitle || loadingProductTitle;
        if (document.title !== title) document.title = title;
        if (marker.dataset.pageReady !== "true") return;
      } else {
        // Only known public screens are measured; unknown/404 routes stay unclassified.
        if (path !== "/" && path !== "/privacidad") return;
        title = path === "/privacidad" ? privacyTitle : storeTitle;
        if (document.title !== title) document.title = title;
      }
      const current = visit.current;
      if (!accepted || !tagReady || !current || current.url !== location || current.sent) return;
      current.sent = true;
      analytics.gtag?.("event", "page_view", {
        page_title: title, page_location: location, page_referrer: current.referrer
      });
    };
    // The marker is committed with the visible product, not with a separate fetch.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["data-product-slug", "data-page-title", "data-page-ready"] });
    update();
    return () => observer.disconnect();
  }, [accepted, admin, path, search, tagReady]);

  return accepted && !admin
    ? <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive" onReady={() => setTagReady(true)} />
    : null;
}
