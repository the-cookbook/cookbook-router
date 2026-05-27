export interface UserDetail {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Reviewer' | 'Viewer';
  status: 'Active' | 'Pending' | 'Suspended';
  team: string;
  sections: number;
  lastActive: string;
  title: string;
  location: string;
  joinedAt: string;
  assignedSections: number;
  completedReviews: number;
  pendingReviews: number;
}

export interface AssignedSection {
  id: string;
  header: string;
  type: string;
  status: 'Done' | 'In Process';
  target: number;
  limit: number;
  dueDate: string;
}

export interface PermissionItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface ActivityItem {
  id: string;
  action: string;
  target: string;
  timestamp: string;
}

export function usernameToSlug(username: string) {
  return username.replaceAll('.', '-');
}

export function slugToUsername(slug: string) {
  const parts = slug.split('-');

  if (!parts[0] || !parts[1]) {
    return slug;
  }

  return `${parts[0]}.${parts.slice(1).join('-')}`;
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
