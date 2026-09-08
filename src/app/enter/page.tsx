import { SignIn } from "@/components/sign-in";
export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome home" };
export default function Enter() {
  return (
    <SignIn
      configured={Boolean(process.env.DATABASE_URL && process.env.APP_ORIGIN)}
    />
  );
}
