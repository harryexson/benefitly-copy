// Structured logs and error reporting. Logs are single JSON lines so Vercel's log drain and any log
// platform can parse them. Errors are also POSTed to ERROR_REPORT_WEBHOOK_URL when it is set, so an
// error tracker can be connected without a code change.

type Level = "info" | "warn" | "error";

export function logEvent(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export type ErrorContext = { route?: string; method?: string; status?: number; [key: string]: unknown };

/** Redacts values that look like emails or secrets so logs never carry them verbatim. */
function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b(sk|rk|whsec|pk)_(live|test)_[A-Za-z0-9]+/g, "[key]")
    .replace(/bk_live_[a-f0-9]+/g, "[api-key]");
}

export async function reportError(error: unknown, context: ErrorContext = {}): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload = {
    name: err.name,
    message: redact(err.message),
    stack: err.stack ? redact(err.stack).split("\n").slice(0, 12).join("\n") : undefined,
    ...context,
  };
  logEvent("error", "unhandled_error", payload);

  const webhook = process.env.ERROR_REPORT_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ service: "benefitly-web", environment: process.env.VERCEL_ENV ?? "local", ...payload }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    logEvent("warn", "error_report_delivery_failed", { route: context.route });
  }
}
