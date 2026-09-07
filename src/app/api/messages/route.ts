import { AuthService } from "@/lib/server/auth-service";
import { currentSession, auth } from "@/lib/server/auth";
import { messages } from "@/lib/server/message-service";
import {
  assertSameOrigin,
  readJson,
  success,
  failure,
} from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    const session = await currentSession();
    const guard: AuthService = auth();
    guard.require(session, "family:use");
    return success(
      await messages().list(
        session!,
        new URL(request.url).searchParams.get("view") === "sent",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    const guard: AuthService = auth();
    guard.require(session, "family:use");
    return success(
      await messages().send(session!, await readJson(request, 46_000_000)),
    );
  } catch (error) {
    return failure(error);
  }
}
