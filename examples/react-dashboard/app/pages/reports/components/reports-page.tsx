import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  FileText,
} from 'lucide-react';

import {
  recentExports,
  reportProgress,
  reportStats,
  reviewerWorkload,
  sectionRisks,
  sectionTypeSummary,
} from './data/reports';
import { RecentExportsCard } from './recent-exports-card';
import { ReportProgressCard } from './report-progress-card';
import { ReportRiskTable } from './report-risk-table';
import { ReportStatCard } from './report-stat-card';
import { ReviewerWorkloadCard } from './reviewer-workload-card';
import { SectionTypeSummaryCard } from './section-type-summary-card';

const statIcons = [FileText, CheckCircle2, CircleDashed, AlertTriangle];

export function Reports() {
  return (
    <main className="flex min-h-screen animate-in flex-col gap-6 bg-background p-6 duration-500 fade-in slide-in-from-bottom-2">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Track framework completion, reviewer workload, target limits, and
            section-level risk.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportStats.map((stat, index) => (
          <ReportStatCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            trend={stat.trend}
            icon={statIcons[index] ?? FileText}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          <ReportProgressCard items={reportProgress} />
          <ReportRiskTable risks={sectionRisks} />
        </div>

        <div className="grid gap-6">
          <SectionTypeSummaryCard items={sectionTypeSummary} />
          <RecentExportsCard exports={recentExports} />
        </div>
      </section>

      <section>
        <ReviewerWorkloadCard reviewers={reviewerWorkload} />
      </section>
    </main>
  );
}
