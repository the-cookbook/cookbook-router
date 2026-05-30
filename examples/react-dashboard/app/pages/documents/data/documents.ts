export interface DocumentItem {
  id: string;
  title: string;
  type: 'Policy' | 'Report' | 'Export' | 'Technical' | 'Checklist';
  status: 'Draft' | 'In Review' | 'Complete' | 'At Risk' | 'Over Limit';
  owner: string;
  reviewer: string;
  updatedAt: string;
  completion: number;
  sections: number;
  description: string;
  summary: string;
}

export const documents: DocumentItem[] = [
  {
    id: 'security-measures-data-protection',
    title: 'Security Measures and Data Protection Policies',
    type: 'Policy',
    status: 'Over Limit',
    owner: 'Maya Johnson',
    reviewer: 'Assign reviewer',
    updatedAt: 'Today, 9:12 AM',
    completion: 58,
    sections: 12,
    description:
      'Defines safeguards, access controls, and data handling procedures across the framework.',
    summary:
      'This policy document tracks sensitive data handling requirements, reviewer notes, and unresolved limits that need to be addressed before export.',
  },
  {
    id: 'system-architecture-overview',
    title: 'System Architecture Overview',
    type: 'Technical',
    status: 'At Risk',
    owner: 'Alex Morgan',
    reviewer: 'Nina Patel',
    updatedAt: 'Yesterday, 4:20 PM',
    completion: 74,
    sections: 8,
    description:
      'High-level architecture notes covering service boundaries, routing flows, and deployment assumptions.',
    summary:
      'This document summarizes the application architecture, route ownership, integration boundaries, and pending technical review items.',
  },
  {
    id: 'section-completion-report',
    title: 'Section Completion Report',
    type: 'Export',
    status: 'Complete',
    owner: 'Jamik Tashpulatov',
    reviewer: 'Maya Johnson',
    updatedAt: 'Yesterday, 4:15 PM',
    completion: 100,
    sections: 18,
    description:
      'Generated export summarizing section progress, ownership, limits, and reviewer coverage.',
    summary:
      'This completed export provides a snapshot of framework readiness, section-level completion, and review coverage.',
  },
  {
    id: 'compliance-documentation',
    title: 'Compliance Documentation',
    type: 'Report',
    status: 'Over Limit',
    owner: 'Sarah Chen',
    reviewer: 'Owen Lee',
    updatedAt: 'Mar 18, 2:30 PM',
    completion: 61,
    sections: 15,
    description:
      'Compliance notes, evidence references, and sign-off requirements for framework review.',
    summary:
      'This report collects compliance evidence, policy references, and unresolved review comments for final validation.',
  },
  {
    id: 'release-readiness-checklist',
    title: 'Release Readiness Checklist',
    type: 'Checklist',
    status: 'In Review',
    owner: 'Daniel Kim',
    reviewer: 'Priya Shah',
    updatedAt: 'Mar 17, 11:05 AM',
    completion: 82,
    sections: 10,
    description:
      'Checklist used to validate documentation, review ownership, export status, and release blockers.',
    summary:
      'This checklist tracks the final readiness steps before publishing or exporting the framework package.',
  },
  {
    id: 'api-routing-contract-notes',
    title: 'API Routing Contract Notes',
    type: 'Technical',
    status: 'Draft',
    owner: 'Elena Torres',
    reviewer: 'Unassigned',
    updatedAt: 'Mar 15, 5:45 PM',
    completion: 36,
    sections: 6,
    description:
      'Draft notes covering generated route contracts, params, search values, and path constraints.',
    summary:
      'This draft explains how route contracts are generated and how typed params/search values are validated.',
  },
];

export function getDocumentById(documentId: string) {
  return documents.find((document) => document.id === documentId);
}
