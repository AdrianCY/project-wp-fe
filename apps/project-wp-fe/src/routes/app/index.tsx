import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Megaphone, Workflow } from 'lucide-react'
import { OrganizationOnboarding } from '@/components/organization-onboarding'
import { WhatsAppConnect } from '@/components/whatsapp-connect'

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

function DashboardPage() {
  const router = useRouter()
  const { hasOrganization, hasConnectedWABA, activeOrganization } = Route.useRouteContext()

  const handleOnboardingComplete = () => {
    // Invalidate the route to refetch the status
    router.invalidate()
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
        <OrganizationOnboarding onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  // Show WhatsApp connection prompt if no WABA connected
  if (!hasConnectedWABA && activeOrganization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your WhatsApp Business dashboard
          </p>
        </div>
        <WhatsAppConnect organizationId={activeOrganization.id} onSuccess={handleOnboardingComplete} />
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
