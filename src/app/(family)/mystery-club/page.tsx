import { requireSession } from "@/lib/server/auth";
import { MysteryClub } from "@/components/mystery/club";
export const metadata = { title: "Mystery Club" };
export default async function MysteryPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const s = await requireSession();
  const params = await searchParams;
  return (
    <MysteryClub profile={s.profile} initialSession={params.session ?? null} />
  );
}
