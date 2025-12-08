import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ContactActivityCardProps {
  createdAt: Date
  updatedAt: Date
}

export function ContactActivityCard({
  createdAt,
  updatedAt,
}: ContactActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Contact history and interactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Created: {new Date(createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(updatedAt).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}

