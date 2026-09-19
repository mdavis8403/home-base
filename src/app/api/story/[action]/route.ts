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
      .enum(["mixer-start", "mixer-answer", "mixer-reveal", "choose"])
      .parse((await params).action);
    const raw = await readJson(request);
    const service = storyService();
    if (action === "mixer-start")
      return success(await service.startMixer(s!, raw));
    if (action === "mixer-answer")
      return success(await service.mixerAnswer(s!, raw));
    if (action === "mixer-reveal")
      return success(await service.mixerReveal(s!, raw));
    return success(await service.choose(s!, raw));
  } catch (e) {
    return failure(e);
  }
}
