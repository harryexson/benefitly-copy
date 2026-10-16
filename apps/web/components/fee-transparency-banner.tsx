export function FeeTransparencyBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className="fee-banner" role="note">
      <strong>Benefitly charges no platform fee.</strong>{" "}
      {compact ? (
        <span>Your donation goes to the campaign. Stripe processing fees apply to card and bank payments; Benefitly takes no platform fee.</span>
      ) : (
        <span>
          Every donation goes to the campaign or cause. Stripe processing fees apply to card, Apple Pay, Google Pay, and ACH
          payments and are paid to Stripe. Benefitly charges no platform fee; if you&apos;d like to help keep Benefitly
          running, you can add an optional tip at checkout &mdash; it&apos;s never required.
        </span>
      )}
    </div>
  );
}
