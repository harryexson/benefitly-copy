import { createPaymentProviderRouterFromEnv } from "@benefitly/payments";

// One router per server process. Providers are only registered when their full credential set
// is present in the environment -- see docs/architecture/PAYMENT_PROVIDER_DECISION.md.
export const paymentProviderRouter = createPaymentProviderRouterFromEnv();
