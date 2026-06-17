import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/progress-bar';

import type { SectionTypeSummary } from './utils/reports';
import { getProgressPercentage } from './utils/reports';

interface SectionTypeSummaryCardProps {
  items: SectionTypeSummary[];
}

export function SectionTypeSummaryCard({ items }: SectionTypeSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Section Type Summary</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4">
        {items.map((item) => {
          const percentage = getProgressPercentage(item.done, item.total);

          return (
            <div key={item.id} className="grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{item.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.done} done · {item.inProcess} in process
                  </p>
                </div>

                <Badge variant="secondary">{item.total} total</Badge>
              </div>

              <ProgressBar value={percentage} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
