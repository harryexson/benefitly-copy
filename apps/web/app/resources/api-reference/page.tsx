import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "API Reference" };

const groups = [
  {
    title: "Organizations",
    routes: [
      { method: "GET/POST", path: "/api/organizations" },
      { method: "GET/POST", path: "/api/organizations/{id}/members" },
      { method: "POST", path: "/api/organizations/{id}/members/{memberId}/contributions" },
      { method: "GET/POST", path: "/api/organizations/{id}/benefit-programs" },
      { method: "GET/POST", path: "/api/organizations/{id}/benefit-claims" },
      { method: "POST", path: "/api/organizations/{id}/benefit-claims/{claimId}/decide" },
      { method: "GET/POST", path: "/api/organizations/{id}/events" },
      { method: "POST", path: "/api/organizations/{id}/events/{eventId}/register" },
      { method: "GET/POST", path: "/api/organizations/{id}/announcements" },
    ],
  },
  {
    title: "Campaigns",
    routes: [
      { method: "GET/POST", path: "/api/campaigns" },
      { method: "GET", path: "/api/campaigns/by-slug/{slug}" },
      { method: "GET/POST", path: "/api/campaigns/{id}/media" },
      { method: "DELETE", path: "/api/campaigns/{id}/media/{mediaId}" },
      { method: "POST", path: "/api/campaigns/{id}/updates" },
      { method: "POST", path: "/api/campaigns/{id}/report" },
    ],
  },
  {
    title: "Donations & payouts",
    routes: [
      { method: "POST", path: "/api/donations" },
      { method: "POST", path: "/api/donations/{id}/refund" },
      { method: "GET/POST", path: "/api/payouts" },
      { method: "GET", path: "/api/admin/payouts" },
      { method: "POST", path: "/api/admin/payouts/{id}/approve" },
    ],
  },
  {
    title: "Account & notifications",
    routes: [
      { method: "GET", path: "/api/me/campaigns" },
      { method: "GET", path: "/api/me/notifications" },
      { method: "POST", path: "/api/me/notifications/{id}/read" },
      { method: "POST", path: "/api/me/push-tokens" },
      { method: "POST", path: "/api/organizer/register" },
    ],
  },
  {
    title: "Moderation & system",
    routes: [
      { method: "GET/POST", path: "/api/admin/moderation" },
      { method: "GET", path: "/api/health" },
    ],
  },
];

export default function ApiReferencePage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Resources</p>
        <h1>API Reference</h1>
        <p className="lede">
          Benefitly&apos;s API is JSON over HTTPS, authenticated with your signed-in session. Below is the current
          route surface, grouped by area &mdash; full request/response schemas and API-key based access for
          server-to-server integrations are on our roadmap.
        </p>

        {groups.map((group) => (
          <section className="section legal-section" key={group.title} style={{ padding: "24px 0" }}>
            <h2>{group.title}</h2>
            <ul>
              {group.routes.map((route) => (
                <li key={route.path}>
                  <code>{route.method}</code> <code>{route.path}</code>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="section legal-section" style={{ padding: "24px 0 56px" }}>
          <p className="muted">
            Webhook receivers for our payment partners (<code>/api/webhooks/stripe</code>, <code>/api/webhooks/adyen</code>)
            are signature-verified and not intended for direct external calls.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
