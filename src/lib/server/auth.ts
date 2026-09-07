import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthService } from "./auth-service";
import { database } from "./db";
import { appOrigin } from "./config";
export const auth = () => new AuthService(database());
export function cookieNames() {
  const prefix = appOrigin().startsWith("https:") ? "__Host-" : "";
  return {
    session: `${prefix}hb-session`,
    device: `${prefix}hb-device`,
    challenge: `${prefix}hb-challenge`,
  };
}
export function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: appOrigin().startsWith("https:"),
    sameSite: "strict" as const,
    path: "/",
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}
export async function currentSession() {
  // A build and unconfigured entrance do not require a database connection.
  if (!process.env.DATABASE_URL || !process.env.APP_ORIGIN) return null;
  const jar = await cookies(),
    names = cookieNames();
  return auth().session(
    jar.get(names.session)?.value,
    jar.get(names.device)?.value,
  );
}
export async function requireSession() {
  const session = await currentSession();
  if (!session) redirect("/enter");
  return session;
}
