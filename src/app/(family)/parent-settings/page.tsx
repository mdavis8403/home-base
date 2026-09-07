import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/server/auth";
import { hasPermission } from "@/lib/shared/permissions";
import { ParentSecurity } from "@/components/parent-security";
export const metadata = { title: "Parent Settings" };
export default async function ParentSettings() {
  const { profile } = await requireSession();
  if (!hasPermission(profile.role, "settings:view")) notFound();
  return (
    <section className="settings">
      <p className="eyebrow">KEEPING OUR PLACE OURS</p>
      <h1>Parent Settings</h1>
      <p>Your family’s privacy starts here.</p>
      <ParentSecurity admin={hasPermission(profile.role, "security:manage")} />
      <section className="settings-panel">
        <h2>Family Board</h2>
        <p>
          Choose prompt categories, add your own prompts, and set the family
          reveal time.
        </p>
        <Link className="secondary-button" href="/family-board">
          Open Family Board → Parent touches
        </Link>
      </section>
      <section className="settings-panel">
        <h2>More settings, in a later chapter</h2>
        <p>
          Family details, content imports, data exports, and media settings will
          be added with their features.
        </p>
        <p className="muted">
          Mia has a child profile. Mom and Dad start as parent administrators.
        </p>
      </section>
    </section>
  );
}
