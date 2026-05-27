import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { getInitials, type UserDetail } from './utils';

interface UserProfileCardProps {
  user: UserDetail;
}

function StatusBadge({ status }: { status: UserDetail['status'] }) {
  if (status === 'Active') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CheckCircle2 className="size-3.5 fill-emerald-500 text-emerald-500" />
        Active
      </Badge>
    );
  }

  if (status === 'Pending') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <span className="size-2 rounded-full bg-amber-500" />
        Pending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-2 rounded-full bg-destructive" />
      Suspended
    </Badge>
  );
}

function RoleBadge({ role }: { role: UserDetail['role'] }) {
  if (role === 'Owner' || role === 'Admin') {
    return (
      <Badge className="gap-1.5">
        <ShieldCheck className="size-3.5" />
        {role}
      </Badge>
    );
  }

  return <Badge variant="secondary">{role}</Badge>;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card className="h-fit">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-24 border">
            <AvatarFallback className="text-2xl">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-4">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <p className="text-sm text-muted-foreground">{user.title}</p>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 text-sm">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Team</p>
              <p className="text-muted-foreground">{user.team}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Joined</p>
              <p className="text-muted-foreground">{user.joinedAt}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Last active</p>
              <p className="text-muted-foreground">{user.lastActive}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
