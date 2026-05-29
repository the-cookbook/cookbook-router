import React from 'react';
import { Outlet, Slot, useMatches } from '@cookbook/router-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { Skeleton } from '@/components/ui/skeleton';

export function RootLayoutPage() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="cookbook-theme">
      <TooltipProvider>
        <Outlet />
        <Slot name="modal" />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export function LayoutPage() {
  const matches = useMatches();

  React.useEffect(() => {
    toast.warning(
      'Page loading is intentionally slowed down to showcase loading states.',
      { position: 'top-right' }
    );
  }, []);

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
    </SidebarProvider>
  );
}
