import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate the requesting user
    const currentUser = await base44.auth.me();
    if (!currentUser || !currentUser.association_account_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage users
    if (currentUser.association_role !== 'Administrator' && 
        currentUser.association_role !== 'Manager' &&
        !currentUser.permissions?.can_manage_users) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { email, role, member_id, role_ids } = await req.json();

    if (!email || !role) {
      return Response.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Check if user already exists in this association
    const existingUsers = await base44.asServiceRole.entities.User.filter({ 
      email: email,
      association_account_id: currentUser.association_account_id 
    });

    if (existingUsers.length > 0) {
      return Response.json({ 
        error: 'User with this email already exists in your association' 
      }, { status: 400 });
    }

    // Create user invitation record
    const userInvitation = await base44.asServiceRole.entities.User.create({
      email: email,
      association_account_id: currentUser.association_account_id,
      association_role: role,
      member_id: member_id || null,
      invitation_status: 'Pending',
      invited_by: currentUser.id,
      invited_at: new Date().toISOString(),
      back_office_role: 'None'
    });

    // Assign custom roles if provided
    if (role_ids && role_ids.length > 0) {
      for (const roleId of role_ids) {
        await base44.asServiceRole.entities.UserRole.create({
          user_id: userInvitation.id,
          role_id: roleId,
          assigned_by: currentUser.id,
          assigned_at: new Date().toISOString(),
          is_active: true
        });
      }
    }

    // Auto-create Member record for Administrators, Managers, and Senior Leaders
    if (role === 'Administrator' || role === 'Manager' || role === 'Senior Leader') {
      // Generate member number
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const memberNumber = `MEM${timestamp.slice(-6)}${random}`;

      // Extract name from email if possible
      const emailName = email.split('@')[0];
      const nameParts = emailName.split(/[._-]/);
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts[1] || '';

      await base44.asServiceRole.entities.Member.create({
        member_number: memberNumber,
        first_name: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        last_name: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        email: email,
        status: 'Active',
        joined_at: new Date().toISOString().split('T')[0]
      });
    }

    // Send invitation email
    const associationAccounts = await base44.asServiceRole.entities.AssociationAccount.filter({
      id: currentUser.association_account_id
    });
    const associationName = associationAccounts[0]?.organization_name || 'Your Association';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `You've been invited to join ${associationName} on Benefitly`,
      body: `
        <h2>Welcome to ${associationName}!</h2>
        <p>You've been invited by ${currentUser.full_name || currentUser.email} to join ${associationName} on Benefitly.</p>
        <p><strong>Your Base Role:</strong> ${role}</p>
        ${role_ids && role_ids.length > 0 ? `<p>You've been assigned additional custom roles with specific permissions.</p>` : ''}
        <p>Click the link below to accept your invitation and create your account:</p>
        <p><a href="https://benefitly.app/Dashboard" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation & Sign Up</a></p>
        <p>If you already have a Benefitly account, simply log in and you'll have access to ${associationName}.</p>
        <br>
        <p>Best regards,<br>The Benefitly Team</p>
      `
    });

    return Response.json({ 
      success: true,
      user: userInvitation,
      message: 'User invitation sent successfully'
    });

  } catch (error) {
    console.error('Error inviting user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});