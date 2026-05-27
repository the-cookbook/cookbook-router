import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'The page failed to load. Try again or go back to the previous page.',
  onRetry,
  onBack,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>

          <div className="mt-5 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {onBack ? (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 size-4" />
                Go back
              </Button>
            ) : null}

            {onRetry ? (
              <Button onClick={onRetry}>
                <RefreshCcw className="mr-2 size-4" />
                Try again
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
