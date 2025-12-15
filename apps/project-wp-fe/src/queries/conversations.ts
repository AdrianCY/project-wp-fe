import { queryOptions } from "@tanstack/react-query";
import {
	getConversationMessages,
	getConversations,
} from "@/server/conversations";

export const conversationsQueryKey = ["conversations"] as const;

export const conversationsQueryOptions = (isOpen?: boolean) =>
	queryOptions({
		queryKey: [...conversationsQueryKey, { isOpen }],
		queryFn: () => getConversations({ data: { isOpen } }),
		staleTime: 30 * 1000, // 30 seconds
	});

export const conversationMessagesQueryKey = (conversationId: string) =>
	["conversations", conversationId, "messages"] as const;

export const conversationMessagesQueryOptions = (
	conversationId: string,
	page = 1,
) =>
	queryOptions({
		queryKey: [...conversationMessagesQueryKey(conversationId), { page }],
		queryFn: () =>
			getConversationMessages({ data: { conversationId, page } }),
		staleTime: 10 * 1000, // 10 seconds
		enabled: !!conversationId,
	});

