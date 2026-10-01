export function FeeTransparencyBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className="fee-banner" role="note">
      <strong>Benefitly charges no platform fee.</strong>{" "}
      {compact ? (
        <span>100% of your donation goes to the campaign. Card/bank processing fees go to our payment processor, not Benefitly.</span>
      ) : (
        <span>
          100% of every donation goes to the campaign or cause. The only separate charge is your payment method&apos;s own
          processing fee (card, Apple Pay, Google Pay, or ACH), which goes entirely to Stripe, our payment processor &mdash;
          Benefitly never keeps any part of it. If you&apos;d like to help keep Benefitly running, you can add an optional
          tip at checkout &mdash; it&apos;s never required.
        </span>
      )}
    </div>
  );
}
