import React from 'react';
import { useNavigate } from '@cookbook/router-react';
import { ArrowLeft, Search, UserX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UserNotFoundProps {
  slug: string;
  username: string;
}

export function UserNotFound({ slug, username }: UserNotFoundProps) {
  const navigate = useNavigate();

  const handleOnBackClick = React.useCallback(() => {
    navigate.back();
  }, [navigate]);

  const handleOnUsersClick = React.useCallback(() => {
    navigate.to('users.index');
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <UserX className="size-7 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              User not found
            </h1>

            <p className="text-sm text-muted-foreground">
              We could not find a user matching{' '}
              <span className="font-medium text-foreground">{username}</span>.
              The profile may have been removed, renamed, or the link may be
              incorrect.
            </p>
          </div>

          <div className="w-full rounded-lg border bg-muted/40 p-3 text-left text-sm">
            <div className="text-muted-foreground">Requested user</div>
            <div className="mt-1 font-mono text-foreground">{slug}</div>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {window.history.state?.lenght > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleOnBackClick}
              >
                <ArrowLeft className="size-4" />
                Go back
              </Button>
            )}

            <Button onClick={handleOnUsersClick}>
              <Search className="size-4" />
              Browse users
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
