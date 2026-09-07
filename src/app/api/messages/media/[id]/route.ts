import { AuthService } from "@/lib/server/auth-service";
import { currentSession, auth } from "@/lib/server/auth";
import { messages } from "@/lib/server/message-service";
import { success, failure } from "@/lib/server/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await currentSession();
    const guard: AuthService = auth();
    guard.require(session, "family:use");
    return success(await messages().mediaUrl(session!, (await params).id));
  } catch (error) {
    return failure(error);
  }
}
