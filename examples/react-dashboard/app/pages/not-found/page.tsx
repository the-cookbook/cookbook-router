import React from 'react';
import { useNavigate } from '@cookbook/router-react';
import { ArrowLeft, Home, SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function NotFound() {
  const navigate = useNavigate();

  const handleOnBackClick = React.useCallback(() => {
    if (window.history.state.lenght) {
      navigate.back();

      return;
    }

    navigate.to('overview');
  }, [navigate]);

  const handleOnHomeClick = React.useCallback(() => {
    navigate.to('overview');
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-dashed">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <SearchX className="size-7 text-muted-foreground" />
          </div>

          <div className="mt-6 space-y-2">
            <p className="font-mono text-sm font-medium text-muted-foreground">
              404
            </p>
            <h1 className="font-b text-2xl font-semibold tracking-tight">
              Page not found
            </h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist, was moved, or you do
              not have access to it.
            </p>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={handleOnBackClick}>
              <ArrowLeft className="mr-2 size-4" />
              Go back
            </Button>

            <Button onClick={handleOnHomeClick}>
              <Home className="mr-2 size-4" />
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
