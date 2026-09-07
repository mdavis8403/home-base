import { requireSession } from "@/lib/server/auth";
import { FamilyBoard } from "@/components/board/board";
export const metadata = { title: "Family Board" };
export default async function BoardPage() {
  const s = await requireSession();
  return <FamilyBoard profile={s.profile} />;
}
