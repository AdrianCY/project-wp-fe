import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { organization } from '@/lib/auth-client'
import { Building2, Check, X, Loader2 } from 'lucide-react'

interface Invitation {
  id: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
  status: string
  expiresAt: Date
  inviterEmail: string
}

interface PendingInvitationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invitations: Invitation[]
  onSuccess?: () => void
}

export function PendingInvitationsDialog({
  open,
  onOpenChange,
  invitations,
  onSuccess,
}: PendingInvitationsDialogProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async (invitationId: string) => {
    setError(null)
    setLoadingId(invitationId)

    try {
      const result = await organization.acceptInvitation({ invitationId })

      if (result.error) {
        setError(result.error.message || 'Failed to accept invitation')
        return
      }

      onSuccess?.()
      onOpenChange(false)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (invitationId: string) => {
    setError(null)
    setLoadingId(invitationId)

    try {
      const result = await organization.rejectInvitation({ invitationId })

      if (result.error) {
        setError(result.error.message || 'Failed to reject invitation')
        return
      }

      onSuccess?.()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoadingId(null)
    }
  }

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pending Invitations</DialogTitle>
          <DialogDescription>
            You have been invited to join the following organizations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {pendingInvitations.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No pending invitations
            </p>
          ) : (
            pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {invitation.organizationName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Role: {invitation.role} • Invited by {invitation.inviterEmail}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(invitation.id)}
                    disabled={loadingId === invitation.id}
                  >
                    {loadingId === invitation.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invitation.id)}
                    disabled={loadingId === invitation.id}
                  >
                    {loadingId === invitation.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

