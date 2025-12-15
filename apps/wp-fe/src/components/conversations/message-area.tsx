import { useServerFn } from "@tanstack/react-start";
import { Info, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/server/conversations";
import { sendMessage } from "@/server/conversations";
import { MessageBubble } from "./message-bubble";

interface Contact {
	id: string;
	name: string | null;
	phoneNumber: string;
	email: string | null;
}

interface MessageAreaProps {
	conversationId: string;
	contact: Contact;
	messages: Message[];
	isLoadingMessages: boolean;
	onToggleContactInfo: () => void;
	onMessageSent: () => void;
}

export function MessageArea({
	conversationId,
	contact,
	messages,
	isLoadingMessages,
	onToggleContactInfo,
	onMessageSent,
}: MessageAreaProps) {
	const [inputValue, setInputValue] = useState("");
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const sendMessageFn = useServerFn(sendMessage);

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSend = async () => {
		if (!inputValue.trim() || isSending) return;

		setIsSending(true);
		try {
			await sendMessageFn({
				data: {
					conversationId,
					text: inputValue.trim(),
				},
			});
			setInputValue("");
			onMessageSent();
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setIsSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-full bg-muted">
						<User className="size-5 text-muted-foreground" />
					</div>
					<div className="flex flex-col">
						<span className="font-medium">
							{contact.name || contact.phoneNumber}
						</span>
						{contact.name && (
							<span className="text-xs text-muted-foreground">
								{contact.phoneNumber}
							</span>
						)}
					</div>
				</div>
				<Button variant="ghost" size="icon" onClick={onToggleContactInfo}>
					<Info className="size-5" />
				</Button>
			</header>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4">
				{isLoadingMessages ? (
					<div className="flex h-full items-center justify-center">
						<span className="text-muted-foreground">Loading messages...</span>
					</div>
				) : messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center gap-2 text-center">
						<div className="rounded-full bg-muted p-4">
							<Send className="size-8 text-muted-foreground" />
						</div>
						<p className="text-muted-foreground">No messages yet</p>
						<p className="text-sm text-muted-foreground">
							Start the conversation by sending a message
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{messages.map((message) => (
							<MessageBubble key={message.id} message={message} />
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			<Separator />

			{/* Input */}
			<div className="shrink-0 p-4">
				<div className="flex items-end gap-2">
					<Textarea
						placeholder="Type a message..."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						className="min-h-[44px] max-h-32 resize-none"
						rows={1}
					/>
					<Button
						size="icon"
						onClick={handleSend}
						disabled={!inputValue.trim() || isSending}
					>
						<Send className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
