"use client";

import { analyticsConsentKey } from "@/components/AnalyticsConsent";

export function PrivacyPreferences() {
  function changePreference() {
    try {
      window.localStorage.removeItem(analyticsConsentKey);
    } catch {
      // The preference can still be changed for the current visit.
    }
    window.location.reload();
  }

  return <button className="secondary-action privacy-preferences" type="button" onClick={changePreference}>Cambiar mi elección de Analytics</button>;
}
