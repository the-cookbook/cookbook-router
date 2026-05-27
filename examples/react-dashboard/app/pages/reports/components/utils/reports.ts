export interface ReportStat {
  id: string;
  title: string;
  value: string;
  description: string;
  trend: string;
}

export interface ReportProgress {
  label: string;
  value: number;
  total: number;
}

export interface ReviewerWorkload {
  id: string;
  reviewer: string;
  username: string;
  assigned: number;
  completed: number;
  inProcess: number;
  overdue: number;
}

export interface SectionTypeSummary {
  id: string;
  type: string;
  total: number;
  done: number;
  inProcess: number;
}

export interface SectionRisk {
  id: string;
  header: string;
  type: string;
  reviewer: string;
  target: number;
  limit: number;
  status: 'On Track' | 'At Risk' | 'Over Limit';
}

export interface RecentExport {
  id: string;
  name: string;
  format: 'PDF' | 'CSV' | 'XLSX';
  createdBy: string;
  createdAt: string;
}

export function getProgressPercentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
