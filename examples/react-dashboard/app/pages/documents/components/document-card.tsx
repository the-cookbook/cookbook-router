import { ArrowUpRight, FileText } from 'lucide-react';
import { Link } from '@cookbook/router-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { ProgressBar } from '@/components/progress-bar';

import type { DocumentItem } from '../data/documents';

import { DocumentStatusBadge } from './document-status-badge';
import { DocumentPreview } from '../page';
import { cn } from '@/lib/utils';

interface DocumentCardProps extends Pick<
  React.ComponentProps<'div'>,
  'className' | 'style'
> {
  document: DocumentItem;
}

export function DocumentCard({
  document,
  className,
  style,
}: DocumentCardProps) {
  return (
    <Card
      className={cn('group transition-colors hover:bg-muted/30', className)}
      style={style}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>

          <DocumentStatusBadge status={document.status} />
        </div>

        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            {document.type}
          </Badge>

          <h3 className="line-clamp-2 text-base font-semibold tracking-tight">
            <Link
              to="documents.details"
              params={{ documentId: document.id }}
              className="hover:underline"
              prefetch="mount"
            >
              {document.title}
            </Link>
          </h3>

          <p className="line-clamp-2 text-sm text-muted-foreground">
            {document.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Owner</span>
            <span className="font-medium">{document.owner}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Sections</span>
            <span className="font-medium">{document.sections}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Updated</span>
            <span className="font-medium">{document.updatedAt}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Completion</span>
            <span className="text-muted-foreground">
              {document.completion}%
            </span>
          </div>

          <ProgressBar value={document.completion} />
        </div>
      </CardContent>

      <CardFooter>
        <Link
          to="documents.details"
          params={{ documentId: document.id }}
          intercept={{
            slot: 'modal',
            view: DocumentPreview,
          }}
          preventScrollReset={true}
          className="inline-flex items-center text-sm font-medium text-foreground hover:underline"
        >
          Preview document
          <ArrowUpRight className="ml-1 size-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
