import * as React from 'react';
import {
  LayoutDashboard,
  ChefHat,
  Users,
  Book,
  Bug,
  CloudAlert,
  FileText,
} from 'lucide-react';
import { Link } from '@cookbook/router-react';
import { Navigation, type NavigationItem } from '@/components/navigation';
import { NavigationUser, type User } from '@/components/navigation-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const data = {
  user: {
    name: 'Cookbook',
    email: 'cookbook@example.com',
    avatar:
      'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Cookbook&eyes=shades&backgroundType=solid',
  } satisfies User,
  navigation: [
    {
      title: 'Overview',
      icon: <LayoutDashboard />,
      link: {
        route: 'overview',
        end: false,
      },
    },
    {
      title: 'Users',
      icon: <Users />,
      link: {
        route: 'users.index',
        end: false,
      },
    },
    {
      title: 'Documents',
      icon: <FileText />,
      link: {
        route: 'documents',
      },
    },
    {
      title: 'Reports',
      icon: <Book />,
      link: {
        route: 'reports',
      },
    },
    {
      title: 'Broken Page',
      icon: <Bug />,
      link: {
        route: 'broken-page',
      },
    },
    {
      title: 'Not Found Page',
      icon: <CloudAlert />,
      href: '/oh-snap',
      link: {},
    },
  ] satisfies NavigationItem[],
};

export function AppSidebar({
  children,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              asChild
            >
              <Link route="main">
                <ChefHat className="size-5!" />
                <span className="text-base font-semibold">Cookbook</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <Navigation items={data.navigation} />
        {children}
      </SidebarContent>
      <SidebarFooter>
        <NavigationUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
