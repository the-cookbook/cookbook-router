import type * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportStatCardProps {
  title: string;
  value: string;
  description: string;
  trend: string;
  icon: React.ElementType;
}

export function ReportStatCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
}: ReportStatCardProps) {
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
        <p className="mt-3 text-xs font-medium">{trend}</p>
      </CardContent>
    </Card>
  );
}
