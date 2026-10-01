/**
 * Thin Resend wrapper, gated behind a real API key exactly like
 * createPaymentProviderRouterFromEnv (packages/payments/src/config.ts) gates Stripe/Adyen: no
 * SDK call is made without credentials, so the app runs (outreach disabled) with none set.
 */
let cachedClient: import("resend").Resend | null | undefined;

async function getClient() {
  if (cachedClient !== undefined) return cachedClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    cachedClient = null;
    return cachedClient;
  }
  const { Resend } = await import("resend");
  cachedClient = new Resend(key);
  return cachedClient;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendCampaignShareEmail(input: { to: string; senderName: string; campaignTitle: string; campaignUrl: string; note?: string }) {
  const client = await getClient();
  if (!client) throw new Error("Email is not configured on this server.");
  const from = process.env.RESEND_FROM_EMAIL || "share@benefitly.app";
  const safeNote = input.note ? escapeHtml(input.note) : "";
  await client.emails.send({
    from: `${input.senderName} via Benefitly <${from}>`,
    to: input.to,
    subject: `${input.senderName} invited you to support "${input.campaignTitle}"`,
    html: `
      <p>${escapeHtml(input.senderName)} shared a fundraiser with you on Benefitly:</p>
      <h2>${escapeHtml(input.campaignTitle)}</h2>
      ${safeNote ? `<p>"${safeNote}"</p>` : ""}
      <p><a href="${input.campaignUrl}">${input.campaignUrl}</a></p>
    `,
    text: `${input.senderName} shared a fundraiser with you on Benefitly: ${input.campaignTitle}${input.note ? `\n\n"${input.note}"` : ""}\n\n${input.campaignUrl}`,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
