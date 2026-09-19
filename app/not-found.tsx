import Link from "next/link";
import type { Metadata } from "next";
import { ThemeToggle } from "./theme";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This page is unavailable. Return to your private Between workspace.",
};

export default function NotFound() {
  return (
    <main className="signin-page">
      <div className="utility-top">
        <Link className="brand" href="/" aria-label="Between home">
          <span className="brand-mark" aria-hidden="true">
            b
          </span>
          between<span className="brand-period">.</span>
        </Link>
        <ThemeToggle />
      </div>
      <section className="signin-card not-found-card">
        <p className="error-code">404</p>
        <h1>This page isn’t here.</h1>
        <p>
          The link may have changed. Your connections and saved decisions are in
          your workspace.
        </p>
        <Link className="button primary" href="/">
          Back to your workspace
        </Link>
      </section>
    </main>
  );
}
