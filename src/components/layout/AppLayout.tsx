import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AppLayout = ({ children, breadcrumbs = [] }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-0 md:ml-[220px]">
        <Header breadcrumbs={breadcrumbs} />
        <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-[1100px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
