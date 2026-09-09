import { SignIn } from "@/components/sign-in";
import { isConfigured } from "@/lib/server/cloudflare";
export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome home" };
export default function Enter() {
  return <SignIn configured={isConfigured()} />;
}
