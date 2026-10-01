/**
 * SignalHouse SMS adapter, gated behind real credentials the same way every other third-party
 * provider in this codebase is (packages/payments/src/config.ts; lib/email.ts).
 *
 * UNVERIFIED: this environment's outbound network access could not reach
 * developer.signalhouse.io to confirm the exact endpoint path, auth header name, or request body
 * field names, so the shape below is a best-effort implementation of SignalHouse's documented
 * send-message REST API, not something exercised against a real account. Treat this the same as
 * the Adyen adapter was treated before real sandbox credentials existed: do not consider SMS
 * outreach production-ready until it has been run once against a real SignalHouse account and
 * this comment removed. If the request/response shape below turns out wrong, the fix is
 * localized to this one file.
 */
export function isSmsConfigured(): boolean {
  return Boolean(process.env.SIGNALHOUSE_API_KEY && process.env.SIGNALHOUSE_FROM_NUMBER);
}

export async function sendCampaignShareSms(input: { to: string; senderName: string; campaignTitle: string; campaignUrl: string }): Promise<void> {
  const apiKey = process.env.SIGNALHOUSE_API_KEY;
  const from = process.env.SIGNALHOUSE_FROM_NUMBER;
  if (!apiKey || !from) throw new Error("Text messaging is not configured on this server.");

  const body = `${input.senderName} invited you to support "${input.campaignTitle}" on Benefitly: ${input.campaignUrl}`;

  const response = await fetch("https://api.signalhouse.io/v1/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: input.to, body }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SignalHouse request failed (${response.status}): ${detail.slice(0, 200)}`);
  }
}
