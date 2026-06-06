import { Mail, UserRoundCheck, UserRoundX, Users } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { UsersDataTable } from './data-table';
import { StatCard } from './stat-card';
import data from './data.json';

export function UsersLayoutHeader() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Users</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function UsersPage() {
  const activeUsers = data.filter((user) => user.status === 'Active').length;
  const pendingUsers = data.filter((user) => user.status === 'Pending').length;
  const suspendedUsers = data.filter(
    (user) => user.status === 'Suspended'
  ).length;
  const adminUsers = data.filter(
    (user) => user.role === 'Owner' || user.role === 'Admin'
  ).length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="space-y-6 px-4 lg:px-6">
            <section className="mb-10 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                <p className="text-sm text-muted-foreground">
                  Manage members, access levels, section ownership, and reviewer
                  availability.
                </p>
              </div>
            </section>

            <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total users"
                value={`${data.length}`}
                description="Workspace members"
                icon={Users}
              />
              <StatCard
                title="Active"
                value={`${activeUsers}`}
                description="Currently enabled accounts"
                icon={UserRoundCheck}
              />
              <StatCard
                title="Pending"
                value={`${pendingUsers}`}
                description="Invites awaiting action"
                icon={Mail}
              />
              <StatCard
                title="Admins"
                value={`${adminUsers}`}
                description={`${suspendedUsers} suspended account(s)`}
                icon={UserRoundX}
              />
            </section>
            <UsersDataTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
