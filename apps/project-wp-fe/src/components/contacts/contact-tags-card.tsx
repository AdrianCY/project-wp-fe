import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ContactTag } from '@/server/contacts'

interface ContactTagsCardProps {
  tags: ContactTag[]
  availableTags: ContactTag[]
  onAddTag: (tag: ContactTag) => void
  onRemoveTag: (tagId: string) => void
  onOpenCreateTag: () => void
}

export function ContactTagsCard({
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onOpenCreateTag,
}: ContactTagsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Organize contacts with tags for campaigns
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenCreateTag}>
            <Plus className="mr-2 size-4" />
            New Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="gap-1"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : undefined,
                  color: tag.color || undefined,
                  borderColor: tag.color || undefined,
                }}
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag.id)}
                  className="ml-1 rounded-full hover:bg-black/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tags assigned</p>
        )}

        {availableTags.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Add existing tag:</p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => onAddTag(tag)}
                  style={{
                    borderColor: tag.color || undefined,
                    color: tag.color || undefined,
                  }}
                >
                  <Plus className="mr-1 size-3" />
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

