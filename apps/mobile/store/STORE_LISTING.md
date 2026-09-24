# Benefitly store-listing checklist

This directory is a release checklist, not evidence of App Store or Play approval.

## Product metadata

- **Name:** Benefitly
- **Subtitle / short description:** Give to trusted local causes and follow the impact.
- **Primary category:** Lifestyle or Social Networking (confirm with launch positioning)
- **Support URL, privacy-policy URL and marketing URL:** required before submission
- **Bundle identifiers:** `com.benefitly.app` for both iOS and Android; verify availability before registering production apps

## Required assets

- App icon source is `../assets/icon.png`; create platform-specific final exports from the approved brand source.
- Capture five or more truthful screenshots from a release candidate: home, discover, campaign detail, gift checkout, and giving activity.
- Do not use placeholder payment, balance, donor, beneficiary or rating claims in screenshots.
- Produce localized screenshot sets for every supported storefront language.

## Release gates

- Configure EAS project IDs, signing credentials, app ownership, privacy manifests and Android Data safety disclosures.
- Provide a working in-app account-deletion path and support contact.
- Complete Apple privacy nutrition labels and Google Play Data safety declarations from the actual production data flows.
- Test on current iOS and Android devices, including large text, screen readers, offline/error states and deep links.
- Do not submit payment flows until the selected provider's live onboarding, webhook verification, refunds and payout reconciliation have passed acceptance tests.
