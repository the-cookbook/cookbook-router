import { Skeleton } from '@/components/ui/skeleton';

export function PoliciesPageSkeleton() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 space-y-4">
        <Skeleton className="h-6 w-28 rounded-full" />

        <div className="space-y-2">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-3/4 max-w-xl" />
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="space-y-2 p-6">
          <Skeleton className="h-7 w-64" />
        </div>

        <div className="space-y-8 p-6 pt-0">
          <div className="rounded-lg border bg-muted/40 p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>

          {Array.from({ length: 8 }).map((_, index) => (
            <section key={index} className="space-y-3">
              {!!index && <Skeleton className="mb-6 h-px w-full" />}

              <Skeleton className="h-6 w-56" />

              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
