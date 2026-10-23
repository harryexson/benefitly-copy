/** RFC 4180 CSV. Every value is quoted, so commas, quotes and newlines in names survive. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = rows.map((row) => headers.map((header) => escape(row[header])).join(","));
  return [headers.map(escape).join(","), ...lines].join("\n");
}
