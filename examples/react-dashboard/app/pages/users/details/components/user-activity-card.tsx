import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ActivityItem } from './utils';

interface UserActivityCardProps {
  items: ActivityItem[];
}

export function UserActivityCard({ items }: UserActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4">
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="mt-1 size-2.5 rounded-full bg-primary" />

              {index !== items.length - 1 ? (
                <div className="mt-2 h-full w-px bg-border" />
              ) : null}
            </div>

            <div className="pb-4">
              <p className="text-sm font-medium">{item.action}</p>
              <p className="text-sm text-muted-foreground">{item.target}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.timestamp}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
