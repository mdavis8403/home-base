import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { storyService } from "@/lib/server/story-service";
import { success, failure } from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    const s = await currentSession();
    const guard: AuthService = auth();
    guard.require(s, "family:use");
    const service = storyService();
    const id = new URL(request.url).searchParams.get("id");
    return success(id ? await service.book(s!, id) : await service.landing(s!));
  } catch (e) {
    return failure(e);
  }
}
