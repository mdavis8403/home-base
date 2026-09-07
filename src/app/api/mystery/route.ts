import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { database } from "@/lib/server/db";
import { MysteryService } from "@/lib/server/mystery/service";
import { success, failure } from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    const s = await currentSession();
    const guard: AuthService = auth();
    guard.require(s, "family:use");
    const service = new MysteryService(database());
    const id = new URL(request.url).searchParams.get("session");
    return success(id ? await service.view(s!, id) : await service.library(s!));
  } catch (e) {
    return failure(e);
  }
}
