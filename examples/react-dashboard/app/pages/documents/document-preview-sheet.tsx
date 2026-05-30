import { ArrowUpRight, FileText } from 'lucide-react';
import { Link, useNavigate } from '@cookbook/router-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import type { DocumentItem } from './data/documents';
import { DocumentStatusBadge } from './components/document-status-badge';

interface DocumentPreviewSheetProps {
  document: DocumentItem;
}

export function DocumentPreviewSheet({ document }: DocumentPreviewSheetProps) {
  const navigate = useNavigate();

  const handleOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    navigate.to('documents.index', {
      preventScrollReset: true,
    });
  };

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-4 text-left">
          <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{document.type}</Badge>
              <DocumentStatusBadge status={document.status} />
            </div>

            <SheetTitle className="text-2xl leading-tight">
              {document.title}
            </SheetTitle>

            <SheetDescription>{document.description}</SheetDescription>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6 p-4">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Owner</span>
              <span className="text-sm font-medium">{document.owner}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Reviewer</span>
              <span className="text-sm font-medium">{document.reviewer}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Sections</span>
              <span className="text-sm font-medium">{document.sections}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Last updated
              </span>
              <span className="text-sm font-medium">{document.updatedAt}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Completion</span>
              <span className="text-muted-foreground">
                {document.completion}%
              </span>
            </div>

            <Progress value={document.completion} />
          </div>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Preview</h3>

            <p className="text-sm leading-6 text-muted-foreground">
              {document.summary}
            </p>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Included sections</h3>

            <div className="grid gap-2">
              {[
                'Ownership and reviewer assignment',
                'Current completion status',
                'Section limits and unresolved blockers',
                'Export readiness and review notes',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link to="documents.details" params={{ documentId: document.id }}>
                Open full page
                <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() =>
                navigate.to('documents.index', {
                  preventScrollReset: true,
                })
              }
            >
              Close preview
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
