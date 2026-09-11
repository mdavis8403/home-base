import { requireSession } from "@/lib/server/auth";
import { hasPermission } from "@/lib/shared/permissions";
import { messages } from "@/lib/server/message-service";
import { ClubhouseExperience } from "@/components/clubhouse/experience";
export const metadata = { title: "Messages" };
export default async function MessagesPage() {
  const session = await requireSession();
  const inbox = await messages().list(session);
  const unread = inbox.filter(
    (m) => m.isRecipient && !m.read && !m.scheduled,
  ).length;
  return (
    <ClubhouseExperience
      profile={session.profile}
      initialView="messages"
      initialMessages={inbox}
      unread={unread}
      canManage={hasPermission(session.profile.role, "settings:view")}
    />
  );
}
