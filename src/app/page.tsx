import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth";
import { Clubhouse } from "@/components/clubhouse";
export const dynamic = "force-dynamic";
export default async function Door() {
  if (await currentSession()) redirect("/home");
  return (
    <main id="main" className="door-page">
      <header className="wordmark">
        <span aria-hidden="true">⌂</span> HOME BASE
      </header>
      <div className="door-content">
        <p className="eyebrow">OUR LITTLE CORNER OF THE WORLD</p>
        <Clubhouse />
        <h1>
          There’s no place
          <br />
          like <em>here.</em>
        </h1>
        <p className="door-tagline">No matter where we are, we meet here.</p>
        <Link className="button" href="/enter">
          Enter Home Base <span aria-hidden="true">→</span>
        </Link>
        <p className="door-footnote">A place for Mia, Mom & Dad.</p>
      </div>
      <footer>
        Made for the three of us. <span aria-hidden="true">✧</span>
      </footer>
    </main>
  );
}
