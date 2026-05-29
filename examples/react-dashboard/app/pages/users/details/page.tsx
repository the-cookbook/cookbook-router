import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Link, useParams } from '@cookbook/router-react';
import { UserDetail } from './components/user-detail';
import { slugToUsername } from './components/utils';
import { users } from './components/data/users';

export function UserDetailsLayoutHeader() {
  const params = useParams('users.details');
  const username = slugToUsername(params.slug);
  const user = users.find((item) => item.username === username);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="users">Users</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{user ? user.name : 'User not found'}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function UserDetailPage() {
  const params = useParams('users.details');

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="space-y-6 px-4 lg:px-6">
            <UserDetail slug={params.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
