// Central permission registry for RBAC.
export const PERMISSION_GROUPS: { group: string; keys: string[] }[] = [
  { group: "Products", keys: ["products.view", "products.create", "products.update", "products.delete"] },
  { group: "Categories", keys: ["categories.manage"] },
  { group: "Inventory", keys: ["inventory.view", "inventory.manage"] },
  { group: "Orders", keys: ["orders.view", "orders.update", "orders.cancel", "orders.refund"] },
  { group: "Customers", keys: ["customers.view", "customers.manage"] },
  { group: "Promotions", keys: ["promotions.manage"] },
  { group: "Coupons", keys: ["coupons.manage"] },
  { group: "Homepage & Banners (CMS)", keys: ["cms.manage"] },
  { group: "Reviews", keys: ["reviews.manage"] },
  { group: "Reports", keys: ["reports.view"] },
  { group: "Shipping", keys: ["shipping.manage"] },
  { group: "Payments", keys: ["payments.manage"] },
  { group: "Users & Roles", keys: ["users.manage"] },
  { group: "Settings", keys: ["settings.manage"] },
  { group: "Audit Logs", keys: ["audit.view"] },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.keys);

// Role presets used by the seeder (and editable later in code / UI).
export const ROLE_PRESETS: Record<string, { label: string; permissions: string[] | "*" }> = {
  super_admin: { label: "Super Admin", permissions: "*" },
  admin: {
    label: "Admin",
    permissions: ALL_PERMISSIONS.filter((p) => !["users.manage", "settings.manage", "audit.view"].includes(p)),
  },
  staff: {
    label: "Staff / Operations",
    permissions: [
      "products.view",
      "inventory.view",
      "inventory.manage",
      "orders.view",
      "orders.update",
      "orders.cancel",
      "customers.view",
      "reviews.manage",
    ],
  },
  customer: { label: "Customer", permissions: [] },
};
