import { CampaignCard } from "@/components/campaign-card";
import { campaigns } from "@/components/campaign-data";
import { SiteHeader } from "@/components/site-header";
export const metadata = { title: "Discover fundraisers" };
export default function DiscoverPage() { return <><SiteHeader /><main className="page"><p className="kicker">Discover</p><h1>Find a cause you can stand behind.</h1><form className="search" action="/discover"><label htmlFor="q">Search fundraisers</label><input id="q" name="q" placeholder="Search by cause, place or organizer" /><button className="button">Search</button></form><div className="filter-row" aria-label="Categories">{["All", "Emergency", "Medical", "Education", "Community", "Faith", "Disaster"].map((item) => <button key={item}>{item}</button>)}</div><div className="campaign-grid">{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}</div></main></>; }
