import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active roles for this user
    const userRoles = await base44.asServiceRole.entities.UserRole.filter({ 
      user_id: user.id,
      is_active: true 
    });

    if (userRoles.length === 0) {
      // No custom roles, return default member permissions
      return Response.json({
        permissions: {
          members: { view: true, create: false, edit: false, delete: false, approve: false },
          events: { view: true, create: false, edit: false, delete: false, publish: false },
          financials: { view: false, view_reports: false, manage_contributions: false, approve_payouts: false, manage_expenses: false },
          reports: { view: true, generate: false, customize: false, schedule: false, distribute: false },
          community: { view: true, post_discussions: true, create_announcements: false, moderate: false },
          users: { view: false, invite: false, manage_roles: false, delete: false },
          settings: { view: false, edit_organization: false, manage_integrations: false, manage_billing: false }
        },
        roles: []
      });
    }

    // Get role details
    const roleIds = userRoles.map(ur => ur.role_id);
    const roles = await base44.asServiceRole.entities.Role.filter({});
    const userRoleDetails = roles.filter(r => roleIds.includes(r.id));

    // Sort by priority (highest first)
    userRoleDetails.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Merge permissions from all roles (OR operation, higher priority wins on conflicts)
    const mergedPermissions = {
      members: { view: false, create: false, edit: false, delete: false, approve: false },
      events: { view: false, create: false, edit: false, delete: false, publish: false },
      financials: { view: false, view_reports: false, manage_contributions: false, approve_payouts: false, manage_expenses: false },
      reports: { view: false, generate: false, customize: false, schedule: false, distribute: false },
      community: { view: true, post_discussions: true, create_announcements: false, moderate: false },
      users: { view: false, invite: false, manage_roles: false, delete: false },
      settings: { view: false, edit_organization: false, manage_integrations: false, manage_billing: false }
    };

    // Merge permissions (any role granting a permission enables it)
    for (const role of userRoleDetails) {
      if (!role.permissions) continue;
      
      for (const category in role.permissions) {
        if (!mergedPermissions[category]) continue;
        
        for (const permission in role.permissions[category]) {
          if (role.permissions[category][permission]) {
            mergedPermissions[category][permission] = true;
          }
        }
      }
    }

    return Response.json({
      permissions: mergedPermissions,
      roles: userRoleDetails.map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        priority: r.priority
      }))
    });

  } catch (error) {
    console.error('Error getting user permissions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});