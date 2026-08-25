// ============================================================
//  Schoolari RBAC — Role-Based Access Control
//  Single source of truth for all role and permission logic
// ============================================================

export type StaffRole =
  | "super_admin"
  | "admin"
  | "college_coach"
  | "content_manager"
  | "customer_support";

// All roles that are allowed to access the admin panel
export const STAFF_ROLES: StaffRole[] = [
  "super_admin",
  "admin",
  "college_coach",
  "content_manager",
  "customer_support",
];

// Human-readable labels for each role
export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  college_coach: "College Coach",
  content_manager: "Content Manager",
  customer_support: "Customer Support",
};

// Badge colors for each role
export const ROLE_COLORS: Record<StaffRole, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin: "bg-violet-100 text-violet-700",
  college_coach: "bg-rose-100 text-rose-700",
  content_manager: "bg-indigo-100 text-indigo-700",
  customer_support: "bg-teal-100 text-teal-700",
};

// ============================================================
//  Permission definitions
// ============================================================

export type Permission =
  | "view_dashboard"
  | "manage_users"           // Edit, disable, delete users
  | "view_users"             // Read-only user list
  | "manage_scholarships"    // Add, edit, delete scholarships
  | "manage_coaching"        // Sessions, action items, notes
  | "send_messages"          // Send to individuals or broadcast
  | "manage_content"         // Tips, quotes, announcements, banners
  | "manage_income"          // Videos, categories, learning paths
  | "manage_staff"           // Create staff accounts, assign roles
  | "manage_settings"        // Site settings (super_admin only)
  | "manage_payments";       // Subscriptions, refunds, coupons

// Permission matrix — each role and which permissions it has
const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  super_admin: [
    "view_dashboard",
    "manage_users",
    "view_users",
    "manage_scholarships",
    "manage_coaching",
    "send_messages",
    "manage_content",
    "manage_income",
    "manage_staff",
    "manage_settings",
    "manage_payments",
  ],
  admin: [
    "view_dashboard",
    "manage_users",
    "view_users",
    "manage_scholarships",
    "manage_coaching",
    "send_messages",
    "manage_content",
    "manage_income",
    // NO: manage_staff, manage_settings, manage_payments
  ],
  college_coach: [
    "view_dashboard",
    "manage_coaching",
    "send_messages",
    // NO: users, scholarships, content, income, settings
  ],
  content_manager: [
    "view_dashboard",
    "manage_scholarships",
    "manage_content",
    "manage_income",
    // NO: users, coaching, messages, settings
  ],
  customer_support: [
    "view_dashboard",
    "view_users",
    "send_messages",
    // NO: manage_users (can view but not edit/delete), coaching, scholarships
  ],
};

// ============================================================
//  Helper functions
// ============================================================

/** Check if a role is a valid staff role */
export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

/** Check if a role has a specific permission */
export function hasPermission(role: StaffRole | string | null | undefined, permission: Permission): boolean {
  if (!role || !isStaffRole(role)) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Check if a role can access the admin panel at all */
export function canAccessAdmin(role: string | null | undefined): boolean {
  return isStaffRole(role);
}

/** Get all permissions for a role */
export function getPermissions(role: StaffRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ============================================================
//  Nav item gating — maps each nav href to a required permission
// ============================================================

export const NAV_PERMISSIONS: Record<string, Permission> = {
  "/admin/dashboard": "view_dashboard",
  "/admin/users": "view_users",
  "/admin/scholarships": "manage_scholarships",
  "/admin/coaching": "manage_coaching",
  "/admin/messages": "send_messages",
  "/admin/content": "manage_content",
  "/admin/career": "manage_content",
  "/admin/income": "manage_income",
  "/admin/staff": "manage_staff",
  "/admin/settings": "manage_settings",
  "/admin/ai-limits": "manage_settings",
  "/admin/payments": "manage_payments",
};
