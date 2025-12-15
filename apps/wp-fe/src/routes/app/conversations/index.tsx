import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ContactInfoPanel } from "@/components/conversations/contact-info-panel";
import { ConversationSidebar } from "@/components/conversations/conversation-sidebar";
import { MessageArea } from "@/components/conversations/message-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useWebSocket } from "@/hooks/use-websocket";
import {
	conversationMessagesQueryKey,
	conversationMessagesQueryOptions,
	conversationsQueryKey,
	conversationsQueryOptions,
} from "@/queries/conversations";
import { markMessagesAsRead } from "@/server/conversations";

export const Route = createFileRoute("/app/conversations/")({
	loader: ({ context }) => {
		return context.queryClient.ensureQueryData(conversationsQueryOptions());
	},
	component: ConversationsPage,
});

function ConversationsPage() {
	const { wsSecretKey } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const [showContactInfo, setShowContactInfo] = useState(false);

	// Fetch conversations
	const { data: conversationsData, isLoading: isLoadingConversations } =
		useQuery(conversationsQueryOptions());

	// Fetch messages for selected conversation
	const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
		...conversationMessagesQueryOptions(selectedConversationId || ""),
		enabled: !!selectedConversationId,
	});

	// Mark messages as read server function
	const markAsReadFn = useServerFn(markMessagesAsRead);

	// WebSocket for real-time updates
	const handleWebSocketMessage = useCallback(
		(message: { type: string; [key: string]: unknown }) => {
			if (message.type === "new_message") {
				// Invalidate conversations list to update last message
				queryClient.invalidateQueries({ queryKey: conversationsQueryKey });

				// If the message is for the selected conversation, invalidate messages
				if (
					selectedConversationId &&
					message.conversationId === selectedConversationId
				) {
					queryClient.invalidateQueries({
						queryKey: conversationMessagesQueryKey(selectedConversationId),
					});
				}
			}

			if (message.type === "message_status_update") {
				// Invalidate messages to update status
				if (
					selectedConversationId &&
					message.conversationId === selectedConversationId
				) {
					queryClient.invalidateQueries({
						queryKey: conversationMessagesQueryKey(selectedConversationId),
					});
				}
			}
		},
		[queryClient, selectedConversationId],
	);

	useWebSocket({
		wsSecretKey,
		onMessage: handleWebSocketMessage,
	});

	// Get selected conversation details
	const selectedConversation = conversationsData?.conversations.find(
		(c) => c.id === selectedConversationId,
	);

	// Mark messages as read when selecting a conversation
	useEffect(() => {
		if (selectedConversationId && selectedConversation?.unreadCount) {
			markAsReadFn({ data: selectedConversationId }).then(() => {
				queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
			});
		}
	}, [
		selectedConversationId,
		selectedConversation?.unreadCount,
		markAsReadFn,
		queryClient,
	]);

	const handleSelectConversation = (id: string) => {
		setSelectedConversationId(id);
		// Prefetch messages
		queryClient.prefetchQuery(conversationMessagesQueryOptions(id));
	};

	const handleMessageSent = () => {
		if (selectedConversationId) {
			// Invalidate messages to show new message
			queryClient.invalidateQueries({
				queryKey: conversationMessagesQueryKey(selectedConversationId),
			});
			// Invalidate conversations to update last message
			queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
		}
	};

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "350px",
				} as React.CSSProperties
			}
		>
			{/* Conversations List Sidebar */}
			<ConversationSidebar
				conversations={conversationsData?.conversations || []}
				selectedConversationId={selectedConversationId}
				onSelectConversation={handleSelectConversation}
				isLoading={isLoadingConversations}
			/>

			{/* Main Content Area */}
			<SidebarInset className="flex flex-row">
				{selectedConversation ? (
					<>
						{/* Message Area */}
						<div className="flex-1">
							<MessageArea
								conversationId={selectedConversation.id}
								contact={selectedConversation.contact}
								messages={messagesData?.messages || []}
								isLoadingMessages={isLoadingMessages}
								onToggleContactInfo={() => setShowContactInfo(!showContactInfo)}
								onMessageSent={handleMessageSent}
							/>
						</div>

						{/* Contact Info Panel */}
						{showContactInfo && (
							<ContactInfoPanel
								contact={selectedConversation.contact}
								conversation={{
									id: selectedConversation.id,
									createdAt: selectedConversation.createdAt,
									windowExpiresAt: selectedConversation.windowExpiresAt,
									isOpen: selectedConversation.isOpen,
								}}
								onClose={() => setShowContactInfo(false)}
							/>
						)}
					</>
				) : (
					/* Empty State */
					<div className="flex h-full flex-1 flex-col items-center justify-center gap-4 text-center">
						<div className="rounded-full bg-muted p-6">
							<MessageSquare className="size-12 text-muted-foreground" />
						</div>
						<div className="space-y-2">
							<h2 className="text-xl font-semibold">
								No conversation selected
							</h2>
							<p className="max-w-sm text-muted-foreground">
								Select a conversation from the list to start chatting, or wait
								for customers to message you.
							</p>
						</div>
					</div>
				)}
			</SidebarInset>
		</SidebarProvider>
	);
}
