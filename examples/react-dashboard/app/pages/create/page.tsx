import { Button } from '@/components/ui/button';
import { CreateContent } from './create-content';

export function CreateLayoutHeader() {
  return <h1 className="text-base font-medium">Create</h1>;
}

export function CreatePage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="mb-4 space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight">
                Add section
              </h2>
              <p className="text-sm text-muted-foreground">
                Create a new outline section with ownership, status, target, and
                limit details.
              </p>
            </div>
            <CreateContent />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline">Cancel</Button>
              <Button>Create</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
