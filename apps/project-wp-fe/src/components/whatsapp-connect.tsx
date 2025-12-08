import { useState } from 'react'
import { MessageSquare, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { launchWhatsAppSignup, type WhatsAppSignupResult } from '@/lib/facebook-sdk'
import { useActiveOrganization } from '@/lib/auth-client'

interface WhatsAppConnectProps {
  onSuccess?: () => void
}

type ConnectionState = 'idle' | 'connecting' | 'processing' | 'success' | 'error'

export function WhatsAppConnect({ onSuccess }: WhatsAppConnectProps) {
  const [state, setState] = useState<ConnectionState>('idle')
  const [error, setError] = useState<string | null>(null)
  const { data: activeOrg } = useActiveOrganization()

  const handleConnect = async () => {
    if (!activeOrg) {
      setError('Please create or join an organization first')
      return
    }

    setState('connecting')
    setError(null)

    launchWhatsAppSignup({
      onSuccess: async (result: WhatsAppSignupResult) => {
        setState('processing')
        
        try {
          // Send the code to backend for processing
          const response = await fetch('/api/whatsapp/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: result.code,
              accessToken: result.accessToken,
              organizationId: activeOrg.id,
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to connect WhatsApp account')
          }

          setState('success')
          onSuccess?.()
        } catch (err) {
          setState('error')
          setError(err instanceof Error ? err.message : 'Failed to connect WhatsApp account')
        }
      },
      onError: (err) => {
        setState('error')
        setError(err.message)
      },
      onCancel: () => {
        setState('idle')
      },
    })
  }

  if (state === 'success') {
    return (
      <Empty className="border border-dashed bg-gradient-to-b from-green-50/50 to-background dark:from-green-950/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2 className="text-green-600" />
          </EmptyMedia>
          <EmptyTitle>WhatsApp Connected!</EmptyTitle>
          <EmptyDescription>
            Your WhatsApp Business account has been successfully connected.
            You can now send and receive messages.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onSuccess}>
            Go to Dashboard
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border border-dashed bg-gradient-to-b from-muted/30 to-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquare />
        </EmptyMedia>
        <EmptyTitle>Connect WhatsApp Business</EmptyTitle>
        <EmptyDescription>
          Connect your WhatsApp Business account to start sending and receiving messages,
          create campaigns, and manage customer conversations.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        {error && (
          <div className="w-full rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <Button
          onClick={handleConnect}
          disabled={state === 'connecting' || state === 'processing' || !activeOrg}
          size="lg"
        >
          {state === 'connecting' || state === 'processing' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {state === 'connecting' ? 'Connecting...' : 'Setting up...'}
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 size-4" />
              Connect WhatsApp Account
            </>
          )}
        </Button>

        {!activeOrg && (
          <p className="text-sm text-muted-foreground">
            You need to create or join an organization first.
          </p>
        )}

        <Button
          variant="link"
          className="text-muted-foreground"
          size="sm"
          asChild
        >
          <a
            href="https://business.facebook.com/settings/whatsapp-business-accounts"
            target="_blank"
            rel="noopener noreferrer"
          >
            Manage existing accounts
            <ExternalLink className="ml-1 size-3" />
          </a>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

