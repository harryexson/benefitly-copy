import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Helper function to hash a password using SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { action, username, password, user_id } = await req.json();

        // Verification action is public, but requires a username and password
        if (action === 'verify') {
            if (!username || !password) {
                return new Response(JSON.stringify({ success: false, error: 'Username and password are required' }), { status: 400 });
            }

            const users = await base44.asServiceRole.entities.BackOfficeUser.filter({ username: username });

            if (users.length === 0) {
                return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), { status: 401 });
            }

            const backOfficeUser = users[0];
            const providedPasswordHash = await hashPassword(password);

            if (providedPasswordHash === backOfficeUser.password_hash) {
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), { status: 401 });
            }
        }

        // --- Authenticated Actions Below ---
        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // Creation action requires Super Admin role
        if (action === 'create') {
             if (currentUser.back_office_role !== 'Super Admin') {
                return new Response(JSON.stringify({ error: 'Forbidden: Only Super Admins can create users.' }), { status: 403 });
            }
            if (!username || !password || !user_id) {
                return new Response(JSON.stringify({ error: 'Username, password, and user ID are required' }), { status: 400 });
            }

            const password_hash = await hashPassword(password);
            
            const newUser = await base44.asServiceRole.entities.BackOfficeUser.create({
                user_id,
                username,
                password_hash
            });

            return new Response(JSON.stringify({ success: true, user: newUser }), { status: 201 });
        }

        // Reset password action - requires Super Admin role
        if (action === 'reset_password') {
            if (currentUser.back_office_role !== 'Super Admin') {
                return new Response(JSON.stringify({ error: 'Forbidden: Only Super Admins can reset passwords.' }), { status: 403 });
            }
            if (!username || !password) {
                return new Response(JSON.stringify({ error: 'Username and new password are required' }), { status: 400 });
            }

            const users = await base44.asServiceRole.entities.BackOfficeUser.filter({ username: username });
            
            if (users.length === 0) {
                return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
            }

            const backOfficeUser = users[0];
            const new_password_hash = await hashPassword(password);
            
            await base44.asServiceRole.entities.BackOfficeUser.update(backOfficeUser.id, {
                password_hash: new_password_hash
            });

            return new Response(JSON.stringify({ success: true, message: 'Password reset successfully' }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});