/** Fills {{name}} and {{organization}} placeholders. Values are escaped by the caller for HTML. */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => (key in values ? values[key] : match));
}

export const DEFAULT_DUES_REMINDER = {
  subject: "Your membership dues are due",
  body: "Hello {{name}},\n\nThis is a reminder that your {{organization}} membership dues are due. You can pay them in the Benefitly app or on the organization's page.\n\nThank you.",
};
