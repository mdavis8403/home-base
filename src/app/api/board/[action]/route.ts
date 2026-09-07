import { z } from "zod";
import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { boardService } from "@/lib/server/board-service";
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
      .enum(["open", "respond", "prompt", "settings"])
      .parse((await params).action);
    const body = await readJson(
      request,
      action === "respond" ? 12_000_000 : 4096,
    );
    const service = boardService();
    if (action === "open") {
      z.object({}).strict().parse(body);
      return success(await service.open(s!));
    }
    if (action === "respond") await service.respond(s!, body);
    if (action === "prompt") await service.addPrompt(s!, body);
    if (action === "settings") await service.settings(s!, body);
    return success({});
  } catch (e) {
    return failure(e);
  }
}
