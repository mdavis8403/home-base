import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth";
import { SignIn } from "@/components/sign-in";
export const dynamic = "force-dynamic";
export const metadata = { title: "Come on in" };
export default async function Enter() {
  if (await currentSession()) redirect("/home");
  const configured = Boolean(
    process.env.DATABASE_URL && process.env.APP_ORIGIN,
  );
  return (
    <main id="main" className="entry-page">
      <Link className="wordmark" href="/">
        ⌂ HOME BASE
      </Link>
      <section className="entry-panel">
        <p className="eyebrow">YOU’RE ALWAYS WELCOME HERE</p>
        <h1>Come on in.</h1>
        {configured ? (
          <SignIn />
        ) : (
          <div className="setup-note">
            <h2>We’re getting your keys ready.</h2>
            <p>
              A parent needs to finish the private family setup before anyone
              can sign in.
            </p>
            <p>
              The setup guide in this project explains how to connect your
              family’s secure storage and choose your passcodes.
            </p>
          </div>
        )}
      </section>
      <p className="entry-footer">Just our family. Just our place.</p>
    </main>
  );
}
