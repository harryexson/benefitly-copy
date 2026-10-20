import { Client, CheckoutAPI, LegalEntityManagementAPI, BalancePlatformAPI, TransfersAPI, hmacValidator, Types } from "@adyen/api-library";

const { Split } = Types.checkout;
type Split = Types.checkout.Split;
import type {
  ConnectedAccount,
  DonationChargeRequest,
  DonationChargeResult,
  PaymentProviderAdapter,
  PayoutRequest,
  PayoutResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
} from "@benefitly/domain";

export type AdyenPlatformsAdapterConfig = {
  apiKey: string;
  environment: "TEST" | "LIVE";
  merchantAccount: string;
  balancePlatform: string;
  /** Static HMAC key configured on the platform's webhook subscription (Customer Area). */
  hmacKey: string;
  /** Required for LIVE. */
  liveEndpointUrlPrefix?: string;
};

const accountHolderStatusMap: Record<string, ConnectedAccount["status"]> = {
  Active: "active",
  Inactive: "pending",
  Suspended: "restricted",
  Closed: "disabled",
};

/**
 * Adyen for Platforms (Balance Platform) adapter. Organizers become legal entities and
 * balance-account holders; donor charges use the Checkout Sessions API with `splits` so the
 * campaign's balance account receives the net amount and the platform's liable balance account
 * receives the voluntary contribution in the same transaction.
 */
export class AdyenPlatformsAdapter implements PaymentProviderAdapter {
  readonly provider = "adyen_platforms" as const;
  private readonly checkout: CheckoutAPI;
  private readonly legalEntities: LegalEntityManagementAPI;
  private readonly balancePlatform: BalancePlatformAPI;
  private readonly transfers: TransfersAPI;
  private readonly config: AdyenPlatformsAdapterConfig;

  constructor(config: AdyenPlatformsAdapterConfig) {
    if (!config.apiKey) throw new Error("AdyenPlatformsAdapter requires an apiKey");
    if (!config.hmacKey) throw new Error("AdyenPlatformsAdapter requires a hmacKey");
    const client = new Client({
      apiKey: config.apiKey,
      environment: config.environment,
      ...(config.liveEndpointUrlPrefix ? { liveEndpointUrlPrefix: config.liveEndpointUrlPrefix } : {}),
    });
    this.checkout = new CheckoutAPI(client);
    this.legalEntities = new LegalEntityManagementAPI(client);
    this.balancePlatform = new BalancePlatformAPI(client);
    this.transfers = new TransfersAPI(client);
    this.config = config;
  }

  async createConnectedAccount(input: { ownerId: string; country: string; type: "individual" | "business" }): Promise<ConnectedAccount> {
    const legalEntity = await this.legalEntities.LegalEntitiesApi.createLegalEntity({
      type: input.type === "individual" ? "individual" : "organization",
      countryOfGovernance: input.country,
    } as never);
    const accountHolder = await this.balancePlatform.AccountHoldersApi.createAccountHolder({
      legalEntityId: legalEntity.id!,
      balancePlatform: this.config.balancePlatform,
      description: `Benefitly organizer ${input.ownerId}`,
      reference: input.ownerId,
    });
    return {
      provider: this.provider,
      providerAccountId: accountHolder.id!,
      status: accountHolderStatusMap[accountHolder.status ?? "Inactive"] ?? "pending",
    };
  }

  async createOnboardingLink(accountId: string, returnUrl: string, _refreshUrl: string): Promise<string> {
    // Adyen links onboarding to the legal entity, not the account holder; callers must pass the
    // legal entity id as `accountId` here (the same id returned from createConnectedAccount's
    // underlying legal entity, tracked by the caller alongside the account holder id).
    const link = await this.legalEntities.HostedOnboardingApi.getLinkToAdyenhostedOnboardingPage(accountId, {
      redirectUrl: returnUrl,
    });
    return link.url!;
  }

  async createDonationCharge(input: DonationChargeRequest): Promise<DonationChargeResult> {
    const netToCampaign = input.grossAmount - input.platformContribution;
    const splits: Split[] = [
      {
        type: Split.TypeEnum.BalanceAccount,
        account: input.destinationAccountId,
        amount: { currency: input.currency, value: netToCampaign },
        reference: `${input.campaignId}:campaign`,
      },
    ];
    if (input.platformContribution > 0) {
      splits.push({
        type: Split.TypeEnum.Commission,
        amount: { currency: input.currency, value: input.platformContribution },
        reference: `${input.campaignId}:contribution`,
      });
    }
    const session = await this.checkout.PaymentsApi.sessions(
      {
        merchantAccount: this.config.merchantAccount,
        amount: { currency: input.currency, value: input.grossAmount },
        reference: input.idempotencyKey,
        returnUrl: `https://benefitly.app/donate/${input.campaignId}/complete`,
        splits,
        shopperEmail: input.donorEmail,
        metadata: { campaignId: input.campaignId, ...input.metadata },
      } as never,
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      providerPaymentId: session.id!,
      clientSecret: session.sessionData,
      status: "requires_action",
    };
  }

  async refundDonation(input: RefundRequest): Promise<RefundResult> {
    const result = await this.checkout.ModificationsApi.refundCapturedPayment(
      input.providerPaymentId,
      {
        merchantAccount: this.config.merchantAccount,
        amount: input.amount ? { currency: "USD", value: input.amount } : undefined,
        merchantRefundReason: input.reason === "fraudulent" ? ("FRAUD" as never) : undefined,
      } as never,
      { idempotencyKey: input.idempotencyKey },
    );
    return { providerRefundId: result.pspReference ?? input.idempotencyKey, status: "pending" };
  }

  async createPayout(input: PayoutRequest): Promise<PayoutResult> {
    const transfer = await this.transfers.TransfersApi.transferFunds(
      {
        amount: { currency: input.currency, value: input.amount },
        balanceAccountId: input.accountId,
        category: "bank",
        counterparty: { balanceAccountId: input.accountId } as never,
        reference: input.reference,
      } as never,
      { idempotencyKey: input.idempotencyKey } as never,
    );
    return { providerPayoutId: transfer.id ?? input.idempotencyKey, status: "processing" };
  }

  /**
   * Adyen webhooks deliver a batch of `notificationItems`, each HMAC-signed independently with
   * the platform's static `hmacKey` (there is no per-request signature header like Stripe's).
   * The `signature` argument is accepted for interface parity and ignored.
   */
  async verifyWebhook(payload: string): Promise<WebhookEvent> {
    const parsed = JSON.parse(payload) as { notificationItems?: Array<{ NotificationRequestItem: Record<string, unknown> }> };
    const first = parsed.notificationItems?.[0]?.NotificationRequestItem;
    if (!first) throw new Error("Adyen webhook payload contained no notificationItems");
    const valid = new hmacValidator().validateHMAC(first as never, this.config.hmacKey);
    if (!valid) throw new Error("Adyen webhook HMAC validation failed");
    return { id: String(first.pspReference ?? first.eventCode), type: String(first.eventCode), data: first };
  }
}
