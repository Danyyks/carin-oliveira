"use client";

import { useEffect } from "react";

// Registra o service worker do painel, com escopo restrito a /admin.
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/admin" }).catch(() => {});
    }
  }, []);
  return null;
}
