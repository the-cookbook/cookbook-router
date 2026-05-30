import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface SidebarMetric {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sidebarMetrics: SidebarMetric[] = [
  {
    label: 'Ready to export',
    value: '42',
    description: 'Completed sections',
    icon: CheckCircle2,
  },
  {
    label: 'Needs review',
    value: '18',
    description: 'Pending reviewer action',
    icon: Clock3,
  },
  {
    label: 'At risk',
    value: '6',
    description: 'Over target limits',
    icon: AlertTriangle,
  },
];

export function ReportsSidebarWidget() {
  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Report Health</CardTitle>

          <Badge variant="secondary">Live demo</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Snapshot of completion, review status, and export readiness.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Export readiness</span>
            <span className="text-muted-foreground">62%</span>
          </div>

          <Progress value={62} />

          <p className="text-xs text-muted-foreground">
            42 of 68 sections are complete and ready for export.
          </p>
        </div>

        <Separator />

        <div className="grid gap-3">
          {sidebarMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-background">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>

                  <div>
                    <div className="text-sm font-medium">{metric.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {metric.description}
                    </div>
                  </div>
                </div>

                <div className="text-lg font-semibold">{metric.value}</div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Recommended next step</h3>
          </div>

          <p className="text-sm text-muted-foreground">
            Assign reviewers to unclaimed sections before generating the final
            report.
          </p>
        </div>
      </CardContent>

      <CardFooter>
        <Button className="w-full" size="sm">
          Review report status
          <ArrowUpRight className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
