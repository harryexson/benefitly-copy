import { SiteHeader } from "@/components/site-header";
import { SelfCheckInForm } from "@/components/self-check-in-form";

export const metadata = { title: "Check in" };

export default function CheckInPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <SelfCheckInForm />
      </main>
    </>
  );
}
