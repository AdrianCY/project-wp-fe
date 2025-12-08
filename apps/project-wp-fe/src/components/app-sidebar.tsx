import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Megaphone,
  Workflow,
  FileText,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { signOut } from '@/lib/auth-client'
import type { ActiveOrganization } from '@/server/auth'

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/app',
    icon: LayoutDashboard,
  },
  {
    title: 'Conversations',
    href: '/app/conversations',
    icon: MessageSquare,
  },
  {
    title: 'Contacts',
    href: '/app/contacts',
    icon: Users,
  },
  {
    title: 'Campaigns',
    href: '/app/campaigns',
    icon: Megaphone,
  },
  {
    title: 'Flows',
    href: '/app/flows',
    icon: Workflow,
  },
  {
    title: 'Templates',
    href: '/app/templates',
    icon: FileText,
  },
]

const settingsNavItems = [
  {
    title: 'Settings',
    href: '/app/settings',
    icon: Settings,
  },
]

interface AppSidebarProps {
  activeOrganization: ActiveOrganization
}

export function AppSidebar({ activeOrganization }: AppSidebarProps) {
  const matchRoute = useMatchRoute()

  const isPathActive = (href: string) => {
    // TanStack Router matcher keeps params/search handling consistent with routing.
    const isDashboard = href === '/app'
    return Boolean(
      matchRoute({
        to: href,
        // Dashboard should only match exactly; others can match child paths.
        fuzzy: !isDashboard,
      })
    )
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/sign-in'
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">WhatsApp SaaS</span>
            {activeOrganization && (
              <span className="truncate text-xs text-muted-foreground">
                {activeOrganization.name}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isPathActive(item.href)}
                  >
                    <Link to={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isPathActive(item.href)}
                  >
                    <Link to={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {activeOrganization && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Organization">
                <Building2 className="size-4" />
                <span className="truncate">{activeOrganization.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

