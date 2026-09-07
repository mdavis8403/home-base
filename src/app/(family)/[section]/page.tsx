import { notFound } from "next/navigation";
import Link from "next/link";
import { destinations } from "@/lib/shared/navigation";
import { requireSession } from "@/lib/server/auth";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return {
    title:
      destinations.find((d) => d.href === `/${section}`)?.label ?? "Not found",
  };
}
export default async function Placeholder({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await requireSession();
  const { section } = await params;
  const destination = destinations.find((d) => d.href === `/${section}`);
  if (!destination) notFound();
  return (
    <section className={`placeholder ${destination.color}`}>
      <span className="placeholder-icon" aria-hidden="true">
        {destination.symbol}
      </span>
      <p className="eyebrow">A NEW CHAPTER IS ON ITS WAY</p>
      <h1>{destination.label}</h1>
      <p className="placeholder-description">{destination.detail}</p>
      <div className="placeholder-note">
        <h2>We’re making room for this.</h2>
        <p>
          This is a placeholder for a future phase. For now, we’re building the
          foundations of our family’s place.
        </p>
      </div>
      <Link className="secondary-button" href="/home">
        Back to our place <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
