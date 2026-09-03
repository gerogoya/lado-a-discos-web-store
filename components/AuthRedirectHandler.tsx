"use client";

import { useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function AuthRedirectHandler() {
  useEffect(() => {
    if (!window.location.hash.includes("access_token=")) {
      return;
    }

    const pathWithoutBase =
      basePath && window.location.pathname.startsWith(basePath)
        ? window.location.pathname.slice(basePath.length)
        : window.location.pathname;

    if (pathWithoutBase.startsWith("/admin/accept-invite")) {
      return;
    }

    window.location.replace(`${basePath}/admin/accept-invite/${window.location.hash}`);
  }, []);

  return null;
}
