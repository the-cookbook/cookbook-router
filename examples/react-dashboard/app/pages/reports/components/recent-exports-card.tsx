import { Download, FileSpreadsheet, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { RecentExport } from './utils/reports';

interface RecentExportsCardProps {
  exports: RecentExport[];
}

function ExportIcon({ format }: { format: RecentExport['format'] }) {
  if (format === 'PDF') {
    return <FileText className="size-4 text-muted-foreground" />;
  }

  return <FileSpreadsheet className="size-4 text-muted-foreground" />;
}

export function RecentExportsCard({ exports }: RecentExportsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Exports</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-3">
        {exports.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-lg border p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-md border p-2">
                <ExportIcon format={item.format} />
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  Created by {item.createdBy} · {item.createdAt}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">{item.format}</Badge>
              <Button variant="outline" size="icon" className="size-8">
                <Download className="size-4" />
                <span className="sr-only">Download {item.name}</span>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
