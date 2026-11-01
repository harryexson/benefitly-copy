"use client";

import { useState } from "react";

type Outcome = { ok: boolean; message: string };

async function post(path: string, body: unknown, method: "POST" | "GET" = "POST"): Promise<{ ok: boolean; data?: unknown; message: string }> {
  try {
    const response = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
    const json = (await response.json().catch(() => null)) as { data?: unknown; error?: { message?: string } } | null;
    if (!response.ok) return { ok: false, message: json?.error?.message ?? "Request failed." };
    return { ok: true, data: json?.data, message: "" };
  } catch {
    return { ok: false, message: "Network error. Try again." };
  }
}

function useOutcome() {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  return { outcome, setOutcome, Message: () => (outcome ? <p role="status" className={outcome.ok ? "" : "muted"}>{outcome.ok ? "Saved." : outcome.message}</p> : null) };
}

export function DuesReminderButton({ orgId }: { orgId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  return (
    <div>
      <button type="button" className="button small" disabled={busy} onClick={async () => {
        setBusy(true);
        const res = await post(`/api/organizations/${orgId}/reminders/dues`, {});
        setResult(res.ok ? `Sent ${(res.data as { sent: number }).sent} reminder(s).` : res.message);
        setBusy(false);
      }}>{busy ? "Sending…" : "Send dues reminders"}</button>
      {result && <p role="status" className="muted">{result}</p>}
    </div>
  );
}

export function ReminderTemplateForm({ orgId, subject, body }: { orgId: string; subject: string; body: string }) {
  const [draftSubject, setSubject] = useState(subject);
  const [draftBody, setBody] = useState(body);
  const { setOutcome, Message } = useOutcome();
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const res = await post(`/api/organizations/${orgId}/email-templates`, { subject: draftSubject, body: draftBody });
      setOutcome({ ok: res.ok, message: res.message });
    }}>
      <label htmlFor="tpl-subject">Subject</label>
      <input id="tpl-subject" required maxLength={200} value={draftSubject} onChange={(e) => setSubject(e.target.value)} />
      <label htmlFor="tpl-body">Message (use {"{{name}}"} and {"{{organization}}"})</label>
      <textarea id="tpl-body" required rows={6} maxLength={5000} value={draftBody} onChange={(e) => setBody(e.target.value)} />
      <button className="button small" type="submit">Save template</button>
      <Message />
    </form>
  );
}

export function VolunteerOpportunityForm({ orgId }: { orgId: string }) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const { setOutcome, Message } = useOutcome();
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const res = await post(`/api/organizations/${orgId}/volunteer/opportunities`, {
        title,
        startsAt: new Date(startsAt).toISOString(),
        location: location || undefined,
        capacity: capacity ? Number(capacity) : null,
      });
      setOutcome({ ok: res.ok, message: res.message });
      if (res.ok) { setTitle(""); setStartsAt(""); setLocation(""); setCapacity(""); }
    }}>
      <label htmlFor="vol-title">Title</label>
      <input id="vol-title" required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor="vol-start">Starts</label>
      <input id="vol-start" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      <label htmlFor="vol-location">Location (optional)</label>
      <input id="vol-location" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />
      <label htmlFor="vol-capacity">Capacity (leave blank for unlimited)</label>
      <input id="vol-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      <button className="button small" type="submit">Create opportunity</button>
      <Message />
    </form>
  );
}

const PERMISSIONS = ["organization.manage", "members.manage", "finance.manage", "benefits.manage", "events.manage", "communications.manage", "payouts.approve"] as const;

export function RoleForm({ orgId }: { orgId: string }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { setOutcome, Message } = useOutcome();
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const res = await post(`/api/organizations/${orgId}/roles`, { name, permissions: selected });
      setOutcome({ ok: res.ok, message: res.message });
      if (res.ok) { setName(""); setSelected([]); }
    }}>
      <label htmlFor="role-name">Role name</label>
      <input id="role-name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      <fieldset style={{ border: "none", padding: 0 }}>
        <legend>Permissions</legend>
        {PERMISSIONS.map((perm) => (
          <label key={perm} style={{ display: "block" }}>
            <input type="checkbox" checked={selected.includes(perm)} onChange={(e) => setSelected(e.target.checked ? [...selected, perm] : selected.filter((p) => p !== perm))} />{" "}{perm}
          </label>
        ))}
      </fieldset>
      <button className="button small" type="submit" disabled={selected.length === 0}>Create role</button>
      <Message />
    </form>
  );
}

