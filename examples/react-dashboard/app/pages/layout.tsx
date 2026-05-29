import React from 'react';
import { Outlet, Slot, useMatches } from '@cookbook/router-react';
import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { Skeleton } from '@/components/ui/skeleton';

export function LayoutPage() {
  const matches = useMatches();

  const headerDimensions = React.useMemo(() => {
    const filtered = matches.filter(
      (match) =>
        match.route.meta?.headerHeight !== null &&
        match.route.meta?.headerHeight !== undefined
    );

    const result = { height: 12 };

    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i]!;

      result.height =
        (entry.route.meta?.headerHeight as number | undefined) ?? result.height;
    }

    return result;
  }, [matches]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="cookbook-theme">
      <TooltipProvider>
        <SidebarProvider
          style={
            {
              '--sidebar-width': 'calc(var(--spacing) * 72)',
              '--header-height': `calc(var(--spacing) * ${headerDimensions.height})`,
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset">
            <Slot name="sidebar" />
          </AppSidebar>
          <SidebarInset>
            <Header>
              <React.Suspense
                fallback={
                  <div>
                    <Skeleton className="h-4 w-32" />
                  </div>
                }
              >
                <Slot name="header" />
              </React.Suspense>
            </Header>
            <Outlet />
          </SidebarInset>
          <Slot name="modal" />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
