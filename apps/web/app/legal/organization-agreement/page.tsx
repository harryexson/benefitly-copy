import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Organization Agreement" };

const toc = [
  ["intro", "1. Introduction"],
  ["definitions", "2. Definitions"],
  ["scope", "3. Scope of this agreement"],
  ["fees", "4. Fees & financial terms"],
  ["license", "5. License, ownership & restrictions"],
  ["responsibilities", "6. Organization responsibilities"],
  ["sanctions", "7. Sanctions & content requirements"],
  ["data", "8. Data, usage information & security"],
  ["indemnification", "9. Indemnification"],
  ["disclaimers", "10. Disclaimers & limitation of liability"],
  ["term", "11. Term, termination & suspension"],
  ["confidentiality", "12. Confidentiality"],
  ["general", "13. General provisions"],
] as const;

export default function OrganizationAgreementPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Compliance</p>
        <h1>Organization Agreement</h1>
        <p className="lede">
          This agreement governs use of Benefitly by an Organization &mdash; the association, congregation, or
          professional body that signs up to run membership, benefits, and fundraising on the platform &mdash; and
          supplements our general{" "}
          <Link className="text-link" href="/legal/terms">
            Terms of Service
          </Link>
          . Where this agreement and the general Terms of Service conflict on a matter specific to Organizations,
          this agreement controls. This is a working draft, adapted from standard industry-practice B2B SaaS
          agreements for membership and fundraising platforms, pending final review by qualified legal counsel.
        </p>

        <section className="section legal-section">
          <h2>Contents</h2>
          <ul>
            {toc.map(([id, label]) => (
              <li key={id}>
                <a className="text-link" href={`#${id}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="section legal-section" id="intro">
          <h2>1. Introduction</h2>
          <p>
            If you are accepting this agreement on behalf of an Organization, you represent that you have the
            authority to bind that Organization to these terms. This agreement applies whether your Organization is
            based in the United States or elsewhere; where a term below refers to a U.S.-specific concept (like EIN
            verification), an equivalent local requirement applies to Organizations outside the U.S.
          </p>
        </section>

        <section className="section legal-section" id="definitions">
          <h2>2. Definitions</h2>
          <ul>
            <li><strong>Plan.</strong> The subscription tier your Organization selects, as described on our Pricing page or a separate order confirmation.</li>
            <li><strong>Confidential Information.</strong> Non-public information either party shares with the other that is marked confidential or would reasonably be understood as such, including Benefitly&apos;s pricing, product roadmap, and non-public technology.</li>
            <li><strong>Usage Data.</strong> Aggregated, de-identified information about how the Services are used across Organizations, which Benefitly may use to operate, secure, and improve the Services.</li>
            <li><strong>Feedback.</strong> Any idea, suggestion, or proposal your Organization gives us about current or future Services.</li>
            <li>Other capitalized terms have the meaning given in our{" "} <Link className="text-link" href="/legal/terms">Terms of Service</Link>.</li>
          </ul>
        </section>

        <section className="section legal-section" id="scope">
          <h2>3. Scope of this agreement</h2>
          <p>
            Benefitly licenses your Organization the right to use the Services &mdash; membership management, dues
            and contribution tracking, benefit programs and claims, events, announcements, and community
            fundraising &mdash; for your Organization&apos;s own administrative and fundraising purposes. Benefitly
            is not a bank, payment processor, broker, or financial advisor; it does not solicit donations on your
            behalf, and the existence of the Services is not itself a solicitation. See our{" "}
            <Link className="text-link" href="/legal/compliance">
              AML &amp; Compliance
            </Link>{" "}
            policy for the full statement of what Benefitly does and does not do with respect to funds.
          </p>
        </section>

        <section className="section legal-section" id="fees">
          <h2>4. Fees &amp; financial terms</h2>
          <p>
            Fees for your selected Plan are described on our{" "}
            <Link className="text-link" href="/product/pricing">
              Pricing
            </Link>{" "}
            page or a separate order confirmation. Subscription fees are billed in advance for the applicable period
            and are separate from Payment Provider processing fees, which are deducted by the Payment Provider
            directly from transactions. We may change subscription pricing with at least 30 days&apos; notice before
            a renewal; continued use after that date means you accept the new pricing. Past-due amounts may accrue
            interest at the rate permitted by applicable law, and we may suspend Services for a Plan with an
            outstanding balance after reasonable notice.
          </p>
        </section>

        <section className="section legal-section" id="license">
          <h2>5. License, ownership &amp; restrictions</h2>
          <p>
            Benefitly grants your Organization a limited, non-exclusive, non-transferable license to use the
            Services for your own administrative and fundraising purposes during your subscription term. Your
            Organization will not: resell, sublicense, or provide the Services to third parties on a service-bureau
            basis; reverse-engineer, decompile, or attempt to extract source code from the Services; scrape or
            extract data from the Services outside normal use; disclose benchmark or performance testing results
            about the Services without our written consent; or remove proprietary notices from the Services.
            Benefitly and its licensors retain all rights, title, and interest in the Services, including all
            underlying software and Usage Data; your Organization retains ownership of its own membership, claim,
            and campaign content.
          </p>
        </section>

        <section className="section legal-section" id="responsibilities">
          <h2>6. Organization responsibilities</h2>
          <p>Your Organization agrees not to use the Services to:</p>
          <ul>
            <li>Transmit content that infringes a third party&apos;s rights, contains malicious code, or is inaccurate or misleading</li>
            <li>Interfere with the security or performance of the Services</li>
            <li>Violate applicable law, including laws governing charitable solicitation, consumer protection, or electronic communications (such as CAN-SPAM or equivalent laws in your jurisdiction)</li>
            <li>Use automated tools to scrape or monitor the Services without our written consent</li>
            <li>Target or knowingly collect information from children under 18</li>
            <li>Upload contact lists obtained by scraping or from an unauthorized third-party source</li>
            <li>Accept dues, claims, or donations your Organization knows or suspects are erroneous or fraudulent</li>
            <li>Offer anything of material value to donors in exchange for a donation, except as permitted under our Acceptable Use Policy</li>
          </ul>
          <p>
            Content and fundraising activity on the Services is also subject to our{" "}
            <Link className="text-link" href="/legal/acceptable-use">
              Acceptable Use Policy
            </Link>
            , which your Organization agrees to fully cooperate with us in enforcing, including by responding to
            requests for evidence of compliance.
          </p>
          <p className="muted">
            If your Organization is a fiscal sponsor or otherwise using the Services on behalf of a third-party
            beneficiary, your Organization represents that it has all rights necessary to do so, remains responsible
            for that beneficiary&apos;s compliance with this agreement, and agrees that Benefitly may rely on your
            Organization&apos;s direction regarding disbursement of funds to that beneficiary.
          </p>
        </section>

        <section className="section legal-section" id="sanctions">
          <h2>7. Sanctions &amp; content requirements</h2>
          <p>
            Your Organization represents that neither it nor its officers, directors, or controlling persons are
            located in, organized under the laws of, or owned or controlled by a sanctioned country, or appear on the
            U.S. Treasury&apos;s OFAC Specially Designated Nationals list or equivalent sanctions lists. Your
            Organization will not use the Services in connection with any sanctioned country, person, or entity. A
            confirmed sanctions violation results in immediate suspension of your Organization&apos;s access, and
            Benefitly may freeze, withhold, or reject related funds to the extent required by law.
          </p>
          <p>
            Your Organization represents that it is either a legally registered non-profit, membership, or
            professional organization in good standing in its jurisdiction, or is properly authorized to act as a
            fiscal sponsor for the beneficiaries it represents on the Services, and that it will promptly notify
            Benefitly if that status changes.
          </p>
        </section>

        <section className="section legal-section" id="data">
          <h2>8. Data, usage information &amp; security</h2>
          <p>
            Member, donor, and claim information your Organization collects through the Services is processed
            consistent with our{" "}
            <Link className="text-link" href="/legal/privacy">
              Privacy Policy
            </Link>
            . Your Organization is responsible for having the necessary consents to collect and share information
            about its members, donors, and beneficiaries with Benefitly, and for using that information only for
            purposes related to your Organization&apos;s administration and fundraising. Benefitly may collect and
            analyze Usage Data across Organizations to operate, secure, and improve the Services; Benefitly will not
            publicly identify your specific Organization in connection with aggregated Usage Data without your
            written consent. Your Organization is responsible for the security of its own account credentials and
            for enabling any multi-factor authentication we require for administrative access.
          </p>
        </section>

        <section className="section legal-section" id="indemnification">
          <h2>9. Indemnification</h2>
          <p>
            Benefitly will defend and indemnify your Organization against a third-party claim that the Services, as
            provided and used in compliance with this agreement, directly infringe a valid U.S. patent, copyright, or
            trademark. Your Organization will defend and indemnify Benefitly against third-party claims arising from:
            injury or property damage at an event your Organization operates in connection with the Services; content
            your Organization provides that infringes a third party&apos;s rights; your Organization&apos;s breach of
            Section 5 (License, ownership &amp; restrictions) or Section 6 (Organization responsibilities); or
            misuse of member or donor data your Organization controls.
          </p>
        </section>

        <section className="section legal-section" id="disclaimers">
          <h2>10. Disclaimers &amp; limitation of liability</h2>
          <p className="muted" style={{ textTransform: "uppercase", fontSize: 13 }}>
            To the maximum extent permitted by law, the services are provided &quot;as is&quot; without warranty of
            any kind, and benefitly does not guarantee that any campaign will receive donations, that any claim
            outcome will meet your organization&apos;s expectations, or that the services will be uninterrupted or
            error-free.
          </p>
          <p className="muted" style={{ textTransform: "uppercase", fontSize: 13 }}>
            Except for each party&apos;s indemnification obligations and your organization&apos;s payment
            obligations, each party&apos;s total liability under this agreement is limited to the subscription fees
            your organization paid in the twelve months before the claim arose, or five hundred u.s. dollars,
            whichever is greater. neither party is liable for indirect, incidental, or consequential damages.
          </p>
        </section>

        <section className="section legal-section" id="term">
          <h2>11. Term, termination &amp; suspension</h2>
          <p>
            This agreement continues for as long as your Organization uses the Services, or for the term stated in
            your Plan, automatically renewing unless either party gives notice of non-renewal at least 30 days before
            the renewal date. Either party may terminate for the other&apos;s uncured material breach after 30
            days&apos; written notice (10 days for a payment breach). Benefitly may suspend the Services immediately,
            including withholding disbursements, if we reasonably believe your Organization&apos;s use violates this
            agreement, is fraudulent, or poses a risk to Benefitly or its Users. Termination does not excuse fees
            already owed.
          </p>
        </section>

        <section className="section legal-section" id="confidentiality">
          <h2>12. Confidentiality</h2>
          <p>
            Each party will protect the other&apos;s Confidential Information with the same care it uses for its own
            similar information, use it only to perform this agreement, and not disclose it to third parties except
            as needed to provide the Services or as required by law. This obligation doesn&apos;t apply to
            information that&apos;s public, independently developed, or rightfully received from a third party.
          </p>
        </section>

        <section className="section legal-section" id="general" style={{ paddingBottom: 56 }}>
          <h2>13. General provisions</h2>
          <ul>
            <li><strong>Feedback.</strong> If your Organization gives us Feedback, we may use it without obligation or compensation to you.</li>
            <li><strong>Assignment.</strong> Benefitly may assign this agreement in connection with a merger or sale of assets; your Organization may not assign it without our written consent.</li>
            <li><strong>Relationship.</strong> This agreement doesn&apos;t create a partnership, joint venture, or employment relationship between the parties.</li>
            <li><strong>Order of precedence.</strong> If this agreement conflicts with our general Terms of Service on a matter specific to Organizations, this agreement controls.</li>
            <li><strong>Governing law &amp; disputes.</strong> Governed by the same governing law, and subject to the same dispute-resolution and arbitration process, described in our{" "} <Link className="text-link" href="/legal/terms#disputes">Terms of Service</Link>.</li>
            <li><strong>Survival.</strong> Sections on fees already owed, indemnification, disclaimers &amp; limitation of liability, and confidentiality survive termination.</li>
          </ul>
          <p className="muted">
            Questions about this agreement can be sent through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
