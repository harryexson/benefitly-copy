import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv.ts";
import { renderTemplate } from "./reminders.ts";
import { reportError } from "./observability.ts";

test("CSV quotes every value and escapes embedded quotes, commas and newlines", () => {
  const csv = toCsv([{ name: 'Smith, "Jo"', note: "line\nbreak", amount: 5000 }]);
  assert.equal(csv, '"name","note","amount"\n"Smith, ""Jo""","line\nbreak","5000"');
});

test("CSV keeps columns from every row and leaves missing values empty", () => {
  const csv = toCsv([{ a: 1 }, { b: 2 }]);
  assert.equal(csv, '"a","b"\n"1",\n,"2"');
});

test("CSV of no rows is empty", () => {
  assert.equal(toCsv([]), "");
});

test("template fills known placeholders and leaves unknown ones visible", () => {
  assert.equal(renderTemplate("Hi {{name}} from {{organization}}, {{unknown}}", { name: "Dana", organization: "Harbor" }), "Hi Dana from Harbor, {{unknown}}");
});

test("error reports redact emails and API keys before logging", async () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line: string) => lines.push(line);
  try {
    await reportError(new Error("failed for dana@example.com with sk_live_abc123 and bk_live_ff00"), { route: "/api/x" });
  } finally {
    console.error = original;
  }
  const logged = JSON.parse(lines[0]);
  assert.equal(logged.event, "unhandled_error");
  assert.equal(logged.message, "failed for [email] with [key] and [api-key]");
  assert.equal(logged.route, "/api/x");
});
