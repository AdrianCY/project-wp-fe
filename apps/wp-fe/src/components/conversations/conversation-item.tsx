import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationWithContact } from "@/server/conversations";

interface ConversationItemProps {
	conversation: ConversationWithContact;
	isActive: boolean;
	onClick: () => void;
}

export function ConversationItem({
	conversation,
	isActive,
	onClick,
}: ConversationItemProps) {
	const { contact, lastMessage, unreadCount } = conversation;

	const getMessagePreview = () => {
		if (!lastMessage) return "No messages yet";

		const content = lastMessage.content as { body?: string } | null;
		const text = content?.body || "";

		if (lastMessage.type === "text") {
			return text.length > 50 ? `${text.substring(0, 50)}...` : text;
		}

		// Handle other message types
		const typeLabels: Record<string, string> = {
			image: "📷 Image",
			video: "🎥 Video",
			audio: "🎵 Audio",
			document: "📄 Document",
			sticker: "🎉 Sticker",
			location: "📍 Location",
			contacts: "👤 Contact",
			template: "📝 Template message",
		};

		return typeLabels[lastMessage.type] || "Message";
	};

	const getTimeAgo = () => {
		if (!lastMessage?.createdAt) return "";
		return formatDistanceToNow(new Date(lastMessage.createdAt), {
			addSuffix: false,
		});
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent",
				isActive && "bg-accent",
			)}
		>
			{/* Avatar */}
			<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
				<User className="size-5 text-muted-foreground" />
			</div>

			{/* Content */}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center justify-between gap-2">
					<span className="truncate font-medium">
						{contact.name || contact.phoneNumber}
					</span>
					<span className="shrink-0 text-xs text-muted-foreground">
						{getTimeAgo()}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span
						className={cn(
							"truncate text-sm",
							unreadCount > 0
								? "font-medium text-foreground"
								: "text-muted-foreground",
						)}
					>
						{lastMessage?.direction === "outbound" && (
							<span className="text-muted-foreground">You: </span>
						)}
						{getMessagePreview()}
					</span>
					{unreadCount > 0 && (
						<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</div>
			</div>
		</button>
	);
}
