import { z } from "zod";
import { currentSession, auth } from "@/lib/server/auth";
import { AuthService } from "@/lib/server/auth-service";
import { database } from "@/lib/server/db";
import { MysteryService } from "@/lib/server/mystery/service";
import { launchCases } from "@/lib/server/mystery/launch";
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
      .enum(["install", "new", "event", "preview", "publish", "publication"])
      .parse((await params).action);
    const raw = await readJson(
      request,
      ["preview", "publish"].includes(action) ? 1_000_000 : 4096,
    );
    const service = new MysteryService(database());
    if (action === "install") {
      z.object({}).strict().parse(raw);
      return success(await service.install(s!, launchCases));
    }
    if (action === "new") return success(await service.newGame(s!, raw));
    if (action === "event") return success(await service.event(s!, raw));
    if (action === "preview") return success(service.preview(s!, raw));
    if (action === "publish") return success(await service.publish(s!, raw));
    await service.publication(s!, raw);
    return success({});
  } catch (e) {
    return failure(e);
  }
}
