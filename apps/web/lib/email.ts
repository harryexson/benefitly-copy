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

export async function sendTicketConfirmationEmail(input: {
  to: string;
  attendeeName: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string | null;
  baseUrl: string;
  codes: string[];
}) {
  const client = await getClient();
  if (!client) throw new Error("Email is not configured on this server.");
  const from = process.env.RESEND_FROM_EMAIL || "share@benefitly.app";
  const when = new Date(input.eventStartsAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

  const ticketsHtml = input.codes
    .map((code) => {
      const checkInUrl = `${input.baseUrl}/checkin/${code}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(checkInUrl)}`;
      return `
        <div style="margin:16px 0;padding:16px;border:1px solid #dce3ed;border-radius:10px;text-align:center">
          <img src="${qrUrl}" alt="Ticket QR code" width="180" height="180" />
          <p style="font-family:monospace;font-size:18px;letter-spacing:2px;margin:10px 0 0">${code}</p>
        </div>
      `;
    })
    .join("");

  await client.emails.send({
    from: `Benefitly <${from}>`,
    to: input.to,
    subject: `Your ${input.codes.length > 1 ? "tickets" : "ticket"} for ${input.eventTitle}`,
    html: `
      <p>Hi ${escapeHtml(input.attendeeName)},</p>
      <p>Thanks for your purchase! Here ${input.codes.length > 1 ? "are your tickets" : "is your ticket"} for:</p>
      <h2>${escapeHtml(input.eventTitle)}</h2>
      <p>${when}${input.eventLocation ? ` &mdash; ${escapeHtml(input.eventLocation)}` : ""}</p>
      <p>Show the QR code at check-in, or enter your code at ${input.baseUrl}/checkin</p>
      ${ticketsHtml}
    `,
    text: `Your ticket(s) for ${input.eventTitle} on ${when}${input.eventLocation ? ` at ${input.eventLocation}` : ""}. Codes: ${input.codes.join(", ")}. Check in at ${input.baseUrl}/checkin`,
  });
}

export async function sendCheckInConfirmationEmail(input: { to: string; attendeeName: string; eventTitle: string }) {
  const client = await getClient();
  if (!client) return; // Check-in confirmation is a nice-to-have, never block the check-in itself.
  const from = process.env.RESEND_FROM_EMAIL || "share@benefitly.app";
  await client.emails.send({
    from: `Benefitly <${from}>`,
    to: input.to,
    subject: `You're checked in to ${input.eventTitle}`,
    html: `<p>Hi ${escapeHtml(input.attendeeName)}, you're checked in to <strong>${escapeHtml(input.eventTitle)}</strong>. Enjoy!</p>`,
    text: `Hi ${input.attendeeName}, you're checked in to ${input.eventTitle}. Enjoy!`,
  });
}

export async function sendOrganizationInvitationEmail(input: { to: string; organizationName: string; inviterName: string; acceptUrl: string }) {
  const client = await getClient();
  if (!client) throw new Error("Email is not configured on this server.");
  const from = process.env.RESEND_FROM_EMAIL || "share@benefitly.app";
  await client.emails.send({
    from: `Benefitly <${from}>`,
    to: input.to,
    subject: `${input.inviterName} invited you to join ${input.organizationName}`,
    html: `
      <p>${escapeHtml(input.inviterName)} invited you to join <strong>${escapeHtml(input.organizationName)}</strong> on Benefitly.</p>
      <p><a href="${escapeHtml(input.acceptUrl)}">Accept the invitation</a></p>
      <p>Sign in or create an account with this email address to accept. The link expires in 14 days.</p>
    `,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export async function sendDuesReminderEmail(input: { to: string; subject: string; text: string }) {
  const client = await getClient();
  if (!client) throw new Error("Email is not configured on this server.");
  const from = process.env.RESEND_FROM_EMAIL || "share@benefitly.app";
  const html = input.text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  await client.emails.send({ from: `Benefitly <${from}>`, to: input.to, subject: input.subject, html, text: input.text });
}

export async function sendReportEmail(input: { to: string; subject: string; filename: string; csv: string }) {
  const client = await getClient();
  if (!client) throw new Error("Email is not configured on this server.");
  const from = process.env.RESEND_FROM_EMAIL || "share@benefitly.app";
  await client.emails.send({
    from: `Benefitly <${from}>`,
    to: input.to,
    subject: input.subject,
    text: "Your scheduled report is attached.",
    attachments: [{ filename: input.filename, content: Buffer.from(input.csv, "utf8").toString("base64") }],
  });
}
