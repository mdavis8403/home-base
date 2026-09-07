import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="entry-page">
      <h1>This door doesn’t open here.</h1>
      <p>Let’s head back to Home Base.</p>
      <Link className="button" href="/">
        Back home
      </Link>
    </main>
  );
}
