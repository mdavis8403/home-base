import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { boardService } from "@/lib/server/board-service";
import { success, failure } from "@/lib/server/http";
export async function GET() {
  try {
    const s = await currentSession();
    const guard: AuthService = auth();
    guard.require(s, "family:use");
    return success(await boardService().list(s!));
  } catch (e) {
    return failure(e);
  }
}
