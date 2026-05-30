import { Button } from '@/components/ui/button';
import { Reports } from './components/reports-page';

export function ReportsLayoutHeader() {
  return (
    <div className="flex w-full items-center justify-between">
      <h1 className="text-base font-medium">Reports</h1>

      <div className="flex items-center gap-2">
        <Button variant="outline">Export CSV</Button>
        <Button>Generate Report</Button>
      </div>
    </div>
  );
}

export function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="space-y-6 px-4 lg:px-6">
            <Reports />
          </div>
        </div>
      </div>
    </div>
  );
}
