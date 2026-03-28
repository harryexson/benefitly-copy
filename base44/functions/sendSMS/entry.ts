import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user || !user.association_account_id) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { to, message } = await req.json();

        if (!to || !message) {
            return Response.json({ error: 'Phone number and message are required' }, { status: 400 });
        }

        // Check if Twilio is configured
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

        if (!accountSid || !authToken || !twilioNumber) {
            return Response.json({ 
                error: 'SMS service not configured',
                details: 'Twilio credentials are not set up. Contact your administrator.'
            }, { status: 503 });
        }

        // Format phone number to E.164 format if needed
        let formattedPhone = to.replace(/\D/g, '');
        if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
            formattedPhone = '1' + formattedPhone;
        }
        formattedPhone = '+' + formattedPhone;

        // Send SMS via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        
        const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: formattedPhone,
                From: twilioNumber,
                Body: message
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Twilio error:', errorData);
            return Response.json({ 
                error: 'Failed to send SMS',
                details: errorData.message || 'Unknown error'
            }, { status: response.status });
        }

        const result = await response.json();

        return Response.json({
            success: true,
            sid: result.sid,
            status: result.status
        });

    } catch (error) {
        console.error('SMS sending error:', error);
        return Response.json({ 
            error: error.message || 'Failed to send SMS' 
        }, { status: 500 });
    }
});