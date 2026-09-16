import { z } from "zod";
import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { storyService } from "@/lib/server/story-service";
import {
  assertSameOrigin,
  readJson,
  success,
  failure,
} from "@/lib/server/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    assertSameOrigin(request);
    const s = await currentSession();
    const guard: AuthService = auth();
    guard.require(s, "family:use");
    const action = z
      .enum(["new", "choose", "input", "revisit"])
      .parse((await params).action);
    const raw = await readJson(request);
    const service = storyService();
    if (action === "new") return success(await service.create(s!, raw));
    if (action === "choose") return success(await service.choose(s!, raw));
    if (action === "input") return success(await service.input(s!, raw));
    return success(await service.revisit(s!, raw));
  } catch (e) {
    return failure(e);
  }
}
