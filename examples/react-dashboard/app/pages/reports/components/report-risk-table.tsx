import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { SectionRisk } from './utils/reports';

interface ReportRiskTableProps {
  risks: SectionRisk[];
}

function RiskBadge({ status }: { status: SectionRisk['status'] }) {
  if (status === 'On Track') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CheckCircle2 className="size-3.5 fill-emerald-500 text-emerald-500" />
        On Track
      </Badge>
    );
  }

  if (status === 'At Risk') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <span className="size-2 rounded-full bg-amber-500" />
        At Risk
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1.5">
      <AlertTriangle className="size-3.5" />
      Over Limit
    </Badge>
  );
}

export function ReportRiskTable({ risks }: ReportRiskTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Target & Limit Risks</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell className="font-medium">{risk.header}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{risk.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {risk.reviewer}
                  </TableCell>
                  <TableCell className="text-right">{risk.target}</TableCell>
                  <TableCell className="text-right">{risk.limit}</TableCell>
                  <TableCell>
                    <RiskBadge status={risk.status} />
                  </TableCell>
                </TableRow>
              ))}

              {!risks ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No section risks found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
