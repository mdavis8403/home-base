import { cookies } from "next/headers";
import { z } from "zod";
import {
  auth,
  cookieNames,
  cookieOptions,
  currentSession,
} from "@/lib/server/auth";
import {
  assertSameOrigin,
  failure,
  readJson,
  success,
} from "@/lib/server/http";
import type { AuthService } from "@/lib/server/auth-service";
import { AppError } from "@/lib/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const passcode = z.string().min(1).max(256);
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    assertSameOrigin(request);
    const { action } = await context.params;
    if (
      !["family", "profile", "reauth", "sign-out", "revoke-devices"].includes(
        action,
      )
    )
      throw new AppError("NOT_FOUND", "This action does not exist.", 404);
    const body = await readJson(request),
      jar = await cookies(),
      names = cookieNames();
    const service: AuthService = auth();
    if (action === "family") {
      const { phrase } = z.object({ phrase: passcode }).strict().parse(body);
      const result = await service.begin(phrase);
      jar.set(names.challenge, result.challenge, cookieOptions(300));
      return success({ profiles: result.profiles });
    }
    if (action === "profile") {
      const input = z
        .object({
          key: z.enum(["mia", "mom", "dad"]),
          passcode,
          remember: z.boolean(),
        })
        .strict()
        .parse(body);
      const challenge = jar.get(names.challenge)?.value;
      if (!challenge)
        throw new AppError(
          "CHALLENGE_EXPIRED",
          "Please enter the family phrase again.",
          401,
        );
      const result = await service.signIn(
        challenge,
        input.key,
        input.passcode,
        input.remember,
      );
      jar.set(
        names.session,
        result.sessionToken,
        cookieOptions(input.remember ? result.lifetime : undefined),
      );
      jar.set(
        names.device,
        result.deviceToken,
        cookieOptions(input.remember ? result.lifetime : undefined),
      );
      jar.set(names.challenge, "", cookieOptions(0));
      return success({ redirect: "/home" });
    }
    const session = await currentSession();
    service.require(session, "family:use");
    if (action === "reauth") {
      const input = z.object({ passcode }).strict().parse(body);
      await service.reauthenticate(session, input.passcode);
    } else {
      z.object({}).strict().parse(body);
      if (action === "revoke-devices")
        await service.revokeOtherDevices(session);
      if (action === "sign-out") {
        await service.signOut(session);
        for (const name of Object.values(names))
          jar.set(name, "", cookieOptions(0));
      }
    }
    return success({ done: true });
  } catch (error) {
    return failure(error);
  }
}
