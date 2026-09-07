import Link from "next/link";
import { requireSession } from "@/lib/server/auth";
import { hasPermission } from "@/lib/shared/permissions";
import { Navigation } from "@/components/navigation";
import { SignOut } from "@/components/sign-out";
export const dynamic = "force-dynamic";
export default async function FamilyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireSession();
  return (
    <div className="family-shell">
      <header className="family-header">
        <Link className="wordmark" href="/home">
          <span aria-hidden="true">⌂</span> HOME BASE
        </Link>
        <div className="profile-label">
          <span
            className="avatar"
            aria-hidden="true"
            style={{ backgroundColor: profile.color }}
          >
            {profile.displayName.charAt(0)}
          </span>
          <span>{profile.displayName}’s place</span>
        </div>
      </header>
      <Navigation />
      <main id="main">{children}</main>
      <footer className="family-footer">
        <span>No matter where we are, we meet here.</span>
        <div>
          {hasPermission(profile.role, "settings:view") && (
            <Link href="/parent-settings">Parent Settings</Link>
          )}
          <SignOut />
        </div>
      </footer>
    </div>
  );
}
