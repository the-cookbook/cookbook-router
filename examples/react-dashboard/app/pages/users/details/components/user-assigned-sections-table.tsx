import { CheckCircle2 } from 'lucide-react';

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

import type { AssignedSection } from './utils';

interface UserAssignedSectionsTableProps {
  sections: AssignedSection[];
}

function SectionStatusBadge({ status }: { status: AssignedSection['status'] }) {
  if (status === 'Done') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CheckCircle2 className="size-3.5 fill-emerald-500 text-emerald-500" />
        Done
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-2 rounded-full border border-muted-foreground" />
      In Process
    </Badge>
  );
}

export function UserAssignedSectionsTable({
  sections,
}: UserAssignedSectionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Sections</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead>Header</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead>Due date</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sections.map((section) => (
                <TableRow key={section.id}>
                  <TableCell className="font-medium">
                    {section.header}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{section.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <SectionStatusBadge status={section.status} />
                  </TableCell>
                  <TableCell className="text-right">{section.target}</TableCell>
                  <TableCell className="text-right">{section.limit}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {section.dueDate}
                  </TableCell>
                </TableRow>
              ))}

              {!sections ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No assigned sections.
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
