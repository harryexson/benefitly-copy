import { sql } from "@/lib/database";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Records an in-app notification and best-effort delivers it as a push notification via Expo's
 * push service, which fronts APNs/FCM so no Apple/Google credentials are needed for Expo Go or
 * EAS-built apps registered with the same Expo project. A push failure never blocks the caller
 * (donation settlement, moderation decisions, etc.) -- it's swallowed and logged.
 */
export async function notify(profileId: string, organizationId: string | null, type: string, payload: Record<string, unknown>) {
  await sql`select public.record_notification(${profileId}, ${organizationId}, ${type}, ${JSON.stringify(payload)}::jsonb)`;

  // A system-initiated read across another profile's push tokens, not scoped to that profile's
  // own request -- push_tokens_self_read would see nothing here, so this goes through a
  // narrow security-definer function instead (see database/migrations/0009).
  const tokens = await sql`select token from public.get_push_tokens_for_notification(${profileId}) as token`;
  if (tokens.length === 0) return;

  const title = titleFor(type);
  const body = bodyFor(type, payload);
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((t) => ({ to: t.token as string, title, body, data: { type, ...payload } }))),
    });
  } catch (error) {
    console.error("Push delivery failed", error);
  }
}

function titleFor(type: string): string {
  switch (type) {
    case "donation_received":
      return "New donation!";
    case "campaign_approved":
      return "Your fundraiser is live";
    case "campaign_rejected":
      return "Fundraiser needs changes";
    case "payout_status":
      return "Payout update";
    case "report_resolved":
      return "Report resolved";
    case "goal_reached":
      return "Goal reached!";
    default:
      return "Benefitly";
  }
}

function bodyFor(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "donation_received":
      return `Someone just gave $${(Number(payload.amount ?? 0) / 100).toFixed(2)} to ${payload.campaignTitle ?? "your fundraiser"}.`;
    case "campaign_approved":
      return `${payload.campaignTitle ?? "Your fundraiser"} was approved and is now public.`;
    case "campaign_rejected":
      return `${payload.campaignTitle ?? "Your fundraiser"} needs changes before it can go live.`;
    case "payout_status":
      return `Your payout for ${payload.campaignTitle ?? "your fundraiser"} is now ${payload.status ?? "updated"}.`;
    default:
      return "You have a new update.";
  }
}
