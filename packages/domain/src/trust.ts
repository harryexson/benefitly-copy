export const reportReasons = ["fraud", "misuse_of_funds", "inappropriate_content", "impersonation", "duplicate", "other"] as const;
export type ReportReason = (typeof reportReasons)[number];
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type CampaignReport = {
  id: string;
  campaignId: string;
  reporterId?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
};

export type ModerationActionType = "approve" | "reject" | "request_changes" | "pause" | "resume" | "remove" | "restore" | "note";

export type ModerationAction = {
  id: string;
  campaignId: string;
  reportId?: string;
  actorId: string;
  action: ModerationActionType;
  reason?: string;
  createdAt: string;
};

/** Phase 1 launch policy: every campaign requires a manual review before it can publish. */
export type CampaignReviewStatus = "pending" | "approved" | "rejected" | "changes_requested";

export type CampaignReview = {
  id: string;
  campaignId: string;
  status: CampaignReviewStatus;
  submittedBy: string;
  reviewedBy?: string;
  notes?: string;
  submittedAt: string;
  decidedAt?: string;
};

export type FraudSignalSubjectType = "campaign" | "donation" | "payout" | "payment_account" | "profile";
export type FraudSignalSeverity = "low" | "medium" | "high" | "critical";

export type FraudSignal = {
  id: string;
  subjectType: FraudSignalSubjectType;
  subjectId: string;
  signalType: string;
  severity: FraudSignalSeverity;
  score?: number;
  createdAt: string;
  resolvedAt?: string;
};

export type Beneficiary = {
  id: string;
  campaignId: string;
  profileId?: string;
  name: string;
  relationship?: string;
  verifiedAt?: string;
};

export type NotificationType =
  | "donation_received"
  | "campaign_approved"
  | "campaign_rejected"
  | "campaign_update"
  | "payout_status"
  | "report_resolved"
  | "goal_reached";

export type AppNotification = {
  id: string;
  profileId: string;
  organizationId?: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
};
