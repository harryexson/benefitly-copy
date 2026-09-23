import Link from "next/link";
import { percentage, type CampaignSummary } from "@benefitly/domain";

export function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  const funded = percentage(campaign.raised.amount, campaign.goal.amount);
  return <article className="campaign-card"><img src={campaign.image} alt="" /><div className="campaign-copy"><p className="category">{campaign.category}</p><h3><Link href={`/f/${campaign.slug}`}>{campaign.title}</Link></h3><p className="muted">Organized by {campaign.organizer}{campaign.location ? ` in ${campaign.location}` : ""}</p><div className="progress" aria-label={`${funded}% funded`}><span style={{ width: `${funded}%` }} /></div><p><strong>${(campaign.raised.amount / 100).toLocaleString()}</strong> raised of ${(campaign.goal.amount / 100).toLocaleString()}</p><p className="muted">{campaign.supporterCount} supporters</p></div></article>;
}
