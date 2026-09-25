"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not create organization.");
      return;
    }
    router.push(`/org/${body.data.slug}`);
  }

  return (
    <form onSubmit={submit} className="donate-panel" style={{ maxWidth: 480 }}>
      <label htmlFor="orgName">Organization name</label>
      <input id="orgName" required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} />
      <button className="button" type="submit" disabled={status === "submitting"} style={{ marginTop: 12 }}>
        {status === "submitting" ? "Creating…" : "Create organization"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
