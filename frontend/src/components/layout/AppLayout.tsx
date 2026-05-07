import type { ReactNode } from 'react';

export type AppLayoutProps = {
  topbar: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
};

export function AppLayout({ topbar, sidebar, children }: AppLayoutProps) {
  return (
    <div className="app" style={{ height: '100vh' }}>
      {topbar}
      <div className="main">
        {sidebar}
        <div className="content mj-scroll">{children}</div>
      </div>
    </div>
  );
}
