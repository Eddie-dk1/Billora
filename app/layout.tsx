import type { Metadata } from "next";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Billora",
  description: "Recurring payments tracker MVP",
};

const themeBootScript = `(() => {
  try {
    const key = 'billora-theme';
    const saved = localStorage.getItem(key);
    const theme = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();`;

function NavFallback() {
  return <div className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)]/80" />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <div className="app-shell">
          <header className="sticky top-0 z-20 px-3 pt-3">
            <div className="glass-header px-4 py-3 backdrop-blur">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Personal Finance
                  </div>
                  <div className="text-xl font-bold text-[var(--ink)]">Billora</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
                    MVP
                  </div>
                  <ThemeToggle />
                </div>
              </div>
              <div className="mt-3">
                <Suspense fallback={<NavFallback />}>
                  <AppNav />
                </Suspense>
              </div>
            </div>
          </header>
          <main className="px-3 py-4">{children}</main>
        </div>
      </body>
    </html>
  );
}

