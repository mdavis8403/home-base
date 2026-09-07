import { requireSession } from "@/lib/server/auth";
import { messages } from "@/lib/server/message-service";
import { Messages } from "@/components/messages/messages";
export const metadata = { title: "Messages" };
export default async function MessagesPage() {
  const session = await requireSession();
  return (
    <Messages
      profile={session.profile}
      initial={await messages().list(session)}
    />
  );
}
