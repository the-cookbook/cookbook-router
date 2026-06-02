import React from 'react';
import { CirclePlusIcon, MailIcon } from 'lucide-react';
import { Link, useNavigate } from '@cookbook/router-react';
import { NavLink, type NavLinkProps } from '@cookbook/router-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export interface NavigationItem {
  title: string;
  icon?: React.JSX.Element;
  link: NavLinkProps;
  href?: string;
}

export function Navigation({ items }: { items: NavigationItem[] }) {
  const navigate = useNavigate();

  const handleOnNewMessageClick = React.useCallback(() => {
    navigate.to('new-message');
  }, [navigate]);

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
              onClick={handleOnNewMessageClick}
            >
              <MailIcon />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            if (item.href) {
              return (
                <SidebarMenuItem key={item.title}>
                  <NavLink href={item.href}>
                    <SidebarMenuButton tooltip={item.title} className="my-1">
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </NavLink>
                </SidebarMenuItem>
              );
            }

            return (
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
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
