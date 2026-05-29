import { UserNotFound } from '../not-found';

import {
  activityItems,
  assignedSections,
  permissions,
  users,
} from './data/users';
import { slugToUsername } from './utils';
import { UserActivityCard } from './user-activity-card';
import { UserAssignedSectionsTable } from './user-assigned-sections-table';
import { UserDetailHeader } from './user-detail-header';
import { UserDetailStats } from './user-detail-stats';
import { UserPermissionsCard } from './user-permissions-card';
import { UserProfileCard } from './user-profile-card';

interface UserDetailPageProps {
  slug: string;
}

export function UserDetail({ slug }: UserDetailPageProps) {
  const username = slugToUsername(slug);
  const user = users.find((item) => item.username === username);

  if (!user) {
    return <UserNotFound slug={slug} username={username} />;
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background p-6">
      <UserDetailHeader user={user} />

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <UserProfileCard user={user} />

        <div className="grid gap-6">
          <UserDetailStats user={user} />
          <UserAssignedSectionsTable sections={assignedSections} />
          <section className="grid gap-6 xl:grid-cols-2">
            <UserPermissionsCard permissions={permissions} />
            <UserActivityCard items={activityItems} />
          </section>
        </div>
      </section>
    </main>
  );
}
