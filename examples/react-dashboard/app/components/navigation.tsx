import { Button } from '@/components/ui/button';
import { NavLink, type NavLinkProps } from '@cookbook/router-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { CirclePlusIcon, MailIcon } from 'lucide-react';
import { Link } from '@cookbook/router-react';

export interface NavigationItem {
  title: string;
  icon?: React.JSX.Element;
  link: NavLinkProps;
}

export function Navigation({ items }: { items: NavigationItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              asChild
            >
              <Link route="create">
                <CirclePlusIcon />
                <span>Quick Create</span>
              </Link>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <MailIcon />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <NavLink {...item.link}>
                {({ isActive }) => (
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    className="my-1"
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
