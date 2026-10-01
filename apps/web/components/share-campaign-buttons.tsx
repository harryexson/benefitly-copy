"use client";

import { useState } from "react";

export function ShareCampaignButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // User canceled the native share sheet -- not an error.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (non-HTTPS, older browser) -- the link is still visible on the share kit page.
    }
  }

  const text = encodeURIComponent(`Help support "${title}": `);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="filter-row" style={{ flexWrap: "wrap" }}>
      {canNativeShare && (
        <button type="button" onClick={nativeShare}>
          Share…
        </button>
      )}
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <a href={`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
        X / Twitter
      </a>
      <a href={`https://wa.me/?text=${text}${encodedUrl}`} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${text}${encodedUrl}`}>Email</a>
      <a href={`sms:?&body=${text}${encodedUrl}`}>Text message</a>
      <button type="button" onClick={copyLink}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
