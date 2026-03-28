import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if Twilio credentials are configured
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

        const configured = !!(accountSid && authToken && twilioNumber);

        return Response.json({
            configured,
            message: configured 
                ? 'SMS service is configured and ready' 
                : 'SMS service requires Twilio configuration'
        });

    } catch (error) {
        console.error('Check Twilio config error:', error);
        return Response.json({ 
            configured: false,
            error: error.message 
        }, { status: 500 });
    }
});