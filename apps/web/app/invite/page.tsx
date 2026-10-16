import { redirect } from "next/navigation";
import { AcceptInvitation } from "./accept-invitation";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join an organization" };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main className="page">
        <h1>This invitation link is incomplete</h1>
        <p>Open the link from your invitation email.</p>
      </main>
    );
  }

  const session = await requireSession();
  if (!session) redirect(`/sign-in?redirect=${encodeURIComponent(`/invite?token=${encodeURIComponent(token)}`)}`);

  return (
    <main className="page">
      <p className="kicker">Organization invitation</p>
      <h1>Join this organization</h1>
      <p className="muted">You are signed in as {session.user.email}. The invitation only works for the email address it was sent to.</p>
      <AcceptInvitation token={token} />
    </main>
  );
}
