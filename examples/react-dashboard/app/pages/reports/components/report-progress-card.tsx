import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import type { ReportProgress } from './utils/reports';
import { getProgressPercentage } from './utils/reports';

interface ReportProgressCardProps {
  items: ReportProgress[];
}

export function ReportProgressCard({ items }: ReportProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Overview</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-5">
        {items.map((item) => {
          const percentage = getProgressPercentage(item.value, item.total);

          return (
            <div key={item.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.value}/{item.total} · {percentage}%
                </span>
              </div>

              <Progress
                value={percentage}
                className="*:data-[slot=progress-indicator]:bg-emerald-600"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
