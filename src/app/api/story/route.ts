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
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const mixer = url.searchParams.get("mixer");
    if (mixer) return success(await service.mixerView(s!, mixer));
    return success(id ? await service.book(s!, id) : await service.landing(s!));
  } catch (e) {
    return failure(e);
  }
}
