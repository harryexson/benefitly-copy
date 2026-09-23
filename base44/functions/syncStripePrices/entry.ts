import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user - only admins should run this
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    // Fetch all subscription tiers
    const tiers = await base44.asServiceRole.entities.SubscriptionTier.list();
    const results = [];

    for (const tier of tiers) {
      // Skip Enterprise tier (custom pricing)
      if (tier.name === 'Enterprise') {
        results.push({
          tier: tier.name,
          status: 'skipped',
          message: 'Enterprise tier uses custom pricing'
        });
        continue;
      }

      try {
        // Create or find Stripe product
        const productName = `Benefitly ${tier.name}`;
        const existingProducts = await stripe.products.search({
          query: `name:'${productName}'`,
        });

        let product;
        if (existingProducts.data.length > 0) {
          product = existingProducts.data[0];
        } else {
          product = await stripe.products.create({
            name: productName,
            description: `Up to ${tier.member_limit} members - ${tier.tagline || ''}`,
            metadata: {
              tier_id: tier.id,
              tier_name: tier.name
            }
          });
        }

        // Create monthly price
        const monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(tier.monthly_price * 100),
          currency: 'usd',
          recurring: {
            interval: 'month',
            trial_period_days: 14
          },
          metadata: {
            tier_id: tier.id,
            billing_cycle: 'monthly'
          }
        });

        // Create yearly price if available
        let yearlyPriceId = null;
        if (tier.yearly_price) {
          const yearlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(tier.yearly_price * 100),
            currency: 'usd',
            recurring: {
              interval: 'year',
              trial_period_days: 14
            },
            metadata: {
              tier_id: tier.id,
              billing_cycle: 'yearly'
            }
          });
          yearlyPriceId = yearlyPrice.id;
        }

        // Update SubscriptionTier with Stripe price IDs
        await base44.asServiceRole.entities.SubscriptionTier.update(tier.id, {
          stripe_monthly_price_id: monthlyPrice.id,
          stripe_yearly_price_id: yearlyPriceId
        });

        results.push({
          tier: tier.name,
          status: 'success',
          product_id: product.id,
          monthly_price_id: monthlyPrice.id,
          yearly_price_id: yearlyPriceId
        });

      } catch (error) {
        results.push({
          tier: tier.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Stripe price sync completed',
      results: results
    });

  } catch (error) {
    console.error('Stripe sync error:', error);
    return Response.json({ 
      error: error.message || 'Failed to sync Stripe prices' 
    }, { status: 500 });
  }
});