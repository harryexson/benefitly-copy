import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Association management" };

export default function OrganizationsPage() {
  return <><SiteHeader /><main className="page"><p className="kicker">For organizations</p><h1>Run your association with the same care you bring to your people.</h1><p className="lede">Manage members, dues, benefits, claims, events and community fundraising in a workspace built around accountable decisions.</p><Link className="button" href="/start">Create an organization</Link></main></>;
}
