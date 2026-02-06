import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Handles OAuth callback from Tremendous Connect.
 * Exchanges authorization code for access token and links organization.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
            console.error('Tremendous OAuth error:', error);
            return Response.redirect(new URL('/Settings?tremendous_error=' + error, url.origin).toString());
        }

        if (!code) {
            return Response.json({ error: 'Missing authorization code' }, { status: 400 });
        }

        // Exchange code for access token
        const tremendousApiKey = Deno.env.get('TREMENDOUS_API_KEY');
        const tokenResponse = await fetch('https://app.tremendous.com/api/v2/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tremendousApiKey}`
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${url.origin}/api/functions/tremendousOAuthCallback`
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange failed:', errorData);
            return Response.json({ error: 'Failed to exchange token' }, { status: 500 });
        }

        const tokenData = await tokenResponse.json();
        const { access_token, refresh_token, organization_id } = tokenData;

        // Get organization details
        const orgResponse = await fetch(`https://app.tremendous.com/api/v2/organizations/${organization_id}`, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const orgData = await orgResponse.json();

        // Update association account with Tremendous credentials
        await base44.asServiceRole.entities.AssociationAccount.update(user.association_account_id, {
            tremendous_organization_id: organization_id,
            tremendous_access_token: access_token,
            tremendous_refresh_token: refresh_token,
            tremendous_connected: true,
            tremendous_kyb_status: orgData.organization?.kyb_status || 'pending',
            tremendous_connected_at: new Date().toISOString(),
            payout_provider: 'both'
        });

        console.log('Tremendous connected successfully:', organization_id);

        // Redirect back to settings page with success
        return Response.redirect(new URL('/Settings?tremendous_connected=true', url.origin).toString());

    } catch (error) {
        console.error('OAuth callback error:', error);
        return Response.json({ 
            error: error.message || 'Failed to connect Tremendous account'
        }, { status: 500 });
    }
});