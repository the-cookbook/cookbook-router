import type {
  RecentExport,
  ReportProgress,
  ReportStat,
  ReviewerWorkload,
  SectionRisk,
  SectionTypeSummary,
} from '../utils/reports';

export const reportStats: ReportStat[] = [
  {
    id: 'stat_001',
    title: 'Total sections',
    value: '68',
    description: 'Across all framework documents',
    trend: '+8 from last cycle',
  },
  {
    id: 'stat_002',
    title: 'Completed',
    value: '42',
    description: 'Sections marked as done',
    trend: '61.7% completion rate',
  },
  {
    id: 'stat_003',
    title: 'In process',
    value: '26',
    description: 'Sections still being drafted or reviewed',
    trend: '9 assigned this week',
  },
  {
    id: 'stat_004',
    title: 'Unassigned',
    value: '18',
    description: 'Sections without a reviewer',
    trend: '-4 since yesterday',
  },
];

export const reportProgress: ReportProgress[] = [
  {
    label: 'Overall completion',
    value: 42,
    total: 68,
  },
  {
    label: 'Reviewer coverage',
    value: 50,
    total: 68,
  },
  {
    label: 'Sections within limit',
    value: 47,
    total: 68,
  },
  {
    label: 'Technical content complete',
    value: 12,
    total: 19,
  },
];

export const reviewerWorkload: ReviewerWorkload[] = [
  {
    id: 'rev_001',
    reviewer: 'Eddie Lake',
    username: 'eddie.lake',
    assigned: 10,
    completed: 8,
    inProcess: 2,
    overdue: 1,
  },
  {
    id: 'rev_002',
    reviewer: 'Jamik Tashpulatov',
    username: 'jamik.tashpulatov',
    assigned: 12,
    completed: 7,
    inProcess: 5,
    overdue: 2,
  },
  {
    id: 'rev_003',
    reviewer: 'Maya Johnson',
    username: 'maya.johnson',
    assigned: 6,
    completed: 3,
    inProcess: 3,
    overdue: 0,
  },
  {
    id: 'rev_004',
    reviewer: 'Sarah Chen',
    username: 'sarah.chen',
    assigned: 4,
    completed: 1,
    inProcess: 3,
    overdue: 1,
  },
  {
    id: 'rev_005',
    reviewer: 'Raj Patel',
    username: 'raj.patel',
    assigned: 5,
    completed: 4,
    inProcess: 1,
    overdue: 0,
  },
];

export const sectionTypeSummary: SectionTypeSummary[] = [
  {
    id: 'type_001',
    type: 'Technical content',
    total: 19,
    done: 12,
    inProcess: 7,
  },
  {
    id: 'type_002',
    type: 'Narrative',
    total: 24,
    done: 16,
    inProcess: 8,
  },
  {
    id: 'type_003',
    type: 'Planning',
    total: 8,
    done: 5,
    inProcess: 3,
  },
  {
    id: 'type_004',
    type: 'Legal',
    total: 5,
    done: 2,
    inProcess: 3,
  },
  {
    id: 'type_005',
    type: 'Research',
    total: 7,
    done: 4,
    inProcess: 3,
  },
];

export const sectionRisks: SectionRisk[] = [
  {
    id: 'risk_001',
    header: 'Capabilities',
    type: 'Narrative',
    reviewer: 'Jamik Tashpulatov',
    target: 20,
    limit: 8,
    status: 'Over Limit',
  },
  {
    id: 'risk_002',
    header: 'Security Measures and Data Protection Policies',
    type: 'Narrative',
    reviewer: 'Assign reviewer',
    target: 6,
    limit: 36,
    status: 'At Risk',
  },
  {
    id: 'risk_003',
    header: 'Compliance Documentation',
    type: 'Legal',
    reviewer: 'Sarah Chen',
    target: 31,
    limit: 27,
    status: 'Over Limit',
  },
  {
    id: 'risk_004',
    header: 'Testing Methodology',
    type: 'Technical content',
    reviewer: 'Assign reviewer',
    target: 17,
    limit: 14,
    status: 'Over Limit',
  },
  {
    id: 'risk_005',
    header: 'System Architecture Overview',
    type: 'Technical content',
    reviewer: 'Maya Johnson',
    target: 24,
    limit: 18,
    status: 'At Risk',
  },
];

export const recentExports: RecentExport[] = [
  {
    id: 'export_001',
    name: 'Reviewer Workload Summary',
    format: 'PDF',
    createdBy: 'Eddie Lake',
    createdAt: 'Today, 9:42 AM',
  },
  {
    id: 'export_002',
    name: 'Section Completion Report',
    format: 'CSV',
    createdBy: 'Jamik Tashpulatov',
    createdAt: 'Yesterday, 4:15 PM',
  },
  {
    id: 'export_003',
    name: 'Target vs Limit Audit',
    format: 'XLSX',
    createdBy: 'Raj Patel',
    createdAt: 'Mar 14, 11:20 AM',
  },
];
