import type { PaymentProvider } from "@benefitly/domain";

/**
 * Durable, idempotent storage for inbound provider webhooks. Implemented against
 * `public.webhook_events` (see database/migrations/0003_crowdfunding_trust.sql). Every event is
 * recorded before it is processed, and a duplicate delivery must be a no-op.
 */
export interface WebhookEventStore {
  /** Returns false if this (provider, providerEventId) pair was already recorded. */
  recordIfNew(input: { provider: PaymentProvider; providerEventId: string; eventType: string; payload: unknown }): Promise<boolean>;
  markProcessed(provider: PaymentProvider, providerEventId: string): Promise<void>;
  markFailed(provider: PaymentProvider, providerEventId: string, error: string): Promise<void>;
}

/** Generic idempotency guard for outbound provider calls (charges, payouts, onboarding). */
export interface IdempotencyStore {
  begin(key: string, scope: string, requestHash: string): Promise<{ isNew: boolean; cachedResponse?: unknown }>;
  complete(key: string, response: unknown): Promise<void>;
}
