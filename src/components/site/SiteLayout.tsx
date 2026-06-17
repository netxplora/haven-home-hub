import { Suspense, lazy } from "react";
import { Header } from "./Header";
import { AnnouncementBar } from "./AnnouncementBar";

const Footer = lazy(() => import("./Footer").then(m => ({ default: m.Footer })));
const PopupManager = lazy(() => import("./PopupManager").then(m => ({ default: m.PopupManager })));
const ActivityToasts = lazy(() => import("./ActivityToasts").then(m => ({ default: m.ActivityToasts })));

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <Suspense fallback={<div className="h-64 bg-muted animate-pulse mt-auto" />}>
        <Footer />
        <PopupManager />
        <ActivityToasts />
      </Suspense>
    </div>
  );
}
