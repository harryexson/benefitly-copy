"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button className="quiet-link" type="button" onClick={signOut} disabled={pending} style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
