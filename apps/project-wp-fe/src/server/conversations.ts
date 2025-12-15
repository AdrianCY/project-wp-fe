import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import {
	contacts,
	conversations,
	messages,
	phoneNumbers,
	whatsappBusinessAccounts,
} from "wp-db";
import { db } from "@/db";
import { GRAPH_API_BASE, getSystemAccessToken } from "@/lib/facebook-api";
import { authMiddleware } from "@/server/middleware/auth";

// ============================================================================
// TYPES
// ============================================================================

export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;

export type ConversationWithContact = Conversation & {
	contact: {
		id: string;
		name: string | null;
		phoneNumber: string;
		email: string | null;
	};
	lastMessage: {
		content: unknown;
		type: string;
		direction: string;
		createdAt: Date;
	} | null;
	unreadCount: number;
};

export type ConversationsListParams = {
	page?: number;
	pageSize?: number;
	isOpen?: boolean;
};

export type ConversationsListResult = {
	conversations: ConversationWithContact[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type SendMessageInput = {
	conversationId: string;
	text: string;
};

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Get paginated list of conversations for the organization
 */
export const getConversations = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((params: ConversationsListParams) => params)
	.handler(async ({ data, context }): Promise<ConversationsListResult> => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return {
				conversations: [],
				total: 0,
				page: 1,
				pageSize: 20,
				totalPages: 0,
			};
		}

		const { page = 1, pageSize = 20, isOpen } = data;
		const offset = (page - 1) * pageSize;

		// Build where conditions
		const conditions = [eq(conversations.organizationId, organizationId)];

		if (isOpen !== undefined) {
			conditions.push(eq(conversations.isOpen, isOpen));
		}

		// Get total count
		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(conversations)
			.where(and(...conditions));
		const total = Number(countResult[0]?.count ?? 0);

		// Get conversations with contact info
		const conversationsList = await db
			.select({
				conversation: conversations,
				contact: {
					id: contacts.id,
					name: contacts.name,
					phoneNumber: contacts.phoneNumber,
					email: contacts.email,
				},
			})
			.from(conversations)
			.innerJoin(contacts, eq(conversations.contactId, contacts.id))
			.where(and(...conditions))
			.orderBy(desc(conversations.lastMessageAt))
			.limit(pageSize)
			.offset(offset);

		// Get last message and unread count for each conversation
		const conversationsWithDetails = await Promise.all(
			conversationsList.map(async ({ conversation, contact }) => {
				// Get last message
				const lastMessageResult = await db.query.messages.findFirst({
					where: eq(messages.conversationId, conversation.id),
					orderBy: desc(messages.createdAt),
				});

				// Get unread count (inbound messages not yet read)
				const unreadResult = await db
					.select({ count: sql<number>`count(*)` })
					.from(messages)
					.where(
						and(
							eq(messages.conversationId, conversation.id),
							eq(messages.direction, "inbound"),
							sql`${messages.readAt} IS NULL`,
						),
					);

				return {
					...conversation,
					contact,
					lastMessage: lastMessageResult
						? {
								content: lastMessageResult.content,
								type: lastMessageResult.type,
								direction: lastMessageResult.direction,
								createdAt: lastMessageResult.createdAt,
							}
						: null,
					unreadCount: Number(unreadResult[0]?.count ?? 0),
				};
			}),
		);

		return {
			conversations: conversationsWithDetails,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	});

/**
 * Get a single conversation by ID with contact details
 */
export const getConversationById = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((id: string) => id)
	.handler(async ({ data: id, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return null;
		}

		const result = await db
			.select({
				conversation: conversations,
				contact: contacts,
				phoneNumber: phoneNumbers,
			})
			.from(conversations)
			.innerJoin(contacts, eq(conversations.contactId, contacts.id))
			.innerJoin(phoneNumbers, eq(conversations.phoneNumberId, phoneNumbers.id))
			.where(
				and(
					eq(conversations.id, id),
					eq(conversations.organizationId, organizationId),
				),
			)
			.limit(1);

		if (result.length === 0) {
			return null;
		}

		return result[0];
	});

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Get messages for a conversation
 */
export const getConversationMessages = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(
		(params: { conversationId: string; page?: number; pageSize?: number }) =>
			params,
	)
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return { messages: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
		}

		const { conversationId, page = 1, pageSize = 50 } = data;
		const offset = (page - 1) * pageSize;

		// Verify conversation belongs to organization
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.organizationId, organizationId),
			),
		});

		if (!conversation) {
			return { messages: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
		}

		// Get total count
		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(messages)
			.where(eq(messages.conversationId, conversationId));
		const total = Number(countResult[0]?.count ?? 0);

		// Get messages (newest first for pagination, but we'll reverse for display)
		const messagesList = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(desc(messages.createdAt))
			.limit(pageSize)
			.offset(offset);

		// Reverse to show oldest first in the returned array
		messagesList.reverse();

		return {
			messages: messagesList,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	});

