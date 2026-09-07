import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { boardService } from "@/lib/server/board-service";
import { success, failure } from "@/lib/server/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const s = await currentSession();
    const guard: AuthService = auth();
    guard.require(s, "family:use");
    return success(await boardService().mediaUrl(s!, (await params).id));
  } catch (e) {
    return failure(e);
  }
}
