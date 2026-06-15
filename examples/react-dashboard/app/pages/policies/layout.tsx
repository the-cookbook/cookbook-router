import React from 'react';
import { Link, useNavigate } from '@cookbook/router-react';
import { ArrowLeft, ChefHat } from 'lucide-react';
import { Outlet } from '@cookbook/router-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';

export function PoliciesLayoutPage() {
  const navigate = useNavigate();

  const handleOnHome = React.useCallback(() => {
    navigate.to('entry');
  }, [navigate]);

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 py-4 lg:gap-2 lg:px-6">
          <Link route="main" className="mx-auto flex gap-2">
            <ChefHat className="size-5!" />
            <span className="text-base font-semibold">Cookbook</span>
          </Link>
        </div>
      </header>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={handleOnHome}
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to users</span>
          </Button>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Go Home</h1>
          </div>
        </div>
      </div>
      <Outlet />
    </>
  );
}
