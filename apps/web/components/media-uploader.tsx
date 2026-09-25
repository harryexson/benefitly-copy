"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function MediaUploader({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`/api/campaigns/${campaignId}/media`, { method: "POST", body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Upload failed.");
      return;
    }
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <label className="button small" style={{ display: "inline-block", cursor: "pointer" }}>
        {status === "uploading" ? "Uploading…" : "Add photo or video"}
        <input ref={inputRef} type="file" accept="image/*,video/mp4,video/quicktime" onChange={onChange} disabled={status === "uploading"} style={{ display: "none" }} />
      </label>
      {status === "error" && <p className="muted">{message}</p>}
    </div>
  );
}
