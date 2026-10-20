"use client";

export function PrintButton() {
  return (
    <button className="button small" type="button" onClick={() => window.print()} style={{ marginTop: 14 }}>
      Print / save as PDF
    </button>
  );
}
