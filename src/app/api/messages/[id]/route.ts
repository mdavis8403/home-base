import { AuthService } from "@/lib/server/auth-service";
import { currentSession, auth } from "@/lib/server/auth";
import { messages } from "@/lib/server/message-service";
import {
  assertSameOrigin,
  readJson,
  success,
  failure,
} from "@/lib/server/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    const guard: AuthService = auth();
    guard.require(session, "family:use");
    await messages().update(
      session!,
      (await params).id,
      await readJson(request),
    );
    return success({});
  } catch (error) {
    return failure(error);
  }
}
