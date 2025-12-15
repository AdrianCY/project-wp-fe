import { Search } from "lucide-react";
import { useState } from "react";
import { ConversationItem } from "./conversation-item";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarInput,
} from "@/components/ui/sidebar";
import type { ConversationWithContact } from "@/server/conversations";

interface ConversationSidebarProps {
	conversations: ConversationWithContact[];
	selectedConversationId: string | null;
	onSelectConversation: (conversationId: string) => void;
	isLoading?: boolean;
}

export function ConversationSidebar({
	conversations,
	selectedConversationId,
	onSelectConversation,
	isLoading,
}: ConversationSidebarProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredConversations = conversations.filter((conv) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			conv.contact.name?.toLowerCase().includes(query) ||
			conv.contact.phoneNumber.toLowerCase().includes(query)
		);
	});

	return (
		<Sidebar collapsible="none" className="flex-1 border-r">
			<SidebarHeader className="gap-3.5 border-b p-4">
				<div className="flex w-full items-center justify-between">
					<span className="text-base font-medium">Conversations</span>
				</div>
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<SidebarInput
						placeholder="Search conversations..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<div className="flex flex-col gap-1 p-2">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<span className="text-sm text-muted-foreground">Loading...</span>
						</div>
					) : filteredConversations.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<span className="text-sm text-muted-foreground">
								{searchQuery
									? "No conversations match your search"
									: "No conversations yet"}
							</span>
						</div>
					) : (
						filteredConversations.map((conversation) => (
							<ConversationItem
								key={conversation.id}
								conversation={conversation}
								isActive={selectedConversationId === conversation.id}
								onClick={() => onSelectConversation(conversation.id)}
							/>
						))
					)}
				</div>
			</SidebarContent>
		</Sidebar>
	);
}

