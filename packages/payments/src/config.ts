import { PaymentProviderRouter } from "./router.js";
import { StripeConnectAdapter } from "./adapters/stripe-connect.js";
import { AdyenPlatformsAdapter } from "./adapters/adyen-platforms.js";

/**
 * Builds a router from environment configuration. A provider is registered only when its full
 * credential set is present, so the application can run (in read-only/demo mode) with zero
 * providers configured, matching the "no live SDK calls until approved" launch gate documented
 * in docs/architecture/PAYMENT_PROVIDER_DECISION.md.
 */
export function createPaymentProviderRouterFromEnv(env: NodeJS.ProcessEnv = process.env): PaymentProviderRouter {
  const router = new PaymentProviderRouter();

  if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) {
    router.register(
      new StripeConnectAdapter({
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        accountType: env.STRIPE_CONNECT_ACCOUNT_TYPE === "standard" ? "standard" : "express",
      }),
    );
  }

  if (env.ADYEN_API_KEY && env.ADYEN_HMAC_KEY && env.ADYEN_MERCHANT_ACCOUNT && env.ADYEN_BALANCE_PLATFORM) {
    router.register(
      new AdyenPlatformsAdapter({
        apiKey: env.ADYEN_API_KEY,
        environment: env.ADYEN_ENVIRONMENT === "LIVE" ? "LIVE" : "TEST",
        merchantAccount: env.ADYEN_MERCHANT_ACCOUNT,
        balancePlatform: env.ADYEN_BALANCE_PLATFORM,
        hmacKey: env.ADYEN_HMAC_KEY,
        liveEndpointUrlPrefix: env.ADYEN_LIVE_URL_PREFIX,
      }),
    );
  }

  return router;
}
