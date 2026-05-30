import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Link } from '@cookbook/router-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DocumentNotFoundProps {
  documentId: string;
}

export function DocumentNotFound({ documentId }: DocumentNotFoundProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="size-7 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Document not found
            </h1>

            <p className="text-sm text-muted-foreground">
              We could not find a document matching this route. It may have been
              removed, renamed, or the link may be incorrect.
            </p>
          </div>

          <div className="w-full rounded-lg border bg-muted/40 p-3 text-left text-sm">
            <div className="text-muted-foreground">Requested document</div>
            <div className="mt-1 font-mono text-foreground">{documentId}</div>
          </div>

          <Button asChild className="w-full">
            <Link to="documents">
              <ArrowLeft className="mr-2 size-4" />
              Back to documents
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
