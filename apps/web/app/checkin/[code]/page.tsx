import { SiteHeader } from "@/components/site-header";
import { SelfCheckInForm } from "@/components/self-check-in-form";

export const metadata = { title: "Check in" };

export default async function CheckInWithCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <>
      <SiteHeader />
      <main className="page">
        <SelfCheckInForm initialCode={decodeURIComponent(code)} />
      </main>
    </>
  );
}
