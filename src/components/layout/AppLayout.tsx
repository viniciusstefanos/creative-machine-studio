import { ReactNode, useEffect, useState } from "react";
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AppLayout = ({ children, breadcrumbs = [] }: AppLayoutProps) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    const handler = () => {
      try { setCollapsed(localStorage.getItem("sidebar-collapsed") === "true"); } catch {}
    };
    window.addEventListener("storage", handler);
    const interval = setInterval(handler, 200);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);

  const ml = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--bg-base))" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col transition-all duration-200" style={{ marginLeft: 0 }}>
        <div className="hidden md:block" style={{ marginLeft: ml }}>
          <Header breadcrumbs={breadcrumbs} />
        </div>
        <div className="md:hidden">
          <Header breadcrumbs={breadcrumbs} />
        </div>
        <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8 transition-all duration-200" style={{ marginLeft: 0 }}>
          <div className="hidden md:block" style={{ marginLeft: ml }}>
            <div className="max-w-[1100px] mx-auto">{children}</div>
          </div>
          <div className="md:hidden">
            <div className="max-w-[1100px] mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};
