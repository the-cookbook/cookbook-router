import type * as React from 'react';
import { BadgeCheck, Clock, FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { UserDetail } from './utils';

interface UserDetailStatsProps {
  user: UserDetail;
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function UserDetailStats({ user }: UserDetailStatsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Assigned sections"
        value={`${user.assignedSections}`}
        description="Total sections owned"
        icon={FileText}
      />

      <StatCard
        title="Completed reviews"
        value={`${user.completedReviews}`}
        description="Finished review tasks"
        icon={BadgeCheck}
      />

      <StatCard
        title="Pending reviews"
        value={`${user.pendingReviews}`}
        description="Awaiting review action"
        icon={Clock}
      />
    </section>
  );
}
