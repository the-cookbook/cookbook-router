import { Reports } from './components/reports-page';

export function ReportsLayoutHeader() {
  return <h1 className="text-base font-medium">Reports</h1>;
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
