# Entity mapping

The only directly referenced generated entities are `BenefitProgram` and `BenefitClaim`; the following entity names are inferred from imports, screens, and server functions and must be validated against an export before data migration.

| Existing entity | Target table/domain | Relationships and isolation | Status |
| --- | --- | --- | --- |
| User | `profiles` | 1:1 Auth user; global identity | planned |
| AssociationAccount | `organizations` | tenant root; slug unique | planned |
| Member | `members`, `organization_members` | both reference `organization_id`; member RLS | planned |
| Role, UserRole | `organization_roles`, `organization_user_roles` | permissions evaluated server-side + RLS | planned |
| BenefitProgram | `benefit_programs` | organization scoped; creator/admin policies | planned |
| BenefitClaim | `benefit_claims`, `claim_documents`, `claim_approvals` | organization scoped; claimant and reviewer policies | planned |
| Event, EventTicket, EventContribution | `events`, `event_tickets`, `event_registrations`, `event_contributions` | organization scoped; public visibility explicit | planned |
| Expense | `expenses`, `expense_receipts` | organization scoped; finance roles | planned |
| Payout | `payouts`, `ledger_entries` | organization scoped; finance/admin approval policies | planned |
| Announcement | `announcements` | organization scoped; member read policy | planned |
| ForumCategory, ForumThread | `forum_categories`, `forum_threads`, `forum_posts` | organization scoped; membership policy | planned |
| CommunicationLog, EmailTemplate | `communication_logs`, `email_templates` | organization scoped; communications role | planned |
| NotificationPreference | `notification_preferences` | profile-owned | planned |
| Proposal | `proposals`, `proposal_votes` | organization scoped; voting eligibility policy | planned |
| SubscriptionTier, EnterpriseContract | `subscription_tiers`, `subscriptions`, `enterprise_contracts` | platform-admin managed | planned |
| BackOfficeUser | `platform_roles` / profile claims | platform-only RBAC, audited | planned |
| ScheduledReport | `scheduled_reports` | organization scoped; server job only | planned |

Every organization-scoped table will live in Neon Postgres, have an `organization_id`, an index beginning with it, and RLS enabled. Policies check membership/permissions through non-client-writable relationships. The API sets verified identity and tenant context for each transaction; it never trusts a browser-supplied organization ID. Financial writes also create append-only `ledger_entries` and `audit_logs`.
