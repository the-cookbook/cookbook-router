import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BrokenPageState {
  shouldBreak: boolean;
  resetTimer: ReturnType<typeof setTimeout> | undefined;
}

const brokenPageState: BrokenPageState = {
  shouldBreak: true,
  resetTimer: undefined,
};

function scheduleSelfRecovery(): void {
  if (brokenPageState.resetTimer) {
    return;
  }

  brokenPageState.resetTimer = setTimeout(() => {
    brokenPageState.shouldBreak = false;
    brokenPageState.resetTimer = undefined;
  }, 500);
}

function breakOnNextRender(): void {
  if (brokenPageState.resetTimer) {
    clearTimeout(brokenPageState.resetTimer);
    brokenPageState.resetTimer = undefined;
  }

  brokenPageState.shouldBreak = true;
}

export function BrokenPage(): React.ReactNode {
  const [, forceRender] = React.useReducer((value: number) => value + 1, 0);

  if (brokenPageState.shouldBreak) {
    scheduleSelfRecovery();

    throw new Error(
      'Broken page demo: this route intentionally failed so the error boundary can be previewed.'
    );
  }

  const onBreakClick = (): void => {
    breakOnNextRender();
    forceRender();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <Card className="w-full max-w-md border border-emerald-200 bg-emerald-100/40 dark:border-emerald-800 dark:bg-emerald-100/20">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mt-5 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Recovered from error
            </h1>

            <p className="text-sm text-muted-foreground">
              This route failed once, the error boundary caught it, and the next
              render recovered successfully.
            </p>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={onBreakClick}>
              Break it again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
