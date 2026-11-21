"use client";

import { useState } from "react";

// Shows the iframe snippet an organizer can paste into their own website, with a copy button.
export function EmbedCodeBox({ embedUrl, title }: { embedUrl: string; title: string }) {
  const snippet = `<iframe src="${embedUrl}" title="${title.replace(/"/g, "&quot;")}" width="100%" height="260" style="border:0;max-width:420px" loading="lazy"></iframe>`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="donate-panel" style={{ marginTop: 24, maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>Add this fundraiser to your website</h2>
      <p className="muted">Paste this code into your site to show the progress bar and a donate button.</p>
      <textarea readOnly rows={3} value={snippet} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
      <button className="button small" type="button" onClick={copy}>
        {copied ? "Copied" : "Copy code"}
      </button>
    </div>
  );
}
