import Link from "next/link";
import BetweenApp from "./workspace";
import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { ThemeToggle } from "./theme";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  if (!user)
    return (
      <main className="signin-page">
        <div className="utility-top">
          <ThemeToggle />
        </div>
        <div className="signin-card">
          <Link className="brand" href="/" aria-label="Between home">
            <span className="brand-mark" aria-hidden="true">
              b
            </span>
            between
            <span className="brand-period">.</span>
          </Link>
          <h1>A place to think before you reply.</h1>
          <p>
            Keep the conversation, what you want, and what happened next in one
            private workspace. Choose your next step with the evidence in view.
          </p>
          <a
            className="button primary"
            href={chatGPTSignInPath("/")}
            target="_top"
          >
            Sign in with ChatGPT
          </a>
          <small>
            For adults 18 and over. Nothing is ever sent on your behalf.
          </small>
          <p className="copyright">© {new Date().getFullYear()} Between</p>
        </div>
      </main>
    );
  return <BetweenApp />;
}
