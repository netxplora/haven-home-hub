import { Suspense, lazy } from "react";
import { Header } from "./Header";
import { AnnouncementBar } from "./AnnouncementBar";

const Footer = lazy(() => import("./Footer").then(m => ({ default: m.Footer })));
const PopupManager = lazy(() => import("./PopupManager").then(m => ({ default: m.PopupManager })));
const ActivityToasts = lazy(() => import("./ActivityToasts").then(m => ({ default: m.ActivityToasts })));

export type TransparentNavMode = boolean | "mobile" | "all";

export function SiteLayout({ 
  children, 
  transparentNav 
}: { 
  children: React.ReactNode; 
  transparentNav?: TransparentNavMode; 
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header transparentAtTop={transparentNav} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <Suspense fallback={<div className="h-64 bg-muted animate-pulse mt-auto" />}>
        <Footer />
        <PopupManager />
        <ActivityToasts />
      </Suspense>
    </div>
  );
}
