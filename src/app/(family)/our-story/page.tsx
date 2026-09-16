import { requireSession } from "@/lib/server/auth";
import { OurStory } from "@/components/story/our-story";
export const metadata = { title: "Our Story" };
export default async function OurStoryPage() {
  const s = await requireSession();
  return <OurStory profile={s.profile} />;
}
