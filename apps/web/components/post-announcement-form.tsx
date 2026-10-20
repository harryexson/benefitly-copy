"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PostAnnouncementForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/organizations/${orgId}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), body: form.get("body") }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not post announcement.");
      return;
    }
    setStatus("idle");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 480 }}>
      <input name="title" placeholder="Title" required />
      <textarea name="body" placeholder="Message" rows={4} required />
      <button className="button small" type="submit" disabled={status === "submitting"} style={{ justifySelf: "start" }}>
        {status === "submitting" ? "Posting…" : "Post announcement"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
