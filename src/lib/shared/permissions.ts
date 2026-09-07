import type { Permission, Role, Session } from "./types";
const grants: Record<Role, readonly Permission[]> = {
  child: ["family:use"],
  parent: [
    "family:use",
    "settings:view",
    "family:manage",
    "content:manage",
    "data:delete",
  ],
  admin: [
    "family:use",
    "settings:view",
    "family:manage",
    "content:manage",
    "data:delete",
    "security:manage",
    "providers:manage",
  ],
};
export function hasPermission(role: Role, permission: Permission): boolean {
  return grants[role].includes(permission);
}
export function canPerform(
  session: Session,
  permission: Permission,
  now = new Date(),
): boolean {
  if (
    session.expiresAt <= now ||
    !hasPermission(session.profile.role, permission)
  )
    return false;
  return (
    permission === "family:use" ||
    permission === "settings:view" ||
    (session.parentVerifiedUntil !== null && session.parentVerifiedUntil > now)
  );
}