export function AssignRoleForm({ orgId, roles }: { orgId: string; roles: { id: string; name: string }[] }) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const { setOutcome, Message } = useOutcome();
  if (roles.length === 0) return null;
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const res = await post(`/api/organizations/${orgId}/roles/assign`, { userId, roleId });
      setOutcome({ ok: res.ok, message: res.message });
    }}>
      <label htmlFor="assign-user">Member's account ID</label>
      <input id="assign-user" required value={userId} onChange={(e) => setUserId(e.target.value)} />
      <label htmlFor="assign-role">Role</label>
      <select id="assign-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
        {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
      </select>
      <button className="button small" type="submit">Assign role</button>
      <Message />
    </form>
  );
}

export function ScheduleForm({ orgId }: { orgId: string }) {
  const [reportKind, setKind] = useState("members");
  const [recipientEmail, setEmail] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const { setOutcome, Message } = useOutcome();
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const res = await post(`/api/organizations/${orgId}/report-schedules`, { reportKind, recipientEmail, frequency });
      setOutcome({ ok: res.ok, message: res.message });
      if (res.ok) setEmail("");
    }}>
      <label htmlFor="sched-kind">Report</label>
      <select id="sched-kind" value={reportKind} onChange={(e) => setKind(e.target.value)}>
        <option value="members">Members</option>
        <option value="dues">Dues</option>
        <option value="benefit_claims">Benefit claims</option>
        <option value="payouts">Payouts</option>
      </select>
      <label htmlFor="sched-email">Send to</label>
      <input id="sched-email" type="email" required value={recipientEmail} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="sched-freq">How often</label>
      <select id="sched-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <button className="button small" type="submit">Schedule report</button>
      <Message />
    </form>
  );
}

export function ApiKeyForm({ orgId }: { orgId: string }) {
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const { setOutcome, Message } = useOutcome();
  return (
    <div>
      <form onSubmit={async (event) => {
        event.preventDefault();
        const res = await post(`/api/organizations/${orgId}/api-keys`, { name });
        setOutcome({ ok: res.ok, message: res.message });
        if (res.ok) { setCreatedKey((res.data as { key: string }).key); setName(""); }
      }}>
        <label htmlFor="key-name">Key name</label>
        <input id="key-name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="button small" type="submit">Create API key</button>
        <Message />
      </form>
      {createdKey && (
        <div role="alert">
          <p><strong>Copy this key now. It will not be shown again.</strong></p>
          <code style={{ wordBreak: "break-all" }}>{createdKey}</code>
        </div>
      )}
    </div>
  );
}

export function RevokeApiKeyButton({ orgId, keyId }: { orgId: string; keyId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="button small" disabled={busy} onClick={async () => {
      setBusy(true);
      await post(`/api/organizations/${orgId}/api-keys/${keyId}/revoke`, {});
      window.location.reload();
    }}>{busy ? "Revoking…" : "Revoke"}</button>
  );
}

export function BulkPayoutForm({ orgId }: { orgId: string }) {
  const [claimIds, setClaimIds] = useState("");
  const [sourceAccountId, setSource] = useState("");
  const { setOutcome, Message } = useOutcome();
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const ids = claimIds.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
      const res = await post(`/api/organizations/${orgId}/payouts/bulk`, { claimIds: ids, sourceAccountId });
      setOutcome({ ok: res.ok, message: res.ok ? "Pending payouts created. Approval and transfer happen separately." : res.message });
    }}>
      <label htmlFor="bulk-claims">Approved claim IDs (up to 100, separated by spaces or commas)</label>
      <textarea id="bulk-claims" required rows={3} value={claimIds} onChange={(e) => setClaimIds(e.target.value)} />
      <label htmlFor="bulk-source">Organization payment account ID</label>
      <input id="bulk-source" required value={sourceAccountId} onChange={(e) => setSource(e.target.value)} />
      <button className="button small" type="submit">Create pending payouts</button>
      <Message />
    </form>
  );
}
