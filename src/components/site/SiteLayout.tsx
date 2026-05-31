import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AnnouncementBar } from "./AnnouncementBar";
import { PopupManager } from "./PopupManager";
import { ActivityToasts } from "./ActivityToasts";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      <PopupManager />
      <ActivityToasts />
    </div>
  );
}
