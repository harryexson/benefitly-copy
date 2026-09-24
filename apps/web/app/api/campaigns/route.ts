import { NextRequest, NextResponse } from "next/server";
import { campaignSearchSchema } from "@benefitly/validation";
import { campaigns } from "@/components/campaign-data";

export async function GET(request: NextRequest) {
  const parsed = campaignSearchSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_QUERY", message: "Search parameters are invalid." } }, { status: 400 });
  }
  const query = parsed.data.q?.toLowerCase();
  const results = campaigns.filter((campaign) =>
    (!parsed.data.category || campaign.category === parsed.data.category) &&
    (!query || `${campaign.title} ${campaign.organizer} ${campaign.location}`.toLowerCase().includes(query)),
  );
  return NextResponse.json({ data: results });
}
