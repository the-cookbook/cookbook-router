import { ChartAreaInteractive } from './chart-area-interactive';
import { DataTable } from './data-table';
import { SectionCards } from './section-cards';
import data from './data.json';

export function DashboardLayoutHeader() {
  return <h1 className="text-base font-medium">Dashboard</h1>;
}

export function DashboardCreateModal() {
  return (
    <div
      className="absolute top-0 z-50 h-full w-full bg-black"
      role="presentation"
    >
      <section
        className="modal stack"
        role="dialog"
        aria-label="Blog post modal"
      >
        <h1 className="text-base font-medium">Create Modal</h1>
      </section>
    </div>
  );
}

export function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
