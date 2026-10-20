"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampaignSummary } from "@benefitly/domain";

type LoggedGift = { id: string; campaignId: string; campaignTitle: string; amountCents: number; loggedAt: string };

type GivingPlanState = {
  interests: string[];
  savedCampaignIds: string[];
  annualGoalCents: number | null;
  gifts: LoggedGift[];
};

const STORAGE_KEY = "benefitly.givingPlan.v1";

const EMPTY_STATE: GivingPlanState = { interests: [], savedCampaignIds: [], annualGoalCents: null, gifts: [] };

function loadState(): GivingPlanState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return EMPTY_STATE;
  }
}

function saveState(state: GivingPlanState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or storage disabled -- the plan simply won't persist across visits.
  }
}

const categoryLabels: Record<string, string> = {
  emergency: "Emergency",
  medical: "Medical",
  memorial: "Memorial",
  education: "Education",
  community: "Community",
  faith: "Faith",
  disaster: "Disaster",
};

export function GivingPlan({ campaigns }: { campaigns: CampaignSummary[] }) {
  const [state, setState] = useState<GivingPlanState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [giftCampaignId, setGiftCampaignId] = useState("");

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const categories = useMemo(() => Array.from(new Set(campaigns.map((c) => c.category))), [campaigns]);

  const suggested = useMemo(() => {
    if (state.interests.length === 0) return campaigns.slice(0, 6);
    return campaigns.filter((c) => state.interests.includes(c.category)).slice(0, 9);
  }, [campaigns, state.interests]);

  const savedCampaigns = useMemo(
    () => campaigns.filter((c) => state.savedCampaignIds.includes(c.id)),
    [campaigns, state.savedCampaignIds],
  );

  const totalGivenCents = state.gifts.reduce((sum, g) => sum + g.amountCents, 0);
  const goalProgress = state.annualGoalCents ? Math.min(100, Math.round((totalGivenCents / state.annualGoalCents) * 100)) : null;

  function toggleInterest(category: string) {
    setState((s) => ({
      ...s,
      interests: s.interests.includes(category) ? s.interests.filter((c) => c !== category) : [...s.interests, category],
    }));
  }

  function toggleSaved(campaignId: string) {
    setState((s) => ({
      ...s,
      savedCampaignIds: s.savedCampaignIds.includes(campaignId)
        ? s.savedCampaignIds.filter((id) => id !== campaignId)
        : [...s.savedCampaignIds, campaignId],
    }));
  }

  function setGoal(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(goalInput);
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    setState((s) => ({ ...s, annualGoalCents: Math.round(dollars * 100) }));
    setGoalInput("");
  }

  function logGift(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(giftAmount);
    const campaign = campaigns.find((c) => c.id === giftCampaignId);
    if (!Number.isFinite(dollars) || dollars <= 0 || !campaign) return;
    setState((s) => ({
      ...s,
      gifts: [
        { id: crypto.randomUUID(), campaignId: campaign.id, campaignTitle: campaign.title, amountCents: Math.round(dollars * 100), loggedAt: new Date().toISOString() },
        ...s.gifts,
      ],
    }));
    setGiftAmount("");
  }

  if (!hydrated) return null;

  return (
    <>
      <section className="section giving-section" style={{ padding: "24px 0" }}>
        <h2>1. What do you care about?</h2>
        <p className="muted">Pick a few causes and we&apos;ll surface campaigns worth your attention.</p>
        <div className="filter-row" aria-label="Cause interests">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={state.interests.includes(category) ? "active" : undefined}
              onClick={() => toggleInterest(category)}
              aria-pressed={state.interests.includes(category)}
            >
              {categoryLabels[category] ?? category}
            </button>
          ))}
        </div>
      </section>

      <section className="section giving-section" style={{ padding: "24px 0" }}>
        <h2>2. Set a giving goal</h2>
        <p className="muted">A personal, private target for how much you want to give this year. Stored only in this browser.</p>
        {state.annualGoalCents ? (
          <div className="giving-goal-card">
            <p>
              Goal: <strong>${(state.annualGoalCents / 100).toLocaleString()}</strong> this year
            </p>
            <div className="progress large" aria-label={`${goalProgress}% of goal given`}>
              <span style={{ width: `${goalProgress ?? 0}%` }} />
            </div>
            <p className="muted">${(totalGivenCents / 100).toLocaleString()} given so far ({goalProgress ?? 0}%)</p>
            <button className="text-link" type="button" onClick={() => setState((s) => ({ ...s, annualGoalCents: null }))}>
              Change goal
            </button>
          </div>
        ) : (
          <form className="search" onSubmit={setGoal}>
            <label htmlFor="goal">Annual giving goal ($)</label>
            <input id="goal" inputMode="decimal" placeholder="500" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
            <button className="button">Set goal</button>
          </form>
        )}
      </section>

      <section className="section giving-section" style={{ padding: "24px 0" }}>
        <h2>3. Suggested for you</h2>
        <div className="campaign-grid">
          {suggested.map((campaign) => (
            <article className="campaign-card" key={campaign.id}>
              <img src={campaign.image} alt="" />
              <div className="campaign-copy">
                <p className="category">{categoryLabels[campaign.category] ?? campaign.category}</p>
                <h3>{campaign.title}</h3>
                <p className="muted">Organized by {campaign.organizer}</p>
                <div className="giving-card-actions">
                  <a className="button small" href={`/f/${campaign.slug}`}>
                    View &amp; donate
                  </a>
                  <button className="share" type="button" onClick={() => toggleSaved(campaign.id)}>
                    {state.savedCampaignIds.includes(campaign.id) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {suggested.length === 0 && <p className="muted">No campaigns match your interests yet &mdash; check back soon.</p>}
        </div>
      </section>

      <section className="section giving-section" style={{ padding: "24px 0" }}>
        <h2>4. Your saved causes</h2>
        {savedCampaigns.length === 0 && <p className="muted">Save a campaign above to build your list.</p>}
        {savedCampaigns.length > 0 && (
          <div className="campaign-grid">
            {savedCampaigns.map((campaign) => (
              <article className="campaign-card" key={campaign.id}>
                <div className="campaign-copy">
                  <p className="category">{categoryLabels[campaign.category] ?? campaign.category}</p>
                  <h3>{campaign.title}</h3>
                  <div className="giving-card-actions">
                    <a className="button small" href={`/f/${campaign.slug}`}>
                      Donate
                    </a>
                    <button className="share" type="button" onClick={() => toggleSaved(campaign.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section giving-section" style={{ padding: "24px 0 56px" }}>
        <h2>5. Your impact recap</h2>
        <p className="muted">
          Log a gift you made (on Benefitly or elsewhere) to see your recap build up. This stays in your browser, not on our
          servers.
        </p>
        <form className="search" onSubmit={logGift}>
          <label htmlFor="gift-campaign">Campaign</label>
          <select id="gift-campaign" value={giftCampaignId} onChange={(e) => setGiftCampaignId(e.target.value)} style={{ minHeight: 48, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
            <option value="">Choose a campaign</option>
            {(savedCampaigns.length > 0 ? savedCampaigns : campaigns).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <label htmlFor="gift-amount">Amount ($)</label>
          <input id="gift-amount" inputMode="decimal" placeholder="25" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} />
          <button className="button">Log gift</button>
        </form>
        {state.gifts.length > 0 && (
          <ul className="gift-log">
            {state.gifts.slice(0, 8).map((gift) => (
              <li key={gift.id}>
                <strong>${(gift.amountCents / 100).toLocaleString()}</strong> to {gift.campaignTitle}
                <span className="muted"> &middot; {new Date(gift.loggedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
