import type { PaymentProvider, PaymentProviderAdapter } from "@benefitly/domain";

/**
 * Selects the correct provider adapter per organization/campaign, so the rest of the
 * application never imports a provider SDK directly. Swapping or adding a provider means
 * registering it here; every call site keeps depending on `PaymentProviderAdapter`.
 */
export class PaymentProviderRouter {
  private readonly adapters = new Map<PaymentProvider, PaymentProviderAdapter>();

  register(adapter: PaymentProviderAdapter): this {
    this.adapters.set(adapter.provider, adapter);
    return this;
  }

  for(provider: PaymentProvider): PaymentProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No payment provider adapter registered for "${provider}"`);
    return adapter;
  }

  isConfigured(provider: PaymentProvider): boolean {
    return this.adapters.has(provider);
  }

  configuredProviders(): PaymentProvider[] {
    return [...this.adapters.keys()];
  }
}
