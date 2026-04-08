import { ReactNode, useEffect, useState } from "react";
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AppLayout = ({ children, breadcrumbs = [] }: AppLayoutProps) => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true" ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
    } catch { return SIDEBAR_WIDTH; }
  });

  useEffect(() => {
    const sync = () => {
      try {
        const c = localStorage.getItem("sidebar-collapsed") === "true";
        setSidebarWidth(c ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH);
      } catch {}
    };
    window.addEventListener("storage", sync);
    // Poll for same-tab changes
    const id = setInterval(sync, 150);
    return () => { window.removeEventListener("storage", sync); clearInterval(id); };
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--bg-base))" }}>
      <Sidebar />
      <div
        className="flex-1 flex flex-col ml-0 transition-all duration-200"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header breadcrumbs={breadcrumbs} />
        <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-[1100px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
