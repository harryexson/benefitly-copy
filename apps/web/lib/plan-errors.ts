// Plan refusals raised by the database (migration 0019) and the response each one maps to.
const PLAN_REFUSALS = [
  { match: "not included in your plan", code: "FEATURE_NOT_IN_PLAN" },
  { match: "member limit reached", code: "PLAN_LIMIT_REACHED" },
] as const;

export function planRefusalCode(message: string): string | null {
  return PLAN_REFUSALS.find((refusal) => message.includes(refusal.match))?.code ?? null;
}
