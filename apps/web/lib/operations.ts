import { withUserContext } from "@/lib/database";

export type OperationsData = {
  reminderTemplate: { subject: string; body: string } | null;
  opportunities: { id: string; title: string; starts_at: string; location: string | null; capacity: number | null; confirmed_count: number }[];
  roles: { id: string; name: string; permissions: string[] }[];
  schedules: { id: string; report_kind: string; recipient_email: string; frequency: string; active: boolean; last_sent_at: string | null }[];
  apiKeys: { id: string; name: string; key_prefix: string; created_at: string; revoked_at: string | null; last_used_at: string | null }[];
  unavailable: string[];
};

/** Each section loads independently, so one plan-gated or permission-gated section never hides the others. */
export async function loadOperations(userId: string, organizationId: string): Promise<OperationsData> {
  const unavailable: string[] = [];
  const attempt = async <T>(label: string, fallback: T, query: () => Promise<T>): Promise<T> => {
    try {
      return await query();
    } catch {
      unavailable.push(label);
      return fallback;
    }
  };

  const reminderTemplate = await attempt("reminder templates", null, async () => {
    const [rows] = await withUserContext(userId, (tx) => [tx`select subject, body from public.organization_email_template(${organizationId}, 'dues_reminder')`]);
    return (rows[0] as unknown as { subject: string; body: string }) ?? null;
  });
  const opportunities = await attempt("volunteer management", [], async () => {
    const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.volunteer_opportunity_counts(${organizationId})`]);
    return rows as unknown as OperationsData["opportunities"];
  });
  const roles = await attempt("advanced roles", [], async () => {
    const [rows] = await withUserContext(userId, (tx) => [tx`select id, name, permissions from public.organization_roles where organization_id = ${organizationId} order by name`]);
    return rows as unknown as OperationsData["roles"];
  });
  const schedules = await attempt("scheduled reports", [], async () => {
    const [rows] = await withUserContext(userId, (tx) => [
      tx`select id, report_kind, recipient_email, frequency, active, last_sent_at from public.report_schedules where organization_id = ${organizationId} order by created_at`,
    ]);
    return rows as unknown as OperationsData["schedules"];
  });
  const apiKeys = await attempt("API keys", [], async () => {
    const [rows] = await withUserContext(userId, (tx) => [
      tx`select id, name, key_prefix, created_at, revoked_at, last_used_at from public.api_keys where organization_id = ${organizationId} order by created_at desc`,
    ]);
    return rows as unknown as OperationsData["apiKeys"];
  });

  return { reminderTemplate, opportunities, roles, schedules, apiKeys, unavailable };
}
