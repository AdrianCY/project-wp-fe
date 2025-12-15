import { format } from "date-fns";
import { Check, CheckCheck, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/server/conversations";

interface MessageBubbleProps {
	message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isOutbound = message.direction === "outbound";
	const content = message.content as { body?: string } | null;

	const getStatusIcon = () => {
		switch (message.status) {
			case "pending":
				return <Clock className="size-3" />;
			case "sent":
				return <Check className="size-3" />;
			case "delivered":
				return <CheckCheck className="size-3" />;
			case "read":
				return <CheckCheck className="size-3 text-blue-500" />;
			case "failed":
				return <XCircle className="size-3 text-destructive" />;
			default:
				return null;
		}
	};

	const renderContent = () => {
		switch (message.type) {
			case "text":
				return (
					<p className="whitespace-pre-wrap break-words">{content?.body}</p>
				);
			case "image":
				return (
					<div className="flex flex-col gap-2">
						<div className="h-48 w-full rounded bg-muted flex items-center justify-center text-muted-foreground">
							📷 Image
						</div>
						{content?.body && (
							<p className="whitespace-pre-wrap break-words text-sm">
								{content.body}
							</p>
						)}
					</div>
				);
			case "video":
				return (
					<div className="flex items-center gap-2 rounded bg-muted/50 p-3">
						<span>🎥</span>
						<span className="text-sm">Video</span>
					</div>
				);
			case "audio":
				return (
					<div className="flex items-center gap-2 rounded bg-muted/50 p-3">
						<span>🎵</span>
						<span className="text-sm">Audio message</span>
					</div>
				);
			case "document":
				return (
					<div className="flex items-center gap-2 rounded bg-muted/50 p-3">
						<span>📄</span>
						<span className="text-sm">Document</span>
					</div>
				);
			case "sticker":
				return (
					<div className="flex items-center justify-center p-2">
						<span className="text-4xl">🎉</span>
					</div>
				);
			case "location":
				return (
					<div className="flex items-center gap-2 rounded bg-muted/50 p-3">
						<span>📍</span>
						<span className="text-sm">Location</span>
					</div>
				);
			case "contacts":
				return (
					<div className="flex items-center gap-2 rounded bg-muted/50 p-3">
						<span>👤</span>
						<span className="text-sm">Contact</span>
					</div>
				);
			case "template":
				return (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">
							Template message
						</span>
						{content?.body && (
							<p className="whitespace-pre-wrap break-words">{content.body}</p>
						)}
					</div>
				);
			default:
				return (
					<p className="text-sm text-muted-foreground">
						Unsupported message type
					</p>
				);
		}
	};

	return (
		<div
			className={cn(
				"flex w-full",
				isOutbound ? "justify-end" : "justify-start",
			)}
		>
			<div
				className={cn(
					"max-w-[70%] rounded-2xl px-4 py-2",
					isOutbound
						? "rounded-br-md bg-primary text-primary-foreground"
						: "rounded-bl-md bg-muted text-foreground",
				)}
			>
				{renderContent()}
				<div
					className={cn(
						"mt-1 flex items-center gap-1 text-[10px]",
						isOutbound
							? "justify-end text-primary-foreground/70"
							: "text-muted-foreground",
					)}
				>
					<span>{format(new Date(message.createdAt), "HH:mm")}</span>
					{isOutbound && getStatusIcon()}
				</div>
			</div>
		</div>
	);
}

