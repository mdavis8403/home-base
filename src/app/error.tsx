"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="entry-page">
      <h1>A little hiccup.</h1>
      <p>Home Base couldn’t connect just now. Please try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
