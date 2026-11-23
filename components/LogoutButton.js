"use client";

import { useState } from "react";

export default function LogoutButton({ endpoint, className = "", style, children }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" } });
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <button type="button" className={className} style={style} onClick={logout} disabled={busy}>
      {children}
    </button>
  );
}
