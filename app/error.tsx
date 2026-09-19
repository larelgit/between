"use client";
import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="signin-page">
      <section className="signin-card">
        <Link className="brand" href="/" aria-label="Between home">
          <span className="brand-mark" aria-hidden="true">
            b
          </span>
          between<span className="brand-period">.</span>
        </Link>
        <h1>Your workspace couldn’t open.</h1>
        <p>
          Try again to reconnect. Your saved connections are still in your
          account.
        </p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
