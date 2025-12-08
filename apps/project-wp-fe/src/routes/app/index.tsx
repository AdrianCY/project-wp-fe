import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Megaphone, Workflow, Loader2 } from 'lucide-react'
import { OrganizationOnboarding, useHasOrganization } from '@/components/organization-onboarding'
import { WhatsAppConnect } from '@/components/whatsapp-connect'
import { useActiveOrganization } from '@/lib/auth-client'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/app/')({
  component: DashboardPage,
})

const stats = [
  {
    title: 'Total Conversations',
    value: '0',
    description: 'Active conversations',
    icon: MessageSquare,
  },
  {
    title: 'Total Contacts',
    value: '0',
    description: 'Contacts in your database',
    icon: Users,
  },
  {
    title: 'Active Campaigns',
    value: '0',
    description: 'Running campaigns',
    icon: Megaphone,
  },
  {
    title: 'Active Flows',
    value: '0',
    description: 'Published flows',
    icon: Workflow,
  },
]

function useHasConnectedWABA() {
  const { data: activeOrg } = useActiveOrganization()
  const [hasWABA, setHasWABA] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!activeOrg) {
      setIsLoading(false)
      setHasWABA(false)
      return
    }

    const checkWABA = async () => {
      try {
        const response = await fetch(`/api/whatsapp/status?orgId=${activeOrg.id}`)
        if (response.ok) {
          const data = await response.json()
          setHasWABA(data.hasConnectedWABA)
        }
      } catch {
        // Silently fail - assume no WABA
        setHasWABA(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkWABA()
  }, [activeOrg])

  return { hasWABA, isLoading }
}

function DashboardPage() {
  const { hasOrganization, isLoading: isOrgLoading } = useHasOrganization()
  const { hasWABA, isLoading: isWABALoading } = useHasConnectedWABA()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleOnboardingComplete = () => {
    setRefreshKey((k) => k + 1)
  }

  // Show loading state
  if (isOrgLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show organization onboarding if user doesn't have an organization
  if (!hasOrganization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your WhatsApp Business dashboard
          </p>
        </div>
        <OrganizationOnboarding key={refreshKey} onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  // Show WhatsApp connection prompt if no WABA connected
  if (!isWABALoading && !hasWABA) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your WhatsApp Business dashboard
          </p>
        </div>
        <WhatsAppConnect key={refreshKey} onSuccess={handleOnboardingComplete} />
      </div>
    )
  }

  // Show main dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your WhatsApp Business dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Your latest customer conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No conversations yet. Messages will appear here when customers reach out.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Import your contacts
            </p>
            <p className="text-sm text-muted-foreground">
              • Create your first message template
            </p>
            <p className="text-sm text-muted-foreground">
              • Set up an automated flow
            </p>
            <p className="text-sm text-muted-foreground">
              • Launch a marketing campaign
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
