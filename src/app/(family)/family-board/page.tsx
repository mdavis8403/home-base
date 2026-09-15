import { requireSession } from "@/lib/server/auth";
import { FamilyBoard } from "@/components/board/board";
export const metadata = { title: "Family Board" };
export default async function BoardPage() {
  // Session is required so the room only mounts for a signed-in family member.
  await requireSession();
  return <FamilyBoard />;
}
