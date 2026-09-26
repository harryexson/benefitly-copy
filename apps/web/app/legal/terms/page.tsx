import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Terms of Service" };

const toc = [
  ["intro", "1. Introduction & acceptance"],
  ["definitions", "2. Definitions"],
  ["services", "3. The services we provide"],
  ["accounts", "4. Accounts & eligibility"],
  ["payments", "5. Payment providers"],
  ["organizations", "6. Organization & organizer responsibilities"],
  ["members", "7. Members, claims & donors"],
  ["disbursements", "8. Disbursements, holds & refunds"],
  ["prohibited", "9. Prohibited use"],
  ["conduct", "10. Prohibited conduct"],
  ["moderation", "11. Content moderation & reporting"],
  ["fees", "12. Fees"],
  ["ip", "13. Intellectual property & content license"],
  ["copyright", "14. Copyright complaints"],
  ["privacy", "15. Data privacy"],
  ["third-party", "16. Third-party services"],
  ["suspension", "17. Suspension & termination"],
  ["disclaimers", "18. Disclaimers & limitation of liability"],
  ["indemnification", "19. Indemnification"],
  ["disputes", "20. Dispute resolution & arbitration"],
  ["changes", "21. Changes to these terms"],
  ["misc", "22. Miscellaneous"],
] as const;

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Compliance</p>
        <h1>Terms of Service</h1>
        <p className="lede">
          These Terms of Service govern use of the Benefitly platform by organizations, organizers, members,
          beneficiaries, and donors. This is a working draft, adapted from standard, industry-practice fundraising and
          membership-platform terms and pending final review by qualified legal counsel &mdash; it is not a
          substitute for legal advice and will be superseded by our finalized agreement.
        </p>
        <p className="muted">Effective date: pending legal review.</p>

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
          <h2>1. Introduction &amp; acceptance</h2>
          <p>
            Welcome to Benefitly. These Terms of Service apply to the Benefitly platform, including our website,
            mobile apps, and any features we add over time. By creating an account, joining an organization, making a
            donation, submitting a benefit claim, or otherwise using our Services, you agree to these terms. If you
            don&apos;t agree, don&apos;t use the Services.
          </p>
          <p>
            You are contracting with Benefitly, Inc. (referred to as &quot;Benefitly,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;). If you are using Benefitly on behalf of an organization, you
            represent that you have authority to bind that organization to these terms.
          </p>
        </section>

        <section className="section legal-section" id="definitions">
          <h2>2. Definitions</h2>
          <ul>
            <li>
              <strong>Account.</strong> A unique account created to access and use Benefitly&apos;s Services.
            </li>
            <li>
              <strong>Beneficiary.</strong> The individual, group, or entity a benefit claim, campaign, or
              disbursement is intended to benefit.
            </li>
            <li>
              <strong>Campaign.</strong> A community fundraiser created by an organization on Benefitly.
            </li>
            <li>
              <strong>Disbursement.</strong> A payment made by a regulated third-party payment provider, at the
              direction of an organization, to a member, beneficiary, or organizer &mdash; whether a benefit payout,
              dues refund, or campaign payout.
            </li>
            <li>
              <strong>Donor.</strong> Anyone who contributes funds to a Campaign.
            </li>
            <li>
              <strong>Member.</strong> An individual enrolled in an Organization&apos;s membership roster on
              Benefitly.
            </li>
            <li>
              <strong>Organization.</strong> A mutual benefit association, member-based organization, faith-based
              membership community, or professional association using Benefitly.
            </li>
            <li>
              <strong>Organizer.</strong> An individual or Organization that creates or manages a Campaign.
            </li>
            <li>
              <strong>Payment Provider.</strong> A regulated third-party payment processor (currently Stripe and
              Tremendous) that processes donations, dues, and Disbursements on Benefitly&apos;s behalf.
            </li>
            <li>
              <strong>Services.</strong> All features and tools Benefitly provides, including membership management,
              benefit programs and claims, events, announcements, and Campaigns.
            </li>
            <li>
              <strong>User Content.</strong> Any content a User submits or shares through the Services, including
              Campaign stories, photos, videos, updates, and profile information.
            </li>
          </ul>
        </section>

        <section className="section legal-section" id="services">
          <h2>3. The services we provide</h2>
          <p>
            Benefitly provides administrative technology for benefit management: membership rosters, dues and
            contribution tracking, benefit programs and claims workflows, events, announcements, and community
            fundraising campaigns. As described in our{" "}
            <Link className="text-link" href="/legal/compliance">
              AML &amp; Compliance
            </Link>{" "}
            policy, Benefitly is a software service provider &mdash; not a payment processor, remittance provider,
            money transmitter, financial institution, or bank. We do not hold, pool, or exercise custody or control
            over funds. All financial transactions are processed by regulated third-party Payment Providers under
            their own terms.
          </p>
          <p>
            We do not endorse any Organization, Campaign, benefit program, or cause, and we cannot guarantee the
            outcome of any Campaign or the approval of any benefit claim. Information provided through the Services
            is for general administrative purposes and is not financial, legal, or tax advice.
          </p>
          <p className="muted">
            We may change, pause, or discontinue all or part of the Services at any time, and will try to give notice
            when practical, but are not always able to.
          </p>
        </section>

        <section className="section legal-section" id="accounts">
          <h2>4. Accounts &amp; eligibility</h2>
          <p>
            You must be at least 18 years old to create an account. When you register, you must provide accurate,
            current information about yourself or your Organization, and keep it up to date. You are responsible for
            keeping your login credentials confidential and for all activity under your account. If you believe your
            account has been accessed without authorization, notify us immediately through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
            . Do not share your password, one-time codes, or other credentials with anyone, and always access your
            account directly through the official Benefitly website or app.
          </p>
          <p>By registering, you represent that:</p>
          <ul>
            <li>You are legally registered as the entity type you claim, where applicable</li>
            <li>Information provided during business or identity verification is accurate and current</li>
            <li>You will not use the Services for restricted or prohibited activities</li>
            <li>All benefit distributions and campaign activity you initiate are legitimate and lawful</li>
            <li>You will comply with applicable regulations in your jurisdiction</li>
          </ul>
        </section>

        <section className="section legal-section" id="payments">
          <h2>5. Payment providers</h2>
          <p>
            Benefitly itself does not hold or process funds. Dues, donations, benefit disbursements, and campaign
            payouts are handled by our Payment Providers &mdash; currently Stripe, Inc. and Tremendous. To receive a
            Disbursement, you must complete the applicable Payment Provider&apos;s identity verification and provide
            payout account details directly to them. By making a donation, joining an Organization, submitting a
            claim, or accepting a Disbursement, you agree to the processing, use, and disclosure of your information
            by our Payment Providers under their own terms, in addition to these Terms of Service and our{" "}
            <Link className="text-link" href="/legal/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="section legal-section" id="organizations">
          <h2>6. Organization &amp; organizer responsibilities</h2>
          <p>As an Organization or Organizer, you agree to:</p>
          <ul>
            <li>Accurately describe how member dues, benefit funds, and Campaign proceeds will be used</li>
            <li>Use funds only for the purposes described to members and donors</li>
            <li>Keep your organization&apos;s registration, tax, and verification information current</li>
            <li>Comply with all laws applicable to your fundraising, membership, and benefit activity, including any registrations or licenses required in your jurisdiction</li>
            <li>Cooperate with any request for evidence we deem necessary to verify compliance with these terms &mdash; for example, documentation of fund use, member consent, or beneficiary identity</li>
            <li>Not solicit or accept off-platform payments in a way intended to circumvent Benefitly&apos;s review, monitoring, or fees</li>
          </ul>
          <p className="muted">
            We may refuse, condition, suspend, or reverse any account, Campaign, membership action, or Disbursement
            we believe, in our discretion, may violate these terms or our{" "}
            <Link className="text-link" href="/legal/acceptable-use">
              Acceptable Use Policy
            </Link>
            .
          </p>
        </section>

        <section className="section legal-section" id="members">
          <h2>7. Members, claims &amp; donors</h2>
          <p>
            As a Member, you are responsible for the accuracy of information you submit with a benefit claim.
            Benefit programs, eligibility, and payout limits are set by your Organization, not Benefitly &mdash; we
            provide the workflow, but approval decisions are your Organization&apos;s. As a Donor, you give at your
            own discretion; we do not verify every representation made in a Campaign, though we take reports of fraud
            or misuse seriously and will investigate them. Report a concern using the report option on any Campaign
            or through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
            . Neither Benefitly nor an Organization withholds funds for tax purposes; consult your own tax advisor
            about the treatment of dues, benefit payments, or donations.
          </p>
        </section>

        <section className="section legal-section" id="disbursements">
          <h2>8. Disbursements, holds &amp; refunds</h2>
          <p>
            Because Disbursements are made by our Payment Providers, timing depends on their processes, not
            Benefitly&apos;s. We do not guarantee a specific delivery timeframe, though we&apos;ll share the
            information our Payment Providers give us. We, or our Payment Providers, may place a hold on a
            Disbursement while we verify compliance with these terms, investigate a report, or comply with a legal
            requirement. Refunds of dues or donations are handled case by case, consistent with fraud prevention,
            these terms, and our Payment Providers&apos; own dispute and chargeback processes; we&apos;re not liable
            for losses caused by a refund, to the extent permitted by law.
          </p>
        </section>

        <section className="section legal-section" id="prohibited">
          <h2>9. Prohibited use</h2>
          <div className="prohibited-box" role="alert">
            <p className="prohibited-label">Benefitly strictly prohibits use for:</p>
            <ul>
              <li>Cryptocurrency transactions</li>
              <li>Gambling or betting services</li>
              <li>Adult content distribution</li>
              <li>Sweepstakes or prize schemes</li>
              <li>High-risk financial instruments</li>
              <li>Money transmission or remittance services</li>
              <li>Unlicensed financial activity</li>
            </ul>
            <p className="prohibited-warning">⚠️ Violation of this policy results in immediate suspension and termination.</p>
          </div>
          <p>
            See the full{" "}
            <Link className="text-link" href="/legal/acceptable-use">
              Acceptable Use Policy
            </Link>{" "}
            for the complete list of prohibited uses and prohibited industries, including fraud, misrepresentation,
            sanctions circumvention, and unlawful activity of any kind.
          </p>
        </section>

        <section className="section legal-section" id="conduct">
          <h2>10. Prohibited conduct</h2>
          <p>By using the Services, you agree not to:</p>
          <ul>
            <li>Upload content that infringes another party&apos;s intellectual property or privacy rights</li>
            <li>Transmit viruses, malware, or anything designed to disrupt the Services</li>
            <li>Send unsolicited advertising, spam, or unrelated solicitation through messaging or comment features</li>
            <li>Interfere with or disrupt the servers or networks used to provide the Services</li>
            <li>Harvest or scrape personal information about other Users</li>
            <li>Impersonate another person or Organization, or misrepresent your affiliation with one</li>
            <li>Attempt to gain unauthorized access to any account, system, or network connected to the Services</li>
            <li>Use the Services for or on behalf of any person or entity subject to U.S. or other applicable sanctions</li>
            <li>Use bots, scripts, or automation not expressly authorized by Benefitly</li>
          </ul>
        </section>

        <section className="section legal-section" id="moderation">
          <h2>11. Content moderation &amp; reporting</h2>
          <p>
            We review new Campaigns and Organizations before they go live, and investigate reports of suspected
            violations. If you believe a Campaign, claim, or other content violates these terms, use the report
            option where available or contact us. We may remove or restrict User Content, suspend accounts, freeze
            Disbursements, or take other action we deem appropriate &mdash; we&apos;re not obligated to pre-screen
            all content, but reserve the right to review, remove, or restrict it at any time.
          </p>
        </section>

        <section className="section legal-section" id="fees">
          <h2>12. Fees</h2>
          <p>
            Benefitly charges a platform subscription fee for administrative tools &mdash; see{" "}
            <Link className="text-link" href="/product/pricing">
              Pricing
            </Link>
            . We do not take a percentage of member dues, benefit funds, or Campaign donations. Payment Provider
            processing fees are separate, set by the Payment Provider, and disclosed at the time of transaction.
          </p>
        </section>

        <section className="section legal-section" id="ip">
          <h2>13. Intellectual property &amp; content license</h2>
          <p>
            Benefitly and its licensors own the Services and all related software, design, and branding. You retain
            ownership of User Content you submit (Campaign stories, photos, updates, profile information), and grant
            Benefitly a worldwide, royalty-free license to host, display, reproduce, and distribute that content as
            necessary to operate and promote the Services. You represent that you have the rights necessary to share
            any User Content you submit, including consent from any third party it depicts.
          </p>
          <p className="muted">
            You may not copy, scrape, reverse-engineer, or create derivative works from the Services or Services
            content, including for the purpose of training machine learning or AI models, without our prior written
            consent.
          </p>
        </section>

        <section className="section legal-section" id="copyright">
          <h2>14. Copyright complaints</h2>
          <p>
            If you believe content on Benefitly infringes your copyright, send a notice through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>{" "}
            including: a description of the copyrighted work, the location of the allegedly infringing content, your
            contact information, and a statement made in good faith and under penalty of perjury that you are the
            rights holder or authorized to act on their behalf. We will investigate and, if warranted, remove the
            content and notify the User who posted it, consistent with applicable copyright law.
          </p>
        </section>

        <section className="section legal-section" id="privacy">
          <h2>15. Data privacy</h2>
          <p>
            Our collection and use of your information is described in our{" "}
            <Link className="text-link" href="/legal/privacy">
              Privacy Policy
            </Link>
            , which is incorporated into these terms by reference. By using the Services, you consent to that
            collection and use.
          </p>
        </section>

        <section className="section legal-section" id="third-party">
          <h2>16. Third-party services</h2>
          <p>
            The Services may link to or rely on third-party resources, including our Payment Providers. We don&apos;t
            control and aren&apos;t responsible for third-party content, functionality, or accuracy, and your use of
            any third-party resource is subject to its own terms.
          </p>
        </section>

        <section className="section legal-section" id="suspension">
          <h2>17. Suspension &amp; termination</h2>
          <p>
            We may suspend or terminate your account, an Organization&apos;s access, or a Campaign at any time for
            violating these terms, our Acceptable Use Policy, or in response to suspected fraud or illegal activity,
            with or without notice where permitted by law. We may also close accounts that are dormant, that our
            Payment Providers can no longer support, or where required by a legal order.
          </p>
        </section>

        <section className="section legal-section" id="disclaimers">
          <h2>18. Disclaimers &amp; limitation of liability</h2>
          <p className="muted" style={{ textTransform: "uppercase", fontSize: 13 }}>
            To the maximum extent permitted by law, the services are provided &quot;as is&quot; and &quot;as
            available,&quot; without warranties of any kind, express or implied, including merchantability, fitness
            for a particular purpose, and non-infringement. Benefitly does not warrant that the services will be
            uninterrupted, error-free, or secure, and does not guarantee the outcome of any campaign, benefit claim,
            or the accuracy of any user content.
          </p>
          <p className="muted" style={{ textTransform: "uppercase", fontSize: 13 }}>
            To the maximum extent permitted by law, benefitly will not be liable for indirect, incidental, special,
            consequential, or punitive damages, or for loss of profits, goodwill, or data, arising from your use of
            the services. Benefitly&apos;s total liability for any claim will not exceed the amount you paid
            benefitly in the six months before the claim, or one hundred u.s. dollars, whichever is greater.
          </p>
          <p className="muted">Some jurisdictions don&apos;t allow these limitations, so some may not apply to you.</p>
        </section>

        <section className="section legal-section" id="indemnification">
          <h2>19. Indemnification</h2>
          <p>
            To the extent permitted by law, you agree to indemnify and hold Benefitly, its affiliates, and their
            officers, employees, and agents harmless from claims, damages, and expenses (including reasonable
            attorneys&apos; fees) arising from your use of the Services, your User Content, your violation of these
            terms, or your violation of another party&apos;s rights.
          </p>
        </section>

        <section className="section legal-section" id="disputes">
          <h2>20. Dispute resolution &amp; arbitration</h2>
          <p>
            Before filing a claim, you agree to first contact us through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>{" "}
            and attempt in good faith to resolve the dispute informally. If we can&apos;t resolve a dispute
            informally within 60 days, you and Benefitly agree that any claim will be resolved by binding, individual
            arbitration rather than in court, except that either party may bring an individual claim in small claims
            court, and either party may seek injunctive relief in court for actual or threatened infringement of
            intellectual property rights. You and Benefitly each waive the right to a jury trial and to participate
            in a class, collective, or representative action. You may opt out of this arbitration agreement by
            notifying us in writing within 30 days of first becoming subject to it.
          </p>
          <p className="muted">
            The specific arbitration provider, rules, and procedure will be specified in our finalized Terms of
            Service; this section is a placeholder describing our intended approach pending legal review.
          </p>
        </section>

        <section className="section legal-section" id="changes">
          <h2>21. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. We&apos;ll provide notice of material changes before they
            take effect where required by law. Continued use of the Services after a change takes effect means you
            accept the updated terms; if you don&apos;t agree, you should stop using the Services.
          </p>
        </section>

        <section className="section legal-section" id="misc" style={{ paddingBottom: 56 }}>
          <h2>22. Miscellaneous</h2>
          <ul>
            <li><strong>Entire agreement.</strong> These terms, along with our Privacy Policy and Acceptable Use Policy, are the entire agreement between you and Benefitly regarding the Services.</li>
            <li><strong>Governing law.</strong> These terms are governed by the laws of the jurisdiction specified in our finalized agreement, without regard to conflict-of-law principles.</li>
            <li><strong>Severability.</strong> If any provision is found unenforceable, the rest of these terms remain in effect.</li>
            <li><strong>No waiver.</strong> Our failure to enforce a provision isn&apos;t a waiver of our right to do so later.</li>
            <li><strong>Assignment.</strong> You may not assign these terms without our written consent; we may assign them in connection with a merger, acquisition, or sale of assets.</li>
            <li><strong>Notices.</strong> We may provide notices to you by email or by posting on the Services.</li>
          </ul>
          <p className="muted">
            Questions about these terms can be sent through{" "}
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
