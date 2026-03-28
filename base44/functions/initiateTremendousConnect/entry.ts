import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Initiates Tremendous Connect OAuth flow.
 * Returns authorization URL for redirect.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { redirect_uri } = body;

        const tremendousClientId = Deno.env.get('TREMENDOUS_CLIENT_ID') || 'your_client_id';
        
        // Build OAuth authorization URL
        const authUrl = new URL('https://app.tremendous.com/oauth/authorize');
        authUrl.searchParams.set('client_id', tremendousClientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', redirect_uri);
        authUrl.searchParams.set('scope', 'organizations orders rewards');
        authUrl.searchParams.set('state', user.association_account_id);

        return Response.json({
            success: true,
            authorization_url: authUrl.toString()
        });

    } catch (error) {
        console.error('Failed to initiate Tremendous Connect:', error);
        return Response.json({ 
            error: error.message || 'Failed to initiate connection'
        }, { status: 500 });
    }
});