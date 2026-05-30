import {
  ArrowLeft,
  CalendarClock,
  FileText,
  Layers3,
  UserRound,
} from 'lucide-react';
import { Link, useParams } from '@cookbook/router-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import { getDocumentById } from '../data/documents';
import { DocumentStatusBadge } from '../components/document-status-badge';
import { DocumentNotFound } from './not-found';

export function DocumentDetailLayoutHeader() {
  const params = useParams('documents.details');
  const document = getDocumentById(params.documentId);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="documents">Documents</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {document ? document.title : 'Document not found'}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function DocumentDetailPage() {
  const params = useParams('documents.details');
  const document = getDocumentById(params.documentId);

  if (!document) {
    return <DocumentNotFound documentId={params.documentId} />;
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background p-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="outline" className="w-fit">
          <Link to="documents">
            <ArrowLeft className="mr-2 size-4" />
            Back to documents
          </Link>
        </Button>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{document.type}</Badge>
              <DocumentStatusBadge status={document.status} />
            </div>

            <div className="space-y-2">
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight">
                {document.title}
              </h1>

              <p className="max-w-3xl text-sm text-muted-foreground">
                {document.description}
              </p>
            </div>
          </div>

          <Button>Export document</Button>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Summary</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="leading-7 text-muted-foreground">
                {document.summary}
              </p>

              <Separator />

              <div className="grid gap-3">
                {[
                  'Review current ownership and assigned sections.',
                  'Resolve open status blockers before export.',
                  'Confirm reviewer notes and completion percentage.',
                  'Validate linked sections against target limits.',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border bg-muted/30 p-3 text-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review Notes</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                This fake document page demonstrates direct route rendering.
                When visited from the document library, the same route can be
                intercepted and displayed in a sheet preview.
              </p>

              <p>
                Direct navigation renders this full-page version, making it
                useful for shareable links, refreshes, and browser history.
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
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

              <div className="grid gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <UserRound className="size-4 text-muted-foreground" />

                  <div>
                    <div className="text-muted-foreground">Owner</div>
                    <div className="font-medium">{document.owner}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserRound className="size-4 text-muted-foreground" />

                  <div>
                    <div className="text-muted-foreground">Reviewer</div>
                    <div className="font-medium">{document.reviewer}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Layers3 className="size-4 text-muted-foreground" />

                  <div>
                    <div className="text-muted-foreground">Sections</div>
                    <div className="font-medium">{document.sections}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CalendarClock className="size-4 text-muted-foreground" />

                  <div>
                    <div className="text-muted-foreground">Last updated</div>
                    <div className="font-medium">{document.updatedAt}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-muted-foreground" />

                  <div>
                    <div className="text-muted-foreground">Document type</div>
                    <div className="font-medium">{document.type}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}