/**
 * Send a text message in a conversation
 */
export const sendMessage = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: SendMessageInput) => {
		if (!input.conversationId) {
			throw new Error("Conversation ID is required");
		}
		if (!input.text || input.text.trim() === "") {
			throw new Error("Message text is required");
		}
		return input;
	})
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			throw new Error("No active organization");
		}

		const { conversationId, text } = data;

		// Get conversation with phone number
		const conversationResult = await db
			.select({
				conversation: conversations,
				phoneNumber: phoneNumbers,
				contact: contacts,
				waba: whatsappBusinessAccounts,
			})
			.from(conversations)
			.innerJoin(phoneNumbers, eq(conversations.phoneNumberId, phoneNumbers.id))
			.innerJoin(contacts, eq(conversations.contactId, contacts.id))
			.innerJoin(
				whatsappBusinessAccounts,
				eq(phoneNumbers.wabaId, whatsappBusinessAccounts.id),
			)
			.where(
				and(
					eq(conversations.id, conversationId),
					eq(conversations.organizationId, organizationId),
				),
			)
			.limit(1);

		if (conversationResult.length === 0) {
			throw new Error("Conversation not found");
		}

		const { conversation, phoneNumber, contact } = conversationResult[0];

		if (!phoneNumber.phoneNumberId) {
			throw new Error("Phone number not configured for sending");
		}

		// Check if window is still open (24-hour rule)
		const now = new Date();
		if (conversation.windowExpiresAt && conversation.windowExpiresAt < now) {
			throw new Error(
				"Messaging window has expired. Customer must send a message first.",
			);
		}

		// Get access token
		const accessToken = getSystemAccessToken();

		// Send message via Meta API
		const response = await fetch(
			`${GRAPH_API_BASE}/${phoneNumber.phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					messaging_product: "whatsapp",
					recipient_type: "individual",
					to: contact.phoneNumber,
					type: "text",
					text: {
						body: text,
					},
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || "Failed to send message");
		}

		const result = await response.json();
		const wamid = result.messages?.[0]?.id;

		// Store message in database
		const [newMessage] = await db
			.insert(messages)
			.values({
				conversationId,
				wamid,
				direction: "outbound",
				type: "text",
				content: { body: text },
				status: "sent",
				sentAt: new Date(),
			})
			.returning();

		// Update conversation last message timestamp
		await db
			.update(conversations)
			.set({
				lastMessageAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		return newMessage;
	});

/**
 * Mark messages as read
 */
export const markMessagesAsRead = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((conversationId: string) => {
		if (!conversationId) {
			throw new Error("Conversation ID is required");
		}
		return conversationId;
	})
	.handler(async ({ data: conversationId, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return false;
		}

		// Verify conversation belongs to organization
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.organizationId, organizationId),
			),
		});

		if (!conversation) {
			return false;
		}

		// Mark all inbound messages as read
		await db
			.update(messages)
			.set({ readAt: new Date(), updatedAt: new Date() })
			.where(
				and(
					eq(messages.conversationId, conversationId),
					eq(messages.direction, "inbound"),
					sql`${messages.readAt} IS NULL`,
				),
			);

		return true;
	});

