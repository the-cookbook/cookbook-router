import React from 'react';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useNavigate } from '@cookbook/router-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { UserDetail } from './utils';

interface UserDetailHeaderProps {
  user: UserDetail;
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  const navigate = useNavigate();

  const handleOnGoBack = React.useCallback(() => {
    if (!window.history.state) {
      navigate.to('users.index');

      return;
    }

    navigate.back();
  }, [navigate]);

  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={handleOnGoBack}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to users</span>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted-foreground">
            Review profile, access level, assignments, and recent activity.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline">Send Message</Button>
        <Button>Edit User</Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open user actions</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem>Change role</DropdownMenuItem>
            <DropdownMenuItem>Reset invitation</DropdownMenuItem>
            <DropdownMenuItem>Transfer assignments</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              Suspend user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
