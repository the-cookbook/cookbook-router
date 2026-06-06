import { FileText, Search } from 'lucide-react';
import { useParams } from '@cookbook/router-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';

import { documents, getDocumentById } from './data/documents';
import { DocumentCard } from './components/document-card';
import { DocumentPreviewSheet } from './document-preview-sheet';
import { DocumentNotFound } from './details/not-found';

export function DocumentsLayoutHeader() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Documents</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function DocumentPreview() {
  const params = useParams('documents.details');
  const document = getDocumentById(params.documentId);

  if (!document) {
    return <DocumentNotFound documentId={params.documentId} />;
  }

  return <DocumentPreviewSheet document={document} />;
}

export function DocumentsPage() {
  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            Document Library
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>

            <p className="max-w-2xl text-sm text-muted-foreground">
              Browse framework documents, reports, exports, and review packets.
              Open a document from this page to preview it in a sheet, or visit
              it directly to render the full detail page.
            </p>
          </div>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input placeholder="Search documents..." className="pl-9" disabled />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </section>
    </main>
  );
}
