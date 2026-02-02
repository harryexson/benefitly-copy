import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Creates a Member record for the association administrator
 * This is called during onboarding to automatically link the admin user to a member profile
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const currentUser = await base44.auth.me();
    if (!currentUser || !currentUser.association_account_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { association_account_id, first_name, last_name, email, phone } = await req.json();

    if (!association_account_id || !first_name || !last_name || !email) {
      return Response.json({ 
        error: 'Missing required fields: association_account_id, first_name, last_name, email' 
      }, { status: 400 });
    }

    // Check if a member with this email already exists
    const existingMembers = await base44.asServiceRole.entities.Member.filter({ 
      email: email 
    });

    if (existingMembers.length > 0) {
      // Link existing member to user
      await base44.asServiceRole.entities.User.update(currentUser.id, {
        member_id: existingMembers[0].id
      });

      return Response.json({ 
        success: true,
        member: existingMembers[0],
        message: 'Linked to existing member profile'
      });
    }

    // Generate a unique member number
    const allMembers = await base44.asServiceRole.entities.Member.list();
    const memberNumber = `M${String(allMembers.length + 1).padStart(5, '0')}`;

    // Create new member record
    const newMember = await base44.asServiceRole.entities.Member.create({
      member_number: memberNumber,
      first_name: first_name,
      last_name: last_name,
      email: email,
      phone: phone || '',
      status: 'Active',
      joined_at: new Date().toISOString().split('T')[0],
      payout_method: 'Not Set'
    });

    // Link member to user account
    await base44.asServiceRole.entities.User.update(currentUser.id, {
      member_id: newMember.id
    });

    return Response.json({ 
      success: true,
      member: newMember,
      message: 'Member profile created successfully'
    });

  } catch (error) {
    console.error('Error creating admin member:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});