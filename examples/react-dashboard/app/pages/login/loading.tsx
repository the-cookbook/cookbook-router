import { ChefHat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ChefHat className="size-4" />
          </div>
          Cookbook
        </a>
        <Skeleton className="aspect-square w-full rounded-xl bg-card" />
      </div>
    </div>
  );
}
