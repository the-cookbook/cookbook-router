import { AlertTriangle, CheckCircle2, Clock3, FileWarning } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import type { DocumentItem } from '../data/documents';

interface DocumentStatusBadgeProps {
  status: DocumentItem['status'];
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  if (status === 'Complete') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CheckCircle2 className="size-3.5 text-emerald-500" />
        Complete
      </Badge>
    );
  }

  if (status === 'In Review') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Clock3 className="size-3.5 text-muted-foreground" />
        In Review
      </Badge>
    );
  }

  if (status === 'At Risk') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <AlertTriangle className="size-3.5 text-amber-500" />
        At Risk
      </Badge>
    );
  }

  if (status === 'Over Limit') {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <FileWarning className="size-3.5" />
        Over Limit
      </Badge>
    );
  }

  return <Badge variant="secondary">Draft</Badge>;
}
