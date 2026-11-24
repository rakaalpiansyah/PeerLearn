export function isAdminRole(role) {
  return role === "admin" || role === "super_admin" || role === "faculty_admin";
}

export function getAdminRoleLabel(role) {
  if (role === "super_admin") return "Super Admin Komunitas";
  if (role === "faculty_admin") return "Admin Fakultas";
  return "Admin Komunitas";
}
