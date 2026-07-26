import type { Metadata } from "next";

// The workspace sits behind sign-in, so it gets its own title and is kept out
// of search results — the public landing page is what should rank.
export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
