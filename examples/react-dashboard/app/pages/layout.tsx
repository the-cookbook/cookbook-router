import React from 'react';
import { Outlet, Slot, useRouteMeta } from '@cookbook/router-react';
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
  const meta = useRouteMeta({
    includeAncestors: true,
    merge: 'leaf',
  });

  React.useEffect(() => {
    const ref = toast.warning(
      'Page loading is intentionally slowed down to showcase loading and transitions states.',
      { position: 'top-right' }
    );

    return () => {
      toast.dismiss(ref);
    };
  }, []);

  const headerDimensions = React.useMemo(() => {
    // @ts-expect-error: headerHeight meta may or may not exist on route tree
    return { height: meta?.headerHeight ?? 12 };
  }, [meta]);

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
            <Slot
              name="header"
              errorFallback={({ error }) => {
                const msg =
                  error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                      ? error
                      : '';
                return (
                  <div className="text-xs">
                    Oops: <span className="font-mono">{msg}</span>
                  </div>
                );
              }}
            />
          </React.Suspense>
        </Header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
