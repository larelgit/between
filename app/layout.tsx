import type { Metadata } from "next";
import "./globals.css";
import { AppearanceProvider } from "./theme";
export const metadata: Metadata = {
  title: {
    default: "Between | Your conversation workspace",
    template: "%s | Between",
  },
  description:
    "Your private workspace for understanding conversations, choosing an honest next step, and learning from what happens.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
