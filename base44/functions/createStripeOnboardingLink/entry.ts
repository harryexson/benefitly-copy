import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.association_role !== 'Administrator') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await base44.asServiceRole.entities.AssociationAccount.list();
    const userAccount = accounts.find(a => a.id === user.association_account_id);

    if (!userAccount) {
      return Response.json({ error: 'Association account not found' }, { status: 404 });
    }

    let accountId = userAccount.stripe_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: userAccount.contact_email,
        business_profile: {
          name: userAccount.organization_name,
        },
      });
      accountId = account.id;

      await base44.asServiceRole.entities.AssociationAccount.update(userAccount.id, {
        stripe_account_id: accountId
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${req.headers.get('origin')}/Settings`,
      return_url: `${req.headers.get('origin')}/Settings`,
      type: 'account_onboarding',
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe onboarding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});